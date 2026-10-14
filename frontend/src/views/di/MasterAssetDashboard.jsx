import React, { useState, useEffect, useRef } from 'react';
import {
  Activity, Gauge, Sliders, Layers, RefreshCw, Power, RotateCw,
  AlertTriangle, CheckCircle2, Radio, BarChart3, Database, Play,
  Check, ArrowUpRight, ShieldAlert, Cpu, Settings, Copy, Download,
  Volume2, Disc, Thermometer, Wind, Droplets, Flame, Sparkles,
  Server, Zap, Eye, ChevronRight, AlertOctagon, Send, Pause,
  SlidersHorizontal, CheckCheck, TrendingUp, ShieldCheck, GitFork
} from 'lucide-react';
import { useDM } from '../dm/dmContext';

// Unified Plant Asset Catalog
export const ASSET_CATALOG = [
  {
    id: 'ast-unit-cdu',
    name: 'Atmospheric Distillation Unit C-101',
    code: 'CDU-101',
    type: 'Fractionation Column & Distillation Train',
    area: 'Crude Distillation Block A',
    deviceId: 'dev-cdu-01',
    description: 'Separates crude oil into naphtha, kerosene, diesel, and atmospheric residue.',
    status: 'OPTIMAL',
    tags: {
      temp: 'TIC_101.PV',
      tempSet: 'TIC_101.SV',
      pressure: 'PIC_101.PV',
      flow: 'FIC_101.PV',
      flowSet: 'FIC_101.MV',
      level: 'LIC_101.PV',
      pumpRun: 'MTR_101.RUN',
      pumpRpm: 'MTR_101.RPM',
      valveStatus: 'XV_101.STATUS'
    },
    defaultTelemetry: {
      "TIC_101.PV": 118.4,
      "TIC_101.SV": 178.5,
      "PIC_101.PV": 145.2,
      "FIC_101.PV": 452.3,
      "FIC_101.MV": 58.2,
      "LIC_101.PV": 62.4,
      "MTR_101.RUN": true,
      "MTR_101.RPM": 2950,
      "XV_101.STATUS": "OPEN_HEALTHY"
    }
  },
  {
    id: 'ast-unit-fccu',
    name: 'Fluid Catalytic Cracking Unit (FCCU-02)',
    code: 'FCCU-02',
    type: 'Catalytic Reactor & Regenerator',
    area: 'Secondary Conversion Block B',
    deviceId: 'dev-fccu-02',
    description: 'Upgrades heavy gas oils into high-octane gasoline and light olefins.',
    status: 'OPTIMAL',
    tags: {
      temp: 'TIC_201.PV',
      tempSet: 'TIC_201.SV',
      pressure: 'PIC_201.PV',
      flow: 'FIC_201.PV',
      flowSet: 'FIC_201.MV',
      level: 'LIC_201.PV',
      pumpRun: 'BLOWER_201.RUN',
      pumpRpm: 'BLOWER_201.RPM',
      valveStatus: 'SLIDE_VALVE_201.STATUS'
    },
    defaultTelemetry: {
      "TIC_201.PV": 532.0,
      "TIC_201.SV": 535.0,
      "PIC_201.PV": 210.4,
      "FIC_201.PV": 780.0,
      "FIC_201.MV": 72.0,
      "LIC_201.PV": 48.0,
      "BLOWER_201.RUN": true,
      "BLOWER_201.RPM": 3600,
      "SLIDE_VALVE_201.STATUS": "REGULATING"
    }
  },
  {
    id: 'ast-unit-tankfarm',
    name: 'Crude Oil Feed & Storage Tank Farm',
    code: 'TK-101/102',
    type: 'Atmospheric Floating Roof Storage',
    area: 'Offsites & Logistics Terminal',
    deviceId: 'dev-tank-01',
    description: 'Bulk crude oil storage with automated custody transfer and level gauging.',
    status: 'OPTIMAL',
    tags: {
      temp: 'TIC_301.PV',
      tempSet: 'TIC_301.SV',
      pressure: 'PIC_301.PV',
      flow: 'FIC_301.PV',
      flowSet: 'FIC_301.MV',
      level: 'LIC_301.PV',
      pumpRun: 'PUMP_TK_01.RUN',
      pumpRpm: 'PUMP_TK_01.RPM',
      valveStatus: 'MOV_301.STATUS'
    },
    defaultTelemetry: {
      "TIC_301.PV": 42.5,
      "TIC_301.SV": 45.0,
      "PIC_301.PV": 102.3,
      "FIC_301.PV": 1250.0,
      "FIC_301.MV": 84.0,
      "LIC_301.PV": 78.5,
      "PUMP_TK_01.RUN": true,
      "PUMP_TK_01.RPM": 1450,
      "MOV_301.STATUS": "OPEN"
    }
  },
  {
    id: 'ast-unit-furnace',
    name: 'Process Fired Heater Furnace (F-101)',
    code: 'F-101',
    type: 'Natural Draft Radiant Fired Heater',
    area: 'Crude Preheat Block A',
    deviceId: 'dev-furn-01',
    description: 'Heats crude oil feed stream to 360°C prior to flash distillation entry.',
    status: 'OPTIMAL',
    tags: {
      temp: 'TIC_401.PV',
      tempSet: 'TIC_401.SV',
      pressure: 'PIC_401.PV',
      flow: 'FIC_401.PV',
      flowSet: 'FIC_401.MV',
      level: 'LIC_401.PV',
      pumpRun: 'FAN_F101.RUN',
      pumpRpm: 'FAN_F101.RPM',
      valveStatus: 'DAMPER_101.STATUS'
    },
    defaultTelemetry: {
      "TIC_401.PV": 358.2,
      "TIC_401.SV": 360.0,
      "PIC_401.PV": 98.4,
      "FIC_401.PV": 510.0,
      "FIC_401.MV": 65.0,
      "LIC_401.PV": 25.0,
      "FAN_F101.RUN": true,
      "FAN_F101.RPM": 1780,
      "DAMPER_101.STATUS": "THROTTLED"
    }
  },
  {
    id: 'ast-unit-flare',
    name: 'Emergency Relief Flare Stack (FL-101)',
    code: 'FL-101',
    type: 'Elevated Smokeless Flare System',
    area: 'Plant Safety & Environmental Relief',
    deviceId: 'dev-flare-01',
    description: 'Safe thermal destruction of overpressure relief gases and ESD blowdown.',
    status: 'STANDBY',
    tags: {
      temp: 'TIC_501.PV',
      tempSet: 'TIC_501.SV',
      pressure: 'PIC_501.PV',
      flow: 'FIC_501.PV',
      flowSet: 'FIC_501.MV',
      level: 'LIC_501.PV',
      pumpRun: 'PILOT_501.RUN',
      pumpRpm: 'PILOT_501.RPM',
      valveStatus: 'BLOWDOWN_101.STATUS'
    },
    defaultTelemetry: {
      "TIC_501.PV": 845.0,
      "TIC_501.SV": 850.0,
      "PIC_501.PV": 105.1,
      "FIC_501.PV": 85.0,
      "FIC_501.MV": 12.0,
      "LIC_501.PV": 15.2,
      "PILOT_501.RUN": true,
      "PILOT_501.RPM": 0,
      "BLOWDOWN_101.STATUS": "CLOSED_HEALTHY"
    }
  }
];

