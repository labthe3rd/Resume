// file: ./components/HeaterPowerGraph.js
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function HeaterPowerGraph({ heaterPower }) {
  const [powerHistory, setPowerHistory] = useState([]);

  useEffect(() => {
    if (heaterPower !== undefined) {
      setPowerHistory(prev => {
        const newHistory = [...prev, {
          time: Date.now(),
          power: heaterPower,
          timestamp: new Date().toLocaleTimeString()
        }];
        // Keep last 50 data points (5 seconds at 100ms updates)
        return newHistory.slice(-50);
      });
    }
  }, [heaterPower]);

  return (
    <div className="bg-gray-700 rounded p-4">
      <h3 className="text-white font-semibold mb-2">Heater Power Output</h3>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={powerHistory}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="timestamp" 
            tick={{ fill: '#9CA3AF', fontSize: 10 }}
            interval="preserveStartEnd"
            minTickGap={50}
          />
          <YAxis 
            domain={[0, 100]} 
            tick={{ fill: '#9CA3AF', fontSize: 10 }}
            label={{ value: '%', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
            labelStyle={{ color: '#9CA3AF' }}
            itemStyle={{ color: '#60A5FA' }}
          />
          <Line 
            type="monotone" 
            dataKey="power" 
            stroke="#60A5FA" 
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}