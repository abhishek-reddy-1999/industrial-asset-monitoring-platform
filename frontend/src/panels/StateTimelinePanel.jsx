import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

export default function StateTimelinePanel({ panel }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const equipments = [
    'Feed Pump P-101A',
    'Standby Pump P-101B',
    'Reflux Pump P-102A',
    'Overhead Fan E-101',
    'Bottom Booster P-103'
  ];

  const types = [
    { name: 'RUNNING', color: '#10b981' },
    { name: 'STANDBY', color: '#0284c7' },
    { name: 'MAINTENANCE', color: '#f59e0b' },
    { name: 'TRIPPED', color: '#f43f5e' }
  ];

  useEffect(() => {
    if (!chartRef.current) return;
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const now = Date.now();
    const data = [];

    // Map actual equipment states over operational window
    equipments.forEach((eq, eqIdx) => {
      const isRunning = eqIdx === 0 
        ? (liveTelemetry?.['PUMP_101A.ST']?.value !== 0) 
        : eqIdx === 1 ? false : true;
      const typeIdx = isRunning ? 0 : 1;
      const dur = 4 * 3600 * 1000;
      data.push({
        name: types[typeIdx].name,
        value: [eqIdx, now - dur, now, dur],
        itemStyle: { color: types[typeIdx].color, borderRadius: 2 }
      });
    });

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        backgroundColor: 'rgba(22, 29, 43, 0.95)',
        textStyle: { color: '#f1f5f9' },
        formatter: (params) => {
          const start = new Date(params.value[1]).toLocaleTimeString();
          const end = new Date(params.value[2]).toLocaleTimeString();
          return `<b>${equipments[params.value[0]]}</b><br/>State: <strong style="color:${params.color}">${params.name}</strong><br/>Interval: ${start} - ${end}`;
        }
      },
      legend: {
        top: 0,
        data: types.map(t => t.name),
        textStyle: { color: '#94a3b8', fontSize: 10 },
        icon: 'circle'
      },
      grid: { left: '16%', right: '4%', top: '15%', bottom: '15%', containLabel: true },
      xAxis: {
        type: 'time',
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#64748b', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } }
      },
      yAxis: {
        data: equipments,
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#cbd5e1', fontSize: 10 }
      },
      series: [
        {
          type: 'custom',
          renderItem: (params, api) => {
            const categoryIndex = api.value(0);
            const start = api.coord([api.value(1), categoryIndex]);
            const end = api.coord([api.value(2), categoryIndex]);
            const height = api.size([0, 1])[1] * 0.65;
            const rectShape = echarts.graphic.clipRectByRect(
              {
                x: start[0],
                y: start[1] - height / 2,
                width: end[0] - start[0],
                height: height
              },
              {
                x: params.coordSys.x,
                y: params.coordSys.y,
                width: params.coordSys.width,
                height: params.coordSys.height
              }
            );
            return rectShape && {
              type: 'rect',
              transition: ['shape'],
              shape: rectShape,
              style: api.style()
            };
          },
          itemStyle: { opacity: 0.88 },
          encode: { x: [1, 2], y: 0 },
          data: data
        }
      ]
    };

    chartInstance.current.setOption(option);

    const handleResize = () => chartInstance.current?.resize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => chartInstance.current?.resize(), 100);
    return () => clearTimeout(timer);
  }, [panel.w, panel.h]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