export default function MasterAssetDashboard({ 
  selectedAssetId, 
  onSelectAsset, 
  onNavigateToDM, 
  isLiveStream = true 
}) {
  const { assets = [], alarms = [], acknowledgeAlarm, clearAlarm, refreshState, showToast, setActiveEntity } = useDM();

  if (!assets || assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] bg-[#050914] text-slate-100 p-8 text-center space-y-4">
        <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
          <Layers className="w-12 h-12" />
        </div>
        <h2 className="text-xl font-bold text-white">No Assets Configured</h2>
        <p className="text-sm text-slate-400 max-w-md">
          Data Management is currently a clean slate with zero assets. Register your plant assets, devices, and sensors in Data Management to view live operational dashboards and synoptics.
        </p>
        <button
          onClick={() => {
            setActiveEntity?.('asset');
            onNavigateToDM?.();
          }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-lg shadow-lg shadow-indigo-600/30 transition flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          <span>Configure Asset in Data Management</span>
        </button>
      </div>
    );
  }

  // Active Asset selection
  const [activeAssetId, setActiveAssetId] = useState(selectedAssetId || assets[0]?.id || '');
  const activeAsset = ASSET_CATALOG.find(a => a.id === activeAssetId) || ASSET_CATALOG[0];

  // Live Telemetry state for active asset
  const [telemetry, setTelemetry] = useState(activeAsset.defaultTelemetry);
  const [isStreaming, setIsStreaming] = useState(isLiveStream);
  const [timeRange, setTimeRange] = useState('15m');

  // Sync isLiveStream prop
  useEffect(() => {
    if (typeof isLiveStream === 'boolean') {
      setIsStreaming(isLiveStream);
    }
  }, [isLiveStream]);

  // RPC Command In-Flight states
  const [rpcLoadingMethod, setRpcLoadingMethod] = useState(null);

  // Digital Twin Interactive Modal
  const [inspectedComponent, setInspectedComponent] = useState(null);

  // Time Series Pen Trend Buffer
  const [trendBuffer, setTrendBuffer] = useState([
    { t: 0, temp: 115, press: 142, flow: 442, level: 60 },
    { t: 1, temp: 116, press: 143, flow: 446, level: 61 },
    { t: 2, temp: 117, press: 144, flow: 449, level: 62 },
    { t: 3, temp: 118, press: 145, flow: 451, level: 62.2 },
    { t: 4, temp: 118.4, press: 145.2, flow: 452.3, level: 62.4 }
  ]);

  // Sync when prop changes
  useEffect(() => {
    if (selectedAssetId && selectedAssetId !== activeAssetId) {
      setActiveAssetId(selectedAssetId);
    }
  }, [selectedAssetId]);

  // Update telemetry default whenever active asset changes
  useEffect(() => {
    setTelemetry(activeAsset.defaultTelemetry);
    setTrendBuffer([
      { t: 0, temp: activeAsset.defaultTelemetry[activeAsset.tags.temp] * 0.98, press: activeAsset.defaultTelemetry[activeAsset.tags.pressure] * 0.98, flow: activeAsset.defaultTelemetry[activeAsset.tags.flow] * 0.98, level: activeAsset.defaultTelemetry[activeAsset.tags.level] * 0.98 },
      { t: 1, temp: activeAsset.defaultTelemetry[activeAsset.tags.temp], press: activeAsset.defaultTelemetry[activeAsset.tags.pressure], flow: activeAsset.defaultTelemetry[activeAsset.tags.flow], level: activeAsset.defaultTelemetry[activeAsset.tags.level] }
    ]);
  }, [activeAssetId]);

  // Live Telemetry Stream from Backend Snapshot
  useEffect(() => {
    if (!isStreaming) return;
    const fetchLive = async () => {
      try {
        const res = await fetch('/api/v1/tags/snapshot');
        if (res.ok) {
          const snap = await res.json();
          const tempKey = activeAsset.tags.temp;
          const pressKey = activeAsset.tags.pressure;
          const flowKey = activeAsset.tags.flow;
          const levelKey = activeAsset.tags.level;

          const curTemp = snap[tempKey]?.value ?? activeAsset.defaultTelemetry[tempKey] ?? 0;
          const curPress = snap[pressKey]?.value ?? activeAsset.defaultTelemetry[pressKey] ?? 0;
          const curFlow = snap[flowKey]?.value ?? activeAsset.defaultTelemetry[flowKey] ?? 0;
          const curLevel = snap[levelKey]?.value ?? activeAsset.defaultTelemetry[levelKey] ?? 0;

          // Update Trend Buffer with real points
          setTrendBuffer(buf => {
            const nextT = (buf[buf.length - 1]?.t || 0) + 1;
            const nextItem = { t: nextT, temp: curTemp, press: curPress, flow: curFlow, level: curLevel };
            return [...buf.slice(buf.length > 20 ? 1 : 0), nextItem];
          });

          setTelemetry(prev => ({
            ...prev,
            [tempKey]: curTemp,
            [pressKey]: curPress,
            [flowKey]: curFlow,
            [levelKey]: curLevel
          }));
        }
      } catch (e) {
        // quiet
      }
    };

    fetchLive();
    const interval = setInterval(fetchLive, 2500);
    return () => clearInterval(interval);
  }, [isStreaming, activeAsset]);

  // Execute Two-Way Downlink RPC to DCS / Controller
  const handleExecuteRpc = async (method, params) => {
    setRpcLoadingMethod(method);
    try {
      const res = await fetch(`/api/v1/dm/devices/${activeAsset.deviceId}/rpc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method,
          params,
          timeout: 5000
        })
      });

      if (res.ok) {
        const data = await res.json();
        showToast(`RPC Command '${method}' executed: ${JSON.stringify(data.result || data.status)}`, 'success');

        // Apply local state feedback
        if (method === 'togglePump') {
          const pumpTag = activeAsset.tags.pumpRun;
          setTelemetry(prev => ({ ...prev, [pumpTag]: !prev[pumpTag] }));
        } else if (method === 'setPoint') {
          const setTag = activeAsset.tags.tempSet;
          setTelemetry(prev => ({ ...prev, [setTag]: params.value || params }));
        } else if (method === 'setActuator') {
          const flowSetTag = activeAsset.tags.flowSet;
          setTelemetry(prev => ({ ...prev, [flowSetTag]: params.value || params }));
        }
      } else {
        showToast('RPC dispatch failed', 'error');
      }
    } catch (e) {
      showToast(`RPC error: ${e.message}`, 'error');
    } finally {
      setRpcLoadingMethod(null);
    }
  };

  // Simulate Emergency Process Trip on active asset
  const handleSimulateEmergencyTrip = async () => {
    try {
      const res = await fetch('/api/v1/dm/alarms/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alarm_name: `${activeAsset.code} Emergency Trip Threshold Exceeded`,
          tag_name: activeAsset.tags.pressure,
          current_value: +(telemetry[activeAsset.tags.pressure] * 1.35).toFixed(1),
          threshold_limit: telemetry[activeAsset.tags.pressure],
          priority: 'Urgent',
          severity: 850,
          source_asset: activeAsset.name
        })
      });
      if (res.ok) {
        await refreshState();
        showToast(`Emergency Trip triggered on ${activeAsset.name}! Dispatched to alarm engine.`, 'error');
      }
    } catch (e) {
      showToast(`Trip error: ${e.message}`, 'error');
    }
  };

  // Export Dashboard JSON
  const handleExportDashboard = () => {
    const bundle = {
      assetId: activeAsset.id,
      assetName: activeAsset.name,
      exportedAt: new Date().toISOString(),
      telemetry,
      widgets: [
        { type: "DIGITAL_TWIN", title: `${activeAsset.name} Process Schematic` },
        { type: "RADIAL_GAUGE", title: "Bourdon Tube Pressure Gauge", tag: activeAsset.tags.pressure },
        { type: "DIGITAL_GAUGE", title: "Digital Temperature Indicator", tag: activeAsset.tags.temp },
        { type: "LIQUID_TANK", title: "Storage Vessel Level", tag: activeAsset.tags.level },
        { type: "TIMESERIES_TREND", title: "Multi-Pen Trend History" },
        { type: "RPC_CONTROLS", title: "Actuator & Setpoint Terminals" },
        { type: "PROCESS_ALARMS", title: "Active Alarms Table" }
      ]
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeAsset.code}_Master_Dashboard_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${activeAsset.name} Master Dashboard JSON`, 'success');
  };

  // Active alarms for this asset
  const assetAlarms = alarms.filter(a => 
    a.source_asset?.toLowerCase().includes(activeAsset.code.toLowerCase()) ||
    a.source_asset?.toLowerCase().includes(activeAsset.name.toLowerCase()) ||
    a.tag_name === activeAsset.tags.temp ||
    a.tag_name === activeAsset.tags.pressure
  );

  const curTemp = telemetry[activeAsset.tags.temp] || 0;
  const curPress = telemetry[activeAsset.tags.pressure] || 0;
  const curFlow = telemetry[activeAsset.tags.flow] || 0;
  const curLevel = telemetry[activeAsset.tags.level] || 0;
  const isPumpRunning = !!telemetry[activeAsset.tags.pumpRun];

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-[#050914] text-slate-100 overflow-y-auto select-none">
      
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & UNIFIED ASSET FLOW SELECTOR                               */}
      {/* ========================================================================= */}
      <div className="bg-[#0b1224] border-b border-slate-800 px-5 py-3 sticky top-0 z-30 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between flex-wrap gap-4">
          
          {/* Left: Asset Title & Flow Context */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-indigo-500/40 rounded-xl text-cyan-400 shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-white tracking-wide">
                  Master Operational Dashboard &amp; Digital Twin
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-indigo-950 text-indigo-400 border border-indigo-800">
                  DI Core
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  {activeAsset.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xl">
                Unified live telemetry, ThingsBoard digital twin schematics, process gauges, multi-pen trends, RPC controls, and ISA-18.2 alarms.
              </p>
            </div>
          </div>

          {/* Right: Flow Controls & Export */}
          <div className="flex items-center gap-2.5">
            {/* Live streaming status toggle */}
            <button
              onClick={() => setIsStreaming(!isStreaming)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                isStreaming
                  ? 'bg-emerald-950/40 border-emerald-600/40 text-emerald-400'
                  : 'bg-amber-950/40 border-amber-600/40 text-amber-400'
              }`}
            >
              {isStreaming ? <Activity className="w-3.5 h-3.5 animate-pulse" /> : <Pause className="w-3.5 h-3.5" />}
              <span>{isStreaming ? 'Streaming (1s)' : 'Paused'}</span>
            </button>

            {/* Time range selector */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 font-mono"
            >
              <option value="5m">Last 5 min</option>
              <option value="15m">Last 15 min</option>
              <option value="1h">Last 1 hour</option>
              <option value="8h">Last 8 hours (Shift)</option>
            </select>

            {/* Emergency Trip Simulator Button */}
            <button
              onClick={handleSimulateEmergencyTrip}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white text-xs font-bold rounded-lg shadow-lg shadow-rose-900/30 transition border border-rose-500"
              title="Inject Emergency Process Alarm on this Asset"
            >
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>Simulate Trip</span>
            </button>

            {/* Export Dashboard JSON */}
            <button
              onClick={handleExportDashboard}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
              title="Download ThingsBoard Dashboard Configuration JSON"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export JSON</span>
            </button>
          </div>
        </div>

        {/* Global Asset Flow Switcher Pills */}
        <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-slate-800/80 overflow-x-auto pb-0.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            Select Asset Flow:
          </span>
          {ASSET_CATALOG.map(asset => {
            const isSelected = asset.id === activeAssetId;
            return (
              <button
                key={asset.id}
                onClick={() => {
                  setActiveAssetId(asset.id);
                  if (onSelectAsset) onSelectAsset(asset.id);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 ${
                  isSelected
                    ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md shadow-cyan-600/20 border border-cyan-400/50'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                <span className="font-mono text-[11px] opacity-80">{asset.code}</span>
                <span>{asset.name.split('(')[0].trim()}</span>
              </button>
            );
          })}

          {/* Seamless Unified Flow Links to DM IoT Management */}
          <div className="ml-auto flex items-center gap-2 shrink-0 pl-3 border-l border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">IoT Config:</span>
            <button
              onClick={() => onNavigateToDM && onNavigateToDM('devices', activeAsset.deviceId)}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-[11px] text-cyan-300 transition"
              title="Configure Device in ThingsBoard IoT Manager"
            >
              <Cpu className="w-3 h-3 text-cyan-400" />
              <span>Device ({activeAsset.code})</span>
            </button>
            <button
              onClick={() => onNavigateToDM && onNavigateToDM('rule_chains')}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-[11px] text-amber-300 transition"
              title="Inspect Telemetry Processing Rule Chains"
            >
              <GitFork className="w-3 h-3 text-amber-400" />
              <span>Rule Chain</span>
            </button>
            <button
              onClick={() => onNavigateToDM && onNavigateToDM('alarms')}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-[11px] text-rose-300 transition"
              title="Inspect ISA-18.2 Alarm Policies"
            >
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              <span>Alarm Engine</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN DASHBOARD CONTENT GRID                                            */}
      {/* ========================================================================= */}
      <div className="p-5 space-y-5">
        
        {/* ----------------------------------------------------------------------- */}
        {/* ROW 1: THINGSBOARD SCADA DIGITAL TWIN PROCESS SCHEMATIC WIDGET           */}
        {/* ----------------------------------------------------------------------- */}
        <div className="bg-[#090f1f] border border-slate-800 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
          
          <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400">
                <Gauge className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                  ThingsBoard Digital Twin • {activeAsset.name}
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                    Live Synoptic HMI
                  </span>
                </h2>
                <span className="text-[11px] text-slate-400">
                  Click on any vessel, valve, or pump to inspect telemetry and disptach remote commands
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Pumping: <strong className="text-emerald-400">{isPumpRunning ? 'RUNNING' : 'STOPPED'}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                <span>Valve: <strong className="text-cyan-400">{telemetry[activeAsset.tags.valveStatus] || 'HEALTHY'}</strong></span>
              </div>
            </div>
          </div>

          {/* SVG Digital Twin Schematic */}
          <div className="relative w-full h-80 bg-[#040711] rounded-xl border border-slate-800/80 overflow-hidden flex items-center justify-center p-2">
            
            {/* Grid Backdrop */}
            <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>

            <svg viewBox="0 0 960 300" className="w-full h-full">
              <defs>
                <linearGradient id="columnGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="50%" stopColor="#334155" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>
                <linearGradient id="liquidGrad" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#0284c7" />
                  <stop offset="100%" stopColor="#38bdf8" />
                </linearGradient>
                <linearGradient id="reboilerGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#dc2626" />
                </linearGradient>
              </defs>

              {/* Piping Network */}
              {/* Feed Pipe to Column */}
              <path d="M 40 160 L 280 160" stroke="#38bdf8" strokeWidth="6" fill="none" strokeDasharray={isPumpRunning ? "8 4" : "none"} className={isPumpRunning ? "animate-pulse" : ""} />
              {/* Overhead Vapor to Condenser */}
              <path d="M 330 40 L 330 20 L 520 20 L 520 70" stroke="#94a3b8" strokeWidth="5" fill="none" />
              {/* Condenser to Reflux Drum */}
              <path d="M 520 120 L 520 160" stroke="#38bdf8" strokeWidth="5" fill="none" />
              {/* Reflux Return to Column */}
              <path d="M 520 180 L 440 180 L 440 80 L 380 80" stroke="#38bdf8" strokeWidth="4" fill="none" />
              {/* Bottoms to Reboiler */}
              <path d="M 330 260 L 330 280 L 220 280 L 220 230 L 280 230" stroke="#f59e0b" strokeWidth="5" fill="none" />

              {/* Feed Pump (ANSI Centrifugal) */}
              <g 
                transform="translate(130, 140)" 
                className="cursor-pointer group"
                onClick={() => setInspectedComponent({ name: "Feed Pump P-101A", type: "Rotating Machinery", tag: activeAsset.tags.pumpRun, val: isPumpRunning ? "RUNNING" : "STOPPED" })}
              >
                <circle cx="20" cy="20" r="22" fill={isPumpRunning ? "#065f46" : "#7f1d1d"} stroke={isPumpRunning ? "#10b981" : "#ef4444"} strokeWidth="2.5" />
                <path d="M 10 20 L 30 20 M 20 10 L 20 30" stroke="#ffffff" strokeWidth="2" />
                <text x="20" y="55" fill="#94a3b8" fontSize="10" textAnchor="middle" fontFamily="monospace">PUMP P-101A</text>
              </g>

              {/* Feed Control Valve (Diaphragm) */}
              <g 
                transform="translate(210, 145)" 
                className="cursor-pointer"
                onClick={() => setInspectedComponent({ name: "Feed Control Valve FCV-101", type: "Diaphragm Control Valve", tag: activeAsset.tags.flow, val: `${curFlow} m³/h` })}
              >
                <polygon points="0,0 24,15 0,30" fill="#38bdf8" opacity="0.8" />
                <polygon points="24,0 0,15 24,30" fill="#38bdf8" opacity="0.8" />
                <line x1="12" y1="15" x2="12" y2="0" stroke="#ffffff" strokeWidth="2" />
                <rect x="6" y="-8" width="12" height="8" rx="2" fill="#e2e8f0" />
                <text x="12" y="44" fill="#94a3b8" fontSize="10" textAnchor="middle" fontFamily="monospace">FCV-101</text>
              </g>

              {/* Main Fractionation Column C-101 */}
              <g 
                transform="translate(280, 30)" 
                className="cursor-pointer"
                onClick={() => setInspectedComponent({ name: activeAsset.name, type: "Fractionation Column", tag: activeAsset.tags.temp, val: `${curTemp} °C` })}
              >
                {/* Vessel Body */}
                <rect x="0" y="10" width="100" height="230" rx="15" fill="url(#columnGrad)" stroke="#475569" strokeWidth="3" />
                {/* Trays simulation lines */}
                {[45, 75, 105, 135, 165, 195].map((y, i) => (
                  <line key={i} x1="10" y1={y} x2="90" y2={y} stroke="#64748b" strokeWidth="2" strokeDasharray="6 3" />
                ))}
                {/* Liquid bottom level */}
                <rect 
                  x="3" 
                  y={240 - (curLevel * 0.7)} 
                  width="94" 
                  height={curLevel * 0.7} 
                  rx="4" 
                  fill="url(#liquidGrad)" 
                  opacity="0.85" 
                />
                <text x="50" y="270" fill="#f8fafc" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">COLUMN C-101</text>
              </g>

              {/* Overhead Condenser E-101 */}
              <g 
                transform="translate(480, 50)" 
                className="cursor-pointer"
                onClick={() => setInspectedComponent({ name: "Overhead Condenser E-101", type: "Shell & Tube Exchanger", tag: "E101.DUTY", val: "14.2 MW" })}
              >
                <circle cx="40" cy="40" r="28" fill="#1e293b" stroke="#38bdf8" strokeWidth="3" />
                <path d="M 22 26 L 58 54 M 22 54 L 58 26" stroke="#38bdf8" strokeWidth="2.5" />
                <text x="40" y="85" fill="#94a3b8" fontSize="10" textAnchor="middle" fontFamily="monospace">CONDENSER</text>
              </g>

              {/* Reflux Drum D-101 */}
              <g 
                transform="translate(480, 150)" 
                className="cursor-pointer"
                onClick={() => setInspectedComponent({ name: "Reflux Accumulator D-101", type: "Horizontal Vessel", tag: activeAsset.tags.level, val: `${curLevel}%` })}
              >
                <rect x="5" y="0" width="70" height="35" rx="10" fill="#1e293b" stroke="#0ea5e9" strokeWidth="2.5" />
                <rect x="8" y={35 - (curLevel * 0.28)} width="64" height={curLevel * 0.28} rx="4" fill="#0284c7" opacity="0.8" />
                <text x="40" y="50" fill="#94a3b8" fontSize="10" textAnchor="middle" fontFamily="monospace">DRUM D-101</text>
              </g>

              {/* Reboiler E-102 */}
              <g 
                transform="translate(170, 210)" 
                className="cursor-pointer"
                onClick={() => setInspectedComponent({ name: "Thermosiphon Reboiler E-102", type: "Fired Reboiler", tag: "E102.DUTY", val: "22.8 MW" })}
              >
                <circle cx="30" cy="30" r="22" fill="#1e293b" stroke="#f59e0b" strokeWidth="2.5" />
                <Flame x="18" y="18" className="w-6 h-6 text-amber-500" />
                <text x="30" y="65" fill="#f59e0b" fontSize="10" textAnchor="middle" fontFamily="monospace">REBOILER</text>
              </g>

              {/* Telemetry Callout Tags Placed Directly on Process Elements */}
              {/* Temp Tag on Column Top */}
              <g transform="translate(390, 30)">
                <rect x="0" y="0" width="115" height="28" rx="6" fill="#0b1329" stroke="#ef4444" strokeWidth="1.5" />
                <text x="8" y="18" fill="#fca5a5" fontSize="11" fontWeight="bold" fontFamily="monospace">TIC-101: {curTemp} °C</text>
              </g>
              {/* Pressure Tag on Column Overhead */}
              <g transform="translate(390, 65)">
                <rect x="0" y="0" width="115" height="28" rx="6" fill="#0b1329" stroke="#38bdf8" strokeWidth="1.5" />
                <text x="8" y="18" fill="#7dd3fc" fontSize="11" fontWeight="bold" fontFamily="monospace">PIC-101: {curPress} kPa</text>
              </g>
              {/* Flow Tag on Feed */}
              <g transform="translate(40, 115)">
                <rect x="0" y="0" width="125" height="28" rx="6" fill="#0b1329" stroke="#10b981" strokeWidth="1.5" />
                <text x="8" y="18" fill="#6ee7b7" fontSize="11" fontWeight="bold" fontFamily="monospace">FIC-101: {curFlow} m³/h</text>
              </g>
              {/* Level Tag on Bottom */}
              <g transform="translate(390, 220)">
                <rect x="0" y="0" width="115" height="28" rx="6" fill="#0b1329" stroke="#c084fc" strokeWidth="1.5" />
                <text x="8" y="18" fill="#d8b4fe" fontSize="11" fontWeight="bold" fontFamily="monospace">LIC-101: {curLevel} %</text>
              </g>
            </svg>

            {/* Quick interactive inspector drawer */}
            {inspectedComponent && (
              <div className="absolute bottom-3 right-3 bg-[#0d1527] border border-cyan-500/40 rounded-xl p-3 shadow-2xl z-20 flex items-center gap-3 animate-in fade-in">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                    {inspectedComponent.name}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {inspectedComponent.type} • Value: <strong className="text-cyan-300 font-mono">{inspectedComponent.val}</strong>
                  </div>
                </div>
                <button
                  onClick={() => setInspectedComponent(null)}
                  className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
                >
                  &times;
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* ROW 2: THINGSBOARD LATEST VALUES & GAUGES CATALOG (4 Authentic Widgets)   */}
        {/* ----------------------------------------------------------------------- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Widget 1: ThingsBoard Digital Circular Arc Gauge */}
          <div className="bg-[#0c1426] border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between hover:border-slate-700 transition">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-xs font-bold text-white">Process Temperature</span>
              <span className="text-[10px] font-mono text-cyan-400">{activeAsset.tags.temp}</span>
            </div>
            <div className="py-2 flex flex-col items-center justify-center">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="64" cy="64" r="50" stroke="#1e293b" strokeWidth="10" fill="transparent" />
                  <circle
                    cx="64"
                    cy="64"
                    r="50"
                    stroke={curTemp > 180 ? '#ef4444' : '#38bdf8'}
                    strokeWidth="10"
                    strokeDasharray={314}
                    strokeDashoffset={314 - (314 * Math.min(100, (curTemp / 300) * 100)) / 100}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-2xl font-black font-mono text-white tracking-tight">{curTemp}</span>
                  <span className="text-xs font-bold text-slate-400">°C</span>
                </div>
              </div>
              <div className="w-full flex justify-between text-[10px] text-slate-400 px-2 font-mono mt-1">
                <span>Min: 0 °C</span>
                <span>Trip: 240 °C</span>
                <span>Max: 300 °C</span>
              </div>
            </div>
          </div>

          {/* Widget 2: ThingsBoard Radial Bourdon Tube Pressure Dial */}
          <div className="bg-[#0c1426] border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between hover:border-slate-700 transition">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-xs font-bold text-white">Overhead Pressure Dial</span>
              <span className="text-[10px] font-mono text-cyan-400">{activeAsset.tags.pressure}</span>
            </div>
            <div className="py-2 flex flex-col items-center justify-center">
              <div className="relative w-28 h-28 rounded-full border-4 border-slate-700 bg-gradient-to-b from-slate-900 to-black flex items-center justify-center shadow-inner">
                <div className="absolute inset-1 rounded-full border border-dashed border-slate-600/40 pointer-events-none"></div>
                {/* Physical Needle */}
                <div 
                  className="absolute w-1 h-12 bg-rose-500 origin-bottom rounded transition-transform duration-500 shadow-md shadow-rose-500/50"
                  style={{
                    bottom: '50%',
                    transform: `rotate(${((curPress / 400) * 260) - 130}deg)`
                  }}
                ></div>
                <div className="w-3.5 h-3.5 rounded-full bg-slate-300 border-2 border-slate-800 z-10"></div>
                <div className="absolute bottom-2 text-center">
                  <span className="text-xs font-black font-mono text-amber-400">{curPress}</span>
                  <span className="text-[9px] text-slate-400 ml-1">kPa</span>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 font-mono mt-2">
                Bourdon Dial Sensor • Range 0 - 400 kPa
              </span>
            </div>
          </div>

          {/* Widget 3: ThingsBoard Liquid Vessel Tank Level */}
          <div className="bg-[#0c1426] border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between hover:border-slate-700 transition">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-xs font-bold text-white">Liquid Sump Inventory</span>
              <span className="text-[10px] font-mono text-cyan-400">{activeAsset.tags.level}</span>
            </div>
            <div className="py-2 flex items-center justify-around">
              <div className="w-16 h-28 rounded-xl border-2 border-slate-700 bg-slate-950 relative overflow-hidden flex flex-col justify-end p-0.5">
                <div 
                  className="w-full bg-gradient-to-t from-cyan-600 to-blue-500 rounded-b-lg transition-all duration-700 relative"
                  style={{ height: `${Math.min(100, Math.max(0, curLevel))}%` }}
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-cyan-300 opacity-60 animate-pulse"></div>
                </div>
                <div className="absolute inset-y-0 right-1 flex flex-col justify-between py-1 text-[7px] font-mono text-slate-500 pointer-events-none">
                  <span>100%</span>
                  <span>50%</span>
                  <span>0%</span>
                </div>
              </div>
              <div className="space-y-1 font-mono">
                <div className="text-2xl font-black text-cyan-400">{curLevel}%</div>
                <div className="text-xs text-slate-400">Hydrocarbon Sump</div>
                <div className="text-[10px] text-slate-500">Vol: {(curLevel * 38.2).toFixed(0)} L</div>
              </div>
            </div>
          </div>

          {/* Widget 4: Machinery RPM & Vibration Status */}
          <div className="bg-[#0c1426] border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between hover:border-slate-700 transition">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-xs font-bold text-white">Machinery Drive Health</span>
              <span className="text-[10px] font-mono text-cyan-400">{activeAsset.tags.pumpRun}</span>
            </div>
            <div className="py-3 flex flex-col items-center justify-center space-y-2">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl border ${
                  isPumpRunning 
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400 animate-pulse' 
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-400'
                }`}>
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xl font-black font-mono text-white">
                    {isPumpRunning ? (telemetry[activeAsset.tags.pumpRpm] || 2950) : 0} <span className="text-xs text-slate-400">RPM</span>
                  </div>
                  <div className="text-[10px] font-bold text-slate-400">
                    Status: <span className={isPumpRunning ? "text-emerald-400" : "text-rose-400"}>
                      {isPumpRunning ? "MOTOR ACTIVE" : "TRIPPED / OFF"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="w-full bg-slate-900 rounded-lg p-2 text-[10px] text-slate-400 font-mono flex justify-between">
                <span>Vibration: 1.8 mm/s</span>
                <span className="text-emerald-400">ISO 10816 Zone A</span>
              </div>
            </div>
          </div>

        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* ROW 3: TIME SERIES TRENDS & RPC BI-DIRECTIONAL CONTROLS                  */}
        {/* ----------------------------------------------------------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          
          {/* Multi-Pen Real-time Timeseries Trend Chart (2 columns) */}
          <div className="lg:col-span-2 bg-[#0c1426] border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-white">
                  Multi-Pen Process Trend Recorder (Timeseries)
                </h3>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-mono">
                <span className="flex items-center gap-1 text-cyan-400"><span className="w-2 h-2 rounded-full bg-cyan-400"></span> Temp (°C)</span>
                <span className="flex items-center gap-1 text-rose-400"><span className="w-2 h-2 rounded-full bg-rose-400"></span> Press (kPa)</span>
                <span className="flex items-center gap-1 text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> Flow (m³/h)</span>
              </div>
            </div>

            {/* SVG Trendline Chart */}
            <div className="relative w-full h-56 bg-[#040814] rounded-xl border border-slate-800/80 p-2 flex items-center justify-center">
              <svg viewBox="0 0 600 200" className="w-full h-full">
                {/* Horizontal Grid lines */}
                <line x1="0" y1="40" x2="600" y2="40" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                <line x1="0" y1="80" x2="600" y2="80" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                <line x1="0" y1="120" x2="600" y2="120" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                <line x1="0" y1="160" x2="600" y2="160" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />

                {/* Temp Line (Cyan) */}
                {(() => {
                  const points = trendBuffer.map((b, i) => {
                    const x = (i / (trendBuffer.length - 1 || 1)) * 580 + 10;
                    const y = 170 - ((b.temp - 50) / 250) * 140;
                    return `${x},${y}`;
                  }).join(' ');
                  return <polyline points={points} fill="none" stroke="#38bdf8" strokeWidth="2.5" />;
                })()}

                {/* Pressure Line (Rose) */}
                {(() => {
                  const points = trendBuffer.map((b, i) => {
                    const x = (i / (trendBuffer.length - 1 || 1)) * 580 + 10;
                    const y = 170 - ((b.press - 50) / 300) * 140;
                    return `${x},${y}`;
                  }).join(' ');
                  return <polyline points={points} fill="none" stroke="#fb7185" strokeWidth="2" strokeDasharray="3 2" />;
                })()}

                {/* Flow Line (Emerald) */}
                {(() => {
                  const points = trendBuffer.map((b, i) => {
                    const x = (i / (trendBuffer.length - 1 || 1)) * 580 + 10;
                    const y = 170 - ((b.flow - 200) / 600) * 140;
                    return `${x},${y}`;
                  }).join(' ');
                  return <polyline points={points} fill="none" stroke="#34d399" strokeWidth="2" />;
                })()}
              </svg>
            </div>
          </div>

          {/* ThingsBoard Two-Way RPC Controls (1 column) */}
          <div className="bg-[#0c1426] border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold text-white">
                  ThingsBoard Bidirectional Controls (RPC)
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400">ONLINE</span>
            </div>

            <div className="space-y-4">
              {/* RPC Control 1: Motor Pump Power Switch */}
              <div className="bg-[#070b16] border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">Pump Run Command</div>
                  <div className="text-[10px] text-slate-400 font-mono">Method: togglePump</div>
                </div>
                <button
                  onClick={() => handleExecuteRpc('togglePump', {})}
                  disabled={rpcLoadingMethod === 'togglePump'}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                    isPumpRunning
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30'
                  }`}
                >
                  <Power className="w-3 h-3" />
                  <span>{rpcLoadingMethod === 'togglePump' ? 'Disptaching...' : isPumpRunning ? 'Stop Pump' : 'Start Pump'}</span>
                </button>
              </div>

              {/* RPC Control 2: Temperature Setpoint Rotary Knob */}
              <div className="bg-[#070b16] border border-slate-800 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-white">TIC Setpoint Adjuster</div>
                  <span className="text-xs font-black font-mono text-cyan-400">
                    {telemetry[activeAsset.tags.tempSet] || 178.5} °C
                  </span>
                </div>
                <input
                  type="range"
                  min="80"
                  max="260"
                  value={telemetry[activeAsset.tags.tempSet] || 178.5}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setTelemetry(prev => ({ ...prev, [activeAsset.tags.tempSet]: val }));
                  }}
                  onMouseUp={(e) => handleExecuteRpc('setPoint', { tag: activeAsset.tags.tempSet, value: Number(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>80 °C</span>
                  <span>Method: setPoint</span>
                  <span>260 °C</span>
                </div>
              </div>

              {/* RPC Control 3: Flow Valve Actuator Positioner */}
              <div className="bg-[#070b16] border border-slate-800 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-white">FCV Valve Positioner</div>
                  <span className="text-xs font-black font-mono text-emerald-400">
                    {telemetry[activeAsset.tags.flowSet] || 58.2}% OP
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={telemetry[activeAsset.tags.flowSet] || 58.2}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setTelemetry(prev => ({ ...prev, [activeAsset.tags.flowSet]: val }));
                  }}
                  onMouseUp={(e) => handleExecuteRpc('setActuator', { tag: activeAsset.tags.flowSet, value: Number(e.target.value) })}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>0% (Closed)</span>
                  <span>Method: setActuator</span>
                  <span>100% (Full Open)</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* ROW 4: REAL-TIME ISA-18.2 PROCESS ALARMS TABLE FOR THIS ASSET             */}
        {/* ----------------------------------------------------------------------- */}
        <div className="bg-[#0c1426] border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <h3 className="text-xs font-bold text-white">
                Active ISA-18.2 Process Alarms • {activeAsset.name} ({assetAlarms.length})
              </h3>
            </div>
            <button
              onClick={refreshState}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh</span>
            </button>
          </div>

          {assetAlarms.length === 0 ? (
            <div className="py-6 text-center text-slate-500 text-xs">
              <ShieldCheck className="w-6 h-6 mx-auto mb-1 text-emerald-500/60" />
              No active unacknowledged process alarms for this asset. Operating within safe bounds.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800">
                    <th className="py-2 px-3">Severity</th>
                    <th className="py-2 px-3">Alarm Description</th>
                    <th className="py-2 px-3">State</th>
                    <th className="py-2 px-3">Signal Tag</th>
                    <th className="py-2 px-3">Current / Threshold</th>
                    <th className="py-2 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {assetAlarms.map(a => (
                    <tr key={a.id} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          a.priority === 'Urgent' ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                          a.priority === 'High' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                          'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}>
                          {a.priority} ({a.severity})
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-white">{a.alarm_name}</td>
                      <td className="py-2.5 px-3">
                        <span className="text-[10px] font-mono text-amber-400">{a.state}</span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-cyan-400">{a.tag_name}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">
                        {a.current_value} / {a.threshold_limit}
                      </td>
                      <td className="py-2.5 px-3 text-right space-x-2">
                        {a.state.includes('Unacknowledged') && (
                          <button
                            onClick={() => acknowledgeAlarm(a.id)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold rounded"
                          >
                            Acknowledge
                          </button>
                        )}
                        <button
                          onClick={() => clearAlarm(a.id)}
                          className="px-2.5 py-1 bg-emerald-800/60 hover:bg-emerald-700 text-emerald-200 text-[10px] font-bold rounded"
                        >
                          Clear (RTN)
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
