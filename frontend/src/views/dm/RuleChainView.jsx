import React, { useState, useEffect, useRef } from 'react';
import { 
  GitFork, Play, Plus, Trash2, ArrowRight, CheckCircle2, 
  AlertTriangle, Filter, Layers, Zap, Database, Share2, 
  Settings, RefreshCw, Terminal, Eye, Code, Radio, Shield,
  Cpu, Activity, Check, Sparkles, X, Move, ChevronDown, 
  ChevronRight, Save, FileCode, Sliders, ExternalLink, Mail,
  Send, MessageSquare, AlertOctagon, HelpCircle, Download,
  Upload, Star, PlusCircle, FileText
} from 'lucide-react';
import { useDM } from './dmContext';

// ThingsBoard Rule Engine Palette Catalog
const TB_NODE_PALETTE = [
  {
    category: 'FILTER',
    title: 'Filter Nodes',
    icon: Filter,
    color: '#eab308',
    items: [
      { type: 'FILTER', name: 'Script Message Filter', details: 'Evaluates JS boolean condition', defaultConf: { script: 'return msg.temperature > 85 || msg.pressure > 250;' } },
      { type: 'FILTER', name: 'Asset Attribute Condition', details: 'Filters telemetry against selected Asset & Attribute', defaultConf: { asset_id: '', asset_name: '', selected_attributes: [], operator: '>', threshold: '0.0', script: 'return true;' } },
      { type: 'FILTER', name: 'Check Relation', details: 'Checks originator entity relation', defaultConf: { relationType: 'Contains', entityType: 'ASSET' } },
      { type: 'FILTER', name: 'Switch (Router)', details: 'Routes to dynamic relations by script', defaultConf: { script: 'return [msg.status === "TRIP" ? "Trip" : "Normal"];' } },
      { type: 'FILTER', name: 'Check Message Type', details: 'Matches POST_TELEMETRY / RPC', defaultConf: { messageNames: ['POST_TELEMETRY_REQUEST', 'POST_ATTRIBUTES_REQUEST'] } }
    ]
  },
  {
    category: 'ENRICHMENT',
    title: 'Enrichment Nodes',
    icon: Layers,
    color: '#06b6d4',
    items: [
      { type: 'ENRICHMENT', name: 'Asset Telemetry Enrichment', details: 'Enriches message with live attributes from selected Asset', defaultConf: { asset_id: '', asset_name: '', selected_attributes: [] } },
      { type: 'ENRICHMENT', name: 'Device Attributes', details: 'Adds client/shared attributes to msg', defaultConf: { clientAttributeNames: ['firmware', 'serialNumber'], latestTs: true } },
      { type: 'ENRICHMENT', name: 'Originator Attributes', details: 'Enriches metadata from originator', defaultConf: { selectedFields: ['name', 'label', 'type'] } },
      { type: 'ENRICHMENT', name: 'Customer Attributes', details: 'Adds customer title and email', defaultConf: { mapping: { customerTitle: 'customerName' } } }
    ]
  },
  {
    category: 'TRANSFORM',
    title: 'Transformation Nodes',
    icon: Zap,
    color: '#a855f7',
    items: [
      { 
        type: 'TRANSFORM', 
        name: 'KPI Derivation & Production Metrics', 
        details: 'Calculates OEE %, Availability, Quality, and Thermal Efficiency', 
        defaultConf: { 
          kpi_type: 'OEE_AND_EFFICIENCY',
          script: `const runHours = Number(msg.run_hours || 24);
const plannedHours = Number(msg.planned_hours || 24);
const avail = Math.min(1.0, runHours / Math.max(plannedHours, 1));

const prod = Number(msg.production_count || msg.throughput || 930);
const cap = Number(msg.target_capacity || 1000);
const perf = Math.min(1.0, prod / Math.max(cap, 1));

const good = Number(msg.good_count || (prod - (msg.defect_count || 10)));
const qual = prod > 0 ? (good / prod) : 1.0;

const oee = Number((avail * perf * qual * 100).toFixed(2));
const heatRec = Number(msg.heat_recovered || msg['TIC_102.PV'] || 76.4);
const heatIn = Number(msg.heat_input || msg['TIC_101.PV'] || 89.2);
const eff = Number((heatRec / Math.max(heatIn, 1) * 100).toFixed(2));

msg.oee_percent = oee;
msg.thermal_efficiency = eff;
msg.availability_ratio = Number(avail.toFixed(3));
msg.performance_ratio = Number(perf.toFixed(3));
msg.quality_ratio = Number(qual.toFixed(3));
msg.kpi_timestamp = new Date().toISOString();

return { msg: msg, metadata: metadata, msgType: msgType };`
        } 
      },
      { type: 'TRANSFORM', name: 'Script Transformation', details: 'Transforms msg/metadata via JS', defaultConf: { script: 'msg.pressure_bar = msg.pressure / 100;\nreturn {msg: msg, metadata: metadata, msgType: msgType};' } },
      { type: 'TRANSFORM', name: 'To Email Payload', details: 'Formats HTML body for email dispatch', defaultConf: { template: 'Critical Alarm Triggered on <%= msg.deviceName %>: <%= msg.alarmDetails %>' } },
      { type: 'TRANSFORM', name: 'Change Originator', details: 'Rebinds originator to parent Unit/Asset', defaultConf: { targetRelation: 'Contains', targetType: 'ASSET' } }
    ]
  },
  {
    category: 'ACTION',
    title: 'Action Nodes',
    icon: Activity,
    color: '#10b981',
    items: [
      { type: 'ACTION', name: 'Save Timeseries', details: 'Stores data in timeseries partition', defaultConf: { ttl: 86400, skipLatest: false } },
      { type: 'ACTION', name: 'Save Attributes', details: 'Persists attributes to entity storage', defaultConf: { scope: 'SERVER_SCOPE' } },
      { type: 'ACTION', name: 'Asset Process Alarm', details: 'Raises ISA-18.2 alarm for specific Asset & Attribute', defaultConf: { asset_id: '', asset_name: '', attribute_name: '', alarmType: 'Process Alarm Trip', severity: 'CRITICAL', propagate: true } },
      { type: 'ACTION', name: 'Create Process Alarm', details: 'Raises ISA-18.2 Process Alarm', defaultConf: { alarmType: 'High Temperature Trip', severity: 'CRITICAL', propagate: true } },
      { type: 'ACTION', name: 'Clear Process Alarm', details: 'Clears active alarm on normal state', defaultConf: { alarmType: 'High Temperature Trip' } },
      { type: 'ACTION', name: 'RPC Call Request', details: 'Dispatches downlink RPC setpoint to DCS', defaultConf: { method: 'setPoint', timeoutMs: 5000 } },
      { type: 'ACTION', name: 'External REST API Call', details: 'POST/PUT HTTP webhook to external engine', defaultConf: { endpoint: 'http://127.0.0.1:1880/telemetry', method: 'POST' } }
    ]
  },
  {
    category: 'EXTERNAL',
    title: 'External Integration',
    icon: ExternalLink,
    color: '#f97316',
    items: [
      { type: 'EXTERNAL', name: 'Kafka Message Producer', details: 'Publishes message to Kafka topic', defaultConf: { topic: 'telemetry.ingress.v1', bootstrapServers: 'localhost:9092' } },
      { type: 'EXTERNAL', name: 'MQTT Broker Forwarder', details: 'Forwards message to external broker', defaultConf: { topic: 'v1/devices/me/telemetry', host: 'localhost', port: 1883 } },
      { type: 'EXTERNAL', name: 'Send Email Notification', details: 'Transmits SMTP email alert', defaultConf: { to: 'shift-supervisor@yokogawa.com', subject: 'Emergency Trip Notice' } }
    ]
  }
];

