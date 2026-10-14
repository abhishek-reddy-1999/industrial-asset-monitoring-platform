import React, { useState, useEffect } from 'react';
import { 
  Bell, AlertTriangle, AlertOctagon, CheckCircle2, 
  RotateCcw, Check, RefreshCw, Filter, Eye, ShieldAlert,
  Share2
} from 'lucide-react';

/**
 * ThingsBoard-style Embedded Alarms Table Widget
 * Displays live alarms list directly on any dashboard canvas with:
 * - Real-time alarms stream
 * - Urgency color codes (Urgent, High, Medium, Low)
 * - State filters (All, In Alarm, Acknowledged, Normal)
 * - Direct In-Widget Acknowledge and Clear (Return to Normal) buttons
 */
export default function AlarmsTablePanel({ panel }) {
  const [alarms, setAlarms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterState, setFilterState] = useState('ALL');
  const [filterSeverity, setFilterSeverity] = useState('ALL');

  const fetchAlarms = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/dm/alarms');
      if (res.ok) {
        const data = await res.json();
        setAlarms(data);
      }
    } catch (e) {
      console.warn('Could not fetch alarms from API:', e);
      setAlarms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlarms();
    const interval = setInterval(fetchAlarms, 8000);
    return () => clearInterval(interval);
  }, []);

  const acknowledge = async (alarmId) => {
    try {
      await fetch(`/api/v1/dm/alarms/${alarmId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: 'Operator' })
      });
      setAlarms(prev => prev.map(a => a.id === alarmId ? { ...a, state: 'In Alarm Acknowledged' } : a));
    } catch (e) {
      setAlarms(prev => prev.map(a => a.id === alarmId ? { ...a, state: 'In Alarm Acknowledged' } : a));
    }
  };

  const clearAlarm = async (alarmId) => {
    try {
      await fetch(`/api/v1/dm/alarms/${alarmId}/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: 'Operator' })
      });
      setAlarms(prev => prev.filter(a => a.id !== alarmId));
    } catch (e) {
      setAlarms(prev => prev.filter(a => a.id !== alarmId));
    }
  };

  const filtered = alarms.filter(a => {
    if (filterState === 'UNACK' && !a.state.includes('Unacknowledged')) return false;
    if (filterState === 'ACK' && !a.state.includes('Acknowledged')) return false;
    if (filterSeverity !== 'ALL' && a.priority !== filterSeverity) return false;
    return true;
  });

  const getSeverityStyle = (priority) => {
    switch (priority) {
      case 'Urgent':
        return { bg: 'rgba(147, 51, 234, 0.2)', color: '#c084fc', border: '#9333ea' };
      case 'High':
        return { bg: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '#ef4444' };
      case 'Medium':
        return { bg: 'rgba(249, 115, 22, 0.2)', color: '#fb923c', border: '#f97316' };
      default:
        return { bg: 'rgba(234, 179, 8, 0.2)', color: '#fde047', border: '#eab308' };
    }
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'rgba(10, 15, 29, 0.4)',
      boxSizing: 'border-box',
      overflow: 'hidden',
      padding: '12px'
    }}>
      {/* Top Controls Toolbar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <ShieldAlert size={14} color="#ef4444" />
            <span>ThingsBoard Alarms Console</span>
          </div>
          <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', fontWeight: 700 }}>
            {filtered.length} Active
          </span>
        </div>

        {/* Filter Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {['ALL', 'UNACK', 'ACK'].map(st => (
            <button
              key={st}
              onClick={() => setFilterState(st)}
              style={{
                fontSize: '0.66rem',
                padding: '2px 8px',
                borderRadius: '4px',
                border: filterState === st ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.08)',
                background: filterState === st ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                color: filterState === st ? '#38bdf8' : '#94a3b8',
                cursor: 'pointer'
              }}
            >
              {st}
            </button>
          ))}
          <button
            onClick={fetchAlarms}
            title="Refresh Alarms"
            style={{
              padding: '2px 6px',
              borderRadius: '4px',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'transparent',
              color: '#94a3b8',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={11} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Alarms Table View */}
      <div style={{ flex: 1, overflow: 'auto', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem' }}>
          <thead>
            <tr style={{ background: '#070b14', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'left' }}>
              <th style={{ padding: '6px 10px' }}>Severity</th>
              <th style={{ padding: '6px 10px' }}>Alarm Description</th>
              <th style={{ padding: '6px 10px' }}>Signal / Value</th>
              <th style={{ padding: '6px 10px' }}>Status</th>
              <th style={{ padding: '6px 10px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                  <CheckCircle2 size={18} color="#10b981" style={{ margin: '0 auto 6px' }} />
                  <div>No active alarms in current filter</div>
                </td>
              </tr>
            ) : (
              filtered.map(a => {
                const sStyle = getSeverityStyle(a.priority);
                const isUnack = a.state.includes('Unacknowledged');
                return (
                  <tr 
                    key={a.id}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      background: isUnack ? 'rgba(239, 68, 68, 0.03)' : 'transparent'
                    }}
                  >
                    <td style={{ padding: '6px 10px' }}>
                      <span style={{
                        fontSize: '0.65rem',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        background: sStyle.bg,
                        color: sStyle.color,
                        border: `1px solid ${sStyle.border}`,
                        fontWeight: 600
                      }}>
                        {a.priority}
                      </span>
                    </td>
                    <td style={{ padding: '6px 10px', color: '#f1f5f9', fontWeight: 500 }}>
                      {a.alarm_name}
                    </td>
                    <td style={{ padding: '6px 10px', fontFamily: 'monospace' }}>
                      <span style={{ color: '#38bdf8' }}>{a.tag_name}</span>: <strong style={{ color: sStyle.color }}>{a.current_value}</strong>
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <span style={{
                        fontSize: '0.66rem',
                        color: isUnack ? '#f87171' : '#10b981'
                      }}>
                        {a.state}
                      </span>
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '4px' }}>
                        {isUnack && (
                          <button
                            onClick={() => acknowledge(a.id)}
                            style={{
                              fontSize: '0.65rem',
                              padding: '2px 6px',
                              borderRadius: '3px',
                              background: '#0284c7',
                              border: 'none',
                              color: '#fff',
                              cursor: 'pointer'
                            }}
                          >
                            Ack
                          </button>
                        )}
                        <button
                          onClick={() => clearAlarm(a.id)}
                          style={{
                            fontSize: '0.65rem',
                            padding: '2px 6px',
                            borderRadius: '3px',
                            background: 'rgba(16, 185, 129, 0.15)',
                            border: '1px solid #10b981',
                            color: '#34d399',
                            cursor: 'pointer'
                          }}
                        >
                          Clear
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
