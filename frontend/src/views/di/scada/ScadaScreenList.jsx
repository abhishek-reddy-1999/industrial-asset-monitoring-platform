import React, { useState, useEffect } from 'react';
import { 
  Plus, Play, Edit3, Trash2, Copy, History, CheckCircle2, 
  AlertCircle, Clock, Layout, RefreshCw, Eye, ShieldCheck, 
  ExternalLink, Layers, Search, Filter, Server,
  Upload, Download, FileCode, Check, Sparkles, X
} from 'lucide-react';
import { 
  fetchScadaScreens, createScadaScreen, deleteScadaScreen, 
  publishScadaScreen, importThingsBoardDashboard, exportThingsBoardDashboard 
} from '../../../api/client';

export default function ScadaScreenList({ 
  onOpenDesigner, 
  onOpenRuntime, 
  onOpenVersions,
  onOpenSymbolLibrary,
  onOpenTemplates 
}) {
  const [screens, setScreens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newScreenName, setNewScreenName] = useState('');
  const [newScreenDesc, setNewScreenDesc] = useState('');
  const [newScreenWidth, setNewScreenWidth] = useState(1920);
  const [newScreenHeight, setNewScreenHeight] = useState(1080);
  const [creating, setCreating] = useState(false);

  // ThingsBoard Import Modal State
  const [isTbModalOpen, setIsTbModalOpen] = useState(false);
  const [tbJsonInput, setTbJsonInput] = useState('');
  const [tbParsedPreview, setTbParsedPreview] = useState(null);
  const [importingTb, setImportingTb] = useState(false);
  const [tbError, setTbError] = useState(null);
  const [tbSuccessMsg, setTbSuccessMsg] = useState(null);

  const loadScreens = async () => {
    try {
      setLoading(true);
      const data = await fetchScadaScreens();
      setScreens(data);
    } catch (err) {
      console.error('Failed to load SCADA screens:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScreens();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newScreenName.trim()) return;
    setCreating(true);
    try {
      const created = await createScadaScreen({
        name: newScreenName.trim(),
        description: newScreenDesc.trim(),
        width: Number(newScreenWidth),
        height: Number(newScreenHeight)
      });
      setIsNewModalOpen(false);
      setNewScreenName('');
      setNewScreenDesc('');
      await loadScreens();
      if (onOpenDesigner) onOpenDesigner(created.id);
    } catch (err) {
      console.error('Failed to create screen:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (screenId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this SCADA screen and its version history?')) return;
    try {
      await deleteScadaScreen(screenId);
      await loadScreens();
    } catch (err) {
      console.error('Failed to delete screen:', err);
    }
  };

  const handleTbJsonChange = (text) => {
    setTbJsonInput(text);
    setTbError(null);
    if (!text.trim()) {
      setTbParsedPreview(null);
      return;
    }
    try {
      const parsed = JSON.parse(text);
      const config = parsed.configuration || {};
      const states = config.states || {};
      const widgets = config.widgets || {};
      const aliases = config.entityAliases || {};
      setTbParsedPreview({
        title: parsed.title || parsed.name || 'Untitled Dashboard',
        statesCount: Object.keys(states).length,
        widgetsCount: Object.keys(widgets).length,
        aliasesCount: Object.keys(aliases).length,
        description: config.description || ''
      });
    } catch (err) {
      setTbParsedPreview(null);
      setTbError('Invalid JSON format: ' + err.message);
    }
  };

  const handleTbFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      handleTbJsonChange(event.target.result);
    };
    reader.readAsText(file);
  };

  const handleExecuteTbImport = async () => {
    if (!tbJsonInput.trim()) return;
    setImportingTb(true);
    setTbError(null);
    try {
      const parsed = JSON.parse(tbJsonInput);
      const res = await importThingsBoardDashboard(parsed);
      setTbSuccessMsg(`Successfully imported "${res.stats?.title || 'Dashboard'}" with ${res.stats?.elements_imported || 0} symbols!`);
      await loadScreens();
      setTimeout(() => {
        setIsTbModalOpen(false);
        setTbJsonInput('');
        setTbParsedPreview(null);
        setTbSuccessMsg(null);
        if (onOpenRuntime && res.stats?.screen_id) {
          onOpenRuntime(res.stats.screen_id);
        }
      }, 1200);
    } catch (err) {
      setTbError(err.message || 'Failed to import ThingsBoard dashboard');
    } finally {
      setImportingTb(false);
    }
  };

  const handleTbExport = async (screenId, screenName) => {
    try {
      const tbData = await exportThingsBoardDashboard(screenId);
      const jsonStr = JSON.stringify(tbData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(screenName || 'scada_screen').toLowerCase().replace(/\s+/g, '_')}_thingsboard.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export ThingsBoard dashboard: ' + err.message);
    }
  };

  const filteredScreens = screens.filter(s => {
    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (s.name || '').toLowerCase().includes(q) ||
      (s.description || '').toLowerCase().includes(q) ||
      (s.site_name || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 flex flex-col bg-[#020617] text-slate-100 overflow-hidden">
      {/* Top Banner */}
      <div className="h-16 border-b border-slate-800 bg-slate-900/90 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Layout size={20} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Data Insight — SCADA / HMI Process Screens
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                Live Plant Architecture
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">
              High-resolution synoptic diagrams, water &amp; chemical loops, rotating equipment and ISA-18.2 telemetry
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onOpenTemplates && (
            <button
              onClick={onOpenTemplates}
              className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              <Layers size={14} className="text-cyan-400" />
              <span>Process Templates</span>
            </button>
          )}

          {onOpenSymbolLibrary && (
            <button
              onClick={onOpenSymbolLibrary}
              className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              <Layers size={14} className="text-sky-400" />
              <span>Symbol Library</span>
            </button>
          )}

          <button
            onClick={() => setIsTbModalOpen(true)}
            className="px-3 py-1.5 rounded-md bg-purple-600/90 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-purple-500/30 shadow-sm shadow-purple-600/20"
            title="Import Native ThingsBoard Dashboard JSON"
          >
            <Upload size={14} className="text-purple-200" />
            <span>Import ThingsBoard</span>
          </button>

          <button
            onClick={() => setIsNewModalOpen(true)}
            className="px-3.5 py-1.5 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm shadow-sky-600/30"
          >
            <Plus size={15} />
            <span>New SCADA Screen</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/40 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search screens by process name, area, or description..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950/70 border border-slate-800 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 placeholder:text-slate-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-md border border-slate-800">
            {['ALL', 'PUBLISHED', 'DRAFT'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  statusFilter === st
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={loadScreens}
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
          title="Refresh List"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Screens Grid */}
      <div className="flex-1 p-6 overflow-y-auto">
        {loading ? (
          <div className="h-64 flex items-center justify-center text-xs text-slate-500 gap-2">
            <RefreshCw size={18} className="animate-spin text-sky-400" />
            <span>Loading SCADA screens...</span>
          </div>
        ) : filteredScreens.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-xs text-slate-500 gap-2">
            <Layout size={32} className="text-slate-600 mb-1" />
            <span className="font-medium text-slate-400">No SCADA screens found</span>
            <span className="text-[11px] text-slate-500">Create a new screen or clear search filters</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredScreens.map(screen => {
              const isPublished = screen.status === 'PUBLISHED';
              return (
                <div
                  key={screen.id}
                  className="group rounded-xl border border-slate-800/90 bg-slate-900/40 hover:bg-slate-900/80 hover:border-slate-700 transition-all p-5 flex flex-col justify-between shadow-lg shadow-black/20"
                >
                  <div>
                    {/* Top Status & Version */}
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                        isPublished
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {screen.status}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        v{screen.published_version || '1.0.0'}
                      </span>
                    </div>

                    {/* Title & Description */}
                    <h3 className="text-sm font-bold text-slate-100 group-hover:text-sky-300 transition-colors">
                      {screen.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {screen.description || 'Continuous plant process synoptic diagram'}
                    </p>

                    {/* Metadata Badges */}
                    <div className="grid grid-cols-2 gap-2 mt-4 text-[11px] text-slate-400">
                      <div className="bg-slate-950/60 p-2 rounded border border-slate-800/60">
                        <span className="text-[10px] text-slate-500 block">Resolution</span>
                        <span className="font-mono text-slate-300 font-medium">
                          {screen.width} × {screen.height} px
                        </span>
                      </div>
                      <div className="bg-slate-950/60 p-2 rounded border border-slate-800/60">
                        <span className="text-[10px] text-slate-500 block">Components</span>
                        <span className="font-mono text-slate-300 font-medium">
                          {screen.element_count} symbols
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onOpenRuntime && onOpenRuntime(screen.id)}
                        className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm shadow-emerald-600/30"
                        title="Launch Live Process Mimic Runtime"
                      >
                        <Play size={13} fill="currentColor" />
                        <span>Runtime</span>
                      </button>

                      <button
                        onClick={() => onOpenDesigner && onOpenDesigner(screen.id)}
                        className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
                        title="Open in Visual Screen Designer"
                      >
                        <Edit3 size={13} />
                        <span>Designer</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1 text-slate-400">
                      {onOpenVersions && (
                        <button
                          onClick={() => onOpenVersions(screen.id)}
                          className="p-1.5 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                          title="Version History & Rollback"
                        >
                          <History size={14} />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTbExport(screen.id, screen.name);
                        }}
                        className="p-1.5 hover:text-purple-400 hover:bg-slate-800 rounded transition-colors"
                        title="Export to Native ThingsBoard Dashboard JSON"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(screen.id, e)}
                        className="p-1.5 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                        title="Delete Screen"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Screen Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Plus size={16} className="text-sky-400" />
              <span>Create New SCADA Process Screen</span>
            </h2>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Screen Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Atmospheric Distillation Unit C-101"
                  value={newScreenName}
                  onChange={e => setNewScreenName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Continuous process synoptic, pumps, valves, and flow loops..."
                  value={newScreenDesc}
                  onChange={e => setNewScreenDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Design Width (px)</label>
                  <input
                    type="number"
                    value={newScreenWidth}
                    onChange={e => setNewScreenWidth(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-1.5 text-xs text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Design Height (px)</label>
                  <input
                    type="number"
                    value={newScreenHeight}
                    onChange={e => setNewScreenHeight(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-1.5 text-xs text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold"
                >
                  {creating ? 'Creating...' : 'Create & Open Designer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ThingsBoard Dashboard Import Modal */}
      {isTbModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-purple-500/30 rounded-xl p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                  <Upload size={17} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    Import ThingsBoard SCADA Dashboard
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium">
                      PE &amp; CE Compatible
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Ingests native ThingsBoard dashboard JSON, parsing widgets, multi-states, entity aliases, and SVG symbols into active SCADA screens.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsTbModalOpen(false);
                  setTbError(null);
                  setTbSuccessMsg(null);
                }}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* Error or Success Alerts */}
            {tbError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{tbError}</span>
              </div>
            )}
            {tbSuccessMsg && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 size={15} className="shrink-0" />
                <span>{tbSuccessMsg}</span>
              </div>
            )}

            {/* File Upload Option */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Option 1: Upload ThingsBoard Export (.json)
              </label>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-2 transition">
                  <FileCode size={14} className="text-purple-400" />
                  <span>Choose JSON File</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleTbFileSelect}
                    className="hidden"
                  />
                </label>
                <span className="text-xs text-slate-500">
                  Select exported dashboard from ThingsBoard IoT Suite
                </span>
              </div>
            </div>

            {/* Paste JSON Option */}
            <div className="space-y-1.5 flex-1 flex flex-col min-h-[140px]">
              <label className="block text-xs font-semibold text-slate-300">
                Option 2: Paste Raw ThingsBoard JSON Configuration
              </label>
              <textarea
                value={tbJsonInput}
                onChange={e => handleTbJsonChange(e.target.value)}
                placeholder='Paste native ThingsBoard JSON here (e.g. {"title": "Swimming Pool SCADA", "configuration": {...}})...'
                className="w-full flex-1 min-h-[120px] bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 font-mono resize-none focus:outline-none focus:border-purple-500/50"
              />
            </div>

            {/* Live Parsing Preview Card */}
            {tbParsedPreview && (
              <div className="p-3.5 rounded-lg bg-purple-950/30 border border-purple-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-purple-400" />
                    Detected ThingsBoard Dashboard
                  </span>
                  <span className="text-[11px] font-mono text-purple-200 bg-purple-500/20 px-2 py-0.5 rounded">
                    Validated
                  </span>
                </div>
                <div className="text-xs text-slate-200 font-semibold">
                  {tbParsedPreview.title}
                </div>
                {tbParsedPreview.description && (
                  <p className="text-[11px] text-slate-400 line-clamp-1">
                    {tbParsedPreview.description}
                  </p>
                )}
                <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                  <div className="bg-slate-900/80 p-2 rounded border border-purple-500/20">
                    <span className="text-[10px] text-slate-400 block">Total Widgets</span>
                    <span className="font-mono text-purple-300 font-bold">{tbParsedPreview.widgetsCount} widgets</span>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded border border-purple-500/20">
                    <span className="text-[10px] text-slate-400 block">Dashboard States</span>
                    <span className="font-mono text-purple-300 font-bold">{tbParsedPreview.statesCount} states</span>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded border border-purple-500/20">
                    <span className="text-[10px] text-slate-400 block">Entity Aliases</span>
                    <span className="font-mono text-purple-300 font-bold">{tbParsedPreview.aliasesCount} aliases</span>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsTbModalOpen(false);
                  setTbError(null);
                  setTbSuccessMsg(null);
                }}
                className="px-3.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!tbParsedPreview || importingTb}
                onClick={handleExecuteTbImport}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  tbParsedPreview && !importingTb
                    ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Upload size={14} />
                <span>{importingTb ? 'Importing Process...' : 'Import into SCADA Studio'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
