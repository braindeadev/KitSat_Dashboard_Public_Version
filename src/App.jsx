import { useTelemetry } from './hooks/useTelemetry';
import MapComponent from './components/MapComponent';
import TelemetryChart from './components/TelemetryChart';
import './App.css';

function App() {
  const { telemetry, history, loading, status, loadTestData } = useTelemetry();

  if (loading) {
    return <div className="loading">CONNECTING TO MISSION CONTROL...</div>;
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-left">
          <div style={{ width: '24px', height: '24px', background: 'var(--primary)', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#000', fontSize: '0.7rem' }}>KS</div>
          <h1>PSL-1R // Public dashboard</h1>
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
              {telemetry?.gps_alt?.toFixed(0) ?? '--'}<span className="unit">m</span>
            </p>
            <div style={{ flex: 1, minHeight: 0, marginTop: '0.5rem' }}>
              <TelemetryChart data={history} dataKey="alt" unit="m" color="var(--primary)" />
            </div>
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
            </div>
            <div className="glass-card">
              <h3 className="label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2v4"/><path d="M12 18v4"/><path d="m4.93 4.93 2.83 2.83"/><path d="m16.24 16.24 2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="m4.93 19.07 2.83-2.83"/><path d="m16.24 7.76 2.83-2.83"/></svg>
                Air Pressure
              </h3>
              <p className="value-medium">
                {telemetry?.pressure_hpa?.toFixed(1) ?? '--'}<span className="unit">hPa</span>
              </p>
            </div>
          </div>
        </section>

        <section className="right-column">
          <div className="glass-card map-section">
            <MapComponent 
              lat={telemetry?.gps_lat} 
              lng={telemetry?.gps_lon} 
            />
          </div>

          <div className="glass-card info-section">
            <h3 className="label">Metadata</h3>
            <div className="info-list">
              <div className="info-item">
                <h4>Flight ID</h4>
                <p>{telemetry?.flight_id ?? 'N/A'}</p>
              </div>
              <div className="info-item">
                <h4>T-Plus</h4>
                <p>{telemetry ? new Date(telemetry.created_at).toLocaleTimeString() : '--:--:--'}</p>
              </div>
              <div className="info-item">
                <h4>coordinates</h4>
                <p>{telemetry?.gps_lat?.toFixed(5)} N, {telemetry?.gps_lon?.toFixed(5)} E</p>
              </div>
              <div className="info-item" style={{ alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                <button onClick={loadTestData} className="btn-mission">
                  SIMULATE
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="dashboard-footer">
        <div style={{ display: 'flex', gap: '2rem' }}>
          <span>NODE_ID: PSL-1R // REFACTORED</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
