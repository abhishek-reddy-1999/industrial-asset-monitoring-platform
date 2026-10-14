import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export default function DynamicLoaderPanel({ panel, liveTelemetry }) {
  const tag = panel.tags?.[0] || 'FIC_101.PV';
  const live = liveTelemetry?.[tag];
  const value = live ? Number(live.value) : 450.0;
  const previousValue = panel.previousValue ?? (value * 0.96);
  const max = panel.max ?? 800.0;
  const unit = panel.unit || live?.eng_units || 'm³/h';

  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const diff = value - previousValue;
  const diffPct = previousValue !== 0 ? (diff / previousValue) * 100 : 0;

  // Step ranges color
  let ringColor = '#38bdf8';
  if (pct > 85) ringColor = '#f43f5e';
  else if (pct > 65) ringColor = '#f59e0b';
  else ringColor = '#10b981';

  const strokeDashoffset = 314 - (314 * pct) / 100;

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      padding: '8px'
    }}>
      {/* Circular Progress Ring */}
      <div style={{ position: 'relative', width: '120px', height: '120px' }}>
        <svg viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
          <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke={ringColor}
            strokeWidth="8"
            strokeDasharray="314"
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>

        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '1.25rem',
            fontWeight: 800,
            fontFamily: 'JetBrains Mono, monospace',
            color: '#f1f5f9'
          }}>
            {pct.toFixed(0)}%
          </div>
          <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase' }}>
            Capacity
          </div>
        </div>
      </div>

      {/* Comparison & Step Range Details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Current Flow Rate</div>
          <div style={{
            fontSize: '1.35rem',
            fontWeight: 700,
            color: ringColor,
            fontFamily: 'JetBrains Mono, monospace'
          }}>
            {value.toFixed(1)} <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{unit}</span>
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '6px' }}>
          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Vs. Prior Step Interval:</div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.82rem',
            fontWeight: 600,
            color: diff > 0 ? '#34d399' : diff < 0 ? '#f43f5e' : '#94a3b8'
          }}>
            {diff > 0 ? <ArrowUpRight size={14} /> : diff < 0 ? <ArrowDownRight size={14} /> : <Minus size={14} />}
            <span>{diff > 0 ? `+${diffPct.toFixed(1)}%` : `${diffPct.toFixed(1)}%`}</span>
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>({previousValue.toFixed(1)})</span>
          </div>
        </div>

        <div style={{
          fontSize: '0.68rem',
          padding: '2px 6px',
          borderRadius: '4px',
          background: 'rgba(255,255,255,0.05)',
          color: '#cbd5e1',
          width: 'fit-content'
        }}>
          Bound Tag: <strong style={{ color: '#38bdf8' }}>{tag}</strong>
        </div>
      </div>
    </div>
  );
}
