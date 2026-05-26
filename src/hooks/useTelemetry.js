import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';

const DEV = import.meta.env.DEV;
const STALE_THRESHOLD_MS = 10_000;
const FRESHNESS_CHECK_INTERVAL_MS = 2_000;
const HISTORY_BUFFER = 18000;
const SIMULATE_TICK_MS = 500;
const SIMULATE_TICK_COUNT = 60;
const SIMULATE_DURATION_MS = SIMULATE_TICK_MS * SIMULATE_TICK_COUNT;

const buildMockRow = (i, totalTicks, baseTimeMs) => {
  const phase = totalTicks > 1 ? i / (totalTicks - 1) : 0;
  return {
    flight_id: 'DEMO-MODE',
    gps_alt: 100 + phase * 800 + Math.sin(phase * Math.PI * 4) * 200,
    temp_c: 20 - phase * 25 + Math.cos(phase * Math.PI * 6) * 3,
    pressure_hpa: 1013 - phase * 100 + Math.sin(phase * Math.PI * 5) * 2,
    gps_speed: 5 + phase * 8 + Math.sin(phase * Math.PI * 8) * 3,
    gps_lat: 61.4858 + phase * 0.04,
    gps_lon: 21.7972 + Math.sin(phase * Math.PI * 3) * 0.02,
    gps_fix: true,
    created_at: new Date(baseTimeMs + i * SIMULATE_TICK_MS).toISOString(),
  };
};

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

  const resetFlight = useCallback(() => {
    setHistory([]);
    setMaxAlt(null);
    setMinTemp(null);
    setMaxSpeed(null);
    setFlightStartMs(Date.now());
  }, []);

  const realStatusRef = useRef('offline');
  const simulateTimerRef = useRef(null);
  const simulateIntervalRef = useRef(null);
  const lastDataAtRef = useRef(0);
  const channelSubscribedRef = useRef(false);

  const tableName = import.meta.env.VITE_SUPABASE_TABLE;

  const applyRealStatus = useCallback((s) => {
    realStatusRef.current = s;
    if (simulateTimerRef.current == null) setStatus(s);
  }, []);

  const markFresh = useCallback((createdAt) => {
    const t = createdAt ? new Date(createdAt).getTime() : Date.now();
    if (t > lastDataAtRef.current) lastDataAtRef.current = t;
    if (channelSubscribedRef.current) applyRealStatus('online');
  }, [applyRealStatus]);

  const updateData = useCallback((newData) => {
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
  }, [markFresh]);

  const loadTestData = useCallback(() => {
    if (simulateIntervalRef.current != null) clearInterval(simulateIntervalRef.current);
    if (simulateTimerRef.current != null) clearTimeout(simulateTimerRef.current);

    setHistory([]);
    setMaxAlt(null);
    setMinTemp(null);
    setMaxSpeed(null);
    setFlightStartMs(Date.now());
    setStatus('online');

    const startMs = Date.now();
    let i = 0;

    const emit = () => {
      const row = buildMockRow(i, SIMULATE_TICK_COUNT, startMs);
      setTelemetry(row);
      setHistory((prev) => [...prev, toHistoryEntry(row)].slice(-HISTORY_BUFFER));
      setMaxAlt((prev) => observeMax(prev, row.gps_alt));
      setMinTemp((prev) => observeMin(prev, row.temp_c));
      setMaxSpeed((prev) => observeMax(prev, row.gps_speed));
      i++;
    };

    emit();
    simulateIntervalRef.current = setInterval(() => {
      if (i >= SIMULATE_TICK_COUNT) {
        clearInterval(simulateIntervalRef.current);
        simulateIntervalRef.current = null;
        return;
      }
      emit();
    }, SIMULATE_TICK_MS);

    simulateTimerRef.current = setTimeout(() => {
      simulateTimerRef.current = null;
      setStatus('offline');
    }, SIMULATE_DURATION_MS);
  }, []);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const { data: latest, error: latestErr } = await supabase
          .from(tableName)
          .select('flight_id')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestErr) {
          console.error('Latest flight lookup error:', latestErr.message);
          return;
        }

        const flightId = latest?.flight_id;
        if (flightId == null) return;

        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .eq('flight_id', flightId)
          .order('created_at', { ascending: true })
          .limit(HISTORY_BUFFER);

        if (error) {
          console.error('Supabase fetch error:', error.message);
        } else if (data && data.length > 0) {
          const newest = data[data.length - 1];
          setTelemetry(newest);
          setHistory(data.map(toHistoryEntry));
          setMaxAlt(
            data.reduce((m, d) => observeMax(m, d.gps_alt ?? d.alt), null)
          );
          setMinTemp(
            data.reduce((m, d) => observeMin(m, d.temp_c ?? d.temp), null)
          );
          setMaxSpeed(
            data.reduce((m, d) => observeMax(m, d.gps_speed), null)
          );
          lastDataAtRef.current = new Date(newest.created_at).getTime();
        }
      } catch (err) {
        console.error('Catch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();

    const channel = supabase
      .channel('telemetry-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: tableName },
        (payload) => {
          if (DEV) console.log('Realtime update received');
          updateData(payload.new);
        }
      )
      .subscribe((s) => {
        if (DEV) console.log('Realtime status:', s);
        if (s === 'SUBSCRIBED') {
          channelSubscribedRef.current = true;
        } else {
          channelSubscribedRef.current = false;
          applyRealStatus('offline');
        }
      });

    const freshnessTimer = setInterval(() => {
      const fresh = Date.now() - lastDataAtRef.current < STALE_THRESHOLD_MS;
      if (channelSubscribedRef.current && fresh) applyRealStatus('online');
      else applyRealStatus('offline');
    }, FRESHNESS_CHECK_INTERVAL_MS);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(freshnessTimer);
      if (simulateTimerRef.current != null) {
        clearTimeout(simulateTimerRef.current);
        simulateTimerRef.current = null;
      }
      if (simulateIntervalRef.current != null) {
        clearInterval(simulateIntervalRef.current);
        simulateIntervalRef.current = null;
      }
    };
  }, [tableName, updateData, applyRealStatus]);

  return { telemetry, history, loading, status, maxAlt, minTemp, maxSpeed, flightStartMs, loadTestData, resetFlight };
};
