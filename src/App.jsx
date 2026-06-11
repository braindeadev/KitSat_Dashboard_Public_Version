import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useTelemetry } from './hooks/useTelemetry';
import LatestImage from './components/LatestImage';
import FlightTimer from './components/FlightTimer';
import './App.css';

// Lazy-ladataan raskaat riippuvuudet (leaflet, recharts) omiin chunkkeihinsa,
// jotta ensilatauksen nippu pienenee.
const MapComponent = lazy(() => import('./components/MapComponent'));
const MetricChart = lazy(() => import('./components/MetricChart'));

const RANGES = [
  { label: '1m', ms: 60_000 },
  { label: '5m', ms: 300_000 },
  { label: '30m', ms: 1_800_000 },
  { label: '1h', ms: 3_600_000 },
  { label: 'MAX', ms: null },
];

const ROUTE_MAX_POINTS = 2000;

// Teema: käyttäjän tallentama valinta voittaa, muuten käyttöjärjestelmän oletus.
const getInitialTheme = () => {
  const saved = localStorage.getItem('theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};

// Reitti on vain visuaalinen: harvennetaan tasavälein mutta pidetään viimeisin
// piste mukana, jotta marker-jälki on ajan tasalla. Raakadata ei muutu.
function buildRoute(history) {
  const pts = [];
  for (const h of history) if (h.fix) pts.push([h.lat, h.lon]);
  if (pts.length <= ROUTE_MAX_POINTS) return pts;
  const step = pts.length / ROUTE_MAX_POINTS;
  const out = [];
  for (let i = 0; i < ROUTE_MAX_POINTS; i++) out.push(pts[Math.floor(i * step)]);
  const last = pts[pts.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

function App() {
  const { telemetry, history, loading, status, maxAlt, minTemp, maxSpeed, flightStartMs, lastDataMs } = useTelemetry();
  const [rangeMs, setRangeMs] = useState(60_000);
  const [theme, setTheme] = useState(getInitialTheme);
  const route = useMemo(() => buildRoute(history), [history]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Seurataan käyttöjärjestelmän teemaa niin kauan kuin käyttäjä ei ole
  // tehnyt omaa valintaa.
  useEffect(() => {
    if (localStorage.getItem('theme')) return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = (e) => setTheme(e.matches ? 'light' : 'dark');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const toggleTheme = () => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', next);
      return next;
    });
  };

  if (loading) {
    return <div className="loading">YHDISTETÄÄN OHJAUSKESKUKSEEN...</div>;
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>PSL-1R // Public dashboard</h1>
          <div className="flight-id">
            <span className="flight-id-label">Flight ID</span>
            <span>{telemetry?.flight_id ?? '--'}</span>
          </div>
          <div className="flight-time">
            <span className="flight-time-label">Lentoaika</span>
            <FlightTimer startMs={flightStartMs} lastDataMs={lastDataMs} />
          </div>
          <div className="header-range">
            {RANGES.map((r) => (
              <button
                key={r.label}
                className={`range-btn${rangeMs === r.ms ? ' active' : ''}`}
                onClick={() => setRangeMs(r.ms)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className="header-right">
          <button className="range-btn theme-btn" onClick={toggleTheme} aria-label="Vaihda teema" title="Vaihda teema">
            {theme === 'dark' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
            )}
          </button>
          <div className={`status-indicator ${status}`}>
            <span className="status-dot"></span>
            {status === 'online' ? 'VERKOSSA' : 'EI YHTEYTTÄ'}
          </div>
        </div>
      </header>

      <main className="dashboard-grid">
        <Suspense fallback={<div className="loading">LADATAAN…</div>}>
          <div className="glass-card altitude-section">
            <h3 className="label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
              Korkeus
            </h3>
            <p className="value-large">
              {telemetry?.gps_alt?.toFixed(1) ?? '--'}<span className="unit">m</span>
            </p>
            <div className="metric-meta">
              MAX <strong>{maxAlt != null ? maxAlt.toFixed(1) : '--'}</strong> m
            </div>
            {/* Korkeuskäyrä on keltainen molemmissa teemoissa (light-teeman
                --primary on tummempi amber, joten väri kovakoodataan) */}
            <MetricChart history={history} dataKey="alt" unit="m" color="#fbbf24" rangeMs={rangeMs} />
          </div>

          <div className="metrics-row left-metrics">
            <div className="glass-card">
              <h3 className="label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/></svg>
                Lämpötila
              </h3>
              <p className="value-medium">
                {telemetry?.temp_c?.toFixed(1) ?? '--'}<span className="unit">°C</span>
              </p>
              <div className="metric-meta">
                MIN <strong>{minTemp != null ? minTemp.toFixed(1) : '--'}</strong> °C
              </div>
              <MetricChart history={history} dataKey="temp" unit="°C" color="var(--accent)" rangeMs={rangeMs} />
            </div>
            <div className="glass-card">
              <h3 className="label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2v4"/><path d="M12 18v4"/><path d="m4.93 4.93 2.83 2.83"/><path d="m16.24 16.24 2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="m4.93 19.07 2.83-2.83"/><path d="m16.24 7.76 2.83-2.83"/></svg>
                Ilmanpaine
              </h3>
              <p className="value-medium">
                {telemetry?.pressure_hpa?.toFixed(1) ?? '--'}<span className="unit">hPa</span>
              </p>
              <MetricChart history={history} dataKey="pressure" unit="hPa" color="var(--success)" rangeMs={rangeMs} />
            </div>
          </div>
          <div className="glass-card map-section">
            <MapComponent
              lat={telemetry?.gps_fix ? telemetry.gps_lat : null}
              lng={telemetry?.gps_fix ? telemetry.gps_lon : null}
              route={route}
              theme={theme}
            />
          </div>

          <div className="metrics-row right-metrics">
            <div className="glass-card">
              <h3 className="label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>
                Nopeus
              </h3>
              <p className="value-medium">
                {telemetry?.gps_speed?.toFixed(1) ?? '--'}<span className="unit">m/s</span>
              </p>
              <div className="metric-meta">
                MAX <strong>{maxSpeed != null ? maxSpeed.toFixed(1) : '--'}</strong> m/s
              </div>
              <MetricChart history={history} dataKey="speed" unit="m/s" color="var(--error)" rangeMs={rangeMs} />
            </div>
            <div className="glass-card image-section">
              <h3 className="label">Viimeisin kuva</h3>
              <LatestImage />
            </div>
          </div>
        </Suspense>
      </main>
    </div>
  );
}

export default App;
