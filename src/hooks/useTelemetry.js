import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';

export const useTelemetry = () => {
  const [telemetry, setTelemetry] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('connecting');

  const tableName = import.meta.env.VITE_SUPABASE_TABLE;

  const updateData = useCallback((newData) => {
    setTelemetry(newData);
    setHistory(prev => {
      const entry = {
        time: new Date(newData.created_at).toLocaleTimeString(),
        alt: newData.gps_alt || newData.alt || 0, // Handle different possible property names
        temp: newData.temp_c || newData.temp || 0
      };
      const updated = [...prev, entry].slice(-50);
      return updated;
    });
  }, []);

  const loadTestData = useCallback(() => {
    console.log('Loading simulated test data...');
    const now = new Date();
    const mockHistory = Array.from({ length: 30 }).map((_, i) => ({
      time: new Date(now.getTime() - (30 - i) * 1000).toLocaleTimeString(),
      alt: 100 + Math.sin(i * 0.5) * 50 + (i * 2),
      temp: 20 + Math.cos(i * 0.5) * 5
    }));
    
    setHistory(mockHistory);
    setTelemetry({
      gps_alt: mockHistory[29].alt,
      temp_c: mockHistory[29].temp,
      pressure_hpa: 1013.2,
      flight_id: "DEMO-MODE",
      gps_lat: 60.1695,
      gps_lon: 24.9354,
      created_at: now.toISOString()
    });
    setStatus('online');
  }, []);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setStatus('connecting');
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          console.error('Supabase fetch error:', error.message);
          setStatus('offline');
        } else if (data && data.length > 0) {
          const latest = data[0];
          setTelemetry(latest);
          const historyData = [...data].reverse().map(d => ({
            time: new Date(d.created_at).toLocaleTimeString(),
            alt: d.gps_alt || d.alt || 0,
            temp: d.temp_c || d.temp || 0
          }));
          setHistory(historyData);
          setStatus('online');
        } else {
          setStatus('online');
        }
      } catch (err) {
        console.error('Catch error:', err);
        setStatus('offline');
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
          console.log('Realtime update received!');
          updateData(payload.new);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
            console.log('Realtime subscription active');
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setStatus('offline');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableName, updateData]);

  return { telemetry, history, loading, status, loadTestData };
};
