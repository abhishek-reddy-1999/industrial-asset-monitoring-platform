import React from 'react';

export default function LevelCirclePanel({ panel, liveTelemetry }) {
  const tag = panel.tags?.[0] || 'LIC_101.PV';
  const live = liveTelemetry?.[tag];
  const value = live ? Number(live.value) : (panel.fallbackValue ?? 58.5);
  const unit = panel.unit || live?.eng_units || '%';

  // Shapes: 'circle' | 'cylinder' | 'rect'
  const vesselShape = panel.vesselShape || 'circle';
  const animateWave = panel.animateWave !== false;

  // Thresholds
  const isHigh = value > (panel.thresholds?.[1] ?? 80);
  const isLow = value < (panel.thresholds?.[0] ?? 20);
  const color = isHigh ? '#f43f5e' : isLow ? '#f59e0b' : (panel.accentColor || '#38bdf8');
  const fillColor = isHigh ? 'rgba(244, 63, 94, 0.45)' : isLow ? 'rgba(245, 158, 11, 0.45)' : 'rgba(56, 189, 248, 0.35)';

  // Calculate percentage clamped 0 to 100
  const pct = Math.max(0, Math.min(100, value));
  const fillY = 160 - (pct / 100) * 120; // 40 is top, 160 is bottom

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative'
    }}>
      <svg viewBox="0 0 200 200" style={{ width: '85%', height: '85%', maxHeight: '200px' }}>
        <defs>
          <clipPath id={`vesselClip_${panel.id || 'p'}`}>
            {vesselShape === 'cylinder' ? (
              <rect x="45" y="30" width="110" height="140" rx="20" />
            ) : vesselShape === 'rect' ? (
              <rect x="40" y="35" width="120" height="130" rx="8" />
            ) : (
              <circle cx="100" cy="100" r="70" />
            )}
          </clipPath>
          <linearGradient id={`waveGrad_${panel.id || 'p'}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.85" />
            <stop offset="100%" stopColor="#0369a1" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {/* Vessel Boundary Outer Container */}
        {vesselShape === 'cylinder' ? (
          <>
            <rect x="45" y="30" width="110" height="140" rx="20" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
            <rect x="45" y="30" width="110" height="140" rx="20" fill="none" stroke={color} strokeWidth="2" strokeOpacity="0.5" />
          </>
        ) : vesselShape === 'rect' ? (
          <>
            <rect x="40" y="35" width="120" height="130" rx="8" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
            <rect x="40" y="35" width="120" height="130" rx="8" fill="none" stroke={color} strokeWidth="2" strokeOpacity="0.5" />
          </>
        ) : (
          <>
            <circle cx="100" cy="100" r="76" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
            <circle 
              cx="100" 
              cy="100" 
              r="76" 
              fill="none" 
              stroke={color} 
              strokeWidth="4" 
              strokeDasharray="477"
              strokeDashoffset={477 - (477 * pct) / 100}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s ease' }}
            />
          </>
        )}

        {/* Inner Vessel Liquid Fill */}
        <g clipPath={`url(#vesselClip_${panel.id || 'p'})`}>
          <rect x="0" y="0" width="200" height="200" fill="rgba(15, 23, 42, 0.6)" />
          {/* Animated wave path or clean liquid rect */}
          {animateWave ? (
            <path
              d={`M -40 ${fillY} Q 10 ${fillY - 7} 60 ${fillY} T 160 ${fillY} T 260 ${fillY} L 260 200 L -40 200 Z`}
              fill={`url(#waveGrad_${panel.id || 'p'})`}
              style={{ transition: 'd 0.6s ease' }}
            >
              <animateTransform
                attributeName="transform"
                type="translate"
                from="0 0"
                to="-100 0"
                dur="3s"
                repeatCount="indefinite"
              />
            </path>
          ) : (
            <rect x="0" y={fillY} width="200" height={200 - fillY} fill={`url(#waveGrad_${panel.id || 'p'})`} />
          )}

          {/* Level Height Graduation Marks */}
          <line x1="30" y1="40" x2="45" y2="40" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
          <line x1="30" y1="70" x2="40" y2="70" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          <line x1="30" y1="100" x2="45" y2="100" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
          <line x1="30" y1="130" x2="40" y2="130" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          <line x1="30" y1="160" x2="45" y2="160" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
        </g>

        {/* Center Readout Text */}
        <text
          x="100"
          y="95"
          fill="#f1f5f9"
          fontSize="24"
          fontWeight="bold"
          textAnchor="middle"
          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}
        >
          {value.toFixed(1)}
        </text>
        <text
          x="100"
          y="114"
          fill="#94a3b8"
          fontSize="11"
          fontWeight="600"
          textAnchor="middle"
          style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
        >
          {unit}
        </text>

        {/* Sub-label */}
        <text
          x="100"
          y="130"
          fill={color}
          fontSize="10"
          fontWeight="bold"
          textAnchor="middle"
          letterSpacing="0.5"
          style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
        >
          {isHigh ? 'HIGH ALARM' : isLow ? 'LOW ADVISORY' : 'NORMAL'}
        </text>
      </svg>
    </div>
  );
}
