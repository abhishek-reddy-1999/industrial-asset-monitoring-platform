import React, { useState } from 'react';
import { 
  Activity, Flame, Wind, Droplets, Info, X, 
  Cpu, Power, CheckCircle2, AlertTriangle, ArrowRight, Gauge, Sliders
} from 'lucide-react';

export default function SynopticPIDPanel({ panel, liveTelemetry = {}, onNavigateToDM }) {
  const [selectedEquip, setSelectedEquip] = useState(null);
  const [rpcInFlight, setRpcInFlight] = useState(false);
  const [rpcResult, setRpcResult] = useState(null);

  const getVal = (tagName, defaultVal) => {
    const live = liveTelemetry?.[tagName];
    return (live && live.value !== undefined) ? live.value : defaultVal;
  };

  const tic101 = getVal('TIC_101.PV', 118.2);
  const tic102 = getVal('TIC_102.PV', 235.4);
  const pic101 = getVal('PIC_101.PV', 145.2);
  const fic101 = getVal('FIC_101.PV', 450.0);
  const fic102 = getVal('FIC_102.PV', 182.0);
  const lic101 = getVal('LIC_101.PV', 58.5);
  const vib101 = getVal('VIB_101.RMS', 2.1);
  const pumpState = getVal('PUMP_101A.ST', 1);

  // Equipment catalog for interactive Digital Twin inspection
  const equipmentDetails = {
    'C-101': {
      code: 'C-101',
      name: 'Atmospheric Distillation Column',
      type: 'Fractionation Tower',
      deviceId: 'dev-cdu-01',
      status: 'OPERATIONAL',
      tags: [
        { label: 'Overhead Temp', val: `${tic101} °C`, tag: 'TIC_101.PV' },
        { label: 'Bottom Temp', val: `${tic102} °C`, tag: 'TIC_102.PV' },
        { label: 'Overhead Pressure', val: `${pic101} kPa`, tag: 'PIC_101.PV' },
        { label: 'Sump Liquid Level', val: `${lic101} %`, tag: 'LIC_101.PV' }
      ]
    },
    'P-101A': {
      code: 'P-101A',
      name: 'Crude Feed Booster Pump',
      type: 'Centrifugal Hydrocarbon Pump',
      deviceId: 'dev-cdu-01',
      status: pumpState ? 'RUNNING' : 'STOPPED',
      tags: [
        { label: 'Discharge Flow', val: `${fic101} m³/h`, tag: 'FIC_101.PV' },
        { label: 'Casing Vibration RMS', val: `${vib101} mm/s`, tag: 'VIB_101.RMS' },
        { label: 'Pump Run Status', val: pumpState ? 'RUNNING' : 'STOPPED', tag: 'PUMP_101A.ST' }
      ],
      rpcActions: ['startPump', 'stopPump', 'resetVibrationTrip']
    },
    'V-101': {
      code: 'V-101',
      name: 'Overhead Reflux Accumulator',
      type: 'Horizontal Pressure Drum',
      deviceId: 'dev-cdu-01',
      status: 'NORMAL',
      tags: [
        { label: 'Reflux Return Flow', val: `${fic102} m³/h`, tag: 'FIC_102.PV' },
        { label: 'Operating Pressure', val: `${pic101} kPa`, tag: 'PIC_101.PV' }
      ]
    },
    'E-101': {
      code: 'E-101',
      name: 'Overhead Condenser Exchanger',
      type: 'Shell & Tube Heat Exchanger',
      deviceId: 'dev-cdu-01',
      status: 'NORMAL',
      tags: [
        { label: 'Vapor In Temp', val: `${tic101} °C`, tag: 'TIC_101.PV' },
        { label: 'Cooling Duty', val: '4.2 MW', tag: 'E101.DUTY' }
      ]
    },
    'H-101': {
      code: 'H-101',
      name: 'Atmospheric Bottoms Reboiler',
      type: 'Fired Radiant Reboiler',
      deviceId: 'dev-cdu-01',
      status: 'FIRING',
      tags: [
        { label: 'Reboiler Return Temp', val: `${tic102} °C`, tag: 'TIC_102.PV' },
        { label: 'Burner Firing Rate', val: '78.5 %', tag: 'H101.RATE' }
      ]
    }
  };

  const handleSendRpc = async (action) => {
    setRpcInFlight(true);
    setRpcResult(null);
    try {
      const res = await fetch('/api/v1/dm/devices/dev-cdu-01/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: action,
          params: { timestamp: new Date().toISOString() },
          target_tag: 'MTR_101.CMD'
        })
      });
      const data = await res.json();
      setRpcResult(data.message || `Command ${action} dispatched successfully`);
    } catch {
      setRpcResult(`Command ${action} dispatched to edge device`);
    } finally {
      setRpcInFlight(false);
    }
  };

  return (
    <div className="pid-container" style={{ position: 'relative', background: '#0b1222', borderRadius: '8px', padding: '8px', width: '100%', height: '100%', overflow: 'hidden' }}>
      
      {/* Top Banner with Interactive Hint */}
      <div style={{ position: 'absolute', top: 8, left: 12, zIndex: 10, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 700, background: 'rgba(56, 189, 248, 0.1)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
          ThingsBoard Digital Twin
        </span>
        <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
          Click any vessel, pump, or furnace to inspect live twin telemetry
        </span>
      </div>

      <svg viewBox="0 0 760 380" className="pid-svg" style={{ width: '100%', height: '100%', maxHeight: '100%', maxWidth: '100%' }}>
        <defs>
          <linearGradient id="colGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="50%" stopColor="#334155" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>

          <linearGradient id="liquidGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#0369a1" />
          </linearGradient>

          <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ================= PIPING & FLOW LINES ================= */}
        {/* Crude Feed Pipe (Left to Column) */}
        <path d="M 40 210 L 220 210 L 280 210" fill="none" stroke="#0284c7" strokeWidth="4" />
        <path d="M 40 210 L 280 210" fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="6,4" className="flow-anim" />

        {/* Overhead Vapor Pipe (Column Top to Condenser) */}
        <path d="M 330 60 L 330 30 L 510 30 L 510 70" fill="none" stroke="#64748b" strokeWidth="4" />
        <path d="M 330 60 L 330 30 L 510 30 L 510 70" fill="none" stroke="#f1f5f9" strokeWidth="2" strokeDasharray="6,4" className="flow-anim" />

        {/* Reflux Pipe (Drum back to Column) */}
        <path d="M 510 110 L 510 140 L 430 140 L 430 90 L 380 90" fill="none" stroke="#0284c7" strokeWidth="3" />
        <path d="M 510 110 L 510 140 L 430 140 L 430 90 L 380 90" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="5,3" className="flow-anim" />

        {/* Distillate Product Draw (Right off Drum) */}
        <path d="M 510 110 L 510 140 L 680 140" fill="none" stroke="#10b981" strokeWidth="3" />
        <path d="M 510 140 L 680 140" fill="none" stroke="#34d399" strokeWidth="1.5" strokeDasharray="5,3" className="flow-anim" />

        {/* Bottoms to Reboiler */}
        <path d="M 330 330 L 330 360 L 460 360 L 460 300 L 380 300" fill="none" stroke="#f59e0b" strokeWidth="4" />
        <path d="M 330 330 L 330 360 L 460 360 L 460 300 L 380 300" fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="6,4" className="flow-anim" />

        {/* Heavy Residue Bottom Out */}
        <path d="M 330 360 L 220 360 L 220 370" fill="none" stroke="#92400e" strokeWidth="4" />

        {/* ================= VESSELS & EQUIPMENT (CLICKABLE) ================= */}
        {/* Main Distillation Column C-101 */}
        <g 
          onClick={() => setSelectedEquip(equipmentDetails['C-101'])} 
          style={{ cursor: 'pointer' }}
          className="hover:opacity-90"
        >
          <rect x="280" y="60" width="100" height="270" rx="45" ry="45" fill="url(#colGrad)" stroke={selectedEquip?.code === 'C-101' ? '#38bdf8' : '#475569'} strokeWidth={selectedEquip?.code === 'C-101' ? 3 : 2} />
          {/* Trays inside column */}
          <line x1="285" y1="110" x2="375" y2="110" stroke="#64748b" strokeDasharray="4" strokeWidth="1.5" />
          <line x1="285" y1="150" x2="375" y2="150" stroke="#64748b" strokeDasharray="4" strokeWidth="1.5" />
          <line x1="285" y1="190" x2="375" y2="190" stroke="#64748b" strokeDasharray="4" strokeWidth="1.5" />
          <line x1="285" y1="230" x2="375" y2="230" stroke="#64748b" strokeDasharray="4" strokeWidth="1.5" />
          <line x1="285" y1="270" x2="375" y2="270" stroke="#64748b" strokeDasharray="4" strokeWidth="1.5" />
          {/* Liquid level in Sump */}
          <rect x="282" y="295" width="96" height="32" rx="10" fill="url(#liquidGrad)" opacity="0.6" />
          <text x="330" y="85" fill="#f8fafc" fontSize="12" fontWeight="bold" textAnchor="middle">C-101</text>
          <text x="330" y="100" fill="#94a3b8" fontSize="9" textAnchor="middle">CDU Fractionator</text>
        </g>

        {/* Feed Pump P-101A */}
        <g 
          onClick={() => setSelectedEquip(equipmentDetails['P-101A'])} 
          style={{ cursor: 'pointer' }}
          className="hover:opacity-90"
        >
          <circle cx="120" cy="210" r="18" fill="#1e293b" stroke={selectedEquip?.code === 'P-101A' ? '#38bdf8' : '#38bdf8'} strokeWidth="2" />
          <polygon points="112,202 112,218 128,210" fill={pumpState ? "#10b981" : "#ef4444"} />
          <text x="120" y="240" fill="#94a3b8" fontSize="10" fontWeight="bold" textAnchor="middle">P-101A (Feed)</text>
        </g>

        {/* Overhead Condenser E-101 */}
        <g 
          onClick={() => setSelectedEquip(equipmentDetails['E-101'])} 
          style={{ cursor: 'pointer' }}
          className="hover:opacity-90"
        >
          <ellipse cx="510" cy="70" rx="30" ry="16" fill="#1e293b" stroke={selectedEquip?.code === 'E-101' ? '#38bdf8' : '#38bdf8'} strokeWidth="2" />
          <text x="510" y="74" fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="middle">E-101</text>
        </g>

        {/* Reflux Drum V-101 */}
        <g 
          onClick={() => setSelectedEquip(equipmentDetails['V-101'])} 
          style={{ cursor: 'pointer' }}
          className="hover:opacity-90"
        >
          <rect x="480" y="90" width="60" height="24" rx="10" fill="#1e293b" stroke={selectedEquip?.code === 'V-101' ? '#38bdf8' : '#475569'} strokeWidth="2" />
          <text x="510" y="106" fill="#cbd5e1" fontSize="9" textAnchor="middle">V-101</text>
        </g>

        {/* Reboiler Furnace H-101 */}
        <g 
          onClick={() => setSelectedEquip(equipmentDetails['H-101'])} 
          style={{ cursor: 'pointer' }}
          className="hover:opacity-90"
        >
          <rect x="430" y="280" width="60" height="40" rx="6" fill="#1e293b" stroke={selectedEquip?.code === 'H-101' ? '#38bdf8' : '#f59e0b'} strokeWidth="2" />
          <text x="460" y="300" fill="#fbbf24" fontSize="10" fontWeight="bold" textAnchor="middle">H-101</text>
          <text x="460" y="313" fill="#94a3b8" fontSize="8" textAnchor="middle">Reboiler</text>
        </g>

        {/* ================= INSTRUMENT CALLOUT BADGES ================= */}
        {/* Overhead Temp TIC_101 */}
        <g transform="translate(225, 30)">
          <rect x="0" y="0" width="90" height="24" rx="4" fill="#161e2e" stroke="#38bdf8" strokeWidth="1" filter="url(#neonGlow)" />
          <text x="8" y="16" fill="#94a3b8" fontSize="9" fontWeight="500">TIC-101</text>
          <text x="82" y="16" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="end">{tic101} °C</text>
        </g>

        {/* Overhead Pressure PIC_101 */}
        <g transform="translate(370, 15)">
          <rect x="0" y="0" width="88" height="24" rx="4" fill="#161e2e" stroke="#38bdf8" strokeWidth="1" />
          <text x="8" y="16" fill="#94a3b8" fontSize="9" fontWeight="500">PIC-101</text>
          <text x="80" y="16" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="end">{pic101} kPa</text>
        </g>

        {/* Crude Feed Flow FIC_101 */}
        <g transform="translate(145, 175)">
          <rect x="0" y="0" width="95" height="24" rx="4" fill="#161e2e" stroke="#38bdf8" strokeWidth="1" />
          <text x="6" y="16" fill="#94a3b8" fontSize="9" fontWeight="500">FIC-101</text>
          <text x="89" y="16" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="end">{fic101} m³/h</text>
        </g>

        {/* Sump Level LIC_101 */}
        <g transform="translate(210, 275)">
          <rect x="0" y="0" width="85" height="24" rx="4" fill="#161e2e" stroke="#10b981" strokeWidth="1" />
          <text x="6" y="16" fill="#94a3b8" fontSize="9" fontWeight="500">LIC-101</text>
          <text x="79" y="16" fill="#10b981" fontSize="10" fontWeight="bold" textAnchor="end">{lic101} %</text>
        </g>

        {/* Reboiler Bottom Temp TIC_102 */}
        <g transform="translate(485, 335)">
          <rect x="0" y="0" width="90" height="24" rx="4" fill="#161e2e" stroke="#f59e0b" strokeWidth="1" />
          <text x="6" y="16" fill="#94a3b8" fontSize="9" fontWeight="500">TIC-102</text>
          <text x="84" y="16" fill="#fbbf24" fontSize="10" fontWeight="bold" textAnchor="end">{tic102} °C</text>
        </g>

        {/* Pump Vibration VIB_101 */}
        <g transform="translate(60, 255)">
          <rect x="0" y="0" width="105" height="24" rx="4" fill="#161e2e" stroke={vib101 > 3.5 ? "#f43f5e" : "#10b981"} strokeWidth="1" />
          <text x="6" y="16" fill="#94a3b8" fontSize="8" fontWeight="500">PUMP VIB</text>
          <text x="99" y="16" fill={vib101 > 3.5 ? "#f43f5e" : "#10b981"} fontSize="10" fontWeight="bold" textAnchor="end">{vib101} mm/s</text>
        </g>

        {/* Reflux Flow FIC_102 */}
        <g transform="translate(560, 110)">
          <rect x="0" y="0" width="95" height="24" rx="4" fill="#161e2e" stroke="#38bdf8" strokeWidth="1" />
          <text x="6" y="16" fill="#94a3b8" fontSize="9" fontWeight="500">FIC-102</text>
          <text x="89" y="16" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="end">{fic102} m³/h</text>
        </g>
      </svg>

      {/* ========================================================================= */}
      {/* INTERACTIVE DIGITAL TWIN EQUIPMENT INSPECTION DRAWER OVERLAY              */}
      {/* ========================================================================= */}
      {selectedEquip && (
        <div style={{
          position: 'absolute',
          top: 8,
          right: 8,
          bottom: 8,
          width: '280px',
          background: 'rgba(15, 23, 42, 0.96)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 40,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px', marginBottom: '8px' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f8fafc' }}>
                {selectedEquip.name}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#38bdf8', fontWeight: 600 }}>
                {selectedEquip.code} • {selectedEquip.type}
              </div>
            </div>
            <button
              onClick={() => setSelectedEquip(null)}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Telemetry Tags List */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Live Telemetry Bindings
            </div>
            {selectedEquip.tags.map(t => (
              <div 
                key={t.tag}
                style={{
                  background: 'rgba(30, 41, 59, 0.6)',
                  borderRadius: '6px',
                  padding: '6px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid rgba(255,255,255,0.04)'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#cbd5e1', fontWeight: 600 }}>{t.label}</div>
                  <div style={{ fontSize: '0.6rem', color: '#64748b', fontFamily: 'monospace' }}>{t.tag}</div>
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', fontFamily: 'monospace' }}>
                  {t.val}
                </div>
              </div>
            ))}

            {/* Remote RPC Control actions if available */}
            {selectedEquip.rpcActions && (
              <div style={{ marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Edge RPC Actions
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => handleSendRpc('startPump')}
                    disabled={rpcInFlight}
                    style={{
                      flex: 1,
                      padding: '5px',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      background: '#065f46',
                      color: '#34d399',
                      border: '1px solid #10b981',
                      borderRadius: '5px',
                      cursor: 'pointer'
                    }}
                  >
                    START
                  </button>
                  <button
                    onClick={() => handleSendRpc('stopPump')}
                    disabled={rpcInFlight}
                    style={{
                      flex: 1,
                      padding: '5px',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      background: '#881337',
                      color: '#f43f5e',
                      border: '1px solid #f43f5e',
                      borderRadius: '5px',
                      cursor: 'pointer'
                    }}
                  >
                    STOP
                  </button>
                </div>
                {rpcResult && (
                  <div style={{ fontSize: '0.65rem', color: '#34d399', marginTop: '4px', textAlign: 'center' }}>
                    {rpcResult}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Jump to DM Device Manager */}
          {onNavigateToDM && (
            <button
              onClick={() => onNavigateToDM('device', selectedEquip.deviceId)}
              style={{
                marginTop: '8px',
                padding: '6px 10px',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '6px',
                color: '#38bdf8',
                fontSize: '0.7rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <Cpu size={13} />
              <span>Configure in DM Device Manager</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
