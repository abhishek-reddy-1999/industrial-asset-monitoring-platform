import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

export default function FloorHeatmapPanel({ panel, liveTelemetry }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const tag1 = panel.tags?.[0] || 'TIC_101.PV';
  const tag2 = panel.tags?.[1] || 'TIC_102.PV';
  const topTemp = Number(liveTelemetry?.[tag1]?.value || 118.0);
  const botTemp = Number(liveTelemetry?.[tag2]?.value || 235.0);

  const baysX = ['Bay 1 (Crude Feed)', 'Bay 2 (Preheat)', 'Bay 3 (Fractionator)', 'Bay 4 (Reflux)', 'Bay 5 (Offgas)'];
  const levelsY = ['Deck L4 (+45m)', 'Deck L3 (+30m)', 'Deck L2 (+15m)', 'Ground L1 (0m)'];

  useEffect(() => {
    if (!chartRef.current) return;
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    // Thermal distribution map calculated from live top & bot temperatures
    const data = [];
    for (let y = 0; y < levelsY.length; y++) {
      for (let x = 0; x < baysX.length; x++) {
        // Temperature gradient from top to bottom and center outward
        const verticalRatio = (levelsY.length - 1 - y) / (levelsY.length - 1);
        const baseTemp = topTemp + (botTemp - topTemp) * verticalRatio;
        const radialCooling = Math.abs(x - 2) * 12.0;
        const spotTemp = Math.round(baseTemp - radialCooling + (Math.sin(x + y) * 3));
        data.push([x, y, spotTemp]);
      }
    }

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        position: 'top',
        backgroundColor: 'rgba(22, 29, 43, 0.95)',
        textStyle: { color: '#f1f5f9' },
        formatter: (params) => {
          return `<b>${baysX[params.value[0]]}</b> @ ${levelsY[params.value[1]]}<br/>Surface Temp: <b>${params.value[2]} °C</b>`;
        }
      },
      grid: { left: '18%', right: '12%', top: '10%', bottom: '20%', containLabel: true },
      xAxis: {
        type: 'category',
        data: baysX,
        splitArea: { show: true },
        axisLabel: { color: '#94a3b8', fontSize: 10, rotate: 15 },
        axisLine: { lineStyle: { color: '#334155' } }
      },
      yAxis: {
        type: 'category',
        data: levelsY,
        splitArea: { show: true },
        axisLabel: { color: '#94a3b8', fontSize: 10 },
        axisLine: { lineStyle: { color: '#334155' } }
      },
      visualMap: {
        min: 60,
        max: 250,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: '0%',
        inRange: {
          color: ['#0284c7', '#38bdf8', '#34d399', '#f59e0b', '#f43f5e']
        },
        textStyle: { color: '#64748b', fontSize: 9 },
        formatter: '{value} °C'
      },
      series: [
        {
          name: 'Plant Deck Thermal Map',
          type: 'heatmap',
          data: data,
          label: {
            show: true,
            color: '#ffffff',
            fontWeight: 'bold',
            fontSize: 10,
            formatter: (p) => `${p.value[2]}°`
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
  }, [topTemp, botTemp]);

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
