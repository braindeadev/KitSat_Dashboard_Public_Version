import { useState, useEffect } from 'react';

const pad = (n) => String(n).padStart(2, '0');

export default function FlightTimer({ startMs }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const sec = Math.max(0, Math.floor((now - startMs) / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;

  return <span>{`${pad(h)}:${pad(m)}:${pad(s)}`}</span>;
}
