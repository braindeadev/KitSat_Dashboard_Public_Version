import { useState, useEffect, useRef } from 'react';

const pad = (n) => String(n).padStart(2, '0');

export default function FlightTimer({ startMs, lastDataMs }) {
  const [tick, setTick] = useState(0);
  const anchorServerMsRef = useRef(lastDataMs);
  const anchorBrowserMsRef = useRef(Date.now());

  useEffect(() => {
    if (lastDataMs != null && lastDataMs !== anchorServerMsRef.current) {
      anchorServerMsRef.current = lastDataMs;
      anchorBrowserMsRef.current = Date.now();
    }
  }, [lastDataMs]);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  if (startMs == null || anchorServerMsRef.current == null) {
    return <span>--:--:--</span>;
  }

  const estimatedNow = anchorServerMsRef.current + (Date.now() - anchorBrowserMsRef.current);
  const sec = Math.max(0, Math.floor((estimatedNow - startMs) / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;

  void tick;

  return <span>{`${pad(h)}:${pad(m)}:${pad(s)}`}</span>;
}
