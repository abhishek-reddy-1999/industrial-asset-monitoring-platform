import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Folder, Layers, Activity, CheckCircle2 } from 'lucide-react';

export default function FoldingPanel({ panel, liveTelemetry }) {
  const [openSections, setOpenSections] = useState({
    sec1: true,
    sec2: false,
    sec3: false
  });

  const toggleSection = (sec) => {
    setOpenSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  const sections = [
    {
      id: 'sec1',
      title: 'Fractionation Column C-101 Health Status',
      tag: 'TIC_101.PV',
      value: liveTelemetry?.['TIC_101.PV']?.value || '118.4',
      unit: '°C',
      detail: 'Operational within safe limits. Reflux return temperature normal.'
    },
    {
      id: 'sec2',
      title: 'Furnace F-101 Thermal Load & Excess Oxygen',
      tag: 'TIC_102.PV',
      value: liveTelemetry?.['TIC_102.PV']?.value || '235.1',
      unit: '°C',
      detail: 'Coil outlet temperature stable. Burner flame pattern verified.'
    },
    {
      id: 'sec3',
      title: 'Overhead Pressure & Accumulator V-102',
      tag: 'PIC_101.PV',
      value: liveTelemetry?.['PIC_101.PV']?.value || '145.2',
      unit: 'kPa',
      detail: 'Off-gas control valve position at 48.2% open. No surge risk.'
    }
  ];

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      padding: '8px',
      overflowY: 'auto'
    }}>
      <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '2px' }}>
        Folding Group Section
      </div>

      {sections.map(sec => {
        const isOpen = openSections[sec.id];
        return (
          <div
            key={sec.id}
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '6px',
              overflow: 'hidden'
            }}
          >
            <div
              onClick={() => toggleSection(sec.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                cursor: 'pointer',
                background: isOpen ? 'rgba(56, 189, 248, 0.08)' : 'transparent',
                transition: 'background 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isOpen ? <ChevronDown size={14} color="#38bdf8" /> : <ChevronRight size={14} color="#94a3b8" />}
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: isOpen ? '#38bdf8' : '#e2e8f0' }}>
                  {sec.title}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: '#38bdf8' }}>
                  {sec.value} {sec.unit}
                </span>
              </div>
            </div>

            {isOpen && (
              <div style={{
                padding: '8px 12px',
                borderTop: '1px solid rgba(255,255,255,0.04)',
                background: 'rgba(0,0,0,0.2)',
                fontSize: '0.72rem',
                color: '#94a3b8'
              }}>
                <div>{sec.detail}</div>
                <div style={{ marginTop: '4px', display: 'flex', gap: '10px', fontSize: '0.68rem', color: '#64748b' }}>
                  <span>Tag: <strong style={{ color: '#cbd5e1' }}>{sec.tag}</strong></span>
                  <span>Centum VP Station: <strong style={{ color: '#cbd5e1' }}>FCS01</strong></span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
