import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { queryTimeSeries } from '../api/client';

export default function SingleStatPanel({ panel, timeRange, liveTelemetry }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [sparkPoints, setSparkPoints] = useState([]);
  const [delta, setDelta] = useState(0);

  const tag = panel.tags?.[0] || 'TIC_101.PV';
  const live = liveTelemetry?.[tag];
  const value = live ? Number(live.value) : (panel.fallbackValue ?? 118.2);
  const unit = panel.unit || live?.eng_units || '';
  const thresholds = panel.thresholds || [80, 140]; // [warning, critical]

  // Historical sparkline load
  useEffect(() => {
    let isMounted = true;
    if (tag) {
      queryTimeSeries([tag], timeRange, 'now')
        .then((data) => {
          if (!isMounted) return;
          const s = data.series?.[0];
          if (s && s.datapoints && s.datapoints.length > 0) {
            const pts = s.datapoints.map(p => p.value);
            setSparkPoints(pts);
            const first = pts[0];
            const last = pts[pts.length - 1];
            if (first !== 0 && first !== undefined) {
              setDelta(((last - first) / first) * 100);
            }
          }
        })
        .catch(err => console.warn('SingleStat sparkline error:', err));
    }
    return () => { isMounted = false; };
  }, [tag, timeRange]);

  // Render mini sparkline
  useEffect(() => {
    if (!chartRef.current) return;
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const option = {
      backgroundColor: 'transparent',
      grid: { left: 0, right: 0, top: 0, bottom: 0 },
      xAxis: { type: 'category', show: false },
      yAxis: { type: 'value', show: false, min: 'dataMin', max: 'dataMax' },
      series: [
        {
          type: 'line',
          showSymbol: false,
          smooth: true,
          lineStyle: { width: 2, color: '#38bdf8' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(56, 189, 248, 0.25)' },
              { offset: 1, color: 'rgba(56, 189, 248, 0.0)' }
            ])
          },
          data: sparkPoints
        }
      ]
    };
    chartInstance.current.setOption(option);
  }, [sparkPoints]);

  // Resize
  useEffect(() => {
    const handleResize = () => chartInstance.current?.resize();
    window.addEventListener('resize', handleResize);
    const timer = setTimeout(handleResize, 100);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [panel.w, panel.h]);

  // Value color based on thresholds
  let valColor = '#38bdf8';
  if (thresholds && thresholds.length >= 2) {
    if (value >= thresholds[1]) valColor = '#f43f5e';
    else if (value >= thresholds[0]) valColor = '#f59e0b';
    else valColor = '#10b981';
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      justifyContent: 'space-between',
      padding: '4px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Top Tag & Delta */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 2 }}>
        <div style={{
          fontSize: '0.75rem',
          color: '#94a3b8',
          fontFamily: 'JetBrains Mono, monospace'
        }}>
          {tag}
        </div>
        <div style={{
          fontSize: '0.72rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          color: delta > 0 ? '#34d399' : delta < 0 ? '#f43f5e' : '#94a3b8'
        }}>
          {delta > 0 ? <TrendingUp size={12} /> : delta < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
          <span>{delta > 0 ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`}</span>
        </div>
      </div>

      {/* Main Big Number */}
      <div style={{ zIndex: 2, margin: 'auto 0' }}>
        <div style={{
          fontSize: '2.4rem',
          fontWeight: 800,
          fontFamily: 'JetBrains Mono, monospace',
          color: valColor,
          lineHeight: 1,
          letterSpacing: '-0.02em',
          textShadow: `0 0 20px ${valColor}33`
        }}>
          {value !== undefined ? value.toFixed(1) : '--'}
          <span style={{ fontSize: '1rem', fontWeight: 500, color: '#94a3b8', marginLeft: '6px' }}>
            {unit}
          </span>
        </div>
        {panel.subtitle && (
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            {panel.subtitle}
          </div>
        )}
      </div>

      {/* Background Sparkline */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '45%',
        opacity: 0.65,
        zIndex: 1
      }}>
        <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}
