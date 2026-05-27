import { useMemo } from 'react';
import TelemetryChart from './TelemetryChart';

export default function MetricChart({ history, dataKey, unit, color, rangeMs }) {
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
    </div>
  );
}
