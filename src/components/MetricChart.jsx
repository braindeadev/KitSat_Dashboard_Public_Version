import { useMemo } from 'react';
import TelemetryChart from './TelemetryChart';

export default function MetricChart({ history, dataKey, unit, color, rangeMs }) {
  const { data, domain, ticks } = useMemo(() => {
    if (history.length === 0) return { data: history, domain: undefined, ticks: undefined };
    const firstMs = history[0].rawTimeMs;
    const latestMs = history[history.length - 1].rawTimeMs;

    let domStart, domEnd, chartData;
    if (rangeMs == null) {
      domStart = firstMs;
      domEnd = latestMs;
      chartData = history;
    } else if (latestMs - firstMs < rangeMs) {
      domStart = firstMs;
      domEnd = firstMs + rangeMs;
      chartData = history;
    } else {
      domStart = latestMs - rangeMs;
      domEnd = latestMs;
      chartData = history.filter((h) => h.rawTimeMs >= domStart);
    }

    const TICK_COUNT = 6;
    const span = domEnd - domStart;
    const step = span > 0 ? span / (TICK_COUNT - 1) : 0;
    const tickArr = step > 0
      ? Array.from({ length: TICK_COUNT }, (_, i) => Math.round(domStart + step * i))
      : [domStart];

    return { data: chartData, domain: [domStart, domEnd], ticks: tickArr };
  }, [history, rangeMs]);

  return (
    <div className="metric-chart">
      <div className="metric-chart-canvas">
        <TelemetryChart data={data} dataKey={dataKey} unit={unit} color={color} domain={domain} ticks={ticks} />
      </div>
    </div>
  );
}
