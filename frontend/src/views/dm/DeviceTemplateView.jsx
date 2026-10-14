import React, { useState, useEffect } from 'react';
import { 
  Plus, Cpu, RefreshCw, Trash2, Check, X, Code, 
  Terminal, Play, ArrowRight, Settings, Shield,
  Radio, Server, AlertTriangle, Layers, GitFork
} from 'lucide-react';
import { useDM } from './dmContext';
import DMCommonControls from './DMCommonControls';

export default function DeviceTemplateView() {
  const { 
    deviceTemplates = [], 
    createDeviceTemplate, 
    updateDeviceTemplate, 
    deleteDeviceTemplate, 
    showToast 
  } = useDM();

  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState(deviceTemplates);
  const [selectedTemplateId, setSelectedTemplateId] = useState(deviceTemplates[0]?.id || null);
  const activeTemplate = templates.find(t => t.id === selectedTemplateId) || templates[0];

  // Sub-tab selection for ThingsBoard Device Profile
  const [activeDetailTab, setActiveDetailTab] = useState('json_parser'); // 'json_parser' | 'transport' | 'alarm_rules' | 'rule_chain'

  // Figure 4 GUI Parser State
  const [jsonInput, setJsonInput] = useState('');
  const [metricKeys, setMetricKeys] = useState([]);
  const [bindings, setBindings] = useState([]);
  const [isNewTemplateModalOpen, setIsNewTemplateModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  // ThingsBoard Device Profile Transport Settings State
  const [transportConfig, setTransportConfig] = useState({
    transport_type: 'OPC_UA',
    endpoint_url: 'opc.tcp://127.0.0.1:4840',
    security_policy: 'Basic256Sha256',
    security_mode: 'SignAndEncrypt',
    scan_period_ms: 1000,
    mqtt_topic: 'refinery/telemetry/#',
    modbus_port: 502,
    modbus_unit_id: 1
  });

  // ThingsBoard Alarm Rules State
  const [alarmRules, setAlarmRules] = useState([]);
  const [newAlarmType, setNewAlarmType] = useState('');
  const [newAlarmSeverity, setNewAlarmSeverity] = useState('CRITICAL');
  const [newAlarmCond, setNewAlarmCond] = useState('');
  const [newAlarmClear, setNewAlarmClear] = useState('');

  // Default Rule Chain Association State
  const [assignedRuleChain, setAssignedRuleChain] = useState('rc-root-01');

  // Sample preset payloads for quick testing
  const samplePresets = {
    environmental: '{"deviceid":"dfc4960b-b9f0-42ef-8d94-43fd65e95631","key":"K8vntf81Xp0j5zuqEbmYDyju/sNHkh8b4uSEcfMQhijk=","protocol":"mqtt","deviceType":"YEAL7 sensor type01","datatype":"realtime","timestamp":"2024-03-05T08:00:00Z","timestampunix":1651505017758,"temperature":45.2,"humidity":22.3,"CO2":11,"illuminance":6,"status":1}',
    centrifugal_pump: '{"deviceid":"pump-p101a-hub-01","timestamp":"2024-03-05T08:00:00Z","suction_pressure":124.5,"discharge_pressure":582.4,"bearing_vibration":2.45,"fluid_density":842.0,"motor_kw":88.5,"speed_rpm":2950}',
    column_analyzer: '{"deviceid":"cdu-analyzer-top-01","timestamp":"2024-03-05T08:00:00Z","ethane_pct":0.45,"propane_pct":3.82,"butane_pct":14.2,"pentane_pct":81.53,"reid_vapor_pressure":68.4}'
  };

  // Sync state when deviceTemplates loads from backend
  useEffect(() => {
    if (deviceTemplates && deviceTemplates.length > 0) {
      setTemplates(deviceTemplates);
      if (!selectedTemplateId || !deviceTemplates.some(t => t.id === selectedTemplateId)) {
        const first = deviceTemplates[0];
        setSelectedTemplateId(first.id);
      }
    }
  }, [deviceTemplates]);

  // Sync inspector inputs whenever active template changes
  useEffect(() => {
    if (activeTemplate) {
      setJsonInput(activeTemplate.sample_json || samplePresets.environmental);
      setMetricKeys(activeTemplate.metric_keys || []);
      setBindings(activeTemplate.bindings || []);
      if (activeTemplate.alarm_rules?.length) setAlarmRules(activeTemplate.alarm_rules);
      if (activeTemplate.transport_config) setTransportConfig(activeTemplate.transport_config);
      if (activeTemplate.rule_chain_id) setAssignedRuleChain(activeTemplate.rule_chain_id);
    }
  }, [activeTemplate?.id]);

  // Local recursive JSON flattener for offline or immediate fallback
  const buildMetricObj = (k, val) => {
    let type = "Metric";
    const lower = k.toLowerCase();
    const lastSeg = lower.split('.').pop();
    if (lower.includes("device") || lastSeg.endsWith("id") || lastSeg === "id") {
      type = "Device ID";
    } else if (lower.includes("timestamp") || lastSeg.includes("time") || lastSeg.includes("date") || lastSeg.endsWith("_ts") || lastSeg === "ts") {
      type = "Timestamp";
    }

    let dtype = "Text";
    if (typeof val === 'number') {
      dtype = Number.isInteger(val) ? 'Int' : 'Double';
    } else if (typeof val === 'boolean') {
      dtype = 'Bool';
    } else if (typeof val === 'string' && (lower.includes("timestamp") || lastSeg.includes("time") || lastSeg.includes("date") || lastSeg.endsWith("_ts") || lastSeg === "ts")) {
      dtype = 'Timestamp';
    }
    return {
      key: k,
      name: k,
      type,
      data_type: dtype,
      enable: true,
      expression: dtype === 'Double' ? 'Math.Round(value, 2)' : ''
    };
  };

  const flattenJsonToMetrics = (data, prefix = '') => {
    let keys = [];
    if (data && typeof data === 'object') {
      if (Array.isArray(data)) {
        if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
          keys = keys.concat(flattenJsonToMetrics(data[0], prefix ? `${prefix}[0]` : '[0]'));
        }
      } else {
        for (const [k, val] of Object.entries(data)) {
          const fullKey = prefix ? `${prefix}.${k}` : k;
          if (val && typeof val === 'object') {
            if (Array.isArray(val)) {
              if (val.length > 0 && typeof val[0] === 'object' && val[0] !== null) {
                keys = keys.concat(flattenJsonToMetrics(val[0], `${fullKey}[0]`));
              } else {
                keys.push(buildMetricObj(fullKey, val));
              }
            } else {
              keys = keys.concat(flattenJsonToMetrics(val, fullKey));
            }
          } else {
            keys.push(buildMetricObj(fullKey, val));
          }
        }
      }
    }
    return keys;
  };

  // Figure 4: Auto parse JSON format payload message
  const handleParseJsonPayload = async () => {
    try {
      const res = await fetch('/api/v1/dm/device-templates/parse-payload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ json_string: jsonInput })
      });
      if (res.ok) {
        const data = await res.json();
        setMetricKeys(data.metric_keys);
        showToast(`Successfully parsed JSON payload into ${data.count} metric keys (including nested paths)!`, 'success');
      } else {
        const parsed = JSON.parse(jsonInput);
        const keys = flattenJsonToMetrics(parsed);
        setMetricKeys(keys);
        showToast(`Parsed ${keys.length} metric keys (including nested paths)!`, 'success');
      }
    } catch (e) {
      showToast(`Invalid JSON: ${e.message}`, 'error');
    }
  };

  const handleSaveTemplateUpdates = async () => {
    if (!activeTemplate) return;
    setSaving(true);
    try {
      const updates = {
        template_name: activeTemplate.template_name,
        sample_json: jsonInput,
        metric_keys: metricKeys,
        bindings: bindings,
        transport_config: transportConfig,
        alarm_rules: alarmRules,
        rule_chain_id: assignedRuleChain
      };
      if (updateDeviceTemplate) {
        await updateDeviceTemplate(activeTemplate.id, updates);
      }
      setTemplates(prev => prev.map(t => {
        if (t.id === activeTemplate.id) {
          return {
            ...t,
            ...updates
          };
        }
        return t;
      }));
    } catch (err) {
      showToast(`Save error: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddAlarmRule = () => {
    if (!newAlarmType || !newAlarmCond) {
      showToast('Please specify Alarm Type and Condition expression', 'error');
      return;
    }
    const rule = {
      id: `ar-${Date.now()}`,
      alarm_type: newAlarmType,
      severity: newAlarmSeverity,
      condition: newAlarmCond,
      clear_condition: newAlarmClear,
      propagate: true
    };
    setAlarmRules([...alarmRules, rule]);
    setNewAlarmType('');
    setNewAlarmCond('');
    setNewAlarmClear('');
    showToast(`Added ThingsBoard Alarm Rule '${rule.alarm_type}'`, 'success');
  };

  return (
    <div className="dm-entity-container">
      <div className="dm-entity-header-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 className="dm-page-title">ThingsBoard Device Profiles & Templates (Section 9.6)</h2>
            <span style={{ fontSize: '0.65rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
              PROFILE & ALARM MATRIX
            </span>
          </div>
          <p className="dm-page-subtitle">
            Configure ThingsBoard device profile schemas: JSON metric parsing, transport protocols (OPC UA, MQTT, Modbus), and dynamic ISA-18.2 threshold alarm rules.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="dm-btn dm-btn-primary" onClick={() => setIsNewTemplateModalOpen(true)}>
            <Plus size={14} /> <span>New Device Profile</span>
          </button>
        </div>
      </div>

      <div className="dm-templates-grid">
        {/* Template Select List */}
        <div className="dm-templates-list-panel">
          <div className="dm-panel-subhead">Device Profiles ({templates.length})</div>
          {templates.length === 0 ? (
            <div style={{ padding: '24px 12px', textAlign: 'center', color: '#64748b', fontSize: '0.78rem' }}>
              No device templates created yet.
            </div>
          ) : (
            templates.map(t => (
              <div 
                key={t.id}
                className={`dm-template-card ${activeTemplate?.id === t.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedTemplateId(t.id);
                  setJsonInput(t.sample_json || '');
                  setMetricKeys(t.metric_keys || []);
                  setBindings(t.bindings || []);
                }}
              >
                <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#f8fafc' }}>{t.template_name}</h4>
                <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '4px' }}>
                  {t.metric_keys?.length || 0} metric keys &bull; {alarmRules.length} alarm rules
                </div>
              </div>
            ))
          )}
        </div>

        {/* Main Workbench Panel */}
        <div className="dm-template-detail-panel">
          {activeTemplate ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, color: '#f8fafc' }}>{activeTemplate.template_name}</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className="dm-btn dm-btn-secondary" 
                    style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                    onClick={async () => {
                      if (window.confirm(`Delete device profile '${activeTemplate.template_name}'?`)) {
                        if (deleteDeviceTemplate) {
                          await deleteDeviceTemplate(activeTemplate.id);
                        }
                        setTemplates(prev => prev.filter(t => t.id !== activeTemplate.id));
                        setSelectedTemplateId(null);
                      }
                    }}
                  >
                    <Trash2 size={13} /> Delete Profile
                  </button>
                  <button className="dm-btn dm-btn-primary" onClick={handleSaveTemplateUpdates} disabled={saving}>
                    <Check size={14} /> {saving ? 'Saving...' : 'Save Profile & Rules'}
                  </button>
                </div>
              </div>

              {/* Sub-tabs bar */}
              <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px', marginBottom: '14px' }}>
                {[
                  { id: 'json_parser', label: 'JSON Metric Keys (Fig 4)', icon: <Code size={13} /> },
                  { id: 'transport', label: 'Transport Configuration', icon: <Cpu size={13} /> },
                  { id: 'alarm_rules', label: 'ThingsBoard Alarm Rules', icon: <Shield size={13} /> },
                  { id: 'rule_chain', label: 'Rule Chain Routing', icon: <GitFork size={13} /> }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveDetailTab(tab.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '5px 12px',
                      borderRadius: '4px',
                      fontSize: '0.73rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: activeDetailTab === tab.id ? '#38bdf8' : 'transparent',
                      background: activeDetailTab === tab.id ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                      color: activeDetailTab === tab.id ? '#38bdf8' : '#94a3b8'
                    }}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* TAB 1: JSON PARSER & BINDINGS */}
              {activeDetailTab === 'json_parser' && (
                <>
                  <div className="dm-json-parser-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Code size={14} color="#38bdf8" />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc' }}>
                          JSON Payload Message (Section 9.6.1)
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button 
                          className="dm-btn dm-btn-secondary" 
                          style={{ fontSize: '0.68rem', padding: '2px 8px' }}
                          onClick={() => setJsonInput(samplePresets.environmental)}
                        >
                          Sample: Environmental
                        </button>
                        <button 
                          className="dm-btn dm-btn-secondary" 
                          style={{ fontSize: '0.68rem', padding: '2px 8px' }}
                          onClick={() => setJsonInput(samplePresets.centrifugal_pump)}
                        >
                          Sample: Pump Array
                        </button>
                        <button 
                          className="dm-btn dm-btn-secondary" 
                          style={{ fontSize: '0.68rem', padding: '2px 8px' }}
                          onClick={() => setJsonInput(samplePresets.column_analyzer)}
                        >
                          Sample: Gas Analyzer
                        </button>
                      </div>
                    </div>

                    <textarea 
                      rows={4}
                      className="dm-textarea mono"
                      value={jsonInput}
                      onChange={(e) => setJsonInput(e.target.value)}
                      placeholder="Paste JSON message payload here..."
                    />

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                      <button className="dm-btn dm-btn-primary" onClick={handleParseJsonPayload}>
                        <Play size={13} /> Auto-Parse JSON Payload Message
                      </button>
                    </div>
                  </div>

                  <div style={{ marginTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f8fafc' }}>
                        Parsed Metric Keys (Table 11)
                      </span>
                      <button 
                        className="dm-btn dm-btn-secondary" 
                        style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                        onClick={() => {
                          setMetricKeys(prev => [
                            ...prev,
                            { key: `custom_key_${prev.length + 1}`, name: `custom_key_${prev.length + 1}`, type: 'Metric', data_type: 'Double', enable: true, expression: '' }
                          ]);
                        }}
                      >
                        + Manually Add Metric Key
                      </button>
                    </div>

                    <div className="dm-table-scroll-container">
                      <table className="dm-data-table">
                        <thead>
                          <tr>
                            <th>JSON Key</th>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Data Type</th>
                            <th style={{ textAlign: 'center', width: '80px' }}>Enable</th>
                            <th>Expression / Formula</th>
                            <th style={{ textAlign: 'right', width: '60px' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {metricKeys.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="dm-empty-state">
                                No metric keys parsed yet. Paste JSON payload and click "Auto-Parse".
                              </td>
                            </tr>
                          ) : (
                            metricKeys.map((mk, idx) => (
                              <tr key={idx} className="dm-table-row">
                                <td className="mono" style={{ color: '#38bdf8' }}>{mk.key}</td>
                                <td>
                                  <input 
                                    type="text"
                                    className="dm-input"
                                    value={mk.name}
                                    onChange={(e) => {
                                      const updated = [...metricKeys];
                                      updated[idx].name = e.target.value;
                                      setMetricKeys(updated);
                                    }}
                                    style={{ padding: '3px 6px', fontSize: '0.74rem' }}
                                  />
                                </td>
                                <td>
                                  <select 
                                    className="dm-select"
                                    value={mk.type}
                                    onChange={(e) => {
                                      const updated = [...metricKeys];
                                      updated[idx].type = e.target.value;
                                      setMetricKeys(updated);
                                    }}
                                    style={{ padding: '3px 6px', fontSize: '0.74rem' }}
                                  >
                                    <option value="Device ID">Device ID</option>
                                    <option value="Timestamp">Timestamp</option>
                                    <option value="Metric">Metric</option>
                                  </select>
                                </td>
                                <td>
                                  <select 
                                    className="dm-select"
                                    value={mk.data_type}
                                    onChange={(e) => {
                                      const updated = [...metricKeys];
                                      updated[idx].data_type = e.target.value;
                                      setMetricKeys(updated);
                                    }}
                                    style={{ padding: '3px 6px', fontSize: '0.74rem' }}
                                  >
                                    <option value="Double">Double</option>
                                    <option value="Int">Int</option>
                                    <option value="Timestamp">Timestamp</option>
                                    <option value="Bool">Bool</option>
                                    <option value="Text">Text</option>
                                  </select>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <input 
                                    type="checkbox"
                                    checked={mk.enable}
                                    onChange={(e) => {
                                      const updated = [...metricKeys];
                                      updated[idx].enable = e.target.checked;
                                      setMetricKeys(updated);
                                    }}
                                  />
                                </td>
                                <td>
                                  <input 
                                    type="text"
                                    className="dm-input mono"
                                    placeholder="e.g. Math.Round(value, 2)"
                                    value={mk.expression || ''}
                                    onChange={(e) => {
                                      const updated = [...metricKeys];
                                      updated[idx].expression = e.target.value;
                                      setMetricKeys(updated);
                                    }}
                                    style={{ padding: '3px 6px', fontSize: '0.72rem', color: '#a855f7' }}
                                  />
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <button 
                                    className="dm-row-action-btn delete"
                                    onClick={() => setMetricKeys(metricKeys.filter((_, i) => i !== idx))}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div style={{ marginTop: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f8fafc' }}>
                        Cloud-to-Device Binding Settings (Section 9.6.2, Table 12)
                      </span>
                      <button 
                        className="dm-btn dm-btn-secondary" 
                        style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                        onClick={() => {
                          setBindings(prev => [
                            ...prev,
                            { key: `cmd_${prev.length + 1}`, data_type: 'Double', default_value: '0' }
                          ]);
                        }}
                      >
                        + Add Binding Item
                      </button>
                    </div>

                    <table className="dm-data-table">
                      <thead>
                        <tr>
                          <th>Key</th>
                          <th>Data Type</th>
                          <th>Default Value</th>
                          <th style={{ textAlign: 'right', width: '60px' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bindings.map((b, idx) => (
                          <tr key={idx} className="dm-table-row">
                            <td className="mono" style={{ color: '#f59e0b' }}>{b.key}</td>
                            <td>{b.data_type}</td>
                            <td className="mono">{b.default_value}</td>
                            <td style={{ textAlign: 'right' }}>
                              <button 
                                className="dm-row-action-btn delete"
                                onClick={() => setBindings(bindings.filter((_, i) => i !== idx))}
                              >
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* TAB 2: TRANSPORT CONFIGURATION */}
              {activeDetailTab === 'transport' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ background: '#070a11', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <label className="dm-field-label">Default Transport Protocol for this Profile</label>
                    <select
                      className="dm-select"
                      value={transportConfig.transport_type}
                      onChange={(e) => setTransportConfig({ ...transportConfig, transport_type: e.target.value })}
                    >
                      <option value="OPC_UA">OPC UA (IEC 62541 Binary TCP / Port 4840)</option>
                      <option value="MQTT">MQTT (M2M Queuing / Port 1883/8883)</option>
                      <option value="Modbus TCP">Modbus TCP (Industrial PLC Bus / Port 502)</option>
                      <option value="CoAP">CoAP (Constrained Wireless / Port 5683)</option>
                    </select>
                  </div>

                  {transportConfig.transport_type === 'OPC_UA' && (
                    <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', padding: '14px' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#10b981', marginBottom: '10px' }}>
                        OPC UA Protocol Profile Settings
                      </div>
                      <div className="dm-form-grid-2">
                        <div className="dm-form-group">
                          <label className="dm-field-label">OPC UA Endpoint URL</label>
                          <input
                            type="text"
                            className="dm-input mono"
                            value={transportConfig.endpoint_url}
                            onChange={(e) => setTransportConfig({ ...transportConfig, endpoint_url: e.target.value })}
                          />
                        </div>
                        <div className="dm-form-group">
                          <label className="dm-field-label">Security Policy</label>
                          <select
                            className="dm-select"
                            value={transportConfig.security_policy}
                            onChange={(e) => setTransportConfig({ ...transportConfig, security_policy: e.target.value })}
                          >
                            <option value="Basic256Sha256">Basic256Sha256 (High Security)</option>
                            <option value="Basic256">Basic256</option>
                            <option value="None">None</option>
                          </select>
                        </div>
                        <div className="dm-form-group">
                          <label className="dm-field-label">Security Mode</label>
                          <select
                            className="dm-select"
                            value={transportConfig.security_mode}
                            onChange={(e) => setTransportConfig({ ...transportConfig, security_mode: e.target.value })}
                          >
                            <option value="SignAndEncrypt">SignAndEncrypt</option>
                            <option value="Sign">Sign</option>
                            <option value="None">None</option>
                          </select>
                        </div>
                        <div className="dm-form-group">
                          <label className="dm-field-label">Scan Frequency (ms)</label>
                          <input
                            type="number"
                            className="dm-input mono"
                            value={transportConfig.scan_period_ms}
                            onChange={(e) => setTransportConfig({ ...transportConfig, scan_period_ms: Number(e.target.value) })}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {transportConfig.transport_type === 'MQTT' && (
                    <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '8px', padding: '14px' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#38bdf8', marginBottom: '10px' }}>
                        MQTT Transport Profile Settings
                      </div>
                      <div className="dm-form-group">
                        <label className="dm-field-label">Telemetry Ingest Topic</label>
                        <input
                          type="text"
                          className="dm-input mono"
                          value={transportConfig.mqtt_topic}
                          onChange={(e) => setTransportConfig({ ...transportConfig, mqtt_topic: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: THINGSBOARD ALARM RULES STUDIO */}
              {activeDetailTab === 'alarm_rules' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc' }}>
                      Dynamic ISA-18.2 Alarm Rules ({alarmRules.length})
                    </span>
                  </div>

                  <div className="dm-table-scroll-container">
                    <table className="dm-data-table">
                      <thead>
                        <tr>
                          <th>Alarm Type</th>
                          <th>Severity</th>
                          <th>Create Condition Expression</th>
                          <th>Clear Condition Expression</th>
                          <th style={{ textAlign: 'right', width: '60px' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {alarmRules.map(ar => (
                          <tr key={ar.id} className="dm-table-row">
                            <td style={{ fontWeight: 600, color: '#f8fafc' }}>{ar.alarm_type}</td>
                            <td>
                              <span style={{
                                fontSize: '0.62rem',
                                padding: '2px 7px',
                                borderRadius: '4px',
                                fontWeight: 700,
                                background: ar.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.2)' :
                                            ar.severity === 'HIGH' ? 'rgba(249, 115, 22, 0.2)' :
                                            ar.severity === 'WARNING' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                                color: ar.severity === 'CRITICAL' ? '#ef4444' :
                                       ar.severity === 'HIGH' ? '#f97316' :
                                       ar.severity === 'WARNING' ? '#f59e0b' : '#38bdf8'
                              }}>
                                {ar.severity}
                              </span>
                            </td>
                            <td className="mono" style={{ color: '#ef4444' }}>{ar.condition}</td>
                            <td className="mono" style={{ color: '#10b981' }}>{ar.clear_condition || 'Manual Clear'}</td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                className="dm-row-action-btn delete"
                                onClick={() => setAlarmRules(alarmRules.filter(r => r.id !== ar.id))}
                              >
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Add Alarm Rule Inline Form */}
                  <div style={{ background: '#070a11', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '14px' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '10px' }}>
                      Add New ThingsBoard Alarm Rule
                    </div>
                    <div className="dm-form-grid-2">
                      <div className="dm-form-group">
                        <label className="dm-field-label">Alarm Type / Title</label>
                        <input
                          type="text"
                          className="dm-input"
                          placeholder="e.g. Overhead Column High Pressure Trip"
                          value={newAlarmType}
                          onChange={(e) => setNewAlarmType(e.target.value)}
                        />
                      </div>
                      <div className="dm-form-group">
                        <label className="dm-field-label">Alarm Severity</label>
                        <select
                          className="dm-select"
                          value={newAlarmSeverity}
                          onChange={(e) => setNewAlarmSeverity(e.target.value)}
                        >
                          <option value="CRITICAL">CRITICAL</option>
                          <option value="HIGH">HIGH</option>
                          <option value="WARNING">WARNING</option>
                          <option value="MINOR">MINOR</option>
                        </select>
                      </div>
                      <div className="dm-form-group">
                        <label className="dm-field-label">Trigger Condition Expression</label>
                        <input
                          type="text"
                          className="dm-input mono"
                          placeholder="e.g. pressure > 280.0"
                          value={newAlarmCond}
                          onChange={(e) => setNewAlarmCond(e.target.value)}
                        />
                      </div>
                      <div className="dm-form-group">
                        <label className="dm-field-label">Auto-Clear Condition Expression</label>
                        <input
                          type="text"
                          className="dm-input mono"
                          placeholder="e.g. pressure < 240.0"
                          value={newAlarmClear}
                          onChange={(e) => setNewAlarmClear(e.target.value)}
                        />
                      </div>
                    </div>
                    <button
                      className="dm-btn dm-btn-primary"
                      style={{ marginTop: '10px' }}
                      onClick={handleAddAlarmRule}
                    >
                      <Plus size={13} /> Add Alarm Rule to Profile
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 4: RULE CHAIN ROUTING */}
              {activeDetailTab === 'rule_chain' && (
                <div style={{ background: '#070a11', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
                    Default Rule Chain Routing
                  </div>
                  <p style={{ fontSize: '0.74rem', color: '#94a3b8', marginBottom: '14px' }}>
                    All telemetry, attributes, and events reported by devices assigned to this profile will enter this root rule chain.
                  </p>

                  <div className="dm-form-group">
                    <label className="dm-field-label">Assigned Rule Chain</label>
                    <select
                      className="dm-select"
                      value={assignedRuleChain}
                      onChange={(e) => setAssignedRuleChain(e.target.value)}
                    >
                      <option value="rc-root-01">Root Industrial Telemetry Pipeline (Default)</option>
                      <option value="rc-nodered-02">Node-RED & n8n Automation Bridge</option>
                    </select>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
              <Cpu size={36} style={{ margin: '0 auto 12px', opacity: 0.3, color: '#38bdf8' }} />
              <h4 style={{ color: '#f8fafc', fontSize: '1rem', marginBottom: '6px' }}>No Device Templates</h4>
              <p style={{ fontSize: '0.8rem', maxWidth: '400px', margin: '0 auto 16px' }}>
                Create your first device template profile to specify expected JSON telemetry keys, transport protocols, and alarm thresholds.
              </p>
              <button className="dm-btn dm-btn-primary" onClick={() => setIsNewTemplateModalOpen(true)}>
                <Plus size={14} /> Create Device Template
              </button>
            </div>
          )}
        </div>
      </div>

      {/* CREATE NEW TEMPLATE MODAL */}
      {isNewTemplateModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1400 }}>
          <div className="dm-modal-box" style={{ width: '450px' }}>
            <div className="dm-modal-header">
              <h3>Create Device Template</h3>
              <button onClick={() => setIsNewTemplateModalOpen(false)} className="dm-close-btn">&times;</button>
            </div>
            <div className="dm-modal-body">
              <div className="dm-form-group">
                <label className="dm-field-label">Template Name</label>
                <input 
                  type="text"
                  className="dm-input"
                  placeholder="e.g. DT-Gas Turbine Multi-Signal Hub"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                />
              </div>
            </div>
            <div className="dm-modal-footer">
              <button className="dm-btn dm-btn-secondary" onClick={() => setIsNewTemplateModalOpen(false)}>Cancel</button>
              <button 
                className="dm-btn dm-btn-primary"
                onClick={async () => {
                  if (!newTemplateName) return;
                  const newT = {
                    id: `dt-${Date.now().toString(36)}`,
                    template_name: newTemplateName,
                    sample_json: samplePresets.environmental,
                    metric_keys: [],
                    bindings: [],
                    transport_config: transportConfig,
                    alarm_rules: [],
                    rule_chain_id: assignedRuleChain
                  };
                  if (createDeviceTemplate) {
                    await createDeviceTemplate(newT);
                  }
                  setTemplates(prev => [...prev.filter(t => t.id !== newT.id), newT]);
                  setSelectedTemplateId(newT.id);
                  setJsonInput(newT.sample_json);
                  setMetricKeys([]);
                  setIsNewTemplateModalOpen(false);
                  setNewTemplateName('');
                }}
              >
                Create Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
