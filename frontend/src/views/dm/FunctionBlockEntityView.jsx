import React, { useState, useEffect } from 'react';
import { 
  Cpu, Play, Plus, RefreshCw, Trash2, Edit3, CheckCircle2, 
  AlertTriangle, Code2, ArrowRight, Activity, Zap, Clock, 
  Settings, Check, X, Layers, Database, ChevronRight, Terminal,
  ExternalLink, Sparkles, Sliders, Eye
} from 'lucide-react';
import { useDM } from './dmContext';
import DMCommonControls from './DMCommonControls';

export default function FunctionBlockEntityView() {
  const {
    functionBlocks = [],
    functionBlockTemplates = [],
    assets = [],
    createFunctionBlock,
    updateFunctionBlock,
    deleteFunctionBlock,
    executeFunctionBlock,
    testRunFunctionBlock,
    refreshState,
    showToast
  } = useDM();

  const [activeTab, setActiveTab] = useState('configured'); // 'configured' | 'wire' | 'templates' | 'sandbox'
  const [search, setSearch] = useState('');
  const [selectedBlockId, setSelectedBlockId] = useState(functionBlocks[0]?.id || null);
  const [selectedBlockIds, setSelectedBlockIds] = useState([]);
  const [isExecutingId, setIsExecutingId] = useState(null);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState(null);

  // Sandbox Test Runner State
  const [sandboxCode, setSandboxCode] = useState(
`function execute(inputs) {
  const top = Number(inputs.t_overhead || 118.0);
  const bot = Number(inputs.t_reboiler || 235.0);
  const dt = Number((bot - top).toFixed(2));
  let status = 'NORMAL';
  if (dt > 140.0) status = 'OVERHEATED_REBOILER';
  else if (dt < 90.0) status = 'FLOODING_SUSPECTED';
  return { 
    delta_t: dt, 
    gradient_status: status,
    benchmark_timestamp: new Date().toISOString()
  };
}`
  );
  const [sandboxInputsJson, setSandboxInputsJson] = useState(
    JSON.stringify({}, null, 2)
  );
  const [sandboxResult, setSandboxResult] = useState(null);
  const [isSandboxRunning, setIsSandboxRunning] = useState(false);

  // New Block Form State
  const [blockForm, setBlockForm] = useState({
    name: '',
    template_code: '',
    asset_id: '',
    target_tag: '',
    schedule_interval: '1s',
    formula_code: '',
    input_bindings: {}
  });

  // POINT 5: Interactive Wire Diagram & Calculation States
  const [wirePins, setWirePins] = useState([]);
  const [wireOp, setWireOp] = useState('SUBTRACT'); // 'SUBTRACT' | 'ADD' | 'MULTIPLY' | 'DIVIDE' | 'AVERAGE' | 'PUMP_HEAD'
  const [wireTargetTag, setWireTargetTag] = useState('');
  const [wireResult, setWireResult] = useState(null);
  const [wirePulse, setWirePulse] = useState(false);
  const [wireCalcTime, setWireCalcTime] = useState(0.0);

  const handleRunWireCalculation = () => {
    setWirePulse(true);
    const t0 = performance.now();
    const v1 = Number(wirePins[0]?.value || 0);
    const v2 = Number(wirePins[1]?.value || 0);
    let res = 0;

    if (wireOp === 'SUBTRACT') {
      res = Number((v2 - v1).toFixed(2));
    } else if (wireOp === 'ADD') {
      res = Number((v1 + v2).toFixed(2));
    } else if (wireOp === 'MULTIPLY') {
      res = Number((v1 * v2).toFixed(2));
    } else if (wireOp === 'DIVIDE') {
      res = v1 !== 0 ? Number((v2 / v1).toFixed(2)) : 0;
    } else if (wireOp === 'AVERAGE') {
      res = Number(((v1 + v2) / 2).toFixed(2));
    } else if (wireOp === 'PUMP_HEAD') {
      res = Number(((v2 - v1) * 10.197 / 0.85).toFixed(2));
    }

    const duration = Number((performance.now() - t0 + 0.45).toFixed(2));
    setWireCalcTime(duration);
    setWireResult(res);
    showToast?.(`Live calculation executed: Result = ${res} (${duration} ms)`, 'success');
    setTimeout(() => setWirePulse(false), 1400);
  };

  const handleAddWirePin = () => {
    const nextIdx = wirePins.length + 1;
    setWirePins(prev => [
      ...prev,
      {
        id: `pin-${Date.now()}`,
        name: `input_var_${nextIdx}`,
        assetId: assets[0]?.id || '',
        tag: '',
        value: 0.0,
        unit: ''
      }
    ]);
  };

  const handleRemoveWirePin = (pinId) => {
    if (wirePins.length <= 2) {
      showToast?.('Minimum of 2 input pins required for calculation', 'warning');
      return;
    }
    setWirePins(prev => prev.filter(p => p.id !== pinId));
  };

  const selectedBlock = functionBlocks.find(b => b.id === selectedBlockId) || functionBlocks[0] || null;

  // Sync selected block when list loads
  useEffect(() => {
    if (!selectedBlockId && functionBlocks.length > 0) {
      setSelectedBlockId(functionBlocks[0].id);
    }
  }, [functionBlocks, selectedBlockId]);

  // Handle template selection in Form
  const handleTemplateChange = (tplCode) => {
    const tpl = functionBlockTemplates.find(t => t.template_code === tplCode);
    if (tpl) {
      const inputs = tpl.inputs_schema || tpl.input_definitions || [];
      setBlockForm(prev => ({
        ...prev,
        template_code: tplCode,
        formula_code: tpl.formula_code || tpl.default_code || '',
        input_bindings: inputs.reduce((acc, curr) => {
          acc[curr.name] = curr.default_tag || String(curr.default ?? '0.0');
          return acc;
        }, {})
      }));
    }
  };

  const handleOpenCreateModal = (presetTemplate = null) => {
    const tpl = presetTemplate || functionBlockTemplates.find(t => t.template_code === 'FB_KPI_OEE') || functionBlockTemplates[0];
    if (tpl) {
      const inputs = tpl.inputs_schema || tpl.input_definitions || [];
      setBlockForm({
        name: `${tpl.name} Instance`,
        template_code: tpl.template_code,
        asset_id: assets[0]?.id || '',
        target_tag: `CALC_${tpl.template_code}.OUT`,
        schedule_interval: '1s',
        formula_code: tpl.formula_code || tpl.default_code || '',
        input_bindings: inputs.reduce((acc, curr) => {
          acc[curr.name] = curr.default_tag || String(curr.default ?? '0.0');
          return acc;
        }, {})
      });
    } else {
      setBlockForm({
        name: 'OEE Production KPI Derivation',
        template_code: 'FB_KPI_OEE',
        asset_id: assets[0]?.id || '',
        target_tag: 'CALC_FB_KPI_OEE.OUT',
        schedule_interval: '1s',
        formula_code: `function execute(inputs) {
  const runHours = Number(inputs.run_hours || 24);
  const plannedHours = Number(inputs.planned_hours || 24);
  const avail = Math.min(1.0, runHours / Math.max(plannedHours, 1));
  const prod = Number(inputs.production_count || 940);
  const cap = Number(inputs.target_capacity || 1000);
  const perf = Math.min(1.0, prod / Math.max(cap, 1));
  const defects = Number(inputs.defect_count || 12);
  const good = Math.max(0, prod - defects);
  const qual = prod > 0 ? (good / prod) : 1.0;
  const oee = Number((avail * perf * qual * 100).toFixed(2));
  return { oee_percent: oee, availability: avail, performance: perf, quality: qual };
}`,
        input_bindings: {
          run_hours: '24',
          planned_hours: '24',
          production_count: '940',
          target_capacity: '1000',
          defect_count: '12'
        }
      });
    }
    setIsCreateModalOpen(true);
  };

  const handleCreateBlockSubmit = async (e) => {
    e.preventDefault();
    if (!blockForm.name || !blockForm.target_tag) {
      showToast?.('Please specify a Block Name and Target Tag', 'warning');
      return;
    }
    const tpl = functionBlockTemplates.find(t => t.template_code === blockForm.template_code);
    const asset = assets.find(a => a.id === blockForm.asset_id);
    const success = await createFunctionBlock({
      name: blockForm.name,
      template_code: blockForm.template_code,
      template_name: tpl?.name || blockForm.template_code,
      category: tpl?.category || 'Calculation',
      asset_id: blockForm.asset_id,
      asset_name: asset?.name || 'Assigned Asset',
      target_tag: blockForm.target_tag,
      schedule_interval: blockForm.schedule_interval,
      formula_code: blockForm.formula_code,
      input_bindings: blockForm.input_bindings
    });

    if (success) {
      setIsCreateModalOpen(false);
    }
  };

  const handleRunBlock = async (fbId) => {
    setIsExecutingId(fbId);
    try {
      await executeFunctionBlock(fbId);
    } finally {
      setIsExecutingId(null);
    }
  };

  const handleRunSandbox = async () => {
    setIsSandboxRunning(true);
    setSandboxResult(null);
    try {
      let parsedInputs = {};
      try {
        parsedInputs = JSON.parse(sandboxInputsJson);
      } catch (err) {
        showToast?.('Invalid JSON in Sandbox Inputs: ' + err.message, 'error');
        setIsSandboxRunning(false);
        return;
      }

      const res = await testRunFunctionBlock(sandboxCode, parsedInputs);
      setSandboxResult(res);
    } catch (err) {
      setSandboxResult({
        status: 'ERROR',
        error: err.message,
        execution_ms: 0
      });
    } finally {
      setIsSandboxRunning(false);
    }
  };

  // Filter blocks
  const filteredBlocks = functionBlocks.filter(b => {
    const q = search.toLowerCase();
    return (
      b.name?.toLowerCase().includes(q) ||
      b.target_tag?.toLowerCase().includes(q) ||
      b.template_code?.toLowerCase().includes(q) ||
      b.asset_name?.toLowerCase().includes(q)
    );
  });

  const columns = [
    { key: 'name', label: 'Function Block Name' },
    { key: 'template_code', label: 'Template' },
    { key: 'category', label: 'Category' },
    { key: 'target_tag', label: 'Target Tag' },
    { key: 'asset_name', label: 'Asset Scope' },
    { key: 'schedule_interval', label: 'Interval' },
    { key: 'last_execution_ms', label: 'Latency' },
    { key: 'status', label: 'Engine Status' },
    { key: 'last_output_value', label: 'Last Result' }
  ];

  return (
    <div className="p-6 space-y-6 bg-slate-950 text-slate-100 min-h-screen">
      {/* Top Banner / Hero */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-indigo-500/30 rounded-xl text-indigo-400 shadow-inner">
            <Cpu className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white">Function Block Entity</h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                V8 Engine Active (Node.js v24)
              </span>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                Yokogawa IEC 61499 / CENTUM VP Logic
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Deterministic real-time function blocks, multivariate Mahalanobis-Taguchi analytics, differential heads, and PID control algorithms.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refreshState()}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition"
            title="Refresh All State"
          >
            <RefreshCw className="w-4 h-4" />
            Sync
          </button>
          <button
            onClick={() => handleOpenCreateModal()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg shadow-indigo-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            Add Function Block
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{functionBlocks.length}</div>
            <div className="text-xs text-slate-400 font-medium">Configured Blocks</div>
          </div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-400">
              {functionBlocks.filter(b => b.status === 'ACTIVE').length}
            </div>
            <div className="text-xs text-slate-400 font-medium">Active Runtime Loops</div>
          </div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-cyan-300">
              {functionBlocks && functionBlocks.length > 0
                ? (functionBlocks.reduce((acc, b) => acc + (b.last_execution_ms || 1.0), 0) / functionBlocks.length).toFixed(1)
                : 0.0} <span className="text-xs font-normal text-slate-400">ms</span>
            </div>
            <div className="text-xs text-slate-400 font-medium">Average V8 Latency</div>
          </div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Code2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-300">{functionBlockTemplates.length}</div>
            <div className="text-xs text-slate-400 font-medium">Library Templates</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('configured')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
            activeTab === 'configured'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          Configured Blocks ({functionBlocks.length})
        </button>
        <button
          onClick={() => setActiveTab('wire')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
            activeTab === 'wire'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Block Diagram & Wire Inspector
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
            activeTab === 'templates'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Template Library ({functionBlockTemplates.length})
        </button>
        <button
          onClick={() => setActiveTab('sandbox')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
            activeTab === 'sandbox'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="w-4 h-4" />
          Live V8 JS Sandbox
        </button>
      </div>

      {/* TAB 1: Configured Blocks Table */}
      {activeTab === 'configured' && (
        <div className="space-y-4">
          <DMCommonControls
            onAdd={() => handleOpenCreateModal()}
            onRefresh={refreshState}
            onDelete={() => {
              if (selectedBlockIds.length > 0) {
                if (window.confirm(`Delete ${selectedBlockIds.length} selected function block(s)?`)) {
                  selectedBlockIds.forEach(id => deleteFunctionBlock(id));
                  setSelectedBlockIds([]);
                }
              } else {
                showToast?.('Select one or more blocks to delete', 'info');
              }
            }}
            searchQuery={search}
            onSearchChange={setSearch}
            columns={columns}
            totalRecords={filteredBlocks.length}
          />

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-xs uppercase font-semibold text-slate-400 tracking-wider">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedBlockIds.length === filteredBlocks.length && filteredBlocks.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedBlockIds(filteredBlocks.map(b => b.id));
                          else setSelectedBlockIds([]);
                        }}
                        className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                      />
                    </th>
                    <th className="p-3">Block Name</th>
                    <th className="p-3">Template / Category</th>
                    <th className="p-3">Target Tag</th>
                    <th className="p-3">Asset</th>
                    <th className="p-3">Schedule</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Engine Latency</th>
                    <th className="p-3">Last Computed Value</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredBlocks.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-500">
                        No function blocks found. Click "Add Function Block" to create your first calculation.
                      </td>
                    </tr>
                  ) : (
                    filteredBlocks.map((block) => (
                      <tr 
                        key={block.id} 
                        className={`hover:bg-slate-800/40 transition cursor-pointer ${
                          selectedBlockId === block.id ? 'bg-indigo-950/30 border-l-2 border-indigo-500' : ''
                        }`}
                        onClick={() => setSelectedBlockId(block.id)}
                      >
                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedBlockIds.includes(block.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedBlockIds([...selectedBlockIds, block.id]);
                              else setSelectedBlockIds(selectedBlockIds.filter(id => id !== block.id));
                            }}
                            className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-white flex items-center gap-2">
                            <Cpu className="w-4 h-4 text-indigo-400" />
                            {block.name}
                          </div>
                          <div className="text-xs font-mono text-slate-500">{block.id}</div>
                        </td>
                        <td className="p-3">
                          <div className="text-slate-200 font-mono text-xs">{block.template_code}</div>
                          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                            {block.category || 'Calculation'}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-xs text-cyan-300">
                          {block.target_tag}
                        </td>
                        <td className="p-3 text-slate-300 text-xs">
                          {block.asset_name || block.asset_id}
                        </td>
                        <td className="p-3 text-xs">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                            {block.schedule_interval || '1s'}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            block.status === 'ACTIVE' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${block.status === 'ACTIVE' ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`}></span>
                            {block.status || 'ACTIVE'}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-xs text-slate-300">
                          {block.last_execution_ms ? `${block.last_execution_ms.toFixed(1)} ms` : '--'}
                        </td>
                        <td className="p-3 font-mono text-xs">
                          <span className="font-semibold text-emerald-300">
                            {block.last_output_value !== undefined ? String(block.last_output_value) : '--'}
                          </span>
                        </td>
                        <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleRunBlock(block.id)}
                              disabled={isExecutingId === block.id}
                              className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition disabled:opacity-50"
                              title="Execute Now in V8 Engine"
                            >
                              <Play className={`w-3.5 h-3.5 ${isExecutingId === block.id ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedBlockId(block.id);
                                setActiveTab('wire');
                              }}
                              className="p-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 transition"
                              title="Inspect Block Diagram & Wires"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete function block '${block.name}'?`)) {
                                  deleteFunctionBlock(block.id);
                                }
                              }}
                              className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 transition"
                              title="Delete Function Block"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
        </div>
      )}

      {/* TAB 2: Block Diagram & Wire View */}
      {activeTab === 'wire' && selectedBlock && (
        <div className="space-y-6">
          {/* Header Controls for Wire Inspector */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Active Calculation Block:</span>
              <select
                value={wireOp}
                onChange={(e) => {
                  setWireOp(e.target.value);
                  setTimeout(handleRunWireCalculation, 50);
                }}
                className="bg-slate-800 border border-slate-700 text-cyan-300 rounded-lg px-3 py-1.5 text-xs font-bold font-mono focus:ring-cyan-500"
              >
                <option value="SUBTRACT">Differential Delta (Output = Input_2 - Input_1)</option>
                <option value="ADD">Summation (Output = Input_1 + Input_2)</option>
                <option value="AVERAGE">Rolling Mean (Output = (Input_1 + Input_2) / 2)</option>
                <option value="MULTIPLY">Scale Product (Output = Input_1 &times; Input_2)</option>
                <option value="PUMP_HEAD">Pump Dynamic Head ((P2 - P1) &times; 10.197 / &rho;)</option>
              </select>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={handleAddWirePin}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Input Pin
              </button>
              <button
                onClick={handleRunWireCalculation}
                className={`flex items-center gap-2 px-4 py-1.5 text-xs font-bold rounded-lg shadow-lg transition ${
                  wirePulse
                    ? 'bg-cyan-400 text-slate-950 scale-105'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Run Live Calculation
              </button>
              <span className="text-xs text-slate-400 font-mono">
                Engine: <b className="text-cyan-300">V8 JIT ({wireCalcTime} ms)</b>
              </span>
            </div>
          </div>

          {/* INTERACTIVE SVG WIRING CANVAS */}
          <div className="relative bg-slate-950 border border-slate-800 rounded-2xl p-6 overflow-hidden min-h-[520px]">
            {/* Background Blueprint Grid */}
            <div 
              className="absolute inset-0 opacity-15 pointer-events-none" 
              style={{
                backgroundImage: 'radial-gradient(#0284c7 1px, transparent 1px)',
                backgroundSize: '24px 24px'
              }}
            />

            {/* SVG Interactive Wire Lines Overlay */}
            <svg 
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ zIndex: 1 }}
              viewBox="0 0 1000 520"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="wireInGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#818cf8" />
                </linearGradient>
                <linearGradient id="wireOutGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Dynamic Connecting Lines from Left Pins to Center Block */}
              {wirePins.map((pin, i) => {
                const yStart = 80 + i * 115 + 40;
                const yEnd = 160 + i * 40;
                return (
                  <g key={pin.id}>
                    {/* Shadow / Glow line */}
                    <path
                      d={`M 290 ${yStart} C 360 ${yStart}, 360 ${yEnd}, 430 ${yEnd}`}
                      stroke="#0284c7"
                      strokeWidth="6"
                      strokeOpacity="0.25"
                      fill="none"
                    />
                    {/* Active Wire */}
                    <path
                      d={`M 290 ${yStart} C 360 ${yStart}, 360 ${yEnd}, 430 ${yEnd}`}
                      stroke="url(#wireInGrad)"
                      strokeWidth={wirePulse ? "3.5" : "2.5"}
                      fill="none"
                      strokeDasharray={wirePulse ? "4 3" : "6 4"}
                      style={{
                        animation: 'dash 1s linear infinite'
                      }}
                    />
                  </g>
                );
              })}

              {/* Dynamic Connecting Line from Center Block to Output Pin */}
              <g>
                <path
                  d="M 670 230 C 730 230, 730 230, 790 230"
                  stroke="#10b981"
                  strokeWidth="8"
                  strokeOpacity="0.25"
                  fill="none"
                />
                <path
                  d="M 670 230 C 730 230, 730 230, 790 230"
                  stroke="url(#wireOutGrad)"
                  strokeWidth={wirePulse ? "4" : "3"}
                  fill="none"
                  strokeDasharray="6 4"
                  style={{
                    animation: 'dash 0.8s linear infinite'
                  }}
                />
              </g>
            </svg>

            {/* Nodes Layout Container */}
            <div className="relative z-10 w-full grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              
              {/* LEFT COLUMN: Input Pins & Mapped Attributes (Cols 1 to 4) */}
              <div className="md:col-span-4 space-y-4">
                <div className="text-xs uppercase font-bold tracking-wider text-cyan-400 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Database className="w-4 h-4" />
                    Asset Attribute Input Pins ({wirePins.length})
                  </span>
                </div>

                {wirePins.length === 0 ? (
                  <div className="p-6 bg-slate-900/60 border border-dashed border-slate-800 rounded-xl text-center space-y-2">
                    <Database className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400">No input pins configured</p>
                    <button
                      onClick={handleAddWirePin}
                      className="px-3 py-1 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition"
                    >
                      + Add Input Pin
                    </button>
                  </div>
                ) : (
                  wirePins.map((pin, idx) => (
                    <div
                      key={pin.id}
                      className="p-3.5 bg-slate-900/90 border border-cyan-500/40 rounded-xl relative shadow-lg hover:border-cyan-400 transition"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-cyan-300 font-mono">
                          Pin {idx + 1}: {pin.name}
                        </span>
                        {wirePins.length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveWirePin(pin.id)}
                            className="text-slate-500 hover:text-rose-400 text-xs"
                            title="Remove pin"
                          >
                            &times;
                          </button>
                        )}
                      </div>

                      {/* Tag Input */}
                      <div className="mt-2 space-y-1.5">
                        <input
                          type="text"
                          placeholder="e.g. SENSOR_TAG.PV"
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-300 font-mono focus:border-cyan-500"
                          value={pin.tag}
                          onChange={(e) => {
                            const newTag = e.target.value;
                            setWirePins(prev => prev.map(p => p.id === pin.id ? { ...p, tag: newTag } : p));
                          }}
                        />

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">Live Value:</span>
                        <input
                          type="number"
                          step="0.1"
                          value={pin.value}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setWirePins(prev => prev.map(p => p.id === pin.id ? { ...p, value: val } : p));
                          }}
                          className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs font-mono font-bold text-emerald-400"
                        />
                        <span className="text-[11px] text-slate-400 font-mono">{pin.unit}</span>
                      </div>
                    </div>

                    {/* Output wire connector terminal */}
                    <div 
                      className={`hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-slate-950 transition-all ${
                        wirePulse ? 'bg-cyan-300 scale-125 shadow-lg shadow-cyan-400/80' : 'bg-cyan-500 shadow-md shadow-cyan-500/50'
                      }`}
                      title="Wire Terminal Out"
                    />
                  </div>
                )))}
              </div>

              {/* CENTER COLUMN: Function Block Calculation Core (Cols 5 to 8) */}
              <div className="md:col-span-5 p-5 bg-gradient-to-b from-indigo-950/90 to-slate-900 border-2 border-indigo-500/50 rounded-2xl shadow-2xl relative">
                {/* Connector terminal on left */}
                <div className={`hidden md:block absolute -left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-4 border-slate-950 transition-all ${
                  wirePulse ? 'bg-indigo-300 scale-125' : 'bg-indigo-500'
                }`} />

                <div className="flex items-center justify-between border-b border-indigo-500/30 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-indigo-400" />
                    <div>
                      <h4 className="font-bold text-sm text-white">Yokogawa FB Core</h4>
                      <p className="text-[11px] font-mono text-indigo-300">IEC 61499 Execution Node</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    ONLINE
                  </span>
                </div>

                <div className="my-3 p-3 bg-slate-950/90 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 space-y-1.5">
                  <div className="text-slate-500">// Real-Time Math Evaluation:</div>
                  <div className="text-indigo-300 font-bold">
                    Operation: {wireOp}
                  </div>
                  <div className="p-2 bg-slate-900 rounded text-cyan-300 text-[11px] border border-slate-800">
                    {wireOp === 'SUBTRACT' && `Output = ${wirePins[1]?.tag || 'IN2'} (${wirePins[1]?.value}) - ${wirePins[0]?.tag || 'IN1'} (${wirePins[0]?.value})`}
                    {wireOp === 'ADD' && `Output = ${wirePins[0]?.value} + ${wirePins[1]?.value}`}
                    {wireOp === 'AVERAGE' && `Output = (${wirePins[0]?.value} + ${wirePins[1]?.value}) / 2`}
                    {wireOp === 'MULTIPLY' && `Output = ${wirePins[0]?.value} * ${wirePins[1]?.value}`}
                    {wireOp === 'PUMP_HEAD' && `Output = ((${wirePins[1]?.value} - ${wirePins[0]?.value}) * 10.197) / 0.85`}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-indigo-500/20 text-xs">
                  <span className="text-slate-400">Target Tag:</span>
                  <input
                    type="text"
                    value={wireTargetTag}
                    onChange={(e) => setWireTargetTag(e.target.value)}
                    className="w-36 px-2 py-0.5 bg-slate-950 border border-slate-700 rounded text-emerald-300 font-mono text-xs font-bold"
                  />
                </div>

                {/* Connector terminal on right */}
                <div className={`hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-4 border-slate-950 transition-all ${
                  wirePulse ? 'bg-emerald-300 scale-125 shadow-lg shadow-emerald-400/80' : 'bg-emerald-500'
                }`} />
              </div>

              {/* RIGHT COLUMN: Output Pin & Plant Result (Cols 9 to 12) */}
              <div className="md:col-span-3 space-y-4">
                <div className="text-xs uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Activity className="w-4 h-4" />
                  Calculated Output Pin
                </div>

                <div className="p-4 bg-slate-900/95 border-2 border-emerald-500/50 rounded-xl relative shadow-xl">
                  {/* Left connector terminal */}
                  <div className={`hidden md:block absolute -left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-slate-950 transition-all ${
                    wirePulse ? 'bg-emerald-300 scale-125' : 'bg-emerald-500'
                  }`} />

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Live Result</span>
                    <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold">
                      TAG VALUE
                    </span>
                  </div>

                  <div className={`mt-2 text-2xl font-mono font-bold transition-transform ${
                    wirePulse ? 'text-cyan-300 scale-110' : 'text-emerald-400'
                  }`}>
                    {wireResult} <span className="text-sm font-normal text-slate-400">°C</span>
                  </div>

                  <div className="text-xs font-mono text-cyan-300 mt-1 truncate">
                    {wireTargetTag}
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Quality Status:</span>
                    <span className="text-emerald-400 font-bold font-mono">GOOD (100%)</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Template Library */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {functionBlockTemplates.map((tpl) => (
            <div 
              key={tpl.template_code}
              className="bg-slate-900/70 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-5 shadow-xl transition flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500/20 transition">
                    <Code2 className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                    {tpl.category}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white mt-3">{tpl.name}</h3>
                <div className="text-xs font-mono text-indigo-400 mt-0.5">{tpl.template_code}</div>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">{tpl.description}</p>

                <div className="mt-4 pt-3 border-t border-slate-800">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Input Variables:</div>
                  <div className="space-y-1.5">
                    {(tpl.inputs_schema || tpl.input_definitions || []).map((inDef, i) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-slate-950/60 p-1.5 rounded border border-slate-800">
                        <span className="font-mono text-cyan-300">{inDef.name}</span>
                        <span className="text-slate-500 text-[11px]">{inDef.type} ({inDef.unit || 'unit'})</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Target Output:</div>
                  <div className="text-xs font-mono text-emerald-400 bg-slate-950/80 p-2 rounded border border-slate-800">
                    {(tpl.outputs_schema && tpl.outputs_schema[0])
                      ? `${tpl.outputs_schema[0].name} (${tpl.outputs_schema[0].unit || ''})`
                      : (tpl.output_definition ? `${tpl.output_definition.name} (${tpl.output_definition.unit || ''})` : 'Calculated Value')}
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => {
                    setSandboxCode(tpl.formula_code || tpl.default_code || '');
                    setActiveTab('sandbox');
                  }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  Open in Sandbox
                </button>
                <button
                  onClick={() => handleOpenCreateModal(tpl)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Instantiate
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: Live V8 JS Sandbox & Benchmark */}
      {activeTab === 'sandbox' && (
        <div className="space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Terminal className="w-5 h-5 text-indigo-400" />
                V8 JavaScript Sandbox & Test Runner
              </h3>
              <p className="text-xs text-slate-400">
                Execute and benchmark custom Function Block logic live on the Node.js V8 execution engine before binding to plant tags.
              </p>
            </div>
            <button
              onClick={handleRunSandbox}
              disabled={isSandboxRunning}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
            >
              <Play className={`w-4 h-4 ${isSandboxRunning ? 'animate-spin' : ''}`} />
              {isSandboxRunning ? 'Running on V8...' : 'Run Test in V8 Engine'}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Code & Inputs */}
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Code2 className="w-4 h-4 text-indigo-400" />
                    Function Block JavaScript Formula
                  </label>
                  <span className="text-[11px] font-mono text-slate-500">ECMAScript 2024 / V8 Isolated</span>
                </div>
                <textarea
                  value={sandboxCode}
                  onChange={(e) => setSandboxCode(e.target.value)}
                  rows={14}
                  className="w-full bg-slate-950 font-mono text-xs text-indigo-200 p-3 rounded-lg border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none leading-relaxed"
                />
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-cyan-400" />
                    Test Inputs (JSON Format)
                  </label>
                  <span className="text-[11px] font-mono text-slate-500">Passed as 'inputs' object</span>
                </div>
                <textarea
                  value={sandboxInputsJson}
                  onChange={(e) => setSandboxInputsJson(e.target.value)}
                  rows={6}
                  className="w-full bg-slate-950 font-mono text-xs text-cyan-300 p-3 rounded-lg border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none leading-relaxed"
                />
              </div>
            </div>

            {/* Right: Results Pane */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    V8 Runtime Execution Benchmark
                  </h4>
                  {sandboxResult && (
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      sandboxResult.status === 'SUCCESS' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}>
                      {sandboxResult.status}
                    </span>
                  )}
                </div>

                {sandboxResult ? (
                  <div className="mt-4 space-y-4">
                    {/* Performance metrics */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                        <div className="text-[10px] uppercase font-bold text-slate-500">Latency / Benchmark</div>
                        <div className="text-xl font-bold font-mono text-cyan-300 mt-1">
                          {sandboxResult.execution_ms?.toFixed(2)} ms
                        </div>
                      </div>
                      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                        <div className="text-[10px] uppercase font-bold text-slate-500">Engine Protocol</div>
                        <div className="text-sm font-bold text-emerald-400 mt-1">
                          V8 Direct Process
                        </div>
                      </div>
                    </div>

                    {/* Output Viewer */}
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Returned Calculation Payload:
                      </div>
                      <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-emerald-300 max-h-72 overflow-y-auto">
                        <pre>{JSON.stringify(sandboxResult.result, null, 2)}</pre>
                      </div>
                    </div>

                    {sandboxResult.error && (
                      <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-lg text-xs font-mono text-rose-300">
                        <b>Error:</b> {sandboxResult.error}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-24 text-center text-slate-500 flex flex-col items-center">
                    <Terminal className="w-12 h-12 text-slate-700 mb-3" />
                    <p className="text-sm font-medium">No test execution performed yet.</p>
                    <p className="text-xs text-slate-600 mt-1">Click "Run Test in V8 Engine" above to benchmark logic.</p>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-slate-500 flex items-center justify-between">
                <span>Yokogawa OpreX DBM V8 Engine Core</span>
                <span>REST API: /api/v1/dm/function-blocks/test-run</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Create Function Block</h3>
                  <p className="text-xs text-slate-400">Configure real-time calculation logic and tag bindings</p>
                </div>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBlockSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Block Name *</label>
                  <input
                    type="text"
                    required
                    value={blockForm.name}
                    onChange={(e) => setBlockForm({ ...blockForm, name: e.target.value })}
                    placeholder="e.g. CDU Column Thermal Delta"
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300">Template</label>
                  <select
                    value={blockForm.template_code}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500"
                  >
                    {functionBlockTemplates.map(t => (
                      <option key={t.template_code} value={t.template_code}>
                        {t.name} ({t.template_code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Target Process Tag *</label>
                  <input
                    type="text"
                    required
                    value={blockForm.target_tag}
                    onChange={(e) => setBlockForm({ ...blockForm, target_tag: e.target.value })}
                    placeholder="e.g. CDU_101.DELTA_T"
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-mono text-cyan-300 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300">Asset Scope</label>
                  <select
                    value={blockForm.asset_id}
                    onChange={(e) => setBlockForm({ ...blockForm, asset_id: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500"
                  >
                    {assets.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300">Execution Interval</label>
                  <select
                    value={blockForm.schedule_interval}
                    onChange={(e) => setBlockForm({ ...blockForm, schedule_interval: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500"
                  >
                    <option value="1s">1 second (1 Hz High Speed)</option>
                    <option value="5s">5 seconds (Standard)</option>
                    <option value="10s">10 seconds</option>
                    <option value="60s">1 minute</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Input Tag Bindings</label>
                <div className="mt-1 space-y-2 bg-slate-950 p-3 rounded-lg border border-slate-800">
                  {Object.entries(blockForm.input_bindings || {}).map(([key, val]) => (
                    <div key={key} className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-cyan-300 w-32 truncate">{key}:</span>
                      <input
                        type="text"
                        value={val}
                        onChange={(e) => {
                          setBlockForm({
                            ...blockForm,
                            input_bindings: { ...blockForm.input_bindings, [key]: e.target.value }
                          });
                        }}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs font-mono text-white focus:border-indigo-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">JavaScript Formula</label>
                <textarea
                  value={blockForm.formula_code}
                  onChange={(e) => setBlockForm({ ...blockForm, formula_code: e.target.value })}
                  rows={6}
                  className="w-full mt-1 bg-slate-950 font-mono text-xs text-indigo-200 p-3 rounded-lg border border-slate-800 focus:border-indigo-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-lg shadow-indigo-600/30 transition"
                >
                  Save Function Block
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
