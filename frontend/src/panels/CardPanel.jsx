import React from 'react';
import { Activity, ShieldCheck, AlertTriangle } from 'lucide-react';

export default function CardPanel({ panel, liveTelemetry }) {
  const tag = panel.tags?.[0] || 'AHI_C101.HEALTH';
  const live = liveTelemetry?.[tag];
  const value = live ? Number(live.value) : 96.5;
  const unit = panel.unit || live?.eng_units || '%';
  const radius = panel.radius ?? 12;

  // Custom Thresholds / Step Ranges
  const lowThresh = panel.thresholds?.[0] ?? 60;
  const highThresh = panel.thresholds?.[1] ?? 80;

  const isNormal = value >= highThresh;
  const isWarn = value >= lowThresh && value < highThresh;
  const isCrit = value < lowThresh;

  // Visual styling variants
  const cardStyle = panel.cardStyle || 'glass';
  let bg = '';
  let border = '';
  let shadow = '';

  if (cardStyle === 'solid') {
    bg = '#0f172a';
    border = isNormal ? 'rgba(16, 185, 129, 0.4)' : isWarn ? 'rgba(245, 158, 11, 0.4)' : 'rgba(244, 63, 94, 0.4)';
  } else if (cardStyle === 'glow') {
    bg = 'rgba(15, 23, 42, 0.85)';
    border = isNormal ? '#10b981' : isWarn ? '#f59e0b' : '#f43f5e';
    shadow = isNormal ? '0 0 15px rgba(16, 185, 129, 0.25)' : isWarn ? '0 0 15px rgba(245, 158, 11, 0.25)' : '0 0 15px rgba(244, 63, 94, 0.25)';
  } else if (cardStyle === 'transparent') {
    bg = 'transparent';
    border = '1px dashed rgba(255,255,255,0.15)';
  } else {
    // Glassmorphism default
    bg = isNormal 
      ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(15, 23, 42, 0.5) 100%)'
      : isWarn 
      ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(15, 23, 42, 0.5) 100%)'
      : 'linear-gradient(135deg, rgba(244, 63, 94, 0.15) 0%, rgba(15, 23, 42, 0.5) 100%)';
    border = isNormal ? 'rgba(16, 185, 129, 0.3)' : isWarn ? 'rgba(245, 158, 11, 0.3)' : 'rgba(244, 63, 94, 0.3)';
    shadow = 'inset 0 1px 1px rgba(255,255,255,0.08)';
  }

  const textColor = isNormal ? '#34d399' : isWarn ? '#fbbf24' : '#f87171';

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '16px',
      borderRadius: `${radius}px`,
      background: bg,
      border: `1px solid ${border}`,
      boxShadow: shadow
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isNormal ? <ShieldCheck size={18} color="#10b981" /> : <AlertTriangle size={18} color={textColor} />}
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f1f5f9' }}>
            {panel.title || 'Asset Health Condition'}
          </span>
        </div>
        <span style={{
          fontSize: '0.68rem',
          fontFamily: 'JetBrains Mono, monospace',
          color: '#94a3b8',
          background: 'rgba(0,0,0,0.3)',
          padding: '2px 6px',
          borderRadius: '4px'
        }}>
          {tag}
        </span>
      </div>

      <div style={{ margin: 'auto 0', textAlign: 'center' }}>
        <div style={{
          fontSize: '2.8rem',
          fontWeight: 800,
          fontFamily: 'JetBrains Mono, monospace',
          color: textColor,
          lineHeight: 1
        }}>
          {value.toFixed(1)} <span style={{ fontSize: '1.2rem', fontWeight: 500, color: '#94a3b8' }}>{unit}</span>
        </div>
        <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '6px' }}>
          {panel.subtitle || (isNormal ? 'Operational Reliability: Normal Operating Bounds' : isWarn ? 'Advisory: Watch Zone Range' : 'Critical: Out of Bounds')}
        </div>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.72rem',
        color: '#64748b',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        paddingTop: '8px'
      }}>
        <span>Yokogawa OpreX AHI Engine</span>
        <span style={{ color: textColor, fontWeight: 600 }}>
          {isNormal ? 'TIER 1 (HEALTHY)' : isWarn ? 'TIER 2 (WATCH)' : 'TIER 3 (CRITICAL)'}
        </span>
      </div>
    </div>
  );
}
