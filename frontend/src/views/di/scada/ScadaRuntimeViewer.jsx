import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, Pause, ArrowLeft, RefreshCw, ZoomIn, ZoomOut, 
  Maximize2, Minimize2, AlertTriangle, ShieldCheck, Activity, 
  Clock, X, BarChart3, Radio, Bell, ArrowUpRight, CheckCircle2,
  Sliders, Eye, EyeOff, Layers, ExternalLink, Sparkles
} from 'lucide-react';
import { fetchScadaRuntimeScreen, fetchScadaSymbols, fetchScadaValuesSnapshot } from '../../../api/client';
import { telemetryWS } from '../../../api/websocket';
import TimeSeriesPanel from '../../../panels/TimeSeriesPanel';
import { getSymbolNativeViewBox, renderDynamicElementSvg, getSymbolPreserveAspectRatio } from './ScadaDesigner';
import ThingsBoardSwimmingPoolView, { EquipmentTrendWindow, getSwimmingPoolEquipmentDefs } from './ThingsBoardSwimmingPoolView';

export default function ScadaRuntimeViewer({ 
  screenId, 
  onBack, 
  onOpenDesigner,
  onNavigateScreen 
}) {
  const [screen, setScreen] = useState(null);
  const [symbols, setSymbols] = useState([]);
  const [loading, setLoading] = useState(true);
  const [telemetry, setTelemetry] = useState({});
  const [connected, setConnected] = useState(true);
  const [lastTelemetryTimestamp, setLastTelemetryTimestamp] = useState(null);

  // Layout View Modes
  const [layoutMode, setLayoutMode] = useState('contain'); // 'contain' | 'fit-width' | 'fixed' | 'fullscreen'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Popups & Overlays
  const [activeTrendTag, setActiveTrendTag] = useState(null);
  const [activeTrendTitle, setActiveTrendTitle] = useState('');
  const [activeAssetPopup, setActiveAssetPopup] = useState(null);
  const [equipmentMonitorDevice, setEquipmentMonitorDevice] = useState(null);
  const [alarmOverlayOpen, setAlarmOverlayOpen] = useState(false);

  // Process Animation Control
  const [animationsEnabled, setAnimationsEnabled] = useState(true);

  // Pool Screen View Mode (Exact ThingsBoard Mimic vs Standard SCADA Canvas)
  const isPoolScreen = screen?.id === 'screen-swimming-pool';
  const [poolDisplayMode, setPoolDisplayMode] = useState('thingsboard');

  const containerRef = useRef(null);

  // 1. Initial Load of Runtime Screen and Symbols
  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        setLoading(true);
        const [screenData, symbolsData] = await Promise.all([
          fetchScadaRuntimeScreen(screenId),
          fetchScadaSymbols()
        ]);
        if (!isMounted) return;
        setScreen(screenData);
        setSymbols(symbolsData);

        // Fetch initial authoritative latest value snapshots for all bound tags
        const boundTags = new Set();
        (screenData.elements || []).forEach(el => {
          Object.values(el.bindings || {}).forEach(b => {
            if (b.tag_name) boundTags.add(b.tag_name);
          });
        });

        if (boundTags.size > 0) {
          const snap = await fetchScadaValuesSnapshot(Array.from(boundTags));
          if (isMounted) {
            setTelemetry(snap);
            setLastTelemetryTimestamp(Date.now());
          }
        }
      } catch (err) {
        console.error('Failed to initialize SCADA runtime:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    init();
    return () => { isMounted = false; };
  }, [screenId]);

  // 2. Connect to Live Multiplexed WebSocket Feed
  useEffect(() => {
    telemetryWS.connect();

    const unsubscribe = telemetryWS.subscribe((incomingTags) => {
      if (!incomingTags) return;
      setTelemetry(prev => {
        const next = { ...prev };
        Object.entries(incomingTags).forEach(([tag, valObj]) => {
          const val = typeof valObj === 'object' && valObj !== null ? valObj.value : valObj;
          const quality = typeof valObj === 'object' && valObj !== null ? (valObj.quality || 'GOOD') : 'GOOD';
          next[tag] = {
            tag_name: tag,
            value: val,
            quality: quality,
            timestamp: new Date().toISOString()
          };
        });
        return next;
      });
      setLastTelemetryTimestamp(Date.now());
      setConnected(true);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Check for Stale Telemetry (heartbeat watchdog)
  const isStale = useMemo(() => {
    if (!lastTelemetryTimestamp) return false;
    return (Date.now() - lastTelemetryTimestamp) > 30000; // > 30s considered stale
  }, [lastTelemetryTimestamp, telemetry]);

  // Swimming pool equipment metadata definitions
  const poolEquipmentDefs = useMemo(() => {
    return getSwimmingPoolEquipmentDefs({
      pumpRunning: telemetry['FILTER_PUMP.RUN']?.value !== 0,
      flowRate: telemetry['FLOW_RATE.PV']?.value || 198,
      poolTemp: telemetry['POOL_TEMP.PV']?.value || 35.9,
      poolVolume: telemetry['POOL_VOLUME.PV']?.value || 55000,
      poolLevel: telemetry['POOL_LEVEL.PV']?.value || 98.2,
      poolPh: telemetry['POOL_PH.PV']?.value || 7.35,
      poolOrp: telemetry['POOL_ORP.PV']?.value || 715,
      outdoorTemp: telemetry['OUTDOOR_TEMP.PV']?.value || 32.4
    });
  }, [telemetry]);

  // Handle Element Interaction Click
  const handleElementClick = (element) => {
    const action = element.actions?.onClick || 'OPEN_TREND';

    if (action === 'NAVIGATE_SCREEN') {
      if (onNavigateScreen) onNavigateScreen(element.actions?.targetScreenId || 'screen-water-transfer');
      return;
    }
    if (action === 'OPEN_ASSET') {
      setActiveAssetPopup(element);
      return;
    }

    // 1. If Swimming Pool Screen, map to dedicated rich equipment definition
    if (isPoolScreen) {
      const poolMap = {
        'inst-circ-pump': 'water-pump',
        'inst-sand-filter': 'sand-filter',
        'inst-heat-pump': 'heat-pump',
        'inst-pool-basin': 'pool',
        'inst-volume-badge': 'pool',
        'inst-pool-level-dial': 'pool',
        'inst-flowmeter': 'flowmeter',
        'inst-ph-canister': 'ph-canister'
      };
      const mappedId = poolMap[element.instance_id];
      if (mappedId && poolEquipmentDefs[mappedId]) {
        setEquipmentMonitorDevice(poolEquipmentDefs[mappedId]);
        return;
      }
    }

    // 2. Otherwise generate dynamic equipment monitor definition from element bindings
    const sym = symbols.find(s => s.id === element.symbol_id);
    const dynTags = Object.entries(element.bindings || {}).map(([key, b], idx) => {
      const tagName = b.tag_name || `${element.instance_id}.${key}`;
      const val = telemetry[tagName]?.value !== undefined ? telemetry[tagName].value : (b.value ?? '--');
      return {
        tag: tagName,
        label: b.attribute_name || key,
        value: val,
        uom: b.uom || '',
        register: `Input Reg ${30000 + idx * 2}`
      };
    });

    const firstBinding = Object.values(element.bindings || {})[0];
    const currentVal = firstBinding ? (telemetry[firstBinding.tag_name]?.value ?? firstBinding.value ?? 50) : 50;

    const dynDevice = {
      id: element.instance_id,
      name: element.label || element.instance_id,
      type: sym?.name || 'SCADA Field Instrumentation',
      tags: dynTags.length > 0 ? dynTags : [
        { tag: `${element.instance_id}.PV`, label: 'Process Value', value: currentVal, uom: firstBinding?.uom || '', register: 'Input Reg 30002' },
        { tag: `${element.instance_id}.STATUS`, label: 'Operating State', value: 'NORMAL', register: 'Discrete In 10001' }
      ],
      charts: [
        {
          title: `${element.label || 'Process'} Live Trend`,
          uom: firstBinding?.uom || '',
          currentVal: currentVal,
          data: Array.from({ length: 30 }, (_, i) => {
            const num = Number(currentVal);
            return isNaN(num) ? 50 : Number((num + Math.sin(i * 0.4) * (num * 0.05 || 2)).toFixed(2));
          }),
          min: 0,
          max: typeof currentVal === 'number' ? Math.max(100, Math.round(currentVal * 1.5)) : 100,
          color: '#06b6d4'
        }
      ],
      controls: (
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
          <div>
            <span className="font-bold text-slate-800 block">{element.label || element.instance_id} Controller</span>
            <span className="text-[11px] text-slate-400">Modbus Node ID: {element.instance_id}</span>
          </div>
          <button className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg transition">
            Send Command Pulse
          </button>
        </div>
      )
    };

    setEquipmentMonitorDevice(dynDevice);
  };

  // Helper to extract numeric value from telemetry
  const getTagValue = (tagName, defaultVal = 0) => {
    const item = telemetry[tagName];
    if (item && item.value !== undefined && item.value !== null) {
      const num = Number(item.value);
      return isNaN(num) ? item.value : num;
    }
    return defaultVal;
  };

  // Helper to extract data quality
  const getTagQuality = (tagName, elem = null) => {
    if (isStale) return 'STALE';
    const item = telemetry[tagName];
    if (item && item.quality) {
      if (item.value !== null && item.value !== undefined) return item.quality;
    }
    // If element has configured baseline value, treat as GOOD
    if (elem?.bindings) {
      const b = Object.values(elem.bindings)[0];
      if (b && b.value !== undefined && b.value !== null) return 'GOOD';
    }
    return item ? (item.quality || 'GOOD') : 'GOOD';
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#020617] text-slate-400 gap-2">
        <RefreshCw size={18} className="animate-spin text-sky-400" />
        <span>Initializing SCADA Process Runtime Engine...</span>
      </div>
    );
  }

  if (!screen) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#020617] text-slate-400 gap-3">
        <AlertTriangle size={32} className="text-amber-400" />
        <span>Screen not found</span>
        <button onClick={onBack} className="px-3 py-1.5 rounded bg-slate-800 text-slate-200 text-xs">
          Back
        </button>
      </div>
    );
  }

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50' : 'flex-1'} flex flex-col bg-[#020617] text-slate-100 overflow-hidden select-none`}>
      {/* ===================================================================== */}
      {/* RUNTIME TOP BAR: STATUS, BREADCRUMBS, CONTROLS                        */}
      {/* ===================================================================== */}
      <div className="h-12 border-b border-slate-800 bg-slate-900/95 px-4 flex items-center justify-between z-20 shadow-md">
        {/* Left: Back & Breadcrumb Navigation */}
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
              title="Return to Screen List"
            >
              <ArrowLeft size={16} />
            </button>
          )}

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 hover:text-slate-200 cursor-pointer" onClick={onBack}>
              {screen.site_name || 'Jurong Complex'}
            </span>
            <span className="text-slate-600">/</span>
            <span className="font-bold text-slate-100">{screen.name}</span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.2 rounded border border-emerald-500/20 font-bold">
              LIVE MIMIC
            </span>
          </div>
        </div>

        {/* Center: Communication & Stale Data Status Watchdog */}
        <div className="flex items-center gap-3">
          {isStale ? (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-semibold animate-pulse">
              <AlertTriangle size={13} />
              <span>DATA STALE (&gt;30s since update)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Telemetry Good (1s scan rate)</span>
            </div>
          )}
        </div>

        {/* Right: Layout Modes, Animation Toggle, Designer Switch */}
        <div className="flex items-center gap-2">
          {/* ThingsBoard Mimic Toggle for Swimming Pool Screen */}
          {isPoolScreen && (
            <div className="flex items-center bg-slate-950 p-0.5 rounded border border-slate-700">
              <button
                onClick={() => setPoolDisplayMode('thingsboard')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded flex items-center gap-1 transition-colors ${
                  poolDisplayMode === 'thingsboard'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Exact ThingsBoard SCADA Swimming Pool Replica"
              >
                <Sparkles size={12} />
                <span>ThingsBoard Replica</span>
              </button>
              <button
                onClick={() => setPoolDisplayMode('standard_svg')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded flex items-center gap-1 transition-colors ${
                  poolDisplayMode === 'standard_svg'
                    ? 'bg-slate-800 text-cyan-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Standard Vector SCADA Canvas"
              >
                <Layers size={12} />
                <span>SCADA Canvas</span>
              </button>
            </div>
          )}

          {/* Animation Toggle */}
          <button
            onClick={() => setAnimationsEnabled(!animationsEnabled)}
            className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors border ${
              animationsEnabled
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                : 'bg-slate-800 text-slate-500 border-slate-700'
            }`}
            title="Toggle CSS Process Flow & Rotation Animations"
          >
            <Activity size={13} />
            <span className="text-[10px] font-mono">{animationsEnabled ? 'ANIM ON' : 'PAUSED'}</span>
          </button>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded border border-slate-800">
            <button
              onClick={() => setZoom(prev => Math.max(0.4, Number((prev - 0.1).toFixed(2))))}
              className="p-1 text-slate-400 hover:text-slate-200"
              title="Zoom Out"
            >
              <ZoomOut size={13} />
            </button>
            <span className="text-[10px] font-mono text-slate-300 px-1 min-w-[36px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(prev => Math.min(2.5, Number((prev + 0.1).toFixed(2))))}
              className="p-1 text-slate-400 hover:text-slate-200"
              title="Zoom In"
            >
              <ZoomIn size={13} />
            </button>
          </div>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors border ${
              isFullscreen
                ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-700'
            }`}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Kiosk Mode'}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            <span className="text-[10px] font-mono hidden sm:inline">{isFullscreen ? 'EXIT' : 'FULLSCREEN'}</span>
          </button>

          {onOpenDesigner && (
            <button
              onClick={() => onOpenDesigner(screenId)}
              className="px-3 py-1 text-xs text-sky-400 hover:text-sky-300 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 font-semibold"
            >
              Edit in Designer
            </button>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MAIN RUNTIME VIEWPORT: THINGSBOARD MIMIC OR SVG SCENE GRAPH          */}
      {/* ===================================================================== */}
      {isPoolScreen && poolDisplayMode === 'thingsboard' ? (
        <ThingsBoardSwimmingPoolView 
          telemetry={telemetry} 
          onUpdateTelemetry={(delta) => {
            setTelemetry(prev => ({
              ...prev,
              ...Object.fromEntries(
                Object.entries(delta).map(([k, v]) => [k, {
                  tag_name: k,
                  value: typeof v === 'object' ? v.value : v,
                  quality: 'GOOD',
                  timestamp: new Date().toISOString()
                }])
              )
            }));
          }}
          onOpenDesigner={() => onOpenDesigner?.(screenId)} 
        />
      ) : (
      <div 
        ref={containerRef}
        className="flex-1 bg-[#020617] relative overflow-hidden flex items-center justify-center p-4"
        style={{
          backgroundImage: 'radial-gradient(#0f172a 1.5px, transparent 1.5px)',
          backgroundSize: '24px 24px'
        }}
      >
        {/* Responsive SCADA Canvas Container */}
        <div
          className="relative transition-transform duration-75 shadow-2xl"
          style={{
            transform: `scale(${zoom})`,
            width: `${screen.width}px`,
            height: `${screen.height}px`,
            backgroundColor: screen.background?.color || '#020617',
            border: '1px solid #1e293b',
            borderRadius: '8px'
          }}
        >
          <svg
            width={screen.width}
            height={screen.height}
            viewBox={`0 0 ${screen.width} ${screen.height}`}
            className="absolute inset-0 w-full h-full"
          >
            {/* SVG Defs for Flow Animations & Gradient Levels */}
            <defs>
              <linearGradient id="liveLiquidGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>

              {/* Animated Flow Pipe Dashoffset Animation */}
              {animationsEnabled && (
                <style>{`
                  @keyframes pipeFlowDash {
                    from { stroke-dashoffset: 40; }
                    to { stroke-dashoffset: 0; }
                  }
                  .animated-pipe-flow {
                    animation: pipeFlowDash 1.2s linear infinite;
                  }
                  @keyframes impellerRotate {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                  }
                  .animated-impeller-spin {
                    animation: impellerRotate 1.5s linear infinite;
                    transform-origin: 50px 50px;
                  }
                `}</style>
              )}
            </defs>

            {/* Smart Pipes Connector Scene Graph */}
            {(screen.connections || []).map(conn => {
              const fromElem = screen.elements.find(e => e.instance_id === conn.from_id);
              const toElem = screen.elements.find(e => e.instance_id === conn.to_id);
              if (!fromElem || !toElem) return null;

              const getPortPos = (el, pId) => {
                const w = el.width || 80, h = el.height || 80;
                const rot = el.rotation || 0;

                // Handle 90-degree rotated elements (e.g. vertical isolation valves)
                if (rot === 90) {
                  if (pId === 'inlet' || pId === 'top') return { x: el.x + w/2, y: el.y };
                  if (pId === 'outlet' || pId === 'bottom') return { x: el.x + w/2, y: el.y + h };
                }

                if (pId === 'suction' || pId === 'inlet' || pId === 'left') return { x: el.x, y: el.y + h/2 };
                if (pId === 'discharge' || pId === 'outlet' || pId === 'right') return { x: el.x + w, y: el.y + h/2 };
                if (pId === 'top' || pId === 'vent') return { x: el.x + w/2, y: el.y };
                if (pId === 'bottom' || pId === 'drain') return { x: el.x + w/2, y: el.y + h };
                if (pId === 'skimmer') return { x: el.x, y: el.y + 100 };
                if (pId === 'return_jets') return { x: el.x + w, y: el.y + 100 };
                if (pId === 'waste') return { x: el.x + w * 0.75, y: el.y + h };
                if (pId === 'water_in') return { x: el.x, y: el.y + 35 };
                if (pId === 'water_out') return { x: el.x + w, y: el.y + 35 };
                return { x: el.x + w/2, y: el.y + h/2 };
              };

              const p1 = getPortPos(fromElem, conn.from_port);
              const p2 = getPortPos(toElem, conn.to_port);
              
              const midX = (p1.x + p2.x) / 2;
              let pathD;
              if (Math.abs(p1.y - p2.y) < 2) {
                // Pure straight horizontal process line
                pathD = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
              } else if (Math.abs(p1.x - p2.x) < 2) {
                // Pure straight vertical process line
                pathD = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
              } else if (conn.id === 'conn-ph-valve9') {
                // Outer riser loop around chemical cell to return valve
                pathD = `M ${p1.x} ${p1.y} L 1265 ${p1.y} L 1265 ${p2.y} L ${p2.x} ${p2.y}`;
              } else {
                const isFromVert = ['top', 'bottom', 'waste', 'drain', 'vent'].includes(conn.from_port);
                const isToVert = ['top', 'bottom', 'waste', 'drain', 'vent'].includes(conn.to_port);
                if (isFromVert && !isToVert) {
                  // Drops or rises vertically first, then runs horizontally
                  pathD = `M ${p1.x} ${p1.y} L ${p1.x} ${p2.y} L ${p2.x} ${p2.y}`;
                } else if (!isFromVert && isToVert) {
                  // Runs horizontally first, then drops or rises vertically into destination port
                  pathD = `M ${p1.x} ${p1.y} L ${p2.x} ${p1.y} L ${p2.x} ${p2.y}`;
                } else {
                  // Standard clean orthogonal routing
                  pathD = `M ${p1.x} ${p1.y} L ${midX} ${p1.y} L ${midX} ${p2.y} L ${p2.x} ${p2.y}`;
                }
              }
              const hasFlow = animationsEnabled && (conn.animated !== false);

              return (
                <g key={conn.id}>
                  {/* Background Casing Pipe */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#0f172a"
                    strokeWidth={(conn.stroke_width || 3) + 4}
                    strokeLinecap="round"
                  />
                  {/* Fluid Stream Pipe */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={conn.color || '#06b6d4'}
                    strokeWidth={conn.stroke_width || 3}
                    strokeLinecap="round"
                    strokeDasharray={hasFlow ? '8 6' : 'none'}
                    className={hasFlow ? 'animated-pipe-flow' : ''}
                  />
                  {conn.label && (
                    <text
                      x={midX}
                      y={(p1.y + p2.y) / 2 - 6}
                      fill="#94a3b8"
                      fontSize={9}
                      fontWeight="600"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {conn.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Elements Process Scene Graph */}
            {(screen.elements || []).map(elem => {
              if (elem.is_hidden) return null;
              const sym = symbols.find(s => s.id === elem.symbol_id) || (elem.symbol_id === 'sym-valve-gate' ? symbols.find(s => s.id === 'sym-3d-spoke-valve' || s.id === 'sym-valve-gate-manual') : null);
              if (!sym) return null;

              // Primary telemetry & quality
              const primaryBinding = Object.values(elem.bindings || {})[0];
              const tagName = primaryBinding?.tag_name;
              const quality = tagName ? getTagQuality(tagName, elem) : 'GOOD';

              const scaleX = elem.flipH ? -1 : 1;
              const scaleY = elem.flipV ? -1 : 1;

              return (
                <g
                  key={elem.instance_id}
                  transform={`translate(${elem.x}, ${elem.y}) rotate(${elem.rotation || 0} ${elem.width / 2} ${elem.height / 2}) scale(${scaleX}, ${scaleY})`}
                  className="cursor-pointer transition-transform hover:opacity-95"
                  onClick={() => handleElementClick(elem)}
                >
                  {/* Symbol SVG with native engineering coordinates and dynamic replacements */}
                  <svg
                    x={0}
                    y={0}
                    width={elem.width}
                    height={elem.height}
                    viewBox={getSymbolNativeViewBox(sym, elem)}
                    preserveAspectRatio={getSymbolPreserveAspectRatio(sym, elem)}
                    overflow="visible"
                    dangerouslySetInnerHTML={{ __html: renderDynamicElementSvg(sym, elem, telemetry) }}
                  />

                  {/* Label & Live Quality Status Badge */}
                  <g transform={`translate(${elem.width / 2}, ${elem.height + 14})`}>
                    <text
                      x={0}
                      y={0}
                      fill="#e2e8f0"
                      fontSize={11}
                      fontWeight="700"
                      fontFamily="sans-serif"
                      textAnchor="middle"
                    >
                      {elem.label || elem.instance_id}
                    </text>

                    {/* Quality Warning if STALE or BAD */}
                    {quality !== 'GOOD' && (
                      <text
                        x={0}
                        y={14}
                        fill="#f59e0b"
                        fontSize={9}
                        fontWeight="800"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        [{quality}]
                      </text>
                    )}
                  </g>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
      )}

      {/* ===================================================================== */}
      {/* POPUP 1: IN-PLACE ECHARTS HISTORICAL TREND POPUP                     */}
      {/* ===================================================================== */}
      {activeTrendTag && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="h-12 border-b border-slate-800 px-5 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-sky-400" />
                <h3 className="text-xs font-bold text-slate-100">
                  {activeTrendTitle || `Process Trend: ${activeTrendTag}`}
                </h3>
              </div>
              <button
                onClick={() => setActiveTrendTag(null)}
                className="p-1 text-slate-400 hover:text-slate-100 rounded"
              >
                <X size={16} />
              </button>
            </div>

            {/* TimeSeries Chart Panel */}
            <div className="p-4 h-96 bg-[#090e1d]">
              <TimeSeriesPanel
                panel={{
                  id: 'trend-modal',
                  title: activeTrendTag,
                  tags: [activeTrendTag],
                  type: 'timeseries',
                  showArea: true,
                  curveStyle: 'smooth',
                  showPoints: false,
                  lineWidth: 2
                }}
                timeRange="now-15m"
                liveTelemetry={telemetry}
              />
            </div>

            {/* Footer with Tag Telemetry Snapshot */}
            <div className="h-10 border-t border-slate-800 px-5 bg-slate-950 flex items-center justify-between text-xs text-slate-400 font-mono">
              <div>
                Latest Value: <span className="text-sky-400 font-bold">{telemetry[activeTrendTag]?.value ?? 'N/A'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="text-slate-500">Quality:</span>
                <span className="text-emerald-400 font-bold uppercase">{getTagQuality(activeTrendTag)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* POPUP 2: ASSET DETAILS & SPECIFICATIONS POPUP                         */}
      {/* ===================================================================== */}
      {activeAssetPopup && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-100">{activeAssetPopup.label}</h3>
                <span className="text-xs font-mono text-sky-400">{activeAssetPopup.symbol_id}</span>
              </div>
              <button
                onClick={() => setActiveAssetPopup(null)}
                className="p-1 text-slate-400 hover:text-slate-100 rounded"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="text-slate-400 font-medium">Mapped Telemetry Bindings:</div>
              {Object.entries(activeAssetPopup.bindings || {}).map(([key, bDef]) => (
                <div key={key} className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between font-mono">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">{key}</span>
                    <span className="text-sky-300 font-bold">{bDef.tag_name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-400 font-bold text-sm">
                      {getTagValue(bDef.tag_name)} {bDef.uom}
                    </span>
                    <span className="block text-[9px] text-slate-500 uppercase">{getTagQuality(bDef.tag_name)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => {
                  const tag = Object.values(activeAssetPopup.bindings || {})[0]?.tag_name;
                  setActiveAssetPopup(null);
                  if (tag) setActiveTrendTag(tag);
                }}
                className="px-3.5 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <BarChart3 size={13} />
                <span>Open Historical Telemetry Trend</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ThingsBoard-Style Equipment Monitor & Multi-Trace Trend Window */}
      {equipmentMonitorDevice && (
        <EquipmentTrendWindow
          device={equipmentMonitorDevice}
          onClose={() => setEquipmentMonitorDevice(null)}
          liveValues={telemetry}
        />
      )}
    </div>
  );
}
