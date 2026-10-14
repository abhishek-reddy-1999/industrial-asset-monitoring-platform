import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { AlertCircle, Code } from 'lucide-react';
import { queryTimeSeries } from '../api/client';

export default function CustomEChartsPanel({ panel, timeRange, liveTelemetry }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [error, setError] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);

  // Fetch historical data if tags are configured
  useEffect(() => {
    let isMounted = true;
    if (panel.tags && panel.tags.length > 0) {
      queryTimeSeries(panel.tags, timeRange, 'now')
        .then((data) => {
          if (isMounted) setHistoricalData(data.series || []);
        })
        .catch((err) => console.warn('Custom ECharts historical fetch error:', err));
    }
    return () => { isMounted = false; };
  }, [panel.tags, timeRange]);

  // Execute user script and apply ECharts option
  useEffect(() => {
    if (!chartRef.current) return;
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    try {
      setError(null);
      let option = null;

      if (panel.customScript && panel.customScript.trim()) {
        // Execute user defined script:
        // Function signature: (context: { tags, liveTelemetry, historicalData, echarts }) => EChartsOption
        const fn = new Function('context', panel.customScript);
        option = fn({
          tags: panel.tags || [],
          liveTelemetry: liveTelemetry || {},
          historicalData: historicalData || [],
          echarts: echarts
        });
      } else {
        // Default script if empty: Multi-Bar Comparison of selected tags
        const tagNames = panel.tags && panel.tags.length > 0 
          ? panel.tags 
          : ['TIC_101.PV', 'TIC_102.PV', 'PIC_101.PV', 'FIC_101.PV'];

        const barData = tagNames.map(tag => {
          const live = liveTelemetry?.[tag];
          return {
            name: tag,
            value: live ? Number(live.value) : 50
          };
        });

        option = {
          backgroundColor: 'transparent',
          tooltip: { trigger: 'axis' },
          grid: { left: '4%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
          xAxis: {
            type: 'category',
            data: barData.map(d => d.name),
            axisLabel: { color: '#94a3b8', fontSize: 10, rotate: 15 }
          },
          yAxis: {
            type: 'value',
            splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
            axisLabel: { color: '#64748b', fontSize: 10 }
          },
          series: [
            {
              type: 'bar',
              data: barData.map(d => d.value),
              itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: '#38bdf8' },
                  { offset: 1, color: '#0369a1' }
                ]),
                borderRadius: [4, 4, 0, 0]
              }
            }
          ]
        };
      }

      if (option && typeof option === 'object') {
        chartInstance.current.setOption(option, true);
      }
    } catch (err) {
      console.error('Error executing custom ECharts script:', err);
      setError(err.message || 'Script execution error');
    }
  }, [panel.customScript, panel.tags, liveTelemetry, historicalData]);

  // Handle panel resizing
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
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {error && (
        <div style={{
          position: 'absolute',
          top: 8,
          left: 8,
          right: 8,
          zIndex: 30,
          background: 'rgba(244, 63, 94, 0.9)',
          backdropFilter: 'blur(4px)',
          color: '#fff',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
        }}>
          <AlertCircle size={16} />
          <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <strong>Custom Script Error:</strong> {error}
          </div>
        </div>
      )}
      <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
