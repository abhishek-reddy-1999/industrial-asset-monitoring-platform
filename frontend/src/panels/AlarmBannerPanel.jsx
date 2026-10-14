import React, { useState, useEffect } from 'react';
import { AlertTriangle, AlertCircle, Info, Check, BellRing } from 'lucide-react';
import { fetchAlarms, ackAlarm } from '../api/client';

export default function AlarmBannerPanel() {
  const [alarms, setAlarms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAlarms = async () => {
      try {
        const data = await fetchAlarms();
        setAlarms(data);
      } catch (err) {
        console.error('Error fetching alarms:', err);
      } finally {
        setLoading(false);
      }
    };
    loadAlarms();
    const interval = setInterval(loadAlarms, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAck = async (id) => {
    try {
      await ackAlarm(id);
      setAlarms(prev => prev.map(a => a.id === id ? { ...a, status: 'ACKNOWLEDGED' } : a));
    } catch (err) {
      console.error('Failed to ack alarm:', err);
    }
  };

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'CRITICAL':
        return {
          bg: 'rgba(244, 63, 94, 0.15)',
          color: '#f43f5e',
          border: 'rgba(244, 63, 94, 0.3)',
          icon: <AlertTriangle size={12} />
        };
      case 'WARNING':
        return {
          bg: 'rgba(245, 158, 11, 0.15)',
          color: '#f59e0b',
          border: 'rgba(245, 158, 11, 0.3)',
          icon: <AlertCircle size={12} />
        };
      default:
        return {
          bg: 'rgba(56, 189, 248, 0.15)',
          color: '#38bdf8',
          border: 'rgba(56, 189, 248, 0.3)',
          icon: <Info size={12} />
        };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header Summary */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '4px 8px 8px 8px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        fontSize: '0.75rem',
        color: '#94a3b8'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <BellRing size={14} color="#f59e0b" />
          <span>Active Plant Events: <strong>{alarms.filter(a => a.status === 'ACTIVE').length}</strong></span>
        </div>
        <span>Standard: ISA-18.2 / IEC 62682</span>
      </div>

      {/* Alarms List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '0.8rem' }}>
            Scanning alarm buffer...
          </div>
        ) : alarms.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#10b981', fontSize: '0.8rem' }}>
            No active unacknowledged process alarms.
          </div>
        ) : (
          alarms.map((alarm) => {
            const badge = getSeverityBadge(alarm.severity);
            const isAck = alarm.status === 'ACKNOWLEDGED';

            return (
              <div
                key={alarm.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  margin: '4px 0',
                  background: 'rgba(0, 0, 0, 0.25)',
                  borderLeft: `3px solid ${badge.color}`,
                  borderRadius: '4px',
                  gap: '10px'
                }}
              >
                {/* Left Tag & Message */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 6px',
                      borderRadius: '12px',
                      background: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.border}`,
                      fontSize: '0.65rem',
                      fontWeight: 700
                    }}>
                      {badge.icon}
                      {alarm.severity}
                    </span>

                    <span style={{
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      fontFamily: 'JetBrains Mono, monospace',
                      color: '#f1f5f9'
                    }}>
                      {alarm.tag_name}
                    </span>

                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      {new Date(alarm.triggered_at).toLocaleTimeString()}
                    </span>
                  </div>

                  <div style={{
                    fontSize: '0.75rem',
                    color: '#cbd5e1',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {alarm.message} (PV: {alarm.value})
                  </div>
                </div>

                {/* Right Action */}
                <div>
                  {isAck ? (
                    <span style={{
                      fontSize: '0.7rem',
                      color: '#10b981',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      background: 'rgba(16, 185, 129, 0.1)',
                      borderRadius: '4px'
                    }}>
                      <Check size={12} /> ACK
                    </span>
                  ) : (
                    <button
                      className="btn"
                      onClick={() => handleAck(alarm.id)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '0.72rem',
                        borderColor: 'rgba(255,255,255,0.15)',
                        background: 'rgba(255,255,255,0.06)'
                      }}
                    >
                      ACK
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
