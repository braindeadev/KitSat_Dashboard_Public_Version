import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';

const DEV = import.meta.env.DEV;
const STALE_THRESHOLD_MS = 10_000;
const FRESHNESS_CHECK_INTERVAL_MS = 2_000;
const HISTORY_BUFFER = 200000; // turvaraja live-puskurille; riittää koko ~4 h lennolle
const FETCH_PAGE_SIZE = 1000;

const toHistoryEntry = (d) => {
  const t = new Date(d.created_at);
  return {
    time: t.toLocaleTimeString(),
    rawTimeMs: t.getTime(),
    alt: d.gps_alt ?? d.alt ?? null,
    temp: d.temp_c ?? d.temp ?? null,
    pressure: d.pressure_hpa ?? null,
    speed: d.gps_speed ?? null,
    lat: d.gps_lat,
    lon: d.gps_lon,
    fix: d.gps_fix ?? false,
  };
};

const isBadRow = (d) =>
  d.temp_c === 0 && d.pressure_hpa === 1013.25 && d.gps_fix === false;

// GPS raportoi joskus epäuskottavia nopeuspiikkejä (esim. 7660 m/s) myös fixin
// ollessa true. Hylätään yli uskottavan rajan menevät arvot (-> null), jotta ne
// eivät vääristä maksimia eivätkä kaavion skaalaa.
const MAX_PLAUSIBLE_SPEED = 300; // m/s
const cleanSpeed = (v) =>
  typeof v === 'number' && !Number.isNaN(v) && v >= 0 && v <= MAX_PLAUSIBLE_SPEED ? v : null;

const observeMax = (prev, v) => {
  if (v == null || Number.isNaN(v)) return prev;
  return prev == null || v > prev ? v : prev;
};

const observeMin = (prev, v) => {
  if (v == null || Number.isNaN(v)) return prev;
  return prev == null || v < prev ? v : prev;
};