export default function RuleChainView() {
  const { assets = [], devices = [], showToast } = useDM();

  const [ruleChains, setRuleChains] = useState([]);
  const [activeChainId, setActiveChainId] = useState('');
  const [activeChain, setActiveChain] = useState(null);
  const [loading, setLoading] = useState(true);

  // Palette accordion
  const [expandedCategories, setExpandedCategories] = useState({
    FILTER: true,
    ENRICHMENT: false,
    TRANSFORM: true,
    ACTION: true,
    EXTERNAL: false
  });

  // Selected node & Dragging state
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);

  // Node Configuration Modal
  const [configModalNode, setConfigModalNode] = useState(null);

  // Add Link Modal
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkSourceId, setLinkSourceId] = useState('');
  const [linkTargetId, setLinkTargetId] = useState('');
  const [linkLabel, setLinkLabel] = useState('Success');

  // ThingsBoard Import / Export & New Chain Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [isNewChainModalOpen, setIsNewChainModalOpen] = useState(false);
  const [newChainType, setNewChainType] = useState('kpi_derivations');
  const [newChainName, setNewChainName] = useState('Real-time KPI Derivations & Plant Efficiency Pipeline');
  const [newChainDesc, setNewChainDesc] = useState('Event-driven calculation pipeline: Ingests asset telemetry, computes OEE and thermal efficiency, updates asset attributes, and triggers alarm on low performance.');

  // Delete Rule Chain
  const handleDeleteChain = async (chainId) => {
    if (!chainId) return;
    const target = ruleChains.find(rc => rc.id === chainId);
    if (target?.is_root) {
      showToast('Cannot delete default Root Rule Chain', 'error');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete Rule Chain '${target?.name || chainId}'?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/v1/dm/rule-chains/${chainId}`, { method: 'DELETE' });
      if (res.ok) {
        const remaining = ruleChains.filter(rc => rc.id !== chainId);
        setRuleChains(remaining);
        if (activeChainId === chainId) {
          const fallback = remaining[0] || null;
          setActiveChainId(fallback ? fallback.id : '');
          setActiveChain(fallback);
        }
        showToast(`Rule Chain '${target?.name || chainId}' deleted successfully`, 'info');
      } else {
        throw new Error('Server returned non-200');
      }
    } catch (e) {
      showToast(`Delete failed: ${e.message}`, 'error');
    }
  };

  // Simulation & Debug Trace
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [simTrace, setSimTrace] = useState([]);
  const [activeTraceNodeId, setActiveTraceNodeId] = useState(null);
  const [simPayload, setSimPayload] = useState(JSON.stringify({}, null, 2));

  // Load Rule Chains from Backend
  useEffect(() => {
    fetchRuleChains();
  }, []);

  const fetchRuleChains = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/dm/rule-chains');
      if (res.ok) {
        const data = await res.json();
        setRuleChains(data);
        if (data.length > 0) {
          const defaultChain = data.find(c => c.id === activeChainId) || data[0];
          setActiveChainId(defaultChain.id);
          setActiveChain(defaultChain);
        }
      }
    } catch (e) {
      console.error("Failed to fetch rule chains:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChain = (id) => {
    setActiveChainId(id);
    const found = ruleChains.find(rc => rc.id === id);
    if (found) {
      setActiveChain(found);
      setSelectedNodeId(null);
      setSimTrace([]);
    }
  };

  // Node Dragging Handling
  const handleNodeMouseDown = (e, node) => {
    e.stopPropagation();
    setSelectedNodeId(node.id);
    setDraggingNodeId(node.id);
    
    const canvasRect = canvasRef.current.getBoundingClientRect();
    setDragOffset({
      x: (e.clientX - canvasRect.left) - node.x,
      y: (e.clientY - canvasRect.top) - node.y
    });
  };

  const handleCanvasMouseMove = (e) => {
    if (!draggingNodeId || !canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const newX = Math.max(20, Math.min(1400, (e.clientX - canvasRect.left) - dragOffset.x));
    const newY = Math.max(20, Math.min(800, (e.clientY - canvasRect.top) - dragOffset.y));

    setActiveChain(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        nodes: prev.nodes.map(n => n.id === draggingNodeId ? { ...n, x: newX, y: newY } : n)
      };
    });
  };

  const handleCanvasMouseUp = () => {
    setDraggingNodeId(null);
  };

  // Add Node from Palette
  const handleAddNodeFromPalette = (item) => {
    if (!activeChain) return;
    const id = `node-${item.type.toLowerCase().substring(0, 3)}-${Date.now().toString().slice(-4)}`;
    
    // Calculate new position
    const existingCount = activeChain.nodes.length;
    const newX = 120 + ((existingCount % 4) * 220);
    const newY = 100 + (Math.floor(existingCount / 4) * 140);

    const newNode = {
      id,
      type: item.type,
      name: item.name,
      category: item.type,
      x: newX,
      y: newY,
      details: item.details,
      configuration: { ...item.defaultConf }
    };

    const updated = {
      ...activeChain,
      nodes: [...activeChain.nodes, newNode]
    };
    setActiveChain(updated);
    setSelectedNodeId(newNode.id);
    showToast(`Added '${item.name}' node to Rule Chain`, 'info');
  };

  // Delete Node
  const handleDeleteNode = (nodeId) => {
    if (!activeChain) return;
    const updatedNodes = activeChain.nodes.filter(n => n.id !== nodeId);
    const updatedConns = activeChain.connections.filter(c => c.from !== nodeId && c.to !== nodeId);
    setActiveChain({
      ...activeChain,
      nodes: updatedNodes,
      connections: updatedConns
    });
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
    showToast('Node removed from Rule Chain', 'info');
  };

  // Add Connection Link
  const handleCreateConnection = () => {
    if (!linkSourceId || !linkTargetId) {
      showToast('Select both source and destination nodes', 'error');
      return;
    }
    if (linkSourceId === linkTargetId) {
      showToast('Source and target node cannot be the same', 'error');
      return;
    }

    const existing = activeChain.connections.find(c => c.from === linkSourceId && c.to === linkTargetId && c.label === linkLabel);
    if (existing) {
      showToast('This connection already exists', 'error');
      return;
    }

    const newConnection = {
      from: linkSourceId,
      to: linkTargetId,
      label: linkLabel
    };

    setActiveChain({
      ...activeChain,
      connections: [...activeChain.connections, newConnection]
    });
    setLinkModalOpen(false);
    showToast(`Connected nodes with '${linkLabel}' relation`, 'success');
  };

  // Delete Connection Link
  const handleDeleteConnection = (idx) => {
    setActiveChain({
      ...activeChain,
      connections: activeChain.connections.filter((_, i) => i !== idx)
    });
    showToast('Connection link removed', 'info');
  };

  // Save Rule Chain to Backend
  const handleSaveRuleChain = async () => {
    try {
      const res = await fetch('/api/v1/dm/rule-chains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activeChain)
      });
      if (res.ok) {
        showToast(`Rule Chain '${activeChain.name}' saved to cluster`, 'success');
        fetchRuleChains();
      } else {
        showToast('Failed to save Rule Chain', 'error');
      }
    } catch (e) {
      showToast(`Save error: ${e.message}`, 'error');
    }
  };

  // ThingsBoard JSON Export
  const handleExportTbJson = () => {
    if (!activeChain) return;
    const tbSchema = {
      ruleChain: {
        name: activeChain.name,
        type: "CORE",
        firstRuleNodeId: activeChain.nodes?.[0]?.id ? { id: activeChain.nodes[0].id, entityType: "RULE_NODE" } : null,
        root: !!activeChain.is_root,
        debugMode: false,
        configuration: null,
        additionalInfo: {
          description: activeChain.description || "Exported from ThingsBoard IoT Studio"
        }
      },
      metadata: {
        firstNodeIndex: 0,
        nodes: (activeChain.nodes || []).map(n => ({
          id: { id: n.id, entityType: "RULE_NODE" },
          type: n.type,
          name: n.name,
          debugMode: true,
          configuration: n.configuration || {},
          additionalInfo: {
            layoutX: n.x,
            layoutY: n.y,
            description: n.details || ""
          }
        })),
        connections: (activeChain.connections || []).map(c => {
          const fromIdx = activeChain.nodes.findIndex(n => n.id === c.from);
          const toIdx = activeChain.nodes.findIndex(n => n.id === c.to);
          return {
            fromIndex: fromIdx >= 0 ? fromIdx : 0,
            targetIndex: toIdx >= 0 ? toIdx : 0,
            type: c.label || "Success"
          };
        }),
        ruleChainConnections: null
      }
    };

    const blob = new Blob([JSON.stringify(tbSchema, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeChain.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_ThingsBoard_RuleChain.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported '${activeChain.name}' as ThingsBoard JSON`, 'success');
  };

  // ThingsBoard JSON Import
  const handleImportTbJson = async () => {
    try {
      if (!importJsonText.trim()) {
        showToast('Please paste valid ThingsBoard JSON or select a file', 'error');
        return;
      }
      const parsed = JSON.parse(importJsonText);
      
      let chainName = "Imported Rule Chain";
      let chainDesc = "Imported via ThingsBoard JSON schema";
      let isRoot = false;
      let nodes = [];
      let connections = [];

      if (parsed.ruleChain && parsed.metadata) {
        chainName = parsed.ruleChain.name || chainName;
        chainDesc = parsed.ruleChain.additionalInfo?.description || chainDesc;
        isRoot = !!parsed.ruleChain.root;
        const tbNodes = parsed.metadata.nodes || [];
        nodes = tbNodes.map((n, idx) => ({
          id: n.id?.id || `node-imp-${idx}-${Date.now().toString().slice(-4)}`,
          type: n.type || "FILTER",
          name: n.name || `Node ${idx + 1}`,
          category: n.type || "FILTER",
          x: n.additionalInfo?.layoutX || (100 + (idx % 4) * 220),
          y: n.additionalInfo?.layoutY || (100 + Math.floor(idx / 4) * 140),
          details: n.additionalInfo?.description || "Imported ThingsBoard Rule Node",
          configuration: n.configuration || {}
        }));

        const tbConns = parsed.metadata.connections || [];
        connections = tbConns.map(c => {
          const fromNode = nodes[c.fromIndex];
          const toNode = nodes[c.targetIndex];
          return {
            from: fromNode ? fromNode.id : (nodes[0]?.id || ''),
            to: toNode ? toNode.id : (nodes[1]?.id || ''),
            label: c.type || "Success"
          };
        }).filter(c => c.from && c.to);
      } else if (Array.isArray(parsed.nodes)) {
        chainName = parsed.name || chainName;
        chainDesc = parsed.description || chainDesc;
        isRoot = !!parsed.is_root;
        nodes = parsed.nodes;
        connections = parsed.connections || [];
      } else {
        throw new Error("Unrecognized JSON format: Expected { ruleChain, metadata } or { nodes, connections }");
      }

      const newId = `rc-imp-${Date.now().toString().slice(-6)}`;
      const importedChain = {
        id: newId,
        name: chainName,
        description: chainDesc,
        is_root: isRoot,
        nodes,
        connections
      };

      const res = await fetch('/api/v1/dm/rule-chains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importedChain)
      });

      if (res.ok) {
        setRuleChains(prev => [importedChain, ...prev]);
        setActiveChainId(newId);
        setActiveChain(importedChain);
        setIsImportModalOpen(false);
        setImportJsonText('');
        showToast(`Rule Chain '${chainName}' successfully imported and loaded!`, 'success');
      } else {
        throw new Error("Failed to save imported rule chain to server");
      }
    } catch (e) {
      showToast(`Import error: ${e.message}`, 'error');
    }
  };

  // Set Current Chain as Root
  const handleSetAsRootChain = async () => {
    if (!activeChain) return;
    const updated = { ...activeChain, is_root: true };
    try {
      const res = await fetch('/api/v1/dm/rule-chains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        setRuleChains(prev => prev.map(rc => ({ ...rc, is_root: rc.id === activeChain.id })));
        setActiveChain(updated);
        showToast(`'${activeChain.name}' set as active Root Rule Chain`, 'success');
      }
    } catch (e) {
      showToast(`Error updating root status: ${e.message}`, 'error');
    }
  };

  // Create New Rule Chain
  const handleCreateNewChain = async () => {
    if (!newChainName.trim()) {
      showToast('Please provide a rule chain name', 'error');
      return;
    }
    const newId = `rc-${Date.now().toString().slice(-6)}`;
    let nodes = [];
    let connections = [];

    if (newChainType === 'kpi_derivations') {
      nodes = [
        { id: `node-kpi-in-${newId}`, type: "INPUT", name: "Asset Telemetry & Production Ingress", category: "INPUT", x: 60, y: 180, details: "Topic: v1/devices/me/telemetry", configuration: { topic: "v1/devices/me/telemetry" } },
        { id: `node-kpi-flt-${newId}`, type: "FILTER", name: "Filter Operating Mode (RUNNING)", category: "FILTER", x: 280, y: 180, details: "Exclude trips & offline states", configuration: { script: "return msg.status !== 'STOPPED' && msg.status !== 'TRIP';" } },
        { id: `node-kpi-enr-${newId}`, type: "ENRICHMENT", name: "Enrich Asset Nameplate & Targets", category: "ENRICHMENT", x: 520, y: 180, details: "Design capacity (1000 u/d) & targets", configuration: { selectedFields: ["design_capacity", "target_efficiency", "unit_name"] } },
        { id: `node-kpi-trf-${newId}`, type: "TRANSFORM", name: "KPI Derivation Calculator (OEE & Efficiency)", category: "TRANSFORM", x: 760, y: 180, details: "Derives OEE % and Thermal Efficiency %", configuration: { kpi_type: "OEE_AND_EFFICIENCY", script: "const runHours = Number(msg.run_hours || 24);\nconst plannedHours = Number(msg.planned_hours || 24);\nconst avail = Math.min(1.0, runHours / Math.max(plannedHours, 1));\n\nconst prod = Number(msg.production_count || msg.throughput || 930);\nconst cap = Number(msg.target_capacity || 1000);\nconst perf = Math.min(1.0, prod / Math.max(cap, 1));\n\nconst good = Number(msg.good_count || (prod - (msg.defect_count || 10)));\nconst qual = prod > 0 ? (good / prod) : 1.0;\n\nconst oee = Number((avail * perf * qual * 100).toFixed(2));\nconst heatRec = Number(msg.heat_recovered || msg['TIC_102.PV'] || 76.4);\nconst heatIn = Number(msg.heat_input || msg['TIC_101.PV'] || 89.2);\nconst eff = Number((heatRec / Math.max(heatIn, 1) * 100).toFixed(2));\n\nmsg.oee_percent = oee;\nmsg.thermal_efficiency = eff;\nmsg.availability_ratio = Number(avail.toFixed(3));\nmsg.performance_ratio = Number(perf.toFixed(3));\nmsg.quality_ratio = Number(qual.toFixed(3));\nmsg.kpi_calculated_at = new Date().toISOString();\n\nreturn { msg: msg, metadata: metadata, msgType: msgType };" } },
        { id: `node-kpi-act-attr-${newId}`, type: "ACTION", name: "Save Derived KPI Attributes to Asset", category: "ACTION", x: 1020, y: 90, details: "Updates live asset attributes (oee_percent, thermal_efficiency)", configuration: { scope: "SERVER_SCOPE" } },
        { id: `node-kpi-act-ts-${newId}`, type: "ACTION", name: "Save KPI Timeseries Historian", category: "ACTION", x: 1020, y: 210, details: "Stores high-resolution derived KPI curve in Timeseries DB", configuration: { ttl: 86400, skip_latest: false } },
        { id: `node-kpi-flt-low-${newId}`, type: "FILTER", name: "Check Low OEE Performance (< 75%)", category: "FILTER", x: 1020, y: 330, details: "Alert if derived OEE drops below 75%", configuration: { script: "return msg.oee_percent < 75.0;" } },
        { id: `node-kpi-alm-${newId}`, type: "ACTION", name: "Create Low OEE Process Alarm", category: "ACTION", x: 1280, y: 330, details: "ISA-18.2 Warning: Overall Equipment Effectiveness Degraded", configuration: { alarm_type: "Low OEE Degradation Alarm", severity: "WARNING", propagate: true } }
      ];
      connections = [
        { from: `node-kpi-in-${newId}`, to: `node-kpi-flt-${newId}`, label: "Success" },
        { from: `node-kpi-flt-${newId}`, to: `node-kpi-enr-${newId}`, label: "True" },
        { from: `node-kpi-enr-${newId}`, to: `node-kpi-trf-${newId}`, label: "Success" },
        { from: `node-kpi-trf-${newId}`, to: `node-kpi-act-attr-${newId}`, label: "Success" },
        { from: `node-kpi-trf-${newId}`, to: `node-kpi-act-ts-${newId}`, label: "Success" },
        { from: `node-kpi-trf-${newId}`, to: `node-kpi-flt-low-${newId}`, label: "Success" },
        { from: `node-kpi-flt-low-${newId}`, to: `node-kpi-alm-${newId}`, label: "True" }
      ];
    } else if (newChainType === 'standard_alarm') {
      nodes = [
        { id: `node-in-${newId}`, type: "INPUT", name: "Inbound Telemetry Msg", category: "Input", x: 60, y: 140, details: "Topic: v1/devices/me/telemetry", configuration: { topic: "v1/devices/me/telemetry" } },
        { id: `node-flt-${newId}`, type: "FILTER", name: "Process Limit Filter", category: "Filter", x: 280, y: 140, details: "msg.temperature > 85", configuration: { script: "return msg.temperature > 85;" } },
        { id: `node-act-${newId}`, type: "ACTION", name: "Save Timeseries", category: "Action", x: 540, y: 80, details: "Persist in Timeseries DB", configuration: { ttl: 86400, skip_latest: false } },
        { id: `node-alm-${newId}`, type: "ACTION", name: "Create Process Alarm", category: "Action", x: 540, y: 220, details: "ISA-18.2 Warning", configuration: { alarm_type: "High Temperature Trip", severity: "CRITICAL", propagate: true } }
      ];
      connections = [
        { from: `node-in-${newId}`, to: `node-flt-${newId}`, label: "Success" },
        { from: `node-flt-${newId}`, to: `node-act-${newId}`, label: "False" },
        { from: `node-flt-${newId}`, to: `node-alm-${newId}`, label: "True" }
      ];
    } else {
      nodes = [
        { id: `node-input-${newId}`, type: "INPUT", name: "Device Message Ingress", category: "INPUT", x: 120, y: 200, details: "Standard MQTT & HTTP Telemetry Ingress point", configuration: {} }
      ];
      connections = [];
    }

    const newChain = {
      id: newId,
      name: newChainName.trim(),
      description: newChainDesc.trim() || 'Custom ThingsBoard Rule Engine pipeline',
      is_root: false,
      nodes,
      connections
    };

    try {
      const res = await fetch('/api/v1/dm/rule-chains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newChain)
      });
      if (res.ok) {
        setRuleChains(prev => [newChain, ...prev]);
        setActiveChainId(newId);
        setActiveChain(newChain);
        setIsNewChainModalOpen(false);
        showToast(`Created new Rule Chain '${newChain.name}'`, 'success');
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(`Server error: ${errData.detail || 'Failed to save rule chain'}`, 'error');
      }
    } catch (e) {
      showToast(`Failed to create rule chain: ${e.message}`, 'error');
    }
  };

  // Run Real Message Simulation with Live Trace
  const handleRunSimulation = async () => {
    let parsedPayload;
    try {
      parsedPayload = JSON.parse(simPayload);
    } catch (e) {
      showToast('Invalid JSON input payload for simulation', 'error');
      return;
    }

    setSimulationRunning(true);
    setSimTrace([]);
    setActiveTraceNodeId(null);

    try {
      const res = await fetch('/api/v1/dm/rule-chains/test-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chain_id: activeChain.id,
          message: parsedPayload,
          metadata: {
            topic: "v1/devices/me/telemetry",
            deviceType: "CENTUM_VP_DCS",
            originator: activeChain.name
          },
          msg_type: "POST_TELEMETRY_REQUEST"
        })
      });

      if (!res.ok) {
        throw new Error('Simulation endpoint returned non-200');
      }

      const result = await res.json();
      const trace = result.trace || [];

      // Step-by-step animation through nodes
      for (let i = 0; i < trace.length; i++) {
        const step = trace[i];
        setActiveTraceNodeId(step.node_id);
        setSimTrace(prev => [...prev, step]);
        await new Promise(r => setTimeout(r, 650));
      }

      setActiveTraceNodeId(null);
      showToast(`Rule engine simulation completed: ${trace.length} nodes traversed in ${result.total_latency_ms}ms`, 'success');
    } catch (e) {
      showToast(`Simulation error: ${e.message}`, 'error');
    } finally {
      setSimulationRunning(false);
    }
  };

  const getNodeColor = (type) => {
    switch (type) {
      case 'INPUT': return { bg: 'rgba(56, 189, 248, 0.12)', border: '#38bdf8', text: '#38bdf8', badge: '#0284c7' };
      case 'FILTER': return { bg: 'rgba(234, 179, 8, 0.12)', border: '#eab308', text: '#fde047', badge: '#ca8a04' };
      case 'ENRICHMENT': return { bg: 'rgba(6, 182, 212, 0.12)', border: '#06b6d4', text: '#22d3ee', badge: '#0891b2' };
      case 'TRANSFORM': return { bg: 'rgba(168, 85, 247, 0.12)', border: '#a855f7', text: '#c084fc', badge: '#9333ea' };
      case 'ACTION': return { bg: 'rgba(16, 185, 129, 0.12)', border: '#10b981', text: '#34d399', badge: '#059669' };
      case 'EXTERNAL': return { bg: 'rgba(249, 115, 22, 0.12)', border: '#f97316', text: '#fb923c', badge: '#ea580c' };
      default: return { bg: 'rgba(100, 116, 139, 0.12)', border: '#64748b', text: '#94a3b8', badge: '#475569' };
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-400 mb-3" />
        <p>Loading ThingsBoard Rule Engine...</p>
      </div>
    );
  }

  if (!activeChain) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)] bg-[#070d19] text-slate-400 p-8">
        <GitFork className="w-12 h-12 text-slate-600 mb-4 opacity-50" />
        <h2 className="text-lg font-bold text-slate-200">No Rule Chains Configured</h2>
        <p className="text-xs text-slate-500 max-w-md text-center mt-1.5 mb-5">
          Rule Chains allow you to filter, transform, and route live telemetry and alarms through an interactive node pipeline.
        </p>
        <button
          onClick={() => setIsNewChainModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-indigo-600/30 transition"
        >
          <Plus className="w-4 h-4" />
          Create First Rule Chain
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-[#070d19] text-slate-100 overflow-hidden select-none">
      
      {/* ========================================================================= */}
      {/* 1. TOP HEADER TOOLBAR                                                     */}
      {/* ========================================================================= */}
      <div className="h-14 border-b border-slate-800 bg-[#0d1527] px-4 flex items-center justify-between shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-indigo-400">
            <GitFork className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-wide">
                ThingsBoard Rule Engine Studio
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800">
                TB PE v3.8 Parity
              </span>
              {activeChain.is_root && (
                <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                  ROOT CHAIN
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 truncate max-w-xl">
              {activeChain.description}
            </p>
          </div>
        </div>

        {/* Right Toolbar Controls */}
        <div className="flex items-center gap-2">
          {/* Rule Chain Selector */}
          <select 
            value={activeChainId}
            onChange={(e) => handleSelectChain(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-medium"
          >
            {ruleChains.map(rc => (
              <option key={rc.id} value={rc.id}>
                {rc.name} {rc.is_root ? '★ (Root)' : ''}
              </option>
            ))}
          </select>

          {/* New Chain Button */}
          <button
            onClick={() => setIsNewChainModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
            title="Create New Rule Chain"
          >
            <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>New</span>
          </button>

          {/* Delete Current Chain Button */}
          <button
            onClick={() => handleDeleteChain(activeChain.id)}
            disabled={activeChain.is_root}
            className={`flex items-center gap-1 px-2.5 py-1.5 border text-xs font-semibold rounded-lg transition ${
              activeChain.is_root
                ? 'opacity-40 border-slate-800 text-slate-600 cursor-not-allowed'
                : 'bg-slate-800 hover:bg-rose-900/40 border-slate-700 text-rose-300 hover:text-rose-200 hover:border-rose-700'
            }`}
            title={activeChain.is_root ? "Default Root Chain cannot be deleted" : "Delete Current Rule Chain"}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>

          {/* Set as Root Chain Button */}
          <button
            onClick={handleSetAsRootChain}
            disabled={activeChain.is_root}
            className={`flex items-center gap-1 px-2.5 py-1.5 border text-xs font-semibold rounded-lg transition ${
              activeChain.is_root
                ? 'bg-amber-950/40 border-amber-800 text-amber-400 cursor-default'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
            }`}
            title="Set this rule chain as default system Root Rule Chain"
          >
            <Star className={`w-3.5 h-3.5 ${activeChain.is_root ? 'fill-amber-400 text-amber-400' : 'text-slate-400'}`} />
            <span>{activeChain.is_root ? 'Root' : 'Set Root'}</span>
          </button>

          {/* Export ThingsBoard JSON */}
          <button
            onClick={handleExportTbJson}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
            title="Export ThingsBoard JSON format"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export TB</span>
          </button>

          {/* Import ThingsBoard JSON */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
            title="Import ThingsBoard JSON format"
          >
            <Upload className="w-3.5 h-3.5 text-purple-400" />
            <span>Import</span>
          </button>

          {/* Connect Nodes */}
          <button
            onClick={() => {
              if (activeChain.nodes.length >= 2) {
                setLinkSourceId(activeChain.nodes[0].id);
                setLinkTargetId(activeChain.nodes[1].id);
                setLinkModalOpen(true);
              } else {
                showToast('Add at least 2 nodes to connect them', 'error');
              }
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
            title="Connect two rule nodes"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            <span>Link</span>
          </button>

          {/* Save Rule Chain */}
          <button
            onClick={handleSaveRuleChain}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-indigo-600/30 transition"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>

          {/* Run Message Simulation */}
          <button
            onClick={handleRunSimulation}
            disabled={simulationRunning}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg shadow-lg transition ${
              simulationRunning 
                ? 'bg-amber-600 text-white cursor-wait' 
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
            }`}
          >
            <Play className={`w-3.5 h-3.5 ${simulationRunning ? 'animate-spin' : ''}`} />
            <span>{simulationRunning ? 'Simulating...' : 'Test Run'}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. THREE-PANEL WORKBENCH: Palette | Canvas | Simulator/Inspector           */}
      {/* ========================================================================= */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* ----------------------------------------------------------------------- */}
        {/* 2A. LEFT SIDEBAR: THINGSBOARD NODE PALETTE CATALOG                      */}
        {/* ----------------------------------------------------------------------- */}
        <div className="w-64 border-r border-slate-800 bg-[#091122] flex flex-col shrink-0 overflow-y-auto">
          <div className="p-3 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              Node Library
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {TB_NODE_PALETTE.reduce((acc, c) => acc + c.items.length, 0)} Nodes
            </span>
          </div>

          <div className="divide-y divide-slate-800/60 p-2 space-y-1">
            {TB_NODE_PALETTE.map(cat => {
              const isExpanded = expandedCategories[cat.category];
              return (
                <div key={cat.category} className="pt-1">
                  <button
                    onClick={() => setExpandedCategories(prev => ({ ...prev, [cat.category]: !isExpanded }))}
                    className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold text-slate-300 hover:text-white rounded hover:bg-slate-800/60 transition"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }}></div>
                      <span>{cat.title}</span>
                    </div>
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                  </button>

                  {isExpanded && (
                    <div className="mt-1 space-y-1 pl-2 pr-1">
                      {cat.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="group p-2 rounded-lg bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 hover:border-slate-700 transition cursor-pointer flex items-center justify-between"
                          onClick={() => handleAddNodeFromPalette(item)}
                          title={`Click to add ${item.name} to canvas`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="text-xs font-semibold text-slate-200 truncate group-hover:text-indigo-300 transition">
                              {item.name}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {item.details}
                            </div>
                          </div>
                          <button
                            className="p-1 rounded bg-slate-800 group-hover:bg-indigo-600 text-slate-400 group-hover:text-white transition shrink-0"
                            title="Add to canvas"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* 2B. CENTER: INTERACTIVE CANVAS WITH DRAGGABLE NODES & BEZIER CONNECTIONS */}
        {/* ----------------------------------------------------------------------- */}
        <div 
          ref={canvasRef}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          className="flex-1 relative bg-[#040812] overflow-auto select-none"
          style={{
            backgroundImage: 'radial-gradient(rgba(56, 189, 248, 0.09) 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}
        >
          {/* SVG Connection Lines */}
          <svg className="absolute inset-0 w-[1600px] h-[1000px] pointer-events-none z-10">
            <defs>
              <marker id="tb-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
              </marker>
              <marker id="tb-arrow-active" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
              </marker>
            </defs>

            {activeChain.connections.map((conn, idx) => {
              const srcNode = activeChain.nodes.find(n => n.id === conn.from);
              const tgtNode = activeChain.nodes.find(n => n.id === conn.to);
              if (!srcNode || !tgtNode) return null;

              const sx = srcNode.x + 180;
              const sy = srcNode.y + 40;
              const tx = tgtNode.x;
              const ty = tgtNode.y + 40;
              const mx = (sx + tx) / 2;

              const pathData = `M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ty}, ${tx} ${ty}`;
              const isTraversed = simTrace.some(t => t.node_id === tgtNode.id);

              return (
                <g key={idx}>
                  <path
                    d={pathData}
                    fill="none"
                    stroke={isTraversed ? '#10b981' : simulationRunning ? '#38bdf8' : 'rgba(56, 189, 248, 0.35)'}
                    strokeWidth={isTraversed || simulationRunning ? '2.5' : '1.5'}
                    strokeDasharray={simulationRunning ? '5 5' : 'none'}
                    markerEnd={isTraversed ? 'url(#tb-arrow-active)' : 'url(#tb-arrow)'}
                  />
                  {/* Link Label Tag */}
                  <rect
                    x={mx - 32}
                    y={(sy + ty) / 2 - 10}
                    width={64}
                    height={18}
                    rx={4}
                    fill="#0f172a"
                    stroke={isTraversed ? '#10b981' : 'rgba(56, 189, 248, 0.4)'}
                    strokeWidth="1"
                  />
                  <text
                    x={mx}
                    y={(sy + ty) / 2 + 2}
                    fill={isTraversed ? '#34d399' : '#94a3b8'}
                    fontSize="9"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {conn.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Rule Chain Draggable Nodes */}
          {activeChain.nodes.map(node => {
            const style = getNodeColor(node.type);
            const isSelected = selectedNodeId === node.id;
            const isActivelyTracing = activeTraceNodeId === node.id;
            const traceStep = simTrace.find(t => t.node_id === node.id);

            return (
              <div
                key={node.id}
                onMouseDown={(e) => handleNodeMouseDown(e, node)}
                onDoubleClick={() => setConfigModalNode(node)}
                style={{
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  width: '180px',
                  backgroundColor: style.bg,
                  borderColor: isActivelyTracing ? '#10b981' : isSelected ? '#38bdf8' : style.border,
                  boxShadow: isActivelyTracing 
                    ? '0 0 24px rgba(16, 185, 129, 0.6)' 
                    : isSelected 
                    ? '0 0 16px rgba(56, 189, 248, 0.4)' 
                    : '0 4px 12px rgba(0, 0, 0, 0.5)'
                }}
                className={`absolute z-20 rounded-xl border-2 p-3 cursor-move transition-shadow duration-150 backdrop-blur-md ${
                  isActivelyTracing ? 'ring-2 ring-emerald-400 scale-105' : ''
                }`}
              >
                {/* Node Top Row */}
                <div className="flex items-center justify-between mb-1.5">
                  <span 
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white font-mono"
                    style={{ backgroundColor: style.badge }}
                  >
                    {node.type}
                  </span>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfigModalNode(node); }}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
                      title="Configure Node"
                    >
                      <Settings className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteNode(node.id); }}
                      className="p-1 rounded hover:bg-rose-900/60 text-slate-400 hover:text-rose-400 transition"
                      title="Delete Node"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Node Title & Description */}
                <div className="text-xs font-bold text-white truncate" title={node.name}>
                  {node.name}
                </div>
                <div className="text-[10px] text-slate-300 truncate mt-0.5" title={node.details}>
                  {node.details}
                </div>

                {/* Associated Asset and Selected Attributes */}
                {node.configuration?.asset_name && (
                  <div className="mt-1 pt-1 border-t border-slate-700/50 text-[9px] text-cyan-300 font-mono truncate flex items-center gap-1">
                    <Database className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                    <span className="truncate">{node.configuration.asset_name}</span>
                  </div>
                )}
                {node.configuration?.selected_attributes?.length > 0 && (
                  <div className="text-[8.5px] text-emerald-400 font-mono truncate mt-0.5">
                    🏷️ {node.configuration.selected_attributes.join(', ')}
                  </div>
                )}

                {/* Trace Badge during simulation */}
                {traceStep && (
                  <div className="mt-2 pt-1.5 border-t border-slate-700/60 flex items-center justify-between text-[10px] font-mono">
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      {traceStep.relation}
                    </span>
                    <span className="text-slate-400">
                      {traceStep.latency_ms}ms
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* 2C. RIGHT PANEL: LIVE SIMULATOR PAYLOAD & DEBUG TRACE INSPECTOR         */}
        {/* ----------------------------------------------------------------------- */}
        <div className="w-80 border-l border-slate-800 bg-[#091122] flex flex-col shrink-0">
          
          {/* Header */}
          <div className="p-3 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              Debug Events Tracer
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-indigo-950 text-indigo-400 border border-indigo-800">
              Live Inspector
            </span>
          </div>

          {/* Test Payload Editor */}
          <div className="p-3 border-b border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-300">Inbound Message (JSON)</span>
              <button 
                onClick={() => setSimPayload(JSON.stringify({
                  asset_id: "ast-unit-cdu",
                  device_id: "dev-cdu-01",
                  temperature: 194.2,
                  pressure: 310.5,
                  status: "CRITICAL_TRIP"
                }, null, 2))}
                className="text-[10px] text-cyan-400 hover:underline"
              >
                Load Trip Scenario
              </button>
            </div>
            <textarea
              value={simPayload}
              onChange={(e) => setSimPayload(e.target.value)}
              rows={6}
              className="w-full bg-[#040812] border border-slate-800 rounded-lg p-2 font-mono text-[11px] text-cyan-300 focus:outline-none focus:border-cyan-500 resize-none"
            />
          </div>

          {/* Step Execution Trace Log */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2">
            <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
              <span>Execution Trace:</span>
              <span className="text-[10px] text-slate-400 font-mono">
                {simTrace.length} Steps Logged
              </span>
            </div>

            {simTrace.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                Click <b>"Test Run Engine"</b> to dispatch message and inspect live node execution steps.
              </div>
            ) : (
              simTrace.map((step, idx) => (
                <div 
                  key={idx}
                  className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1 font-mono text-[11px]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white font-bold truncate max-w-[170px]">
                      {idx + 1}. {step.node_name}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                      {step.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="text-cyan-400 font-semibold">
                      Out: {step.relation}
                    </span>
                    <span>{step.latency_ms} ms</span>
                  </div>
                  {step.details && (
                    <div className="text-[10px] text-slate-300 bg-slate-950 p-1.5 rounded border border-slate-800/80 truncate">
                      {step.details}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Connection Links List & Management */}
          <div className="p-3 border-t border-slate-800 bg-[#070d19]">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1.5">
              <span>Configured Links ({activeChain.connections.length})</span>
            </div>
            <div className="max-h-24 overflow-y-auto space-y-1 text-[10px]">
              {activeChain.connections.map((c, i) => {
                const s = activeChain.nodes.find(n => n.id === c.from)?.name || c.from;
                const t = activeChain.nodes.find(n => n.id === c.to)?.name || c.to;
                return (
                  <div key={i} className="flex items-center justify-between bg-slate-900 px-2 py-1 rounded border border-slate-800">
                    <span className="truncate max-w-[210px] text-slate-300">
                      {s} → <b>{c.label}</b> → {t}
                    </span>
                    <button 
                      onClick={() => handleDeleteConnection(i)}
                      className="text-slate-500 hover:text-rose-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MODAL: CONNECT NODES                                                   */}
      {/* ========================================================================= */}
      {linkModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-cyan-400" />
                Connect Rule Nodes
              </h3>
              <button onClick={() => setLinkModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300">From Node (Source)</label>
                <select
                  value={linkSourceId}
                  onChange={(e) => setLinkSourceId(e.target.value)}
                  className="w-full mt-1 bg-slate-900 border border-slate-700 text-xs text-white rounded-lg p-2.5"
                >
                  {activeChain.nodes.map(n => (
                    <option key={n.id} value={n.id}>{n.name} ({n.type})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Relation Type</label>
                <select
                  value={linkLabel}
                  onChange={(e) => setLinkLabel(e.target.value)}
                  className="w-full mt-1 bg-slate-900 border border-slate-700 text-xs text-white rounded-lg p-2.5 font-mono"
                >
                  <option value="Success">Success</option>
                  <option value="Failure">Failure</option>
                  <option value="True">True</option>
                  <option value="False">False</option>
                  <option value="Post Telemetry">Post Telemetry</option>
                  <option value="Post Attributes">Post Attributes</option>
                  <option value="RPC Request">RPC Request</option>
                  <option value="Alarm Created">Alarm Created</option>
                  <option value="Alarm Cleared">Alarm Cleared</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">To Node (Destination)</label>
                <select
                  value={linkTargetId}
                  onChange={(e) => setLinkTargetId(e.target.value)}
                  className="w-full mt-1 bg-slate-900 border border-slate-700 text-xs text-white rounded-lg p-2.5"
                >
                  {activeChain.nodes.map(n => (
                    <option key={n.id} value={n.id}>{n.name} ({n.type})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setLinkModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateConnection}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-indigo-600/30"
              >
                Create Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL: NODE CONFIGURATION DRAWER                                       */}
      {/* ========================================================================= */}
      {configModalNode && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    Configure: {configModalNode.name}
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    Node ID: {configModalNode.id} ({configModalNode.type})
                  </span>
                </div>
              </div>
              <button onClick={() => setConfigModalNode(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              <div>
                <label className="text-xs font-semibold text-slate-300">Node Name</label>
                <input
                  type="text"
                  value={configModalNode.name}
                  onChange={(e) => setConfigModalNode({ ...configModalNode, name: e.target.value })}
                  className="w-full mt-1 bg-slate-900 border border-slate-700 text-xs text-white rounded-lg p-2.5"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Description / Details</label>
                <input
                  type="text"
                  value={configModalNode.details}
                  onChange={(e) => setConfigModalNode({ ...configModalNode, details: e.target.value })}
                  className="w-full mt-1 bg-slate-900 border border-slate-700 text-xs text-white rounded-lg p-2.5"
                />
              </div>

              {/* Asset Association & Attribute Picker Section */}
              <div className="p-3 bg-slate-900/90 border border-slate-700/80 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-cyan-400" />
                    Plant Asset & Attribute Binding
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {assets.length} Plant Assets
                  </span>
                </div>

                {/* Asset Selector Dropdown */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 mb-1 block">
                    Target Plant Asset (Yokogawa DM):
                  </label>
                  <select
                    value={configModalNode.configuration?.asset_id || ''}
                    onChange={(e) => {
                      const selAsset = assets.find(a => a.id === e.target.value);
                      setConfigModalNode({
                        ...configModalNode,
                        configuration: {
                          ...configModalNode.configuration,
                          asset_id: e.target.value,
                          asset_name: selAsset ? selAsset.name : ''
                        }
                      });
                    }}
                    className="w-full bg-[#040812] border border-slate-700 text-xs text-white rounded-lg p-2 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="">-- Generic Ingress (Any Originator) --</option>
                    {assets.map(a => (
                      <option key={a.id} value={a.id}>
                        [{a.level || 'UNIT'}] {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Attribute Checklist & Selector */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-semibold text-slate-300">
                      Select Attributes & Telemetry Tags:
                    </label>
                    <span className="text-[10px] text-emerald-400 font-mono">
                      Click to toggle in rule
                    </span>
                  </div>

                  {/* Attribute pills */}
                  <div className="flex flex-wrap gap-1.5 p-2 bg-slate-950/80 rounded-lg border border-slate-800 max-h-36 overflow-y-auto">
                    {(() => {
                      const curAsset = assets.find(a => a.id === configModalNode.configuration?.asset_id);
                      const dynamicAttrs = curAsset?.attributes?.map(at => at.metric || at.name) || [];
                      const allKeyOptions = Array.from(new Set([
                        ...dynamicAttrs,
                        'temperature', 'pressure', 'flow_rate', 'sump_level', 'vibration_rms', 'liquid_level', 'feed_flow', 'discharge_pressure', 'status'
                      ]));
                      const selected = configModalNode.configuration?.selected_attributes || [];

                      return allKeyOptions.map(keyName => {
                        const isSelected = selected.includes(keyName);
                        return (
                          <button
                            key={keyName}
                            type="button"
                            onClick={() => {
                              const nextSelected = isSelected
                                ? selected.filter(k => k !== keyName)
                                : [...selected, keyName];
                              setConfigModalNode({
                                ...configModalNode,
                                configuration: {
                                  ...configModalNode.configuration,
                                  selected_attributes: nextSelected
                                }
                              });
                            }}
                            className={`px-2 py-1 rounded text-[10px] font-mono font-medium transition flex items-center gap-1 border ${
                              isSelected
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                                : 'bg-slate-800 text-slate-400 border-slate-700/60 hover:text-white hover:border-slate-600'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-cyan-400' : 'bg-slate-600'}`} />
                            {keyName}
                            {isSelected && <Check className="w-2.5 h-2.5 ml-0.5" />}
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Quick Insert Condition Helper */}
                <div className="p-2 bg-slate-950/90 border border-slate-800/90 rounded-lg space-y-2">
                  <div className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                    <span>Quick Attribute Threshold Condition:</span>
                    <span className="text-[9px] text-slate-500 font-mono">JS Rule Injector</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      id="quick-attr-key"
                      defaultValue="temperature"
                      className="bg-slate-900 border border-slate-700 text-xs text-white rounded p-1.5 flex-1 font-mono"
                    >
                      {(configModalNode.configuration?.selected_attributes?.length > 0 
                        ? configModalNode.configuration.selected_attributes 
                        : ['temperature', 'pressure', 'flow_rate', 'sump_level', 'vibration_rms']).map(k => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </select>
                    <select
                      id="quick-attr-op"
                      defaultValue=">"
                      className="bg-slate-900 border border-slate-700 text-xs text-white rounded p-1.5 font-mono"
                    >
                      <option value=">">&gt;</option>
                      <option value="<">&lt;</option>
                      <option value=">=">&gt;=</option>
                      <option value="<=">&lt;=</option>
                      <option value="==">==</option>
                      <option value="!=">!=</option>
                    </select>
                    <input
                      id="quick-attr-val"
                      defaultValue="85.0"
                      className="bg-slate-900 border border-slate-700 text-xs text-white rounded p-1.5 w-16 font-mono text-center"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const key = document.getElementById('quick-attr-key')?.value || 'temperature';
                        const op = document.getElementById('quick-attr-op')?.value || '>';
                        const val = document.getElementById('quick-attr-val')?.value || '85.0';
                        const newScript = `return msg.${key} ${op} ${val};`;
                        setConfigModalNode({
                          ...configModalNode,
                          configuration: {
                            ...configModalNode.configuration,
                            script: newScript,
                            attribute_name: key,
                            operator: op,
                            threshold: val
                          }
                        });
                        showToast(`Injected condition for ${key}`, 'info');
                      }}
                      className="px-2.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold shrink-0 shadow"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>

              {/* Type-specific editor */}
              {configModalNode.configuration?.script !== undefined && (
                <div>
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>JavaScript Evaluation Logic</span>
                    <span className="text-[10px] text-cyan-400 font-mono">function (msg, metadata, msgType)</span>
                  </label>
                  <textarea
                    rows={6}
                    value={configModalNode.configuration.script}
                    onChange={(e) => setConfigModalNode({
                      ...configModalNode,
                      configuration: { ...configModalNode.configuration, script: e.target.value }
                    })}
                    className="w-full mt-1 bg-[#040812] border border-slate-700 rounded-lg p-2.5 font-mono text-xs text-emerald-300 resize-none"
                  />
                </div>
              )}

              {configModalNode.configuration?.alarmType !== undefined && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300">Alarm Type</label>
                    <input
                      type="text"
                      value={configModalNode.configuration.alarmType}
                      onChange={(e) => setConfigModalNode({
                        ...configModalNode,
                        configuration: { ...configModalNode.configuration, alarmType: e.target.value }
                      })}
                      className="w-full mt-1 bg-slate-900 border border-slate-700 text-xs text-white rounded-lg p-2"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300">Severity</label>
                    <select
                      value={configModalNode.configuration.severity || 'CRITICAL'}
                      onChange={(e) => setConfigModalNode({
                        ...configModalNode,
                        configuration: { ...configModalNode.configuration, severity: e.target.value }
                      })}
                      className="w-full mt-1 bg-slate-900 border border-slate-700 text-xs text-white rounded-lg p-2"
                    >
                      <option value="CRITICAL">CRITICAL</option>
                      <option value="MAJOR">MAJOR</option>
                      <option value="MINOR">MINOR</option>
                      <option value="WARNING">WARNING</option>
                      <option value="INDETERMINATE">INDETERMINATE</option>
                    </select>
                  </div>
                </div>
              )}

              {configModalNode.configuration?.endpoint !== undefined && (
                <div>
                  <label className="text-xs font-semibold text-slate-300">Destination HTTP Endpoint</label>
                  <input
                    type="text"
                    value={configModalNode.configuration.endpoint}
                    onChange={(e) => setConfigModalNode({
                      ...configModalNode,
                      configuration: { ...configModalNode.configuration, endpoint: e.target.value }
                    })}
                    className="w-full mt-1 bg-slate-900 border border-slate-700 text-xs text-white rounded-lg p-2.5 font-mono"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setConfigModalNode(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold rounded-lg"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setActiveChain({
                    ...activeChain,
                    nodes: activeChain.nodes.map(n => n.id === configModalNode.id ? configModalNode : n)
                  });
                  setConfigModalNode(null);
                  showToast('Node configuration updated', 'success');
                }}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: IMPORT THINGSBOARD RULE CHAIN JSON                                */}
      {/* ========================================================================= */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#0b1329] border border-slate-700 rounded-xl max-w-xl w-full p-5 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-500/10 border border-purple-500/30 rounded-lg text-purple-400">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Import ThingsBoard Rule Chain</h3>
                  <p className="text-xs text-slate-400">Upload or paste ThingsBoard JSON schema (v3.x / Community & PE)</p>
                </div>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Upload File (.json)</label>
                <input 
                  type="file" 
                  accept=".json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        setImportJsonText(ev.target?.result || '');
                      };
                      reader.readAsText(file);
                    }
                  }}
                  className="w-full text-xs text-slate-300 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-purple-300 hover:file:bg-slate-700 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Or Paste ThingsBoard Rule Chain JSON</label>
                <textarea 
                  rows={9}
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder={`{\n  "ruleChain": { "name": "Telemetry Pipeline", "type": "CORE" },\n  "metadata": {\n    "nodes": [...],\n    "connections": [...]\n  }\n}`}
                  className="w-full bg-[#040812] border border-slate-700 rounded-lg p-2.5 font-mono text-xs text-purple-300 focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button 
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button 
                onClick={handleImportTbJson}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-purple-600/30 transition"
              >
                Import &amp; Load Rule Chain
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NEW RULE CHAIN                                                     */}
      {/* ========================================================================= */}
      {isNewChainModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#0b1329] border border-slate-700 rounded-xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Create New Rule Chain</h3>
                  <p className="text-xs text-slate-400">Instantiate visual pipeline with input gateway node</p>
                </div>
              </div>
              <button onClick={() => setIsNewChainModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Pipeline Blueprint / Template</label>
                <select
                  value={newChainType}
                  onChange={(e) => {
                    const t = e.target.value;
                    setNewChainType(t);
                    if (t === 'kpi_derivations') {
                      setNewChainName('Real-time KPI Derivations & Plant Efficiency Pipeline');
                      setNewChainDesc('Event-driven calculation pipeline: Ingests asset telemetry, computes OEE and thermal efficiency, updates asset attributes, and triggers alarm on low performance.');
                    } else if (t === 'standard_alarm') {
                      setNewChainName('Standard Telemetry & Process Alarm Pipeline');
                      setNewChainDesc('Monitors temperature and pressure thresholds and raises ISA-18.2 urgent process alarms.');
                    } else {
                      setNewChainName('Custom Ingress Pipeline');
                      setNewChainDesc('Blank pipeline canvas starting with a single telemetry ingress node.');
                    }
                  }}
                  className="w-full bg-slate-900 border border-slate-700 text-xs text-emerald-400 font-semibold rounded-lg p-2.5 focus:outline-none focus:border-emerald-500"
                >
                  <option value="kpi_derivations">✨ KPI Derivations & Plant Efficiency Pipeline (OEE &amp; Heat Metrics)</option>
                  <option value="standard_alarm">⚡ Standard Telemetry &amp; Process Alarm Pipeline</option>
                  <option value="blank">📄 Blank Canvas (Single Ingress Gateway Node)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Rule Chain Name *</label>
                <input 
                  type="text" 
                  value={newChainName}
                  onChange={(e) => setNewChainName(e.target.value)}
                  placeholder="e.g. Flare Gas Emission Monitor & Alarm Rule"
                  className="w-full bg-slate-900 border border-slate-700 text-xs text-white rounded-lg p-2.5 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Description</label>
                <textarea 
                  rows={3}
                  value={newChainDesc}
                  onChange={(e) => setNewChainDesc(e.target.value)}
                  placeholder="Describe message routing, thresholds and target actuators..."
                  className="w-full bg-slate-900 border border-slate-700 text-xs text-white rounded-lg p-2.5 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button 
                onClick={() => setIsNewChainModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateNewChain}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-emerald-600/30 transition"
              >
                Create Rule Chain
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
