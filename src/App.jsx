import { useTelemetry } from './hooks/useTelemetry';
import MapComponent from './components/MapComponent';
import MetricChart from './components/MetricChart';
import LatestImage from './components/LatestImage';
import FlightTimer from './components/FlightTimer';
import './App.css';

function App() {
  const { telemetry, history, loading, status, maxAlt, minTemp, maxSpeed, flightStartMs, loadTestData, resetFlight } = useTelemetry();

  if (loading) {
    return <div className="loading">CONNECTING TO MISSION CONTROL...</div>;
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-left">
          <div style={{ width: '24px', height: '24px', background: 'var(--primary)', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#000', fontSize: '0.7rem' }}>KS</div>
          <h1>PSL-1R // Public dashboard</h1>
          <div className="flight-time">
            <span className="flight-time-label">Lentoaika</span>
            <FlightTimer startMs={flightStartMs} />
          </div>
          <button onClick={resetFlight} className="btn-mission">RESET</button>
        </div>
        <div className="header-right">
          <div className={`status-indicator ${status}`}>
            <span className="status-dot"></span>
            {status.toUpperCase()}
          </div>
          <button onClick={loadTestData} className="btn-mission">
            SIMULATE
          </button>
        </div>
      </header>

      <main className="dashboard-grid">
        <section className="left-column">
          <div className="glass-card altitude-section">
            <h3 className="label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
              Altitude
            </h3>
            <p className="value-large">
              {telemetry?.gps_alt?.toFixed(1) ?? '--'}<span className="unit">m</span>
            </p>
            <div className="metric-meta">
              MAX <strong>{maxAlt != null ? maxAlt.toFixed(1) : '--'}</strong> m
            </div>
            <MetricChart history={history} dataKey="alt" unit="m" color="var(--primary)" />
          </div>

          <div className="metrics-row">
            <div className="glass-card">
              <h3 className="label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/></svg>
                Temp
              </h3>
              <p className="value-medium">
                {telemetry?.temp_c?.toFixed(1) ?? '--'}<span className="unit">°C</span>
              </p>
              <div className="metric-meta">
                MIN <strong>{minTemp != null ? minTemp.toFixed(1) : '--'}</strong> °C
              </div>
              <MetricChart history={history} dataKey="temp" unit="°C" color="var(--accent)" />
            </div>
            <div className="glass-card">
              <h3 className="label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2v4"/><path d="M12 18v4"/><path d="m4.93 4.93 2.83 2.83"/><path d="m16.24 16.24 2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="m4.93 19.07 2.83-2.83"/><path d="m16.24 7.76 2.83-2.83"/></svg>
                Air Pressure
              </h3>
              <p className="value-medium">
                {telemetry?.pressure_hpa?.toFixed(1) ?? '--'}<span className="unit">hPa</span>
              </p>
              <MetricChart history={history} dataKey="pressure" unit="hPa" color="var(--success)" />
            </div>
          </div>
        </section>

        <section className="right-column">
          <div className="glass-card map-section">
            <MapComponent
              lat={telemetry?.gps_fix ? telemetry.gps_lat : null}
              lng={telemetry?.gps_fix ? telemetry.gps_lon : null}
              route={history.filter((h) => h.fix).map((h) => [h.lat, h.lon])}
            />
          </div>

          <div className="metrics-row">
            <div className="glass-card">
              <h3 className="label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>
                Speed
              </h3>
              <p className="value-medium">
                {telemetry?.gps_speed?.toFixed(1) ?? '--'}<span className="unit">m/s</span>
              </p>
              <div className="metric-meta">
                MAX <strong>{maxSpeed != null ? maxSpeed.toFixed(1) : '--'}</strong> m/s
              </div>
              <MetricChart history={history} dataKey="speed" unit="m/s" color="var(--error)" />
            </div>
            <div className="glass-card image-section">
              <h3 className="label">Latest Image</h3>
              <LatestImage />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
