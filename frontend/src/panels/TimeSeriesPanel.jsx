import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { queryTimeSeries } from '../api/client';

export default function TimeSeriesPanel({ panel, timeRange, liveTelemetry }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [loading, setLoading] = useState(true);

  const colors = [
    { line: '#38bdf8', area: 'rgba(56, 189, 248, 0.15)' },
    { line: '#f59e0b', area: 'rgba(245, 158, 11, 0.15)' },
    { line: '#10b981', area: 'rgba(16, 185, 129, 0.15)' },
    { line: '#a855f7', area: 'rgba(168, 85, 247, 0.15)' },
    { line: '#f43f5e', area: 'rgba(244, 63, 94, 0.15)' },
    { line: '#06b6d4', area: 'rgba(6, 182, 212, 0.15)' }
  ];

  const curveStyle = panel.curveStyle || 'smooth'; // 'smooth' | 'linear' | 'step'
  const showArea = panel.showArea !== false;
  const showPoints = Boolean(panel.showPoints);
  const lineWidth = Number(panel.lineWidth || 2);
  const showLegend = panel.showLegend !== false;

  // Initial historical data load
  useEffect(() => {
    let isMounted = true;
    const activeTags = (panel.tags && panel.tags.length > 0) ? panel.tags : ['TIC_101.PV', 'TIC_102.PV'];
    
    const loadHistorical = async () => {
      try {
        setLoading(true);
        const data = await queryTimeSeries(activeTags, timeRange, 'now');
        if (!isMounted || !chartRef.current) return;

        if (!chartInstance.current) {
          chartInstance.current = echarts.init(chartRef.current);
        }

        const isBar = panel.type === 'barchart' || panel.type === 'histogram';

        const seriesList = data.series.map((s, idx) => {
          const colorObj = colors[idx % colors.length];
          const chartData = s.datapoints.map(p => [new Date(p.timestamp).getTime(), p.value]);
          return {
            name: `${s.display_name} (${s.eng_units})`,
            type: isBar ? 'bar' : 'line',
            showSymbol: showPoints,
            symbolSize: 4,
            smooth: curveStyle === 'smooth',
            step: curveStyle === 'step' ? 'start' : false,
            barWidth: isBar ? 8 : undefined,
            lineStyle: isBar ? undefined : { width: lineWidth, color: colorObj.line },
            itemStyle: isBar ? { color: colorObj.line, borderRadius: [3, 3, 0, 0] } : undefined,
            areaStyle: (isBar || !showArea) ? undefined : {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: colorObj.area },
                { offset: 1, color: 'rgba(0,0,0,0)' }
              ])
            },
            data: chartData
          };
        });

        const option = {
          backgroundColor: 'transparent',
          tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(22, 29, 43, 0.95)',
            borderColor: 'rgba(255, 255, 255, 0.15)',
            textStyle: { color: '#f1f5f9', fontSize: 12 },
            formatter: (params) => {
              if (!params || params.length === 0) return '';
              const time = new Date(params[0].value[0]).toLocaleTimeString();
              let res = `<div style="font-weight:600;margin-bottom:4px;color:#94a3b8">${time}</div>`;
              params.forEach(p => {
                res += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0;">
                  <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
                  <span>${p.seriesName}:</span>
                  <strong style="color:#fff">${p.value[1]}</strong>
                </div>`;
              });
              return res;
            }
          },
          legend: showLegend ? {
            top: 0,
            icon: 'circle',
            textStyle: { color: '#94a3b8', fontSize: 10 },
            itemWidth: 8,
            itemHeight: 8
          } : { show: false },
          grid: {
            left: '4%',
            right: '3%',
            top: showLegend ? '16%' : '10%',
            bottom: '10%',
            containLabel: true
          },
          xAxis: {
            type: 'time',
            splitLine: { show: false },
            axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } },
            axisLabel: { color: '#64748b', fontSize: 10 }
          },
          yAxis: {
            type: 'value',
            splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } },
            axisLine: { show: false },
            axisLabel: { color: '#64748b', fontSize: 10 }
          },
          series: seriesList
        };

        chartInstance.current.setOption(option, true);
        setLoading(false);
      } catch (err) {
        console.error('Error loading time series:', err);
        setLoading(false);
      }
    };

    loadHistorical();

    return () => {
      isMounted = false;
    };
  }, [JSON.stringify(panel.tags), timeRange, curveStyle, showArea, showPoints, lineWidth, showLegend, panel.type]);

  // Live streaming append (optimized with setOption false)
  useEffect(() => {
    if (!chartInstance.current || !liveTelemetry) return;
    const nowMs = Date.now();

    const option = chartInstance.current.getOption();
    if (!option || !option.series) return;

    let hasUpdate = false;
    const tags = (panel.tags && panel.tags.length > 0) ? panel.tags : ['TIC_101.PV', 'TIC_102.PV'];

    const updatedSeries = option.series.map((s, idx) => {
      const tag = tags[idx];
      const live = liveTelemetry[tag];
      if (live && live.value !== undefined) {
        hasUpdate = true;
        const currentData = s.data || [];
        const newPoint = [nowMs, live.value];
        const sliced = currentData.length > 500 ? currentData.slice(currentData.length - 499) : currentData;
        return {
          ...s,
          data: [...sliced, newPoint]
        };
      }
      return s;
    });

    if (hasUpdate) {
      chartInstance.current.setOption({ series: updatedSeries }, false);
    }
  }, [liveTelemetry]);

  // Debounced Resize
  useEffect(() => {
    let timer = setTimeout(() => chartInstance.current?.resize(), 80);
    const handleResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => chartInstance.current?.resize(), 80);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [panel.w, panel.h]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {loading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(13, 19, 31, 0.4)',
          zIndex: 10,
          fontSize: '0.75rem',
          color: '#64748b'
        }}>
          Streaming Telemetry...
        </div>
      )}
      <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
