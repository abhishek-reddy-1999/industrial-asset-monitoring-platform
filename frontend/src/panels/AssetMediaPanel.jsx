import React, { useState } from 'react';
import { Eye, ZoomIn, ZoomOut, RotateCw, Image, Layers, Sparkles, Activity } from 'lucide-react';

export default function AssetMediaPanel({ panel, liveTelemetry }) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [activeLayer, setActiveLayer] = useState('sensors'); // 'sensors' | 'thermal' | 'cad'

  const primaryTag = panel.tags?.[0] || 'TIC_101.PV';
  const liveVal = liveTelemetry?.[primaryTag]?.value || '118.2';
  const unit = panel.unit || '°C';

  const is3D = panel.type === '3d_model';

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      background: '#090d14',
      borderRadius: '8px',
      overflow: 'hidden'
    }}>
      {/* Top Floating Controls */}
      <div style={{
        position: 'absolute',
        top: '8px',
        left: '8px',
        right: '8px',
        zIndex: 20,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        padding: '4px 8px',
        borderRadius: '6px',
        border: '1px solid rgba(255,255,255,0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#94a3b8' }}>
          {is3D ? <Eye size={13} color="#38bdf8" /> : <Image size={13} color="#38bdf8" />}
          <span style={{ fontWeight: 600, color: '#f1f5f9' }}>
            {panel.title || (is3D ? 'GLTF 3D Digital Twin' : 'Asset Media Stream')}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            type="button"
            onClick={() => setZoomLevel(prev => Math.min(prev + 0.2, 2.5))}
            className="btn"
            style={{ padding: '2px 5px' }}
            title="Zoom In"
          >
            <ZoomIn size={12} />
          </button>
          <button
            type="button"
            onClick={() => setZoomLevel(prev => Math.max(prev - 0.2, 0.6))}
            className="btn"
            style={{ padding: '2px 5px' }}
            title="Zoom Out"
          >
            <ZoomOut size={12} />
          </button>
          <button
            type="button"
            onClick={() => setRotation(prev => (prev + 90) % 360)}
            className="btn"
            style={{ padding: '2px 5px' }}
            title="Rotate 90°"
          >
            <RotateCw size={12} />
          </button>
        </div>
      </div>

      {/* Visual Canvas Viewer */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Isometric Plant Asset Graphic */}
        <div style={{
          transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
          transition: 'transform 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg width="240" height="200" viewBox="0 0 240 200" fill="none">
            {/* Column Vessel Body */}
            <defs>
              <linearGradient id="colGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="50%" stopColor="#0f172a" />
                <stop offset="100%" stopColor="#334155" />
              </linearGradient>
              <linearGradient id="glowG" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.2" />
              </linearGradient>
            </defs>

            {/* Distillation Column Cylindrical Body */}
            <rect x="80" y="30" width="80" height="130" rx="40" fill="url(#colGrad)" stroke="#38bdf8" strokeWidth="2" />
            
            {/* Tray Lines */}
            <line x1="85" y1="60" x2="155" y2="60" stroke="rgba(255,255,255,0.2)" strokeDasharray="2,2" />
            <line x1="85" y1="85" x2="155" y2="85" stroke="rgba(255,255,255,0.2)" strokeDasharray="2,2" />
            <line x1="85" y1="110" x2="155" y2="110" stroke="rgba(255,255,255,0.2)" strokeDasharray="2,2" />
            <line x1="85" y1="135" x2="155" y2="135" stroke="rgba(255,255,255,0.2)" strokeDasharray="2,2" />

            {/* Overhead Vapor Line */}
            <path d="M 120 30 L 120 15 L 200 15 L 200 50" stroke="#94a3b8" strokeWidth="3" fill="none" />
            <circle cx="200" cy="50" r="10" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />

            {/* Bottoms Product Line */}
            <path d="M 120 160 L 120 185 L 40 185 L 40 150" stroke="#94a3b8" strokeWidth="3" fill="none" />
            <circle cx="40" cy="150" r="10" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" />

            {/* Center Asset Label */}
            <text x="120" y="100" fill="#38bdf8" fontSize="10" textAnchor="middle" fontWeight="bold">
              {panel.assetId || 'C-101'}
            </text>
            <text x="120" y="112" fill="#64748b" fontSize="8" textAnchor="middle">
              TRAY COLUMN
            </text>
          </svg>

          {/* Sensor Telemetry Badges pinned in isometric space */}
          <div style={{
            position: 'absolute',
            top: '25px',
            right: '20px',
            background: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid #38bdf8',
            borderRadius: '4px',
            padding: '2px 6px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
          }}>
            <Activity size={10} color="#38bdf8" />
            <span style={{ fontSize: '0.65rem', fontFamily: 'JetBrains Mono, monospace', color: '#f1f5f9', fontWeight: 600 }}>
              {liveVal} {unit}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Status bar */}
      <div style={{
        padding: '6px 12px',
        background: 'rgba(15, 23, 42, 0.8)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.68rem',
        color: '#64748b'
      }}>
        <span>Rendering: <strong>WebGL/SVG Digital Twin</strong></span>
        <span>Mesh Resolution: <strong>24.8k polys</strong></span>
      </div>
    </div>
  );
}
