import React, { useState } from 'react';
import { Plus, Radio, Play, Pause, Trash2, CheckCircle2, ArrowRight, X, RefreshCw, Send, Zap, Globe, Edit3 } from 'lucide-react';
import { useDM } from './dmContext';
import DMCommonControls from './DMCommonControls';

export default function EventForwardingView() {
  const { eventForwardings, toggleEventForwarding, createEventForwarding, updateEventForwarding, deleteEventForwarding, assets = [], showToast } = useDM();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEfId, setEditingEfId] = useState(null);
  const [eventType, setEventType] = useState('Node-RED');
  const [testingId, setTestingId] = useState(null);
  const [pingResult, setPingResult] = useState(null);
  const [formData, setFormData] = useState({
    name: 'Node-RED Telemetry Ingestion Mirror',
    active: true,
    simplified_payload: true,
    connection_string: '',
    hub_name: '',
    host: '',
    username: '',
    password: '',
    exchange_topic: '',
    routing_key: '',
    endpoint: 'http://localhost:1880/telemetry-in',
    selectedAssetIds: []
  });

  const handleOpenCreateModal = () => {
    setEditingEfId(null);
    setEventType('Node-RED');
    setPingResult(null);
    setFormData({
      name: 'Node-RED Telemetry Ingestion Mirror',
      active: true,
      simplified_payload: true,
      connection_string: '',
      hub_name: '',
      host: '',
      username: '',
      password: '',
      exchange_topic: '',
      routing_key: '',
      endpoint: 'http://localhost:1880/telemetry-in',
      selectedAssetIds: []
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (ef) => {
    setEditingEfId(ef.id);
    setEventType(ef.event_type || 'Node-RED');
    setPingResult(null);

    let assetIds = [];
    if (Array.isArray(ef.selectedAssetIds) && ef.selectedAssetIds.length > 0) {
      assetIds = ef.selectedAssetIds;
    } else if (Array.isArray(ef.scope)) {
      assetIds = ef.scope.map(s => s.asset_id || s.equipment_id || s.id).filter(Boolean);
    }

    setFormData({
      name: ef.name || '',
      active: ef.active !== undefined ? ef.active : true,
      simplified_payload: ef.simplified_payload !== undefined ? ef.simplified_payload : true,
      connection_string: ef.connection_string || '',
      hub_name: ef.hub_name || '',
      host: ef.host || '',
      username: ef.username || '',
      password: ef.password || '',
      exchange_topic: ef.exchange_topic || '',
      routing_key: ef.routing_key || '',
      endpoint: ef.endpoint || (ef.url || ''),
      selectedAssetIds: assetIds
    });
    setIsModalOpen(true);
  };

  const handleTestPingRow = async (ef) => {
    try {
      setTestingId(ef.id);
      const res = await fetch(`/api/v1/dm/event-forwardings/${ef.id}/test-ping`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast?.(`Forward ping to ${ef.name} delivered (${data.status_code || 200})`, 'success');
      } else {
        showToast?.(`Forward ping failed: ${data.message || data.error}`, 'error');
      }
    } catch (err) {
      showToast?.(`Test ping error: ${err.message}`, 'error');
    } finally {
      setTestingId(null);
    }
  };

  const handleTestPingDirect = async () => {
    try {
      setTestingId('modal');
      const res = await fetch('/api/v1/dm/event-forwardings/test-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: formData.endpoint })
      });
      const data = await res.json();
      setPingResult(data);
      if (data.success) {
        showToast?.(`Target reachable (HTTP ${data.status_code || 200})`, 'success');
      } else {
        showToast?.(`Target unreachable: ${data.message}`, 'error');
      }
    } catch (err) {
      setPingResult({ success: false, message: err.message });
      showToast?.(`Ping error: ${err.message}`, 'error');
    } finally {
      setTestingId(null);
    }
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'active', label: 'State (RUN/STOP)' },
    { key: 'event_type', label: 'Event Type' },
    { key: 'simplified_payload', label: 'Simplified Payload' },
    { key: 'scope_count', label: 'Target Scope' }
  ];

  return (
    <div className="dm-entity-container">
      <div className="dm-entity-header-row">
        <div>
          <h2 className="dm-page-title">Event Forwarding Entity (Section 9.10)</h2>
          <p className="dm-page-subtitle">
            Forward asset attribute updates to external platforms (Azure Event Hub, RabbitMQ, Webhooks) with scope selection and flattened payload options.
          </p>
        </div>
        <button className="dm-btn dm-btn-primary" onClick={handleOpenCreateModal}>
          <Plus size={14} /> <span>New Event Forwarding</span>
        </button>
      </div>

      <div className="dm-tab-content-card">
        <DMCommonControls 
          columns={columns}
          totalRecords={eventForwardings.length}
        />

        <div className="dm-table-scroll-container">
          <table className="dm-data-table">
            <thead>
              <tr>
                <th>Forwarding Name</th>
                <th>Run State</th>
                <th>Destination Type</th>
                <th>Simplified Payload</th>
                <th>Scope (Bound Assets)</th>
                <th style={{ textAlign: 'right', width: '120px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {eventForwardings.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                    <Radio size={28} style={{ margin: '0 auto 8px', color: '#475569' }} />
                    <div style={{ fontWeight: 600, color: '#f8fafc' }}>No Event Forwardings Configured</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                      Click "New Event Forwarding" to stream asset telemetry events outward to external event brokers and Webhooks.
                    </div>
                    <button className="dm-btn dm-btn-primary" style={{ margin: '12px auto 0' }} onClick={handleOpenCreateModal}>
                      <Plus size={13} /> <span>New Event Forwarding</span>
                    </button>
                  </td>
                </tr>
              ) : (
                eventForwardings.map(ef => (
                <tr key={ef.id} className="dm-table-row">
                  <td style={{ fontWeight: 600, color: '#f8fafc' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Radio size={14} color={ef.active ? '#10b981' : '#64748b'} />
                      <span>{ef.name}</span>
                    </div>
                  </td>
                  <td>
                    <button 
                      className={`dm-state-toggle-btn ${ef.active ? 'running' : 'stopped'}`}
                      onClick={() => toggleEventForwarding(ef.id)}
                    >
                      {ef.active ? <Play size={10} /> : <Pause size={10} />}
                      <span>{ef.active ? 'RUNNING' : 'STOPPED'}</span>
                    </button>
                  </td>
                  <td>
                    <span className="dm-tree-badge">{ef.event_type}</span>
                  </td>
                  <td>
                    <span className={`dm-quality-pill ${ef.simplified_payload ? 'good' : 'bad'}`}>
                      {ef.simplified_payload ? 'Flattened (True)' : 'Nested (False)'}
                    </span>
                  </td>
                  <td>
                    <span className="dm-value-badge">
                      {(ef.scope || []).length} assets in scope
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '4px' }}>
                      <button 
                        className="dm-row-action-btn primary"
                        onClick={() => handleTestPingRow(ef)}
                        disabled={testingId === ef.id}
                        title={`Send Test Forward Ping to ${ef.name}`}
                        style={{ color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)' }}
                      >
                        <RefreshCw size={12} className={testingId === ef.id ? "animate-spin" : ""} />
                      </button>
                      <button 
                        className="dm-row-action-btn edit"
                        onClick={() => handleOpenEditModal(ef)}
                        title="Edit Event Forwarding Rule"
                        style={{ color: '#fbbf24', borderColor: 'rgba(251, 191, 36, 0.4)' }}
                      >
                        <Edit3 size={12} />
                      </button>
                      <button 
                        className="dm-row-action-btn delete"
                        onClick={() => deleteEventForwarding(ef.id)}
                        title="Delete Event Forwarding"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          </table>
        </div>
      </div>

      {/* CREATE FORWARDING MODAL */}
      {isModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1400 }}>
          <div className="dm-modal-box" style={{ width: '640px' }}>
            <div className="dm-modal-header">
              <h3>{editingEfId ? 'Edit Event Forwarding Rule' : 'Configure Event Forwarding (Table 19)'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="dm-close-btn">&times;</button>
            </div>
            <div className="dm-modal-body">
              <div className="dm-form-grid-2">
                <div className="dm-form-group">
                  <label className="dm-field-label">Rule Name</label>
                  <input 
                    type="text"
                    className="dm-input"
                    placeholder="e.g. Area 01 Cloud Mirror"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="dm-form-group">
                  <label className="dm-field-label">Target Platform / Protocol</label>
                  <select 
                    className="dm-select"
                    value={eventType}
                    onChange={(e) => {
                      const et = e.target.value;
                      setEventType(et);
                      let defaultUrl = formData.endpoint;
                      if (et === 'Node-RED') defaultUrl = 'http://localhost:1880/telemetry-in';
                      if (et === 'n8n') defaultUrl = 'http://localhost:5678/webhook/asset-events';
                      if (et === 'Webhook') defaultUrl = 'http://localhost:8000/api/webhook';
                      setFormData({ ...formData, endpoint: defaultUrl });
                    }}
                  >
                    <option value="Node-RED">Node-RED Flow (HTTP In Endpoint)</option>
                    <option value="n8n">n8n Workflow (Webhook Trigger)</option>
                    <option value="Webhook">Custom REST Webhook API</option>
                    <option value="Azure Event Hub">Azure Event Hub</option>
                    <option value="RabbitMQ">RabbitMQ Message Broker</option>
                  </select>
                </div>
              </div>

              {/* Quick Destination Presets */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                <button
                  type="button"
                  className="dm-btn dm-btn-secondary"
                  style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                  onClick={() => {
                    setEventType('Node-RED');
                    setFormData(prev => ({
                      ...prev,
                      name: 'Node-RED Telemetry Feed',
                      endpoint: 'http://localhost:1880/telemetry-in'
                    }));
                  }}
                >
                  <Zap size={11} color="#ef4444" /> Node-RED Preset (:1880)
                </button>
                <button
                  type="button"
                  className="dm-btn dm-btn-secondary"
                  style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                  onClick={() => {
                    setEventType('n8n');
                    setFormData(prev => ({
                      ...prev,
                      name: 'n8n Production Workflow',
                      endpoint: 'http://localhost:5678/webhook/asset-events'
                    }));
                  }}
                >
                  <Zap size={11} color="#f59e0b" /> n8n Webhook Preset (:5678)
                </button>
              </div>

              <div className="dm-form-grid-2" style={{ background: '#0a0d14', padding: '10px', borderRadius: '6px', marginBottom: '12px' }}>
                <label className="dm-checkbox-inline">
                  <input 
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  />
                  <span>Active (Toggle to RUN/STOP)</span>
                </label>
                <label className="dm-checkbox-inline">
                  <input 
                    type="checkbox"
                    checked={formData.simplified_payload}
                    onChange={(e) => setFormData({ ...formData, simplified_payload: e.target.checked })}
                  />
                  <span>Simplified Payload (Flatten message)</span>
                </label>
              </div>

              {eventType === 'Azure Event Hub' && (
                <div className="dm-broker-specific-box">
                  <div className="dm-form-group">
                    <label className="dm-field-label">Hub Name</label>
                    <input 
                      type="text"
                      className="dm-input"
                      value={formData.hub_name}
                      onChange={(e) => setFormData({ ...formData, hub_name: e.target.value })}
                    />
                  </div>
                  <div className="dm-form-group">
                    <label className="dm-field-label">Connection String</label>
                    <input 
                      type="text"
                      className="dm-input mono"
                      value={formData.connection_string}
                      onChange={(e) => setFormData({ ...formData, connection_string: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {eventType === 'RabbitMQ' && (
                <div className="dm-broker-specific-box">
                  <div className="dm-form-grid-2">
                    <div className="dm-form-group">
                      <label className="dm-field-label">Host (IP / DNS)</label>
                      <input 
                        type="text"
                        className="dm-input"
                        value={formData.host}
                        onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                      />
                    </div>
                    <div className="dm-form-group">
                      <label className="dm-field-label">Exchange Topic</label>
                      <input 
                        type="text"
                        className="dm-input"
                        value={formData.exchange_topic}
                        onChange={(e) => setFormData({ ...formData, exchange_topic: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="dm-form-grid-2">
                    <div className="dm-form-group">
                      <label className="dm-field-label">Username</label>
                      <input 
                        type="text"
                        className="dm-input"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      />
                    </div>
                    <div className="dm-form-group">
                      <label className="dm-field-label">Routing Key</label>
                      <input 
                        type="text"
                        className="dm-input"
                        value={formData.routing_key}
                        onChange={(e) => setFormData({ ...formData, routing_key: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {(eventType === 'Node-RED' || eventType === 'n8n' || eventType === 'Webhook') && (
                <div className="dm-broker-specific-box">
                  <div className="dm-form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="dm-field-label">
                        {eventType} Destination URL
                      </label>
                      <button
                        type="button"
                        className="dm-btn dm-btn-secondary"
                        style={{ padding: '2px 8px', fontSize: '0.68rem' }}
                        onClick={handleTestPingDirect}
                        disabled={testingId === 'modal'}
                      >
                        <RefreshCw size={10} className={testingId === 'modal' ? "animate-spin" : ""} />
                        <span>Test Endpoint Ping</span>
                      </button>
                    </div>
                    <input 
                      type="text"
                      className="dm-input mono"
                      placeholder="http://localhost:1880/telemetry-in or http://localhost:5678/webhook/..."
                      value={formData.endpoint}
                      onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                    />
                  </div>

                  {pingResult && (
                    <div style={{
                      marginTop: '6px',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      background: pingResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: pingResult.success ? '#10b981' : '#ef4444',
                      border: pingResult.success ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'
                    }}>
                      {pingResult.success ? 'Connection verified!' : 'Connection test failed:'} {pingResult.message}
                    </div>
                  )}
                </div>
              )}

              {/* Scope Selection */}
              <div className="dm-form-group" style={{ marginTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label className="dm-field-label" style={{ margin: 0 }}>Scope (Select Equipment / Assets to forward data for)</label>
                  <span style={{ fontSize: '0.68rem', color: formData.selectedAssetIds.length === 0 ? '#10b981' : '#38bdf8' }}>
                    {formData.selectedAssetIds.length === 0 ? 'All Equipment (Global)' : `${formData.selectedAssetIds.length} Equipment selected`}
                  </span>
                </div>
                <div style={{ maxHeight: '140px', overflowY: 'auto', background: '#0a0d14', padding: '8px', borderRadius: '6px' }}>
                  {assets.map(a => (
                    <label key={a.id} className="dm-checkbox-inline" style={{ display: 'flex', marginBottom: '4px' }}>
                      <input 
                        type="checkbox"
                        checked={formData.selectedAssetIds.includes(a.id)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFormData(prev => ({
                            ...prev,
                            selectedAssetIds: checked ? [...prev.selectedAssetIds, a.id] : prev.selectedAssetIds.filter(id => id !== a.id)
                          }));
                        }}
                      />
                      <span><strong>{a.name}</strong> ({a.level}) &mdash; <span style={{ color: '#64748b' }}>{a.path}</span></span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="dm-modal-footer">
              <button className="dm-btn dm-btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button 
                className="dm-btn dm-btn-primary"
                onClick={async () => {
                  if (!formData.name) {
                    showToast?.('Please enter a rule name', 'error');
                    return;
                  }
                  const scoped = assets.filter(a => formData.selectedAssetIds.includes(a.id)).map(a => ({
                    asset_id: a.id,
                    asset_name: a.name,
                    asset_path: a.path,
                    equipment_id: a.id,
                    equipment_name: a.name,
                    equipment_tag: a.name
                  }));
                  const payload = {
                    ...formData,
                    event_type: eventType,
                    scope: scoped
                  };
                  if (editingEfId) {
                    await updateEventForwarding(editingEfId, payload);
                  } else {
                    await createEventForwarding(payload);
                  }
                  setIsModalOpen(false);
                }}
              >
                {editingEfId ? 'Update Forwarding Rule' : 'Save Forwarding Rule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
