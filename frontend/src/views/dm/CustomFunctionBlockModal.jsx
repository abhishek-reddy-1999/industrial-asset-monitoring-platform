import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { 
  X, Cpu, Plus, Trash2, ArrowUp, ArrowDown, Play, Check, 
  AlertTriangle, Code2, Layers, Settings, History, CheckCircle2, 
  ExternalLink, Sparkles, BookOpen, Terminal, Shield, RefreshCw,
  Save, Upload, Sliders, Info, Zap, HardDrive, FileCode
} from 'lucide-react';

const STARTER_TEMPLATES = {
  PUMP_KPI: `function calculate(ctx, inputs) {
  // Extract inputs
  const { flow, power, running } = inputs;

  // Validate telemetry freshness and boundaries
  const flowValid = Number.isFinite(flow) && flow > 0;
  const powerValid = Number.isFinite(power) && power >= 0;
  const isRunning = running === true || running === 1;

  const validCalculation = flowValid && powerValid;
  
  // Specific Energy Consumption: power (kW) / flow (m3/h) -> kWh/m3
  const specificEnergy = validCalculation 
    ? ctx.helpers.safeDivide(power, flow, 0.0) 
    : null;

  console.log("Calculated Pump Specific Energy:", specificEnergy, "kWh/m3");

  return {
    specificEnergy: ctx.helpers.round(specificEnergy, 4),
    isRunning,
    validCalculation
  };
}`,
  MATH_CALC: `function calculate(ctx, inputs) {
  const { A, B } = inputs;
  const sum = ctx.helpers.sum([A, B]);
  const avg = ctx.helpers.avg([A, B]);
  const diff = Number(A || 0) - Number(B || 0);

  return {
    Sum: sum,
    Average: avg,
    Difference: diff
  };
}`,
  CONDITIONAL_STATUS: `function calculate(ctx, inputs) {
  const { temperature, pressure } = inputs;
  const tempHigh = Number(temperature) > 90.0;
  const pressHigh = Number(pressure) > 250.0;
  
  let status = "NORMAL";
  if (tempHigh && pressHigh) status = "CRITICAL_TRIP";
  else if (tempHigh || pressHigh) status = "WARNING";

  return {
    OperatingStatus: status,
    InAlarm: status !== "NORMAL"
  };
}`,
  TIME_SERIES_WINDOW: `function calculate(ctx, inputs) {
  const samples = Array.isArray(inputs.timeSeriesSamples) ? inputs.timeSeriesSamples : [];
  const meanVal = ctx.helpers.mean(samples, 'value');
  const std = ctx.helpers.stdDev(samples, 'value');
  const delta = ctx.helpers.rateOfChange(samples, 'value');

  return {
    MeanValue: meanVal,
    StdDeviation: std,
    RateOfChange: delta
  };
}`
};

