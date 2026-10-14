import React, { useState } from 'react';
import { Terminal, Send, CheckCircle2, AlertTriangle, Shield, SlidersHorizontal, Power } from 'lucide-react';

export default function CommandPanel({ panel, liveTelemetry }) {
  const targetDevice = panel.targetDevice || 'CENTUM_VP_FCS01';
  const tag = panel.tags?.[0] || 'TIC_101.SV';
  const pvTag = tag.replace('.SV', '.PV');
  
  const livePV = liveTelemetry?.[pvTag];
  const currentPV = livePV ? Number(livePV.value) : 118.4;
  const currentSV = panel.defaultSV ?? 120.0;
  const unit = panel.unit || livePV?.eng_units || '°C';

  const [setpoint, setSetpoint] = useState(currentSV);
  const [controlMode, setControlMode] = useState('AUTO'); // 'AUTO' | 'MAN' | 'CAS'
  const [isRunning, setIsRunning] = useState(true);
  const [statusMsg, setStatusMsg] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSendCommand = (actionType) => {
    setIsSubmitting(true);
    setStatusMsg({ type: 'info', text: `Dispatching ${actionType} to ${targetDevice}...` });

    setTimeout(() => {
      setIsSubmitting(false);
      if (actionType === 'TOGGLE_POWER') {
        setIsRunning(!isRunning);
        setStatusMsg({
          type: 'success',
          text: `Command dispatched: Controller state switched to ${!isRunning ? 'RUNNING' : 'STOPPED'}`
        });
      } else if (actionType === 'WRITE_SV') {
        setStatusMsg({
          type: 'success',
          text: `Setpoint ${setpoint} ${unit} written to ${tag} on ${targetDevice}`
        });
      } else if (actionType === 'CHANGE_MODE') {
        setStatusMsg({
          type: 'success',
          text: `Loop mode changed to ${controlMode}`
        });
      }

      setTimeout(() => setStatusMsg(null), 4000);
    }, 600);
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '12px',
      background: 'rgba(15, 23, 42, 0.4)',
      borderRadius: '8px',
      border: '1px solid rgba(255,255,255,0.06)'
    }}>
      {/* Device Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Terminal size={16} color="#38bdf8" />
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f1f5f9' }}>
            {targetDevice}
          </span>
          <span style={{
            fontSize: '0.65rem',
            padding: '2px 6px',
            borderRadius: '4px',
            background: isRunning ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            color: isRunning ? '#10b981' : '#ef4444',
            fontWeight: 600
          }}>
            {isRunning ? 'ONLINE' : 'STOPPED'}
          </span>
        </div>
        <span style={{ fontSize: '0.7rem', fontFamily: 'JetBrains Mono, monospace', color: '#64748b' }}>
          {tag}
        </span>
      </div>

      {/* PV vs SV Readout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', margin: '8px 0' }}>
        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '6px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Process Variable (PV)</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: '#38bdf8' }}>
            {currentPV.toFixed(1)} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#64748b' }}>{unit}</span>
          </div>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '6px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Target Setpoint (SV)</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: '#10b981' }}>
            {setpoint} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#64748b' }}>{unit}</span>
          </div>
        </div>
      </div>

      {/* Control Mode & Setpoint Slider */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            {['AUTO', 'MAN', 'CAS'].map(m => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setControlMode(m);
                  handleSendCommand('CHANGE_MODE');
                }}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: controlMode === m ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.08)',
                  background: controlMode === m ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                  color: controlMode === m ? '#38bdf8' : '#94a3b8'
                }}
              >
                {m}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => handleSendCommand('TOGGLE_POWER')}
            style={{
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '0.68rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              border: isRunning ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)',
              background: isRunning ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              color: isRunning ? '#f87171' : '#34d399'
            }}
          >
            <Power size={12} />
            <span>{isRunning ? 'Stop Unit' : 'Start Unit'}</span>
          </button>
        </div>

        {/* Setpoint Input & Send */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <input
            type="number"
            value={setpoint}
            onChange={(e) => setSetpoint(Number(e.target.value))}
            style={{
              flex: 1,
              padding: '6px 10px',
              background: '#090d14',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '4px',
              color: '#f1f5f9',
              fontSize: '0.8rem',
              fontFamily: 'JetBrains Mono, monospace'
            }}
          />
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSendCommand('WRITE_SV')}
            style={{
              padding: '6px 12px',
              background: '#0284c7',
              border: 'none',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Send size={12} />
            <span>Write SV</span>
          </button>
        </div>
      </div>

      {/* Status Bar */}
      {statusMsg && (
        <div style={{
          marginTop: '6px',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '0.7rem',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: statusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.15)',
          color: statusMsg.type === 'success' ? '#34d399' : '#38bdf8',
          border: `1px solid ${statusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(56, 189, 248, 0.3)'}`
        }}>
          {statusMsg.type === 'success' ? <CheckCircle2 size={12} /> : <Shield size={12} />}
          <span>{statusMsg.text}</span>
        </div>
      )}
    </div>
  );
}
