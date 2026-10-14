import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Filter, Plus, Edit3, Eye, Sparkles, Check, 
  Layers, Tag, RefreshCw, Upload, Download, ShieldCheck, Box, Activity,
  GitBranch, ArrowRight, X, Cpu, CheckCircle2, AlertCircle
} from 'lucide-react';
import { 
  fetchScadaSymbols, 
  exportSymbolPack, 
  importSymbolPack,
  createCompositeSymbol 
} from '../../../api/client';

export default function ScadaSymbolLibrary({ 
  onSelectSymbol, 
  onEditSymbol,
  onNewSymbol,
  onOpenDesigner
}) {
  const [symbols, setSymbols] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedSymbol, setSelectedSymbol] = useState(null);

  // Composite Assembly Builder Modal
  const [showCompositeModal, setShowCompositeModal] = useState(false);
  const [compositeName, setCompositeName] = useState('Pump Skid Set');
  const [compositeCategory, setCompositeCategory] = useState('Pumps');
  const [compositeDesc, setCompositeDesc] = useState('Composed assembly of motor, coupling, and centrifugal pump');
  const [selectedPartIds, setSelectedPartIds] = useState(['sym-motor-ac-induct', 'sym-pump-centrif-horiz']);
  const [compositeLayout, setCompositeLayout] = useState('HORIZONTAL');
  const [compositeSubmitting, setCompositeSubmitting] = useState(false);
  const [compositeMsg, setCompositeMsg] = useState('');

  // Import Pack State
  const fileInputRef = useRef(null);
  const [importStatus, setImportStatus] = useState('');

  const categories = [
    'ALL', '3D Equipment', 'Water Treatment & Pool', 'Pumps', 'Valves', 'Tanks', 'Rotating Equipment', 
    'Thermal Equipment', 'Instrumentation', 'Piping', 'Electrical', 
    'Material Handling', 'HMI Controls', 'Custom'
  ];

  const loadSymbols = async () => {
    try {
      setLoading(true);
      const data = await fetchScadaSymbols(selectedCategory);
      setSymbols(data);
      if (data.length > 0 && !selectedSymbol) {
        setSelectedSymbol(data[0]);
      }
    } catch (err) {
      console.error('Failed to load SCADA symbols:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSymbols();
  }, [selectedCategory]);

  const handleExportPack = async () => {
    try {
      const pack = await exportSymbolPack(selectedCategory === 'ALL' ? null : selectedCategory);
      const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scada-symbol-pack-${selectedCategory.toLowerCase().replace(/\s+/g, '-')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    }
  };

  const handleImportPack = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      setImportStatus('Importing symbols...');
      const res = await importSymbolPack(payload);
      alert(`Successfully imported ${res.imported_count || 'all'} symbols into registry!`);
      loadSymbols();
    } catch (err) {
      alert(`Import failed: ${err.message}`);
    } finally {
      setImportStatus('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreateComposite = async (e) => {
    e.preventDefault();
    if (selectedPartIds.length < 2) {
      setCompositeMsg('Please select at least 2 equipment symbols to compose.');
      return;
    }
    setCompositeSubmitting(true);
    setCompositeMsg('');

    try {
      const parts = selectedPartIds.map(id => ({ symbol_id: id }));
      const created = await createCompositeSymbol({
        name: compositeName.trim(),
        category: compositeCategory,
        description: compositeDesc.trim(),
        layout: compositeLayout,
        parts: parts
      });
      alert(`Composite symbol "${created.name}" created successfully!`);
      setShowCompositeModal(false);
      loadSymbols();
      setSelectedSymbol(created);
    } catch (err) {
      setCompositeMsg(err.message || 'Failed to create composite symbol');
    } finally {
      setCompositeSubmitting(false);
    }
  };

  const filteredSymbols = symbols.filter(s => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (s.name || '').toLowerCase().includes(q) ||
      (s.category || '').toLowerCase().includes(q) ||
      (s.description || '').toLowerCase().includes(q) ||
      (s.id || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 flex flex-col bg-[#020617] text-slate-100 overflow-hidden">
      {/* Top Header Bar */}
      <div className="h-14 border-b border-slate-800 bg-slate-900/90 px-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Box size={18} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              Industrial SVG Symbol Registry
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-medium">
                {symbols.length} Assets
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">
              Sanitized vector process components with connection ports, declarative tag bindings &amp; state animations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Export / Import Pack */}
          <button
            onClick={handleExportPack}
            className="px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
            title="Export Symbol Pack as JSON"
          >
            <Download size={13} className="text-cyan-400" />
            <span className="hidden sm:inline">Export Pack</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
            title="Import Symbol Pack from JSON"
          >
            <Upload size={13} className="text-cyan-400" />
            <span className="hidden sm:inline">Import Pack</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportPack}
            accept=".json"
            className="hidden"
          />

          {/* Compose Multi-Symbol Assembly */}
          <button
            onClick={() => setShowCompositeModal(true)}
            className="px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-cyan-900/60"
            title="Build Composite Equipment by Composing Sub-Symbols"
          >
            <Sparkles size={13} className="text-cyan-400" />
            <span className="hidden md:inline">Compose Assembly</span>
          </button>

          <button
            onClick={() => loadSymbols()}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
            title="Refresh Symbols"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          {onNewSymbol && (
            <button
              onClick={onNewSymbol}
              className="px-3 py-1.5 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus size={14} />
              <span>New Symbol</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Filter Sidebar & Symbol Grid */}
        <div className="flex-1 flex flex-col border-r border-slate-800 overflow-hidden">
          {/* Search & Category Filter */}
          <div className="p-3.5 border-b border-slate-800 bg-slate-900/40 flex flex-wrap items-center justify-between gap-3 shrink-0">
            {/* Search Box */}
            <div className="relative min-w-[240px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search symbols by name, category, or tag..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-md pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 placeholder:text-slate-500"
              />
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap items-center gap-1 overflow-x-auto max-w-2xl py-1 scrollbar-thin">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Grid of Symbol Cards */}
          <div className="flex-1 p-4 overflow-y-auto scrollbar-thin">
            {loading ? (
              <div className="h-48 flex items-center justify-center text-xs text-slate-500 gap-2">
                <RefreshCw size={16} className="animate-spin text-cyan-400" />
                <span>Loading symbol library...</span>
              </div>
            ) : filteredSymbols.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-xs text-slate-500 gap-2">
                <Box size={28} className="text-slate-600" />
                <span>No symbols found matching "{searchTerm}"</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {filteredSymbols.map(sym => {
                  const isSelected = selectedSymbol?.id === sym.id;
                  return (
                    <div
                      key={sym.id}
                      onClick={() => setSelectedSymbol(sym)}
                      className={`group relative flex flex-col items-center p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-cyan-950/40 border-cyan-500 shadow-lg shadow-cyan-950/20 ring-1 ring-cyan-500/30'
                          : 'bg-slate-900/50 border-slate-800/80 hover:bg-slate-800/60 hover:border-slate-700'
                      }`}
                    >
                      {/* SVG Canvas Preview */}
                      <div className="w-16 h-16 flex items-center justify-center p-1 relative overflow-hidden">
                        <div
                          className="w-full h-full flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full group-hover:scale-105 transition-transform duration-200"
                          dangerouslySetInnerHTML={{ __html: sym.svg_content }}
                        />
                      </div>

                      {/* Title & Category */}
                      <div className="w-full mt-2 text-center">
                        <div className="text-[11px] font-semibold text-slate-200 truncate group-hover:text-cyan-300">
                          {sym.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                          {sym.category}
                        </div>
                      </div>

                      {/* Ports & Tag Pill */}
                      <div className="mt-2 flex items-center gap-1.5 text-[9px] text-slate-400 font-mono">
                        <span className="px-1 py-0.2 rounded bg-slate-950 border border-slate-800">
                          {sym.ports?.length || 4} Ports
                        </span>
                        <span>{sym.tags?.length || 0} Tags</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Detail Pane: Selected Symbol Inspector */}
        {selectedSymbol ? (
          <div className="w-80 border-l border-slate-800 bg-slate-950 flex flex-col overflow-y-auto shrink-0 scrollbar-thin">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white">{selectedSymbol.name}</h3>
                <span className="text-[10px] text-cyan-400 font-mono">ID: {selectedSymbol.id}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {onEditSymbol && (
                  <button
                    onClick={() => onEditSymbol(selectedSymbol)}
                    className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-900 rounded transition-colors"
                    title="Open in Symbol Editor"
                  >
                    <Edit3 size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* High-Res Interactive Preview */}
            <div className="p-6 bg-slate-900/50 border-b border-slate-800 flex flex-col items-center justify-center">
              <div className="w-36 h-36 border border-slate-800 rounded-xl bg-[#020617] flex items-center justify-center p-3 shadow-inner">
                <div
                  className="w-full h-full flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full"
                  dangerouslySetInnerHTML={{ __html: selectedSymbol.svg_content }}
                />
              </div>
              <div className="mt-3 text-[11px] text-slate-400 text-center font-sans">
                {selectedSymbol.description || 'Standard industrial P&ID vector asset'}
              </div>
            </div>

            {/* Specifications */}
            <div className="p-4 border-b border-slate-800 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Engineering Specifications
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded bg-slate-900/70 border border-slate-800">
                  <div className="text-[10px] text-slate-500">Dimensions</div>
                  <div className="font-mono text-slate-200 mt-0.5">
                    {selectedSymbol.default_width} × {selectedSymbol.default_height} px
                  </div>
                </div>
                <div className="p-2 rounded bg-slate-900/70 border border-slate-800">
                  <div className="text-[10px] text-slate-500">Version</div>
                  <div className="font-mono text-slate-200 mt-0.5">
                    v{selectedSymbol.version || '1.0.0'}
                  </div>
                </div>
                <div className="p-2 rounded bg-slate-900/70 border border-slate-800">
                  <div className="text-[10px] text-slate-500">Security</div>
                  <div className="flex items-center gap-1 text-emerald-400 font-mono mt-0.5">
                    <ShieldCheck size={11} />
                    <span>Sanitized</span>
                  </div>
                </div>
                <div className="p-2 rounded bg-slate-900/70 border border-slate-800">
                  <div className="text-[10px] text-slate-500">Origin</div>
                  <div className="text-slate-300 font-mono mt-0.5">
                    {selectedSymbol.origin || 'BUILTIN'}
                  </div>
                </div>
              </div>
            </div>

            {/* Connection Ports */}
            <div className="p-4 border-b border-slate-800 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Piping Connection Ports ({selectedSymbol.ports?.length || 4})
              </div>
              <div className="space-y-1">
                {(selectedSymbol.ports || [
                  { id: 'suction', label: 'Suction Inlet', direction: 'IN' },
                  { id: 'discharge', label: 'Discharge Outlet', direction: 'OUT' }
                ]).map((port, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-900 border border-slate-800 font-mono">
                    <span className="text-cyan-400">{port.id}</span>
                    <span className="text-[10px] text-slate-400">{port.direction || 'BIDIRECTIONAL'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Dynamic Tags & Elements */}
            <div className="p-4 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Configurable Elements ({selectedSymbol.tags?.length || 0})
              </div>
              <div className="flex flex-wrap gap-1">
                {(selectedSymbol.tags || []).map(t => (
                  <span key={t} className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="w-80 border-l border-slate-800 bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-500 text-xs text-center">
            <Box size={32} className="mb-2 text-slate-700" />
            <span>Select an equipment symbol to inspect engineering geometry and ports</span>
          </div>
        )}
      </div>

      {/* COMPOSITE ASSEMBLY BUILDER MODAL */}
      {showCompositeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh] scrollbar-thin">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-semibold text-white">
                  Multi-Symbol Assembly Builder
                </h3>
              </div>
              <button onClick={() => setShowCompositeModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Combine simpler industrial SVG objects (e.g., Motor + Coupling + Pump) into a single reusable equipment asset.
            </p>

            {compositeMsg && (
              <div className="mb-4 p-3 bg-red-950/60 border border-red-800 rounded-lg text-xs text-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{compositeMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateComposite} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Composite Asset Name</label>
                <input
                  type="text"
                  required
                  value={compositeName}
                  onChange={e => setCompositeName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Category</label>
                  <select
                    value={compositeCategory}
                    onChange={e => setCompositeCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    {categories.filter(c => c !== 'ALL').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Assembly Layout</label>
                  <select
                    value={compositeLayout}
                    onChange={e => setCompositeLayout(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="HORIZONTAL">Horizontal Alignment (Left to Right)</option>
                    <option value="VERTICAL">Vertical Alignment (Top to Bottom)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Select Sub-Symbols to Assemble</label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto p-2 bg-slate-950 rounded-lg border border-slate-800 scrollbar-thin">
                  {symbols.map(sym => {
                    const isChecked = selectedPartIds.includes(sym.id);
                    return (
                      <label key={sym.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-900 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPartIds([...selectedPartIds, sym.id]);
                            } else {
                              setSelectedPartIds(selectedPartIds.filter(id => id !== sym.id));
                            }
                          }}
                          className="rounded border-slate-700 text-cyan-600 focus:ring-0"
                        />
                        <span className="font-semibold text-slate-200">{sym.name}</span>
                        <span className="text-slate-500 text-[10px]">({sym.category})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCompositeModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={compositeSubmitting}
                  className="px-5 py-2 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white flex items-center gap-2 shadow-md"
                >
                  {compositeSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Assembly...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Save as Reusable Asset</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
