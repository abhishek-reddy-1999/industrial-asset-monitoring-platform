import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

export default function BulletGraphPanel({ panel, liveTelemetry }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const tag = panel.tags?.[0] || 'TIC_101.PV';
  const live = liveTelemetry?.[tag];
  const value = live ? Number(live.value) : (panel.fallbackValue ?? 118.2);
  const target = panel.target ?? 125.0;
  const max = panel.max ?? 180.0;
  const unit = panel.unit || live?.eng_units || '°C';

  useEffect(() => {
    if (!chartRef.current) return;
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          return `<strong>${panel.title || tag}</strong><br/>Current Value: <b>${value} ${unit}</b><br/>Target Value: <b>${target} ${unit}</b>`;
        }
      },
      grid: { left: '8%', right: '12%', top: '25%', bottom: '25%', containLabel: true },
      xAxis: {
        type: 'value',
        max: max,
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
        axisLabel: { color: '#64748b', fontSize: 10, formatter: `{value} ${unit}` }
      },
      yAxis: {
        type: 'category',
        data: [panel.title || tag],
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#94a3b8', fontSize: 11, fontWeight: 600 }
      },
      series: [
        // Background Range Bands (Good, Warning, Critical)
        {
          name: 'Normal Zone',
          type: 'bar',
          stack: 'ranges',
          silent: true,
          barWidth: 32,
          itemStyle: { color: 'rgba(16, 185, 129, 0.25)' },
          data: [max * 0.6]
        },
        {
          name: 'Warning Zone',
          type: 'bar',
          stack: 'ranges',
          silent: true,
          barWidth: 32,
          itemStyle: { color: 'rgba(245, 158, 11, 0.25)' },
          data: [max * 0.25]
        },
        {
          name: 'Critical Zone',
          type: 'bar',
          stack: 'ranges',
          silent: true,
          barWidth: 32,
          itemStyle: { color: 'rgba(244, 63, 94, 0.25)' },
          data: [max * 0.15]
        },
        // Actual Value Bar
        {
          name: 'Actual Value',
          type: 'bar',
          barWidth: 16,
          z: 3,
          barGap: '-75%',
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#0284c7' },
              { offset: 1, color: '#38bdf8' }
            ]),
            borderRadius: [0, 4, 4, 0]
          },
          label: {
            show: true,
            position: 'right',
            color: '#f1f5f9',
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 'bold',
            formatter: `${value} ${unit}`
          },
          data: [value]
        },
        // Target Marker Line
        {
          name: 'Target Benchmark',
          type: 'scatter',
          z: 4,
          symbol: 'rect',
          symbolSize: [4, 38],
          itemStyle: { color: '#f43f5e' },
          data: [[target, 0]]
        }
      ]
    };

    chartInstance.current.setOption(option);
  }, [value, target, max, unit, panel.title, tag]);

  useEffect(() => {
    const handleResize = () => chartInstance.current?.resize();
    window.addEventListener('resize', handleResize);
    const timer = setTimeout(handleResize, 100);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [panel.w, panel.h]);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1 }}>
        <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}
