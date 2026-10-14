import React, { useState } from 'react';
import { Plus, Cpu, RefreshCw, Trash2, CheckCircle2, X } from 'lucide-react';
import { useDM } from './dmContext';
import DMCommonControls from './DMCommonControls';

export default function IntegrationEntityView() {
  const { integrations, createIntegration, deleteIntegration, showToast } = useDM();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [testingId, setTestingId] = useState(null);
  const [integrationType, setIntegrationType] = useState('Azure Event Hub');

  const handleTestConnection = async (item) => {
    setTestingId(item.id);
    try {
      let proto = 'HTTP';
      if (item.integration_type?.includes('Event Hub') || item.integration_type?.includes('MQTT')) {
        proto = 'MQTT';
      }
      const res = await fetch('/api/v1/dm/protocols/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          protocol: proto,
          endpoint: item.endpoint || item.hub_name,
          host: '127.0.0.1',
          port: proto === 'MQTT' ? 1883 : 91
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Connection to ${item.name} verified (${data.latency_ms}ms)`, 'success');
      } else {
        showToast(`Connection warning for ${item.name}: ${data.message}`, 'error');
      }
    } catch (e) {
      showToast(`Error testing ${item.name}: ${e.message}`, 'error');
    } finally {
      setTestingId(null);
    }
  };
  const [formData, setFormData] = useState({
    name: '',
    connection_string: '',
    hub_name: '',
    endpoint: '',
    client_id: '',
    client_secret: '',
    api_key: '',
    api_secret: '',
    interval_time: 5,
    broker_endpoint: ''
  });

  const columns = [
    { key: 'name', label: 'Integration Name' },
    { key: 'integration_type', label: 'Type' },
    { key: 'status', label: 'Connection Status' },
    { key: 'last_sync', label: 'Last Synchronized' }
  ];

  return (
    <div className="dm-entity-container">
      <div className="dm-entity-header-row">
        <div>
          <h2 className="dm-page-title">Integration Entity (Section 9.8)</h2>
          <p className="dm-page-subtitle">
            Manage connectivity to external platforms including Azure Event Hub, Green Koncepts Energy Cloud and Yokogawa Digital Experience (YDX).
          </p>
        </div>
        <button className="dm-btn dm-btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={14} /> <span>New Integration</span>
        </button>
      </div>

      <div className="dm-tab-content-card">
        <DMCommonControls 
          columns={columns}
          totalRecords={integrations.length}
        />

        <div className="dm-table-scroll-container">
          <table className="dm-data-table">
            <thead>
              <tr>
                <th>Integration Name</th>
                <th>System Type</th>
                <th>Status</th>
                <th>Endpoint / Hub Name</th>
                <th>Last Synchronized</th>
                <th style={{ textAlign: 'right', width: '120px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {integrations.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                    <Cpu size={28} style={{ margin: '0 auto 8px', color: '#475569' }} />
                    <div style={{ fontWeight: 600, color: '#f8fafc' }}>No Integrations Configured</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                      Click "New Integration" to configure cloud connectors, Azure Event Hubs, or third-party enterprise platforms.
                    </div>
                    <button className="dm-btn dm-btn-primary" style={{ margin: '12px auto 0' }} onClick={() => setIsModalOpen(true)}>
                      <Plus size={13} /> <span>New Integration</span>
                    </button>
                  </td>
                </tr>
              ) : (
                integrations.map(item => (
                <tr key={item.id} className="dm-table-row">
                  <td style={{ fontWeight: 600, color: '#f8fafc' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Cpu size={14} color="#10b981" />
                      <span>{item.name}</span>
                    </div>
                  </td>
                  <td>
                    <span className="dm-tree-badge">{item.integration_type}</span>
                  </td>
                  <td>
                    <span className="dm-health-badge connected">
                      <span className="dm-dot" />
                      {item.status}
                    </span>
                  </td>
                  <td className="mono" style={{ color: '#38bdf8' }}>
                    {item.hub_name || item.endpoint || '-'}
                  </td>
                  <td className="dm-timestamp-cell">
                    {item.last_sync?.substring(0, 19).replace('T', ' ') || '-'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '4px' }}>
                      <button 
                        className="dm-row-action-btn primary"
                        onClick={() => handleTestConnection(item)}
                        disabled={testingId === item.id}
                        title={`Test Connection to ${item.name}`}
                      >
                        <RefreshCw size={13} className={testingId === item.id ? "animate-spin" : ""} />
                      </button>
                      <button 
                        className="dm-row-action-btn delete"
                        onClick={() => {
                          if (window.confirm(`Delete integration '${item.name}'?`)) {
                            deleteIntegration(item.id);
                          }
                        }}
                        title="Delete Integration"
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

      {/* CREATE INTEGRATION MODAL */}
      {isModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1400 }}>
          <div className="dm-modal-box" style={{ width: '600px' }}>
            <div className="dm-modal-header">
              <h3>Configure External Integration</h3>
              <button onClick={() => setIsModalOpen(false)} className="dm-close-btn">&times;</button>
            </div>
            <div className="dm-modal-body">
              <div className="dm-form-grid-2">
                <div className="dm-form-group">
                  <label className="dm-field-label">Integration Name</label>
                  <input 
                    type="text"
                    className="dm-input"
                    placeholder="e.g. YDX Enterprise Hub"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="dm-form-group">
                  <label className="dm-field-label">Integration Type</label>
                  <select 
                    className="dm-select"
                    value={integrationType}
                    onChange={(e) => setIntegrationType(e.target.value)}
                  >
                    <option value="Azure Event Hub">Azure Event Hub (Section 9.8.1)</option>
                    <option value="Green Koncepts Integration">Green Koncepts Integration (Section 9.8.2)</option>
                    <option value="YDX Integration">YDX Integration (Section 9.8.3)</option>
                  </select>
                </div>
              </div>

              {integrationType === 'Azure Event Hub' && (
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

              {integrationType === 'Green Koncepts Integration' && (
                <div className="dm-broker-specific-box">
                  <div className="dm-form-group">
                    <label className="dm-field-label">API Endpoint</label>
                    <input 
                      type="text"
                      className="dm-input"
                      value={formData.endpoint}
                      onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                      placeholder="https://api.greenkoncepts.com/v2/metrics"
                    />
                  </div>
                  <div className="dm-form-grid-2">
                    <div className="dm-form-group">
                      <label className="dm-field-label">Client ID</label>
                      <input 
                        type="text"
                        className="dm-input mono"
                        value={formData.client_id}
                        onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                      />
                    </div>
                    <div className="dm-form-group">
                      <label className="dm-field-label">Client Secret</label>
                      <input 
                        type="password"
                        className="dm-input mono"
                        value={formData.client_secret}
                        onChange={(e) => setFormData({ ...formData, client_secret: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {integrationType === 'YDX Integration' && (
                <div className="dm-broker-specific-box">
                  <div className="dm-form-group">
                    <label className="dm-field-label">YDX Endpoint</label>
                    <input 
                      type="text"
                      className="dm-input"
                      value={formData.endpoint}
                      onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                      placeholder="https://ydx.yokogawa.com/api/v3"
                    />
                  </div>
                  <div className="dm-form-grid-2">
                    <div className="dm-form-group">
                      <label className="dm-field-label">API Key</label>
                      <input 
                        type="text"
                        className="dm-input mono"
                        value={formData.api_key}
                        onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                      />
                    </div>
                    <div className="dm-form-group">
                      <label className="dm-field-label">Interval Time (Seconds)</label>
                      <input 
                        type="number"
                        className="dm-input"
                        value={formData.interval_time}
                        onChange={(e) => setFormData({ ...formData, interval_time: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="dm-form-group">
                    <label className="dm-field-label">Broker Endpoint</label>
                    <input 
                      type="text"
                      className="dm-input"
                      value={formData.broker_endpoint}
                      onChange={(e) => setFormData({ ...formData, broker_endpoint: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="dm-modal-footer">
              <button className="dm-btn dm-btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button 
                className="dm-btn dm-btn-primary"
                onClick={() => {
                  if (!formData.name) return;
                  createIntegration({
                    ...formData,
                    integration_type: integrationType
                  });
                  setIsModalOpen(false);
                }}
              >
                Save Integration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
