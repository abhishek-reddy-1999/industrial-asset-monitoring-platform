import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

export default function SankeyPanel({ panel, liveTelemetry }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const feedTag = panel.tags?.[0] || 'FIC_101.PV';
  const refluxTag = panel.tags?.[1] || 'FIC_102.PV';
  const feedFlow = Number(liveTelemetry?.[feedTag]?.value || 450.0);
  const refluxFlow = Number(liveTelemetry?.[refluxTag]?.value || 180.0);

  useEffect(() => {
    if (!chartRef.current) return;
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const naphtha = Math.round(feedFlow * 0.28);
    const kerosene = Math.round(feedFlow * 0.18);
    const diesel = Math.round(feedFlow * 0.32);
    const residue = Math.round(feedFlow * 0.22);

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        triggerOn: 'mousemove',
        backgroundColor: 'rgba(22, 29, 43, 0.95)',
        textStyle: { color: '#f1f5f9' },
        formatter: (params) => `${params.data.source} → ${params.data.target}: <b>${params.data.value} m³/h</b>`
      },
      series: [
        {
          type: 'sankey',
          layout: 'none',
          emphasis: { focus: 'adjacency' },
          nodeWidth: 16,
          nodeGap: 14,
          data: [
            { name: 'Crude Storage Tanks', itemStyle: { color: '#0284c7' } },
            { name: 'Furnace H-101 (Preheat)', itemStyle: { color: '#f59e0b' } },
            { name: 'CDU Column C-101', itemStyle: { color: '#38bdf8' } },
            { name: 'Overhead Naphtha', itemStyle: { color: '#34d399' } },
            { name: 'Kerosene (Jet-A1)', itemStyle: { color: '#10b981' } },
            { name: 'Gas Oil / Diesel', itemStyle: { color: '#6366f1' } },
            { name: 'Atmospheric Residue', itemStyle: { color: '#a855f7' } },
            { name: 'VDU Unit 200', itemStyle: { color: '#ec4899' } }
          ],
          links: [
            { source: 'Crude Storage Tanks', target: 'Furnace H-101 (Preheat)', value: Math.round(feedFlow) },
            { source: 'Furnace H-101 (Preheat)', target: 'CDU Column C-101', value: Math.round(feedFlow) },
            { source: 'CDU Column C-101', target: 'Overhead Naphtha', value: naphtha },
            { source: 'CDU Column C-101', target: 'Kerosene (Jet-A1)', value: kerosene },
            { source: 'CDU Column C-101', target: 'Gas Oil / Diesel', value: diesel },
            { source: 'CDU Column C-101', target: 'Atmospheric Residue', value: residue },
            { source: 'Atmospheric Residue', target: 'VDU Unit 200', value: residue }
          ],
          lineStyle: {
            color: 'gradient',
            curveness: 0.5,
            opacity: 0.4
          },
          label: {
            color: '#cbd5e1',
            fontSize: 10,
            fontWeight: 500
          }
        }
      ]
    };

    chartInstance.current.setOption(option);

    const handleResize = () => chartInstance.current?.resize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [feedFlow, refluxFlow]);

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
