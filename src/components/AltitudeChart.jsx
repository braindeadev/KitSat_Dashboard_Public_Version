import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const AltitudeChart = ({ data }) => {
  return (
    <div style={{ width: '100%', flex: 1, minHeight: 0, marginTop: '10px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 2" stroke="#ddd" />
          <XAxis 
            dataKey="time" 
            hide={true} 
          />
          <YAxis 
            domain={['auto', 'auto']} 
            fontSize={10}
            tick={{ fill: '#333' }}
            tickFormatter={(value) => `${value}m`}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #999', borderRadius: '0' }}
          />
          <Line 
            type="monotone" 
            dataKey="alt" 
            stroke="#000" 
            strokeWidth={1.5} 
            dot={{ r: 2, fill: '#000' }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AltitudeChart;
