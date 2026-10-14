import React, { useState, useEffect, useRef } from 'react';
import {
  Home, GitFork, Users, FolderTree, Cpu, Radio, Layers,
  LayoutDashboard, Box, AlertTriangle, History, Settings,
  Globe, Search, Bell, Maximize2, Minimize2, CheckCircle2,
  AlertCircle, ChevronRight, Play, Terminal, ArrowRight,
  ExternalLink, Sparkles, RefreshCw, Plus, X, Power,
  Thermometer, Droplets, Gauge, BarChart3, Clock, Database,
  Sliders, Waves, Wind, RotateCw, Activity, ShieldCheck,
  Check, Info, FileText, ChevronDown, ListFilter, Share2,
  Network, Key, ArrowUpRight
} from 'lucide-react';
import * as echarts from 'echarts';

// Import Authentic Reverse-Engineered SCADA Swimming Pool View
import ThingsBoardSwimmingPoolView from '../di/scada/ThingsBoardSwimmingPoolView';
import ScadaSymbolLibrary from '../di/scada/ScadaSymbolLibrary';

export default function ThingsBoardHub({ onNavigateToDI, onNavigateToDM }) {
  // Navigation State: 'home' | 'ruleChains' | 'customers' | 'assets' | 'devices' | 'deviceProfiles' | 'assetProfiles' | 'dashboards' | 'scada-symbols' | 'widgets-bundles' | 'alarms' | 'auditLogs' | 'settings'
  const [activeNav, setActiveNav] = useState('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  // Platform Overview State
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  // Entities & Relations State
  const [entities, setEntities] = useState({ tenants: [], customers: [], assets: [], devices: [] });
  const [relations, setRelations] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null); // For Device Details Slide-over Drawer
  const [deviceDrawerTab, setDeviceDrawerTab] = useState('attributes'); // 'details' | 'attributes' | 'telemetry' | 'alarms' | 'rpc' | 'relations'

  // Scoped Attributes State
  const [scopedAttributes, setScopedAttributes] = useState({ client: {}, server: {}, shared: {} });
  const [editingSharedKey, setEditingSharedKey] = useState(null);
  const [editingSharedVal, setEditingSharedVal] = useState('');

  // Timeseries Telemetry Chart State
  const [tsKey, setTsKey] = useState('TIC_101.PV');
  const [tsAgg, setTsAgg] = useState('AVG');
  const chartRef = useRef(null);
  const echartsInstance = useRef(null);

  // Rule Engine Simulation State
  const [ruleChains, setRuleChains] = useState([]);
  const [selectedChainId, setSelectedChainId] = useState('rc-root-01');
  const [simTemp, setSimTemp] = useState(94.6);
  const [simPressure, setSimPressure] = useState(278.2);
  const [simVibration, setSimVibration] = useState(5.4);
  const [simResult, setSimResult] = useState(null);
  const [simulating, setSimulating] = useState(false);

  // Alarms State
  const [alarms, setAlarms] = useState([]);
  const [alarmFilterStatus, setAlarmFilterStatus] = useState('ALL');
  const [alarmFilterSeverity, setAlarmFilterSeverity] = useState('ALL');

  // RPC Console State
  const [rpcLogs, setRpcLogs] = useState([]);
  const [rpcExecuting, setRpcExecuting] = useState(false);

  // Device Profiles State
  const [deviceProfiles, setDeviceProfiles] = useState([]);
  const [assetProfiles, setAssetProfiles] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);

  // Dashboards State
  const [activeDashboardId, setActiveDashboardId] = useState(null); // null (list) | 'swimming-pool' | 'cdu-process'

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditFilter, setAuditFilter] = useState('');

  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Initial Data Ingestion
  useEffect(() => {
    fetchOverview();
    fetchEntitiesAndRelations();
    fetchRuleChains();
    fetchAlarms();
    fetchDeviceProfiles();
    fetchAssetProfiles();
    fetchAuditLogs();

    const interval = setInterval(() => {
      fetchOverview();
      fetchAlarms();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchOverview = async () => {
    try {
      const res = await fetch('/api/v1/tb/overview');
      if (res.ok) setOverview(await res.json());
    } catch (e) {} finally { setLoading(false); }
  };

  const fetchEntitiesAndRelations = async () => {
    try {
      const [entRes, relRes] = await Promise.all([
        fetch('/api/v1/tb/entities'),
        fetch('/api/v1/tb/relations')
      ]);
      if (entRes.ok) setEntities(await entRes.json());
      if (relRes.ok) setRelations(await relRes.json());
    } catch (e) {}
  };

  const fetchRuleChains = async () => {
    try {
      const res = await fetch('/api/v1/tb/ruleChains');
      if (res.ok) setRuleChains(await res.json());
    } catch (e) {}
  };

  const fetchAlarms = async () => {
    try {
      const res = await fetch('/api/v1/tb/alarms');
      if (res.ok) setAlarms(await res.json());
    } catch (e) {}
  };

  const fetchDeviceProfiles = async () => {
    try {
      const res = await fetch('/api/v1/tb/deviceProfiles');
      if (res.ok) setDeviceProfiles(await res.json());
    } catch (e) {}
  };

  const fetchAssetProfiles = async () => {
    try {
      const res = await fetch('/api/v1/tb/assetProfiles');
      if (res.ok) setAssetProfiles(await res.json());
    } catch (e) {}
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/v1/tb/audit/logs');
      if (res.ok) setAuditLogs(await res.json());
    } catch (e) {}
  };

  // 2. Fetch Scoped Attributes when a device is inspected
  useEffect(() => {
    if (!selectedDevice) return;
    const fetchAttrs = async () => {
      try {
        const res = await fetch(`/api/plugins/telemetry/DEVICE/${selectedDevice.id}/values/attributes`);
        if (res.ok) setScopedAttributes(await res.json());
      } catch (e) {}
    };
    fetchAttrs();
  }, [selectedDevice]);

  // 3. Render ECharts for Home / Telemetry view
  useEffect(() => {
    if (activeNav !== 'home' && activeNav !== 'telemetry') return;
    const fetchTs = async () => {
      try {
        const res = await fetch(`/api/plugins/telemetry/DEVICE/dev-cdu-01/values/timeseries?keys=${tsKey}&agg=${tsAgg}&limit=40`);
        if (res.ok) {
          const data = await res.json();
          const pts = data[tsKey] || [];
          renderChart(pts, tsKey, tsAgg);
        }
      } catch (e) {}
    };
    fetchTs();
    const timer = setInterval(fetchTs, 4000);
    return () => clearInterval(timer);
  }, [activeNav, tsKey, tsAgg]);

  const renderChart = (points, keyName, aggName) => {
    if (!chartRef.current) return;
    if (!echartsInstance.current) {
      echartsInstance.current = echarts.init(chartRef.current);
    }
    const timestamps = points.map(p => new Date(p.ts).toLocaleTimeString());
    const values = points.map(p => p.value);

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#0f172a',
        borderColor: '#38bdf8',
        textStyle: { color: '#f8fafc', fontSize: 11 }
      },
      grid: { left: '3%', right: '3%', top: '10%', bottom: '8%', containLabel: true },
      xAxis: {
        type: 'category',
        data: timestamps,
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#94a3b8', fontSize: 9 }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#1e293b' } },
        axisLabel: { color: '#94a3b8', fontSize: 9 }
      },
      series: [
        {
          name: `${keyName} (${aggName})`,
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: values,
          lineStyle: { width: 2, color: '#06b6d4' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(6, 182, 212, 0.35)' },
              { offset: 1, color: 'rgba(6, 182, 212, 0.0)' }
            ])
          }
        }
      ]
    };
    echartsInstance.current.setOption(option);
  };

  // Alarm Actions (ACK & CLEAR)
  const handleAckAlarm = async (alarmId) => {
    try {
      const res = await fetch(`/api/v1/tb/alarm/${alarmId}/ack`, { method: 'POST' });
      if (res.ok) {
        showToast(`Alarm ${alarmId} acknowledged`, 'success');
        fetchAlarms();
        fetchOverview();
      }
    } catch (e) {
      showToast('Failed to acknowledge alarm', 'error');
    }
  };

  const handleClearAlarm = async (alarmId) => {
    try {
      const res = await fetch(`/api/v1/tb/alarm/${alarmId}/clear`, { method: 'POST' });
      if (res.ok) {
        showToast(`Alarm ${alarmId} cleared`, 'success');
        fetchAlarms();
        fetchOverview();
      }
    } catch (e) {
      showToast('Failed to clear alarm', 'error');
    }
  };

  // Two-Way RPC Dispatch
  const handleDispatchRpc = async (deviceId, method, params) => {
    setRpcExecuting(true);
    try {
      const res = await fetch(`/api/plugins/telemetry/DEVICE/${deviceId}/rpc/twoway`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, params, timeout: 5000 })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`RPC '${method}' executed in ${data.latency_ms}ms`, 'success');
        setRpcLogs(prev => [data, ...prev.slice(0, 19)]);
        fetchOverview();
      } else {
        showToast(`RPC Failed: ${data.detail || 'Error'}`, 'error');
      }
    } catch (e) {
      showToast(`RPC Network error: ${e.message}`, 'error');
    } finally {
      setRpcExecuting(false);
    }
  };

  // Rule Engine Simulation
  const handleRunSimulation = async () => {
    setSimulating(true);
    try {
      const payload = {
        chain_id: selectedChainId,
        message: {
          temperature: simTemp,
          pressure: simPressure,
          vibration: simVibration
        }
      };
      const res = await fetch('/api/v1/tb/ruleEngine/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        setSimResult(data);
        showToast(`Simulation complete (${data.total_nodes_traversed} nodes, ${data.total_latency_ms}ms)`, 'success');
      }
    } catch (e) {
      showToast('Simulation error', 'error');
    } finally {
      setSimulating(false);
    }
  };

  // Save Shared Attribute Downlink
  const handleSaveSharedAttr = async (deviceId, key, val) => {
    try {
      const payload = { [key]: isNaN(Number(val)) ? val : Number(val) };
      const res = await fetch(`/api/plugins/telemetry/DEVICE/${deviceId}/attributes/SHARED_SCOPE`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast(`Downlink updated: ${key} = ${val}`);
        setScopedAttributes(prev => ({
          ...prev,
          shared: { ...prev.shared, [key]: payload[key] }
        }));
        setEditingSharedKey(null);
      }
    } catch (e) {
      showToast('Failed to update shared attribute', 'error');
    }
  };

  // ThingsBoard Cloud Navigation Sections
  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'ruleChains', label: 'Rule Chains', icon: GitFork, badge: ruleChains.length },
    { id: 'customers', label: 'Customers', icon: Users, badge: entities.customers.length },
    { id: 'assets', label: 'Assets', icon: FolderTree, badge: entities.assets.length },
    { id: 'devices', label: 'Devices', icon: Cpu, badge: entities.devices.length },
    { id: 'deviceProfiles', label: 'Device Profiles', icon: Radio, badge: deviceProfiles.length },
    { id: 'assetProfiles', label: 'Asset Profiles', icon: Layers, badge: 2 },
    { id: 'dashboards', label: 'Dashboards', icon: LayoutDashboard, badge: 'SCADA' },
    { id: 'scada-symbols', label: 'SCADA Symbols', icon: Gauge, badge: 'SVG' },
    { id: 'widgets-bundles', label: 'Widgets Library', icon: Box, badge: '6 Bundles' },
    { id: 'alarms', label: 'Alarms', icon: AlertTriangle, badge: alarms.filter(a => a.status.startsWith('ACTIVE')).length, badgeColor: 'bg-red-500/20 text-red-400 border border-red-500/30' },
    { id: 'auditLogs', label: 'Audit Logs', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0b1120] text-slate-100 font-sans select-none">
      {/* Toast Alert */}
      {toastMessage && (
        <div className={`fixed top-14 right-6 z-50 px-4 py-2.5 rounded-lg border shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2 ${
          toastMessage.type === 'error'
            ? 'bg-red-950/90 text-red-200 border-red-700'
            : 'bg-emerald-950/90 text-emerald-200 border-emerald-700'
        }`}>
          {toastMessage.type === 'error' ? <AlertCircle className="w-4 h-4 text-red-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* =================================================================== */}
      {/* 1. AUTHENTIC THINGSBOARD CLOUD SIDEBAR                              */}
      {/* =================================================================== */}
      <aside className={`transition-all duration-200 flex flex-col shrink-0 bg-[#070c18] border-r border-slate-800/80 ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      }`}>
        {/* Brand Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-slate-800/80">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-2.5">
              {/* ThingsBoard Official Brand Mark */}
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-900/30">
                <Box className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <div className="text-sm font-extrabold tracking-wide text-white flex items-center gap-1.5">
                  <span>ThingsBoard</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
                    Cloud
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium truncate max-w-[140px]">
                  Yokogawa OpreX DBM
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-auto w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center">
              <Box className="w-4 h-4 text-white" />
            </div>
          )}

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${sidebarCollapsed ? '' : 'rotate-180'}`} />
          </button>
        </div>

        {/* Sidebar Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1 text-xs">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveNav(item.id);
                  setActiveDashboardId(null);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/70 shadow-sm font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    {item.badge !== undefined && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                        item.badgeColor || (isActive ? 'bg-cyan-900/60 text-cyan-200' : 'bg-slate-800 text-slate-400')
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Module Jumpers */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 text-xs">
          {!sidebarCollapsed ? (
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">
                Yokogawa Industrial Modules
              </div>
              {onNavigateToDI && (
                <button
                  onClick={() => onNavigateToDI('dashboards')}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>DI Dashboards</span>
                  </span>
                  <ExternalLink className="w-3 h-3 text-slate-500" />
                </button>
              )}
              {onNavigateToDM && (
                <button
                  onClick={() => onNavigateToDM('devices')}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Cpu className="w-3.5 h-3.5 text-blue-400" />
                    <span>DM Device Manager</span>
                  </span>
                  <ExternalLink className="w-3 h-3 text-slate-500" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button onClick={() => onNavigateToDI && onNavigateToDI('dashboards')} title="DI Dashboards">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
              </button>
              <button onClick={() => onNavigateToDM && onNavigateToDM('devices')} title="DM Device Manager">
                <Cpu className="w-4 h-4 text-blue-400" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* =================================================================== */}
      {/* 2. MAIN VIEWPORT & TOP APP BAR                                      */}
      {/* =================================================================== */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        {/* Top App Bar Header */}
        <header className="h-14 px-6 bg-[#090f1d] border-b border-slate-800 flex items-center justify-between shrink-0">
          {/* Left: Global Search & Active Context */}
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <div className="relative w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search devices, assets, alarms..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Active Tenant / Complex Selector */}
            <div className="hidden lg:flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">Tenant:</span>
              <span className="font-semibold text-cyan-300 bg-slate-900 px-2 py-1 rounded border border-slate-800 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <span>Yokogawa Chemical Industries Co., Ltd.</span>
              </span>
            </div>
          </div>

          {/* Right: Live Stream Pill, Alarms Bell, User Profile */}
          <div className="flex items-center gap-3">
            {/* Live Telemetry Stream Indicator */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-800 text-[11px] text-emerald-300 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Telemetry Live (1000ms)</span>
            </div>

            {/* Alarms Bell with Unread Badge */}
            <button
              onClick={() => setActiveNav('alarms')}
              className="relative p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
              title="View Active Alarms"
            >
              <Bell className="w-4 h-4 text-slate-300" />
              {alarms.filter(a => a.status.startsWith('ACTIVE')).length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white font-bold text-[9px] flex items-center justify-center">
                  {alarms.filter(a => a.status.startsWith('ACTIVE')).length}
                </span>
              )}
            </button>

            {/* User Profile */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 font-bold text-white text-xs flex items-center justify-center">
                YA
              </div>
              <div className="hidden sm:block text-left text-xs">
                <div className="font-bold text-slate-200">Tenant Admin</div>
                <div className="text-[10px] text-slate-400">admin@yokogawa.com</div>
              </div>
            </div>
          </div>
        </header>

        {/* ================================================================= */}
        {/* 3. CONTENT AREA FOR ALL SECTIONS                                  */}
        {/* ================================================================= */}
        <main className="flex-1 flex min-h-0 overflow-hidden relative">

          {/* ------------------------------------------------------------- */}
          {/* TAB 1: HOME (MATCHES https://thingsboard.cloud/home)          */}
          {/* ------------------------------------------------------------- */}
          {activeNav === 'home' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Quick Actions Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                  onClick={() => setActiveNav('devices')}
                  className="p-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 text-left transition-all group flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-200 group-hover:text-cyan-300">Connect Device</div>
                      <div className="text-[10px] text-slate-400">Add sensor / PLC twin</div>
                    </div>
                  </div>
                  <Plus className="w-4 h-4 text-slate-500 group-hover:text-cyan-400" />
                </button>

                <button
                  onClick={() => setActiveNav('assets')}
                  className="p-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 text-left transition-all group flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-950 text-blue-400 border border-blue-800 flex items-center justify-center">
                      <FolderTree className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-200 group-hover:text-blue-300">Create Asset</div>
                      <div className="text-[10px] text-slate-400">Unit / line hierarchy</div>
                    </div>
                  </div>
                  <Plus className="w-4 h-4 text-slate-500 group-hover:text-blue-400" />
                </button>

                <button
                  onClick={() => setActiveNav('ruleChains')}
                  className="p-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 text-left transition-all group flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-purple-950 text-purple-400 border border-purple-800 flex items-center justify-center">
                      <GitFork className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-200 group-hover:text-purple-300">Rule Chains</div>
                      <div className="text-[10px] text-slate-400">Automation DAG pipeline</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400" />
                </button>

                <button
                  onClick={() => {
                    setActiveNav('dashboards');
                    setActiveDashboardId('swimming-pool');
                  }}
                  className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/80 to-blue-950/80 hover:from-cyan-900/90 hover:to-blue-900/90 border border-cyan-800 text-left transition-all group flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-cyan-600 text-white flex items-center justify-center shadow-md shadow-cyan-900/40">
                      <Waves className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-cyan-200">Launch Pool SCADA</div>
                      <div className="text-[10px] text-cyan-400/80">3D fluid mimic diagram</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-cyan-400" />
                </button>
              </div>

              {/* Entity Statistics Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Devices KPI */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span>Devices Connectivity</span>
                      <Cpu className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="text-2xl font-extrabold text-slate-100">
                      {overview?.devices?.total || 12} Total
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5 text-xs">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-emerald-400 font-semibold">Online: {overview?.devices?.connected || 11}</span>
                      <span className="text-amber-400 font-semibold">Warning: {overview?.devices?.warning || 1}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden flex">
                      <div className="h-full bg-emerald-500" style={{ width: '92%' }} />
                      <div className="h-full bg-amber-500" style={{ width: '8%' }} />
                    </div>
                  </div>
                </div>

                {/* Assets KPI */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span>Industrial Assets</span>
                      <FolderTree className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="text-2xl font-extrabold text-slate-100">
                      {overview?.assets?.total || 4} Process Units
                    </div>
                  </div>
                  <div className="mt-3 text-[11px] text-slate-400">
                    C-101 Distillation, Preheat Train, Utility Loop
                  </div>
                </div>

                {/* ISA-18.2 Alarms KPI */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span>Active Alarms (ISA-18.2)</span>
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    </div>
                    <div className="text-2xl font-extrabold text-red-400">
                      {alarms.filter(a => a.status.startsWith('ACTIVE')).length} Active
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-[10px] font-bold">
                    <span className="px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800">
                      1 Critical
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                      1 Major
                    </span>
                  </div>
                </div>

                {/* Transport & Rule Engine KPI */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span>Automation Pipelines</span>
                      <GitFork className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="text-2xl font-extrabold text-purple-300">
                      {overview?.ruleChains?.active || 3} Rule Chains
                    </div>
                  </div>
                  <div className="mt-3 text-[11px] text-slate-400">
                    Transports: MQTT • OPC UA • Modbus
                  </div>
                </div>
              </div>

              {/* Two-Column Operational Core */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left 7 Columns: Active Alarms & Process Telemetry Radar */}
                <div className="lg:col-span-7 space-y-6">
                  {/* Real-Time Alarms Radar */}
                  <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        <span className="text-xs font-bold text-slate-200">Active Industrial Alarms</span>
                      </div>
                      <button
                        onClick={() => setActiveNav('alarms')}
                        className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
                      >
                        <span>View All Alarms</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="rounded-lg border border-slate-800/80 overflow-hidden bg-slate-950/60">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                          <tr>
                            <th className="py-2.5 px-3">Type</th>
                            <th className="py-2.5 px-3">Severity</th>
                            <th className="py-2.5 px-3">State</th>
                            <th className="py-2.5 px-3">Details</th>
                            <th className="py-2.5 px-3 text-right">Quick Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-[11px]">
                          {alarms.slice(0, 4).map(al => (
                            <tr key={al.id} className="hover:bg-slate-800/30">
                              <td className="py-2 px-3 font-semibold text-slate-200">{al.type}</td>
                              <td className="py-2 px-3">
                                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                  al.severity === 'CRITICAL' ? 'bg-red-950 text-red-300 border border-red-800' :
                                  al.severity === 'MAJOR' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                                  'bg-blue-950 text-blue-300 border border-blue-800'
                                }`}>
                                  {al.severity}
                                </span>
                              </td>
                              <td className="py-2 px-3 font-mono text-[10px] text-slate-300">{al.status}</td>
                              <td className="py-2 px-3 text-slate-400 truncate max-w-[150px]">
                                {al.details?.cause || `${al.details?.tag}: ${al.details?.currentValue}`}
                              </td>
                              <td className="py-2 px-3 text-right space-x-1">
                                {!al.status.endsWith('ACK') && (
                                  <button
                                    onClick={() => handleAckAlarm(al.id)}
                                    className="px-2 py-0.5 rounded bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800 text-[10px] font-bold"
                                  >
                                    ACK
                                  </button>
                                )}
                                {!al.status.startsWith('CLEARED') && (
                                  <button
                                    onClick={() => handleClearAlarm(al.id)}
                                    className="px-2 py-0.5 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 text-[10px] font-bold"
                                  >
                                    CLEAR
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Process Telemetry Quick Monitor */}
                  <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs font-bold text-slate-200">Process Telemetry Monitor (DCS C-101)</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <select
                          value={tsKey}
                          onChange={e => setTsKey(e.target.value)}
                          className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono"
                        >
                          <option value="TIC_101.PV">TIC_101.PV (Reboiler °C)</option>
                          <option value="PIC_101.PV">PIC_101.PV (Column kPa)</option>
                          <option value="FIC_101.PV">FIC_101.PV (Feed m³/h)</option>
                          <option value="LIC_101.PV">LIC_101.PV (Level %)</option>
                        </select>
                        <span className="text-[10px] font-mono text-cyan-400 font-bold bg-slate-950 px-2 py-1 rounded border border-slate-800">
                          {tsAgg}
                        </span>
                      </div>
                    </div>

                    <div className="h-56 rounded-lg bg-slate-950 border border-slate-800/80 p-2">
                      <div ref={chartRef} className="w-full h-full" />
                    </div>
                  </div>
                </div>

                {/* Right 5 Columns: Featured Dashboards & Quick RPC Control */}
                <div className="lg:col-span-5 space-y-6">
                  {/* Featured Dashboard Card 1: Swimming Pool SCADA */}
                  <div className="p-5 rounded-xl bg-gradient-to-br from-[#0c182d] via-slate-900 to-[#0c182d] border border-cyan-800/80 shadow-lg shadow-cyan-950/40 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-cyan-600 flex items-center justify-center text-white font-bold">
                          <Waves className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-extrabold text-cyan-200">Swimming Pool SCADA (Hi-Perf)</div>
                          <div className="text-[10px] text-cyan-400/80">Traditional & High-Performance Modes</div>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                        LIVE MIMIC
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      Reverse-engineered from ThingsBoard Cloud. Interactive P&amp;ID with 9 valves, dual pumps, sand filter, heat pump, and realtime trend popups.
                    </p>

                    <button
                      onClick={() => {
                        setActiveNav('dashboards');
                        setActiveDashboardId('swimming-pool');
                      }}
                      className="w-full py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-cyan-900/30 transition-all"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>Open Interactive SCADA Mimic</span>
                    </button>
                  </div>

                  {/* Two-Way Remote RPC Station */}
                  <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-bold text-slate-200">Two-Way RPC Command Station</span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400">dev-cdu-01</span>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      {/* Setpoint bump */}
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-200">Tower Pressure Setpoint</div>
                          <div className="text-[10px] text-slate-400 font-mono">Current: 82.5 kPa</div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleDispatchRpc('dev-cdu-01', 'setOperationalSetpoint', { setpoint: 80.0, unit: 'kPa' })}
                            disabled={rpcExecuting}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-bold"
                          >
                            80 kPa
                          </button>
                          <button
                            onClick={() => handleDispatchRpc('dev-cdu-01', 'setOperationalSetpoint', { setpoint: 85.0, unit: 'kPa' })}
                            disabled={rpcExecuting}
                            className="px-2 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold"
                          >
                            85 kPa
                          </button>
                        </div>
                      </div>

                      {/* Motor toggle */}
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-200">Charge Pump P-101A</div>
                          <div className="text-[10px] text-slate-400">Power switch toggle</div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleDispatchRpc('dev-cdu-01', 'togglePump', { running: true })}
                            disabled={rpcExecuting}
                            className="px-2.5 py-1 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 text-[10px] font-bold"
                          >
                            START
                          </button>
                          <button
                            onClick={() => handleDispatchRpc('dev-cdu-01', 'togglePump', { running: false })}
                            disabled={rpcExecuting}
                            className="px-2.5 py-1 rounded bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 text-[10px] font-bold"
                          >
                            STOP
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Audit Feed */}
                  <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                    <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                      <span>Recent Platform Activity</span>
                      <History className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <div className="space-y-1.5 text-[11px] font-mono">
                      {auditLogs.slice(0, 3).map((l, idx) => (
                        <div key={idx} className="p-1.5 rounded bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                          <span className="text-cyan-300 truncate max-w-[160px]">{l.action}</span>
                          <span className="text-emerald-400 font-bold">{l.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB 2: DASHBOARDS (INCLUDES SWIMMING POOL SCADA & DCS)        */}
          {/* ------------------------------------------------------------- */}
          {activeNav === 'dashboards' && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {activeDashboardId === 'swimming-pool' ? (
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
                  {/* Top Bar for Swimming Pool SCADA */}
                  <div className="h-10 px-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs shrink-0">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActiveDashboardId(null)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1"
                      >
                        <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                        <span>All Dashboards</span>
                      </button>
                      <span className="text-slate-500">/</span>
                      <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                        <Waves className="w-4 h-4 text-cyan-400" />
                        <span>Swimming pool scada system (Hi-Perf)</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span className="font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        Origin: thingsboard.cloud/dashboard/231a5800-ce96-11ef-852e-bd51c2b30fde
                      </span>
                    </div>
                  </div>

                  {/* Render the Authentic Reverse Engineered Swimming Pool SCADA View */}
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <ThingsBoardSwimmingPoolView />
                  </div>
                </div>
              ) : (
                <div className="flex-1 p-6 overflow-y-auto space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                      <LayoutDashboard className="w-5 h-5 text-cyan-400" />
                      <span>Operational Dashboards Catalog</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Launch high-fidelity SCADA process mimics, multi-state industrial canvases, and real-time plant telemetry views.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {/* Dashboard 1: Swimming Pool SCADA */}
                    <div className="p-5 rounded-xl bg-slate-900 border border-cyan-800/80 shadow-md flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                            SCADA MIMIC
                          </span>
                          <span className="text-xs text-emerald-400 font-bold">● Active</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-100">Swimming pool scada system (Hi-Perf)</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Authentic ThingsBoard SCADA process diagram featuring 3D animated piping, dual motor pumps, sand filter backwash cycles, heat pump exchangers, and equipment popups.
                        </p>
                      </div>

                      <button
                        onClick={() => setActiveDashboardId('swimming-pool')}
                        className="w-full py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Launch SCADA System</span>
                      </button>
                    </div>

                    {/* Dashboard 2: Yokogawa CDU Process */}
                    <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-blue-950 text-blue-300 border border-blue-800">
                            REFINERY UNIT
                          </span>
                          <span className="text-xs text-emerald-400 font-bold">● Streaming</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-100">Yokogawa Distillation Column C-101</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          CENTUM VP DCS process monitoring with fractionator column temperature trays, top pressure control loop, reflux accumulator, and reboiler steam duty.
                        </p>
                      </div>

                      <button
                        onClick={() => onNavigateToDI && onNavigateToDI('dashboards')}
                        className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open in DI Canvas</span>
                      </button>
                    </div>

                    {/* Dashboard 3: Asset Digital Twin */}
                    <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-purple-950 text-purple-300 border border-purple-800">
                            DIGITAL TWIN
                          </span>
                          <span className="text-xs text-emerald-400 font-bold">● Synchronized</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-100">Centrifugal Feed Pump P-101A Twin</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Mechanical health diagnostics, Mahalanobis-Taguchi multivariate anomaly distance radar, bearing temperature sensors, and vibration spectrum.
                        </p>
                      </div>

                      <button
                        onClick={() => onNavigateToDI && onNavigateToDI('assets')}
                        className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Asset Twin Console</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB 3: DEVICES TABLE & SLIDE-OVER DETAILS DRAWER              */}
          {/* ------------------------------------------------------------- */}
          {activeNav === 'devices' && (
            <div className="flex-1 flex min-h-0 overflow-hidden relative">
              {/* Devices Table Area */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                      <Cpu className="w-5 h-5 text-cyan-400" />
                      <span>Connected Equipment &amp; Devices</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      ThingsBoard Device Management directory with 3-scope KvEntry attributes, live telemetry, and Two-Way RPC.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400">Total: {entities.devices.length} Devices</span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 text-[11px] uppercase border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Name</th>
                        <th className="py-3 px-4">Device Profile</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Asset Binding</th>
                        <th className="py-3 px-4 text-right">Inspect Device</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-[11px]">
                      {entities.devices.map(d => (
                        <tr
                          key={d.id}
                          className="hover:bg-slate-800/40 cursor-pointer"
                          onClick={() => setSelectedDevice(d)}
                        >
                          <td className="py-3 px-4 font-bold text-slate-200 flex items-center gap-2">
                            <Cpu className="w-4 h-4 text-cyan-400" />
                            <span>{d.name}</span>
                          </td>
                          <td className="py-3 px-4 font-mono text-cyan-300">{d.deviceProfile}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              d.status === 'Connected' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                              'bg-amber-950 text-amber-400 border border-amber-800'
                            }`}>
                              {d.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-400">{d.assetId || 'ast-unit-cdu'}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedDevice(d); }}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-[10px]"
                            >
                              Open Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Slide-Over Device Details Drawer */}
              {selectedDevice && (
                <div className="w-[500px] bg-[#070c18] border-l border-slate-800 flex flex-col min-h-0 z-30 shadow-2xl animate-in slide-in-from-right duration-200">
                  {/* Drawer Header */}
                  <div className="h-14 px-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
                    <div className="flex items-center gap-2.5">
                      <Cpu className="w-5 h-5 text-cyan-400" />
                      <div>
                        <div className="font-bold text-sm text-slate-100">{selectedDevice.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">{selectedDevice.id}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedDevice(null)}
                      className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Drawer Tabs */}
                  <div className="h-9 px-4 bg-slate-900 border-b border-slate-800 flex items-center gap-2 text-xs">
                    {[
                      { id: 'attributes', label: 'Attributes (3-Scope)' },
                      { id: 'telemetry', label: 'Latest Telemetry' },
                      { id: 'rpc', label: 'RPC Faceplate' },
                      { id: 'alarms', label: 'Device Alarms' }
                    ].map(t => (
                      <button
                        key={t.id}
                        onClick={() => setDeviceDrawerTab(t.id)}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                          deviceDrawerTab === t.id
                            ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Drawer Content Body */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
                    {/* Sub-tab 1: Attributes */}
                    {deviceDrawerTab === 'attributes' && (
                      <div className="space-y-4">
                        {/* Scope 1: CLIENT_SCOPE */}
                        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                          <div className="font-bold text-cyan-400 flex items-center justify-between text-[11px]">
                            <span>CLIENT_SCOPE</span>
                            <span className="text-[10px] text-slate-500 font-normal">Reported by firmware</span>
                          </div>
                          {Object.entries(scopedAttributes.client || {}).map(([k, v]) => (
                            <div key={k} className="flex justify-between py-1 border-b border-slate-800/60 font-mono text-[10px]">
                              <span className="text-slate-400">{k}:</span>
                              <span className="text-slate-200 font-bold">{String(v)}</span>
                            </div>
                          ))}
                        </div>

                        {/* Scope 2: SERVER_SCOPE */}
                        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                          <div className="font-bold text-blue-400 flex items-center justify-between text-[11px]">
                            <span>SERVER_SCOPE</span>
                            <span className="text-[10px] text-slate-500 font-normal">Server metadata</span>
                          </div>
                          {Object.entries(scopedAttributes.server || {}).map(([k, v]) => (
                            <div key={k} className="flex justify-between py-1 border-b border-slate-800/60 font-mono text-[10px]">
                              <span className="text-slate-400">{k}:</span>
                              <span className="text-slate-200 font-bold">{String(v)}</span>
                            </div>
                          ))}
                        </div>

                        {/* Scope 3: SHARED_SCOPE (With Downlink Trigger) */}
                        <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-800/40 space-y-2">
                          <div className="font-bold text-emerald-400 flex items-center justify-between text-[11px]">
                            <span>SHARED_SCOPE (Downlink Synced)</span>
                            <span className="text-[10px] text-emerald-300 font-normal">Bidirectional</span>
                          </div>
                          {Object.entries(scopedAttributes.shared || {}).map(([k, v]) => (
                            <div key={k} className="flex items-center justify-between py-1 border-b border-slate-800/60 font-mono text-[10px]">
                              <span className="text-slate-400">{k}:</span>
                              {editingSharedKey === k ? (
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    value={editingSharedVal}
                                    onChange={e => setEditingSharedVal(e.target.value)}
                                    className="w-20 px-1 py-0.5 rounded bg-slate-800 text-emerald-300 border border-emerald-600 text-right font-mono"
                                  />
                                  <button
                                    onClick={() => handleSaveSharedAttr(selectedDevice.id, k, editingSharedVal)}
                                    className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[9px]"
                                  >
                                    Save
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-emerald-300 font-bold">{String(v)}</span>
                                  <button
                                    onClick={() => { setEditingSharedKey(k); setEditingSharedVal(String(v)); }}
                                    className="text-[9px] text-slate-400 hover:text-cyan-300 underline"
                                  >
                                    Edit
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sub-tab 2: Telemetry */}
                    {deviceDrawerTab === 'telemetry' && (
                      <div className="space-y-3 font-mono text-xs">
                        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex justify-between">
                          <span className="text-slate-400">TIC_101.PV (Temperature)</span>
                          <span className="text-cyan-300 font-bold">182.4 °C</span>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex justify-between">
                          <span className="text-slate-400">PIC_101.PV (Pressure)</span>
                          <span className="text-blue-300 font-bold">254.1 kPa</span>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex justify-between">
                          <span className="text-slate-400">FIC_101.PV (Flow Rate)</span>
                          <span className="text-emerald-300 font-bold">52.8 m³/h</span>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex justify-between">
                          <span className="text-slate-400">LIC_101.PV (Column Level)</span>
                          <span className="text-purple-300 font-bold">64.5 %</span>
                        </div>
                      </div>
                    )}

                    {/* Sub-tab 3: RPC Faceplate */}
                    {deviceDrawerTab === 'rpc' && (
                      <div className="space-y-4">
                        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                          <div className="font-bold text-slate-200">Dispatch Two-Way RPC Command</div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDispatchRpc(selectedDevice.id, 'togglePump', { running: true })}
                              className="flex-1 py-1.5 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 font-bold"
                            >
                              START MOTOR
                            </button>
                            <button
                              onClick={() => handleDispatchRpc(selectedDevice.id, 'togglePump', { running: false })}
                              className="flex-1 py-1.5 rounded bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 font-bold"
                            >
                              STOP MOTOR
                            </button>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                          <div className="font-bold text-slate-200">Adjust Operational Setpoint</div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              defaultValue="82.5"
                              id="drawer-sp-input"
                              className="w-24 px-2 py-1 rounded bg-slate-950 text-cyan-300 border border-slate-800 font-mono"
                            />
                            <button
                              onClick={() => {
                                const val = parseFloat(document.getElementById('drawer-sp-input').value);
                                handleDispatchRpc(selectedDevice.id, 'setOperationalSetpoint', { setpoint: val, unit: 'kPa' });
                              }}
                              className="flex-1 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
                            >
                              Dispatch RPC
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Sub-tab 4: Alarms */}
                    {deviceDrawerTab === 'alarms' && (
                      <div className="space-y-2">
                        {alarms.map(a => (
                          <div key={a.id} className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                            <div className="flex justify-between font-bold text-slate-200">
                              <span>{a.type}</span>
                              <span className="text-[10px] text-red-400">{a.severity}</span>
                            </div>
                            <div className="text-[10px] text-slate-400">{a.status}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB: CUSTOMERS DIRECTORY                                      */}
          {/* ------------------------------------------------------------- */}
          {activeNav === 'customers' && (
            <div className="flex-1 flex min-h-0 overflow-hidden relative">
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                      <Users className="w-5 h-5 text-cyan-400" />
                      <span>Customers &amp; Operating Complexes</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Multi-tenant organizational entities holding industrial assets, units, and connected devices.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400">Total: {entities.customers.length} Customers</span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 text-[11px] uppercase border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Customer Title</th>
                        <th className="py-3 px-4">Location</th>
                        <th className="py-3 px-4">Address</th>
                        <th className="py-3 px-4">Contact Email</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Inspect Customer</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-[11px]">
                      {entities.customers.map(c => (
                        <tr
                          key={c.id}
                          className="hover:bg-slate-800/40 cursor-pointer"
                          onClick={() => setSelectedCustomer(c)}
                        >
                          <td className="py-3 px-4 font-bold text-slate-200 flex items-center gap-2">
                            <Users className="w-4 h-4 text-cyan-400" />
                            <span>{c.title}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-300 font-mono">{c.city}, {c.country}</td>
                          <td className="py-3 px-4 text-slate-400 truncate max-w-xs">{c.address}</td>
                          <td className="py-3 px-4 font-mono text-cyan-300">{c.email}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                              {c.status || 'ACTIVE'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedCustomer(c); }}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-[10px]"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Customer Slide-Over Details Drawer */}
              {selectedCustomer && (
                <div className="w-[450px] bg-[#070c18] border-l border-slate-800 flex flex-col min-h-0 z-30 shadow-2xl animate-in slide-in-from-right duration-200">
                  <div className="h-14 px-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
                    <div className="flex items-center gap-2.5">
                      <Users className="w-5 h-5 text-cyan-400" />
                      <div>
                        <div className="font-bold text-sm text-slate-100">{selectedCustomer.title}</div>
                        <div className="text-[10px] font-mono text-slate-400">{selectedCustomer.id}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedCustomer(null)}
                      className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
                      <div className="font-bold text-cyan-400 text-xs">Customer Profile Details</div>
                      <div className="space-y-1.5 font-mono text-[11px]">
                        <div className="flex justify-between py-1 border-b border-slate-800/60">
                          <span className="text-slate-400">Customer ID:</span>
                          <span className="text-slate-200">{selectedCustomer.id}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-800/60">
                          <span className="text-slate-400">Tenant ID:</span>
                          <span className="text-cyan-300">{selectedCustomer.tenantId}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-800/60">
                          <span className="text-slate-400">City / Country:</span>
                          <span className="text-slate-200">{selectedCustomer.city}, {selectedCustomer.country}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-800/60">
                          <span className="text-slate-400">Email Contact:</span>
                          <span className="text-slate-200">{selectedCustomer.email}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200 text-xs">Managed Assets</span>
                        <span className="text-[10px] font-mono text-cyan-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {entities.assets.length} Assets
                        </span>
                      </div>
                      <div className="space-y-2">
                        {entities.assets.map(a => (
                          <div key={a.id} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                            <div>
                              <div className="font-bold text-slate-200">{a.name}</div>
                              <div className="text-[10px] font-mono text-slate-400">{a.type} • {a.id}</div>
                            </div>
                            <button
                              onClick={() => {
                                setSelectedCustomer(null);
                                setSelectedAsset(a);
                                setActiveNav('assets');
                              }}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-bold flex items-center gap-1"
                            >
                              <span>View Asset</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB: ASSETS DIRECTORY                                         */}
          {/* ------------------------------------------------------------- */}
          {activeNav === 'assets' && (
            <div className="flex-1 flex min-h-0 overflow-hidden relative">
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                      <FolderTree className="w-5 h-5 text-blue-400" />
                      <span>Industrial Assets (ISA-95 Hierarchy)</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Production units, process lines, equipment trains, and multi-variable analytical models.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400">Total: {entities.assets.length} Assets</span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 text-[11px] uppercase border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Asset Name</th>
                        <th className="py-3 px-4">Asset Profile / Type</th>
                        <th className="py-3 px-4">Customer Binding</th>
                        <th className="py-3 px-4">Attributes</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-[11px]">
                      {entities.assets.map(a => (
                        <tr
                          key={a.id}
                          className="hover:bg-slate-800/40 cursor-pointer"
                          onClick={() => setSelectedAsset(a)}
                        >
                          <td className="py-3 px-4 font-bold text-slate-200 flex items-center gap-2">
                            <FolderTree className="w-4 h-4 text-blue-400" />
                            <span>{a.name}</span>
                          </td>
                          <td className="py-3 px-4 font-mono text-blue-300">{a.type}</td>
                          <td className="py-3 px-4 font-mono text-slate-400">{a.customerId || 'cust-mizushima-01'}</td>
                          <td className="py-3 px-4 font-mono text-slate-300">{a.attributesCount || 3} KvEntries</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                              Synchronized
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right space-x-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedAsset(a); }}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-[10px]"
                            >
                              Inspect
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); onNavigateToDI && onNavigateToDI('assets'); }}
                              className="px-2 py-1 rounded bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-800 font-bold text-[10px]"
                            >
                              DI Twin
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Asset Slide-Over Details Drawer */}
              {selectedAsset && (
                <div className="w-[480px] bg-[#070c18] border-l border-slate-800 flex flex-col min-h-0 z-30 shadow-2xl animate-in slide-in-from-right duration-200">
                  <div className="h-14 px-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
                    <div className="flex items-center gap-2.5">
                      <FolderTree className="w-5 h-5 text-blue-400" />
                      <div>
                        <div className="font-bold text-sm text-slate-100">{selectedAsset.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">{selectedAsset.id}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedAsset(null)}
                      className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                      <div className="font-bold text-blue-400 text-xs">Asset Hierarchy Specifications</div>
                      <div className="space-y-1.5 font-mono text-[11px]">
                        <div className="flex justify-between py-1 border-b border-slate-800/60">
                          <span className="text-slate-400">Asset Type:</span>
                          <span className="text-slate-200 font-bold">{selectedAsset.type}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-800/60">
                          <span className="text-slate-400">ISA-95 Level:</span>
                          <span className="text-cyan-300 font-bold">Level 3 (Process Area / Unit)</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-800/60">
                          <span className="text-slate-400">Customer:</span>
                          <span className="text-slate-200">{selectedAsset.customerId || 'cust-mizushima-01'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-800/60">
                          <span className="text-slate-400">Description:</span>
                          <span className="text-slate-300 font-sans">{selectedAsset.label || 'Crude Distillation Column Atmospheric Fractionator'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200 text-xs">Bound Equipment &amp; Devices</span>
                        <span className="text-[10px] font-mono text-cyan-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {entities.devices.length} Devices
                        </span>
                      </div>
                      <div className="space-y-2">
                        {entities.devices.map(d => (
                          <div key={d.id} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                            <div>
                              <div className="font-bold text-slate-200 flex items-center gap-1.5">
                                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                                <span>{d.name}</span>
                              </div>
                              <div className="text-[10px] font-mono text-slate-400">{d.deviceProfile} • {d.status}</div>
                            </div>
                            <button
                              onClick={() => {
                                setSelectedAsset(null);
                                setSelectedDevice(d);
                                setActiveNav('devices');
                              }}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-bold flex items-center gap-1"
                            >
                              <span>Inspect</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB: DEVICE PROFILES CATALOG                                  */}
          {/* ------------------------------------------------------------- */}
          {activeNav === 'deviceProfiles' && (
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <Radio className="w-5 h-5 text-purple-400" />
                    <span>Device Profiles Catalog</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Transport protocol bindings (MQTT, OPC UA, Modbus), provisioning rules, default rule chains, and dynamic alarm triggers.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-purple-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800 font-bold">
                    {deviceProfiles.length} Profiles Registered
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {deviceProfiles.map(dp => (
                  <div key={dp.id} className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold font-mono border ${
                          dp.transportType === 'MQTT' ? 'bg-purple-950 text-purple-300 border-purple-800' :
                          dp.transportType === 'OPC_UA' ? 'bg-cyan-950 text-cyan-300 border-cyan-800' :
                          'bg-amber-950 text-amber-300 border-amber-800'
                        }`}>
                          {dp.transportType}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          Rule Chain: {dp.defaultRuleChainId}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-slate-100">{dp.name}</h4>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{dp.description}</p>
                      </div>

                      {/* Dynamic Alarm Rules Engine for this Profile */}
                      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 space-y-2">
                        <div className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                          <span>Configured Alarm Rules</span>
                          <span className="text-[10px] text-red-400 font-mono">({dp.alarmRules?.length || 0})</span>
                        </div>
                        {dp.alarmRules && dp.alarmRules.length > 0 ? (
                          <div className="space-y-1.5">
                            {dp.alarmRules.map(ar => (
                              <div key={ar.id} className="p-2 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono space-y-0.5">
                                <div className="flex justify-between font-bold">
                                  <span className="text-slate-200">{ar.alarmType}</span>
                                  <span className={`px-1 rounded ${ar.severity === 'CRITICAL' ? 'text-red-400 bg-red-950/80' : 'text-amber-400 bg-amber-950/80'}`}>
                                    {ar.severity}
                                  </span>
                                </div>
                                <div className="text-red-300/90">Trigger: {ar.condition}</div>
                                <div className="text-emerald-300/80">Clear: {ar.clearCondition}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-500 italic">No automated alarm rules attached</div>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>Provision: {dp.provisionType}</span>
                      <span className="text-cyan-400 font-semibold">{dp.type}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB: ASSET PROFILES CATALOG                                   */}
          {/* ------------------------------------------------------------- */}
          {activeNav === 'assetProfiles' && (
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-emerald-400" />
                    <span>Asset Profiles Catalog</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    ISA-88 and ISA-95 standardized templates for chemical production units, areas, sites, and utility headers.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-emerald-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800 font-bold">
                    {assetProfiles.length || 2} Profiles Registered
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {(assetProfiles.length > 0 ? assetProfiles : [
                  {
                    id: "ap-production-unit",
                    name: "Chemical Production Unit",
                    defaultRuleChainId: "rc-root-01",
                    description: "Major refinery processing unit (ISA-88/ISA-95 Level 3/4)"
                  },
                  {
                    id: "ap-utility-system",
                    name: "Plant Utility Circuit",
                    defaultRuleChainId: "rc-root-01",
                    description: "Steam, cooling water, compressed air and inert gas header"
                  }
                ]).map(ap => (
                  <div key={ap.id} className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                          ISA-95 LEVEL 3/4
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          Rule Chain: {ap.defaultRuleChainId}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-slate-100">{ap.name}</h4>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{ap.description}</p>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 space-y-2 text-xs">
                        <div className="font-bold text-slate-300 text-[11px]">Associated Equipment Templates</div>
                        <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                          <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-cyan-300">Continuous Distillation Tower</span>
                          <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-blue-300">Centrifugal Feed Pump</span>
                          <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-emerald-300">Pneumatic Control Valve</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>Profile ID: {ap.id}</span>
                      <span className="text-emerald-400 font-semibold">Active Profile</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB 4: RULE CHAINS                                            */}
          {/* ------------------------------------------------------------- */}
          {activeNav === 'ruleChains' && (
            <div className="flex-1 flex min-h-0 overflow-hidden">
              {/* Left: Rule Chains Directory */}
              <div className="w-80 bg-slate-950 border-r border-slate-800 p-5 flex flex-col min-h-0 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <GitFork className="w-4 h-4 text-cyan-400" />
                    <span>Rule Chains Directory</span>
                  </h4>
                  <span className="text-[10px] font-mono text-cyan-400">{ruleChains.length} Chains</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2">
                  {ruleChains.map(rc => (
                    <div
                      key={rc.id}
                      onClick={() => setSelectedChainId(rc.id)}
                      className={`p-3 rounded-xl cursor-pointer border transition-all text-xs ${
                        selectedChainId === rc.id
                          ? 'bg-cyan-950/80 border-cyan-600 text-cyan-200 shadow-md'
                          : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="font-bold">{rc.name}</div>
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                        <span className="font-mono">{rc.id}</span>
                        <span className="text-emerald-400 font-bold">{rc.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Test Simulator Bench */}
              <div className="flex-1 p-6 overflow-y-auto space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-cyan-400" />
                    <span>ThingsBoard Rule Engine DAG Simulator &amp; Test Bench</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Inject telemetry payloads and observe the step-by-step DAG node traversal, condition branches, and execution latency.
                  </p>
                </div>

                {/* Simulation Injector Form */}
                <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
                  <div className="font-bold text-xs text-slate-200">Inject Simulated Message Payload</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>Temperature (°C)</span>
                        <span className="font-mono text-cyan-400 font-bold">{simTemp} °C</span>
                      </div>
                      <input
                        type="range"
                        min="60"
                        max="140"
                        step="0.5"
                        value={simTemp}
                        onChange={e => setSimTemp(parseFloat(e.target.value))}
                        className="w-full accent-cyan-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>Pressure (kPa)</span>
                        <span className="font-mono text-blue-400 font-bold">{simPressure} kPa</span>
                      </div>
                      <input
                        type="range"
                        min="180"
                        max="350"
                        step="1"
                        value={simPressure}
                        onChange={e => setSimPressure(parseFloat(e.target.value))}
                        className="w-full accent-blue-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>Vibration (mm/s)</span>
                        <span className="font-mono text-amber-400 font-bold">{simVibration} mm/s</span>
                      </div>
                      <input
                        type="range"
                        min="1.0"
                        max="12.0"
                        step="0.2"
                        value={simVibration}
                        onChange={e => setSimVibration(parseFloat(e.target.value))}
                        className="w-full accent-amber-500"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleRunSimulation}
                    disabled={simulating}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-2"
                  >
                    {simulating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
                    <span>Run DAG Simulation Pipeline</span>
                  </button>
                </div>

                {/* Simulation Trace Timeline */}
                {simResult && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 text-xs font-mono text-slate-300">
                      <span>Traversed: <strong className="text-cyan-400">{simResult.total_nodes_traversed} nodes</strong></span>
                      <span>Total Latency: <strong className="text-emerald-400">{simResult.total_latency_ms} ms</strong></span>
                    </div>

                    {simResult.trace?.map((node, i) => (
                      <div key={i} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-cyan-300">{i + 1}. {node.node_name} ({node.node_type})</span>
                          <span className="font-mono text-slate-400">{node.latency_ms} ms</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Branch: <span className="text-emerald-400 font-bold">{node.branch || 'Success'}</span> • {node.details}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB 5: ALARMS (ISA-18.2)                                      */}
          {/* ------------------------------------------------------------- */}
          {activeNav === 'alarms' && (
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <span>ISA-18.2 Alarm Center</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Lifecycle state machine (<code>ACTIVE_UNACK</code>, <code>ACTIVE_ACK</code>, <code>CLEARED_UNACK</code>, <code>CLEARED_ACK</code>).
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <select
                    value={alarmFilterStatus}
                    onChange={e => setAlarmFilterStatus(e.target.value)}
                    className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-200"
                  >
                    <option value="ALL">All States</option>
                    <option value="ACTIVE_UNACK">ACTIVE_UNACK</option>
                    <option value="ACTIVE_ACK">ACTIVE_ACK</option>
                    <option value="CLEARED_UNACK">CLEARED_UNACK</option>
                    <option value="CLEARED_ACK">CLEARED_ACK</option>
                  </select>

                  <select
                    value={alarmFilterSeverity}
                    onChange={e => setAlarmFilterSeverity(e.target.value)}
                    className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-200"
                  >
                    <option value="ALL">All Severities</option>
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="MAJOR">MAJOR</option>
                    <option value="WARNING">WARNING</option>
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 text-[11px] uppercase border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Alarm Type</th>
                      <th className="py-3 px-4">Originator</th>
                      <th className="py-3 px-4">Severity</th>
                      <th className="py-3 px-4">Lifecycle State</th>
                      <th className="py-3 px-4">Details</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-[11px]">
                    {alarms
                      .filter(a => alarmFilterStatus === 'ALL' || a.status === alarmFilterStatus)
                      .filter(a => alarmFilterSeverity === 'ALL' || a.severity === alarmFilterSeverity)
                      .map(a => (
                        <tr key={a.id} className="hover:bg-slate-800/30">
                          <td className="py-3 px-4 font-bold text-slate-200">{a.type}</td>
                          <td className="py-3 px-4 font-mono text-cyan-300">{a.originator?.name || a.originator?.id}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              a.severity === 'CRITICAL' ? 'bg-red-950 text-red-300 border border-red-800' :
                              a.severity === 'MAJOR' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                              'bg-blue-950 text-blue-300 border border-blue-800'
                            }`}>
                              {a.severity}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono">
                            <span className={`px-2 py-0.5 rounded text-[10px] ${
                              a.status === 'ACTIVE_UNACK' ? 'bg-red-950 text-red-400 border border-red-700 animate-pulse' :
                              a.status === 'ACTIVE_ACK' ? 'bg-amber-950 text-amber-300 border border-amber-700' :
                              a.status === 'CLEARED_UNACK' ? 'bg-blue-950 text-blue-300 border border-blue-700' :
                              'bg-slate-800 text-slate-400'
                            }`}>
                              {a.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                            {a.details?.cause || `${a.details?.tag}: ${a.details?.currentValue}`}
                          </td>
                          <td className="py-3 px-4 text-right space-x-1.5">
                            {!a.status.endsWith('ACK') && (
                              <button
                                onClick={() => handleAckAlarm(a.id)}
                                className="px-2.5 py-1 rounded bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800 text-[10px] font-bold"
                              >
                                ACK
                              </button>
                            )}
                            {!a.status.startsWith('CLEARED') && (
                              <button
                                onClick={() => handleClearAlarm(a.id)}
                                className="px-2.5 py-1 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 text-[10px] font-bold"
                              >
                                CLEAR
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB 6: SCADA SYMBOLS                                          */}
          {/* ------------------------------------------------------------- */}
          {activeNav === 'scada-symbols' && (
            <div className="flex-1 flex min-h-0 overflow-hidden">
              <ScadaSymbolLibrary />
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB 7: WIDGETS LIBRARY                                        */}
          {/* ------------------------------------------------------------- */}
          {activeNav === 'widgets-bundles' && (
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Box className="w-5 h-5 text-cyan-400" />
                  <span>ThingsBoard Widgets Library</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Standard library of 6 ThingsBoard widget bundles ready to embed into any dashboard.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                  { title: 'Time-Series Charts', count: '5 Widgets', desc: 'Flot & ECharts multi-pen line, area, and step graphs.', icon: BarChart3 },
                  { title: 'Gauges & Dials', count: '6 Widgets', desc: 'Analog radial dials, digital LED cards, liquid tank levels.', icon: Gauge },
                  { title: 'Control & RPC', count: '5 Widgets', desc: 'Bistable switches, speed knobs, push buttons, sliders.', icon: Terminal },
                  { title: 'Alarm Banners', count: '3 Widgets', desc: 'Active alarm matrices with quick ACK and Clear triggers.', icon: AlertTriangle },
                  { title: 'SCADA Process Mimics', count: '4 Widgets', desc: 'SVG synoptic diagrams with animated flows and valve states.', icon: Layers },
                  { title: 'Entity Status Cards', count: '4 Widgets', desc: 'Summary cards, status beacons, and attribute inspector cards.', icon: Box }
                ].map((wb, idx) => {
                  const Icon = wb.icon;
                  return (
                    <div key={idx} className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-slate-100 text-sm">
                          <Icon className="w-4 h-4 text-cyan-400" />
                          <span>{wb.title}</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono font-bold">
                          {wb.count}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{wb.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB 8: AUDIT LOGS                                             */}
          {/* ------------------------------------------------------------- */}
          {activeNav === 'auditLogs' && (
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <History className="w-5 h-5 text-cyan-400" />
                    <span>ThingsBoard Audit Log</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Immutable security record of all entity mutations, RPC commands, and alarm events.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 text-[11px] uppercase border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Entity</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {auditLogs.map((log, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-4 font-bold text-cyan-300 font-sans">{log.action}</td>
                        <td className="py-2.5 px-4 text-slate-300">{log.entity}</td>
                        <td className="py-2.5 px-4 text-emerald-400 font-bold">{log.status}</td>
                        <td className="py-2.5 px-4 text-slate-400">{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'Recent'}</td>
                        <td className="py-2.5 px-4 text-slate-300 font-sans truncate max-w-sm">{log.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB 9: SETTINGS                                               */}
          {/* ------------------------------------------------------------- */}
          {activeNav === 'settings' && (
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-cyan-400" />
                  <span>Platform Configuration &amp; White-labeling</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  ThingsBoard Cloud environment settings and Yokogawa CENTUM VP DCS integration parameters.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="font-bold text-slate-200">System Information</div>
                  <div className="space-y-2 font-mono text-[11px]">
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Platform:</span>
                      <span className="text-slate-200 font-bold">ThingsBoard Enterprise Parity</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Version:</span>
                      <span className="text-cyan-300 font-bold">3.8.1-industrial-yokogawa</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Database:</span>
                      <span className="text-slate-200">PostgreSQL 5432 (ahi_dbm)</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Redis Cache:</span>
                      <span className="text-emerald-400 font-bold">Connected (Port 6379)</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="font-bold text-slate-200">Official ThingsBoard References</div>
                  <div className="space-y-2 text-slate-300">
                    <div className="p-2 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <span>ThingsBoard Cloud:</span>
                      <a href="https://thingsboard.cloud/home" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline flex items-center gap-1">
                        <span>thingsboard.cloud/home</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="p-2 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <span>Source Code Repo:</span>
                      <a href="https://github.com/thingsboard/thingsboard" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline flex items-center gap-1">
                        <span>github.com/thingsboard/thingsboard</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
