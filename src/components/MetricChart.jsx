import { useState, useMemo } from 'react';
import TelemetryChart from './TelemetryChart';

const RANGES = [
  { label: '1m', ms: 60_000 },
  { label: '5m', ms: 300_000 },
  { label: '30m', ms: 1_800_000 },
  { label: '1h', ms: 3_600_000 },
  { label: 'MAX', ms: null },
];

const DEFAULT_MS = 60_000;

export default function MetricChart({ history, dataKey, unit, color }) {
  const [rangeMs, setRangeMs] = useState(DEFAULT_MS);

  const data = useMemo(() => {
    if (rangeMs == null) return history;
    const cutoff = Date.now() - rangeMs;
    return history.filter((h) => h.rawTimeMs >= cutoff);
  }, [history, rangeMs]);

  return (
    <div className="metric-chart">
      <div className="metric-chart-canvas">
        <TelemetryChart data={data} dataKey={dataKey} unit={unit} color={color} />
      </div>
      <div className="range-buttons">
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
  );
}