export default function CustomFunctionBlockModal({ 
  isOpen, 
  onClose, 
  onBlockSaved, 
  editBlock = null,
  assets = []
}) {
  const [activeTab, setActiveTab] = useState('general'); // general | inputs | outputs | parameters | code | test | history

  // Form State
  const [blockId, setBlockId] = useState('');
  const [name, setName] = useState('Pump Performance KPI Calculator');
  const [displayName, setDisplayName] = useState('Pump Performance KPI');
  const [description, setDescription] = useState('Calculates Specific Energy Consumption (kWh/m3) and running state from flow and power.');
  const [category, setCategory] = useState('Custom');
  const [blockType, setBlockType] = useState('custom.pump_performance_kpi');
  const [icon, setIcon] = useState('Zap');
  const [color, setColor] = useState('#10b981');
  const [version, setVersion] = useState('1.0.0');
  const [author, setAuthor] = useState('Lead Process Engineer');
  const [stateful, setStateful] = useState(false);
  const [status, setStatus] = useState('DRAFT');

  // Dynamic Input Ports
  const [inputs, setInputs] = useState([
    {
      id: 'inp-1',
      name: 'flow',
      data_type: 'number',
      unit: 'm3/h',
      description: 'Volumetric Flow Rate',
      required: true,
      default_value: 20.0,
      source_mapping: 'ASSET_ATTRIBUTE',
      quality_policy: 'STRICT',
      missing_value_policy: 'USE_DEFAULT'
    },
    {
      id: 'inp-2',
      name: 'power',
      data_type: 'number',
      unit: 'kW',
      description: 'Active Electrical Power',
      required: true,
      default_value: 15.0,
      source_mapping: 'ASSET_ATTRIBUTE',
      quality_policy: 'STRICT',
      missing_value_policy: 'USE_DEFAULT'
    },
    {
      id: 'inp-3',
      name: 'running',
      data_type: 'boolean',
      unit: 'bool',
      description: 'Pump Operating Permissive',
      required: true,
      default_value: true,
      source_mapping: 'ASSET_ATTRIBUTE',
      quality_policy: 'ALLOW_UNCERTAIN',
      missing_value_policy: 'USE_DEFAULT'
    }
  ]);

  // Dynamic Output Ports
  const [outputs, setOutputs] = useState([
    {
      id: 'out-1',
      name: 'specificEnergy',
      data_type: 'number',
      unit: 'kWh/m3',
      description: 'Specific Energy Consumption',
      required: true,
      destination_type: 'RUNTIME_ATTRIBUTE',
      destination_attribute: 'attr-pump-sec',
      persist_historian: true,
      publish_event: true
    },
    {
      id: 'out-2',
      name: 'isRunning',
      data_type: 'boolean',
      unit: 'bool',
      description: 'Validated Running Permissive',
      required: true,
      destination_type: 'CALCULATED_KPI',
      destination_attribute: 'attr-pump-state',
      persist_historian: true,
      publish_event: false
    },
    {
      id: 'out-3',
      name: 'validCalculation',
      data_type: 'boolean',
      unit: 'bool',
      description: 'Valid Calculation Flag',
      required: true,
      destination_type: 'CALCULATED_KPI',
      destination_attribute: '',
      persist_historian: false,
      publish_event: false
    }
  ]);

  // Dynamic Parameters
  const [parameters, setParameters] = useState([
    { name: 'ratedHead', label: 'Rated Head', control_type: 'number', default_value: 45.0, unit: 'm' },
    { name: 'fluidDensity', label: 'Fluid Density', control_type: 'number', default_value: 1000.0, unit: 'kg/m3' }
  ]);

  // JavaScript Code
  const [scriptCode, setScriptCode] = useState(STARTER_TEMPLATES.PUMP_KPI);

  // Bindings & Trigger
  const [selectedAssetId, setSelectedAssetId] = useState(assets[0]?.id || '');
  const [triggerType, setTriggerType] = useState('ATTRIBUTE_UPDATED');

  // Test Console State
  const [testInputsJson, setTestInputsJson] = useState('{\n  "flow": 20,\n  "power": 15,\n  "running": true\n}');
  const [testRunning, setTestRunning] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testError, setTestError] = useState(null);
  const [testLogs, setTestLogs] = useState([]);

  // Load existing block when opened
  useEffect(() => {
    if (editBlock) {
      setBlockId(editBlock.id || '');
      setName(editBlock.name || '');
      setDisplayName(editBlock.display_name || editBlock.name || '');
      setDescription(editBlock.description || '');
      setCategory(editBlock.category || 'Custom');
      setBlockType(editBlock.type || `custom.${(editBlock.name || 'block').toLowerCase().replace(/\s+/g, '_')}`);
      setIcon(editBlock.icon || 'Zap');
      setColor(editBlock.color || '#10b981');
      setVersion(editBlock.version || '1.0.0');
      setAuthor(editBlock.author || 'Lead Process Engineer');
      setStateful(Boolean(editBlock.stateful));
      setStatus(editBlock.status || 'DRAFT');
      if (editBlock.inputs) setInputs(editBlock.inputs);
      if (editBlock.outputs) setOutputs(editBlock.outputs);
      if (editBlock.parameters) setParameters(editBlock.parameters);
      if (editBlock.script_code) setScriptCode(editBlock.script_code);
    }
  }, [editBlock]);

  if (!isOpen) return null;

  // Add / Remove Ports
  const handleAddInput = () => {
    const newIdx = inputs.length + 1;
    setInputs([
      ...inputs,
      {
        id: `inp-${Date.now()}`,
        name: `input_${newIdx}`,
        data_type: 'number',
        unit: '',
        description: `Input port ${newIdx}`,
        required: false,
        default_value: 0.0,
        source_mapping: 'ASSET_ATTRIBUTE',
        quality_policy: 'STRICT',
        missing_value_policy: 'USE_DEFAULT'
      }
    ]);
  };

  const handleRemoveInput = (idx) => {
    setInputs(inputs.filter((_, i) => i !== idx));
  };

  const handleAddOutput = () => {
    const newIdx = outputs.length + 1;
    setOutputs([
      ...outputs,
      {
        id: `out-${Date.now()}`,
        name: `output_${newIdx}`,
        data_type: 'number',
        unit: '',
        description: `Output KPI port ${newIdx}`,
        required: false,
        destination_type: 'RUNTIME_ATTRIBUTE',
        destination_attribute: '',
        persist_historian: true,
        publish_event: false
      }
    ]);
  };

  const handleRemoveOutput = (idx) => {
    setOutputs(outputs.filter((_, i) => i !== idx));
  };

  const handleAddParameter = () => {
    const newIdx = parameters.length + 1;
    setParameters([
      ...parameters,
      {
        name: `param_${newIdx}`,
        label: `Parameter ${newIdx}`,
        control_type: 'number',
        default_value: 1.0,
        unit: ''
      }
    ]);
  };

  const handleRemoveParameter = (idx) => {
    setParameters(parameters.filter((_, i) => i !== idx));
  };

  // Run Sandboxed Test Run (Part 8)
  const handleRunTest = async () => {
    let parsedInputs = {};
    try {
      parsedInputs = JSON.parse(testInputsJson);
    } catch (e) {
      setTestError("Invalid Input JSON format: " + e.message);
      return;
    }

    setTestRunning(true);
    setTestError(null);
    setTestResult(null);
    setTestLogs([]);

    try {
      const res = await fetch('/api/v2/scripts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: scriptCode,
          contract: 'FB_CALCULATE',
          inputs: parsedInputs,
          ctx: {
            parameters: parameters.reduce((acc, p) => ({ ...acc, [p.name]: p.default_value }), {}),
            executionId: `test-${Date.now()}`
          },
          timeout_ms: 2500
        })
      });

      const data = await res.json();
      if (data.success) {
        setTestResult(data.result);
        setTestLogs(data.logs || []);
      } else {
        setTestError(data.error || "Execution failed");
        setTestLogs(data.logs || []);
      }
    } catch (err) {
      setTestError("API connection error: " + err.message);
    } finally {
      setTestRunning(false);
    }
  };

  // Save Block (Draft)
  const handleSaveDraft = async () => {
    const payload = {
      id: blockId || undefined,
      name,
      display_name: displayName,
      description,
      category,
      type: blockType,
      icon,
      color,
      version,
      author,
      stateful,
      status: 'DRAFT',
      inputs,
      outputs,
      parameters,
      script_code: scriptCode,
      bindings: {
        asset_id: selectedAssetId
      },
      trigger_config: {
        type: triggerType
      }
    };

    try {
      const res = await fetch('/api/v2/function-blocks/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const saved = await res.json();
        setBlockId(saved.id);
        setStatus('DRAFT');
        if (onBlockSaved) onBlockSaved(saved);
        alert(`Custom Function Block '${saved.name}' saved as Draft!`);
      } else {
        const err = await res.json();
        alert(`Failed to save: ${err.detail || 'Unknown error'}`);
      }
    } catch (err) {
      alert(`Save error: ${err.message}`);
    }
  };

  // Publish Block (Immutable Version)
  const handlePublish = async () => {
    if (!blockId) {
      alert("Please Save Draft before publishing.");
      return;
    }

    try {
      const res = await fetch(`/api/v2/function-blocks/custom/${blockId}/publish`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Role': 'Engineer',
          'X-User-Email': author
        },
        body: JSON.stringify({ user_role: 'Engineer', user_email: author })
      });

      if (res.ok) {
        const data = await res.json();
        setVersion(data.block.version);
        setStatus('PUBLISHED');
        if (onBlockSaved) onBlockSaved(data.block);
        alert(`Published Custom Block '${data.block.name}' as version ${data.block.version}!`);
      } else {
        const err = await res.json();
        alert(`Publishing Rejected: ${err.detail}`);
      }
    } catch (err) {
      alert(`Publish error: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0b1329] border border-slate-700/80 rounded-2xl w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
        
        {/* MODAL HEADER */}
        <div className="h-14 px-6 border-b border-slate-800 bg-[#091024] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-950/70 border border-emerald-700 text-emerald-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-white tracking-wide">
                  {name || 'Custom Function Block Studio'}
                </h2>
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                  status === 'PUBLISHED' 
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                    : 'bg-amber-950 text-amber-400 border border-amber-800'
                }`}>
                  {status} (v{version})
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-cyan-950 text-cyan-400 border border-cyan-800">
                  Node.js Isolated Sandbox
                </span>
              </div>
              <p className="text-xs text-slate-400">{blockType}</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-lg p-1 gap-1">
            {[
              { id: 'general', label: 'General', icon: Info },
              { id: 'inputs', label: `Inputs (${inputs.length})`, icon: ArrowDown },
              { id: 'outputs', label: `Outputs (${outputs.length})`, icon: ArrowUp },
              { id: 'parameters', label: `Parameters (${parameters.length})`, icon: Sliders },
              { id: 'code', label: 'JavaScript Code', icon: Code2 },
              { id: 'test', label: 'Test & Debug', icon: Play },
            ].map(tab => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                    activeTab === tab.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#080d1e]">
          
          {/* TAB 1: GENERAL INFORMATION */}
          {activeTab === 'general' && (
            <div className="grid grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Block Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. Pump Performance KPI Calculator"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Display Label</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. Pump KPI"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Custom">Custom</option>
                    <option value="Industrial Calculation">Industrial Calculation</option>
                    <option value="Math">Math</option>
                    <option value="Energy & Utilities">Energy & Utilities</option>
                    <option value="Environmental">Environmental</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Unique Block Type</label>
                  <input
                    type="text"
                    value={blockType}
                    onChange={(e) => setBlockType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. custom.pump_performance_kpi"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    placeholder="Describe functional purpose and calculation logic..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Semantic Version</label>
                    <input
                      type="text"
                      value={version}
                      onChange={(e) => setVersion(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Author</label>
                    <input
                      type="text"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-6 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={stateful}
                      onChange={(e) => setStateful(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                    />
                    <span className="text-xs font-medium text-slate-300">Stateful Execution (retains internal memory)</span>
                  </label>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Execution Trigger Type</label>
                  <select
                    value={triggerType}
                    onChange={(e) => setTriggerType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="ATTRIBUTE_UPDATED">Automatic (Triggered on Asset Attribute Telemetry)</option>
                    <option value="ANY_INPUT_UPDATED">Any Input Updated</option>
                    <option value="INTERVAL">Scheduled Interval (1s)</option>
                    <option value="MANUAL">On Demand / Manual Only</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DYNAMIC INPUT PORTS */}
          {activeTab === 'inputs' && (
            <div className="space-y-4 max-w-5xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Dynamic Input Ports</h3>
                  <p className="text-xs text-slate-400">Configure ports, data types, default fallbacks, and engineering units.</p>
                </div>
                <button
                  onClick={handleAddInput}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Input Port</span>
                </button>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Port Name</th>
                      <th className="py-2.5 px-3">Data Type</th>
                      <th className="py-2.5 px-3">Unit</th>
                      <th className="py-2.5 px-3">Default Value</th>
                      <th className="py-2.5 px-3">Source Mapping</th>
                      <th className="py-2.5 px-3">Quality Policy</th>
                      <th className="py-2.5 px-3 text-center">Req?</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {inputs.map((inp, idx) => (
                      <tr key={inp.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={inp.name}
                            onChange={(e) => {
                              const updated = [...inputs];
                              updated[idx].name = e.target.value;
                              setInputs(updated);
                            }}
                            className="bg-slate-950 border border-slate-800 rounded px-2 py-1 font-mono text-cyan-400 w-32 focus:outline-none focus:border-cyan-500"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={inp.data_type}
                            onChange={(e) => {
                              const updated = [...inputs];
                              updated[idx].data_type = e.target.value;
                              setInputs(updated);
                            }}
                            className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none"
                          >
                            <option value="number">Number</option>
                            <option value="boolean">Boolean</option>
                            <option value="string">String</option>
                            <option value="object">JSON Object</option>
                            <option value="array">Array</option>
                            <option value="time_series">Time Series</option>
                          </select>
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={inp.unit || ''}
                            onChange={(e) => {
                              const updated = [...inputs];
                              updated[idx].unit = e.target.value;
                              setInputs(updated);
                            }}
                            placeholder="e.g. m3/h"
                            className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 w-20 focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={inp.default_value !== undefined ? String(inp.default_value) : ''}
                            onChange={(e) => {
                              const updated = [...inputs];
                              updated[idx].default_value = e.target.value;
                              setInputs(updated);
                            }}
                            className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 w-24 focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={inp.source_mapping}
                            onChange={(e) => {
                              const updated = [...inputs];
                              updated[idx].source_mapping = e.target.value;
                              setInputs(updated);
                            }}
                            className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none"
                          >
                            <option value="ASSET_ATTRIBUTE">Asset Attribute</option>
                            <option value="FUNCTION_BLOCK_OUTPUT">FB Output</option>
                            <option value="CONSTANT">Constant</option>
                            <option value="RULE_CHAIN_MESSAGE">Rule Chain Msg</option>
                          </select>
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={inp.quality_policy}
                            onChange={(e) => {
                              const updated = [...inputs];
                              updated[idx].quality_policy = e.target.value;
                              setInputs(updated);
                            }}
                            className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none"
                          >
                            <option value="STRICT">Strict (Good Only)</option>
                            <option value="ALLOW_UNCERTAIN">Allow Uncertain</option>
                            <option value="DEFAULT_ON_BAD">Fallback on Bad</option>
                          </select>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={Boolean(inp.required)}
                            onChange={(e) => {
                              const updated = [...inputs];
                              updated[idx].required = e.target.checked;
                              setInputs(updated);
                            }}
                            className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
                          />
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            onClick={() => handleRemoveInput(idx)}
                            className="p-1 rounded text-rose-400 hover:bg-rose-950/40 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: DYNAMIC OUTPUT PORTS */}
          {activeTab === 'outputs' && (
            <div className="space-y-4 max-w-5xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Dynamic Output KPI Ports</h3>
                  <p className="text-xs text-slate-400">Define calculated metrics, destination attributes, and persistence behavior.</p>
                </div>
                <button
                  onClick={handleAddOutput}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Output Port</span>
                </button>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Output Name</th>
                      <th className="py-2.5 px-3">Data Type</th>
                      <th className="py-2.5 px-3">Unit</th>
                      <th className="py-2.5 px-3">Destination Type</th>
                      <th className="py-2.5 px-3">Target Attribute ID</th>
                      <th className="py-2.5 px-3 text-center">Historian?</th>
                      <th className="py-2.5 px-3 text-center">Event?</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {outputs.map((out, idx) => (
                      <tr key={out.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={out.name}
                            onChange={(e) => {
                              const updated = [...outputs];
                              updated[idx].name = e.target.value;
                              setOutputs(updated);
                            }}
                            className="bg-slate-950 border border-slate-800 rounded px-2 py-1 font-mono text-emerald-400 w-36 focus:outline-none focus:border-emerald-500"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={out.data_type}
                            onChange={(e) => {
                              const updated = [...outputs];
                              updated[idx].data_type = e.target.value;
                              setOutputs(updated);
                            }}
                            className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none"
                          >
                            <option value="number">Number</option>
                            <option value="boolean">Boolean</option>
                            <option value="string">String</option>
                            <option value="object">JSON Object</option>
                          </select>
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={out.unit || ''}
                            onChange={(e) => {
                              const updated = [...outputs];
                              updated[idx].unit = e.target.value;
                              setOutputs(updated);
                            }}
                            placeholder="e.g. kWh/m3"
                            className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 w-24 focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={out.destination_type}
                            onChange={(e) => {
                              const updated = [...outputs];
                              updated[idx].destination_type = e.target.value;
                              setOutputs(updated);
                            }}
                            className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none"
                          >
                            <option value="RUNTIME_ATTRIBUTE">Runtime Asset Attribute</option>
                            <option value="CALCULATED_KPI">Calculated KPI</option>
                            <option value="HISTORIAN">Direct Historian</option>
                            <option value="RULE_CHAIN_EVENT">Rule Chain Event</option>
                          </select>
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={out.destination_attribute || ''}
                            onChange={(e) => {
                              const updated = [...outputs];
                              updated[idx].destination_attribute = e.target.value;
                              setOutputs(updated);
                            }}
                            placeholder="attr-target-id"
                            className="bg-slate-950 border border-slate-800 rounded px-2 py-1 font-mono text-slate-200 w-32 focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={Boolean(out.persist_historian)}
                            onChange={(e) => {
                              const updated = [...outputs];
                              updated[idx].persist_historian = e.target.checked;
                              setOutputs(updated);
                            }}
                            className="rounded bg-slate-950 border-slate-800 text-emerald-600 focus:ring-0"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={Boolean(out.publish_event)}
                            onChange={(e) => {
                              const updated = [...outputs];
                              updated[idx].publish_event = e.target.checked;
                              setOutputs(updated);
                            }}
                            className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
                          />
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            onClick={() => handleRemoveOutput(idx)}
                            className="p-1 rounded text-rose-400 hover:bg-rose-950/40 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: PARAMETERS SCHEMA */}
          {activeTab === 'parameters' && (
            <div className="space-y-4 max-w-4xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Configurable Parameters</h3>
                  <p className="text-xs text-slate-400">Exposed to JavaScript as read-only <code className="text-cyan-400">ctx.parameters</code>.</p>
                </div>
                <button
                  onClick={handleAddParameter}
                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Parameter</span>
                </button>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Parameter Key</th>
                      <th className="py-2.5 px-3">Display Label</th>
                      <th className="py-2.5 px-3">Control Type</th>
                      <th className="py-2.5 px-3">Default Value</th>
                      <th className="py-2.5 px-3">Unit</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {parameters.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30 transition">
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={p.name}
                            onChange={(e) => {
                              const updated = [...parameters];
                              updated[idx].name = e.target.value;
                              setParameters(updated);
                            }}
                            className="bg-slate-950 border border-slate-800 rounded px-2 py-1 font-mono text-purple-400 w-32 focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={p.label}
                            onChange={(e) => {
                              const updated = [...parameters];
                              updated[idx].label = e.target.value;
                              setParameters(updated);
                            }}
                            className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 w-36 focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={p.control_type}
                            onChange={(e) => {
                              const updated = [...parameters];
                              updated[idx].control_type = e.target.value;
                              setParameters(updated);
                            }}
                            className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none"
                          >
                            <option value="number">Number</option>
                            <option value="text">Text</option>
                            <option value="boolean">Boolean</option>
                            <option value="dropdown">Dropdown</option>
                            <option value="json">JSON</option>
                          </select>
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={String(p.default_value)}
                            onChange={(e) => {
                              const updated = [...parameters];
                              updated[idx].default_value = e.target.value;
                              setParameters(updated);
                            }}
                            className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 w-24 focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={p.unit || ''}
                            onChange={(e) => {
                              const updated = [...parameters];
                              updated[idx].unit = e.target.value;
                              setParameters(updated);
                            }}
                            placeholder="e.g. kg/m3"
                            className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 w-20 focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            onClick={() => handleRemoveParameter(idx)}
                            className="p-1 rounded text-rose-400 hover:bg-rose-950/40 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: JAVASCRIPT CODE EDITOR */}
          {activeTab === 'code' && (
            <div className="h-full flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-300">Contract Template:</span>
                  <select
                    onChange={(e) => {
                      if (e.target.value && STARTER_TEMPLATES[e.target.value]) {
                        if (confirm("Replace current code with selected template?")) {
                          setScriptCode(STARTER_TEMPLATES[e.target.value]);
                        }
                      }
                    }}
                    className="bg-slate-900 border border-slate-700 text-xs text-cyan-400 rounded-lg px-2.5 py-1 focus:outline-none"
                  >
                    <option value="">Load Starter Template...</option>
                    <option value="PUMP_KPI">Pump Performance KPI (Power & Flow)</option>
                    <option value="MATH_CALC">Mathematical Calculation & Aggregation</option>
                    <option value="CONDITIONAL_STATUS">Conditional Alarm Status & Trips</option>
                    <option value="TIME_SERIES_WINDOW">Time-Series Window Aggregation</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="font-mono text-cyan-400">ctx.helpers.safeDivide()</span>
                  <span>•</span>
                  <span className="font-mono text-emerald-400">ctx.helpers.round()</span>
                  <span>•</span>
                  <span className="font-mono text-amber-400">ctx.helpers.sum()</span>
                </div>
              </div>

              {/* Monaco Editor Container */}
              <div className="flex-1 min-h-[420px] border border-slate-800 rounded-xl overflow-hidden shadow-inner">
                <Editor
                  height="100%"
                  language="javascript"
                  theme="vs-dark"
                  value={scriptCode}
                  onChange={(val) => setScriptCode(val || '')}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2
                  }}
                />
              </div>
            </div>
          )}

          {/* TAB 6: TEST & DEBUG CONSOLE (PART 8) */}
          {activeTab === 'test' && (
            <div className="h-full grid grid-cols-12 gap-4">
              {/* Left Column: Script Preview / Editor */}
              <div className="col-span-6 flex flex-col border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60">
                <div className="h-9 px-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Function Block Script Contract</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">calculate(ctx, inputs)</span>
                </div>
                <div className="flex-1 min-h-[360px]">
                  <Editor
                    height="100%"
                    language="javascript"
                    theme="vs-dark"
                    value={scriptCode}
                    onChange={(val) => setScriptCode(val || '')}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 12,
                      scrollBeyondLastLine: false,
                      automaticLayout: true
                    }}
                  />
                </div>
              </div>

              {/* Right Column: Input & Output Test Benches */}
              <div className="col-span-6 flex flex-col gap-4">
                {/* Input JSON Editor */}
                <div className="flex-1 flex flex-col border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60">
                  <div className="h-9 px-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <ArrowDown className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Test Input JSON Payload</span>
                    </span>
                    <button
                      onClick={() => {
                        const sample = {};
                        inputs.forEach(inp => {
                          sample[inp.name] = inp.default_value !== undefined ? inp.default_value : 10;
                        });
                        setTestInputsJson(JSON.stringify(sample, null, 2));
                      }}
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    >
                      Load Port Defaults
                    </button>
                  </div>
                  <div className="flex-1 min-h-[140px]">
                    <Editor
                      height="100%"
                      language="json"
                      theme="vs-dark"
                      value={testInputsJson}
                      onChange={(val) => setTestInputsJson(val || '')}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 12,
                        scrollBeyondLastLine: false,
                        automaticLayout: true
                      }}
                    />
                  </div>
                </div>

                {/* Output & Execution Inspector */}
                <div className="flex-1 flex flex-col border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60">
                  <div className="h-9 px-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Execution Results & Diagnostics</span>
                      </span>
                      {testResult && (
                        <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-emerald-950 text-emerald-400 border border-emerald-800">
                          SUCCESS
                        </span>
                      )}
                      {testError && (
                        <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-rose-950 text-rose-400 border border-rose-800">
                          FAILED
                        </span>
                      )}
                    </div>
                    <button
                      onClick={handleRunTest}
                      disabled={testRunning}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition ${
                        testRunning ? 'bg-amber-600 text-white cursor-wait' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>{testRunning ? 'Running Sandbox...' : 'Run Test'}</span>
                    </button>
                  </div>
                  <div className="flex-1 p-3 overflow-y-auto font-mono text-xs text-slate-300 space-y-2">
                    {testResult && (
                      <div>
                        <div className="text-[11px] text-emerald-400 mb-1 font-semibold">Output JSON Payload:</div>
                        <pre className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 text-emerald-300 overflow-x-auto">
                          {JSON.stringify(testResult, null, 2)}
                        </pre>
                      </div>
                    )}
                    {testError && (
                      <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
                        <div className="font-bold flex items-center gap-1.5 mb-1">
                          <AlertTriangle className="w-4 h-4 text-rose-400" />
                          <span>JavaScript Execution Error</span>
                        </div>
                        <div className="whitespace-pre-wrap">{testError}</div>
                      </div>
                    )}
                    {testLogs.length > 0 && (
                      <div>
                        <div className="text-[11px] text-slate-400 mb-1 font-semibold">Console Output:</div>
                        <div className="bg-slate-950 p-2 rounded border border-slate-800/80 space-y-1">
                          {testLogs.map((log, idx) => (
                            <div key={idx} className="text-slate-300">{log}</div>
                          ))}
                        </div>
                      </div>
                    )}
                    {!testResult && !testError && !testRunning && (
                      <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                        Click "Run Test" to execute script in isolated Node.js worker.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="h-16 px-6 border-t border-slate-800 bg-[#091024] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Isolated V8 Process Sandbox</span>
            </span>
            <span>•</span>
            <span>No File/Network Access</span>
            <span>•</span>
            <span>2000ms Timeout Ceiling</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveDraft}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-lg transition"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Draft</span>
            </button>
            <button
              onClick={handlePublish}
              className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-emerald-600/30 transition"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Publish Custom Block</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
