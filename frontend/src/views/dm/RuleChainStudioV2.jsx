import React, { useState, useEffect, useRef } from 'react';
import { 
  GitFork, Play, Plus, Trash2, ArrowRight, CheckCircle2, 
  AlertTriangle, Filter, Layers, Zap, Database, Share2, 
  Settings, RefreshCw, Terminal, Eye, Code, Radio, Shield,
  Cpu, Activity, Check, Sparkles, X, Move, ChevronDown, 
  ChevronRight, Save, FileCode, Sliders, ExternalLink, Mail,
  Send, MessageSquare, AlertOctagon, HelpCircle, Download,
  Upload, Star, PlusCircle, FileText, CornerDownRight, Box
} from 'lucide-react';
import { useDM } from './dmContext';
import NewRuleChainModal from './NewRuleChainModal';

// ThingsBoard Rule Engine Complete 7-Category Palette Catalog
const TB_NODE_PALETTE_V2 = [
  {
    category: 'FILTER',
    title: 'Filter Nodes',
    icon: Filter,
    color: '#eab308',
    items: [
      { type: 'CUSTOM_JS_FILTER', name: 'Custom JS Filter Node', details: 'Sandboxed JS boolean condition (routes to True/False)', defaultConf: { script: 'function filter(msg, metadata, msgType) {\n  return Number(msg.temperature) > 90.0;\n}' } },
      { type: 'CUSTOM_JS_ROUTER', name: 'Custom JS Switch Router', details: 'Routes to dynamic relations by JavaScript', defaultConf: { script: 'function route(msg, metadata, msgType) {\n  return [msg.status === "TRIP" ? "Trip" : "Normal"];\n}' } },
      { type: 'FILTER', name: 'Script Message Filter', details: 'Evaluates JS boolean condition', defaultConf: { script: 'return msg.temperature > 85 || msg.pressure > 250;' } },
      { type: 'FILTER', name: 'Asset Attribute Condition', details: 'Filters telemetry against selected Asset & Attribute', defaultConf: { asset_id: '', operator: '>', threshold: '0.0' } },
      { type: 'FILTER', name: 'Check Relation', details: 'Checks originator entity relation in hierarchy', defaultConf: { relationType: 'Contains', entityType: 'ASSET' } },
      { type: 'FILTER', name: 'Switch (Router)', details: 'Routes to dynamic relations by script', defaultConf: { script: 'return [msg.status === "TRIP" ? "Trip" : "Normal"];' } },
      { type: 'FILTER', name: 'Check Message Type', details: 'Matches POST_TELEMETRY / RPC / ALARM', defaultConf: { messageNames: ['POST_TELEMETRY_REQUEST', 'POST_ATTRIBUTES_REQUEST'] } },
      { type: 'FILTER', name: 'Quality Guard Filter', details: 'Filters out BAD, UNCERTAIN or STALE data', defaultConf: { allow_uncertain: false } }
    ]
  },
  {
    category: 'ENRICHMENT',
    title: 'Enrichment Nodes',
    icon: Layers,
    color: '#06b6d4',
    items: [
      { type: 'CUSTOM_JS_ENRICHMENT', name: 'Custom JS Enrichment Node', details: 'Enriches metadata & msg from context via JavaScript', defaultConf: { script: 'function enrich(msg, metadata, msgType, ctx) {\n  return {\n    msg: { ...msg, facility: "Refinery Unit 1" },\n    metadata: { ...metadata, enriched: true }\n  };\n}' } },
      { type: 'ENRICHMENT', name: 'Asset Telemetry Enrichment', details: 'Enriches message with live attributes from selected Asset', defaultConf: { asset_id: '', selected_attributes: [] } },
      { type: 'ENRICHMENT', name: 'Originator Attributes', details: 'Enriches metadata from originator entity', defaultConf: { selectedFields: ['name', 'label', 'type'] } },
      { type: 'ENRICHMENT', name: 'Related Asset Attributes', details: 'Traverses entity relations to fetch parent attributes', defaultConf: { relationType: 'Contains' } },
      { type: 'ENRICHMENT', name: 'Function Block Output', details: 'Enriches message with latest output of a V8 Function Block', defaultConf: { block_id: 'cfb-pump-kpi-01' } }
    ]
  },
  {
    category: 'TRANSFORM',
    title: 'Transformation Nodes',
    icon: Zap,
    color: '#a855f7',
    items: [
      { type: 'CUSTOM_JS_TRANSFORM', name: 'Custom JS Transform Node', details: 'Transforms msg/metadata using sandboxed JavaScript', defaultConf: { script: 'function transform(msg, metadata, msgType) {\n  return {\n    msg: {\n      ...msg,\n      temperatureC: Number(((Number(msg.temperatureF || 212) - 32) / 1.8).toFixed(2))\n    },\n    metadata,\n    msgType\n  };\n}' } },
      { type: 'CUSTOM_JS_KPI', name: 'Custom JS KPI Engine', details: 'Calculates derived KPIs (SEC, Yield, OEE)', defaultConf: { script: 'function calculate(ctx, inputs) {\n  return {\n    kpiValue: inputs.power / inputs.flow\n  };\n}' } },
      { 
        type: 'TRANSFORM', 
        name: 'KPI Derivation & Production Metrics', 
        details: 'Calculates OEE %, Availability, Quality, and Thermal Efficiency', 
        defaultConf: { 
          kpi_type: 'OEE_AND_EFFICIENCY',
          script: `const runHours = Number(msg.run_hours || 24);
const plannedHours = Number(msg.planned_hours || 24);
const avail = Math.min(1.0, runHours / Math.max(plannedHours, 1));

const prod = Number(msg.production_count || msg.throughput || 940);
const cap = Number(msg.target_capacity || 1000);
const perf = Math.min(1.0, prod / Math.max(cap, 1));

const good = Number(msg.good_count || 928);
const qual = prod > 0 ? (good / prod) : 1.0;

const oee = Number((avail * perf * qual * 100).toFixed(2));
msg.oee_percent = oee;
msg.thermal_efficiency = 86.4;
msg.kpi_timestamp = new Date().toISOString();

return { msg: msg, metadata: metadata, msgType: msgType };`
        } 
      },
      { type: 'TRANSFORM', name: 'Script Transformation', details: 'Transforms msg/metadata via JavaScript logic', defaultConf: { script: 'msg.pressure_bar = msg.pressure / 100;\nreturn {msg: msg, metadata: metadata, msgType: msgType};' } },
      { type: 'TRANSFORM', name: 'To Email Payload', details: 'Formats HTML body for email alerts', defaultConf: { template: 'Alert on <%= msg.deviceName %>' } },
      { type: 'TRANSFORM', name: 'Unit Conversion', details: 'Converts engineering units (°C <-> °F, kPa <-> bar)', defaultConf: { conversion: 'kPa_to_bar' } }
    ]
  },
  {
    category: 'ACTION',
    title: 'Action Nodes',
    icon: Activity,
    color: '#10b981',
    items: [
      { type: 'EXECUTE_FUNCTION_BLOCK', name: 'Execute Custom Function Block', details: 'Executes user-defined custom Function Block (e.g. Pump KPI)', defaultConf: { block_id: 'cfb-pump-kpi-01', persist_kpi: true } },
      { type: 'ACTION', name: 'Save Timeseries', details: 'Stores data in timeseries partition (PostgreSQL & Redis)', defaultConf: { ttl: 86400, skipLatest: false } },
      { type: 'ACTION', name: 'Save Attributes', details: 'Persists attributes to entity storage', defaultConf: { scope: 'SERVER_SCOPE' } },
      { type: 'ACTION', name: 'Create Process Alarm', details: 'Raises ISA-18.2 Process Alarm with severity', defaultConf: { alarm_type: 'High Temperature Trip', severity: 'CRITICAL', propagate: true } },
      { type: 'ACTION', name: 'Clear Process Alarm', details: 'Clears active alarm on normal state', defaultConf: { alarm_type: 'High Temperature Trip' } },
      { type: 'ACTION', name: 'Trigger Function Block', details: 'Dispatches execution to a V8 Function Block', defaultConf: { block_id: 'fb-kpi-001' } }
    ]
  },

  {
    category: 'EXTERNAL',
    title: 'External Integration',
    icon: ExternalLink,
    color: '#f97316',
    items: [
      { type: 'EXTERNAL', name: 'HTTP Webhook Dispatcher', details: 'POST/PUT webhook to Node-RED / n8n / REST target', defaultConf: { endpoint: 'http://127.0.0.1:1880/telemetry', method: 'POST' } },
      { type: 'EXTERNAL', name: 'Kafka Message Producer', details: 'Publishes message to Kafka topic', defaultConf: { topic: 'telemetry.ingress.v1', bootstrapServers: 'localhost:9092' } },
      { type: 'EXTERNAL', name: 'MQTT Broker Forwarder', details: 'Forwards message to external MQTT broker', defaultConf: { topic: 'v1/devices/me/telemetry', host: 'localhost', port: 1883 } },
      { type: 'EXTERNAL', name: 'Send Email Notification', details: 'Transmits SMTP email alert', defaultConf: { to: 'shift-supervisor@yokogawa.com', subject: 'Emergency Trip Notice' } }
    ]
  },
  {
    category: 'FLOW_CONTROL',
    title: 'Flow Control & Subchains',
    icon: GitFork,
    color: '#3b82f6',
    items: [
      { type: 'FLOW_CONTROL', name: 'Rule Chain Call (Nested)', details: 'Invokes another Rule Chain with parameter forwarding', defaultConf: { ruleChainId: 'rc-nodered-02' } },
      { type: 'FLOW_CONTROL', name: 'Checkpoint', details: 'Saves execution state to prevent message loss', defaultConf: { queueName: 'Main' } },
      { type: 'FLOW_CONTROL', name: 'Dead Letter Route', details: 'Catches unhandled errors and redirects to DLQ', defaultConf: { maxRetries: 3 } }
    ]
  },
  {
    category: 'ANALYTICS',
    title: 'Analytics Nodes',
    icon: Box,
    color: '#ec4899',
    items: [
      { type: 'ANALYTICS', name: 'Rolling Count & Rate', details: 'Tracks event frequency over sliding window', defaultConf: { windowSec: 60 } },
      { type: 'ANALYTICS', name: 'Window Average', details: 'Maintains running mathematical average', defaultConf: { sampleCount: 20 } },
      { type: 'ANALYTICS', name: 'Threshold Persistence', details: 'Tracks duration value stays above threshold', defaultConf: { threshold: 85.0, durationSec: 30 } }
    ]
  }
];

