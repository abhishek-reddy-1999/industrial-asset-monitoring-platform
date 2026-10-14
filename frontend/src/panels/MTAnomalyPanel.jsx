import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { ShieldCheck, AlertTriangle, Cpu, TrendingUp } from 'lucide-react';

export default function MTAnomalyPanel({ panel, liveTelemetry }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const mtDist = Number(liveTelemetry?.['AHI_C101.MT_DIST']?.value || 1.18);
  const healthIndex = Number(liveTelemetry?.['AHI_C101.HEALTH']?.value || 96.5);
  const rulDays = 342;

  // Radar/Contribution distribution
  useEffect(() => {
    if (!chartRef.current) return;
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        backgroundColor: 'rgba(22, 29, 43, 0.95)',
        textStyle: { color: '#f1f5f9' }
      },
      radar: {
        indicator: [
          { name: 'Overhead Temp (TIC-101)', max: 100 },
          { name: 'Reboiler Temp (TIC-102)', max: 100 },
          { name: 'Column Press (PIC-101)', max: 100 },
          { name: 'Feed Flow (FIC-101)', max: 100 },
          { name: 'Reflux Flow (FIC-102)', max: 100 },
          { name: 'Pump Vibration (VIB-101)', max: 100 }
        ],
        radius: '62%',
        center: ['50%', '55%'],
        axisName: {
          color: '#94a3b8',
          fontSize: 9
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.08)'
          }
        },
        splitArea: {
          show: true,
          areaStyle: {
            color: ['rgba(255,255,255,0.01)', 'rgba(255,255,255,0.03)']
          }
        },
        axisLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        }
      },
      series: [
        {
          name: 'Yokogawa MT Feature Weight',
          type: 'radar',
          data: [
            {
              value: [28, 35, 18, 42, 30, Math.min(95, 25 + (mtDist - 1.0) * 40)],
              name: 'Current Covariance Contribution',
              symbol: 'none',
              lineStyle: {
                color: '#a855f7',
                width: 2
              },
              areaStyle: {
                color: 'rgba(168, 85, 247, 0.25)'
              }
            }
          ]
        }
      ]
    };

    chartInstance.current.setOption(option);

    const handleResize = () => chartInstance.current?.resize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update on MT score change
  useEffect(() => {
    if (chartInstance.current) {
      chartInstance.current.setOption({
        series: [
          {
            data: [
              {
                value: [28, 35, 18, 42, 30, Math.min(95, 25 + (mtDist - 1.0) * 40)]
              }
            ]
          }
        ]
      });
    }
  }, [mtDist]);

  // Resize when panel size changes
  useEffect(() => {
    const timer = setTimeout(() => chartInstance.current?.resize(), 100);
    return () => clearTimeout(timer);
  }, [panel.w, panel.h]);

  const isAnomaly = mtDist >= 3.0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '8px' }}>
      {/* Top Hero KPI Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '8px',
        background: 'rgba(0, 0, 0, 0.2)',
        padding: '8px 12px',
        borderRadius: '6px',
        border: '1px solid rgba(255,255,255,0.05)'
      }}>
        {/* MT Distance */}
        <div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>MT Distance</div>
          <div style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            fontFamily: 'JetBrains Mono, monospace',
            color: isAnomaly ? '#f43f5e' : '#38bdf8',
            display: 'flex',
            alignItems: 'baseline',
            gap: '4px'
          }}>
            <span>{mtDist.toFixed(2)}</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 500, color: '#64748b' }}>/ 3.0 Lim</span>
          </div>
        </div>

        {/* Health Index */}
        <div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Asset Health</div>
          <div style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            fontFamily: 'JetBrains Mono, monospace',
            color: healthIndex > 85 ? '#10b981' : '#f59e0b',
            display: 'flex',
            alignItems: 'baseline',
            gap: '4px'
          }}>
            <span>{healthIndex.toFixed(1)}%</span>
          </div>
        </div>

        {/* RUL */}
        <div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Est. RUL</div>
          <div style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            fontFamily: 'JetBrains Mono, monospace',
            color: '#a855f7',
            display: 'flex',
            alignItems: 'baseline',
            gap: '4px'
          }}>
            <span>{rulDays}</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 500, color: '#64748b' }}>days</span>
          </div>
        </div>
      </div>

      {/* Radar Chart */}
      <div style={{ flex: 1, minHeight: '140px', position: 'relative' }}>
        <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
      </div>

      {/* Footer status */}
      <div style={{
        fontSize: '0.72rem',
        color: isAnomaly ? '#f43f5e' : '#10b981',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 6px',
        background: isAnomaly ? 'rgba(244, 63, 94, 0.1)' : 'rgba(16, 185, 129, 0.1)',
        borderRadius: '4px'
      }}>
        {isAnomaly ? <AlertTriangle size={13} /> : <ShieldCheck size={13} />}
        <span>{isAnomaly ? 'Process Multivariate Anomaly Exceeds Normal Envelope' : 'Mahalanobis-Taguchi Correlation Envelope: Normal'}</span>
      </div>
    </div>
  );
}
