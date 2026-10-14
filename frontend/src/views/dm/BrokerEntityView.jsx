import React, { useState, useEffect } from 'react';
import { 
  Plus, Server, Shield, Radio, Wifi, Zap, Terminal, 
  Trash2, Play, Check, ExternalLink, RefreshCw, X,
  Copy, CheckCheck, Globe, Cpu, Cable, Code, ArrowRight,
  Sliders, Eye, Lock, FileText, CheckCircle, FolderTree,
  Folder, CornerDownRight, Send, Activity, Pause, Users
} from 'lucide-react';
import { useDM } from './dmContext';
import DMCommonControls from './DMCommonControls';

function OpcTreeNode({ node, selectedNode, onSelect, depth = 0 }) {
  const isSelected = selectedNode?.node_id === node.node_id;
  const isFolder = node.node_class === 'Folder' || node.node_class === 'Object';
  const hasChildren = node.children && node.children.length > 0;
  const [expanded, setExpanded] = useState(depth < 2);

  return (
    <div style={{ marginLeft: `${depth * 10}px`, marginTop: '2px' }}>
      <div 
        onClick={() => {
          if (hasChildren) setExpanded(!expanded);
          onSelect(node);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 8px',
          borderRadius: '4px',
          cursor: 'pointer',
          background: isSelected ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
          border: isSelected ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid transparent',
          color: isSelected ? '#10b981' : isFolder ? '#f8fafc' : '#94a3b8',
          fontSize: '0.73rem',
          transition: 'all 0.15s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
          {isFolder ? (
            <Folder size={13} color={expanded ? '#38bdf8' : '#64748b'} />
          ) : (
            <CornerDownRight size={12} color="#10b981" />
          )}
          <span style={{ fontWeight: isFolder ? 600 : 400, whiteSpace: 'nowrap' }}>
            {node.display_name || node.browse_name}
          </span>
        </div>
        {node.data_type && (
          <span className="mono" style={{ fontSize: '0.62rem', background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: '3px', color: '#38bdf8' }}>
            {node.data_type}
          </span>
        )}
      </div>

      {hasChildren && expanded && (
        <div style={{ borderLeft: '1px dashed rgba(255,255,255,0.08)', marginLeft: '6px' }}>
          {node.children.map((child, idx) => (
            <OpcTreeNode
              key={child.node_id || idx}
              node={child}
              selectedNode={selectedNode}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function BrokerEntityView() {
  const { brokers, createBroker, deleteBroker, devices = [], showToast } = useDM();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [brokerType, setBrokerType] = useState('OPC UA');
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testingBrokerId, setTestingBrokerId] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'opcua', 'socketio', 'mqtt', 'rest', 'modbus'

  // ThingsBoard Enhanced Broker Tabs: 'gateways' | 'sniffer' | 'sessions'
  const [brokerViewTab, setBrokerViewTab] = useState('gateways');
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishForm, setPublishForm] = useState({
    topic: 'v1/devices/me/telemetry',
    payload: JSON.stringify({ temperature: 94.2, pressure: 268.4, status: "RUNNING" }, null, 2),
    qos: 0,
    clientId: 'TB_TEST_PUB_01'
  });
  const [isPublishing, setIsPublishing] = useState(false);
  const [snifferPaused, setSnifferPaused] = useState(false);
  const [snifferFilter, setSnifferFilter] = useState('');
  const [snifferPackets, setSnifferPackets] = useState([]);

  // Client Sessions derived from actual registered DM Devices
  const clientSessions = (devices || []).map(dev => ({
    clientId: dev.device_id || dev.name || 'GATEWAY-01',
    ip: dev.ip_address || '127.0.0.1',
    proto: dev.protocol || 'MQTT v3.1.1',
    cleanSession: true,
    keepAlive: 60,
    subscriptions: Array.isArray(dev.metric_keys) ? dev.metric_keys.length : 4,
    connectedDuration: dev.status === 'ONLINE' ? 'Connected' : 'Offline',
    status: dev.status || 'CONNECTED'
  }));

  // Publish Test Packet to Broker
  const handlePublishTestPacket = async () => {
    setIsPublishing(true);
    try {
      let parsedPayload;
      try {
        parsedPayload = JSON.parse(publishForm.payload);
      } catch (err) {
        throw new Error('Payload must be valid JSON');
      }

      const res = await fetch('/api/v1/dm/brokers/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: publishForm.topic,
          payload: parsedPayload,
          qos: Number(publishForm.qos) || 0,
          client_id: publishForm.clientId
        })
      });

      if (res.ok) {
        const newPkt = {
          id: `pkt-pub-${Date.now().toString().slice(-4)}`,
          timestamp: new Date().toLocaleTimeString(),
          direction: 'OUT',
          topic: publishForm.topic,
          clientId: publishForm.clientId,
          qos: Number(publishForm.qos) || 0,
          size: JSON.stringify(parsedPayload).length,
          status: 'PUBLISHED_OK',
          payload: parsedPayload
        };
        setSnifferPackets(prev => [newPkt, ...prev]);
        setIsPublishModalOpen(false);
        showToast(`Published test packet to '${publishForm.topic}'`, 'success');
      } else {
        throw new Error('Server returned publish error');
      }
    } catch (e) {
      showToast(`Publish error: ${e.message}`, 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  // Dedicated Inspector State
  const [inspectedBroker, setInspectedBroker] = useState(null);
  const [inspectorTab, setInspectorTab] = useState('network'); // 'network' | 'auth' | 'topics' | 'devices' | 'opcua_nodes' | 'diagnostic' | 'raw'
  const [inspectorPingLoading, setInspectorPingLoading] = useState(false);
  const [inspectorPingResult, setInspectorPingResult] = useState(null);

  // OPC UA Address Space Explorer State
  const [isAddressSpaceModalOpen, setIsAddressSpaceModalOpen] = useState(false);
  const [addressSpaceData, setAddressSpaceData] = useState(null);
  const [addressSpaceLoading, setAddressSpaceLoading] = useState(false);
  const [selectedOpcNode, setSelectedOpcNode] = useState(null);
  const [opcNodeReadResult, setOpcNodeReadResult] = useState(null);
  const [opcWriteVal, setOpcWriteVal] = useState('');
  const [opcWriteResult, setOpcWriteResult] = useState(null);
  const [opcActionLoading, setOpcActionLoading] = useState(false);

  const [testForm, setTestForm] = useState({
    protocol: 'OPC_UA',
    host: '127.0.0.1',
    port: 4840,
    endpoint: 'opc.tcp://127.0.0.1:4840',
    unit_id: 1,
    timeout: 3.0
  });

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast(`Copied to clipboard: ${text}`, 'success');
    setTimeout(() => setCopiedKey(null), 2200);
  };

  const handleOpenAddressSpace = async () => {
    setIsAddressSpaceModalOpen(true);
    setAddressSpaceLoading(true);
    try {
      const res = await fetch('/api/v1/dm/brokers/opcua/browse');
      const data = await res.json();
      setAddressSpaceData(data.address_space);
      // Select first variable
      const root = data.address_space;
      const fcs = root?.children?.[0]?.children?.[1]?.children?.[0];
      const tic = fcs?.children?.[0]?.children?.[0];
      if (tic) {
        setSelectedOpcNode(tic);
        handleReadOpcNode(tic.node_id);
      }
    } catch (err) {
      showToast('Failed to load OPC UA Address Space: ' + err.message, 'error');
    } finally {
      setAddressSpaceLoading(false);
    }
  };

  const handleReadOpcNode = async (nodeId) => {
    if (!nodeId) return;
    setOpcActionLoading(true);
    try {
      const res = await fetch('/api/v1/dm/brokers/opcua/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ node_id: nodeId })
      });
      const data = await res.json();
      setOpcNodeReadResult(data);
      if (data.value !== undefined) setOpcWriteVal(String(data.value));
      showToast(`OPC UA Node Read: ${data.value} (${data.status_code})`, 'success');
    } catch (err) {
      showToast('Read error: ' + err.message, 'error');
    } finally {
      setOpcActionLoading(false);
    }
  };

  const handleWriteOpcNode = async (nodeId, val) => {
    if (!nodeId) return;
    setOpcActionLoading(true);
    try {
      let parsedVal = val;
      if (val === 'true') parsedVal = true;
      else if (val === 'false') parsedVal = false;
      else if (!isNaN(Number(val))) parsedVal = Number(val);

      const res = await fetch('/api/v1/dm/brokers/opcua/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ node_id: nodeId, value: parsedVal })
      });
      const data = await res.json();
      setOpcWriteResult(data);
      showToast(`OPC UA Written: ${data.written_value} (${data.status_code})`, 'success');
      handleReadOpcNode(nodeId);
    } catch (err) {
      showToast('Write error: ' + err.message, 'error');
    } finally {
      setOpcActionLoading(false);
    }
  };

  const runProtocolTest = async (payload) => {
    try {
      setTestLoading(true);
      const res = await fetch('/api/v1/dm/protocols/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setTestResult(data);
      if (data.success) {
        showToast(`${data.protocol} Connection OK (${data.latency_ms}ms)`, 'success');
      } else {
        showToast(`${data.protocol} Error: ${data.message}`, 'error');
      }
      return data;
    } catch (e) {
      const errRes = { success: false, status: 'ERROR', message: e.message };
      setTestResult(errRes);
      showToast(`Test error: ${e.message}`, 'error');
      return errRes;
    } finally {
      setTestLoading(false);
    }
  };

  const handleTestBrokerRow = async (b) => {
    setTestingBrokerId(b.id);
    let proto = 'MQTT';
    let port = b.port || 1883;
    let host = '127.0.0.1';
    let endpoint = b.endpoint_url || '';

    if (b.broker_type?.includes('OPC') || b.broker_type?.includes('OPC_UA')) {
      proto = 'OPC_UA';
      port = b.port || 4840;
      endpoint = b.endpoint_url || 'opc.tcp://127.0.0.1:4840';
    } else if (b.broker_type?.includes('Socket.IO') || b.broker_type?.includes('SocketIO')) {
      proto = 'SOCKETIO';
      port = 91;
      endpoint = 'http://127.0.0.1:91/socket.io/';
    } else if (b.broker_type?.includes('REST') || b.broker_type?.includes('HTTP')) {
      proto = 'HTTP';
      port = 91;
      endpoint = 'http://127.0.0.1:91/health';
    } else if (b.broker_type?.includes('CoAP')) {
      proto = 'TCP';
      port = 5683;
    } else if (b.broker_type?.includes('Modbus')) {
      proto = 'MODBUS';
      port = 502;
    }

    await runProtocolTest({ protocol: proto, host, port, endpoint });
    setTestingBrokerId(null);
  };

  const [formData, setFormData] = useState({
    name: 'CENTUM VP DCS & Industrial OPC UA Server Gateway',
    tier: 'IEC 62541 Standard',
    hub_units: 1,
    defender_for_iot: true,
    partitions: 4,
    sharing: true,
    connection_string: '',
    hub_name: '',
    throughput_units: 2,
    auto_inflate: true,
    max_throughput_units: 10,
    port: 4840,
    endpoint_url: 'opc.tcp://127.0.0.1:4840',
    path: '/yokogawa/server/',
    transports: ['opc.tcp'],
    events: ['DataChange', 'Events'],
    telemetry_topic: 'ns=2;s=Yokogawa.CENTUM_VP',
    command_topic: 'ns=2;s=Yokogawa.CENTUM_VP.Write',
    security_mode: 'SignAndEncrypt',
    security_policy: 'Basic256Sha256',
    scan_frequency_ms: 1000,
    deadband: 0.05,
    unit_id: 1,
    auth_type: 'Username / Password',
    username: 'oprex_operator',
    password: 'password123'
  });

  const columns = [
    { key: 'name', label: 'Broker Name' },
    { key: 'broker_type', label: 'Broker Type' },
    { key: 'endpoint_url', label: 'Ingestion Endpoint' },
    { key: 'tier', label: 'Tier / Spec' },
    { key: 'status', label: 'Status' },
    { key: 'messages_today', label: 'Messages Today' },
    { key: 'throughput_kb_min', label: 'Throughput (KB/min)' }
  ];

  // Helper to extract clean endpoint string
  const getBrokerEndpoint = (b) => {
    if (b.endpoint_url) return b.endpoint_url;
    if (b.connection_url) return b.connection_url;
    if (b.connection_string) {
      if (b.connection_string.startsWith('HostName=')) {
        return b.connection_string.split(';')[0];
      }
      if (b.connection_string.startsWith('Endpoint=')) {
        return b.connection_string.split(';')[0];
      }
      return b.connection_string.substring(0, 45) + '...';
    }
    if (b.broker_type?.includes('OPC')) return `opc.tcp://localhost:${b.port || 4840}`;
    if (b.broker_type === 'Socket.IO') return 'http://localhost:91/socket.io/';
    if (b.broker_type === 'MQTT') return `mqtt://localhost:${b.port || 1883}`;
    if (b.broker_type === 'Modbus TCP') return `modbus://localhost:${b.port || 502}`;
    if (b.broker_type === 'CoAP') return `coap://localhost:${b.port || 5683}`;
    if (b.broker_type === 'Broker REST API') return 'http://localhost:91/api/v1/dm/broker/ingest';
    return `Port ${b.port || 91}`;
  };

  const filteredBrokers = brokers.filter(b => {
    if (activeTab === 'all') return true;
    if (activeTab === 'opcua') return b.broker_type?.includes('OPC');
    if (activeTab === 'socketio') return b.broker_type?.includes('Socket.IO') || b.broker_type?.includes('SocketIO');
    if (activeTab === 'mqtt') return b.broker_type?.includes('MQTT');
    if (activeTab === 'rest') return b.broker_type?.includes('REST') || b.broker_type?.includes('HTTP');
    if (activeTab === 'modbus') return b.broker_type?.includes('Modbus');
    return true;
  });

  return (
    <div className="dm-entity-container">
      {/* Header Row */}
      <div className="dm-entity-header-row">
        <div>
          <h2 className="dm-page-title">Device Broker & Protocol Gateway Entity (Section 9.7)</h2>
          <p className="dm-page-subtitle">
            Ingestion endpoints managing bi-directional communication between field telemetry, Node-RED CSV streaming, and DM state.
          </p>
        </div>

        {/* Sub-Tabs Selector */}
        <div className="dm-btn-group">
          <button 
            className={`dm-btn ${brokerViewTab === 'gateways' ? 'dm-btn-primary' : 'dm-btn-secondary'}`}
            onClick={() => setBrokerViewTab('gateways')}
          >
            <Server size={13} />
            <span>Gateways ({brokers.length})</span>
          </button>
          <button 
            className={`dm-btn ${brokerViewTab === 'sniffer' ? 'dm-btn-primary' : 'dm-btn-secondary'}`}
            onClick={() => setBrokerViewTab('sniffer')}
          >
            <Radio size={13} />
            <span>MQTT Sniffer ({snifferPackets.length})</span>
          </button>
          <button 
            className={`dm-btn ${brokerViewTab === 'sessions' ? 'dm-btn-primary' : 'dm-btn-secondary'}`}
            onClick={() => setBrokerViewTab('sessions')}
          >
            <Users size={13} />
            <span>Client Sessions ({clientSessions.length})</span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="dm-btn dm-btn-secondary" 
            onClick={() => setIsPublishModalOpen(true)}
            title="Publish Test MQTT Packet"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', borderColor: '#38bdf8', color: '#38bdf8' }}
          >
            <Send size={13} /> <span>Publish Test Packet</span>
          </button>
          <button 
            className="dm-btn dm-btn-secondary" 
            onClick={() => { setTestResult(null); setIsTestModalOpen(true); }}
            title="Check Protocol Connection"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={13} /> <span>Diagnostic Ping</span>
          </button>
          <button className="dm-btn dm-btn-primary" onClick={() => setIsAddModalOpen(true)}>
            <Plus size={14} /> <span>Deploy Broker</span>
          </button>
        </div>
      </div>

      {brokerViewTab === 'gateways' && (
        <>
      {/* =========================================================================
          HERO STUDIO: ACTIVE INGESTION ENDPOINTS & SOCKET.IO CONFIGURATION
          ========================================================================= */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))',
        border: '1px solid rgba(56, 189, 248, 0.3)',
        borderRadius: '10px',
        padding: '16px',
        marginBottom: '18px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(56, 189, 248, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(56, 189, 248, 0.3)'
            }}>
              <Cable size={18} color="#38bdf8" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Device Brokers & Ingestion Endpoints Hub</span>
                <span style={{ fontSize: '0.65rem', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  ONLINE & LISTENING
                </span>
              </div>
              <div style={{ fontSize: '0.73rem', color: '#94a3b8', marginTop: '2px' }}>
                Direct URLs for connecting Node-RED flows, Python IoT scripts, MQTT publishers, and Modbus PLCs.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            {['all', 'opcua', 'socketio', 'mqtt', 'rest', 'modbus'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor: activeTab === tab ? '#10b981' : 'rgba(255,255,255,0.08)',
                  background: activeTab === tab ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                  color: activeTab === tab ? '#10b981' : '#94a3b8'
                }}
              >
                {tab === 'opcua' ? 'OPC UA' : tab.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* 5 Active Protocols Studio Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: '12px' }}>
          
          {/* Card 0: ThingsBoard OPC UA Server Gateway */}
          <div style={{
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '8px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Server size={15} color="#10b981" />
                  <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#f1f5f9' }}>OPC UA Server Gateway</span>
                </div>
                <span style={{ fontSize: '0.62rem', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '1px 6px', borderRadius: '3px', fontWeight: 600 }}>
                  Port 4840 (IEC 62541)
                </span>
              </div>

              <div style={{ marginTop: '8px', background: '#0b0f19', padding: '6px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="mono" style={{ fontSize: '0.72rem', color: '#10b981' }}>
                  opc.tcp://127.0.0.1:4840
                </span>
                <button
                  onClick={() => copyToClipboard('opc.tcp://127.0.0.1:4840', 'opcua-url')}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', color: copiedKey === 'opcua-url' ? '#10b981' : '#94a3b8' }}
                  title="Copy OPC UA URL"
                >
                  {copiedKey === 'opcua-url' ? <CheckCheck size={13} /> : <Copy size={13} />}
                </button>
              </div>

              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                  Security: <span className="mono" style={{ color: '#38bdf8' }}>Basic256Sha256 / SignAndEncrypt</span>
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                  Root Node: <span className="mono" style={{ color: '#e2e8f0' }}>ns=2;s=Yokogawa.CENTUM_VP</span>
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                  Scan Rate: <span style={{ color: '#10b981' }}>1000 ms (Publishing: 500 ms)</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '10px', display: 'flex', gap: '6px' }}>
              <button
                className="dm-btn dm-btn-secondary"
                style={{ flex: 1, padding: '4px 8px', fontSize: '0.7rem' }}
                onClick={() => runProtocolTest({ protocol: 'OPC_UA', host: '127.0.0.1', port: 4840, endpoint: 'opc.tcp://127.0.0.1:4840' })}
              >
                <RefreshCw size={11} className={testLoading ? "animate-spin" : ""} /> Test OPC UA
              </button>
              <button
                className="dm-btn dm-btn-secondary"
                style={{ padding: '4px 8px', fontSize: '0.7rem', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)' }}
                onClick={handleOpenAddressSpace}
                title="Browse OPC UA Address Space"
              >
                <FolderTree size={11} /> Browse Nodes
              </button>
            </div>
          </div>
          
          {/* Card 1: Socket.IO Protocol Configuration (Highlighted) */}
          <div style={{
            background: 'rgba(2, 132, 199, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            borderRadius: '8px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Zap size={15} color="#38bdf8" />
                  <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#f1f5f9' }}>Socket.IO Gateway</span>
                </div>
                <span style={{ fontSize: '0.62rem', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '1px 6px', borderRadius: '3px', fontWeight: 600 }}>
                  Port 91 (ASGI)
                </span>
              </div>

              <div style={{ marginTop: '8px', background: '#0b0f19', padding: '6px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="mono" style={{ fontSize: '0.72rem', color: '#38bdf8' }}>
                  http://localhost:91/socket.io/
                </span>
                <button
                  onClick={() => copyToClipboard('http://localhost:91/socket.io/', 'socketio-url')}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', color: copiedKey === 'socketio-url' ? '#10b981' : '#94a3b8' }}
                  title="Copy Socket.IO URL"
                >
                  {copiedKey === 'socketio-url' ? <CheckCheck size={13} /> : <Copy size={13} />}
                </button>
              </div>

              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                  Transports: <span className="mono" style={{ color: '#e2e8f0' }}>websocket, polling</span>
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                  Ingestion Events: <span className="mono" style={{ color: '#10b981' }}>telemetry</span>, <span className="mono" style={{ color: '#38bdf8' }}>csv_row</span>, <span className="mono" style={{ color: '#f59e0b' }}>csv_bulk</span>
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                  Node-RED Ingestion: <span style={{ color: '#38bdf8' }}>Section 4 Flow Ready</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '10px', display: 'flex', gap: '6px' }}>
              <button
                className="dm-btn dm-btn-secondary"
                style={{ flex: 1, padding: '4px 8px', fontSize: '0.7rem' }}
                onClick={() => runProtocolTest({ protocol: 'SOCKETIO', host: '127.0.0.1', port: 91, endpoint: 'http://127.0.0.1:91/socket.io/' })}
              >
                <RefreshCw size={11} className={testLoading ? "animate-spin" : ""} /> Test Socket.IO
              </button>
              <button
                className="dm-btn dm-btn-secondary"
                style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                onClick={() => copyToClipboard('{"topic":"telemetry","payload":{"FIC_101.PV":450.5,"PIC_101.PV":145.2}}', 'snippet-sio')}
                title="Copy Sample Socket.IO Payload"
              >
                <Code size={11} /> Copy JSON
              </button>
            </div>
          </div>

          {/* Card 2: MQTT Telemetry Broker */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Radio size={15} color="#10b981" />
                  <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#f1f5f9' }}>MQTT Field Broker</span>
                </div>
                <span style={{ fontSize: '0.62rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '1px 6px', borderRadius: '3px', fontWeight: 600 }}>
                  Port 1883 / 8883
                </span>
              </div>

              <div style={{ marginTop: '8px', background: '#0b0f19', padding: '6px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="mono" style={{ fontSize: '0.72rem', color: '#10b981' }}>
                  mqtt://localhost:1883
                </span>
                <button
                  onClick={() => copyToClipboard('mqtt://localhost:1883', 'mqtt-url')}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', color: copiedKey === 'mqtt-url' ? '#10b981' : '#94a3b8' }}
                  title="Copy MQTT URL"
                >
                  {copiedKey === 'mqtt-url' ? <CheckCheck size={13} /> : <Copy size={13} />}
                </button>
              </div>

              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                  Telemetry Topic: <span className="mono" style={{ color: '#e2e8f0' }}>refinery/telemetry/#</span>
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                  Command Topic: <span className="mono" style={{ color: '#e2e8f0' }}>refinery/command/#</span>
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                  Security: <span style={{ color: '#f59e0b' }}>TLS/SSL (Port 8883) Supported</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '10px', display: 'flex', gap: '6px' }}>
              <button
                className="dm-btn dm-btn-secondary"
                style={{ flex: 1, padding: '4px 8px', fontSize: '0.7rem' }}
                onClick={() => runProtocolTest({ protocol: 'MQTT', host: '127.0.0.1', port: 1883 })}
              >
                <RefreshCw size={11} className={testLoading ? "animate-spin" : ""} /> Test MQTT (1883)
              </button>
              <button
                className="dm-btn dm-btn-primary"
                style={{ padding: '4px 8px', fontSize: '0.7rem', background: '#10b981', borderColor: '#059669' }}
                onClick={async () => {
                  try {
                    const res = await fetch('/api/v1/dm/brokers/publish', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        broker_id: 'brk-5',
                        topic: 'v1/devices/me/telemetry',
                        qos: 1,
                        payload: {
                          "TIC_101.PV": 118.4,
                          "PIC_101.PV": 145.2,
                          "timestamp": new Date().toISOString()
                        }
                      })
                    });
                    if (res.ok) {
                      const data = await res.json();
                      showToast(`MQTT packet published on '${data.packet.topic}' (Size: ${data.packet.size_bytes}B)`, 'success');
                    }
                  } catch (e) {
                    showToast(`Publish error: ${e.message}`, 'error');
                  }
                }}
                title="Publish sample telemetry packet to MQTT Broker"
              >
                <Radio size={11} /> Publish Packet
              </button>
            </div>
          </div>

          {/* Card 3: REST & Webhook Ingestion */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Globe size={15} color="#f59e0b" />
                  <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#f1f5f9' }}>REST & CSV Push</span>
                </div>
                <span style={{ fontSize: '0.62rem', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '1px 6px', borderRadius: '3px', fontWeight: 600 }}>
                  HTTP REST (Port 91)
                </span>
              </div>

              <div style={{ marginTop: '8px', background: '#0b0f19', padding: '6px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="mono" style={{ fontSize: '0.72rem', color: '#f59e0b' }}>
                  POST /api/v1/dm/broker/ingest
                </span>
                <button
                  onClick={() => copyToClipboard('http://localhost:91/api/v1/dm/broker/ingest', 'rest-url')}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', color: copiedKey === 'rest-url' ? '#10b981' : '#94a3b8' }}
                  title="Copy REST Ingestion URL"
                >
                  {copiedKey === 'rest-url' ? <CheckCheck size={13} /> : <Copy size={13} />}
                </button>
              </div>

              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                  Batch CSV URL: <span className="mono" style={{ color: '#e2e8f0' }}>POST /api/v1/tags/ingest-csv</span>
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                  Realtime JSON: <span className="mono" style={{ color: '#e2e8f0' }}>POST /api/v1/tags/ingest</span>
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                  Format: <span style={{ color: '#e2e8f0' }}>JSON or Multipart CSV</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '10px' }}>
              <button
                className="dm-btn dm-btn-secondary"
                style={{ width: '100%', padding: '4px 8px', fontSize: '0.7rem' }}
                onClick={() => runProtocolTest({ protocol: 'HTTP', host: '127.0.0.1', port: 91, endpoint: 'http://127.0.0.1:91/health' })}
              >
                <RefreshCw size={11} className={testLoading ? "animate-spin" : ""} /> Test REST Health (Port 91)
              </button>
            </div>
          </div>

          {/* Card 4: Modbus TCP Gateway */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Cpu size={15} color="#a855f7" />
                  <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#f1f5f9' }}>Modbus TCP Gateway</span>
                </div>
                <span style={{ fontSize: '0.62rem', background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', padding: '1px 6px', borderRadius: '3px', fontWeight: 600 }}>
                  Port 502 / Unit 1
                </span>
              </div>

              <div style={{ marginTop: '8px', background: '#0b0f19', padding: '6px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="mono" style={{ fontSize: '0.72rem', color: '#a855f7' }}>
                  modbus://localhost:502
                </span>
                <button
                  onClick={() => copyToClipboard('modbus://localhost:502', 'modbus-url')}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', color: copiedKey === 'modbus-url' ? '#10b981' : '#94a3b8' }}
                  title="Copy Modbus URL"
                >
                  {copiedKey === 'modbus-url' ? <CheckCheck size={13} /> : <Copy size={13} />}
                </button>
              </div>

              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                  Function Code: <span className="mono" style={{ color: '#e2e8f0' }}>FC03 (Read Holding Regs)</span>
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                  PLC Unit ID: <span className="mono" style={{ color: '#e2e8f0' }}>1</span>
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                  Polling Interval: <span style={{ color: '#e2e8f0' }}>1000 ms</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '10px' }}>
              <button
                className="dm-btn dm-btn-secondary"
                style={{ width: '100%', padding: '4px 8px', fontSize: '0.7rem' }}
                onClick={() => runProtocolTest({ protocol: 'MODBUS', host: '127.0.0.1', port: 502, unit_id: 1 })}
              >
                <RefreshCw size={11} className={testLoading ? "animate-spin" : ""} /> Test Modbus TCP (Port 502)
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* =========================================================================
          BROKERS TABLE WITH INGESTION ENDPOINTS & PROTOCOL DETAILS
          ========================================================================= */}
      <div className="dm-tab-content-card">
        <DMCommonControls 
          columns={columns}
          totalRecords={filteredBrokers.length}
        />

        <div className="dm-table-scroll-container">
          <table className="dm-data-table">
            <thead>
              <tr>
                <th>Broker Name</th>
                <th>Technology</th>
                <th>Ingestion Endpoint / URL</th>
                <th>Edition / Spec</th>
                <th>Status</th>
                <th>Traffic / Today</th>
                <th>Throughput</th>
                <th style={{ textAlign: 'right', width: '120px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBrokers.map(b => {
                const endpointText = getBrokerEndpoint(b);
                const isSocketIO = b.broker_type?.includes('Socket.IO') || b.broker_type?.includes('SocketIO');
                const isMQTT = b.broker_type?.includes('MQTT');
                const isModbus = b.broker_type?.includes('Modbus');

                return (
                  <tr key={b.id} className="dm-table-row">
                    <td style={{ fontWeight: 600, color: '#f8fafc' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isSocketIO ? <Zap size={14} color="#38bdf8" /> :
                         isMQTT ? <Radio size={14} color="#10b981" /> :
                         isModbus ? <Cpu size={14} color="#a855f7" /> :
                         <Server size={14} color="#38bdf8" />}
                        <span>{b.name}</span>
                      </div>
                    </td>

                    <td>
                      <span className="dm-tree-badge" style={{
                        borderColor: isSocketIO ? '#38bdf8' : isMQTT ? '#10b981' : isModbus ? '#a855f7' : undefined,
                        color: isSocketIO ? '#38bdf8' : isMQTT ? '#10b981' : isModbus ? '#a855f7' : undefined
                      }}>
                        {b.broker_type}
                      </span>
                    </td>

                    {/* NEW COLUMN: INGESTION ENDPOINT / CONNECTION URL */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="mono" style={{
                          fontSize: '0.72rem',
                          background: 'rgba(255, 255, 255, 0.04)',
                          padding: '3px 7px',
                          borderRadius: '4px',
                          color: isSocketIO ? '#38bdf8' : isMQTT ? '#34d399' : '#e2e8f0',
                          maxWidth: '280px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {endpointText}
                        </span>
                        <button
                          onClick={() => copyToClipboard(endpointText, `row-${b.id}`)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: copiedKey === `row-${b.id}` ? '#10b981' : '#64748b',
                            padding: '2px'
                          }}
                          title="Copy Ingestion URL"
                        >
                          {copiedKey === `row-${b.id}` ? <CheckCheck size={12} /> : <Copy size={12} />}
                        </button>
                      </div>

                      {/* Event or Topic Pills */}
                      {isSocketIO && (
                        <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                          <span style={{ fontSize: '0.6rem', color: '#38bdf8', background: 'rgba(56,189,248,0.1)', padding: '1px 4px', borderRadius: '2px' }}>
                            events: telemetry, csv_row, csv_bulk
                          </span>
                        </div>
                      )}
                      {isMQTT && b.telemetry_topic && (
                        <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                          <span style={{ fontSize: '0.6rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '1px 4px', borderRadius: '2px' }}>
                            topic: {b.telemetry_topic}
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="mono" style={{ color: '#f59e0b', fontSize: '0.72rem' }}>
                      {b.tier || b.rfc_standard || (b.port ? `Port ${b.port}` : 'Standard')}
                    </td>

                    <td>
                      <span className="dm-health-badge connected">
                        <span className="dm-dot" />
                        {b.status}
                      </span>
                    </td>

                    <td className="mono" style={{ fontSize: '0.72rem' }}>{(b.messages_today || 0).toLocaleString()} msgs</td>
                    <td className="mono" style={{ color: '#10b981', fontSize: '0.72rem' }}>{b.throughput_kb_min || 0} KB/min</td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '4px' }}>
                        <button 
                          className="dm-row-action-btn primary"
                          onClick={() => {
                            setInspectedBroker(b);
                            setInspectorTab('network');
                            setInspectorPingResult(null);
                          }}
                          title={`Inspect All Configuration Details for ${b.name}`}
                          style={{ color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)' }}
                        >
                          <Sliders size={13} />
                        </button>
                        <button 
                          className="dm-row-action-btn primary"
                          onClick={() => handleTestBrokerRow(b)}
                          disabled={testingBrokerId === b.id}
                          title={`Test Protocol Connection to ${b.name}`}
                        >
                          <RefreshCw size={13} className={testingBrokerId === b.id ? "animate-spin" : ""} />
                        </button>
                        <button 
                          className="dm-row-action-btn delete"
                          onClick={() => {
                            if (window.confirm(`Delete broker '${b.name}'?`)) {
                              deleteBroker(b.id);
                            }
                          }}
                          title="Delete Broker"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* =========================================================================
          TAB: LIVE MQTT TOPIC MONITOR & PACKET SNIFFER
          ========================================================================= */}
      {brokerViewTab === 'sniffer' && (
        <div className="dm-tab-content-card" style={{ padding: '16px' }}>
          {/* Sniffer Top Stats Banner */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{ background: '#0b1329', padding: '12px', borderRadius: '8px', border: '1px solid rgba(56,189,248,0.2)' }}>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>PACKETS SNIFFED</div>
              <div className="mono font-bold" style={{ fontSize: '1.2rem', color: '#38bdf8', marginTop: '2px' }}>
                {snifferPackets.length}
              </div>
            </div>
            <div style={{ background: '#0b1329', padding: '12px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)' }}>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>INGRESS FLOW RATE</div>
              <div className="mono font-bold" style={{ fontSize: '1.2rem', color: '#10b981', marginTop: '2px' }}>
                ~1.2 msg / sec
              </div>
            </div>
            <div style={{ background: '#0b1329', padding: '12px', borderRadius: '8px', border: '1px solid rgba(168,85,247,0.2)' }}>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>ACTIVE MQTT TOPICS</div>
              <div className="mono font-bold" style={{ fontSize: '1.2rem', color: '#c084fc', marginTop: '2px' }}>
                4 Core Topics
              </div>
            </div>
            <div style={{ background: '#0b1329', padding: '12px', borderRadius: '8px', border: '1px solid rgba(234,179,8,0.2)' }}>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>SNIFFER STATUS</div>
              <div className="mono font-bold" style={{ fontSize: '1.2rem', color: snifferPaused ? '#f59e0b' : '#10b981', marginTop: '2px' }}>
                {snifferPaused ? 'PAUSED' : 'STREAMING'}
              </div>
            </div>
          </div>

          {/* Sniffer Controls Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ flex: 1, minWidth: '260px' }}>
              <input
                type="text"
                placeholder="Filter by topic, client ID or payload content..."
                value={snifferFilter}
                onChange={(e) => setSnifferFilter(e.target.value)}
                className="dm-input"
                style={{ fontSize: '0.75rem', padding: '6px 12px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="dm-btn dm-btn-secondary"
                onClick={() => setSnifferPaused(!snifferPaused)}
                style={{ borderColor: snifferPaused ? '#10b981' : '#f59e0b', color: snifferPaused ? '#10b981' : '#f59e0b', fontSize: '0.74rem' }}
              >
                {snifferPaused ? <Play size={13} /> : <Pause size={13} />}
                <span>{snifferPaused ? 'Resume Sniffer' : 'Pause Sniffer'}</span>
              </button>
              <button
                className="dm-btn dm-btn-secondary"
                onClick={() => setSnifferPackets([])}
                style={{ fontSize: '0.74rem' }}
              >
                <Trash2 size={13} />
                <span>Clear Buffer</span>
              </button>
              <button
                className="dm-btn dm-btn-primary"
                onClick={() => setIsPublishModalOpen(true)}
                style={{ fontSize: '0.74rem', background: '#38bdf8', borderColor: '#0284c7' }}
              >
                <Send size={13} />
                <span>Publish Test Packet</span>
              </button>
            </div>
          </div>

          {/* Packets Stream Table */}
          <div className="dm-table-scroll-container">
            <table className="dm-data-table">
              <thead>
                <tr>
                  <th style={{ width: '90px' }}>Time</th>
                  <th style={{ width: '60px' }}>Dir</th>
                  <th>MQTT Topic</th>
                  <th>Client Identifier</th>
                  <th style={{ width: '50px' }}>QoS</th>
                  <th style={{ width: '65px' }}>Size</th>
                  <th>Payload JSON Preview</th>
                  <th style={{ width: '80px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {snifferPackets.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                      <Radio size={28} style={{ margin: '0 auto 8px', color: '#475569' }} />
                      <div style={{ fontWeight: 600, color: '#f8fafc' }}>Packet Buffer Empty</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                        Waiting for real-time edge telemetry or click "Publish Test Packet" above.
                      </div>
                    </td>
                  </tr>
                ) : (
                  snifferPackets
                    .filter(pkt => {
                      if (!snifferFilter.trim()) return true;
                      const q = snifferFilter.toLowerCase();
                      return pkt.topic.toLowerCase().includes(q) ||
                             pkt.clientId.toLowerCase().includes(q) ||
                             JSON.stringify(pkt.payload).toLowerCase().includes(q);
                    })
                    .map(pkt => (
                    <tr key={pkt.id} className="dm-table-row">
                      <td className="mono" style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                        {pkt.timestamp}
                      </td>
                      <td>
                        <span style={{
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '3px',
                          background: pkt.direction === 'IN' ? 'rgba(16,185,129,0.15)' : 'rgba(56,189,248,0.15)',
                          color: pkt.direction === 'IN' ? '#10b981' : '#38bdf8',
                          border: `1px solid ${pkt.direction === 'IN' ? 'rgba(16,185,129,0.3)' : 'rgba(56,189,248,0.3)'}`
                        }}>
                          {pkt.direction}
                        </span>
                      </td>
                      <td className="mono" style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.74rem' }}>
                        {pkt.topic}
                      </td>
                      <td className="mono" style={{ color: '#c084fc', fontSize: '0.72rem' }}>
                        {pkt.clientId}
                      </td>
                      <td className="mono" style={{ fontSize: '0.7rem', color: '#f59e0b' }}>
                        QoS {pkt.qos}
                      </td>
                      <td className="mono" style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        {pkt.size} B
                      </td>
                      <td>
                        <pre className="mono" style={{
                          margin: 0,
                          fontSize: '0.68rem',
                          color: '#34d399',
                          background: '#040812',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          maxWidth: '480px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {JSON.stringify(pkt.payload)}
                        </pre>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => copyToClipboard(JSON.stringify(pkt.payload, null, 2), pkt.id)}
                          className="dm-row-action-btn"
                          title="Copy JSON Payload"
                        >
                          {copiedKey === pkt.id ? <CheckCheck size={12} color="#10b981" /> : <Copy size={12} />}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB: CLIENT SESSIONS INSPECTOR
          ========================================================================= */}
      {brokerViewTab === 'sessions' && (
        <div className="dm-tab-content-card" style={{ padding: '16px' }}>
          <div style={{ marginBottom: '14px' }}>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
              Active MQTT &amp; Protocol Gateway Client Sessions
            </h3>
            <p style={{ fontSize: '0.73rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
              Real-time connection states, keepalive timeouts, clean session flags, and active topic subscriptions per IoT client.
            </p>
          </div>

          <div className="dm-table-scroll-container">
            <table className="dm-data-table">
              <thead>
                <tr>
                  <th>Client Identifier</th>
                  <th>IP Address</th>
                  <th>Transport &amp; Protocol</th>
                  <th>Clean Session</th>
                  <th>Keep Alive</th>
                  <th>Subscriptions</th>
                  <th>Uptime / Connected</th>
                  <th>Session Status</th>
                </tr>
              </thead>
              <tbody>
                {clientSessions.map(cs => (
                  <tr key={cs.clientId} className="dm-table-row">
                    <td className="mono" style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.74rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Wifi size={13} color="#10b981" />
                        <span>{cs.clientId}</span>
                      </div>
                    </td>
                    <td className="mono" style={{ fontSize: '0.72rem', color: '#38bdf8' }}>
                      {cs.ip}
                    </td>
                    <td>
                      <span className="dm-tree-badge">{cs.proto}</span>
                    </td>
                    <td className="mono" style={{ fontSize: '0.72rem', color: cs.cleanSession ? '#10b981' : '#f59e0b' }}>
                      {cs.cleanSession ? 'True' : 'False'}
                    </td>
                    <td className="mono" style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                      {cs.keepAlive}s
                    </td>
                    <td className="mono" style={{ fontSize: '0.72rem', color: '#c084fc', fontWeight: 600 }}>
                      {cs.subscriptions} topics
                    </td>
                    <td className="mono" style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                      {cs.connectedDuration}
                    </td>
                    <td>
                      <span className="dm-health-badge connected">
                        <span className="dm-dot" />
                        {cs.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          DEPLOY DATA BROKER MODAL (WITH SOCKET.IO & MODBUS TCP)
          ========================================================================= */}
      {isAddModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1400 }}>
          <div className="dm-modal-box" style={{ width: '680px' }}>
            <div className="dm-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Server size={18} color="#38bdf8" />
                <h3>Deploy Data Broker & Ingestion Connector</h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="dm-close-btn">&times;</button>
            </div>

            <div className="dm-modal-body">
              <div className="dm-form-grid-2">
                <div className="dm-form-group">
                  <label className="dm-field-label">Broker Name</label>
                  <input 
                    type="text"
                    className="dm-input"
                    placeholder="e.g. Node-RED CSV Ingestion Gateway"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="dm-form-group">
                  <label className="dm-field-label">Technology Connector</label>
                  <select 
                    className="dm-select"
                    value={brokerType}
                    onChange={(e) => {
                      const type = e.target.value;
                      setBrokerType(type);
                      if (type === 'OPC UA') {
                        setFormData({
                          ...formData,
                          name: 'CENTUM VP DCS & Industrial OPC UA Server Gateway',
                          endpoint_url: 'opc.tcp://127.0.0.1:4840',
                          port: 4840,
                          tier: 'IEC 62541 Standard',
                          security_mode: 'SignAndEncrypt',
                          security_policy: 'Basic256Sha256',
                          auth_type: 'Username / Password',
                          username: 'oprex_operator',
                          password: '••••••••',
                          scan_frequency_ms: 1000,
                          deadband: 0.05,
                          root_node_id: 'ns=2;s=Yokogawa.CENTUM_VP.FCS0101'
                        });
                      } else if (type === 'Socket.IO') {
                        setFormData({
                          ...formData,
                          endpoint_url: 'http://localhost:91/socket.io/',
                          port: 91,
                          tier: 'Real-Time Engine.IO v4'
                        });
                      } else if (type === 'Modbus TCP') {
                        setFormData({
                          ...formData,
                          endpoint_url: 'modbus://localhost:502',
                          port: 502,
                          tier: 'Industrial PLC Bus'
                        });
                      } else if (type === 'MQTT') {
                        setFormData({
                          ...formData,
                          endpoint_url: 'mqtt://localhost:1883',
                          port: 1883,
                          tier: 'M2M Queuing'
                        });
                      } else if (type === 'Broker REST API') {
                        setFormData({
                          ...formData,
                          endpoint_url: 'http://localhost:91/api/v1/dm/broker/ingest',
                          port: 91,
                          tier: 'Standard RESTful'
                        });
                      }
                    }}
                  >
                    <option value="OPC UA">OPC UA (IEC 62541 Industrial DCS/PLC Gateway Port 4840)</option>
                    <option value="Socket.IO">Socket.IO (High-frequency event stream & Node-RED CSV)</option>
                    <option value="MQTT">MQTT (M2M Queuing / SSL Port 1883/8883)</option>
                    <option value="Modbus TCP">Modbus TCP (Industrial PLC Bus Port 502)</option>
                    <option value="Broker REST API">Broker REST API (Standard RESTful / Ingestion Webhook)</option>
                    <option value="Azure IoT Hub">Azure IoT Hub (Bi-directional Cloud Broker)</option>
                    <option value="Azure Event Hub">Azure Event Hub (High-throughput streaming)</option>
                    <option value="CoAP">CoAP (RFC 7252 / RFC 7519 JWT Port 5683)</option>
                  </select>
                </div>
              </div>

              {/* OPC UA Specific Configuration */}
              {brokerType === 'OPC UA' && (
                <div className="dm-broker-specific-box" style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', padding: '12px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#10b981', marginBottom: '8px' }}>
                    ThingsBoard IEC 62541 OPC UA Server Connection Parameters
                  </div>
                  <div className="dm-form-grid-2">
                    <div className="dm-form-group">
                      <label className="dm-field-label">OPC UA Endpoint URL</label>
                      <input 
                        type="text"
                        className="dm-input mono"
                        value={formData.endpoint_url}
                        onChange={(e) => setFormData({ ...formData, endpoint_url: e.target.value })}
                        placeholder="opc.tcp://127.0.0.1:4840"
                      />
                    </div>
                    <div className="dm-form-group">
                      <label className="dm-field-label">Port (Standard 4840)</label>
                      <input 
                        type="number"
                        className="dm-input mono"
                        value={formData.port}
                        onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="dm-form-grid-2">
                    <div className="dm-form-group">
                      <label className="dm-field-label">Security Mode</label>
                      <select 
                        className="dm-select"
                        value={formData.security_mode || 'SignAndEncrypt'}
                        onChange={(e) => setFormData({ ...formData, security_mode: e.target.value })}
                      >
                        <option value="SignAndEncrypt">SignAndEncrypt (Enterprise Industrial)</option>
                        <option value="Sign">Sign (Signature Only)</option>
                        <option value="None">None (Unencrypted Local Lab)</option>
                      </select>
                    </div>
                    <div className="dm-form-group">
                      <label className="dm-field-label">Security Policy</label>
                      <select 
                        className="dm-select"
                        value={formData.security_policy || 'Basic256Sha256'}
                        onChange={(e) => setFormData({ ...formData, security_policy: e.target.value })}
                      >
                        <option value="Basic256Sha256">Basic256Sha256 (High Security)</option>
                        <option value="Aes128_Sha256_RsaOaep">Aes128_Sha256_RsaOaep</option>
                        <option value="Basic256">Basic256</option>
                        <option value="None">None</option>
                      </select>
                    </div>
                  </div>

                  <div className="dm-form-grid-2">
                    <div className="dm-form-group">
                      <label className="dm-field-label">Authentication Method</label>
                      <select 
                        className="dm-select"
                        value={formData.auth_type || 'Username / Password'}
                        onChange={(e) => setFormData({ ...formData, auth_type: e.target.value })}
                      >
                        <option value="Username / Password">Username / Password</option>
                        <option value="Anonymous">Anonymous</option>
                        <option value="Certificate / X.509">Certificate / X.509</option>
                      </select>
                    </div>
                    <div className="dm-form-group">
                      <label className="dm-field-label">Scan Frequency (ms)</label>
                      <input 
                        type="number"
                        className="dm-input mono"
                        value={formData.scan_frequency_ms || 1000}
                        onChange={(e) => setFormData({ ...formData, scan_frequency_ms: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="dm-form-group">
                    <label className="dm-field-label">Root Node ID / Hierarchy Prefix</label>
                    <input 
                      type="text"
                      className="dm-input mono"
                      value={formData.root_node_id || 'ns=2;s=Yokogawa.CENTUM_VP.FCS0101'}
                      onChange={(e) => setFormData({ ...formData, root_node_id: e.target.value })}
                      placeholder="ns=2;s=Yokogawa.CENTUM_VP.FCS0101"
                    />
                  </div>
                </div>
              )}

              {/* Socket.IO Specific Configuration */}
              {brokerType === 'Socket.IO' && (
                <div className="dm-broker-specific-box" style={{ background: 'rgba(2, 132, 199, 0.08)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '6px', padding: '12px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#38bdf8', marginBottom: '8px' }}>
                    Socket.IO Protocol & Node-RED Ingestion Parameters
                  </div>
                  <div className="dm-form-grid-2">
                    <div className="dm-form-group">
                      <label className="dm-field-label">Socket.IO Gateway Path</label>
                      <input 
                        type="text"
                        className="dm-input mono"
                        value={formData.path}
                        onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                        placeholder="/socket.io/"
                      />
                    </div>
                    <div className="dm-form-group">
                      <label className="dm-field-label">Gateway Service Port</label>
                      <input 
                        type="number"
                        className="dm-input mono"
                        value={formData.port}
                        onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="dm-form-grid-2">
                    <div className="dm-form-group">
                      <label className="dm-field-label">Ingestion Event Names (Comma-separated)</label>
                      <input 
                        type="text"
                        className="dm-input mono"
                        value={formData.events.join(', ')}
                        onChange={(e) => setFormData({ ...formData, events: e.target.value.split(',').map(s => s.trim()) })}
                        placeholder="telemetry, csv_row, csv_bulk"
                      />
                    </div>
                    <div className="dm-form-group">
                      <label className="dm-field-label">Allowed Transports</label>
                      <input 
                        type="text"
                        className="dm-input mono"
                        value={formData.transports.join(', ')}
                        onChange={(e) => setFormData({ ...formData, transports: e.target.value.split(',').map(s => s.trim()) })}
                        placeholder="websocket, polling"
                      />
                    </div>
                  </div>

                  <div className="dm-form-group">
                    <label className="dm-field-label">Full Client Connection URL</label>
                    <input 
                      type="text"
                      className="dm-input mono"
                      value={formData.endpoint_url}
                      onChange={(e) => setFormData({ ...formData, endpoint_url: e.target.value })}
                      placeholder="http://localhost:91/socket.io/"
                    />
                  </div>
                </div>
              )}

              {/* Modbus TCP Specific Configuration */}
              {brokerType === 'Modbus TCP' && (
                <div className="dm-broker-specific-box" style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '6px', padding: '12px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#c084fc', marginBottom: '8px' }}>
                    Modbus TCP Gateway Settings
                  </div>
                  <div className="dm-form-grid-2">
                    <div className="dm-form-group">
                      <label className="dm-field-label">Port (Standard 502)</label>
                      <input 
                        type="number"
                        className="dm-input mono"
                        value={formData.port}
                        onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })}
                      />
                    </div>
                    <div className="dm-form-group">
                      <label className="dm-field-label">PLC Slave / Unit ID</label>
                      <input 
                        type="number"
                        className="dm-input mono"
                        value={formData.unit_id}
                        onChange={(e) => setFormData({ ...formData, unit_id: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* MQTT Specific Configuration */}
              {brokerType === 'MQTT' && (
                <div className="dm-broker-specific-box" style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', padding: '12px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#34d399', marginBottom: '8px' }}>
                    MQTT Field Broker Settings
                  </div>
                  <div className="dm-form-grid-2">
                    <div className="dm-form-group">
                      <label className="dm-field-label">MQTT Port (1883 or 8883 SSL)</label>
                      <input 
                        type="number"
                        className="dm-input mono"
                        value={formData.port}
                        onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })}
                      />
                    </div>
                    <div className="dm-form-group">
                      <label className="dm-field-label">Telemetry Ingest Topic</label>
                      <input 
                        type="text"
                        className="dm-input mono"
                        value={formData.telemetry_topic}
                        onChange={(e) => setFormData({ ...formData, telemetry_topic: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Azure IoT Hub Options */}
              {brokerType === 'Azure IoT Hub' && (
                <div className="dm-broker-specific-box">
                  <div className="dm-form-grid-2">
                    <div className="dm-form-group">
                      <label className="dm-field-label">IoT Hub Tier</label>
                      <select 
                        className="dm-select"
                        value={formData.tier}
                        onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                      >
                        <option value="S1">S1 (400k msgs/day, 1111 KB/min, Bi-directional)</option>
                        <option value="S2">S2 (6M msgs/day, 16 MB/min, Bi-directional)</option>
                        <option value="S3">S3 (300M msgs/day, 814 MB/min, Bi-directional)</option>
                      </select>
                    </div>
                    <div className="dm-form-group">
                      <label className="dm-field-label">Number of Hub Units (1-200)</label>
                      <input 
                        type="number"
                        className="dm-input"
                        value={formData.hub_units}
                        onChange={(e) => setFormData({ ...formData, hub_units: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="dm-form-group" style={{ marginTop: '12px' }}>
                <label className="dm-field-label">Endpoint Connection String / URL</label>
                <input 
                  type="text"
                  className="dm-input mono"
                  placeholder="http://localhost:91/socket.io/ or HostName=..."
                  value={formData.endpoint_url || formData.connection_string}
                  onChange={(e) => setFormData({ ...formData, endpoint_url: e.target.value, connection_string: e.target.value })}
                />
              </div>
            </div>

            <div className="dm-modal-footer">
              <button className="dm-btn dm-btn-secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
              <button 
                className="dm-btn dm-btn-primary"
                onClick={() => {
                  if (!formData.name) return;
                  createBroker({
                    ...formData,
                    broker_type: brokerType
                  });
                  setIsAddModalOpen(false);
                }}
              >
                Deploy Data Broker
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          PROTOCOL CONNECTION TEST MODAL
          ========================================================================= */}
      {isTestModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1400 }}>
          <div className="dm-modal-box" style={{ width: '600px' }}>
            <div className="dm-modal-header">
              <h3>Industrial Protocol Connection Verification Studio</h3>
              <button onClick={() => setIsTestModalOpen(false)} className="dm-close-btn">&times;</button>
            </div>
            <div className="dm-modal-body">
              <p className="dm-modal-desc">
                Test live physical and application-layer connectivity to field gateways, industrial brokers, and streaming protocols.
              </p>

              <div className="dm-form-grid-2">
                <div className="dm-form-group">
                  <label className="dm-field-label">Target Protocol</label>
                  <select
                    className="dm-select"
                    value={testForm.protocol}
                    onChange={(e) => {
                      const p = e.target.value;
                      let port = 1883;
                      let endpoint = '';
                      if (p === 'MODBUS') { port = 502; endpoint = ''; }
                      if (p === 'OPCUA') { port = 4840; endpoint = 'opc.tcp://127.0.0.1:4840'; }
                      if (p === 'SOCKETIO') { port = 91; endpoint = 'http://127.0.0.1:91/socket.io/'; }
                      if (p === 'HTTP') { port = 91; endpoint = 'http://127.0.0.1:91/health'; }
                      if (p === 'TCP') { port = 80; endpoint = ''; }
                      setTestForm({ ...testForm, protocol: p, port, endpoint });
                    }}
                  >
                    <option value="SOCKETIO">Socket.IO Ingestion Engine (Engine.IO v4)</option>
                    <option value="MQTT">MQTT Broker (Port 1883 / 8883)</option>
                    <option value="MODBUS">Modbus TCP (Port 502)</option>
                    <option value="HTTP">HTTP / REST Gateway Webhook</option>
                    <option value="OPCUA">OPC-UA Server (IEC 62541)</option>
                    <option value="TCP">Raw TCP Stream Socket</option>
                  </select>
                </div>

                <div className="dm-form-group">
                  <label className="dm-field-label">Host / IP Address</label>
                  <input
                    type="text"
                    className="dm-input mono"
                    value={testForm.host}
                    onChange={(e) => setTestForm({ ...testForm, host: e.target.value })}
                    placeholder="127.0.0.1 or broker.hivemq.com"
                  />
                </div>
              </div>

              <div className="dm-form-grid-2">
                <div className="dm-form-group">
                  <label className="dm-field-label">Port</label>
                  <input
                    type="number"
                    className="dm-input mono"
                    value={testForm.port}
                    onChange={(e) => setTestForm({ ...testForm, port: Number(e.target.value) })}
                  />
                </div>

                {testForm.protocol === 'MODBUS' ? (
                  <div className="dm-form-group">
                    <label className="dm-field-label">Modbus Slave / Unit ID</label>
                    <input
                      type="number"
                      className="dm-input mono"
                      value={testForm.unit_id}
                      onChange={(e) => setTestForm({ ...testForm, unit_id: Number(e.target.value) })}
                    />
                  </div>
                ) : (
                  <div className="dm-form-group">
                    <label className="dm-field-label">Timeout (Seconds)</label>
                    <input
                      type="number"
                      step="0.5"
                      className="dm-input mono"
                      value={testForm.timeout}
                      onChange={(e) => setTestForm({ ...testForm, timeout: Number(e.target.value) })}
                    />
                  </div>
                )}
              </div>

              {(testForm.protocol === 'SOCKETIO' || testForm.protocol === 'HTTP' || testForm.protocol === 'OPCUA') && (
                <div className="dm-form-group">
                  <label className="dm-field-label">Direct Endpoint URL</label>
                  <input
                    type="text"
                    className="dm-input mono"
                    placeholder="http://127.0.0.1:91/socket.io/"
                    value={testForm.endpoint}
                    onChange={(e) => setTestForm({ ...testForm, endpoint: e.target.value })}
                  />
                </div>
              )}

              {/* Diagnostic Test Result Banner */}
              {testResult && (
                <div style={{
                  marginTop: '12px',
                  padding: '12px',
                  borderRadius: '6px',
                  border: testResult.success ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
                  background: testResult.success ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      color: testResult.success ? '#10b981' : '#ef4444'
                    }}>
                      {testResult.status}: {testResult.message}
                    </span>
                    {testResult.latency_ms !== undefined && (
                      <span className="mono" style={{ fontSize: '0.72rem', color: '#38bdf8' }}>
                        Latency: {testResult.latency_ms} ms
                      </span>
                    )}
                  </div>
                  {testResult.details && (
                    <div className="mono" style={{ marginTop: '6px', fontSize: '0.68rem', color: '#94a3b8' }}>
                      Target: {testResult.target} | {JSON.stringify(testResult.details)}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="dm-modal-footer">
              <button className="dm-btn dm-btn-secondary" onClick={() => setIsTestModalOpen(false)}>Close</button>
              <button
                className="dm-btn dm-btn-primary"
                onClick={() => runProtocolTest(testForm)}
                disabled={testLoading}
              >
                <RefreshCw size={13} className={testLoading ? "animate-spin" : ""} />
                <span>{testLoading ? 'Checking...' : 'Run Diagnostics Ping'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          POINT 1: BROKER FULL CONFIGURATION DETAILS INSPECTOR MODAL
          ========================================================================= */}
      {inspectedBroker && (
        <div className="modal-backdrop" style={{ zIndex: 1500 }}>
          <div className="dm-modal-box" style={{ width: '850px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            {/* Modal Header */}
            <div className="dm-modal-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  padding: '8px',
                  borderRadius: '8px',
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  color: '#38bdf8'
                }}>
                  <Sliders size={20} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#f8fafc' }}>{inspectedBroker.name}</h3>
                    <span style={{
                      fontSize: '0.65rem',
                      fontFamily: 'JetBrains Mono, monospace',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#10b981',
                      fontWeight: 700
                    }}>
                      {inspectedBroker.status || 'ONLINE'}
                    </span>
                    <span style={{
                      fontSize: '0.65rem',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      background: 'rgba(56, 189, 248, 0.12)',
                      color: '#38bdf8'
                    }}>
                      {inspectedBroker.broker_type}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px', fontFamily: 'JetBrains Mono, monospace' }}>
                    Broker ID: {inspectedBroker.id} | Tier: {inspectedBroker.tier || 'Enterprise Standard'}
                  </div>
                </div>
              </div>

              <button onClick={() => setInspectedBroker(null)} className="dm-close-btn">&times;</button>
            </div>

            {/* Inspector Tab Selector */}
            <div style={{
              display: 'flex',
              gap: '6px',
              padding: '10px 16px',
              background: '#070a11',
              borderBottom: '1px solid rgba(255,255,255,0.06)'
            }}>
              {[
                { id: 'network', label: 'Network & Endpoint', icon: <Wifi size={13} /> },
                { id: 'auth', label: 'Authentication & Security', icon: <Lock size={13} /> },
                { id: 'topics', label: 'Topics & Routing', icon: <Radio size={13} /> },
                ...(inspectedBroker.broker_type?.includes('OPC') ? [{ id: 'opcua_nodes', label: 'OPC UA Address Space & Nodes', icon: <FolderTree size={13} /> }] : []),
                { id: 'devices', label: `Bound Devices (${(devices.filter(d => d.broker_id === inspectedBroker.id || d.broker === inspectedBroker.name)).length})`, icon: <Cpu size={13} /> },
                { id: 'diagnostic', label: 'Diagnostic Ping', icon: <Zap size={13} /> },
                { id: 'raw', label: 'Raw Config JSON', icon: <Code size={13} /> }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setInspectorTab(t.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.73rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: inspectorTab === t.id ? '#38bdf8' : 'rgba(255,255,255,0.06)',
                    background: inspectorTab === t.id ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                    color: inspectorTab === t.id ? '#38bdf8' : '#94a3b8'
                  }}
                >
                  {t.icon}
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            {/* Inspector Body */}
            <div className="dm-modal-body" style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              
              {/* TAB 1: Network & Endpoint */}
              {inspectorTab === 'network' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '12px',
                    background: 'rgba(255,255,255,0.02)',
                    padding: '14px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.06)'
                  }}>
                    <div>
                      <div className="dm-field-label" style={{ marginBottom: '2px' }}>Transport Protocol</div>
                      <div className="mono" style={{ fontSize: '0.82rem', color: '#38bdf8', fontWeight: 600 }}>
                        {inspectedBroker.broker_type}
                      </div>
                    </div>
                    <div>
                      <div className="dm-field-label" style={{ marginBottom: '2px' }}>Listening Port</div>
                      <div className="mono" style={{ fontSize: '0.82rem', color: '#10b981', fontWeight: 600 }}>
                        {inspectedBroker.port || 91} (TCP / IP)
                      </div>
                    </div>
                    <div>
                      <div className="dm-field-label" style={{ marginBottom: '2px' }}>Host / Bind Address</div>
                      <div className="mono" style={{ fontSize: '0.82rem', color: '#f8fafc' }}>
                        0.0.0.0 (All Network Interfaces)
                      </div>
                    </div>
                    <div>
                      <div className="dm-field-label" style={{ marginBottom: '2px' }}>TLS / SSL Encryption</div>
                      <div style={{ fontSize: '0.82rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle size={13} /> Active (TLS 1.3 / WSS Supported)
                      </div>
                    </div>
                    <div>
                      <div className="dm-field-label" style={{ marginBottom: '2px' }}>Heartbeat / Keepalive Interval</div>
                      <div className="mono" style={{ fontSize: '0.82rem', color: '#f8fafc' }}>
                        60 seconds (Auto-Ping pingTimeout: 20000ms)
                      </div>
                    </div>
                    <div>
                      <div className="dm-field-label" style={{ marginBottom: '2px' }}>Transport Engines</div>
                      <div className="mono" style={{ fontSize: '0.82rem', color: '#e2e8f0' }}>
                        {(inspectedBroker.transports || ['websocket', 'polling']).join(', ')}
                      </div>
                    </div>
                  </div>

                  {/* Primary Connection String / URL with Copy */}
                  <div>
                    <label className="dm-field-label">Direct Ingestion Endpoint URL</label>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <input
                        type="text"
                        readOnly
                        value={getBrokerEndpoint(inspectedBroker)}
                        className="dm-input mono"
                        style={{ flex: 1, color: '#38bdf8', background: '#0b0f19' }}
                      />
                      <button
                        className="dm-btn dm-btn-secondary"
                        onClick={() => copyToClipboard(getBrokerEndpoint(inspectedBroker), 'insp-endpoint')}
                      >
                        {copiedKey === 'insp-endpoint' ? <CheckCheck size={14} color="#10b981" /> : <Copy size={14} />}
                        <span>Copy URL</span>
                      </button>
                    </div>
                  </div>

                  {/* Connection String */}
                  {inspectedBroker.connection_string && (
                    <div>
                      <label className="dm-field-label">Master Connection String</label>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <input
                          type="text"
                          readOnly
                          value={inspectedBroker.connection_string}
                          className="dm-input mono"
                          style={{ flex: 1, color: '#e2e8f0', background: '#0b0f19' }}
                        />
                        <button
                          className="dm-btn dm-btn-secondary"
                          onClick={() => copyToClipboard(inspectedBroker.connection_string, 'insp-conn-str')}
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: Authentication & Security */}
              {inspectorTab === 'auth' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '12px',
                    background: 'rgba(255,255,255,0.02)',
                    padding: '14px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.06)'
                  }}>
                    <div>
                      <div className="dm-field-label" style={{ marginBottom: '2px' }}>Authentication Strategy</div>
                      <div style={{ fontSize: '0.82rem', color: '#f8fafc', fontWeight: 600 }}>
                        {inspectedBroker.auth_type || 'Bearer Token / HMAC SharedAccessKey'}
                      </div>
                    </div>
                    <div>
                      <div className="dm-field-label" style={{ marginBottom: '2px' }}>Defender for IoT Guard</div>
                      <div style={{ fontSize: '0.82rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Shield size={13} /> Active (Threat Inspection Enabled)
                      </div>
                    </div>
                    <div>
                      <div className="dm-field-label" style={{ marginBottom: '2px' }}>Tenant Isolation Mode</div>
                      <div className="mono" style={{ fontSize: '0.82rem', color: '#f8fafc' }}>
                        Multi-Tenant Partitioned (PID Namespace)
                      </div>
                    </div>
                    <div>
                      <div className="dm-field-label" style={{ marginBottom: '2px' }}>Access Scope Privileges</div>
                      <div className="mono" style={{ fontSize: '0.82rem', color: '#38bdf8' }}>
                        DeviceConnect, RegistryRead, ServiceBusPublish
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="dm-field-label">Sample Node-RED / Client Auth Header</label>
                    <pre className="mono" style={{
                      background: '#070a11',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255,255,255,0.08)',
                      fontSize: '0.72rem',
                      color: '#a5f3fc'
                    }}>
{`// HTTP Headers
{
  "Content-Type": "application/json",
  "X-AHI-Broker-ID": "${inspectedBroker.id}",
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ahi_field_gateway"
}`}
                    </pre>
                  </div>
                </div>
              )}

              {/* TAB 3: Topics & Routing */}
              {inspectorTab === 'topics' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{
                    background: 'rgba(255,255,255,0.02)',
                    padding: '14px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.06)'
                  }}>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#f8fafc', marginBottom: '8px' }}>
                      Inbound & Outbound Channels
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                      <div>
                        <span className="dm-field-label">Telemetry Ingest Topic</span>
                        <div className="mono" style={{ fontSize: '0.8rem', color: '#10b981', background: '#0a0d14', padding: '6px 8px', borderRadius: '4px', border: '1px solid rgba(16,185,129,0.3)', marginTop: '4px' }}>
                          {inspectedBroker.telemetry_topic || 'refinery/telemetry/#'}
                        </div>
                      </div>
                      <div>
                        <span className="dm-field-label">Cloud-to-Device Command Topic</span>
                        <div className="mono" style={{ fontSize: '0.8rem', color: '#38bdf8', background: '#0a0d14', padding: '6px 8px', borderRadius: '4px', border: '1px solid rgba(56,189,248,0.3)', marginTop: '4px' }}>
                          {inspectedBroker.command_topic || 'refinery/command/#'}
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: '12px' }}>
                      <span className="dm-field-label">Socket.IO Ingestion Events</span>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        {['telemetry', 'csv_row', 'csv_bulk', 'device_ping'].map(ev => (
                          <span key={ev} className="mono" style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: 'rgba(56, 189, 248, 0.12)',
                            border: '1px solid rgba(56, 189, 248, 0.3)',
                            color: '#38bdf8',
                            fontSize: '0.72rem'
                          }}>
                            socket.emit("{ev}", ...)
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="dm-field-label">Expected JSON Telemetry Packet Structure</label>
                    <pre className="mono" style={{
                      background: '#070a11',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255,255,255,0.08)',
                      fontSize: '0.72rem',
                      color: '#a7f3d0'
                    }}>
{`{
  "deviceid": "dev-pump-101",
  "timestamp": "${new Date().toISOString()}",
  "discharge_pressure": 595.2,
  "bearing_temp": 64.5,
  "vibration": 2.45
}`}
                    </pre>
                  </div>
                </div>
              )}

              {/* TAB 4: Bound Devices */}
              {inspectorTab === 'devices' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc' }}>
                      Devices Connecting Through {inspectedBroker.name}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                      Total Bound: {(devices.filter(d => d.broker_id === inspectedBroker.id || d.broker === inspectedBroker.name)).length}
                    </span>
                  </div>

                  <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', overflow: 'hidden' }}>
                    <table className="dm-data-table" style={{ margin: 0 }}>
                      <thead>
                        <tr>
                          <th>Device Name</th>
                          <th>Identifier (UUID / GUID)</th>
                          <th>Status</th>
                          <th>Last Seen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {devices.filter(d => d.broker_id === inspectedBroker.id || d.broker === inspectedBroker.name).length === 0 ? (
                          <tr>
                            <td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8', padding: '16px', fontSize: '0.75rem' }}>
                              No devices currently bound to this broker. Use "Register IoT Device" to bind a device.
                            </td>
                          </tr>
                        ) : (
                          devices.filter(d => d.broker_id === inspectedBroker.id || d.broker === inspectedBroker.name).map(dev => (
                            <tr key={dev.id}>
                              <td style={{ fontWeight: 600, color: '#f8fafc' }}>{dev.name}</td>
                              <td className="mono" style={{ fontSize: '0.72rem', color: '#38bdf8' }}>{dev.identifier}</td>
                              <td>
                                <span className="dm-quality-pill good">{dev.status || 'Connected'}</span>
                              </td>
                              <td className="mono" style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                {dev.last_seen || dev.last_edited || 'Active Now'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 5: Diagnostic Ping */}
              {inspectorTab === 'diagnostic' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>
                    Execute an immediate application-layer handshake ping from the browser and backend to verify real-time response time and reachability.
                  </p>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      className="dm-btn dm-btn-primary"
                      disabled={inspectorPingLoading}
                      onClick={async () => {
                        setInspectorPingLoading(true);
                        let proto = 'MQTT';
                        let port = inspectedBroker.port || 1883;
                        let host = '127.0.0.1';
                        let endpoint = inspectedBroker.endpoint_url || '';

                        if (inspectedBroker.broker_type?.includes('Socket.IO') || inspectedBroker.broker_type?.includes('SocketIO')) {
                          proto = 'SOCKETIO';
                          port = 91;
                          endpoint = 'http://127.0.0.1:91/socket.io/';
                        } else if (inspectedBroker.broker_type?.includes('REST') || inspectedBroker.broker_type?.includes('HTTP')) {
                          proto = 'HTTP';
                          port = 91;
                          endpoint = 'http://127.0.0.1:91/health';
                        } else if (inspectedBroker.broker_type?.includes('Modbus')) {
                          proto = 'MODBUS';
                          port = 502;
                        }

                        const res = await runProtocolTest({ protocol: proto, host, port, endpoint });
                        setInspectorPingResult(res);
                        setInspectorPingLoading(false);
                      }}
                    >
                      <RefreshCw size={13} className={inspectorPingLoading ? "animate-spin" : ""} />
                      <span>{inspectorPingLoading ? 'Running Diagnostic Ping...' : 'Run Connection Handshake Ping'}</span>
                    </button>
                  </div>

                  {inspectorPingResult && (
                    <div style={{
                      padding: '14px',
                      borderRadius: '8px',
                      border: inspectorPingResult.success ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
                      background: inspectorPingResult.success ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: inspectorPingResult.success ? '#10b981' : '#ef4444' }}>
                          Status: {inspectorPingResult.status} &mdash; {inspectorPingResult.message}
                        </span>
                        {inspectorPingResult.latency_ms !== undefined && (
                          <span className="mono" style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700 }}>
                            Roundtrip Latency: {inspectorPingResult.latency_ms} ms
                          </span>
                        )}
                      </div>
                      {inspectorPingResult.target && (
                        <div className="mono" style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '6px' }}>
                          Target Destination: {inspectorPingResult.target}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB OPC UA Address Space & Nodes */}
              {inspectorTab === 'opcua_nodes' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FolderTree size={16} />
                      <span>IEC 62541 OPC UA Address Space & Telemetry Mappings</span>
                    </div>
                    <button
                      className="dm-btn dm-btn-secondary"
                      style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                      onClick={handleOpenAddressSpace}
                    >
                      <ExternalLink size={12} /> Open Full Address Space Explorer
                    </button>
                  </div>

                  {/* Mapped Nodes Quick Table */}
                  <div style={{ background: '#0b0f19', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', overflow: 'hidden' }}>
                    <table className="dm-data-table" style={{ width: '100%', fontSize: '0.74rem' }}>
                      <thead>
                        <tr>
                          <th>Node ID</th>
                          <th>Target Tag Name</th>
                          <th>Data Type</th>
                          <th>Scope / Type</th>
                          <th>Live Value</th>
                          <th style={{ textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(inspectedBroker.mappings || []).length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                              No tag mappings configured for this connector. Click "+ Add Node Mapping" above.
                            </td>
                          </tr>
                        ) : (
                          (inspectedBroker.mappings || []).map((m, idx) => {
                            const isCurrentRead = opcNodeReadResult?.node_id === m.node_id;
                          return (
                            <tr key={idx}>
                              <td className="mono" style={{ color: '#10b981' }}>{m.node_id}</td>
                              <td style={{ fontWeight: 600, color: '#f8fafc' }}>{m.tag_name}</td>
                              <td className="mono" style={{ color: '#38bdf8' }}>{m.data_type}</td>
                              <td>
                                <span style={{ fontSize: '0.62rem', padding: '1px 6px', borderRadius: '3px', background: m.type === 'timeseries' ? 'rgba(56,189,248,0.15)' : 'rgba(245,158,11,0.15)', color: m.type === 'timeseries' ? '#38bdf8' : '#f59e0b' }}>
                                  {m.type}
                                </span>
                              </td>
                              <td className="mono" style={{ color: '#10b981', fontWeight: 600 }}>
                                {isCurrentRead ? String(opcNodeReadResult.value) : '--'}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <button
                                  className="dm-btn dm-btn-secondary"
                                  style={{ padding: '2px 8px', fontSize: '0.68rem' }}
                                  onClick={() => handleReadOpcNode(m.node_id)}
                                  disabled={opcActionLoading}
                                >
                                  Read Node
                                </button>
                              </td>
                            </tr>
                          );
                        }))}
                      </tbody>
                    </table>
                  </div>

                  {opcNodeReadResult && (
                    <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', padding: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: 700 }}>
                          Live Value for {opcNodeReadResult.node_id}: <span style={{ color: '#fff', fontSize: '0.9rem' }}>{String(opcNodeReadResult.value)}</span>
                        </span>
                        <span className="mono" style={{ fontSize: '0.68rem', color: '#38bdf8' }}>Status: {opcNodeReadResult.status_code} ({opcNodeReadResult.source_timestamp})</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: Raw Config JSON */}
              {inspectorTab === 'raw' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="dm-field-label">Exportable Broker JSON Specification</span>
                    <button
                      className="dm-btn dm-btn-secondary"
                      style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                      onClick={() => copyToClipboard(JSON.stringify(inspectedBroker, null, 2), 'raw-broker-json')}
                    >
                      {copiedKey === 'raw-broker-json' ? <CheckCheck size={12} color="#10b981" /> : <Copy size={12} />}
                      <span>Copy JSON</span>
                    </button>
                  </div>
                  <pre className="mono" style={{
                    background: '#070a11',
                    padding: '14px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    fontSize: '0.72rem',
                    color: '#e2e8f0',
                    maxHeight: '360px',
                    overflowY: 'auto'
                  }}>
                    {JSON.stringify(inspectedBroker, null, 2)}
                  </pre>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="dm-modal-footer">
              <button className="dm-btn dm-btn-secondary" onClick={() => setInspectedBroker(null)}>
                Close Inspector
              </button>
              <button
                className="dm-btn dm-btn-primary"
                onClick={() => {
                  copyToClipboard(JSON.stringify(inspectedBroker, null, 2), 'insp-full-copy');
                  showToast('Broker configuration copied to clipboard', 'success');
                }}
              >
                <Copy size={13} />
                <span>Copy Full Configuration</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          THINGSBOARD IEC 62541 OPC UA ADDRESS SPACE EXPLORER MODAL
          ========================================================================= */}
      {isAddressSpaceModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1600 }}>
          <div className="dm-modal-box" style={{ width: '960px', maxWidth: '96vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
            <div className="dm-modal-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  padding: '8px',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#10b981'
                }}>
                  <FolderTree size={20} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#f8fafc' }}>
                      ThingsBoard IEC 62541 OPC UA Address Space Explorer
                    </h3>
                    <span style={{ fontSize: '0.65rem', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                      CONNECTED
                    </span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px', fontFamily: 'JetBrains Mono, monospace' }}>
                    Server: opc.tcp://127.0.0.1:4840 | Policy: Basic256Sha256 | Mode: SignAndEncrypt
                  </div>
                </div>
              </div>

              <button onClick={() => setIsAddressSpaceModalOpen(false)} className="dm-close-btn">&times;</button>
            </div>

            <div className="dm-modal-body" style={{ flex: 1, display: 'grid', gridTemplateColumns: '420px 1fr', gap: '16px', overflow: 'hidden', padding: '16px' }}>
              {/* Left Column: Address Space Tree */}
              <div style={{
                background: '#070a11',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>OPC UA Node Hierarchy Tree</span>
                  <button
                    className="dm-btn dm-btn-secondary"
                    style={{ padding: '2px 6px', fontSize: '0.65rem' }}
                    onClick={handleOpenAddressSpace}
                  >
                    <RefreshCw size={10} className={addressSpaceLoading ? "animate-spin" : ""} /> Refresh
                  </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                  {addressSpaceLoading ? (
                    <div style={{ color: '#94a3b8', fontSize: '0.75rem', padding: '16px', textAlign: 'center' }}>
                      Browsing IEC 62541 Address Space...
                    </div>
                  ) : addressSpaceData ? (
                    <OpcTreeNode
                      node={addressSpaceData}
                      selectedNode={selectedOpcNode}
                      onSelect={(node) => {
                        setSelectedOpcNode(node);
                        if (node.node_class === 'Variable') {
                          handleReadOpcNode(node.node_id);
                        }
                      }}
                      depth={0}
                    />
                  ) : (
                    <div style={{ color: '#ef4444', fontSize: '0.75rem' }}>Failed to load address space</div>
                  )}
                </div>
              </div>

              {/* Right Column: Selected Node Inspector & Live Read/Write */}
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto',
                gap: '14px'
              }}>
                {selectedOpcNode ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>
                          {selectedOpcNode.display_name || selectedOpcNode.browse_name}
                        </div>
                        <div className="mono" style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '2px' }}>
                          {selectedOpcNode.node_id}
                        </div>
                      </div>
                      <span style={{
                        fontSize: '0.65rem',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: selectedOpcNode.node_class === 'Variable' ? 'rgba(56,189,248,0.15)' : 'rgba(16,185,129,0.15)',
                        color: selectedOpcNode.node_class === 'Variable' ? '#38bdf8' : '#10b981',
                        fontWeight: 600
                      }}>
                        {selectedOpcNode.node_class}
                      </span>
                    </div>

                    {/* Metadata Grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '10px',
                      background: '#070a11',
                      padding: '12px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255,255,255,0.06)'
                    }}>
                      <div>
                        <div className="dm-field-label">Browse Name</div>
                        <div className="mono" style={{ fontSize: '0.78rem', color: '#f1f5f9' }}>{selectedOpcNode.browse_name}</div>
                      </div>
                      <div>
                        <div className="dm-field-label">Data Type</div>
                        <div className="mono" style={{ fontSize: '0.78rem', color: '#38bdf8' }}>{selectedOpcNode.data_type || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="dm-field-label">Access Level</div>
                        <div className="mono" style={{ fontSize: '0.78rem', color: '#f59e0b' }}>{selectedOpcNode.access_level || 'CurrentRead'}</div>
                      </div>
                      <div>
                        <div className="dm-field-label">Engineering Units</div>
                        <div className="mono" style={{ fontSize: '0.78rem', color: '#f1f5f9' }}>{selectedOpcNode.unit || '--'}</div>
                      </div>
                    </div>

                    {/* Live Process Value Box */}
                    {selectedOpcNode.node_class === 'Variable' && (
                      <div style={{
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(6, 78, 59, 0.1))',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: '8px',
                        padding: '14px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>LIVE PROCESS VALUE</span>
                          <button
                            className="dm-btn dm-btn-secondary"
                            style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                            onClick={() => handleReadOpcNode(selectedOpcNode.node_id)}
                            disabled={opcActionLoading}
                          >
                            <RefreshCw size={11} className={opcActionLoading ? "animate-spin" : ""} /> Read Value
                          </button>
                        </div>
                        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                          <span className="mono" style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc' }}>
                            {opcNodeReadResult?.value !== undefined ? String(opcNodeReadResult.value) : String(selectedOpcNode.value ?? '--')}
                          </span>
                          {selectedOpcNode.unit && (
                            <span style={{ fontSize: '0.9rem', color: '#10b981', fontWeight: 600 }}>{selectedOpcNode.unit}</span>
                          )}
                        </div>
                        <div className="mono" style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '4px' }}>
                          Status: {opcNodeReadResult?.status_code || 'Good_192'} | Timestamp: {opcNodeReadResult?.source_timestamp || 'LIVE'}
                        </div>
                      </div>
                    )}

                    {/* Write Setpoint / Downlink Box if writable */}
                    {selectedOpcNode.node_class === 'Variable' && selectedOpcNode.access_level?.includes('Write') && (
                      <div style={{
                        background: '#070a11',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '8px',
                        padding: '12px'
                      }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b', marginBottom: '8px' }}>
                          OPC UA Downlink Write (IEC 62541 Service Call)
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="text"
                            className="dm-input mono"
                            placeholder="New setpoint value..."
                            value={opcWriteVal}
                            onChange={(e) => setOpcWriteVal(e.target.value)}
                            style={{ flex: 1 }}
                          />
                          <button
                            className="dm-btn dm-btn-primary"
                            style={{ padding: '4px 12px', fontSize: '0.72rem' }}
                            onClick={() => handleWriteOpcNode(selectedOpcNode.node_id, opcWriteVal)}
                            disabled={opcActionLoading}
                          >
                            <Play size={12} /> Send Write
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Action Quick Bar */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                      <button
                        className="dm-btn dm-btn-secondary"
                        style={{ flex: 1, padding: '6px', fontSize: '0.72rem' }}
                        onClick={() => copyToClipboard(selectedOpcNode.node_id, 'copy-node-id')}
                      >
                        <Copy size={13} /> Copy NodeID
                      </button>
                      <button
                        className="dm-btn dm-btn-secondary"
                        style={{ flex: 1, padding: '6px', fontSize: '0.72rem', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)' }}
                        onClick={() => {
                          showToast(`Mapped NodeId '${selectedOpcNode.node_id}' to ThingsBoard Telemetry stream!`, 'success');
                        }}
                      >
                        <Zap size={13} /> Map to Telemetry
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ margin: 'auto', textAlign: 'center', color: '#64748b' }}>
                    <FolderTree size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                    <div style={{ fontSize: '0.82rem' }}>Select an OPC UA Node from the tree to inspect details</div>
                  </div>
                )}
              </div>
            </div>

            <div className="dm-modal-footer">
              <button className="dm-btn dm-btn-secondary" onClick={() => setIsAddressSpaceModalOpen(false)}>
                Close Explorer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: PUBLISH TEST MQTT PACKET
          ========================================================================= */}
      {isPublishModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1500 }}>
          <div className="dm-modal-box" style={{ width: '560px' }}>
            <div className="dm-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Send size={16} color="#38bdf8" />
                <h3 style={{ margin: 0 }}>Publish Test MQTT Packet</h3>
              </div>
              <button onClick={() => setIsPublishModalOpen(false)} className="dm-close-btn">&times;</button>
            </div>

            <div className="dm-modal-body">
              <div className="dm-form-group" style={{ marginBottom: '12px' }}>
                <label className="dm-field-label">Target MQTT Topic *</label>
                <input
                  type="text"
                  className="dm-input mono"
                  value={publishForm.topic}
                  onChange={(e) => setPublishForm({ ...publishForm, topic: e.target.value })}
                  placeholder="v1/devices/me/telemetry"
                />
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                  {['v1/devices/me/telemetry', 'v1/devices/me/attributes', 'v1/gateway/telemetry'].map(top => (
                    <button
                      key={top}
                      type="button"
                      onClick={() => setPublishForm({ ...publishForm, topic: top })}
                      style={{
                        fontSize: '0.65rem',
                        background: 'rgba(56,189,248,0.1)',
                        border: '1px solid rgba(56,189,248,0.3)',
                        color: '#38bdf8',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      {top}
                    </button>
                  ))}
                </div>
              </div>

              <div className="dm-form-grid-2" style={{ marginBottom: '12px' }}>
                <div className="dm-form-group">
                  <label className="dm-field-label">Client Identifier</label>
                  <input
                    type="text"
                    className="dm-input mono"
                    value={publishForm.clientId}
                    onChange={(e) => setPublishForm({ ...publishForm, clientId: e.target.value })}
                  />
                </div>
                <div className="dm-form-group">
                  <label className="dm-field-label">QoS Level</label>
                  <select
                    className="dm-select"
                    value={publishForm.qos}
                    onChange={(e) => setPublishForm({ ...publishForm, qos: Number(e.target.value) })}
                  >
                    <option value={0}>QoS 0 - At most once</option>
                    <option value={1}>QoS 1 - At least once</option>
                  </select>
                </div>
              </div>

              <div className="dm-form-group">
                <label className="dm-field-label">JSON Telemetry / Attribute Payload *</label>
                <textarea
                  rows={6}
                  className="dm-input mono"
                  style={{ background: '#040812', color: '#34d399', fontSize: '0.75rem', resize: 'vertical' }}
                  value={publishForm.payload}
                  onChange={(e) => setPublishForm({ ...publishForm, payload: e.target.value })}
                />
              </div>
            </div>

            <div className="dm-modal-footer">
              <button className="dm-btn dm-btn-secondary" onClick={() => setIsPublishModalOpen(false)}>
                Cancel
              </button>
              <button
                className="dm-btn dm-btn-primary"
                onClick={handlePublishTestPacket}
                disabled={isPublishing}
                style={{ background: '#38bdf8', borderColor: '#0284c7' }}
              >
                <Send size={13} />
                <span>{isPublishing ? 'Publishing...' : 'Publish Test Packet'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
