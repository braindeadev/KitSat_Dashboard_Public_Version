import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const TelemetryChart = React.memo(({ data, dataKey, unit, color = "var(--primary)" }) => {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="rgba(255,255,255,0.05)" />
          <XAxis 
            dataKey="time" 
            fontSize={13}
            tick={{ fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}
            axisLine={{ stroke: 'var(--border)' }}
            tickLine={false}
            minTickGap={40}
            dy={15}
          />
          <YAxis 
            domain={['auto', 'auto']} 
            fontSize={13}
            tick={{ fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `${value}${unit}`}
            width={65}
          />
          <Tooltip
            labelStyle={{ color: 'var(--text-main)', fontWeight: 'bold', fontSize: '11px', marginBottom: '4px', fontFamily: 'var(--font-sans)' }}
            contentStyle={{
              backgroundColor: 'var(--card-bg)',
              backdropFilter: 'blur(8px)',
              borderRadius: '4px',
              border: '1px solid var(--border)',
              padding: '8px',
              boxShadow: 'var(--shadow-lg)'
            }}
            itemStyle={{ color: color, fontSize: '11px', fontFamily: 'var(--font-mono)' }}
            cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
            formatter={(value) => [`${Number(value).toFixed(2)} ${unit}`, dataKey]}
          />
          <Line 
            type="monotone" 
            dataKey={dataKey} 
            stroke={color} 
            strokeWidth={2} 
            dot={false}
            activeDot={{ r: 4, fill: color, stroke: 'var(--bg-color)', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

export default TelemetryChart;
