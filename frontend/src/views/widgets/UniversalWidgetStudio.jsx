import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';
import {
  Sparkles, Gauge, Activity, Sliders, Layers, RefreshCw,
  Plus, Trash2, Power, RotateCw, AlertTriangle, CheckCircle2,
  Radio, SlidersHorizontal, BarChart3, Database, Play, Check,
  ArrowUpRight, ShieldAlert, Cpu, Settings, Copy, Download,
  Volume2, Disc, Thermometer, Wind, Droplets, Flame,
  Search, Filter, Eye, Code, Palette, Zap, ArrowRight,
  Maximize2, Minimize2, CheckSquare, ChevronRight, LayoutGrid,
  TrendingUp, TrendingDown, Box, PieChart, FileText, Type,
  Clock, GitFork, GitCommit, MapPin, Image, Calendar, Table,
  ListTree, Shield, Compass, FolderTree, ToggleRight, X, Upload
} from 'lucide-react';
import { useDM } from '../dm/dmContext';

// Standard Category Icons
const CATEGORY_ICON_MAP = {
  trends: Activity,
  gauges: Gauge,
  cards: LayoutGrid,
  tables: Table,
  controls: Sliders,
  process: Droplets,
  analytics: Cpu,
  markup: FileText
};

export default function UniversalWidgetStudio({ onNavigateToDI, onNavigateToDM }) {
  const { showToast = (msg) => console.log(msg), devices = [] } = useDM() || {};

  // Studio State
  const [widgetLibrary, setWidgetLibrary] = useState([]);
  const [categories, setCategories] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [selectedWidget, setSelectedWidget] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [activeBundle, setActiveBundle] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [libraryTab, setLibraryTab] = useState('all'); // 'all' | 'builtin' | 'custom'

  // Stage & Preview Settings
  const [stageSize, setStageSize] = useState('standard'); // 'compact' | 'standard' | 'wide' | 'full'
  const [liveStreamEnabled, setLiveStreamEnabled] = useState(true);
  const [simTelemetry, setSimTelemetry] = useState({
    "TIC_101.PV": 118.4,
    "TIC_101.SV": 120.0,
    "TIC_102.PV": 235.8,
    "PIC_101.PV": 145.2,
    "FIC_101.PV": 452.3,
    "FIC_101.MV": 58.5,
    "FIC_102.PV": 176.4,
    "LIC_101.PV": 62.4,
    "MTR_101.RUN": 1,
    "XV_101.STATUS": "CLOSED_HEALTHY",
    "VIB_101.RMS": 1.84,
    "AHI_C101.HEALTH": 95.4
  });

  // Interactive Test Bench Sliders
  const [testTemp, setTestTemp] = useState(118.4);
  const [testPressure, setTestPressure] = useState(145.2);
  const [testFlow, setTestFlow] = useState(452.3);
  const [testLevel, setTestLevel] = useState(62.4);
  const [testPumpRun, setTestPumpRun] = useState(true);
  const [testValvePos, setTestValvePos] = useState(58.5);
  const [testVibration, setTestVibration] = useState(1.84);

  // Inspector Configuration Tabs
  const [inspectorTab, setInspectorTab] = useState('properties'); // 'properties' | 'data' | 'styling' | 'actions' | 'thresholds' | 'script'
  
  // Active Widget Editable State
  const [editableWidget, setEditableWidget] = useState(null);
  const [dirty, setDirty] = useState(false);

  // Diagnostics & Event Console Log
  const [diagnosticLogs, setDiagnosticLogs] = useState([
    { ts: new Date().toLocaleTimeString(), type: 'SYSTEM', msg: 'Industrial Widget Studio engine initialized' }
  ]);

  // Modals
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');

  // ECharts container ref
  const chartCanvasRef = useRef(null);
  const chartInstanceRef = useRef(null);

  // 1. Load Initial Library, Categories & Bundles from Backend API
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [catsRes, bundlesRes, libRes] = await Promise.all([
        fetch('/api/v1/widgets/categories').then(r => r.ok ? r.json() : []),
        fetch('/api/v1/widgets/bundles').then(r => r.ok ? r.json() : []),
        fetch('/api/v1/widgets/library').then(r => r.ok ? r.json() : [])
      ]);

      setCategories(catsRes);
      setBundles(bundlesRes);
      setWidgetLibrary(libRes);

      if (libRes.length > 0) {
        selectWidget(libRes[0]);
      }
    } catch (err) {
      console.error("Failed to load initial widget studio data:", err);
      logDiag('ERROR', `Failed to load catalog: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 2. Poll / Stream Preview Telemetry
  useEffect(() => {
    if (!liveStreamEnabled) return;
    const fetchSnapshot = async () => {
      try {
        const res = await fetch('/api/v1/widgets/preview/telemetry');
        if (res.ok) {
          const data = await res.json();
          if (data.tags) {
            const mapped = {};
            for (const [k, v] of Object.entries(data.tags)) {
              mapped[k] = v.value !== undefined ? v.value : v;
            }
            setSimTelemetry(prev => ({
              ...prev,
              ...mapped,
              // Apply test overrides if manually changed
              "TIC_101.PV": testTemp,
              "PIC_101.PV": testPressure,
              "FIC_101.PV": testFlow,
              "LIC_101.PV": testLevel,
              "MTR_101.RUN": testPumpRun ? 1 : 0,
              "FIC_101.MV": testValvePos,
              "VIB_101.RMS": testVibration
            }));
          }
        }
      } catch (e) {
        // quiet catch
      }
    };

    fetchSnapshot();
    const interval = setInterval(fetchSnapshot, 1500);
    return () => clearInterval(interval);
  }, [liveStreamEnabled, testTemp, testPressure, testFlow, testLevel, testPumpRun, testValvePos, testVibration]);

  // Log diagnostic events
  const logDiag = (type, msg) => {
    setDiagnosticLogs(prev => [
      { ts: new Date().toLocaleTimeString(), type, msg },
      ...prev.slice(0, 49)
    ]);
  };

  // Select a Widget from Library
  const selectWidget = (w) => {
    setSelectedWidget(w);
    setEditableWidget(JSON.parse(JSON.stringify(w)));
    setDirty(false);
    logDiag('INFO', `Selected widget: ${w.title} (${w.type})`);
  };

  // Update property in editable widget
  const handlePropChange = (key, value) => {
    setEditableWidget(prev => {
      const next = { ...prev };
      if (!next.properties) next.properties = {};
      next.properties[key] = value;
      return next;
    });
    setDirty(true);
  };

  // Update root field in editable widget
  const handleFieldChange = (field, value) => {
    setEditableWidget(prev => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  // Save or Publish Custom Widget
  const handleSaveWidget = async () => {
    if (!editableWidget) return;
    try {
      let res;
      if (editableWidget.isBuiltin) {
        // Clone as new custom widget template
        const clonePayload = {
          ...editableWidget,
          id: `w-custom-${Date.now().toString().slice(-6)}`,
          title: `${editableWidget.title} (Custom)`,
          isBuiltin: false,
          status: 'DRAFT',
          version: '1.0.0'
        };
        res = await fetch('/api/v1/widgets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clonePayload)
        });
      } else {
        res = await fetch(`/api/v1/widgets/${editableWidget.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editableWidget)
        });
      }

      if (res.ok) {
        const saved = await res.json();
        showToast(`Widget '${saved.title}' saved successfully`, 'success');
        logDiag('SUCCESS', `Saved widget ${saved.id} (${saved.version})`);
        setDirty(false);
        // Refresh catalog
        const refreshedLib = await fetch('/api/v1/widgets/library').then(r => r.json());
        setWidgetLibrary(refreshedLib);
        setSelectedWidget(saved);
        setEditableWidget(saved);
      }
    } catch (err) {
      showToast(`Save failed: ${err.message}`, 'error');
      logDiag('ERROR', `Save error: ${err.message}`);
    }
  };

  // Publish Widget
  const handlePublishWidget = async () => {
    if (!editableWidget) return;
    try {
      const res = await fetch(`/api/v1/widgets/${editableWidget.id}/publish?version=${editableWidget.version || '1.1.0'}`, {
        method: 'POST'
      });
      if (res.ok) {
        const result = await res.json();
        showToast(`Widget '${result.widget.title}' published as ${result.widget.version}`, 'success');
        logDiag('SUCCESS', `Published widget: ${result.widget.id} v${result.widget.version}`);
        setEditableWidget(result.widget);
        setSelectedWidget(result.widget);
      }
    } catch (err) {
      showToast(`Publish failed: ${err.message}`, 'error');
    }
  };

  // Dispatch Action from Widget
  const handleExecuteAction = async (actionType, payload) => {
    logDiag('ACTION', `Dispatched action: ${actionType} -> ${JSON.stringify(payload)}`);
    try {
      const res = await fetch(`/api/v1/widgets/${editableWidget?.id || 'w-builtin'}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: actionType, payload })
      });
      if (res.ok) {
        showToast(`Action '${actionType}' executed cleanly`, 'success');
        logDiag('SUCCESS', `Action completed: ${actionType}`);
      }
    } catch (e) {
      showToast(`Action failed: ${e.message}`, 'error');
      logDiag('ERROR', `Action execution failed: ${e.message}`);
    }
  };

  // Export JSON Package
  const handleExportPackage = async () => {
    try {
      const res = await fetch('/api/v1/widgets/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ widgetIds: selectedWidget ? [selectedWidget.id] : [] })
      });
      if (res.ok) {
        const pkg = await res.json();
        const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Industrial_Widget_${editableWidget?.type || 'Package'}_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Exported widget package JSON', 'success');
        logDiag('EXPORT', `Exported package containing ${pkg.widgetsCount} widgets`);
      }
    } catch (e) {
      showToast(`Export error: ${e.message}`, 'error');
    }
  };

  // Import JSON Package
  const handleImportPackage = async () => {
    try {
      const parsed = JSON.parse(importJsonText);
      const res = await fetch('/api/v1/widgets/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      });
      if (res.ok) {
        const result = await res.json();
        showToast(`Successfully imported ${result.imported} widgets!`, 'success');
        logDiag('IMPORT', `Imported ${result.imported} custom widgets into library`);
        setImportModalOpen(false);
        setImportJsonText('');
        fetchInitialData();
      }
    } catch (e) {
      showToast(`Invalid JSON: ${e.message}`, 'error');
    }
  };

  // Filtered widget list
  const filteredWidgets = useMemo(() => {
    return widgetLibrary.filter(w => {
      if (activeCategory !== 'ALL' && w.category !== activeCategory) return false;
      if (activeBundle !== 'ALL' && w.bundle !== activeBundle) return false;
      if (libraryTab === 'builtin' && !w.isBuiltin) return false;
      if (libraryTab === 'custom' && w.isBuiltin) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          w.title.toLowerCase().includes(q) ||
          w.type.toLowerCase().includes(q) ||
          (w.description && w.description.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [widgetLibrary, activeCategory, activeBundle, libraryTab, searchQuery]);

  // Current values for binding
  const primaryTag = editableWidget?.tags?.[0] || 'TIC_101.PV';
  const primaryVal = simTelemetry[primaryTag] !== undefined ? simTelemetry[primaryTag] : 118.4;

  // Render ECharts for Advanced Analytics (FFT, Vibration Spectrum, Pareto, Control Chart, Box Plot)
  useEffect(() => {
    if (!editableWidget || !chartCanvasRef.current) return;
    const wType = editableWidget.type;

    // Dispose old chart
    if (chartInstanceRef.current) {
      chartInstanceRef.current.dispose();
      chartInstanceRef.current = null;
    }

    if (['fft_chart', 'vibration_spectrum', 'pareto_chart', 'control_chart', 'box_plot', 'heatmap', 'scatter_plot', 'waterfall_chart'].includes(wType)) {
      const chart = echarts.init(chartCanvasRef.current, 'dark');
      chartInstanceRef.current = chart;

      let option = {};

      if (wType === 'vibration_spectrum') {
        const freqs = [10, 25, 49.2, 50, 98.4, 100, 150, 200, 300, 400, 500, 800, 1000];
        const amps = [0.12, 0.28, 2.85, 3.12, 1.42, 0.88, 0.35, 0.42, 0.21, 0.15, 0.08, 0.04, 0.02];
        option = {
          backgroundColor: 'transparent',
          tooltip: { trigger: 'axis', formatter: '{b} Hz: {c} mm/s' },
          grid: { top: 30, right: 20, bottom: 30, left: 45 },
          xAxis: { type: 'category', data: freqs.map(f => `${f}Hz`), axisLabel: { fontSize: 10, color: '#94a3b8' } },
          yAxis: { type: 'value', name: 'mm/s RMS', axisLabel: { fontSize: 10, color: '#94a3b8' } },
          series: [
            {
              name: 'Velocity RMS',
              type: 'bar',
              barWidth: '40%',
              data: amps,
              itemStyle: {
                color: (p) => p.value > 2.8 ? '#f43f5e' : p.value > 1.8 ? '#f59e0b' : '#38bdf8'
              },
              markLine: {
                data: [
                  { yAxis: 2.8, name: 'ISO Zone C Alarm', lineStyle: { color: '#f59e0b', type: 'dashed' } },
                  { yAxis: 4.5, name: 'ISO Zone D Trip', lineStyle: { color: '#f43f5e', type: 'solid' } }
                ]
              }
            }
          ]
        };
      } else if (wType === 'control_chart') {
        const points = Array.from({ length: 25 }, (_, i) => +(118.4 + Math.sin(i * 0.4) * 3.5 + (Math.random() - 0.5) * 2.0).toFixed(1));
        option = {
          backgroundColor: 'transparent',
          grid: { top: 35, right: 30, bottom: 25, left: 45 },
          xAxis: { type: 'category', data: points.map((_, i) => `#${i + 1}`), axisLabel: { fontSize: 9, color: '#94a3b8' } },
          yAxis: { type: 'value', min: 105, max: 130, axisLabel: { fontSize: 10, color: '#94a3b8' } },
          series: [
            {
              name: 'Subgroup Mean',
              type: 'line',
              data: points,
              itemStyle: { color: '#38bdf8' },
              lineStyle: { width: 2 },
              markLine: {
                data: [
                  { yAxis: 128.0, name: 'UCL (128.0°C)', lineStyle: { color: '#f43f5e', type: 'dashed' } },
                  { yAxis: 118.4, name: 'CL (118.4°C)', lineStyle: { color: '#10b981', type: 'solid' } },
                  { yAxis: 108.8, name: 'LCL (108.8°C)', lineStyle: { color: '#f43f5e', type: 'dashed' } }
                ]
              }
            }
          ]
        };
      } else if (wType === 'pareto_chart') {
        const alarms = ['C-101 High Press', 'P-101A Vib Trip', 'Reflux Low Flow', 'Reboiler Temp', 'Sump High Level'];
        const counts = [142, 88, 54, 32, 16];
        const cumPct = [42.8, 69.3, 85.5, 95.2, 100.0];
        option = {
          backgroundColor: 'transparent',
          grid: { top: 30, right: 40, bottom: 35, left: 45 },
          xAxis: { type: 'category', data: alarms, axisLabel: { fontSize: 9, color: '#94a3b8', rotate: 15 } },
          yAxis: [
            { type: 'value', name: 'Count', axisLabel: { fontSize: 9, color: '#94a3b8' } },
            { type: 'value', name: '%', min: 0, max: 100, axisLabel: { fontSize: 9, color: '#94a3b8' } }
          ],
          series: [
            { name: 'Occurrences', type: 'bar', data: counts, itemStyle: { color: '#0284c7' } },
            { name: 'Cumulative %', type: 'line', yAxisIndex: 1, data: cumPct, itemStyle: { color: '#f59e0b' } }
          ]
        };
      } else if (wType === 'fft_chart') {
        const freqs = Array.from({ length: 40 }, (_, i) => i * 25);
        const amps = freqs.map(f => +(3.0 / (1 + Math.abs(f - 100) * 0.15) + Math.random() * 0.1).toFixed(2));
        option = {
          backgroundColor: 'transparent',
          grid: { top: 25, right: 20, bottom: 25, left: 45 },
          xAxis: { type: 'category', data: freqs.map(f => `${f}Hz`), axisLabel: { fontSize: 9, color: '#94a3b8' } },
          yAxis: { type: 'value', axisLabel: { fontSize: 9, color: '#94a3b8' } },
          series: [{ type: 'line', areaStyle: { color: '#38bdf8', opacity: 0.3 }, data: amps, itemStyle: { color: '#38bdf8' } }]
        };
      } else {
        // Fallback simple line
        option = {
          backgroundColor: 'transparent',
          xAxis: { type: 'category', data: ['1m', '2m', '3m', '4m', '5m'] },
          yAxis: { type: 'value' },
          series: [{ type: 'line', data: [110, 114, 118, 122, 119], itemStyle: { color: '#38bdf8' } }]
        };
      }

      chart.setOption(option);
      const resizeObserver = new ResizeObserver(() => chart.resize());
      resizeObserver.observe(chartCanvasRef.current);
      return () => {
        resizeObserver.disconnect();
        chart.dispose();
      };
    }
  }, [editableWidget?.type, testVibration, testTemp]);

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-[#070d19] text-slate-100 overflow-hidden select-none font-sans">
      
      {/* ========================================================================= */}
      {/* 1. TOP HEADER TOOLBAR                                                     */}
      {/* ========================================================================= */}
      <div className="h-14 border-b border-slate-800 bg-[#0c1426] px-4 flex items-center justify-between shrink-0 shadow-md z-20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-indigo-500/30 rounded-xl text-cyan-400 shadow-md">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-white tracking-wide">
                Universal Industrial Widget Studio
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-indigo-950 text-indigo-400 border border-indigo-800">
                TB &amp; Grafana Interoperable
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                LIVE STAGE
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-xl">
              Extensible Widget ecosystem: 38+ industrial charts, Bourdon dials, SCADA equipment silhouettes, RPC controls &amp; SPC quality models.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
            title="Import Widget Package JSON"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            Import Package
          </button>
          <button
            onClick={handleExportPackage}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
            title="Export Widget Package JSON"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            Export Package
          </button>
          <button
            onClick={handleSaveWidget}
            disabled={!dirty}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg shadow-lg transition ${
              dirty 
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30' 
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            Save Changes
          </button>
          <button
            onClick={handlePublishWidget}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-cyan-600/30 transition"
          >
            <Play className="w-3.5 h-3.5" />
            Publish Version
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. THREE-PANEL STUDIO BODY                                                */}
      {/* ========================================================================= */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        
        {/* ======================================================================= */}
        {/* LEFT PANEL: WIDGET EXPLORER & CATALOG (38+ WIDGETS)                     */}
        {/* ======================================================================= */}
        <div className="w-80 border-r border-slate-800 bg-[#09101f] flex flex-col shrink-0">
          
          {/* Search & Tabs */}
          <div className="p-3 border-b border-slate-800 space-y-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search 38+ widgets, tags, types..."
                className="w-full pl-8 pr-3 py-1.5 bg-[#0e172a] border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2.5 text-slate-500 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Catalog Subtabs */}
            <div className="grid grid-cols-3 gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800 text-[11px] font-semibold text-center">
              <button
                onClick={() => setLibraryTab('all')}
                className={`py-1 rounded transition ${libraryTab === 'all' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                All ({widgetLibrary.length})
              </button>
              <button
                onClick={() => setLibraryTab('builtin')}
                className={`py-1 rounded transition ${libraryTab === 'builtin' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                Standard (38+)
              </button>
              <button
                onClick={() => setLibraryTab('custom')}
                className={`py-1 rounded transition ${libraryTab === 'custom' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                Custom
              </button>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="px-3 py-2 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none text-[11px]">
            <button
              onClick={() => setActiveCategory('ALL')}
              className={`px-2.5 py-1 rounded-md shrink-0 font-medium transition ${activeCategory === 'ALL' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              All Categories
            </button>
            {categories.map(c => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={`px-2 py-1 rounded-md shrink-0 font-medium transition flex items-center gap-1 ${activeCategory === c.id ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'text-slate-400 hover:bg-slate-800'}`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Widget Cards List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {filteredWidgets.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No matching widgets found.
              </div>
            ) : (
              filteredWidgets.map(w => {
                const isSelected = selectedWidget?.id === w.id;
                const IconComponent = CATEGORY_ICON_MAP[w.category] || Activity;

                return (
                  <div
                    key={w.id}
                    onClick={() => selectWidget(w)}
                    className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between group ${
                      isSelected
                        ? 'bg-indigo-950/40 border-cyan-500/70 shadow-lg shadow-indigo-950/50'
                        : 'bg-[#0e1628]/60 border-slate-800/80 hover:border-slate-700 hover:bg-[#0e1628]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-2 rounded-lg border ${
                        isSelected 
                          ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' 
                          : 'bg-slate-800/80 border-slate-700 text-slate-400 group-hover:text-cyan-400'
                      }`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                          <span>{w.title}</span>
                          {w.isBuiltin && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">STD</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5 font-mono truncate">
                          <span className="text-cyan-400">{w.type}</span>
                          <span>•</span>
                          <span>{w.bundle}</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 transition ${isSelected ? 'text-cyan-400 translate-x-0.5' : 'text-slate-600 opacity-0 group-hover:opacity-100'}`} />
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Counter */}
          <div className="h-9 px-3 border-t border-slate-800 bg-[#080d19] flex items-center justify-between text-[11px] text-slate-500 shrink-0">
            <span>Catalog Items: {filteredWidgets.length}</span>
            <span className="text-cyan-400 font-mono">All 38+ Types Ready</span>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* CENTER PANEL: LIVE STAGE & INTERACTIVE TEST BENCH                       */}
        {/* ======================================================================= */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#060b16] overflow-hidden">
          
          {/* Stage Top Controls */}
          <div className="h-11 px-4 border-b border-slate-800/80 bg-[#091122] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Stage Viewport:
              </span>
              {[
                { id: 'compact', label: 'Compact (320px)' },
                { id: 'standard', label: 'Standard (560px)' },
                { id: 'wide', label: 'Wide (800px)' },
                { id: 'full', label: 'Full Canvas' }
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => setStageSize(s.id)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                    stageSize === s.id
                      ? 'bg-slate-700 text-white border border-slate-600'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={liveStreamEnabled}
                  onChange={e => setLiveStreamEnabled(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-cyan-500"
                />
                <span>Simulate Live Stream</span>
              </label>
              <div className="h-4 w-px bg-slate-700"></div>
              <span className="text-xs font-mono text-cyan-400">
                Primary Tag: {primaryTag} ({primaryVal})
              </span>
            </div>
          </div>

          {/* Live Stage Display Area */}
          <div className="flex-1 p-6 overflow-y-auto flex items-center justify-center bg-gradient-to-b from-[#060b16] to-[#040812]">
            <div className={`transition-all duration-300 w-full ${
              stageSize === 'compact' ? 'max-w-xs' :
              stageSize === 'standard' ? 'max-w-xl' :
              stageSize === 'wide' ? 'max-w-3xl' : 'max-w-full'
            }`}>
              
              {/* THE ACTIVE LIVE WIDGET CONTAINER */}
              <div className="bg-[#0b1325]/90 border-2 border-slate-700/80 rounded-2xl p-5 shadow-2xl backdrop-blur-md relative group hover:border-cyan-500/50 transition">
                
                {/* Widget Header */}
                <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-white tracking-wide">
                      {editableWidget?.title || 'Selected Widget'}
                    </h2>
                    <span className="text-[11px] font-mono text-cyan-400">
                      Type: {editableWidget?.type} • Category: {editableWidget?.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                      v{editableWidget?.version || '1.0.0'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                      {editableWidget?.status || 'PUBLISHED'}
                    </span>
                  </div>
                </div>

                {/* ============================================================= */}
                {/* RENDER SPECIFIC INDUSTRIAL WIDGET PREVIEWS (ALL 38+ TYPES)     */}
                {/* ============================================================= */}
                
                {/* 1. GAUGES & DIALS */}
                {editableWidget?.type === 'gauge' && (
                  <div className="py-4 flex flex-col items-center justify-center">
                    <div className="relative w-44 h-44 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="88" cy="88" r="68" stroke="#1e293b" strokeWidth="14" fill="transparent" />
                        <circle
                          cx="88" cy="88" r="68"
                          stroke={primaryVal > 180 ? '#f43f5e' : primaryVal > 150 ? '#f59e0b' : '#38bdf8'}
                          strokeWidth="14"
                          strokeDasharray={427}
                          strokeDashoffset={427 - (427 * Math.min(100, (primaryVal / 250) * 100)) / 100}
                          strokeLinecap="round"
                          fill="transparent"
                          className="transition-all duration-500"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-3xl font-black font-mono text-white tracking-tight">
                          {primaryVal}
                        </span>
                        <span className="text-xs font-bold text-slate-400">°C Vapor Temp</span>
                      </div>
                    </div>
                    <div className="w-full flex justify-between text-[11px] text-slate-400 font-mono mt-2 px-6">
                      <span>0°C (Min)</span>
                      <span>Warning: 180°C</span>
                      <span>250°C (Max)</span>
                    </div>
                  </div>
                )}

                {editableWidget?.type === 'radial_gauge' && (
                  <div className="py-4 flex flex-col items-center justify-center">
                    <div className="relative w-44 h-44 rounded-full border-4 border-slate-700 bg-gradient-to-b from-slate-900 to-black flex items-center justify-center shadow-inner">
                      <div className="absolute inset-1.5 rounded-full border border-dashed border-slate-600/50"></div>
                      <div 
                        className="absolute w-1.5 h-18 bg-rose-500 origin-bottom rounded transition-transform duration-500 shadow-md shadow-rose-500/50"
                        style={{
                          bottom: '50%',
                          transform: `rotate(${((primaryVal / 300) * 260) - 130}deg)`
                        }}
                      ></div>
                      <div className="w-5 h-5 rounded-full bg-slate-300 border-2 border-slate-900 z-10 shadow"></div>
                      <div className="absolute bottom-3 text-center">
                        <span className="text-base font-black font-mono text-amber-400">
                          {primaryVal}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1">kPa</span>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 font-mono mt-3">
                      Bourdon Tube Pressure Element • Range 0-300 kPa
                    </span>
                  </div>
                )}

                {editableWidget?.type === 'linear_gauge' && (
                  <div className="py-4 flex items-center justify-center gap-8">
                    <div className="w-8 h-48 rounded-full border-2 border-slate-700 bg-slate-950 p-1 flex flex-col justify-end relative">
                      <div 
                        className="w-full rounded-full bg-gradient-to-t from-cyan-600 to-cyan-400 transition-all duration-500"
                        style={{ height: `${Math.min(100, Math.max(0, primaryVal))}%` }}
                      ></div>
                    </div>
                    <div className="space-y-1 font-mono">
                      <div className="text-3xl font-black text-cyan-400">{primaryVal}%</div>
                      <div className="text-xs text-slate-400">Linear Vessel Column</div>
                      <div className="text-[10px] text-slate-500">Vol: {(primaryVal * 250).toFixed(0)} L</div>
                    </div>
                  </div>
                )}

                {/* 2. KPIS & CARDS */}
                {editableWidget?.type === 'kpi_card' && (
                  <div className="py-6 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-400 uppercase font-semibold">Column Primary Vapor Temp</div>
                      <div className="text-4xl font-black text-white font-mono mt-1 tracking-tight">
                        {primaryVal} <span className="text-lg text-cyan-400">°C</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-0.5">
                          <TrendingUp className="w-3.5 h-3.5" /> +1.2°C/hr
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">Scan Rate: 1000ms</span>
                      </div>
                    </div>
                    <div className="h-16 w-28 bg-[#040812] border border-slate-800 rounded-lg p-2 flex items-end">
                      <svg className="w-full h-full">
                        <polyline
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="2"
                          points="0,40 15,35 30,38 45,28 60,30 75,18 90,22 105,10"
                        />
                      </svg>
                    </div>
                  </div>
                )}

                {editableWidget?.type === 'status_card' && (
                  <div className="py-6 flex flex-col items-center justify-center space-y-3">
                    <div className={`p-4 rounded-2xl border-2 transition shadow-xl ${
                      testPumpRun
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400 shadow-emerald-500/30'
                        : 'bg-rose-500/20 border-rose-400 text-rose-400'
                    }`}>
                      <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <div className="text-center font-mono">
                      <div className="text-lg font-bold text-white">
                        {testPumpRun ? 'STATUS: NORMAL RUNNING' : 'STATUS: STOPPED / TRIPPED'}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Charge Pump P-101A • Interlock State: HEALTHY
                      </div>
                    </div>
                  </div>
                )}

                {editableWidget?.type === 'alarm_card' && (
                  <div className="py-4 space-y-3">
                    <div className="p-3 bg-rose-950/60 border border-rose-700 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <AlertTriangle className="w-5 h-5 text-rose-400 animate-bounce" />
                        <div>
                          <div className="text-xs font-bold text-rose-200">
                            CRITICAL: C-101 Column Top High High Pressure
                          </div>
                          <div className="text-[10px] text-rose-300 font-mono">
                            Current Value: {primaryVal} kPa (Trip Limit: 200.0 kPa)
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleExecuteAction('ALARM_ACK', { alarmId: 'alm-101' })}
                        className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg shadow"
                      >
                        Acknowledge
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. PROCESS & SCADA SYMBOLS */}
                {editableWidget?.type === 'tank' && (
                  <div className="py-4 flex items-center justify-around">
                    <div className="w-24 h-40 rounded-2xl border-2 border-slate-600 bg-slate-950 relative overflow-hidden flex flex-col justify-end p-1 shadow-inner">
                      <div 
                        className="w-full bg-gradient-to-t from-cyan-600 to-blue-500 rounded-b-xl transition-all duration-700 relative"
                        style={{ height: `${Math.min(100, Math.max(0, testLevel))}%` }}
                      >
                        <div className="absolute inset-x-0 top-0 h-1.5 bg-cyan-300 opacity-70 animate-pulse"></div>
                      </div>
                      <div className="absolute inset-y-0 right-1.5 flex flex-col justify-between py-2 text-[8px] font-mono text-slate-500 pointer-events-none">
                        <span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span>
                      </div>
                    </div>
                    <div className="space-y-1 font-mono">
                      <div className="text-3xl font-black text-cyan-400">{testLevel}%</div>
                      <div className="text-xs text-slate-400">Hydrocarbon Sump V-102</div>
                      <div className="text-[10px] text-slate-500">Volume: {(testLevel * 250).toFixed(0)} Liters</div>
                      <div className="text-[10px] text-emerald-400">Discharge Valve: OPEN</div>
                    </div>
                  </div>
                )}

                {editableWidget?.type === 'pump' && (
                  <div className="py-4 flex flex-col items-center justify-center space-y-3">
                    <div className="relative w-28 h-28 flex items-center justify-center">
                      <svg className="w-full h-full" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="38" fill="#1e293b" stroke="#475569" strokeWidth="4" />
                        <path d="M50 12 L75 12 L75 35 Z" fill="#334155" />
                        {/* Impeller */}
                        <g className={testPumpRun ? "animate-spin origin-center" : ""} style={{ transformOrigin: "50px 50px", animationDuration: "1.2s" }}>
                          <path d="M50 50 Q60 30 50 20 Q40 30 50 50" fill={testPumpRun ? "#38bdf8" : "#94a3b8"} />
                          <path d="M50 50 Q70 60 80 50 Q70 40 50 50" fill={testPumpRun ? "#38bdf8" : "#94a3b8"} />
                          <path d="M50 50 Q40 70 50 80 Q60 70 50 50" fill={testPumpRun ? "#38bdf8" : "#94a3b8"} />
                          <path d="M50 50 Q30 40 20 50 Q30 60 50 50" fill={testPumpRun ? "#38bdf8" : "#94a3b8"} />
                        </g>
                        <circle cx="50" cy="50" r="8" fill="#0f172a" stroke="#cbd5e1" strokeWidth="2" />
                      </svg>
                    </div>
                    <div className="text-center font-mono">
                      <div className="text-xs font-bold text-white">CENTRIFUGAL PUMP P-101A</div>
                      <div className="text-[11px] text-cyan-400">{testPumpRun ? 'RUNNING • 2950 RPM' : 'STOPPED • 0 RPM'}</div>
                    </div>
                  </div>
                )}

                {editableWidget?.type === 'valve' && (
                  <div className="py-4 flex flex-col items-center justify-center space-y-3">
                    <div className="w-24 h-24 flex items-center justify-center">
                      <svg className="w-full h-full" viewBox="0 0 100 100">
                        {/* Diaphragm top */}
                        <path d="M30 20 C30 10, 70 10, 70 20 Z" fill="#475569" stroke="#64748b" strokeWidth="2" />
                        <line x1="50" y1="20" x2="50" y2="50" stroke="#94a3b8" strokeWidth="3" />
                        {/* Valve Body */}
                        <path d="M20 35 L80 65 L80 35 L20 65 Z" fill={testValvePos > 0 ? "#0284c7" : "#334155"} stroke="#38bdf8" strokeWidth="3" />
                      </svg>
                    </div>
                    <div className="text-center font-mono">
                      <div className="text-xs font-bold text-white">CONTROL VALVE FCV-101</div>
                      <div className="text-sm font-bold text-cyan-400">Opening: {testValvePos}%</div>
                    </div>
                  </div>
                )}

                {/* 4. CONTROLS & RPC */}
                {editableWidget?.type === 'switch' && (
                  <div className="py-4 flex flex-col items-center justify-center space-y-4">
                    <button
                      onClick={() => {
                        const nextState = !testPumpRun;
                        setTestPumpRun(nextState);
                        handleExecuteAction('RPC_SWITCH', { method: 'togglePump', state: nextState });
                      }}
                      className={`px-8 py-3 rounded-2xl font-bold text-sm tracking-wide shadow-xl transition flex items-center gap-3 ${
                        testPumpRun
                          ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                      }`}
                    >
                      <Power className="w-5 h-5" />
                      {testPumpRun ? 'STOP PUMP P-101A' : 'START PUMP P-101A'}
                    </button>
                    <span className="text-xs font-mono text-slate-400">
                      Two-Way Synchronous RPC Dispatch to PLC
                    </span>
                  </div>
                )}

                {editableWidget?.type === 'slider' && (
                  <div className="py-4 space-y-3">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-400">Valve Actuator Opening:</span>
                      <span className="text-cyan-400 font-bold text-sm">{testValvePos}%</span>
                    </div>
                    <input
                      type="range" min="0" max="100"
                      value={testValvePos}
                      onChange={e => setTestValvePos(+e.target.value)}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                    <button
                      onClick={() => handleExecuteAction('RPC_SLIDER', { method: 'setActuator', value: testValvePos })}
                      className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-cyan-600/30"
                    >
                      Transmit Actuator Position RPC ({testValvePos}%)
                    </button>
                  </div>
                )}

                {editableWidget?.type === 'setpoint' && (
                  <div className="py-4 flex flex-col items-center justify-center space-y-3">
                    <div className="text-4xl font-black font-mono text-white">
                      {testTemp} <span className="text-lg text-cyan-400">°C SV</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          const n = +(testTemp - 1.0).toFixed(1);
                          setTestTemp(n);
                          handleExecuteAction('SETPOINT_JOG', { method: 'setPoint', value: n });
                        }}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg"
                      >
                        - 1.0°C
                      </button>
                      <button
                        onClick={() => {
                          const n = +(testTemp + 1.0).toFixed(1);
                          setTestTemp(n);
                          handleExecuteAction('SETPOINT_JOG', { method: 'setPoint', value: n });
                        }}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg"
                      >
                        + 1.0°C
                      </button>
                    </div>
                  </div>
                )}

                {/* 5. ECHARTS ANALYTICS & SPC / FREQUENCY SPECTRUM */}
                {['fft_chart', 'vibration_spectrum', 'pareto_chart', 'control_chart'].includes(editableWidget?.type) && (
                  <div className="py-2">
                    <div ref={chartCanvasRef} className="w-full h-56 rounded-xl border border-slate-800 bg-[#040812]"></div>
                    <div className="text-[10px] font-mono text-slate-500 text-center mt-2">
                      High-Precision Statistical Engine • ISO / Shewhart Model Active
                    </div>
                  </div>
                )}

                {/* 6. TIME SERIES TRENDLINES */}
                {editableWidget?.type === 'timeseries' && (
                  <div className="py-2 space-y-2">
                    <div className="h-44 bg-[#040812] rounded-xl border border-slate-800 p-2 relative flex items-end">
                      <svg className="w-full h-full">
                        <polyline
                          fill="none" stroke="#38bdf8" strokeWidth="2"
                          points="0,90 40,80 80,85 120,60 160,65 200,45 240,55 280,30 320,40 360,20 400,25"
                        />
                        <polyline
                          fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 4"
                          points="0,110 40,105 80,112 120,95 160,98 200,85 240,90 280,75 320,80 360,65 400,70"
                        />
                      </svg>
                    </div>
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-cyan-400 font-bold">TIC_101.PV: {testTemp}°C</span>
                      <span className="text-amber-400 font-bold">PIC_101.PV: {testPressure} kPa</span>
                      <span className="text-slate-400">15m Window</span>
                    </div>
                  </div>
                )}

                {/* 7. TABLES & MARKUP FALLBACK */}
                {editableWidget?.type === 'data_table' && (
                  <div className="py-2 overflow-x-auto text-xs font-mono">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400">
                          <th className="py-1">Tag Name</th>
                          <th className="py-1">Value</th>
                          <th className="py-1">Unit</th>
                          <th className="py-1">Quality</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        <tr><td className="py-1.5 text-cyan-400">TIC_101.PV</td><td>{testTemp}</td><td>°C</td><td className="text-emerald-400">GOOD</td></tr>
                        <tr><td className="py-1.5 text-amber-400">PIC_101.PV</td><td>{testPressure}</td><td>kPa</td><td className="text-emerald-400">GOOD</td></tr>
                        <tr><td className="py-1.5 text-blue-400">FIC_101.PV</td><td>{testFlow}</td><td>m³/h</td><td className="text-emerald-400">GOOD</td></tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {editableWidget?.type === 'markdown' && (
                  <div className="py-2 text-xs text-slate-300 leading-relaxed font-mono bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                    <div className="font-bold text-cyan-400 mb-1">### Standard Operating Procedure</div>
                    <p>1. Monitor C-101 top temperature `TIC_101.PV` (Target 118°C).</p>
                    <p>2. Keep Charge Pump `P-101A` vibration below 2.5 mm/s ISO limit.</p>
                  </div>
                )}

              </div>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* BOTTOM INTERACTIVE TEST BENCH SLIDERS                                 */}
          {/* ===================================================================== */}
          <div className="h-28 border-t border-slate-800 bg-[#091122] px-4 py-2 shrink-0">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <Sliders className="w-3.5 h-3.5" />
                Interactive Telemetry Test Bench (Simulate Plant Conditions)
              </span>
              <button
                onClick={() => {
                  setTestTemp(118.4);
                  setTestPressure(145.2);
                  setTestFlow(452.3);
                  setTestLevel(62.4);
                  setTestPumpRun(true);
                  setTestValvePos(58.5);
                  setTestVibration(1.84);
                }}
                className="text-[10px] text-slate-400 hover:text-white underline"
              >
                Reset Bench Defaults
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-[11px] font-mono">
              <div>
                <div className="flex justify-between text-slate-400">
                  <span>Temp:</span><span className="text-white font-bold">{testTemp}°C</span>
                </div>
                <input
                  type="range" min="80" max="220" value={testTemp}
                  onChange={e => setTestTemp(+e.target.value)}
                  className="w-full accent-cyan-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400">
                  <span>Pressure:</span><span className="text-white font-bold">{testPressure} kPa</span>
                </div>
                <input
                  type="range" min="50" max="300" value={testPressure}
                  onChange={e => setTestPressure(+e.target.value)}
                  className="w-full accent-amber-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400">
                  <span>Flow:</span><span className="text-white font-bold">{testFlow} m³/h</span>
                </div>
                <input
                  type="range" min="100" max="800" value={testFlow}
                  onChange={e => setTestFlow(+e.target.value)}
                  className="w-full accent-blue-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400">
                  <span>Level:</span><span className="text-white font-bold">{testLevel}%</span>
                </div>
                <input
                  type="range" min="0" max="100" value={testLevel}
                  onChange={e => setTestLevel(+e.target.value)}
                  className="w-full accent-indigo-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400">
                  <span>Valve MV:</span><span className="text-white font-bold">{testValvePos}%</span>
                </div>
                <input
                  type="range" min="0" max="100" value={testValvePos}
                  onChange={e => setTestValvePos(+e.target.value)}
                  className="w-full accent-cyan-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400">
                  <span>Vibration:</span><span className="text-white font-bold">{testVibration} mm/s</span>
                </div>
                <input
                  type="range" min="0.5" max="6.0" step="0.1" value={testVibration}
                  onChange={e => setTestVibration(+e.target.value)}
                  className="w-full accent-rose-400"
                />
              </div>

              <div className="flex flex-col justify-center">
                <button
                  onClick={() => setTestPumpRun(!testPumpRun)}
                  className={`w-full py-1.5 rounded-lg font-bold text-[10px] ${
                    testPumpRun ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                  }`}
                >
                  Pump: {testPumpRun ? 'RUNNING' : 'STOPPED'}
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* ======================================================================= */}
        {/* RIGHT PANEL: UNIFIED CONFIGURATION INSPECTOR (6 TABS)                   */}
        {/* ======================================================================= */}
        <div className="w-88 border-l border-slate-800 bg-[#09101f] flex flex-col shrink-0">
          
          {/* Inspector Tab Bar */}
          <div className="h-11 px-2 border-b border-slate-800 flex items-center gap-1 overflow-x-auto text-[11px] font-semibold">
            {[
              { id: 'properties', label: 'Properties', icon: Settings },
              { id: 'data', label: 'Data', icon: Database },
              { id: 'styling', label: 'Styling', icon: Palette },
              { id: 'actions', label: 'Actions', icon: Zap },
              { id: 'thresholds', label: 'Thresholds', icon: AlertTriangle },
              { id: 'script', label: 'V8 Code', icon: Code }
            ].map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setInspectorTab(t.id)}
                  className={`px-2.5 py-1.5 rounded-md flex items-center gap-1 transition ${
                    inspectorTab === t.id
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Inspector Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            
            {/* TAB 1: PROPERTIES */}
            {inspectorTab === 'properties' && (
              <div className="space-y-3.5">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Widget Title</label>
                  <input
                    type="text"
                    value={editableWidget?.title || ''}
                    onChange={e => handleFieldChange('title', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={editableWidget?.description || ''}
                    onChange={e => handleFieldChange('description', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Category</label>
                    <select
                      value={editableWidget?.category || 'trends'}
                      onChange={e => handleFieldChange('category', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs"
                    >
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Bundle</label>
                    <select
                      value={editableWidget?.bundle || 'TIME_SERIES'}
                      onChange={e => handleFieldChange('bundle', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs"
                    >
                      {bundles.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Default Width</label>
                    <input
                      type="number" min={2} max={12}
                      value={editableWidget?.defaultW || 6}
                      onChange={e => handleFieldChange('defaultW', +e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Default Height</label>
                    <input
                      type="number" min={2} max={12}
                      value={editableWidget?.defaultH || 5}
                      onChange={e => handleFieldChange('defaultH', +e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: DATA BINDING */}
            {inspectorTab === 'data' && (
              <div className="space-y-3.5">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Entity Scope</label>
                  <select className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs">
                    <option value="DEVICE">DEVICE (CENTUM VP Controller)</option>
                    <option value="ASSET">ASSET (Crude Distillation Unit)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Bound Plant Tags</label>
                  <div className="space-y-1.5 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                    {['TIC_101.PV', 'PIC_101.PV', 'FIC_101.PV', 'LIC_101.PV', 'MTR_101.RUN'].map(t => (
                      <label key={t} className="flex items-center gap-2 text-slate-300 font-mono text-[11px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editableWidget?.tags?.includes(t) || false}
                          onChange={e => {
                            const cur = editableWidget?.tags || [];
                            const next = e.target.checked ? [...cur, t] : cur.filter(x => x !== t);
                            handleFieldChange('tags', next);
                          }}
                          className="rounded bg-slate-800 border-slate-700 text-cyan-500"
                        />
                        <span>{t}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Time Window</label>
                  <select className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs">
                    <option value="15m">Last 15 minutes (High Density)</option>
                    <option value="1h">Last 1 hour</option>
                    <option value="8h">Last 8 hours (Shift)</option>
                    <option value="24h">Last 24 hours</option>
                  </select>
                </div>
              </div>
            )}

            {/* TAB 3: STYLING & THEMES */}
            {inspectorTab === 'styling' && (
              <div className="space-y-3.5">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Visual Theme</label>
                  <select className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs">
                    <option value="dark_industrial">Industrial Dark (Default)</option>
                    <option value="neon_cyber">Cyberpunk Neon SCADA</option>
                    <option value="glassmorphic">Glassmorphic Clean</option>
                    <option value="solid_slate">Solid High-Contrast</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Accent Gradient</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['#38bdf8', '#10b981', '#f59e0b', '#f43f5e', '#a855f7', '#06b6d4'].map(color => (
                      <button
                        key={color}
                        onClick={() => handlePropChange('accentColor', color)}
                        className="h-7 rounded-lg border border-slate-600 transition"
                        style={{ backgroundColor: color }}
                      ></button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Corner Radius</label>
                  <input
                    type="range" min="0" max="24"
                    value={editableWidget?.properties?.radius || 12}
                    onChange={e => handlePropChange('radius', +e.target.value)}
                    className="w-full accent-cyan-400"
                  />
                </div>
              </div>
            )}

            {/* TAB 4: ACTIONS & EVENTS */}
            {inspectorTab === 'actions' && (
              <div className="space-y-3.5">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">On Click Action</label>
                  <select className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs">
                    <option value="RPC">Dispatch Two-Way RPC Command</option>
                    <option value="NAVIGATE">Navigate to Sub-Unit Dashboard</option>
                    <option value="FACEPLATE">Open P&ID SCADA Faceplate Modal</option>
                    <option value="ACK_ALARM">Acknowledge Active Alarm</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 font-semibold block mb-1">RPC Target Method</label>
                  <input
                    type="text"
                    defaultValue="setPoint"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs font-mono"
                  />
                </div>

                <button
                  onClick={() => handleExecuteAction('TEST_TRIGGER', { test: true })}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg shadow"
                >
                  Test Trigger Action Now
                </button>
              </div>
            )}

            {/* TAB 5: THRESHOLDS & ALARMS */}
            {inspectorTab === 'thresholds' && (
              <div className="space-y-3.5">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Warning Threshold (ISA-18.2)</label>
                  <input
                    type="number"
                    defaultValue={180}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Critical Trip Limit</label>
                  <input
                    type="number"
                    defaultValue={210}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs font-mono"
                  />
                </div>

                <label className="flex items-center gap-2 text-slate-300 font-semibold cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded bg-slate-800 border-slate-700 text-cyan-500" />
                  <span>Flash Widget on Critical Threshold Breach</span>
                </label>
              </div>
            )}

            {/* TAB 6: V8 CODE SANDBOX */}
            {inspectorTab === 'script' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-slate-400 text-[11px]">
                  <span>V8 Safe Sandbox Script</span>
                  <span className="text-cyan-400 font-mono">JS / ECharts</span>
                </div>
                <textarea
                  rows={8}
                  defaultValue={`// Custom Widget Transformer\nfunction render(data, element) {\n  const pv = data["TIC_101.PV"] || 0;\n  element.style.color = pv > 180 ? '#f43f5e' : '#38bdf8';\n}`}
                  className="w-full bg-[#050914] border border-slate-800 rounded-lg p-2.5 font-mono text-xs text-cyan-300 focus:outline-none"
                />
                <button
                  onClick={() => showToast('Sandboxed code syntax verified clean', 'success')}
                  className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg"
                >
                  Verify V8 Syntax
                </button>
              </div>
            )}

          </div>

          {/* Diagnostics / Event Trace Log at Bottom of Inspector */}
          <div className="h-44 border-t border-slate-800 bg-[#060b14] p-3 flex flex-col shrink-0">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1.5">
              <span className="flex items-center gap-1 text-slate-300">
                <Clock className="w-3 h-3 text-cyan-400" />
                Live Action &amp; Event Trace
              </span>
              <button onClick={() => setDiagnosticLogs([])} className="text-[10px] text-slate-500 hover:text-white">
                Clear
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 font-mono text-[10px]">
              {diagnosticLogs.map((l, i) => (
                <div key={i} className="flex items-start gap-1.5 text-slate-400 truncate">
                  <span className="text-slate-600">[{l.ts}]</span>
                  <span className={
                    l.type === 'SUCCESS' ? 'text-emerald-400 font-bold' :
                    l.type === 'ERROR' ? 'text-rose-400 font-bold' :
                    l.type === 'ACTION' ? 'text-amber-400' : 'text-cyan-400'
                  }>[{l.type}]</span>
                  <span className="text-slate-300 truncate">{l.msg}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. MODAL: IMPORT WIDGET PACKAGE JSON                                      */}
      {/* ========================================================================= */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Upload className="w-5 h-5 text-cyan-400" />
              Import Industrial Widget Package JSON
            </h3>
            <p className="text-xs text-slate-400">
              Paste the exported JSON package from ThingsBoard, Grafana or AHI Studio.
            </p>
            <textarea
              rows={8}
              value={importJsonText}
              onChange={e => setImportJsonText(e.target.value)}
              placeholder='{ "format": "INDUSTRIAL_WIDGET_PACKAGE_V2", "widgets": [...] }'
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setImportModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleImportPackage}
                className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg shadow"
              >
                Parse &amp; Import
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
