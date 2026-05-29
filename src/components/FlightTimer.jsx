import { useState, useEffect, useRef } from 'react';

const pad = (n) => String(n).padStart(2, '0');

export default function FlightTimer({ startMs, lastDataMs }) {
  const [display, setDisplay] = useState('--:--:--');
  const anchorServerMsRef = useRef(lastDataMs);
  const anchorBrowserMsRef = useRef(null);

  useEffect(() => {
    if (lastDataMs != null && lastDataMs !== anchorServerMsRef.current) {
      anchorServerMsRef.current = lastDataMs;
      anchorBrowserMsRef.current = Date.now();
    }
  }, [lastDataMs]);

  useEffect(() => {
    const update = () => {
      if (startMs == null || anchorServerMsRef.current == null) {
        setDisplay('--:--:--');
        return;
      }
      if (anchorBrowserMsRef.current == null) anchorBrowserMsRef.current = Date.now();
      const estimatedNow = anchorServerMsRef.current + (Date.now() - anchorBrowserMsRef.current);
      const sec = Math.max(0, Math.floor((estimatedNow - startMs) / 1000));
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = sec % 60;
      setDisplay(`${pad(h)}:${pad(m)}:${pad(s)}`);
    };

    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [startMs]);

  return <span>{display}</span>;
}
