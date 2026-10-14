import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

export default function CorrelationMatrixPanel({ panel }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const variables = ['TIC-101', 'TIC-102', 'PIC-101', 'FIC-101', 'FIC-102', 'VIB-101'];
  
  // Normalized Pearson correlation coefficients (simulated cross-correlations)
  const matrix = [
    [1.00,  0.88,  0.72,  0.64,  0.78,  0.15],
    [0.88,  1.00,  0.65,  0.58,  0.62,  0.22],
    [0.72,  0.65,  1.00,  0.45,  0.82,  0.18],
    [0.64,  0.58,  0.45,  1.00,  0.35,  0.31],
    [0.78,  0.62,  0.82,  0.35,  1.00,  0.12],
    [0.15,  0.22,  0.18,  0.31,  0.12,  1.00]
  ];

  const data = [];
  for (let i = 0; i < variables.length; i++) {
    for (let j = 0; j < variables.length; j++) {
      data.push([j, i, matrix[i][j]]);
    }
  }

  useEffect(() => {
    if (!chartRef.current) return;
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        position: 'top',
        backgroundColor: 'rgba(22, 29, 43, 0.95)',
        textStyle: { color: '#f1f5f9' },
        formatter: (params) => {
          return `${variables[params.value[1]]} vs ${variables[params.value[0]]}: <b>${params.value[2].toFixed(2)} r</b>`;
        }
      },
      grid: { left: '14%', right: '12%', top: '8%', bottom: '15%', containLabel: true },
      xAxis: {
        type: 'category',
        data: variables,
        splitArea: { show: true },
        axisLabel: { color: '#94a3b8', fontSize: 10, rotate: 25 },
        axisLine: { lineStyle: { color: '#334155' } }
      },
      yAxis: {
        type: 'category',
        data: variables,
        splitArea: { show: true },
        axisLabel: { color: '#94a3b8', fontSize: 10 },
        axisLine: { lineStyle: { color: '#334155' } }
      },
      visualMap: {
        min: 0,
        max: 1,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: '0%',
        inRange: {
          color: ['#0f172a', '#0369a1', '#38bdf8', '#fbbf24', '#f43f5e']
        },
        textStyle: { color: '#64748b', fontSize: 9 }
      },
      series: [
        {
          name: 'Correlation Coefficient',
          type: 'heatmap',
          data: data,
          label: {
            show: true,
            color: '#f8fafc',
            fontSize: 10,
            formatter: (p) => p.value[2].toFixed(2)
          },
          emphasis: {
            itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' }
          }
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