export default function RuleChainStudioV2() {
  const { assets = [], devices = [], showToast } = useDM();

  const [ruleChains, setRuleChains] = useState([]);
  const [activeChainId, setActiveChainId] = useState('');
  const [activeChain, setActiveChain] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newChainModalOpen, setNewChainModalOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [activating, setActivating] = useState(false);


  // Expanded Categories in Palette
  const [expandedCategories, setExpandedCategories] = useState({
    FILTER: true,
    ENRICHMENT: true,
    TRANSFORM: true,
    ACTION: true,
    EXTERNAL: false,
    FLOW_CONTROL: true,
    ANALYTICS: false
  });

  // Selected Node & Canvas dragging
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);

  // Link Modal
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkSourceId, setLinkSourceId] = useState('');
  const [linkTargetId, setLinkTargetId] = useState('');
  const [linkLabel, setLinkLabel] = useState('Success');

  // Simulation Bench State
  const [simPayload, setSimPayload] = useState(
    JSON.stringify({
      run_hours: 24,
      planned_hours: 24,
      throughput: 950,
      target_capacity: 1000,
      good_count: 938,
      temperature: 94.6,
      pressure: 268.4
    }, null, 2)
  );
  const [simTrace, setSimTrace] = useState([]);
  const [simRunning, setSimRunning] = useState(false);
  const [bottomOpen, setBottomOpen] = useState(true);

  // Fetch Rule Chains on Mount
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
      console.error('Failed to fetch rule chains:', e);
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

  // Dragging Node on Canvas
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
    const newX = Math.max(20, Math.min(1600, (e.clientX - canvasRect.left) - dragOffset.x));
    const newY = Math.max(20, Math.min(1000, (e.clientY - canvasRect.top) - dragOffset.y));

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
    const count = activeChain.nodes.length;
    const newNode = {
      id,
      type: item.type,
      name: item.name,
      category: item.type,
      x: 100 + ((count % 4) * 230),
      y: 100 + (Math.floor(count / 4) * 140),
      details: item.details,
      configuration: { ...item.defaultConf }
    };

    setActiveChain(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode]
    }));
    setSelectedNodeId(newNode.id);
    showToast(`Added '${item.name}' node`, 'info');
  };

  // Delete Node
  const handleDeleteNode = (nodeId) => {
    if (!activeChain) return;
    setActiveChain(prev => ({
      ...prev,
      nodes: prev.nodes.filter(n => n.id !== nodeId),
      connections: prev.connections.filter(c => c.from !== nodeId && c.to !== nodeId && c.from_node !== nodeId && c.to_node !== nodeId)
    }));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
    showToast('Rule node removed', 'info');
  };

  // Add Link
  const handleCreateConnection = () => {
    if (!linkSourceId || !linkTargetId) {
      showToast('Select both source and target nodes', 'error');
      return;
    }
    const newConn = {
      from: linkSourceId,
      to: linkTargetId,
      label: linkLabel
    };
    setActiveChain(prev => ({
      ...prev,
      connections: [...prev.connections, newConn]
    }));
    setLinkModalOpen(false);
    showToast(`Linked with '${linkLabel}' relationship`, 'success');
  };

  // Save Rule Chain
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
      }
    } catch (e) {
      showToast(`Save error: ${e.message}`, 'error');
    }
  };

  // Publish Rule Chain (Version Increment)
  const handlePublishRuleChain = async () => {
    if (!activeChain) return;
    setPublishing(true);
    try {
      const res = await fetch(`/api/v2/rule-chains/${activeChain.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (res.ok) {
        const data = await res.json();
        showToast(`Rule Chain published as version ${data.rule_chain?.version || 'new'}`, 'success');
        fetchRuleChains();
      } else {
        const err = await res.json();
        showToast(`Publish error: ${err.detail || 'Failed to publish'}`, 'error');
      }
    } catch (e) {
      showToast(`Publish error: ${e.message}`, 'error');
    } finally {
      setPublishing(false);
    }
  };

  // Activate Rule Chain on Cluster
  const handleActivateRuleChain = async () => {
    if (!activeChain) return;
    setActivating(true);
    try {
      const res = await fetch(`/api/v2/rule-chains/${activeChain.id}/activate`, {
        method: 'POST'
      });
      if (res.ok) {
        showToast(`Rule Chain '${activeChain.name}' is now ACTIVE on telemetry ingress`, 'success');
        fetchRuleChains();
      } else {
        showToast('Activation failed', 'error');
      }
    } catch (e) {
      showToast(`Activate error: ${e.message}`, 'error');
    } finally {
      setActivating(false);
    }
  };

  // Run Test Simulation with real message engine
  const handleRunSimulation = async () => {

    let parsed;
    try {
      parsed = JSON.parse(simPayload);
    } catch (e) {
      showToast('Invalid JSON input for simulation', 'error');
      return;
    }

    setSimRunning(true);
    try {
      const res = await fetch('/api/v1/dm/rule-chains/test-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chain_id: activeChain.id,
          message: parsed,
          metadata: { source: 'CENTUM_VP_DCS', origin: 'RuleChainStudioV2' },
          msg_type: 'POST_TELEMETRY_REQUEST'
        })
      });
      const data = await res.json();
      if (data.status === 'SUCCESS') {
        setSimTrace(data.trace || []);
        showToast(`Traversed ${data.total_nodes_traversed} nodes in ${data.total_latency_ms}ms`, 'success');
      } else {
        showToast('Simulation encountered an error', 'error');
      }
    } catch (e) {
      showToast(`Simulation failed: ${e.message}`, 'error');
    } finally {
      setSimRunning(false);
    }
  };

  const getRelationColor = (label = 'Success') => {
    switch (label) {
      case 'True':
      case 'Success': return '#10b981';
      case 'False':
      case 'Failure': return '#f43f5e';
      case 'Trip':
      case 'Alarm Created': return '#f59e0b';
      default: return '#06b6d4';
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] w-full bg-[#080d1a] text-slate-100 overflow-hidden font-sans select-none">
      {/* 1. TOP TOOLBAR */}
      <div className="h-12 bg-[#091122] border-b border-slate-800 px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-indigo-950/60 border border-indigo-800 text-indigo-400">
            <GitFork className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-100 tracking-wide">
                Visual Rule Chain Studio V2
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800">
                ThingsBoard PE Parity
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-md">
              {activeChain?.name || 'Rule Chain'}
            </p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2">
          {/* Create New Rule Chain Button */}
          <button
            onClick={() => setNewChainModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold rounded-lg shadow-md shadow-indigo-600/30 transition shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Rule Chain</span>
          </button>

          {/* Chain Selector */}
          <select
            value={activeChainId}
            onChange={(e) => handleSelectChain(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 font-medium"
          >
            {ruleChains.map(rc => (
              <option key={rc.id} value={rc.id}>
                {rc.name} {rc.is_root ? '★ (Root)' : ''}
              </option>
            ))}
          </select>

          {/* Connect Link */}
          <button
            onClick={() => {
              if (activeChain?.nodes.length >= 2) {
                setLinkSourceId(activeChain.nodes[0].id);
                setLinkTargetId(activeChain.nodes[1].id);
                setLinkModalOpen(true);
              } else {
                showToast('Add at least 2 nodes to connect relation', 'error');
              }
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
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

          {/* Publish Rule Chain */}
          <button
            onClick={handlePublishRuleChain}
            disabled={publishing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-400 text-xs font-semibold rounded-lg transition"
            title="Publish immutable version snapshot"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{publishing ? 'Publishing...' : 'Publish'}</span>
          </button>

          {/* Activate Rule Chain */}
          <button
            onClick={handleActivateRuleChain}
            disabled={activating}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700 text-emerald-400 text-xs font-semibold rounded-lg transition"
            title="Activate this rule chain on live cluster"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{activating ? 'Activating...' : 'Activate'}</span>
          </button>


          {/* Test Run Simulator */}
          <button
            onClick={handleRunSimulation}
            disabled={simRunning}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg shadow-lg transition ${
              simRunning ? 'bg-amber-600 text-white cursor-wait' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
            }`}
          >
            <Play className={`w-3.5 h-3.5 ${simRunning ? 'animate-spin' : ''}`} />
            <span>{simRunning ? 'Simulating...' : 'Test Run'}</span>
          </button>
        </div>
      </div>

      {/* 2. THREE-PANEL CORE: Left Palette | Center Canvas | Right Inspector */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* ------------------------------------------------------------- */}
        {/* 2A. LEFT PANEL: Complete 7-Category Node Palette              */}
        {/* ------------------------------------------------------------- */}
        <div className="w-72 border-r border-slate-800 bg-[#091122] flex flex-col shrink-0 overflow-y-auto p-2 space-y-2">
          <div className="px-2 py-1 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-300">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              Node Library
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              7 Categories
            </span>
          </div>

          {TB_NODE_PALETTE_V2.map(category => (
            <div key={category.category} className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/40">
              <button
                onClick={() => setExpandedCategories(prev => ({ ...prev, [category.category]: !prev[category.category] }))}
                className="w-full px-3 py-2 flex items-center justify-between text-xs font-semibold text-slate-300 bg-slate-900/60 hover:bg-slate-900 transition"
              >
                <div className="flex items-center gap-2">
                  <category.icon className="w-3.5 h-3.5" style={{ color: category.color }} />
                  <span>{category.title}</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${expandedCategories[category.category] ? 'rotate-180' : ''}`} />
              </button>

              {expandedCategories[category.category] && (
                <div className="p-1.5 space-y-1 bg-[#070c17]">
                  {category.items.map(item => (
                    <div
                      key={item.name}
                      onClick={() => handleAddNodeFromPalette(item)}
                      className="p-2 rounded bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition text-xs group"
                    >
                      <div className="font-semibold text-slate-200 group-hover:text-cyan-300 truncate">
                        {item.name}
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {item.details}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 2B. CENTER CANVAS: Visual Rule Engine Graph & Multi-Relations  */}
        {/* ------------------------------------------------------------- */}
        <div
          ref={canvasRef}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          className="flex-1 relative overflow-auto bg-[#070b14] cursor-crosshair select-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}
        >
          {/* SVG Connections with Colored Relations */}
          <svg className="absolute inset-0 w-[2000px] h-[1500px] pointer-events-none z-0">
            {(activeChain?.connections || []).map((conn, idx) => {
              const src = activeChain.nodes.find(n => n.id === (conn.from || conn.from_node));
              const dst = activeChain.nodes.find(n => n.id === (conn.to || conn.to_node));
              if (!src || !dst) return null;

              const x1 = src.x + 220;
              const y1 = src.y + 40;
              const x2 = dst.x;
              const y2 = dst.y + 40;
              const dx = Math.max(40, (x2 - x1) * 0.5);
              const pathData = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
              const relColor = getRelationColor(conn.label);

              return (
                <g key={idx}>
                  <path
                    d={pathData}
                    stroke={relColor}
                    strokeWidth="2.5"
                    fill="none"
                    strokeDasharray={conn.label === 'Failure' ? '4,3' : 'none'}
                    className="opacity-80"
                  />
                  <circle cx={x1} cy={y1} r="4" fill={relColor} />
                  <circle cx={x2} cy={y2} r="4" fill={relColor} />
                  {/* Label badge */}
                  <rect
                    x={(x1 + x2) / 2 - 24}
                    y={(y1 + y2) / 2 - 10}
                    width="48"
                    height="18"
                    rx="4"
                    fill="#0f172a"
                    stroke={relColor}
                    strokeWidth="1"
                  />
                  <text
                    x={(x1 + x2) / 2}
                    y={(y1 + y2) / 2 + 3}
                    fill={relColor}
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {conn.label || 'Success'}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Render Rule Nodes */}
          {(activeChain?.nodes || []).map(node => {
            const isSelected = selectedNodeId === node.id;
            const categoryMeta = TB_NODE_PALETTE_V2.find(c => c.category === node.type) || {};
            const nodeColor = categoryMeta.color || '#3b82f6';

            return (
              <div
                key={node.id}
                onMouseDown={(e) => handleNodeMouseDown(e, node)}
                style={{
                  left: node.x,
                  top: node.y,
                  width: '220px'
                }}
                className={`absolute rounded-xl border p-3 shadow-2xl cursor-move transition-shadow z-10 ${
                  isSelected
                    ? 'bg-slate-900 border-indigo-400 shadow-indigo-500/20 ring-2 ring-indigo-400/30'
                    : 'bg-slate-900/90 hover:bg-slate-900 border-slate-700/80 shadow-black/40'
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: nodeColor }}></span>
                    <span className="font-semibold text-xs text-slate-100 truncate">
                      {node.name}
                    </span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteNode(node.id); }}
                    className="text-slate-500 hover:text-rose-400 p-0.5"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                <div className="py-2 text-[11px] space-y-1">
                  <div className="text-[10px] text-slate-400 font-mono">
                    Category: <span style={{ color: nodeColor }}>{node.type}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    {node.details || 'Processes incoming message envelope'}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span className="text-cyan-400">● In</span>
                  <span className="text-emerald-400">Out (Named) ●</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 2C. RIGHT PANEL: Selected Node Properties & Test Envelope     */}
        {/* ------------------------------------------------------------- */}
        <div className="w-80 border-l border-slate-800 bg-[#091122] flex flex-col shrink-0 overflow-y-auto p-3 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              Node Properties
            </span>
          </div>

          {selectedNodeId ? (
            (() => {
              const node = activeChain.nodes.find(n => n.id === selectedNodeId);
              if (!node) return null;
              return (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Node Title</label>
                    <input
                      type="text"
                      value={node.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setActiveChain(prev => ({
                          ...prev,
                          nodes: prev.nodes.map(n => n.id === node.id ? { ...n, name: val } : n)
                        }));
                      }}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Node Details</label>
                    <textarea
                      rows={2}
                      value={node.details || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setActiveChain(prev => ({
                          ...prev,
                          nodes: prev.nodes.map(n => n.id === node.id ? { ...n, details: val } : n)
                        }));
                      }}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200 font-mono text-[11px]"
                    />
                  </div>

                  {/* Custom JavaScript Editor or Function Block Config */}
                  {(node.type.startsWith('CUSTOM_JS_') || node.configuration?.script !== undefined) && (
                    <div className="pt-2 border-t border-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-slate-300 font-semibold block text-[11px] flex items-center gap-1">
                          <Code className="w-3 h-3 text-cyan-400" />
                          <span>Custom JavaScript Logic</span>
                        </label>
                        <span className="text-[10px] text-cyan-400 font-mono">Sandboxed</span>
                      </div>
                      <textarea
                        rows={7}
                        value={node.configuration?.script || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setActiveChain(prev => ({
                            ...prev,
                            nodes: prev.nodes.map(n => n.id === node.id ? {
                              ...n,
                              configuration: { ...n.configuration, script: val }
                            } : n)
                          }));
                        }}
                        className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded font-mono text-[11px] text-cyan-300 focus:outline-none focus:border-cyan-500"
                        placeholder="function filter(msg, metadata, msgType) { return true; }"
                      />
                    </div>
                  )}

                  {node.type === 'EXECUTE_FUNCTION_BLOCK' && (
                    <div className="pt-2 border-t border-slate-800 space-y-2">
                      <label className="text-slate-300 font-semibold block text-[11px] flex items-center gap-1">
                        <Cpu className="w-3 h-3 text-emerald-400" />
                        <span>Function Block Target</span>
                      </label>
                      <input
                        type="text"
                        value={node.configuration?.block_id || 'cfb-pump-kpi-01'}
                        onChange={(e) => {
                          const val = e.target.value;
                          setActiveChain(prev => ({
                            ...prev,
                            nodes: prev.nodes.map(n => n.id === node.id ? {
                              ...n,
                              configuration: { ...n.configuration, block_id: val }
                            } : n)
                          }));
                        }}
                        className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded font-mono text-[11px] text-emerald-300 focus:outline-none"
                        placeholder="e.g. cfb-pump-kpi-01"
                      />
                      <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-300">
                        <input
                          type="checkbox"
                          checked={node.configuration?.persist_kpi !== false}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setActiveChain(prev => ({
                              ...prev,
                              nodes: prev.nodes.map(n => n.id === node.id ? {
                                ...n,
                                configuration: { ...n.configuration, persist_kpi: val }
                              } : n)
                            }));
                          }}
                          className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0"
                        />
                        <span>Persist KPI to Asset Attributes</span>
                      </label>
                    </div>
                  )}


                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Outgoing Connections
                    </span>
                    {(activeChain.connections || [])
                      .filter(c => c.from === node.id || c.from_node === node.id)
                      .map((c, i) => (
                        <div key={i} className="flex items-center justify-between p-1.5 bg-slate-900 rounded border border-slate-800 text-[10px] font-mono mb-1">
                          <span style={{ color: getRelationColor(c.label) }}>[{c.label}] ➔ {c.to || c.to_node}</span>
                        </div>
                      ))}
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs">
              Select a rule node to inspect properties and relationships
            </div>
          )}

          {/* Test Message Payload Box */}
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Simulation Inbound Payload</span>
              <span className="text-cyan-400 font-mono">JSON</span>
            </span>
            <textarea
              rows={6}
              value={simPayload}
              onChange={(e) => setSimPayload(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded font-mono text-[11px] text-slate-300 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. BOTTOM PANEL: Live Message Execution Trace                 */}
      {/* ------------------------------------------------------------- */}
      <div className={`border-t border-slate-800 bg-[#060a14] shrink-0 transition-all ${bottomOpen ? 'h-52' : 'h-8'}`}>
        <div
          onClick={() => setBottomOpen(!bottomOpen)}
          className="h-8 px-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between cursor-pointer text-xs"
        >
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-bold text-slate-300 uppercase tracking-wider">
              Message Pipeline Trace & Relation Steps ({simTrace.length} Nodes Visited)
            </span>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${bottomOpen ? '' : 'rotate-180'}`} />
        </div>

        {bottomOpen && (
          <div className="h-[calc(100%-2rem)] p-3 overflow-y-auto font-mono text-xs space-y-1.5 text-slate-300">
            {simTrace.length > 0 ? (
              simTrace.map((st, i) => (
                <div key={i} className="flex items-center gap-3 text-[11px] hover:bg-slate-900/50 p-1 rounded">
                  <span className="text-slate-500 font-bold">Step {st.step}</span>
                  <span className="text-indigo-400">{st.node_name}</span>
                  <span className="text-slate-500">[{st.node_type}]</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold" style={{ backgroundColor: '#0f172a', color: getRelationColor(st.outgoing_relations?.[0]) }}>
                    ➔ {st.outgoing_relations?.join(', ') || 'End'}
                  </span>
                  <span className="text-slate-400 truncate max-w-sm">
                    {JSON.stringify(st.details || {})}
                  </span>
                  <span className="text-slate-500 ml-auto">{st.latency_ms}ms</span>
                </div>
              ))
            ) : (
              <div className="text-slate-500 text-center py-4">
                No active trace. Click "Test Run" to simulate the message pipeline.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. ADD LINK MODAL                                             */}
      {/* ------------------------------------------------------------- */}
      {linkModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md p-5 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" /> Connect Named Relation Link
              </span>
              <button onClick={() => setLinkModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-slate-400 block mb-1">Source Node (From)</label>
                <select
                  value={linkSourceId}
                  onChange={(e) => setLinkSourceId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-200"
                >
                  {activeChain?.nodes.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Target Node (To)</label>
                <select
                  value={linkTargetId}
                  onChange={(e) => setLinkTargetId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-200"
                >
                  {activeChain?.nodes.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Relation Label</label>
                <select
                  value={linkLabel}
                  onChange={(e) => setLinkLabel(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-200 font-semibold"
                >
                  <option value="Success">Success</option>
                  <option value="True">True</option>
                  <option value="False">False</option>
                  <option value="Failure">Failure</option>
                  <option value="Trip">Trip</option>
                  <option value="Normal">Normal</option>
                  <option value="Alarm Created">Alarm Created</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setLinkModalOpen(false)}
                className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateConnection}
                className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/30"
              >
                Create Relation Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Rule Chain Modal */}
      <NewRuleChainModal
        isOpen={newChainModalOpen}
        onClose={() => setNewChainModalOpen(false)}
        onChainCreated={(newChain) => {
          fetchRuleChains();
          setActiveChainId(newChain.id);
          setActiveChain(newChain);
          showToast(`Rule Chain '${newChain.name}' created and opened!`, 'success');
        }}
      />
    </div>
  );
}

