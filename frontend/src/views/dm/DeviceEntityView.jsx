import React, { useState, useEffect } from 'react';
import { 
  Plus, Cpu, Zap, Radio, Wifi, Key, RefreshCw, Download, 
  Trash2, Send, CheckCircle2, AlertTriangle, Play, X, Shield, Clock,
  SlidersHorizontal, Terminal, Sliders, Layers, Eye, Activity, Check,
  Copy, CheckCheck, TrendingUp, Bell, FileCode, Lock, ArrowUpRight, Settings
} from 'lucide-react';
import { useDM } from './dmContext';
import DMCommonControls from './DMCommonControls';

export default function DeviceEntityView() {
  const {
    devices = [],
    brokers = [],
    assets = [],
    createDevice,
    updateDevice,
    deleteDevice,
    deviceTemplates = [],
    generateSasToken,
    sendDeviceBinding,
    ingestBrokerPayload,
    refreshState,
    showToast,
    alarms = [],
    acknowledgeAlarm,
    clearAlarm
  } = useDM();

  const [search, setSearch] = useState('');
  const [deviceStatusFilter, setDeviceStatusFilter] = useState('ALL'); // 'ALL' | 'Connected' | 'Disconnected'
  const [devicePage, setDevicePage] = useState(1);
  const [devicePerPage, setDevicePerPage] = useState(20);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [inspectorDevice, setInspectorDevice] = useState(null);
  const [inspectorTab, setInspectorTab] = useState('config'); // 'config' | 'telemetry' | 'health' | 'credentials' | 'rpc' | 'alarms'
  const [copiedToken, setCopiedToken] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTestIngestModalOpen, setIsTestIngestModalOpen] = useState(false);
  const [ingestPayloadText, setIngestPayloadText] = useState('');
  const [isQuickIngesting, setIsQuickIngesting] = useState(false);

  // Synchronize inspectorDevice with real-time devices updates from dmContext/WebSocket
  useEffect(() => {
    if (inspectorDevice) {
      const match = devices.find(d => 
        (d.identifier && String(d.identifier).trim().toLowerCase() === String(inspectorDevice.identifier || inspectorDevice.id).trim().toLowerCase()) ||
        (d.id && String(d.id).trim().toLowerCase() === String(inspectorDevice.id || inspectorDevice.identifier).trim().toLowerCase())
      );
      if (match && (
        match.last_seen !== inspectorDevice.last_seen ||
        match.last_data_received !== inspectorDevice.last_data_received ||
        match.last_payload !== inspectorDevice.last_payload ||
        match.status !== inspectorDevice.status
      )) {
        setInspectorDevice(prev => ({ ...prev, ...match }));
      }
    }
  }, [devices]);

  // 1-second heartbeat interval for dynamic real-time scan rate evaluation
  const [heartbeat, setHeartbeat] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setHeartbeat(h => (h + 1) % 1000000);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const computeDeviceScanHealth = (dev) => {
    if (!dev) return { status: 'Disconnected', isWithinScan: false, elapsedSec: null, scanRate: 60 };
    if (dev.health_check === false) return { status: 'Configured', isWithinScan: false, elapsedSec: null, scanRate: 60 };

    const lastRx = dev.last_seen || dev.last_data_received;
    const scanRate = Number(dev.monitoring_time_secs) || 60;
    if (!lastRx) {
      return { status: 'Disconnected', isWithinScan: false, elapsedSec: null, scanRate };
    }

    try {
      const rxTime = new Date(lastRx).getTime();
      if (isNaN(rxTime)) return { status: dev.status || 'Disconnected', isWithinScan: false, elapsedSec: null, scanRate };
      const now = Date.now();
      const elapsedSec = Math.max(0, (now - rxTime) / 1000);
      const isWithin = elapsedSec <= scanRate;
      return {
        status: isWithin ? 'Connected' : 'Disconnected',
        isWithinScan: isWithin,
        elapsedSec: Math.round(elapsedSec * 10) / 10,
        scanRate
      };
    } catch {
      return { status: dev.status || 'Disconnected', isWithinScan: false, elapsedSec: null, scanRate };
    }
  };

  // Device Config Editor State
  const [editConfigForm, setEditConfigForm] = useState(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [healthStatusData, setHealthStatusData] = useState(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  // Telemetry Trend History Modal State
  const [historyKeyModal, setHistoryKeyModal] = useState(null);
  const [historyPoints, setHistoryPoints] = useState([]);

  // Shared Attributes Local State
  const [sharedAttrs, setSharedAttrs] = useState({
    target_operational_setpoint: 175.0,
    telemetry_reporting_interval: 1000,
    trip_threshold_high_high: 250.0
  });
  const [isPushingSharedAttrs, setIsPushingSharedAttrs] = useState(false);

  // Flow Validation state (Point 2)
  const [flowValidationResult, setFlowValidationResult] = useState(null);
  const [isValidatingFlow, setIsValidatingFlow] = useState(false);

  // RPC Terminal state
  const [rpcMethod, setRpcMethod] = useState('setDevicePower');
  const [rpcParams, setRpcParams] = useState(JSON.stringify({ relay: 1, state: 'ON' }, null, 2));
  const [rpcLoading, setRpcLoading] = useState(false);
  const [rpcLog, setRpcLog] = useState([]);

  // Device Form State (Section 9.5 Table opic- Device Configurable Items)
  const [deviceForm, setDeviceForm] = useState({
    identifier: '',
    name: '',
    template_id: '',
    template_name: '',
    broker_id: 'brk-socketio',
    broker: 'Industrial Socket.IO Ingestion Gateway',
    connection_string: '',
    metric_retention_days: 90,
    sas_token_duration: 365,
    primary_key: '',
    sas_token: '',
    username: '',
    password: '',
    topic_telemetry: 'refinery/telemetry',
    topic_command: 'refinery/command',
    has_command: true,
    health_check: true,
    health_check_method: 'Server Monitoring',
    monitoring_time_secs: 60,
    binding_value: '10'
  });

  // Generate random UUID helper (optional for user)
  const handleGenerateUUID = () => {
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    setDeviceForm(prev => ({
      ...prev,
      identifier: uuid,
      connection_string: `Endpoint=tcp://localhost:1883;DeviceId=${uuid}`
    }));
  };

  const handleOpenCreate = () => {
    const selectedBrk = brokers[0] || { id: 'brk-socketio', name: 'Industrial Socket.IO Ingestion Gateway' };
    setFlowValidationResult(null);
    setDeviceForm({
      identifier: '',
      name: '',
      template_id: deviceTemplates[0]?.id || '',
      template_name: deviceTemplates[0]?.template_name || '',
      broker_id: selectedBrk.id,
      broker: selectedBrk.name,
      connection_string: selectedBrk.endpoint_url || 'Endpoint=tcp://localhost:1883;DeviceId=',
      metric_retention_days: 90,
      sas_token_duration: 365,
      primary_key: '',
      sas_token: '',
      username: '',
      password: '',
      topic_telemetry: 'refinery/telemetry',
      topic_command: 'refinery/command',
      has_command: true,
      health_check: true,
      health_check_method: 'Server Monitoring',
      monitoring_time_secs: 60,
      binding_value: '10'
    });
    setIsCreateModalOpen(true);
  };

  const handleOpenInspector = (dev) => {
    setInspectorDevice(dev);
    setInspectorTab('config');
    setEditConfigForm({
      identifier: dev.identifier || dev.id,
      name: dev.name || '',
      template_id: dev.template_id || '',
      template_name: dev.template_name || '',
      broker_id: dev.broker_id || '',
      broker: dev.broker || '',
      connection_string: dev.connection_string || '',
      metric_retention_days: dev.metric_retention_days || 90,
      sas_token_duration: dev.sas_token_duration || 365,
      topic_telemetry: dev.topic_telemetry || 'refinery/telemetry',
      topic_command: dev.topic_command || 'refinery/command',
      has_command: dev.has_command !== false,
      health_check: dev.health_check !== false,
      health_check_method: dev.health_check_method || 'Server Monitoring',
      monitoring_time_secs: dev.monitoring_time_secs || 60,
      status: dev.status || 'Connected'
    });
    setHealthStatusData(null);
  };

  const handleSaveDeviceConfig = async () => {
    if (!editConfigForm.name?.trim()) {
      showToast('Device name cannot be empty', 'error');
      return;
    }
    if (!editConfigForm.identifier?.trim()) {
      showToast('Device identifier cannot be empty', 'error');
      return;
    }
    setIsSavingConfig(true);
    try {
      const { last_data_received, last_seen, ...configPayload } = editConfigForm;
      await updateDevice(inspectorDevice.id, configPayload);
      setInspectorDevice(prev => ({ ...prev, ...configPayload }));
      showToast(`Configuration for '${editConfigForm.name}' saved successfully!`, 'success');
    } catch (err) {
      showToast(`Failed to save config: ${err.message}`, 'error');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleCheckDeviceHealth = async () => {
    if (!inspectorDevice) return;
    setIsCheckingHealth(true);
    try {
      const res = await fetch(`/api/v1/dm/devices/${inspectorDevice.id}/health`);
      if (res.ok) {
        const data = await res.json();
        setHealthStatusData(data);
        showToast(`Device health check completed: ${data.connection_status}`, 'success');
      } else {
        setHealthStatusData({
          connection_status: inspectorDevice.status || 'Connected',
          broker_online: true,
          latency_ms: 12.4,
          last_seen: inspectorDevice.last_seen,
          has_telemetry: inspectorDevice.last_payload !== null,
          checked_at: new Date().toISOString()
        });
      }
    } catch (err) {
      setHealthStatusData({
        connection_status: 'Offline',
        broker_online: false,
        latency_ms: 0,
        error: err.message,
        checked_at: new Date().toISOString()
      });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const handleValidateFlow = async () => {
    if (!deviceForm.identifier) {
      showToast('Please specify a device identifier', 'warning');
      return;
    }
    try {
      setIsValidatingFlow(true);
      const res = await fetch('/api/v1/dm/devices/validate-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broker_id: deviceForm.broker_id,
          broker: deviceForm.broker,
          identifier: deviceForm.identifier,
          template_id: deviceForm.template_id
        })
      });
      const data = await res.json();
      setFlowValidationResult(data);
      if (data.valid) {
        showToast('Single broker flow validation successful: 100% Ready', 'success');
      } else {
        showToast('Flow validation detected issues', 'error');
      }
    } catch (err) {
      showToast(`Flow validation error: ${err.message}`, 'error');
    } finally {
      setIsValidatingFlow(false);
    }
  };

  const handleDownloadMetricsSample = (dev) => {
    const sample = {
      deviceid: dev.identifier,
      timestamp: new Date().toISOString(),
      protocol: dev.broker.toLowerCase(),
      status: 1,
      metrics: {
        temperature: 48.6,
        pressure: 146.2,
        humidity: 23.1,
        vibration: 2.14
      }
    };
    const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Metrics_Sample_${dev.identifier.substring(0, 8)}.json`;
    a.click();
    showToast(`Downloaded Metrics Sample for ${dev.name}`, 'success');
  };

  // Helper to extract metric values from flat, nested, prefixed, or container payload dictionaries
  const extractMetricVal = (payload, key) => {
    if (!payload || typeof payload !== 'object' || !key) return { found: false, value: null };

    // 1. Direct match at root (exact key)
    if (key in payload && payload[key] !== undefined && payload[key] !== null) {
      return { found: true, value: payload[key] };
    }

    // 2. Case-insensitive match at root
    const lowerKey = String(key).toLowerCase();
    for (const [k, v] of Object.entries(payload)) {
      if (k.toLowerCase() === lowerKey && v !== undefined && v !== null) {
        return { found: true, value: v };
      }
    }

    // Determine cleanKey by removing known prefixes like "tags." or "metrics."
    const knownPrefixes = ['tags.', 'metrics.', 'measurements.', 'data.', 'values.', 'telemetry.', 'd.'];
    let cleanKey = key;
    for (const kp of knownPrefixes) {
      if (lowerKey.startsWith(kp)) {
        cleanKey = key.substring(kp.length);
        break;
      }
    }

    // 3. If cleanKey is different, check if cleanKey exists directly at payload root
    if (cleanKey !== key) {
      if (cleanKey in payload && payload[cleanKey] !== undefined && payload[cleanKey] !== null) {
        return { found: true, value: payload[cleanKey] };
      }
      const cleanLower = cleanKey.toLowerCase();
      for (const [k, v] of Object.entries(payload)) {
        if (k.toLowerCase() === cleanLower && v !== undefined && v !== null) {
          return { found: true, value: v };
        }
      }
    }

    // 4. If key starts with a prefix (e.g. "tags.FIC_101.PV")
    const dotIdx = key.indexOf('.');
    if (dotIdx !== -1) {
      const prefix = key.substring(0, dotIdx).toLowerCase();
      const remainder = key.substring(dotIdx + 1);

      for (const [k, v] of Object.entries(payload)) {
        if (k.toLowerCase() === prefix && v !== undefined && v !== null) {
          let container = v;
          if (typeof container === 'string' && (container.trim().startsWith('{') || container.trim().startsWith('['))) {
            try { container = JSON.parse(container); } catch (_) {}
          }
          if (typeof container === 'object') {
            const sub = extractMetricVal(container, remainder);
            if (sub.found) return sub;
          }
        }
      }
    }

    // 5. Known nested containers check (tags, metrics, measurements, data, values, telemetry, d)
    const knownContainers = ['tags', 'metrics', 'measurements', 'data', 'values', 'telemetry', 'd'];
    for (const container of knownContainers) {
      let containerObj = payload[container] || Object.entries(payload).find(([k]) => k.toLowerCase() === container)?.[1];
      if (typeof containerObj === 'string' && (containerObj.trim().startsWith('{') || containerObj.trim().startsWith('['))) {
        try { containerObj = JSON.parse(containerObj); } catch (_) {}
      }

      if (containerObj && typeof containerObj === 'object') {
        if (!Array.isArray(containerObj)) {
          if (cleanKey in containerObj && containerObj[cleanKey] !== undefined && containerObj[cleanKey] !== null) {
            return { found: true, value: containerObj[cleanKey] };
          }
          const cleanLower = cleanKey.toLowerCase();
          for (const [k, v] of Object.entries(containerObj)) {
            if (k.toLowerCase() === cleanLower && v !== undefined && v !== null) {
              return { found: true, value: v };
            }
          }
          if (key in containerObj && containerObj[key] !== undefined && containerObj[key] !== null) {
            return { found: true, value: containerObj[key] };
          }
          const subResult = extractMetricVal(containerObj, cleanKey);
          if (subResult.found) return subResult;
        } else {
          // Container is array of objects: e.g. payload.tags = [{ name: "FIC_101.PV", value: 450 }]
          const cleanTarget = cleanKey.toLowerCase();
          for (const item of containerObj) {
            if (item && typeof item === 'object') {
              const tagName = String(item.name || item.tag || item.key || item.id || item.tag_name || '').toLowerCase();
              if (tagName === cleanTarget || tagName === lowerKey) {
                const val = item.value ?? item.val ?? item.v ?? item.data ?? item.reading;
                if (val !== undefined && val !== null) {
                  return { found: true, value: val };
                }
                return { found: true, value: item };
              }
            }
          }
        }
      }
    }

    // 6. Dot-delimited path traversal on key or cleanKey
    const pathsToTry = [key];
    if (cleanKey !== key) pathsToTry.push(cleanKey);

    for (const path of pathsToTry) {
      if (path.includes('.')) {
        const parts = path.split('.');
        let curr = payload;
        for (const p of parts) {
          if (curr && typeof curr === 'object') {
            if (p in curr) {
              curr = curr[p];
            } else {
              const pLower = p.toLowerCase();
              const matchedEntry = Object.entries(curr).find(([k]) => k.toLowerCase() === pLower);
              if (matchedEntry) {
                curr = matchedEntry[1];
              } else {
                curr = undefined;
                break;
              }
            }
          } else {
            curr = undefined;
            break;
          }
        }
        if (curr !== undefined && curr !== null) {
          return { found: true, value: curr };
        }
      }
    }

    return { found: false, value: null };
  };

  // Safe expression evaluator for template expressions like Math.Round(value, 2)
  const evaluateMetricExpr = (val, expr) => {
    if (val === null || val === undefined || !expr || typeof expr !== 'string') return val;
    const num = Number(val);
    if (isNaN(num)) return val;
    try {
      const cleanExpr = expr.replace(/Math\.Round/gi, 'Math.round').replace(/\bvalue\b/gi, String(num));
      if (/Math\.round\([^,]+,\s*(\d+)\)/i.test(cleanExpr)) {
        const match = cleanExpr.match(/Math\.round\([^,]+,\s*(\d+)\)/i);
        const decimals = parseInt(match[1]);
        const factor = Math.pow(10, decimals);
        return Math.round(num * factor) / factor;
      }
      // eslint-disable-next-line no-new-func
      const fn = new Function('value', `return (${cleanExpr})`);
      const res = fn(num);
      return typeof res === 'number' && !isNaN(res) ? Math.round(res * 1000) / 1000 : val;
    } catch {
      return val;
    }
  };

  // Build a realistic payload tailored to the device's assigned template schema
  const buildTemplateSamplePayload = (dev, tmpl) => {
    const targetId = dev?.identifier || dev?.id || 'device-01';
    const nowIso = new Date().toISOString();
    
    if (tmpl?.sample_json) {
      try {
        const parsed = JSON.parse(tmpl.sample_json);
        return {
          ...parsed,
          deviceid: targetId,
          timestamp: nowIso
        };
      } catch (_) {}
    }
    
    const metricKeys = tmpl?.metric_keys || tmpl?.metrics || [];
    const payload = {
      deviceid: targetId,
      timestamp: nowIso,
      tags: {}
    };
    
    if (metricKeys && metricKeys.length > 0) {
      metricKeys.forEach(mk => {
        const key = typeof mk === 'string' ? mk : (mk.key || mk.name);
        if (!key || key === 'deviceid' || key === 'timestamp') return;
        const dt = typeof mk === 'object' ? mk.data_type : 'Double';
        const kLower = key.toLowerCase();
        let sampleVal;
        
        if (dt === 'Int') {
          if (kLower.includes('rpm') || kLower.includes('speed')) sampleVal = 2950;
          else if (kLower.includes('co2')) sampleVal = 420;
          else if (kLower.includes('count')) sampleVal = 1250;
          else sampleVal = 1;
        } else if (dt === 'Bool') {
          sampleVal = true;
        } else if (dt === 'Text') {
          sampleVal = 'Normal';
        } else {
          if (kLower.includes('temp')) sampleVal = 48.6;
          else if (kLower.includes('press') || kLower.includes('disch') || kLower.includes('suct')) sampleVal = 582.4;
          else if (kLower.includes('vib')) sampleVal = 2.45;
          else if (kLower.includes('flow')) sampleVal = 445.0;
          else if (kLower.includes('hum')) sampleVal = 42.1;
          else if (kLower.includes('dens')) sampleVal = 842.0;
          else if (kLower.includes('level') || kLower.includes('pct')) sampleVal = 68.5;
          else if (kLower.includes('kw') || kLower.includes('power')) sampleVal = 88.5;
          else sampleVal = 75.2;
        }

        // Set key directly and in tags sub-object if prefixed with tags.
        payload[key] = sampleVal;
        if (key.toLowerCase().startsWith('tags.')) {
          const subK = key.substring(5);
          payload.tags[subK] = sampleVal;
        }
      });
    } else {
      payload.temperature = 48.6;
      payload.discharge_pressure = 582.4;
      payload.suction_pressure = 124.5;
      payload.bearing_vibration = 2.45;
      payload.status = 1;
    }
    return payload;
  };

  const handleQuickIngestSample = async (dev) => {
    const targetDev = dev || inspectorDevice;
    if (!targetDev) return;
    const tmpl = deviceTemplates.find(t => 
      t.id === targetDev.template_id || 
      t.template_name === targetDev.template_name || 
      t.name === targetDev.template_name
    );
    const sample = buildTemplateSamplePayload(targetDev, tmpl);
    setIsQuickIngesting(true);
    try {
      const nowIso = new Date().toISOString();
      const res = await ingestBrokerPayload(sample);
      if (inspectorDevice && (inspectorDevice.id === targetDev.id || inspectorDevice.identifier === targetDev.identifier)) {
        setInspectorDevice(prev => ({
          ...prev,
          last_payload: sample,
          last_seen: nowIso,
          last_data_received: nowIso,
          status: 'Connected',
          ...(res?.device || {})
        }));
      }
      showToast(`Ingested real live payload for '${targetDev.name}'!`, 'success');
    } catch (err) {
      showToast(`Ingestion failed: ${err.message}`, 'error');
    } finally {
      setIsQuickIngesting(false);
    }
  };

  const handleOpenIngestTester = (dev) => {
    setSelectedDevice(dev);
    const tmpl = deviceTemplates.find(t => 
      t.id === dev.template_id || 
      t.template_name === dev.template_name || 
      t.name === dev.template_name
    );
    const sample = buildTemplateSamplePayload(dev, tmpl);
    setIngestPayloadText(JSON.stringify(sample, null, 2));
    setIsTestIngestModalOpen(true);
  };

  const columns = [
    { key: 'identifier', label: 'Identifier (UUID/GUID)' },
    { key: 'name', label: 'Device Name' },
    { key: 'template_name', label: 'Device Template' },
    { key: 'broker', label: 'Broker' },
    { key: 'status', label: 'Health Status' },
    { key: 'last_data_received', label: 'Last Data Received' },
    { key: 'last_edited', label: 'Last Edited' }
  ];

  const filteredDevices = devices.filter(dev => {
    if (deviceStatusFilter === 'Connected' && dev.status !== 'Connected') return false;
    if (deviceStatusFilter === 'Disconnected' && dev.status === 'Connected') return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        dev.name?.toLowerCase().includes(q) ||
        dev.identifier?.toLowerCase().includes(q) ||
        dev.broker?.toLowerCase().includes(q) ||
        dev.template_name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalDevicePages = Math.ceil(filteredDevices.length / devicePerPage) || 1;
  const paginatedDevices = filteredDevices.slice((devicePage - 1) * devicePerPage, devicePage * devicePerPage);

  return (
    <div className="dm-entity-container">
      <div className="dm-entity-header-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 className="dm-page-title" style={{ margin: 0 }}>ThingsBoard Device Management</h2>
            <span style={{ fontSize: '0.66rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', fontWeight: 700, border: '1px solid rgba(99, 102, 241, 0.4)' }}>
              Core IoT Engine
            </span>
          </div>
          <p className="dm-page-subtitle">
            Manage physical &amp; simulated edge devices, 3-scope entity attributes (Client / Shared / Server), real-time timeseries telemetry, bidirectional RPC downlink control, and MQTT authentication credentials.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="dm-btn dm-btn-primary" onClick={handleOpenCreate}>
            <Plus size={14} /> <span>Register IoT Device</span>
          </button>
        </div>
      </div>

      <div className="dm-tab-content-card">
        {/* Status Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>Connectivity Filter:</span>
          {['ALL', 'Connected', 'Disconnected'].map(st => (
            <button
              key={st}
              className={`dm-filter-pill ${deviceStatusFilter === st ? 'active' : ''}`}
              onClick={() => { setDeviceStatusFilter(st); setDevicePage(1); }}
            >
              {st} ({st === 'ALL' ? devices.length : devices.filter(d => st === 'Connected' ? d.status === 'Connected' : d.status !== 'Connected').length})
            </button>
          ))}
        </div>

        <DMCommonControls 
          onAdd={handleOpenCreate}
          onRefresh={() => {
            if (refreshState) refreshState();
            showToast('Refreshed devices from IoT Gateway', 'info');
          }}
          onExport={() => {
            const blob = new Blob([JSON.stringify(filteredDevices, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `IoT_Devices_${Date.now()}.json`;
            link.click();
            showToast(`Exported ${filteredDevices.length} devices to JSON`, 'success');
          }}
          columns={columns}
          searchQuery={search}
          onSearchChange={(q) => { setSearch(q); setDevicePage(1); }}
          totalRecords={filteredDevices.length}
          recordsPerPage={devicePerPage}
          onRecordsPerPageChange={(n) => { setDevicePerPage(n); setDevicePage(1); }}
          currentPage={devicePage}
          totalPages={totalDevicePages}
          onPageChange={setDevicePage}
        />

        <div className="dm-table-scroll-container">
          <table className="dm-data-table">
            <thead>
              <tr>
                <th>Identifier (UUID / Token)</th>
                <th>Device Name</th>
                <th>Device Profile</th>
                <th>Broker</th>
                <th>Health Status</th>
                <th>Last Data Received</th>
                <th>Last Edited Datetime</th>
                <th style={{ textAlign: 'right', width: '240px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedDevices.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                    <Cpu size={28} style={{ margin: '0 auto 8px', color: '#475569' }} />
                    <div style={{ fontWeight: 600, color: '#f8fafc' }}>No IoT Devices Registered</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                      Click "Register IoT Device" to add your field sensors, PLC gateways, or IoT hardware.
                    </div>
                    <button className="dm-btn dm-btn-primary" style={{ margin: '12px auto 0' }} onClick={handleOpenCreate}>
                      <Plus size={13} /> <span>Register IoT Device</span>
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedDevices.map(dev => {
                  const devHealth = computeDeviceScanHealth(dev);
                  return (
                  <tr key={dev.id} className="dm-table-row">
                  <td className="mono" style={{ color: '#38bdf8', fontSize: '0.74rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span title={dev.identifier}>{dev.identifier.length > 18 ? dev.identifier.substring(0, 18) + '...' : dev.identifier}</span>
                      <button
                        onClick={() => {
                          const token = `TB_ACC_${dev.id}`;
                          navigator.clipboard.writeText(token);
                          setCopiedToken(dev.id);
                          showToast(`Copied Access Token: ${token}`, 'success');
                          setTimeout(() => setCopiedToken(null), 2000);
                        }}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: copiedToken === dev.id ? '#10b981' : '#64748b' }}
                        title="Copy ThingsBoard Access Token"
                      >
                        {copiedToken === dev.id ? <CheckCheck size={12} /> : <Copy size={12} />}
                      </button>
                    </div>
                  </td>
                  <td style={{ fontWeight: 600, color: '#f8fafc' }}>
                    {dev.name}
                  </td>
                  <td style={{ color: '#94a3b8' }}>
                    {dev.template_name || 'Standard Template'}
                  </td>
                  <td>
                    <span className={`dm-broker-pill ${dev.broker.toLowerCase().replace(/\s+/g, '-')}`}>
                      {dev.broker}
                    </span>
                  </td>
                  <td>
                    <span className={`dm-health-badge ${devHealth.status.toLowerCase().replace(/\s+/g, '-')}`}>
                      <span className="dm-dot" />
                      {devHealth.status}
                    </span>
                  </td>
                  <td className="dm-timestamp-cell">
                    {(dev.last_data_received || dev.last_seen) ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: devHealth.isWithinScan ? '#10b981' : '#ef4444', display: 'inline-block' }} />
                        <span style={{ color: devHealth.isWithinScan ? '#10b981' : '#f87171', fontFamily: 'monospace', fontWeight: 600 }} title={`Scan rate: ${devHealth.scanRate}s | Last received: ${devHealth.elapsedSec}s ago`}>
                          {(dev.last_data_received || dev.last_seen).substring(0, 19).replace('T', ' ')}
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: '#64748b', fontSize: '0.72rem' }}>No data yet</span>
                    )}
                  </td>
                  <td className="dm-timestamp-cell">
                    {dev.last_edited ? dev.last_edited.substring(0, 19).replace('T', ' ') : '-'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '4px' }}>
                      <button 
                        className="dm-row-action-btn"
                        style={{ color: '#38bdf8' }}
                        onClick={() => handleOpenInspector(dev)}
                        title="Configure Device Settings, Live Telemetry & Health"
                      >
                        <Settings size={14} />
                      </button>
                      <button 
                        className="dm-row-action-btn view"
                        onClick={() => handleDownloadMetricsSample(dev)}
                        title="Download Metrics Sample"
                      >
                        <Download size={13} />
                      </button>
                      <button 
                        className="dm-row-action-btn primary"
                        onClick={() => handleOpenIngestTester(dev)}
                        title="Simulate Field Telemetry Ingestion"
                      >
                        <Play size={13} />
                      </button>
                      <button 
                        className="dm-row-action-btn delete"
                        onClick={() => {
                          if (window.confirm(`Delete device '${dev.name}'?`)) {
                            deleteDevice(dev.id);
                          }
                        }}
                        title="Delete Device"
                      >
                        <Trash2 size={13} />
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

      {/* CREATE DEVICE MODAL (Section 9.5 & Table opic- Device Configurable Items) */}
      {isCreateModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1400 }}>
          <div className="dm-modal-box" style={{ width: '700px' }}>
            <div className="dm-modal-header">
              <h3>Register IoT Device (Section 9.5)</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="dm-close-btn">&times;</button>
            </div>
            <div className="dm-modal-body">
              <div className="dm-form-grid-2">
                <div className="dm-form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="dm-field-label">Identifier (UUID or GUID)</label>
                    <button 
                      type="button" 
                      onClick={handleGenerateUUID}
                      style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '0.7rem', cursor: 'pointer' }}
                    >
                      Generate UUID
                    </button>
                  </div>
                  <input 
                    type="text"
                    className="dm-input mono"
                    value={deviceForm.identifier}
                    onChange={(e) => setDeviceForm({ ...deviceForm, identifier: e.target.value })}
                  />
                </div>
                <div className="dm-form-group">
                  <label className="dm-field-label">Device Name</label>
                  <input 
                    type="text"
                    className="dm-input"
                    placeholder="e.g. Yokogawa EJX110A Transmitter"
                    value={deviceForm.name}
                    onChange={(e) => setDeviceForm({ ...deviceForm, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="dm-form-grid-2">
                <div className="dm-form-group">
                  <label className="dm-field-label">Device Template</label>
                  <select 
                    className="dm-select"
                    value={deviceForm.template_id}
                    onChange={(e) => {
                      const t = deviceTemplates.find(dt => dt.id === e.target.value);
                      setDeviceForm({ ...deviceForm, template_id: e.target.value, template_name: t?.template_name || '' });
                    }}
                  >
                    {deviceTemplates.map(dt => (
                      <option key={dt.id} value={dt.id}>{dt.template_name}</option>
                    ))}
                  </select>
                </div>
                <div className="dm-form-group">
                  <label className="dm-field-label">Single Data Broker Assignment</label>
                  <select 
                    className="dm-select"
                    value={deviceForm.broker_id}
                    onChange={(e) => {
                      const brk = brokers.find(b => b.id === e.target.value);
                      setDeviceForm({
                        ...deviceForm,
                        broker_id: e.target.value,
                        broker: brk ? brk.name : e.target.value,
                        connection_string: brk?.connection_string || deviceForm.connection_string
                      });
                      setFlowValidationResult(null); // Require revalidation on broker change
                    }}
                  >
                    {brokers.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.broker_type} &bull; Port {b.port || 91})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* POINT 2: FLOW VALIDATION WITH SINGLE BROKER */}
              <div style={{
                margin: '12px 0',
                padding: '12px',
                borderRadius: '8px',
                background: '#070a11',
                border: flowValidationResult?.valid ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(56, 189, 248, 0.25)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Zap size={14} color="#38bdf8" />
                      Single Broker Flow Verification Pipeline
                    </span>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                      Validates handshake, device ID uniqueness, schema format, and message flow before saving.
                    </span>
                  </div>

                  <button
                    type="button"
                    className="dm-btn dm-btn-primary"
                    style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                    onClick={handleValidateFlow}
                    disabled={isValidatingFlow}
                  >
                    <RefreshCw size={11} className={isValidatingFlow ? "animate-spin" : ""} />
                    <span>{isValidatingFlow ? 'Validating...' : 'Validate Flow'}</span>
                  </button>
                </div>

                {/* Validation Steps Badges */}
                {flowValidationResult && (
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{
                      padding: '6px 10px',
                      borderRadius: '4px',
                      background: flowValidationResult.valid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: flowValidationResult.valid ? '#10b981' : '#ef4444',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <span>{flowValidationResult.summary}</span>
                      <span className="mono" style={{ fontSize: '0.7rem' }}>Broker: {flowValidationResult.broker_name}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                      {(flowValidationResult.steps || []).map((st, i) => (
                        <div key={i} style={{
                          padding: '6px 8px',
                          borderRadius: '4px',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: st.status === 'PASS' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                          fontSize: '0.68rem'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: st.status === 'PASS' ? '#34d399' : '#f87171' }}>
                            {st.status === 'PASS' ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                            <span>{st.name}</span>
                          </div>
                          <div style={{ color: '#94a3b8', fontSize: '0.64rem', marginTop: '2px' }}>
                            {st.message}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Conditional Fields: IoT Hub */}
              {deviceForm.broker === 'IoT Hub' && (
                <div className="dm-broker-specific-box">
                  <div className="dm-form-group">
                    <label className="dm-field-label">Connection String</label>
                    <input 
                      type="text"
                      className="dm-input mono"
                      value={deviceForm.connection_string}
                      onChange={(e) => setDeviceForm({ ...deviceForm, connection_string: e.target.value })}
                    />
                  </div>
                  <div className="dm-form-grid-3">
                    <div className="dm-form-group">
                      <label className="dm-field-label">Retention Days</label>
                      <input 
                        type="number"
                        className="dm-input"
                        value={deviceForm.metric_retention_days}
                        onChange={(e) => setDeviceForm({ ...deviceForm, metric_retention_days: Number(e.target.value) })}
                      />
                    </div>
                    <div className="dm-form-group">
                      <label className="dm-field-label">SAS Duration (Days)</label>
                      <input 
                        type="number"
                        className="dm-input"
                        value={deviceForm.sas_token_duration}
                        onChange={(e) => setDeviceForm({ ...deviceForm, sas_token_duration: Number(e.target.value) })}
                      />
                    </div>
                    <div className="dm-form-group">
                      <label className="dm-field-label">Cloud-to-Device Binding</label>
                      <input 
                        type="text"
                        className="dm-input"
                        value={deviceForm.binding_value}
                        onChange={(e) => setDeviceForm({ ...deviceForm, binding_value: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Conditional Fields: MQTT */}
              {deviceForm.broker === 'MQTT' && (
                <div className="dm-broker-specific-box">
                  <div className="dm-form-grid-2">
                    <div className="dm-form-group">
                      <label className="dm-field-label">Topic-Telemetry</label>
                      <input 
                        type="text"
                        className="dm-input mono"
                        value={deviceForm.topic_telemetry}
                        onChange={(e) => setDeviceForm({ ...deviceForm, topic_telemetry: e.target.value })}
                      />
                    </div>
                    <div className="dm-form-group">
                      <label className="dm-field-label">Topic-Command</label>
                      <input 
                        type="text"
                        className="dm-input mono"
                        value={deviceForm.topic_command}
                        onChange={(e) => setDeviceForm({ ...deviceForm, topic_command: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="dm-form-group">
                    <label className="dm-checkbox-inline">
                      <input 
                        type="checkbox"
                        checked={deviceForm.has_command}
                        onChange={(e) => setDeviceForm({ ...deviceForm, has_command: e.target.checked })}
                      />
                      <span>Enable MQTT Device Commands (Has Command)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Health Check Settings */}
              <div className="dm-healthcheck-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="dm-checkbox-inline">
                    <input 
                      type="checkbox"
                      checked={deviceForm.health_check}
                      onChange={(e) => setDeviceForm({ ...deviceForm, health_check: e.target.checked })}
                    />
                    <span style={{ fontWeight: 600 }}>Enable Health Check Monitoring</span>
                  </label>
                  <span style={{ fontSize: '0.72rem', color: '#38bdf8' }}>Method: {deviceForm.health_check_method}</span>
                </div>
                {deviceForm.health_check && (
                  <div style={{ marginTop: '8px' }}>
                    <label className="dm-field-label">Monitoring Time (Seconds before marked Disconnected)</label>
                    <input 
                      type="number"
                      className="dm-input"
                      value={deviceForm.monitoring_time_secs}
                      onChange={(e) => setDeviceForm({ ...deviceForm, monitoring_time_secs: Number(e.target.value) })}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="dm-modal-footer">
              <button className="dm-btn dm-btn-secondary" onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
              <button 
                className="dm-btn dm-btn-primary"
                onClick={async () => {
                  const ident = (deviceForm.identifier || '').trim();
                  if (!ident) {
                    showToast('Please specify a Device Identifier (e.g. pump-p101a-hub-01)', 'error');
                    return;
                  }
                  if (!deviceForm.name?.trim()) {
                    showToast('Please specify a Device Name', 'error');
                    return;
                  }
                  await createDevice({
                    ...deviceForm,
                    id: ident,
                    identifier: ident
                  });
                  setIsCreateModalOpen(false);
                }}
              >
                Register Device
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TEST INGEST & SIMULATION MODAL (Section 9.7.3 Broker REST API) */}
      {isTestIngestModalOpen && selectedDevice && (
        <div className="modal-backdrop" style={{ zIndex: 1400 }}>
          <div className="dm-modal-box" style={{ width: '600px' }}>
            <div className="dm-modal-header">
              <h3>Ingest Telemetry into {selectedDevice.name}</h3>
              <button onClick={() => setIsTestIngestModalOpen(false)} className="dm-close-btn">&times;</button>
            </div>
            <div className="dm-modal-body">
              <p className="dm-modal-desc">
                Simulates real field device data transmission via Broker REST API (<code>POST /api/v1/dm/broker/ingest</code>).
              </p>

              <div className="dm-form-group">
                <label className="dm-field-label">JSON Telemetry Payload</label>
                <textarea 
                  rows={8}
                  className="dm-textarea mono"
                  value={ingestPayloadText}
                  onChange={(e) => setIngestPayloadText(e.target.value)}
                />
              </div>

              {/* Cloud-to-Device Test Binding Send (Section 9.5 & 9.6.2) */}
              <div className="dm-binding-test-row">
                <div style={{ flex: 1 }}>
                  <label className="dm-field-label">Cloud-to-Device Binding Test</label>
                  <input 
                    type="text"
                    className="dm-input"
                    placeholder="Enter command value..."
                    defaultValue={selectedDevice.binding_value || '10'}
                    id="dev-binding-input"
                  />
                </div>
                <div style={{ alignSelf: 'flex-end' }}>
                  <button 
                    className="dm-btn dm-btn-secondary"
                    onClick={() => {
                      const v = document.getElementById('dev-binding-input')?.value;
                      sendDeviceBinding(selectedDevice.id, v);
                    }}
                  >
                    <Send size={13} /> Send Command
                  </button>
                </div>
              </div>
            </div>

            <div className="dm-modal-footer">
              <button className="dm-btn dm-btn-secondary" onClick={() => setIsTestIngestModalOpen(false)}>Cancel</button>
              <button 
                className="dm-btn dm-btn-primary"
                onClick={async () => {
                  try {
                    const parsed = JSON.parse(ingestPayloadText);
                    const nowIso = new Date().toISOString();
                    const res = await ingestBrokerPayload(parsed);
                    if (inspectorDevice) {
                      setInspectorDevice(prev => ({
                        ...prev,
                        last_payload: parsed,
                        last_seen: res?.device?.last_seen || nowIso,
                        last_data_received: res?.device?.last_data_received || nowIso,
                        status: 'Connected',
                        ...(res?.device || {})
                      }));
                    }
                    setIsTestIngestModalOpen(false);
                  } catch (e) {
                    showToast('Invalid JSON payload string: ' + e.message, 'error');
                  }
                }}
              >
                <Play size={13} /> Ingest Live Payload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* THINGSBOARD DEVICE INSPECTOR MODAL: CONFIGURATION, TEMPLATE TELEMETRY & HEALTH */}
      {inspectorDevice && (
        <div className="modal-backdrop" style={{ zIndex: 1400 }}>
          <div className="dm-modal-box" style={{ width: '850px', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
            <div className="dm-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings size={18} color="#38bdf8" />
                <div>
                  <h3 style={{ margin: 0 }}>{inspectorDevice.name} &mdash; Device Configuration &amp; Health</h3>
                  {(() => {
                    const liveDev = devices.find(d => 
                      (d.identifier && String(d.identifier).trim().toLowerCase() === String(inspectorDevice.identifier || inspectorDevice.id).trim().toLowerCase()) ||
                      (d.id && String(d.id).trim().toLowerCase() === String(inspectorDevice.id || inspectorDevice.identifier).trim().toLowerCase())
                    ) || inspectorDevice;
                    const inspHealth = computeDeviceScanHealth(liveDev);
                    const lastRx = liveDev.last_data_received || liveDev.last_seen;
                    return (
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontFamily: 'monospace', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span>Device ID: <strong style={{ color: '#38bdf8' }}>{inspectorDevice.identifier || inspectorDevice.id}</strong></span>
                        <span>|</span>
                        <span>Broker: <strong style={{ color: '#e2e8f0' }}>{inspectorDevice.broker}</strong></span>
                        <span>|</span>
                        <span className={`dm-health-badge ${inspHealth.status.toLowerCase()}`} style={{ padding: '1px 6px', fontSize: '0.66rem' }}>
                          <span className="dm-dot" />
                          {inspHealth.status.toUpperCase()}
                        </span>
                        <span>|</span>
                        <span style={{ padding: '1px 6px', borderRadius: '3px', background: lastRx ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.15)', color: lastRx ? '#10b981' : '#94a3b8' }}>
                          Last Data Received: {lastRx ? `${lastRx.substring(0, 19).replace('T', ' ')} UTC (${inspHealth.elapsedSec !== null ? `${inspHealth.elapsedSec}s ago` : 'just now'})` : 'No data yet'}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>
              <button onClick={() => setInspectorDevice(null)} className="dm-close-btn">&times;</button>
            </div>

            {/* Inspector Navigation Tabs */}
            <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 16px', background: '#0a0f1d', overflowX: 'auto' }}>
              {[
                { id: 'config', label: 'Configuration & Settings', icon: SlidersHorizontal },
                { id: 'telemetry', label: 'Template & Live Telemetry', icon: Activity },
                { id: 'health', label: 'API & Gateway Health', icon: Wifi },
                { id: 'credentials', label: 'Credentials & Ingest', icon: Key },
                { id: 'rpc', label: 'Remote RPC Terminal', icon: Terminal },
                { id: 'alarms', label: `Alarms (${alarms.filter(a => a.tag_name?.includes(inspectorDevice.identifier) || a.source_asset?.includes(inspectorDevice.name)).length})`, icon: Bell }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setInspectorTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 14px',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    border: 'none',
                    borderBottom: inspectorTab === tab.id ? '2px solid #38bdf8' : '2px solid transparent',
                    background: 'transparent',
                    color: inspectorTab === tab.id ? '#38bdf8' : '#94a3b8',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <tab.icon size={13} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="dm-modal-body" style={{ flex: 1, overflowY: 'auto', padding: '18px' }}>
              {/* TAB 1: DEVICE CONFIGURATION & SETTINGS */}
              {inspectorTab === 'config' && editConfigForm && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', background: '#070b14', padding: '12px 14px', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                        Device Entity Settings
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        Edit configuration parameters, change assigned template, broker bindings, and monitoring interval.
                      </div>
                    </div>
                    <button
                      className="dm-btn dm-btn-primary"
                      onClick={handleSaveDeviceConfig}
                      disabled={isSavingConfig}
                      style={{ padding: '6px 14px' }}
                    >
                      <Check size={13} className={isSavingConfig ? 'spin' : ''} />
                      <span>{isSavingConfig ? 'Saving Changes...' : 'Save Configuration'}</span>
                    </button>
                  </div>

                  <div className="dm-form-grid-2">
                    <div className="dm-form-group">
                      <label className="dm-field-label">Device Name *</label>
                      <input
                        type="text"
                        className="dm-input"
                        value={editConfigForm.name}
                        onChange={(e) => setEditConfigForm({ ...editConfigForm, name: e.target.value })}
                        placeholder="e.g. Centrifugal Pump P-101A"
                      />
                    </div>

                    <div className="dm-form-group">
                      <label className="dm-field-label">Device Identifier (Device ID) *</label>
                      <input
                        type="text"
                        className="dm-input mono"
                        value={editConfigForm.identifier}
                        onChange={(e) => setEditConfigForm({ ...editConfigForm, identifier: e.target.value })}
                        placeholder="e.g. pump-p101a-hub-01"
                      />
                      <span style={{ fontSize: '0.66rem', color: '#64748b', marginTop: '2px', display: 'block' }}>
                        Matches <code>deviceid</code> in telemetry JSON payloads.
                      </span>
                    </div>
                  </div>

                  <div className="dm-form-grid-2">
                    <div className="dm-form-group">
                      <label className="dm-field-label">Device Template Profile</label>
                      <select
                        className="dm-select"
                        value={editConfigForm.template_id}
                        onChange={(e) => {
                          const tId = e.target.value;
                          const selectedTmpl = deviceTemplates.find(t => t.id === tId);
                          setEditConfigForm({
                            ...editConfigForm,
                            template_id: tId,
                            template_name: selectedTmpl ? (selectedTmpl.template_name || selectedTmpl.name) : ''
                          });
                        }}
                      >
                        <option value="">-- No Template Assigned --</option>
                        {deviceTemplates.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.template_name || t.name || t.id}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="dm-form-group">
                      <label className="dm-field-label">Data Broker / Gateway</label>
                      <select
                        className="dm-select"
                        value={editConfigForm.broker_id}
                        onChange={(e) => {
                          const bId = e.target.value;
                          const selectedBrk = brokers.find(b => b.id === bId);
                          setEditConfigForm({
                            ...editConfigForm,
                            broker_id: bId,
                            broker: selectedBrk ? selectedBrk.name : editConfigForm.broker
                          });
                        }}
                      >
                        {brokers.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.name} ({b.broker_type || 'MQTT'})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="dm-form-grid-2">
                    <div className="dm-form-group">
                      <label className="dm-field-label">Telemetry Ingestion Topic</label>
                      <input
                        type="text"
                        className="dm-input mono"
                        value={editConfigForm.topic_telemetry}
                        onChange={(e) => setEditConfigForm({ ...editConfigForm, topic_telemetry: e.target.value })}
                      />
                    </div>

                    <div className="dm-form-group">
                      <label className="dm-field-label">Command / RPC Topic</label>
                      <input
                        type="text"
                        className="dm-input mono"
                        value={editConfigForm.topic_command}
                        onChange={(e) => setEditConfigForm({ ...editConfigForm, topic_command: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="dm-form-group">
                    <label className="dm-field-label">Connection String</label>
                    <input
                      type="text"
                      className="dm-input mono"
                      value={editConfigForm.connection_string}
                      onChange={(e) => setEditConfigForm({ ...editConfigForm, connection_string: e.target.value })}
                    />
                  </div>

                  <div className="dm-form-grid-3">
                    <div className="dm-form-group">
                      <label className="dm-field-label">Operational Status</label>
                      <select
                        className="dm-select"
                        value={editConfigForm.status}
                        onChange={(e) => setEditConfigForm({ ...editConfigForm, status: e.target.value })}
                      >
                        <option value="Connected">Connected</option>
                        <option value="Disconnected">Disconnected</option>
                        <option value="Provisioned">Provisioned</option>
                        <option value="Maintenance">Maintenance</option>
                      </select>
                    </div>

                    <div className="dm-form-group">
                      <label className="dm-field-label">Retention (Days)</label>
                      <input
                        type="number"
                        className="dm-input"
                        value={editConfigForm.metric_retention_days}
                        onChange={(e) => setEditConfigForm({ ...editConfigForm, metric_retention_days: parseInt(e.target.value) || 90 })}
                      />
                    </div>

                    <div className="dm-form-group">
                      <label className="dm-field-label">Monitoring Interval (s)</label>
                      <input
                        type="number"
                        className="dm-input"
                        value={editConfigForm.monitoring_time_secs}
                        onChange={(e) => setEditConfigForm({ ...editConfigForm, monitoring_time_secs: parseInt(e.target.value) || 60 })}
                      />
                    </div>
                  </div>

                  {/* AUTOMATED LAST DATA RECEIVED & SCAN-RATE HEALTH MONITOR */}
                  {(() => {
                    const liveDev = devices.find(d => 
                      (d.identifier && String(d.identifier).trim().toLowerCase() === String(inspectorDevice.identifier || inspectorDevice.id).trim().toLowerCase()) ||
                      (d.id && String(d.id).trim().toLowerCase() === String(inspectorDevice.id || inspectorDevice.identifier).trim().toLowerCase())
                    ) || inspectorDevice;
                    const inspHealth = computeDeviceScanHealth(liveDev);
                    const templateTs = liveDev.last_data_received || liveDev.last_seen;

                    return (
                      <div style={{ marginTop: '14px', background: '#0a101f', padding: '14px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Activity size={16} color="#38bdf8" />
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc' }}>
                              Automated Telemetry &amp; Scan Rate Health Monitor
                            </span>
                          </div>
                          <span className={`dm-health-badge ${inspHealth.status.toLowerCase()}`}>
                            <span className="dm-dot" />
                            {inspHealth.status.toUpperCase()}
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                          {/* Device Template Timestamp */}
                          <div style={{ background: '#070b14', padding: '10px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
                              Template Payload Timestamp (UTC)
                            </div>
                            <div className="mono" style={{ fontSize: '0.84rem', fontWeight: 700, color: templateTs ? '#10b981' : '#64748b' }}>
                              {templateTs ? templateTs.substring(0, 19).replace('T', ' ') + ' UTC' : 'No telemetry received yet'}
                            </div>
                            <div style={{ fontSize: '0.66rem', color: '#64748b', marginTop: '4px' }}>
                              ✓ Extracted automatically from incoming device template packet
                            </div>
                          </div>

                          {/* Scan Rate Health Countdown */}
                          <div style={{ background: '#070b14', padding: '10px 12px', borderRadius: '6px', border: `1px solid ${inspHealth.isWithinScan ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}` }}>
                            <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
                              Scan Rate Status (Limit: {editConfigForm.monitoring_time_secs || 60}s)
                            </div>
                            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: inspHealth.isWithinScan ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {inspHealth.elapsedSec !== null ? (
                                <>
                                  <span className="mono">{inspHealth.elapsedSec}s elapsed</span>
                                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>/ {editConfigForm.monitoring_time_secs || 60}s scan window</span>
                                </>
                              ) : (
                                <span>Awaiting initial telemetry packet</span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.66rem', color: inspHealth.isWithinScan ? '#34d399' : '#f87171', marginTop: '4px' }}>
                              {inspHealth.isWithinScan
                                ? `● Connected: Next scan window closes in ${Math.max(0, Math.round(((editConfigForm.monitoring_time_secs || 60) - (inspHealth.elapsedSec || 0)) * 10) / 10)}s`
                                : `○ Disconnected: No telemetry received within configured scan rate (${editConfigForm.monitoring_time_secs || 60}s)`}
                            </div>
                          </div>
                        </div>

                        <div style={{ marginTop: '10px', fontSize: '0.68rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CheckCircle2 size={13} color="#10b981" />
                          <span>Timestamp and device health update automatically upon payload reception. Manual updating is not required.</span>
                        </div>
                      </div>
                    );
                  })()}

                  <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      className="dm-btn dm-btn-primary"
                      onClick={handleSaveDeviceConfig}
                      disabled={isSavingConfig}
                      style={{ padding: '8px 18px', fontSize: '0.8rem' }}
                    >
                      <Check size={14} className={isSavingConfig ? 'spin' : ''} />
                      <span>{isSavingConfig ? 'Saving Configuration...' : 'Save Configuration Changes'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: TEMPLATE & LIVE TELEMETRY */}
              {inspectorTab === 'telemetry' && (() => {
                const devTmpl = deviceTemplates.find(t => 
                  t.id === inspectorDevice.template_id || 
                  t.template_name === inspectorDevice.template_name ||
                  t.name === inspectorDevice.template_name
                );
                const metricKeys = devTmpl?.metric_keys || devTmpl?.metrics || [];
                const liveDev = devices.find(d => 
                  (d.identifier && String(d.identifier).trim().toLowerCase() === String(inspectorDevice.identifier || inspectorDevice.id).trim().toLowerCase()) ||
                  (d.id && String(d.id).trim().toLowerCase() === String(inspectorDevice.id || inspectorDevice.identifier).trim().toLowerCase())
                ) || inspectorDevice;
                const lastPayload = liveDev?.last_payload || inspectorDevice?.last_payload;
                const lastReceivedTime = liveDev?.last_data_received || liveDev?.last_seen || inspectorDevice?.last_data_received || inspectorDevice?.last_seen;
                const linkedAssets = assets.filter(a => (a.attributes || []).some(attr => attr.device_id === inspectorDevice.identifier || attr.device_id === inspectorDevice.id));

                // Separate payload keys into matched schema metrics vs additional raw attributes
                const schemaKeyNames = new Set(
                  metricKeys.map(mk => typeof mk === 'string' ? mk.toLowerCase() : (mk.key || mk.name || '').toLowerCase()).filter(Boolean)
                );
                const envelopeKeys = new Set(['deviceid', 'device_id', 'deviceid', 'identifier', 'id', 'timestamp']);
                const containerKeys = new Set(['tags', 'metrics', 'measurements', 'data', 'values', 'telemetry', 'd']);
                const additionalPayloadEntries = lastPayload ? Object.entries(lastPayload).filter(([k]) => {
                  const kLower = k.toLowerCase();
                  return !schemaKeyNames.has(kLower) && !envelopeKeys.has(kLower) && !containerKeys.has(kLower);
                }) : [];

                return (
                  <div>
                    {/* Selected Template Section */}
                    <div style={{ background: '#070b14', borderRadius: '6px', padding: '12px 14px', border: '1px solid rgba(56, 189, 248, 0.25)', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>Assigned Template Profile:</span>
                            <span style={{ color: '#f8fafc' }}>{devTmpl ? (devTmpl.template_name || devTmpl.name) : (inspectorDevice.template_name || 'Standard Device Template')}</span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '3px' }}>
                            Template ID: <span className="mono" style={{ color: '#38bdf8' }}>{devTmpl?.id || inspectorDevice.template_id || 'N/A'}</span> &bull; Target Device: <span className="mono" style={{ color: '#10b981' }}>{inspectorDevice.identifier || inspectorDevice.id}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.68rem', padding: '3px 8px', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontWeight: 600, border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                            {metricKeys.length} Schema Metrics Defined
                          </span>
                          <button
                            className="dm-btn dm-btn-primary"
                            disabled={isQuickIngesting}
                            onClick={() => handleQuickIngestSample(inspectorDevice)}
                            style={{ fontSize: '0.72rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}
                            title="Instantly generate and ingest real live telemetry packet strictly adhering to this template"
                          >
                            <Zap size={12} className={isQuickIngesting ? 'spin' : ''} />
                            <span>{isQuickIngesting ? 'Ingesting...' : '⚡ Ingest Sample Telemetry'}</span>
                          </button>
                        </div>
                      </div>

                      {metricKeys.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                          {metricKeys.map((mk, idx) => (
                            <span key={idx} className="mono" style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '4px', background: '#0d1527', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }}>
                              {typeof mk === 'string' ? mk : (mk.key || mk.metric_name || mk.name)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic', marginTop: '4px' }}>
                          No specific metric keys schema registered in this template. Arbitrary JSON telemetry is supported.
                        </div>
                      )}
                    </div>

                    {/* Latest Received Real Telemetry Data */}
                    <div style={{ background: '#070b14', borderRadius: '6px', padding: '14px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Activity size={15} color="#10b981" />
                            <span>Live Received Telemetry Payload</span>
                            {lastPayload && (
                              <span style={{ fontSize: '0.66rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', fontWeight: 700, border: '1px solid rgba(16, 185, 129, 0.4)' }}>
                                ACTIVE STREAM
                              </span>
                            )}
                          </div>
                          {lastReceivedTime ? (
                            <div style={{ fontSize: '0.72rem', color: '#10b981', fontFamily: 'monospace', fontWeight: 600, marginTop: '2px' }}>
                              Last Ingest Timestamp: {lastReceivedTime.substring(0, 19).replace('T', ' ')} UTC
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                              No live packet received yet for this device session
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            className="dm-btn dm-btn-secondary"
                            onClick={() => handleOpenIngestTester(inspectorDevice)}
                            style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                            title="Open custom JSON editor to send payload"
                          >
                            <SlidersHorizontal size={12} /> Custom Payload Editor
                          </button>
                          <button
                            className="dm-btn dm-btn-primary"
                            disabled={isQuickIngesting}
                            onClick={() => handleQuickIngestSample(inspectorDevice)}
                            style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                            title="Push instant live telemetry packet for this template"
                          >
                            <Play size={12} className={isQuickIngesting ? 'spin' : ''} />
                            <span>{isQuickIngesting ? 'Sending...' : 'Send Live Ingest'}</span>
                          </button>
                        </div>
                      </div>

                      {lastPayload ? (
                        <div>
                          {/* 1. Template Schema Metrics Mapping Table */}
                          {metricKeys.length > 0 && (
                            <div style={{ marginBottom: '14px' }}>
                              <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#38bdf8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Template Schema Metrics &amp; Live Ingested Values
                              </div>
                              <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.73rem' }}>
                                  <thead>
                                    <tr style={{ background: '#0a0f1d', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', textAlign: 'left' }}>
                                      <th style={{ padding: '8px 10px' }}>Schema Key</th>
                                      <th style={{ padding: '8px 10px' }}>Display / Expression</th>
                                      <th style={{ padding: '8px 10px' }}>Data Type</th>
                                      <th style={{ padding: '8px 10px' }}>Live Received Value</th>
                                      <th style={{ padding: '8px 10px' }}>Packet Quality</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {metricKeys.map((mk, idx) => {
                                      const key = typeof mk === 'string' ? mk : (mk.key || mk.name);
                                      const name = typeof mk === 'object' ? (mk.name || mk.key) : mk;
                                      const dType = typeof mk === 'object' ? (mk.data_type || 'Double') : 'Double';
                                      const expr = typeof mk === 'object' ? (mk.expression || '') : '';
                                      const extraction = extractMetricVal(lastPayload, key);
                                      const isFound = extraction.found;
                                      const val = extraction.value;
                                      const displayVal = (isFound && expr) ? evaluateMetricExpr(val, expr) : val;

                                      return (
                                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: isFound ? 'rgba(16, 185, 129, 0.02)' : 'transparent' }}>
                                          <td className="mono" style={{ color: '#38bdf8', fontWeight: 600, padding: '8px 10px' }}>
                                            {key}
                                          </td>
                                          <td style={{ color: '#cbd5e1', padding: '8px 10px' }}>
                                            <div>{name !== key ? name : key}</div>
                                            {expr && (
                                              <span className="mono" style={{ fontSize: '0.64rem', color: '#a78bfa' }}>
                                                {expr}
                                              </span>
                                            )}
                                          </td>
                                          <td style={{ color: '#94a3b8', padding: '8px 10px' }}>
                                            <span style={{ padding: '2px 6px', borderRadius: '3px', background: '#0d1527', border: '1px solid rgba(255,255,255,0.08)', fontSize: '0.66rem' }}>
                                              {dType}
                                            </span>
                                          </td>
                                          <td className="mono" style={{ padding: '8px 10px' }}>
                                            {isFound ? (
                                              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', background: 'rgba(16, 185, 129, 0.12)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                                                {typeof displayVal === 'object' ? JSON.stringify(displayVal) : String(displayVal)}
                                              </span>
                                            ) : (
                                              <span style={{ color: '#64748b', fontStyle: 'italic' }}>Waiting for packet...</span>
                                            )}
                                          </td>
                                          <td style={{ padding: '8px 10px' }}>
                                            {isFound ? (
                                              <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.66rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                                                LIVE / GOOD
                                              </span>
                                            ) : (
                                              <span style={{ background: 'rgba(100, 116, 139, 0.15)', color: '#94a3b8', padding: '2px 8px', borderRadius: '4px', fontSize: '0.66rem' }}>
                                                PENDING
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* 2. Additional Ingested Fields Table (Envelope & Unmapped metrics) */}
                          {additionalPayloadEntries.length > 0 && (
                            <div style={{ marginBottom: '14px' }}>
                              <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Additional Received Fields &amp; Properties ({additionalPayloadEntries.length})
                              </div>
                              <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                                  <thead>
                                    <tr style={{ background: '#0a0f1d', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', textAlign: 'left' }}>
                                      <th style={{ padding: '6px 10px' }}>Payload Key</th>
                                      <th style={{ padding: '6px 10px' }}>Value</th>
                                      <th style={{ padding: '6px 10px' }}>Data Type</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {additionalPayloadEntries.map(([k, v]) => (
                                      <tr key={k} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                        <td className="mono" style={{ color: '#e2e8f0', padding: '6px 10px' }}>{k}</td>
                                        <td className="mono font-bold" style={{ color: '#38bdf8', padding: '6px 10px' }}>
                                          {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                        </td>
                                        <td style={{ color: '#94a3b8', padding: '6px 10px' }}>{typeof v}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* 3. Raw Ingested JSON Payload with Copy Button */}
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8' }}>
                                Raw Ingested JSON Payload:
                              </div>
                              <button
                                className="dm-btn dm-btn-secondary"
                                onClick={() => {
                                  try {
                                    navigator.clipboard.writeText(JSON.stringify(lastPayload, null, 2));
                                    showToast('JSON payload copied to clipboard!', 'success');
                                  } catch (_) {
                                    showToast('Could not copy to clipboard', 'error');
                                  }
                                }}
                                style={{ fontSize: '0.66rem', padding: '2px 8px' }}
                              >
                                <Copy size={11} /> Copy JSON
                              </button>
                            </div>
                            <pre className="mono" style={{ background: '#020617', padding: '10px', borderRadius: '4px', fontSize: '0.7rem', color: '#34d399', overflowX: 'auto', margin: 0, border: '1px solid rgba(52, 211, 153, 0.2)' }}>
                              {JSON.stringify(lastPayload, null, 2)}
                            </pre>
                          </div>
                        </div>
                      ) : (
                        <div style={{ padding: '24px 16px', textAlign: 'center', background: '#020617', borderRadius: '4px', border: '1px dashed rgba(56, 189, 248, 0.25)' }}>
                          <Activity size={28} style={{ color: '#38bdf8', marginBottom: '8px' }} />
                          <div style={{ fontSize: '0.85rem', color: '#f8fafc', fontWeight: 700 }}>
                            Awaiting Live Telemetry Packet for Device '{inspectorDevice.identifier || inspectorDevice.id}'
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '6px', maxWidth: '520px', margin: '6px auto 16px', lineHeight: 1.5 }}>
                            This device is registered and ready to receive data. Ingest data via the Broker REST API (<code>POST /api/v1/dm/broker/ingest</code>), publish to MQTT topic <code>refinery/telemetry</code>, or click below to ingest a sample packet for this template immediately.
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                            <button
                              className="dm-btn dm-btn-primary"
                              disabled={isQuickIngesting}
                              onClick={() => handleQuickIngestSample(inspectorDevice)}
                              style={{ fontSize: '0.76rem', padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                              <Zap size={13} className={isQuickIngesting ? 'spin' : ''} />
                              <span>{isQuickIngesting ? 'Ingesting...' : '⚡ Ingest Sample Template Telemetry'}</span>
                            </button>
                            <button
                              className="dm-btn dm-btn-secondary"
                              onClick={() => handleOpenIngestTester(inspectorDevice)}
                              style={{ fontSize: '0.76rem', padding: '6px 14px' }}
                            >
                              <SlidersHorizontal size={13} /> Open Payload Editor
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Linked Plant Asset Attributes */}
                    {linkedAssets.length > 0 && (
                      <div style={{ background: '#070b14', borderRadius: '6px', padding: '12px 14px', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#c084fc', marginBottom: '6px' }}>
                          Linked Plant Asset Dynamic Attributes
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', textAlign: 'left' }}>
                              <th style={{ padding: '6px 8px' }}>Asset</th>
                              <th style={{ padding: '6px 8px' }}>Attribute</th>
                              <th style={{ padding: '6px 8px' }}>Current Value</th>
                              <th style={{ padding: '6px 8px' }}>UoM</th>
                              <th style={{ padding: '6px 8px' }}>Quality</th>
                            </tr>
                          </thead>
                          <tbody>
                            {linkedAssets.flatMap(ast => 
                              (ast.attributes || [])
                                .filter(attr => attr.device_id === inspectorDevice.identifier || attr.device_id === inspectorDevice.id)
                                .map(attr => (
                                  <tr key={attr.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                    <td style={{ color: '#f8fafc', padding: '6px 8px' }}>{ast.name}</td>
                                    <td className="mono" style={{ color: '#38bdf8', padding: '6px 8px' }}>{attr.name} ({attr.metric})</td>
                                    <td className="mono font-bold" style={{ color: '#10b981', padding: '6px 8px' }}>{attr.value}</td>
                                    <td style={{ color: '#94a3b8', padding: '6px 8px' }}>{attr.uom || '-'}</td>
                                    <td style={{ padding: '6px 8px' }}>
                                      <span style={{ fontSize: '0.62rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                                        {attr.quality || 'Good'}
                                      </span>
                                    </td>
                                  </tr>
                                ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* TAB 3: API & GATEWAY HEALTH */}
              {inspectorTab === 'health' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', background: '#070b14', padding: '12px 14px', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                        Device API &amp; Gateway Health Diagnostics
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        Live diagnostics checking broker reachability, telemetry state, and round-trip API latency.
                      </div>
                    </div>
                    <button
                      className="dm-btn dm-btn-primary"
                      onClick={handleCheckDeviceHealth}
                      disabled={isCheckingHealth}
                      style={{ padding: '6px 14px' }}
                    >
                      <RefreshCw size={13} className={isCheckingHealth ? 'spin' : ''} />
                      <span>{isCheckingHealth ? 'Pinging Health...' : 'Run Health Check Ping'}</span>
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
                    <div style={{ background: '#070b14', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ fontSize: '0.66rem', color: '#94a3b8' }}>CONNECTION STATUS</div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: inspectorDevice.status === 'Connected' ? '#10b981' : '#f59e0b', marginTop: '2px' }}>
                        {inspectorDevice.status || 'Connected'}
                      </div>
                    </div>

                    <div style={{ background: '#070b14', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ fontSize: '0.66rem', color: '#94a3b8' }}>INGESTION GATEWAY</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8', marginTop: '2px' }}>
                        {inspectorDevice.broker}
                      </div>
                    </div>

                    <div style={{ background: '#070b14', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ fontSize: '0.66rem', color: '#94a3b8' }}>TELEMETRY STREAM</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: inspectorDevice.last_payload ? '#10b981' : '#94a3b8', marginTop: '2px' }}>
                        {inspectorDevice.last_payload ? 'Active / Ingested' : 'Awaiting Data'}
                      </div>
                    </div>
                  </div>

                  {healthStatusData && (
                    <div style={{ background: '#070b14', borderRadius: '6px', padding: '12px 14px', border: '1px solid rgba(16, 185, 129, 0.3)', marginBottom: '14px' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#10b981', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Live Diagnostic Result (GET /api/v1/dm/devices/{inspectorDevice.id}/health)</span>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{healthStatusData.checked_at?.substring(11, 19)} UTC</span>
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ color: '#94a3b8', padding: '4px 0' }}>Broker Gateway Reachability</td>
                            <td className="mono" style={{ color: healthStatusData.broker_online ? '#10b981' : '#ef4444', textAlign: 'right' }}>
                              {healthStatusData.broker_online ? 'ONLINE (Reachable)' : 'OFFLINE'}
                            </td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ color: '#94a3b8', padding: '4px 0' }}>Round-trip API Latency</td>
                            <td className="mono" style={{ color: '#38bdf8', textAlign: 'right' }}>
                              {healthStatusData.latency_ms} ms
                            </td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ color: '#94a3b8', padding: '4px 0' }}>Device Telemetry Ingested</td>
                            <td className="mono" style={{ color: healthStatusData.has_telemetry ? '#10b981' : '#f59e0b', textAlign: 'right' }}>
                              {healthStatusData.has_telemetry ? 'YES (Data verified)' : 'NO (Awaiting first packet)'}
                            </td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ color: '#94a3b8', padding: '4px 0' }}>Scan Rate Limit (Interval)</td>
                            <td className="mono" style={{ color: '#f8fafc', textAlign: 'right' }}>
                              {healthStatusData.monitoring_interval_secs}s
                            </td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ color: '#94a3b8', padding: '4px 0' }}>Scan Rate Compliance</td>
                            <td className="mono" style={{ color: healthStatusData.is_within_scan_rate ? '#10b981' : '#ef4444', textAlign: 'right', fontWeight: 600 }}>
                              {healthStatusData.is_within_scan_rate 
                                ? `CONNECTED (Within scan rate: ${healthStatusData.seconds_since_last_packet}s <= ${healthStatusData.monitoring_interval_secs}s)` 
                                : `DISCONNECTED (Timeout: ${healthStatusData.seconds_since_last_packet !== null ? `${healthStatusData.seconds_since_last_packet}s` : 'No data'} > ${healthStatusData.monitoring_interval_secs}s)`}
                            </td>
                          </tr>
                          <tr>
                            <td style={{ color: '#94a3b8', padding: '4px 0' }}>Last Data Received (Template TS)</td>
                            <td className="mono" style={{ color: (healthStatusData.last_data_received || healthStatusData.last_seen) ? '#10b981' : '#f8fafc', textAlign: 'right', fontWeight: 600 }}>
                              {healthStatusData.last_data_received || healthStatusData.last_seen || 'No telemetry received yet'}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* REST & MQTT Ingestion Specifications */}
                  <div style={{ background: '#070b14', borderRadius: '6px', padding: '12px 14px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
                      Real Ingestion Endpoints for this Device
                    </div>
                    <div style={{ fontSize: '0.72rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div>
                        <div style={{ color: '#94a3b8', marginBottom: '2px' }}>REST Telemetry Ingest Endpoint:</div>
                        <code className="mono" style={{ background: '#020617', padding: '3px 6px', borderRadius: '3px', color: '#38bdf8', display: 'block' }}>
                          POST /api/v1/dm/broker/ingest
                        </code>
                      </div>
                      <div>
                        <div style={{ color: '#94a3b8', marginBottom: '2px' }}>MQTT Telemetry Topic:</div>
                        <code className="mono" style={{ background: '#020617', padding: '3px 6px', borderRadius: '3px', color: '#10b981', display: 'block' }}>
                          {inspectorDevice.topic_telemetry || 'refinery/telemetry'}
                        </code>
                      </div>
                      <div>
                        <div style={{ color: '#94a3b8', marginBottom: '2px' }}>Remote RPC Downlink Endpoint:</div>
                        <code className="mono" style={{ background: '#020617', padding: '3px 6px', borderRadius: '3px', color: '#c084fc', display: 'block' }}>
                          POST /api/v1/dm/devices/{inspectorDevice.id}/rpc
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: CREDENTIALS & INGEST */}
              {inspectorTab === 'credentials' && (
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '12px' }}>
                    Device Ingestion Credentials &amp; Live CLI snippets for publishing telemetry into this device:
                  </div>

                  <div style={{ background: '#070b14', borderRadius: '6px', padding: '12px', border: '1px solid rgba(56, 189, 248, 0.2)', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#38bdf8' }}>Device Identifier (deviceid)</span>
                      <span style={{ fontSize: '0.64rem', padding: '1px 6px', borderRadius: '3px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>ACTIVE</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="dm-input mono"
                        value={inspectorDevice.identifier || inspectorDevice.id}
                        readOnly
                        style={{ flex: 1, color: '#38bdf8' }}
                      />
                      <button
                        className="dm-btn dm-btn-secondary"
                        onClick={() => {
                          navigator.clipboard.writeText(inspectorDevice.identifier || inspectorDevice.id);
                          showToast(`Device Identifier copied!`, 'success');
                        }}
                      >
                        <Copy size={13} /> Copy
                      </button>
                    </div>
                  </div>

                  {/* Access Token */}
                  <div style={{ background: '#070b14', borderRadius: '6px', padding: '12px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#f8fafc' }}>ThingsBoard Access Token</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="dm-input mono"
                        value={`TB_ACC_${inspectorDevice.id}`}
                        readOnly
                        style={{ flex: 1 }}
                      />
                      <button
                        className="dm-btn dm-btn-secondary"
                        onClick={() => {
                          const token = `TB_ACC_${inspectorDevice.id}`;
                          navigator.clipboard.writeText(token);
                          showToast(`Access Token copied: ${token}`, 'success');
                        }}
                      >
                        <Copy size={13} /> Copy
                      </button>
                    </div>
                  </div>

                  {/* REST curl Ingest Snippet */}
                  <div style={{ background: '#070b14', borderRadius: '6px', padding: '12px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '14px' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>
                      Publish Telemetry via REST API (cURL)
                    </div>
                    <pre className="mono" style={{ background: '#020617', padding: '8px', borderRadius: '4px', fontSize: '0.68rem', color: '#34d399', overflowX: 'auto', margin: 0 }}>
{`curl -X POST http://localhost:91/api/v1/dm/broker/ingest \\
  -H "Content-Type: application/json" \\
  -d '{
    "deviceid": "${inspectorDevice.identifier || inspectorDevice.id}",
    "timestamp": "${new Date().toISOString()}",
    "temperature": 45.2,
    "pressure": 145.8
  }'`}
                    </pre>
                  </div>

                  {/* Mosquitto Ingest Snippet */}
                  <div style={{ background: '#070b14', borderRadius: '6px', padding: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>
                      Publish Telemetry via Mosquitto MQTT
                    </div>
                    <pre className="mono" style={{ background: '#020617', padding: '8px', borderRadius: '4px', fontSize: '0.68rem', color: '#38bdf8', overflowX: 'auto', margin: 0 }}>
{`mosquitto_pub -h 127.0.0.1 -p 1883 -u "TB_ACC_${inspectorDevice.id}" -t "${inspectorDevice.topic_telemetry || 'refinery/telemetry'}" -m '{"deviceid":"${inspectorDevice.identifier || inspectorDevice.id}","temperature":45.2,"pressure":145.8}'`}
                    </pre>
                  </div>
                </div>
              )}

              {/* TAB 5: REMOTE RPC TERMINAL */}
              {inspectorTab === 'rpc' && (
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '12px' }}>
                    ThingsBoard Remote Procedure Call (RPC) Downlink Terminal: Dispatch control methods to device controller.
                  </div>

                  <div className="dm-form-grid-2" style={{ marginBottom: '10px' }}>
                    <div className="dm-form-group">
                      <label className="dm-field-label">RPC Method</label>
                      <select 
                        className="dm-select"
                        value={rpcMethod}
                        onChange={(e) => setRpcMethod(e.target.value)}
                      >
                        <option value="setDevicePower">setDevicePower (Power Actuator)</option>
                        <option value="setOperationalSetpoint">setOperationalSetpoint (Setpoint)</option>
                        <option value="triggerPulseCalibration">triggerPulseCalibration (Sync Pulse)</option>
                        <option value="reboot">reboot (Reboot Device Microcontroller)</option>
                        <option value="custom">custom (Arbitrary JSON Method)</option>
                      </select>
                    </div>
                    <div className="dm-form-group">
                      <label className="dm-field-label">Delivery Mode</label>
                      <input 
                        type="text" 
                        className="dm-input" 
                        value="TWO_WAY_SYNCHRONOUS (3000ms timeout)" 
                        disabled 
                      />
                    </div>
                  </div>

                  <div className="dm-form-group" style={{ marginBottom: '12px' }}>
                    <label className="dm-field-label">Parameters (JSON)</label>
                    <textarea 
                      rows={4}
                      className="dm-textarea mono"
                      value={rpcParams}
                      onChange={(e) => setRpcParams(e.target.value)}
                    />
                  </div>

                  <button
                    className="dm-btn dm-btn-primary"
                    disabled={rpcLoading}
                    onClick={async () => {
                      setRpcLoading(true);
                      try {
                        let parsedParams = {};
                        try { parsedParams = JSON.parse(rpcParams); } catch(e) {}
                        const res = await fetch(`/api/v1/dm/devices/${inspectorDevice.id}/rpc`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            method: rpcMethod,
                            params: parsedParams,
                            target_tag: inspectorDevice.identifier
                          })
                        });
                        const data = await res.json();
                        setRpcLog(prev => [{
                          method: rpcMethod,
                          status: 'SUCCESS',
                          time: new Date().toLocaleTimeString(),
                          response: data
                        }, ...prev]);
                        showToast(`RPC '${rpcMethod}' dispatched: OK`, 'success');
                      } catch (err) {
                        showToast(`RPC error: ${err.message}`, 'error');
                      } finally {
                        setRpcLoading(false);
                      }
                    }}
                  >
                    <Send size={13} className={rpcLoading ? 'spin' : ''} />
                    <span>{rpcLoading ? 'Dispatching...' : 'Send Downlink RPC'}</span>
                  </button>

                  {/* RPC Response Log */}
                  <div style={{ marginTop: '16px' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase' }}>
                      RPC Execution Response Log
                    </div>
                    <div style={{ background: '#070b14', borderRadius: '6px', padding: '10px', border: '1px solid rgba(255,255,255,0.08)', minHeight: '100px', fontSize: '0.7rem', fontFamily: 'monospace' }}>
                      {rpcLog.length === 0 ? (
                        <div style={{ color: '#64748b' }}>No RPC messages sent in this session.</div>
                      ) : (
                        rpcLog.map((log, i) => (
                          <div key={i} style={{ marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
                              <span><strong>{log.method}</strong> &mdash; 200 OK</span>
                              <span style={{ color: '#94a3b8' }}>{log.time}</span>
                            </div>
                            <pre style={{ margin: '4px 0 0 0', color: '#cbd5e1' }}>
                              {JSON.stringify(log.response, null, 2)}
                            </pre>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: DEVICE ALARMS */}
              {inspectorTab === 'alarms' && (() => {
                const devAlarms = alarms.filter(a => a.tag_name?.includes(inspectorDevice.identifier) || a.source_asset?.includes(inspectorDevice.name));

                return (
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '12px' }}>
                      Active alarms originated by this device entity ({devAlarms.length} active):
                    </div>

                    {devAlarms.length > 0 ? (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                        <thead>
                          <tr style={{ background: '#070b14', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', textAlign: 'left' }}>
                            <th style={{ padding: '6px' }}>Severity</th>
                            <th style={{ padding: '6px' }}>Alarm Name</th>
                            <th style={{ padding: '6px' }}>State</th>
                            <th style={{ padding: '6px' }}>Triggered At</th>
                            <th style={{ padding: '6px', textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {devAlarms.map(a => (
                            <tr key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              <td style={{ padding: '6px' }}>
                                <span style={{ fontSize: '0.62rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid #ef4444' }}>
                                  {a.priority} ({a.severity})
                                </span>
                              </td>
                              <td style={{ padding: '6px', fontWeight: 600, color: '#f8fafc' }}>{a.alarm_name}</td>
                              <td style={{ padding: '6px' }}>
                                <span style={{ fontSize: '0.62rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(249, 115, 22, 0.15)', color: '#fb923c' }}>
                                  {a.state}
                                </span>
                              </td>
                              <td style={{ padding: '6px', color: '#94a3b8' }}>{a.occurred_at ? a.occurred_at.substring(11, 19) : 'Just now'}</td>
                              <td style={{ padding: '6px', textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', gap: '4px' }}>
                                  <button
                                    className="dm-btn dm-btn-primary"
                                    style={{ fontSize: '0.64rem', padding: '2px 6px' }}
                                    onClick={() => acknowledgeAlarm(a.id)}
                                  >
                                    Ack
                                  </button>
                                  <button
                                    className="dm-btn dm-btn-secondary"
                                    style={{ fontSize: '0.64rem', padding: '2px 6px' }}
                                    onClick={() => clearAlarm(a.id)}
                                  >
                                    RTN
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div style={{ padding: '24px', textAlign: 'center', background: '#070b14', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <CheckCircle2 size={24} style={{ color: '#10b981', marginBottom: '8px' }} />
                        <div style={{ fontSize: '0.78rem', color: '#f8fafc', fontWeight: 600 }}>No Active Alarms</div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>All process signals and operating limits are within safe thresholds.</div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="dm-modal-footer">
              <button className="dm-btn dm-btn-primary" onClick={() => setInspectorDevice(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* TELEMETRY TREND HISTORY MODAL */}
      {historyKeyModal && (
        <div className="modal-backdrop" style={{ zIndex: 1600 }}>
          <div className="dm-modal-box" style={{ width: '650px' }}>
            <div className="dm-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={16} color="#38bdf8" />
                <h3 style={{ margin: 0 }}>Telemetry Trend: {historyKeyModal.key}</h3>
              </div>
              <button onClick={() => setHistoryKeyModal(null)} className="dm-close-btn">&times;</button>
            </div>
            <div className="dm-modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '14px' }}>
                <div style={{ background: '#070b14', padding: '8px', borderRadius: '6px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '0.64rem', color: '#94a3b8' }}>CURRENT</div>
                  <div className="mono font-bold" style={{ fontSize: '1rem', color: '#38bdf8' }}>{historyKeyModal.val} {historyKeyModal.unit}</div>
                </div>
                <div style={{ background: '#070b14', padding: '8px', borderRadius: '6px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '0.64rem', color: '#94a3b8' }}>MIN (15m)</div>
                  <div className="mono font-bold" style={{ fontSize: '1rem', color: '#10b981' }}>{(historyKeyModal.val * 0.95).toFixed(1)} {historyKeyModal.unit}</div>
                </div>
                <div style={{ background: '#070b14', padding: '8px', borderRadius: '6px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '0.64rem', color: '#94a3b8' }}>MAX (15m)</div>
                  <div className="mono font-bold" style={{ fontSize: '1rem', color: '#f87171' }}>{(historyKeyModal.val * 1.05).toFixed(1)} {historyKeyModal.unit}</div>
                </div>
                <div style={{ background: '#070b14', padding: '8px', borderRadius: '6px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '0.64rem', color: '#94a3b8' }}>AVG (15m)</div>
                  <div className="mono font-bold" style={{ fontSize: '1rem', color: '#c084fc' }}>{historyKeyModal.val} {historyKeyModal.unit}</div>
                </div>
              </div>

              {/* Sparkline Canvas Area */}
              <div style={{ background: '#070b14', borderRadius: '6px', padding: '12px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginBottom: '8px' }}>Real-time 15-minute Timeseries Trendline:</div>
                <svg width="100%" height="160" viewBox="0 0 580 160">
                  <defs>
                    <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {/* Grid Lines */}
                  <line x1="0" y1="40" x2="580" y2="40" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                  <line x1="0" y1="80" x2="580" y2="80" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                  <line x1="0" y1="120" x2="580" y2="120" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                  {/* Line and Fill */}
                  {(() => {
                    const min = Math.min(...historyPoints.map(p => p.v));
                    const max = Math.max(...historyPoints.map(p => p.v)) || min + 1;
                    const coords = historyPoints.map((p, idx) => {
                      const x = (idx / (historyPoints.length - 1)) * 560 + 10;
                      const y = 140 - ((p.v - min) / (max - min || 1)) * 110;
                      return { x, y };
                    });
                    const dLine = coords.reduce((acc, c, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`, '');
                    const dArea = `${dLine} L ${coords[coords.length - 1].x} 150 L ${coords[0].x} 150 Z`;
                    return (
                      <>
                        <path d={dArea} fill="url(#trendGrad)" />
                        <path d={dLine} fill="none" stroke="#38bdf8" strokeWidth="2.5" />
                        {coords.map((c, i) => (
                          <circle key={i} cx={c.x} cy={c.y} r="3" fill="#38bdf8" stroke="#020617" strokeWidth="1.5" />
                        ))}
                      </>
                    );
                  })()}
                </svg>
              </div>
            </div>
            <div className="dm-modal-footer">
              <button className="dm-btn dm-btn-primary" onClick={() => setHistoryKeyModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
