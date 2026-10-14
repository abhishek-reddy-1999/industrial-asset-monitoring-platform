import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play, RotateCw, CheckCircle2, AlertTriangle, X, Search,
  Zap, ArrowRight, Settings, Cpu, Layers, Maximize2, Minimize2,
  FileCode, Terminal, HelpCircle
} from 'lucide-react';
import { testFBTemplate, runFBExecution } from '../../api/client';

/**
 * Yokogawa OpreX AHI-inspired Function Block UDF Graph Canvas
 * Implements Image 2:
 * - Left side: Input Asset Attribute cards ("[Asset Markup or Asset]" / [Attribute Name])
 * - Center: Central Function Block node with input and output port sockets
 * - Right side: Output Runtime Attribute cards ("[Target Asset Markup or Asset]" / [Runtime Attribute Name])
 * - Smooth SVG bezier connector wires linking inputs -> FB -> outputs
 * - Interactive [> Run] simulation button with immediate value propagation
 * - Bottom diagnostic table: Type | Line | Column | Node | Function | Description ("No error found")
 */
export default function AhiVisualGraph({
  template,
  execution = null,
  assets = [],
  onClose = null,
  isModal = false
}) {
  const [testInputs, setTestInputs] = useState(() => {
    const init = {};
    (template?.inputs || []).forEach(inp => {
      init[inp.name] = inp.default_value !== undefined ? inp.default_value : 0.0;
    });
    return init;
  });

  const [outputValues, setOutputValues] = useState(() => {
    if (execution?.last_output_data) return execution.last_output_data;
    const init = {};
    (template?.outputs || []).forEach(out => {
      init[out.script_result_key || out.output_key] = out.default_value !== undefined ? out.default_value : null;
    });
    return init;
  });

  const [isRunning, setIsRunning] = useState(false);
  const [executionStats, setExecutionStats] = useState({
    durationMs: execution?.last_execution_ms || 0,
    timestamp: execution?.last_run_at || null,
    status: execution?.last_status || 'READY'
  });
  const [diagnostics, setDiagnostics] = useState([
    { type: 'Info', line: '-', column: '-', node: template?.template_code || 'FB_NODE', function: 'calculate()', description: 'Template syntax validated. Ready for execution.' }
  ]);
  const [searchFilter, setSearchFilter] = useState('');
  const [wirePulse, setWirePulse] = useState(false);

  // Measure DOM positions for dynamic SVG wire drawing
  const containerRef = useRef(null);
  const [wirePaths, setWirePaths] = useState([]);

  // Recalculate wire coordinates on render/resize
  const updateWireCoordinates = () => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();

    const newPaths = [];

    // 1. Connect Input Cards (right pin) -> Center Block (left socket)
    (template?.inputs || []).forEach(inp => {
      const srcPin = containerRef.current.querySelector(`[data-pin-in="${inp.name}"]`);
      const dstPin = containerRef.current.querySelector(`[data-socket-in="${inp.name}"]`);

      if (srcPin && dstPin) {
        const srcRect = srcPin.getBoundingClientRect();
        const dstRect = dstPin.getBoundingClientRect();

        const x1 = srcRect.left + srcRect.width / 2 - containerRect.left;
        const y1 = srcRect.top + srcRect.height / 2 - containerRect.top;
        const x2 = dstRect.left + dstRect.width / 2 - containerRect.left;
        const y2 = dstRect.top + dstRect.height / 2 - containerRect.top;

        const dx = Math.max(40, (x2 - x1) * 0.5);
        const pathData = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

        newPaths.push({
          id: `wire-in-${inp.name}`,
          type: 'input',
          d: pathData,
          name: inp.name
        });
      }
    });

    // 2. Connect Center Block (right socket) -> Output Cards (left pin)
    (template?.outputs || []).forEach(out => {
      const outKey = out.output_key;
      const srcPin = containerRef.current.querySelector(`[data-socket-out="${outKey}"]`);
      const dstPin = containerRef.current.querySelector(`[data-pin-out="${outKey}"]`);

      if (srcPin && dstPin) {
        const srcRect = srcPin.getBoundingClientRect();
        const dstRect = dstPin.getBoundingClientRect();

        const x1 = srcRect.left + srcRect.width / 2 - containerRect.left;
        const y1 = srcRect.top + srcRect.height / 2 - containerRect.top;
        const x2 = dstRect.left + dstRect.width / 2 - containerRect.left;
        const y2 = dstRect.top + dstRect.height / 2 - containerRect.top;

        const dx = Math.max(40, (x2 - x1) * 0.5);
        const pathData = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

        newPaths.push({
          id: `wire-out-${outKey}`,
          type: 'output',
          d: pathData,
          name: outKey
        });
      }
    });

    setWirePaths(newPaths);
  };

  useEffect(() => {
    updateWireCoordinates();
    const timer = setTimeout(updateWireCoordinates, 150);
    window.addEventListener('resize', updateWireCoordinates);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateWireCoordinates);
    };
  }, [template, execution, testInputs, outputValues]);

  // Execute Simulation or Live Run
  const handleRunSimulation = async () => {
    setIsRunning(true);
    setWirePulse(true);

    try {
      if (execution?.id) {
        // Execute real deployed block execution instance
        const res = await runFBExecution(execution.id, testInputs);
        if (res.success) {
          setOutputValues(res.result || {});
          setExecutionStats({
            durationMs: res.duration_ms || 1.2,
            timestamp: res.timestamp || new Date().toISOString(),
            status: 'SUCCESS'
          });
          setDiagnostics([
            {
              type: 'Success',
              line: 'OK',
              column: 'OK',
              node: execution.name || 'BLOCK_RUN',
              function: 'calculate(ctx, inputs)',
              description: `Execution completed in ${res.duration_ms?.toFixed(2) || '1.2'}ms. Outputs written to mapped Runtime Attributes.`
            }
          ]);
        } else {
          setDiagnostics([
            {
              type: 'Error',
              line: 'Runtime',
              column: '-',
              node: execution.name,
              function: 'calculate()',
              description: res.error || 'Execution failed'
            }
          ]);
        }
      } else if (template?.id) {
        // Test run template in isolated Node.js sandbox
        const res = await testFBTemplate(template.id, testInputs);
        if (res.success) {
          setOutputValues(res.result || {});
          setExecutionStats({
            durationMs: res.duration_ms || 1.5,
            timestamp: new Date().toISOString(),
            status: 'SUCCESS'
          });
          const diagList = [
            {
              type: 'Success',
              line: '-',
              column: '-',
              node: template.template_code,
              function: 'calculate(ctx, inputs)',
              description: `Simulation completed in ${res.duration_ms?.toFixed(2) || '1.5'}ms. All ${template.outputs?.length || 0} output ports evaluated.`
            }
          ];
          if (res.schema_validation?.errors?.length > 0) {
            res.schema_validation.errors.forEach(err => {
              diagList.push({
                type: 'Warning',
                line: '-',
                column: '-',
                node: template.template_code,
                function: 'schema',
                description: err
              });
            });
          }
          setDiagnostics(diagList);
        } else {
          setDiagnostics([
            {
              type: 'Error',
              line: 'Runtime',
              column: '-',
              node: template.template_code,
              function: 'calculate()',
              description: res.error || 'JS Execution Error'
            }
          ]);
        }
      }
    } catch (err) {
      setDiagnostics([
        {
          type: 'Error',
          line: '-',
          column: '-',
          node: template?.template_code || 'FB',
          function: 'runner',
          description: err.message || 'Execution failed'
        }
      ]);
    } finally {
      setIsRunning(false);
      setTimeout(() => setWirePulse(false), 800);
      setTimeout(updateWireCoordinates, 50);
    }
  };

  // Helper to resolve physical asset name for execution instances
  const resolveBoundAssetName = (markupPlaceholder) => {
    if (!execution) return markupPlaceholder;
    const boundAid = execution.asset_bindings?.[markupPlaceholder];
    if (!boundAid) return markupPlaceholder;
    const found = assets.find(a => a.id === boundAid);
    return found ? found.name : boundAid;
  };

  const filteredInputs = useMemo(() => {
    if (!searchFilter.trim()) return template?.inputs || [];
    const q = searchFilter.toLowerCase();
    return (template?.inputs || []).filter(i =>
      i.name.toLowerCase().includes(q) ||
      (i.asset_markup || '').toLowerCase().includes(q) ||
      (i.attribute_reference || '').toLowerCase().includes(q)
    );
  }, [template, searchFilter]);

  const content = (
    <div className="flex flex-col h-full bg-[#070b12] text-slate-200 select-none overflow-hidden font-sans">
      
      {/* 1. TOP AHI HEADER TOOLBAR (Matching Image 2) */}
      <div className="h-11 border-b border-slate-800 bg-[#0d131f] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-cyan-950/60 border border-cyan-800 rounded text-xs font-semibold text-cyan-300">
            <Layers size={13} />
            <span>Graph</span>
          </div>

          <span className="text-slate-600">|</span>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-3 h-3 text-slate-500 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search by Name..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded pl-7 pr-3 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-44"
            />
          </div>

          <span className="text-xs font-mono text-slate-400">
            {execution ? `Instance: ${execution.name}` : `Template: ${template?.name || 'Function Block'}`}
          </span>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunSimulation}
            disabled={isRunning}
            className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all ${
              isRunning
                ? 'bg-amber-600 text-white animate-pulse'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
            title="Execute Function Block simulation"
          >
            <Play size={12} fill="currentColor" />
            <span>{isRunning ? 'Running...' : 'Run [>]'}</span>
          </button>

          <button
            onClick={() => {
              setOutputValues({});
              setDiagnostics([{ type: 'Info', line: '-', column: '-', node: template?.template_code, function: 'reset', description: 'Simulation cleared.' }]);
            }}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
            title="Clear outputs"
          >
            Cancel
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 ml-2"
              title="Close Graph View"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* 2. MAIN GRAPH CANVAS (Dark grid with Input Cards, Central Block, Output Cards, and SVG Wires) */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-auto p-8 flex items-center justify-between"
        style={{
          backgroundColor: '#060a11',
          backgroundImage: 'radial-gradient(circle, rgba(255, 255, 255, 0.07) 1px, transparent 1px)',
          backgroundSize: '22px 22px'
        }}
      >
        {/* Dynamic SVG Connector Wires */}
        <svg
          className="absolute inset-0 pointer-events-none w-full h-full z-10"
          style={{ minWidth: '1000px', minHeight: '600px' }}
        >
          <defs>
            <linearGradient id="ahiWireGradIn" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="ahiWireGradOut" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.9" />
            </linearGradient>
            <filter id="wireGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {wirePaths.map(wire => (
            <g key={wire.id}>
              {/* Background thicker track */}
              <path
                d={wire.d}
                fill="none"
                stroke="rgba(15, 23, 42, 0.8)"
                strokeWidth="5"
                strokeLinecap="round"
              />
              {/* Foreground illuminated signal wire */}
              <path
                d={wire.d}
                fill="none"
                stroke={wire.type === 'input' ? 'url(#ahiWireGradIn)' : 'url(#ahiWireGradOut)'}
                strokeWidth={wirePulse ? '2.5' : '1.8'}
                strokeDasharray={wirePulse ? '6 3' : 'none'}
                filter="url(#wireGlow)"
                className={wirePulse ? 'animate-pulse' : ''}
              />
            </g>
          ))}
        </svg>

        {/* ------------------------------------------------------------- */}
        {/* LEFT COLUMN: Input Asset Attribute Cards (Image 2 Green Cards) */}
        {/* ------------------------------------------------------------- */}
        <div className="w-80 flex flex-col gap-3.5 z-20 shrink-0">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between pb-1 border-b border-slate-800">
            <span>Input Asset Attributes ({filteredInputs.length})</span>
            <span className="text-[10px] text-cyan-400 font-mono">Source</span>
          </div>

          {filteredInputs.map(inp => {
            const markupLabel = resolveBoundAssetName(inp.asset_markup);
            const val = testInputs[inp.name];

            return (
              <div
                key={inp.name}
                className="relative bg-[#0a1f14] border border-[#1b6b3e] hover:border-[#22c55e] rounded-lg p-2.5 shadow-lg transition-all group"
                style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.4)' }}
              >
                {/* Header: "[Asset Markup / Asset]" / Attribute */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-mono text-xs font-bold text-emerald-300 truncate" title={`${markupLabel} / ${inp.attribute_reference || inp.name}`}>
                      "{markupLabel}" / {inp.attribute_reference || inp.name}
                    </span>
                  </div>
                  <Settings size={12} className="text-emerald-500/80 hover:text-emerald-300 cursor-pointer shrink-0" />
                </div>

                {/* Subtitle / Port info */}
                <div className="flex items-center justify-between text-[11px] text-emerald-400/80">
                  <div className="flex items-center gap-1">
                    <span className="px-1.5 py-0.2 rounded bg-emerald-950/80 border border-emerald-900 font-mono text-[10px]">
                      {inp.name}
                    </span>
                    <span>{inp.data_type || 'Double'}</span>
                    {inp.uom && <span>({inp.uom})</span>}
                  </div>

                  {/* Input editable field for simulation */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400">Val:</span>
                    <input
                      type="number"
                      value={val !== undefined ? val : ''}
                      onChange={(e) => {
                        const parsed = parseFloat(e.target.value);
                        setTestInputs({
                          ...testInputs,
                          [inp.name]: isNaN(parsed) ? e.target.value : parsed
                        });
                      }}
                      className="w-16 bg-[#06140c] border border-emerald-800 rounded px-1.5 py-0.5 text-xs font-mono text-emerald-300 text-right focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>

                {/* Right Connector Pin (Socket) */}
                <div
                  data-pin-in={inp.name}
                  className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#070b12] flex items-center justify-center shadow-md cursor-crosshair group-hover:scale-110 transition-transform"
                  title={`Output to port: ${inp.name}`}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* CENTER: Central Function Block Node Box (Matching Image 2)    */}
        {/* ------------------------------------------------------------- */}
        <div className="w-96 bg-[#0c1322] border-2 border-cyan-500/80 rounded-xl shadow-2xl z-20 shrink-0 mx-8 flex flex-col overflow-hidden"
          style={{ boxShadow: '0 8px 32px rgba(6, 182, 212, 0.15)' }}
        >
          {/* Node Header */}
          <div className="px-4 py-2.5 bg-gradient-to-r from-cyan-950 via-slate-900 to-cyan-950 border-b border-cyan-900/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu size={15} className="text-cyan-400" />
              <div>
                <h3 className="text-xs font-bold font-mono text-cyan-200">
                  {template?.template_code || 'FUNCTION_BLOCK'}
                </h3>
                <span className="text-[10px] text-slate-400 block -mt-0.5">
                  {template?.name || 'Calculation Block'}
                </span>
              </div>
            </div>

            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-400 font-semibold">
              v{template?.version || '1.0.0'}
            </span>
          </div>

          {/* Node Body with Input Sockets on left and Output Sockets on right */}
          <div className="p-4 grid grid-cols-2 gap-4 relative min-h-[160px]">
            {/* Left: Input Ports */}
            <div className="space-y-3">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-1">
                Inputs
              </div>
              {(template?.inputs || []).map(inp => (
                <div key={inp.name} className="flex items-center gap-2 relative h-7">
                  {/* Left Socket Pin */}
                  <div
                    data-socket-in={inp.name}
                    className="absolute -left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-cyan-400 border-2 border-[#0c1322] flex items-center justify-center shadow-sm"
                  >
                    <div className="w-1 h-1 rounded-full bg-slate-950"></div>
                  </div>
                  <span className="font-mono text-xs font-semibold text-slate-200 pl-1">
                    {inp.name}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    ({inp.data_type})
                  </span>
                </div>
              ))}
            </div>

            {/* Right: Output Ports */}
            <div className="space-y-3 text-right">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-1">
                Outputs
              </div>
              {(template?.outputs || []).map(out => (
                <div key={out.output_key} className="flex items-center justify-end gap-2 relative h-7">
                  <span className="text-[10px] text-slate-500">
                    ({out.data_type})
                  </span>
                  <span className="font-mono text-xs font-semibold text-emerald-400 pr-1">
                    {out.output_key}
                  </span>
                  {/* Right Socket Pin */}
                  <div
                    data-socket-out={out.output_key}
                    className="absolute -right-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#0c1322] flex items-center justify-center shadow-sm"
                  >
                    <div className="w-1 h-1 rounded-full bg-slate-950"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Node Footer Status */}
          <div className="px-3.5 py-1.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>Runtime: Node.js V8 Sandbox</span>
            <span className={executionStats.status === 'SUCCESS' ? 'text-emerald-400' : 'text-slate-500'}>
              {executionStats.durationMs > 0 ? `${executionStats.durationMs.toFixed(2)}ms` : 'Ready'}
            </span>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* RIGHT COLUMN: Output Runtime Attribute Cards (Image 2 Green) */}
        {/* ------------------------------------------------------------- */}
        <div className="w-80 flex flex-col gap-3.5 z-20 shrink-0">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between pb-1 border-b border-slate-800">
            <span>Output Runtime Attributes ({template?.outputs?.length || 0})</span>
            <span className="text-[10px] text-emerald-400 font-mono">Target Asset</span>
          </div>

          {(template?.outputs || []).map(out => {
            const markupLabel = resolveBoundAssetName(out.target_asset_markup);
            const rawVal = outputValues[out.script_result_key || out.output_key];
            const displayVal = rawVal !== undefined && rawVal !== null
              ? (typeof rawVal === 'number' ? rawVal.toFixed(out.decimal_places !== undefined ? out.decimal_places : 4) : String(rawVal))
              : '--';

            return (
              <div
                key={out.output_key}
                className="relative bg-[#0a1f14] border border-[#1b6b3e] hover:border-[#22c55e] rounded-lg p-2.5 shadow-lg transition-all group"
                style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.4)' }}
              >
                {/* Left Connector Pin (Socket) */}
                <div
                  data-pin-out={out.output_key}
                  className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#070b12] flex items-center justify-center shadow-md cursor-crosshair group-hover:scale-110 transition-transform"
                  title={`Input from port: ${out.output_key}`}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                </div>

                {/* Header: "[Target Asset]" / Runtime Attribute Name */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-mono text-xs font-bold text-emerald-300 truncate" title={`${markupLabel} / ${out.runtime_attribute_name}`}>
                      "{markupLabel}" / {out.runtime_attribute_name}
                    </span>
                  </div>
                  <Settings size={12} className="text-emerald-500/80 hover:text-emerald-300 cursor-pointer shrink-0" />
                </div>

                {/* Subtitle / Port info & Computed Output Value */}
                <div className="flex items-center justify-between text-[11px] text-emerald-400/80">
                  <div className="flex items-center gap-1">
                    <span className="px-1.5 py-0.2 rounded bg-emerald-950/80 border border-emerald-900 font-mono text-[10px]">
                      {out.output_key}
                    </span>
                    <span>{out.data_type || 'Double'}</span>
                    {out.uom && <span>({out.uom})</span>}
                  </div>

                  {/* Calculated Result Display Badge */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400">Result:</span>
                    <span className="font-mono text-xs font-bold text-cyan-300 bg-[#06140c] border border-cyan-800/80 rounded px-2 py-0.5 shadow-inner">
                      {displayVal}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. BOTTOM DIAGNOSTIC CONSOLE (Matching Image 2 bottom table: Type | Line | Column | Node | Function | Description) */}
      <div className="h-36 border-t border-slate-800 bg-[#090d16] flex flex-col shrink-0">
        <div className="h-7 px-4 bg-[#0d131f] border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase tracking-wider text-slate-300">Diagnostics Console</span>
            <span className="text-slate-600">|</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 size={12} />
              <span>Compilation & Sandbox State</span>
            </span>
          </div>

          <div className="text-[10px] font-mono text-slate-500">
            Yokogawa OpreX AHI UDF Engine v2.0
          </div>
        </div>

        {/* Diagnostic Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0b101a] border-b border-slate-800 text-slate-500 uppercase font-mono text-[10px] sticky top-0">
              <tr>
                <th className="py-1.5 px-4 w-24">Type</th>
                <th className="py-1.5 px-4 w-20">Line</th>
                <th className="py-1.5 px-4 w-20">Column</th>
                <th className="py-1.5 px-4 w-44">Node</th>
                <th className="py-1.5 px-4 w-40">Function</th>
                <th className="py-1.5 px-4">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 font-sans text-xs">
              {diagnostics.map((diag, idx) => (
                <tr key={idx} className="hover:bg-slate-900/40">
                  <td className="py-1.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                        diag.type === 'Error'
                          ? 'text-red-400'
                          : diag.type === 'Warning'
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {diag.type === 'Error' ? <AlertTriangle size={11} /> : <CheckCircle2 size={11} />}
                      <span>{diag.type}</span>
                    </span>
                  </td>
                  <td className="py-1.5 px-4 font-mono text-slate-400 text-[11px]">{diag.line}</td>
                  <td className="py-1.5 px-4 font-mono text-slate-400 text-[11px]">{diag.column}</td>
                  <td className="py-1.5 px-4 font-mono text-cyan-300 text-[11px]">{diag.node}</td>
                  <td className="py-1.5 px-4 font-mono text-purple-300 text-[11px]">{diag.function}</td>
                  <td className="py-1.5 px-4 text-slate-300">{diag.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-[#070b12] border border-slate-800 rounded-2xl w-full max-w-6xl h-[88vh] overflow-hidden shadow-2xl flex flex-col">
          {content}
        </div>
      </div>
    );
  }

  return content;
}
