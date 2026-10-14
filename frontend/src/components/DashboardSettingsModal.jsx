import React, { useState, useEffect } from 'react';
import { 
  X, Check, Settings, Download, Upload, Copy, 
  Trash2, Sliders, Clock, RefreshCw, FileText, 
  Folder, AlertTriangle, ShieldAlert
} from 'lucide-react';

export default function DashboardSettingsModal({
  isOpen,
  onClose,
  dashboard,
  layout,
  onSaveSettings,
  onCloneDashboard,
  onImportLayout,
  onDeleteDashboard
}) {
  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'layout' | 'json' | 'danger'
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [timeRange, setTimeRange] = useState('now-15m');
  const [refreshInterval, setRefreshInterval] = useState('1s');
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (dashboard) {
      setTitle(dashboard.title || '');
      setDescription(dashboard.description || '');
      setCategory(dashboard.category || 'Process Monitoring');
      setTimeRange(dashboard.time_range || 'now-15m');
      setRefreshInterval(dashboard.refresh_interval || '1s');
      
      const exportObj = {
        title: dashboard.title,
        description: dashboard.description,
        category: dashboard.category,
        time_range: dashboard.time_range,
        refresh_interval: dashboard.refresh_interval,
        layout: layout || []
      };
      setJsonText(JSON.stringify(exportObj, null, 2));
      setJsonError(null);
      setConfirmDelete(false);
      setActiveTab('general');
    }
  }, [dashboard, layout, isOpen]);

  if (!isOpen || !dashboard) return null;

  const handleSave = () => {
    onSaveSettings({
      title,
      description,
      category,
      time_range: timeRange,
      refresh_interval: refreshInterval
    });
    onClose();
  };

  const handleDownloadJson = () => {
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dashboard.slug || 'dashboard'}-config.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleApplyJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed.layout || !Array.isArray(parsed.layout)) {
        setJsonError("Invalid JSON: 'layout' array must be present.");
        return;
      }
      onImportLayout(parsed);
      onClose();
    } catch (err) {
      setJsonError(`JSON Syntax Error: ${err.message}`);
    }
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 1100 }}>
      <div className="modal-content" style={{
        width: '680px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#131822',
        border: '1px solid #1e3a8a',
        padding: '0'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={18} color="#38bdf8" />
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#f8fafc' }}>
              Dashboard Configuration & Settings
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(0,0,0,0.2)',
          padding: '0 16px'
        }}>
          {[
            { id: 'general', label: 'General & Identity' },
            { id: 'timing', label: 'Refresh & Defaults' },
            { id: 'json', label: 'Export / Import (JSON)' },
            { id: 'danger', label: 'Clone & Manage' }
          ].map(tab => (
            <div
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 14px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                borderBottom: activeTab === tab.id ? '2px solid #38bdf8' : '2px solid transparent',
                color: activeTab === tab.id ? '#38bdf8' : '#94a3b8',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </div>
          ))}
        </div>

        {/* Body Content */}
        <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
          {/* 1. GENERAL TAB */}
          {activeTab === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Dashboard Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#fff', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Category / Operational Domain</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#fff', fontSize: '0.82rem' }}
                  >
                    <option value="Fractionation">Fractionation (Distillation Units)</option>
                    <option value="Asset Health Insights">Asset Health Insights (AHI / PDA)</option>
                    <option value="Plant-Wide Operations">Plant-Wide Operations (Fleet)</option>
                    <option value="Process Operations">Process Operations</option>
                    <option value="Custom">Custom Dashboard</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>URL Identifier (Slug)</label>
                  <input
                    type="text"
                    readOnly
                    value={dashboard.slug}
                    style={{ width: '100%', padding: '8px 10px', background: '#090d14', border: '1px solid #334155', borderRadius: '4px', color: '#38bdf8', fontFamily: 'monospace', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Description & Engineering Context</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#cbd5e1', fontSize: '0.78rem' }}
                />
              </div>

              <div style={{ padding: '10px 14px', background: 'rgba(56, 189, 248, 0.08)', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.2)', fontSize: '0.75rem', color: '#94a3b8' }}>
                Active panels count: <strong style={{ color: '#38bdf8' }}>{layout?.length || 0} widgets</strong> docked in this dashboard.
              </div>
            </div>
          )}

          {/* 2. TIMING & INGESTION DEFAULTS */}
          {activeTab === 'timing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Default Time Window Range</label>
                  <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#fff', fontSize: '0.82rem' }}
                  >
                    <option value="now-5m">Last 5 minutes</option>
                    <option value="now-15m">Last 15 minutes (Standard Loop)</option>
                    <option value="now-1h">Last 1 hour</option>
                    <option value="now-8h">Last 8 hours (Operator Shift)</option>
                    <option value="now-24h">Last 24 hours (Daily Operations)</option>
                    <option value="now-7d">Last 7 days (Weekly Analysis)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Telemetry Refresh Frequency</label>
                  <select
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#fff', fontSize: '0.82rem' }}
                  >
                    <option value="1s">1 second (High-Speed Real-time WebSocket)</option>
                    <option value="2s">2 seconds</option>
                    <option value="5s">5 seconds (Standard Plant Monitoring)</option>
                    <option value="10s">10 seconds</option>
                    <option value="30s">30 seconds</option>
                    <option value="1m">1 minute</option>
                    <option value="off">Off (Manual Refresh Only)</option>
                  </select>
                </div>
              </div>

              <div style={{ background: '#10141d', padding: '14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc', marginBottom: '6px' }}>Yokogawa DI Canvas Engine Settings</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: '1.5' }}>
                  • Grid Width: <strong>12 Responsive Columns</strong><br />
                  • Row Baseline: <strong>60px unit height</strong><br />
                  • Telemetry Stream: <strong>Redis In-Memory Bus (`ydash:stream`)</strong><br />
                  • Auto-save layout coordinates: <strong>Enabled on drag & resize</strong>
                </div>
              </div>
            </div>
          )}

          {/* 3. EXPORT / IMPORT JSON */}
          {activeTab === 'json' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Export or import complete dashboard schema & widget configurations:
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleDownloadJson}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.72rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Download size={12} /> Download JSON
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyJson}
                    className="btn btn-primary"
                    style={{ fontSize: '0.72rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Upload size={12} /> Apply Import
                  </button>
                </div>
              </div>

              {jsonError && (
                <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '4px', color: '#ef4444', fontSize: '0.75rem' }}>
                  {jsonError}
                </div>
              )}

              <textarea
                rows={12}
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#090d14',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#38bdf8',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '0.72rem',
                  lineHeight: '1.4'
                }}
              />
            </div>
          )}

          {/* 4. CLONE & MANAGE */}
          {activeTab === 'danger' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Duplicate Dashboard */}
              <div style={{ background: '#10141d', padding: '16px', borderRadius: '6px', border: '1px solid #1e3a8a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>Clone / Duplicate Dashboard</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Create an exact copy of this dashboard layout with a new slug.</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onCloneDashboard({
                      title: `${title} (Copy)`,
                      slug: `${dashboard.slug}-copy-${Date.now().toString().slice(-4)}`,
                      description: `Cloned from ${title}`,
                      category: category,
                      time_range: timeRange,
                      refresh_interval: refreshInterval,
                      layout: layout
                    });
                    onClose();
                  }}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Copy size={13} /> Duplicate
                </button>
              </div>

              {/* Danger Zone: Delete Dashboard */}
              <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '16px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: 600, fontSize: '0.85rem', marginBottom: '4px' }}>
                  <AlertTriangle size={16} /> Danger Zone: Delete Dashboard
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '12px' }}>
                  Permanently remove <strong>{dashboard.title}</strong> from PostgreSQL. This action cannot be undone.
                </div>

                {confirmDelete ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>Are you absolutely sure?</span>
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteDashboard(dashboard.slug);
                        onClose();
                      }}
                      className="btn"
                      style={{ background: '#ef4444', color: '#fff', fontSize: '0.75rem', padding: '4px 10px' }}
                    >
                      Yes, Delete Forever
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="btn"
                      style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="btn"
                    style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid #ef4444', color: '#ef4444', fontSize: '0.75rem', padding: '4px 12px' }}
                  >
                    Delete Dashboard
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px'
        }}>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            <Check size={14} /> Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
}