export const useTelemetry = () => {
  const [telemetry, setTelemetry] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('offline');
  const [maxAlt, setMaxAlt] = useState(null);
  const [minTemp, setMinTemp] = useState(null);
  const [maxSpeed, setMaxSpeed] = useState(null);
  const [flightStartMs, setFlightStartMs] = useState(() => Date.now());
  const [lastDataMs, setLastDataMs] = useState(null);

  const lastDataAtRef = useRef(0);
  const channelSubscribedRef = useRef(false);
  const currentFlightIdRef = useRef(null);

  const tableName = import.meta.env.VITE_SUPABASE_TABLE;

  const markFresh = useCallback((createdAt) => {
    const t = createdAt ? new Date(createdAt).getTime() : Date.now();
    if (t > lastDataAtRef.current) lastDataAtRef.current = t;
    setLastDataMs(t);
    if (channelSubscribedRef.current) setStatus('online');
  }, []);

  const updateData = useCallback((newData) => {
    if (isBadRow(newData)) return;
    newData = { ...newData, gps_speed: cleanSpeed(newData.gps_speed) };

    const curId = currentFlightIdRef.current;
    const newId = newData.flight_id;

    if (curId != null && newId < curId) return;

    if (curId != null && newId > curId) {
      currentFlightIdRef.current = newId;
      setFlightStartMs(new Date(newData.created_at).getTime());
      setTelemetry(newData);
      setHistory([toHistoryEntry(newData)]);
      setMaxAlt(observeMax(null, newData.gps_alt ?? newData.alt));
      setMinTemp(observeMin(null, newData.temp_c ?? newData.temp));
      setMaxSpeed(observeMax(null, newData.gps_speed));
      markFresh(newData.created_at);
      supabase
        .from(tableName)
        .select('created_at')
        .eq('flight_id', newId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
        .then(({ data: first }) => {
          if (first?.created_at && currentFlightIdRef.current === newId) {
            setFlightStartMs(new Date(first.created_at).getTime());
          }
        });
      return;
    }

    if (curId == null) {
      currentFlightIdRef.current = newId;
      setFlightStartMs(new Date(newData.created_at).getTime());
    }

    setTelemetry((prev) => {
      if (prev?.created_at === newData.created_at) return prev;
      return newData;
    });
    setHistory((prev) => {
      const entry = toHistoryEntry(newData);
      if (prev.length && prev[prev.length - 1].rawTimeMs === entry.rawTimeMs) return prev;
      return [...prev, entry].slice(-HISTORY_BUFFER);
    });
    setMaxAlt((prev) => observeMax(prev, newData.gps_alt ?? newData.alt));
    setMinTemp((prev) => observeMin(prev, newData.temp_c ?? newData.temp));
    setMaxSpeed((prev) => observeMax(prev, newData.gps_speed));
    markFresh(newData.created_at);
  }, [markFresh, tableName]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Valitaan lento tuoreimman datan mukaan, ei suurimman flight_id:n —
        // numerointi ei ole aina kronologinen (vanha testiajo voi saada
        // isomman numeron kuin parhaillaan live-lento).
        const { data: latest, error: latestErr } = await supabase
          .from(tableName)
          .select('flight_id')
          .not('flight_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestErr) {
          console.error('Latest flight lookup error:', latestErr.message);
          return;
        }

        const flightId = latest?.flight_id;
        if (flightId == null) return;

        const data = [];
        let error = null;
        for (let from = 0; ; from += FETCH_PAGE_SIZE) {
          const { data: page, error: pageErr } = await supabase
            .from(tableName)
            .select('*')
            .eq('flight_id', flightId)
            .order('created_at', { ascending: true })
            .range(from, from + FETCH_PAGE_SIZE - 1);
          if (pageErr) { error = pageErr; break; }
          if (!page || page.length === 0) break;
          data.push(...page);
          if (page.length < FETCH_PAGE_SIZE) break;
        }

        if (error) {
          console.error('Supabase fetch error:', error.message);
        } else if (data && data.length > 0) {
          currentFlightIdRef.current = flightId;
          setFlightStartMs(new Date(data[0].created_at).getTime());
          const clean = data
            .filter((d) => !isBadRow(d))
            .map((d) => ({ ...d, gps_speed: cleanSpeed(d.gps_speed) }));
          if (clean.length === 0) return;
          const newest = clean[clean.length - 1];
          setTelemetry(newest);
          setHistory(clean.map(toHistoryEntry));
          setMaxAlt(
            clean.reduce((m, d) => observeMax(m, d.gps_alt ?? d.alt), null)
          );
          setMinTemp(
            clean.reduce((m, d) => observeMin(m, d.temp_c ?? d.temp), null)
          );
          setMaxSpeed(
            clean.reduce((m, d) => observeMax(m, d.gps_speed), null)
          );
          const newestMs = new Date(newest.created_at).getTime();
          lastDataAtRef.current = newestMs;
          setLastDataMs(newestMs);
        }
      } catch (err) {
        console.error('Catch error:', err);
      } finally {
        setLoading(false);
      }
    };

    // Tilataan realtime heti (ei jää aukkoa), mutta puskuroidaan rivit kunnes
    // alkulataus on valmis — muuten lataus voisi ylikirjoittaa kesken tulleen rivin.
    let cancelled = false;
    let initialLoaded = false;
    const pending = [];

    fetchInitialData().then(() => {
      if (cancelled) return;
      initialLoaded = true;
      for (const row of pending) updateData(row);
      pending.length = 0;
    });

    const channel = supabase
      .channel('telemetry-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: tableName },
        (payload) => {
          if (DEV) console.log('Realtime update received');
          if (!initialLoaded) pending.push(payload.new);
          else updateData(payload.new);
        }
      )
      .subscribe((s) => {
        if (DEV) console.log('Realtime status:', s);
        if (s === 'SUBSCRIBED') {
          channelSubscribedRef.current = true;
        } else {
          channelSubscribedRef.current = false;
          setStatus('offline');
        }
      });

    const freshnessTimer = setInterval(() => {
      const fresh = Date.now() - lastDataAtRef.current < STALE_THRESHOLD_MS;
      if (channelSubscribedRef.current && fresh) setStatus('online');
      else setStatus('offline');
    }, FRESHNESS_CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      clearInterval(freshnessTimer);
    };
  }, [tableName, updateData]);

  return { telemetry, history, loading, status, maxAlt, minTemp, maxSpeed, flightStartMs, lastDataMs };
};
