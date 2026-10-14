import React, { useState, useEffect } from 'react';
import { 
  Layers, Plus, Play, Search, Filter, RefreshCw, CheckCircle2, 
  AlertCircle, ArrowRight, Layout, Sliders, Cpu, Activity,
  Database, GitBranch, Box, Sparkles, X, ChevronRight
} from 'lucide-react';
import { 
  fetchScadaTemplates, 
  fetchScadaScreens, 
  createScadaScreen, 
  fetchScadaAssets, 
  instantiateScadaTemplate 
} from '../../../api/client';

export default function ScadaTemplateLibrary({ onOpenDesigner, onOpenScreenList }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Instantiation modal state
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [screens, setScreens] = useState([]);
  const [plantAssets, setPlantAssets] = useState([]);
  const [targetScreenMode, setTargetScreenMode] = useState('new'); // 'new' | 'existing'
  const [targetScreenId, setTargetScreenId] = useState('');
  const [newScreenName, setNewScreenName] = useState('');
  const [newScreenDesc, setNewScreenDesc] = useState('');
  const [roleMappings, setRoleMappings] = useState({});
  const [offsetX, setOffsetX] = useState(80);
  const [offsetY, setOffsetY] = useState(80);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const categories = ['ALL', 'Fluid Transfer', 'Thermal', 'Compression', 'Electrical', 'Material Handling', 'Water Treatment'];

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await fetchScadaTemplates(categoryFilter === 'ALL' ? null : categoryFilter);
      setTemplates(data);
    } catch (err) {
      console.error('Failed to load process templates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [categoryFilter]);

  const openInstantiateModal = async (tpl) => {
    setSelectedTemplate(tpl);
    setErrorMsg('');
    setNewScreenName(`${tpl.name} - Unit 1`);
    setNewScreenDesc(`Constructed from template: ${tpl.name}`);
    setTargetScreenMode('new');
    setOffsetX(80);
    setOffsetY(80);

    // Initial role mappings
    const initRoles = {};
    if (tpl.expected_asset_roles) {
      tpl.expected_asset_roles.forEach(r => {
        initRoles[r.role] = '';
      });
    }
    setRoleMappings(initRoles);

    // Fetch available screens and plant assets
    try {
      const [scrList, assetList] = await Promise.all([
        fetchScadaScreens().catch(() => []),
        fetchScadaAssets().catch(() => [])
      ]);
      setScreens(scrList);
      if (scrList.length > 0) setTargetScreenId(scrList[0].id);
      setPlantAssets(assetList);

      // Auto-match roles if asset name matches
      if (tpl.expected_asset_roles && assetList.length > 0) {
        tpl.expected_asset_roles.forEach(r => {
          const matched = assetList.find(a => 
            a.name.toLowerCase().includes(r.role.toLowerCase()) || 
            a.name.toLowerCase().includes(r.label.toLowerCase()) ||
            (r.type && a.level && a.level.toLowerCase().includes(r.type.toLowerCase()))
          );
          if (matched) {
            initRoles[r.role] = matched.id;
          }
        });
        setRoleMappings({ ...initRoles });
      }
    } catch (e) {
      console.warn('Could not prefill screens/assets:', e);
    }
  };

  const handleInstantiate = async (e) => {
    e.preventDefault();
    if (!selectedTemplate) return;
    setSubmitting(true);
    setErrorMsg('');

    try {
      let destScreenId = targetScreenId;

      if (targetScreenMode === 'new') {
        if (!newScreenName.trim()) {
          setErrorMsg('Screen name is required');
          setSubmitting(false);
          return;
        }
        const created = await createScadaScreen({
          name: newScreenName.trim(),
          description: newScreenDesc.trim(),
          width: selectedTemplate.width || 1920,
          height: selectedTemplate.height || 1080
        });
        destScreenId = created.id;
      }

      if (!destScreenId) {
        setErrorMsg('Please select a target screen');
        setSubmitting(false);
        return;
      }

      await instantiateScadaTemplate(selectedTemplate.id, {
        screen_id: destScreenId,
        asset_role_mappings: roleMappings,
        offset_x: Number(offsetX) || 80,
        offset_y: Number(offsetY) || 80
      });

      setSelectedTemplate(null);
      if (onOpenDesigner) {
        onOpenDesigner(destScreenId);
      }
    } catch (err) {
      console.error('Instantiation failed:', err);
      setErrorMsg(err.message || 'Failed to instantiate process template');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = templates.filter(t => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchName = t.name && t.name.toLowerCase().includes(q);
      const matchDesc = t.description && t.description.toLowerCase().includes(q);
      const matchCat = t.category && t.category.toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchCat) return false;
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#020617] text-slate-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-slate-900/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold tracking-wide text-white">Process Templates</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
              {templates.length} Ready Systems
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Standard industrial process skids, equipment assemblies, orthogonal piping topologies, and Asset Attribute roles.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search assemblies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs rounded-lg pl-9 pr-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-56"
            />
          </div>
          <button
            onClick={loadTemplates}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-lg border border-slate-700/60 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Categories Bar */}
      <div className="px-6 py-2 bg-slate-900/40 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto scrollbar-thin">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              categoryFilter === cat 
                ? 'bg-cyan-600 text-white shadow-sm' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Main Grid */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mr-3 text-cyan-400" />
            <span>Loading industrial process templates...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Box className="w-12 h-12 mx-auto mb-3 text-slate-600" />
            <p className="text-sm">No process templates found matching criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(tpl => (
              <div 
                key={tpl.id}
                className="bg-slate-900/70 border border-slate-800/90 rounded-xl p-5 flex flex-col justify-between hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-950/20 transition-all duration-200 group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                      {tpl.category}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {tpl.elements?.length || 0} Eq • {tpl.connections?.length || 0} Pipes
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-white group-hover:text-cyan-300 transition-colors">
                    {tpl.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {tpl.description}
                  </p>

                  {/* Expected Roles */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80">
                    <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                      Expected Asset Roles ({tpl.expected_asset_roles?.length || 0})
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {tpl.expected_asset_roles?.map((r, idx) => (
                        <div 
                          key={idx}
                          className="text-[10px] bg-slate-950 px-2 py-1 rounded border border-slate-800 text-slate-300 flex items-center gap-1"
                        >
                          <span className="font-semibold text-cyan-400">{r.label}</span>
                          <span className="text-slate-500">({r.type})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-500">
                    Dimensions: {tpl.width || 1200}×{tpl.height || 700}
                  </span>
                  <button
                    onClick={() => openInstantiateModal(tpl)}
                    className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <span>Instantiate</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instantiation Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh] scrollbar-thin">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Box className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-semibold text-white">
                  Instantiate {selectedTemplate.name}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedTemplate(null)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-950/60 border border-red-800 rounded-lg text-xs text-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleInstantiate} className="space-y-4">
              {/* Destination Mode */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Target Destination
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTargetScreenMode('new')}
                    className={`py-2 px-3 text-xs rounded-lg border flex items-center justify-center gap-2 transition-colors ${
                      targetScreenMode === 'new'
                        ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200 font-semibold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Create New Screen
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetScreenMode('existing')}
                    className={`py-2 px-3 text-xs rounded-lg border flex items-center justify-center gap-2 transition-colors ${
                      targetScreenMode === 'existing'
                        ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200 font-semibold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Layout className="w-3.5 h-3.5" />
                    Insert into Existing Screen
                  </button>
                </div>
              </div>

              {targetScreenMode === 'new' ? (
                <div className="space-y-3 bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">New Screen Name</label>
                    <input
                      type="text"
                      required
                      value={newScreenName}
                      onChange={(e) => setNewScreenName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Description</label>
                    <input
                      type="text"
                      value={newScreenDesc}
                      onChange={(e) => setNewScreenDesc(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                  <label className="block text-xs text-slate-400 mb-1">Select Target Screen</label>
                  <select
                    value={targetScreenId}
                    onChange={(e) => setTargetScreenId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    {screens.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.id})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Plant Asset Roles Mapping */}
              {selectedTemplate.expected_asset_roles && selectedTemplate.expected_asset_roles.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      Map Plant Assets to Template Roles
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Required by Phase 7 Specification
                    </span>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto p-2 bg-slate-950 rounded-lg border border-slate-800 scrollbar-thin">
                    {selectedTemplate.expected_asset_roles.map((r, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-3 text-xs py-1 border-b border-slate-800/60 last:border-0">
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-200">{r.label}</span>
                          <span className="text-slate-500 ml-1.5 text-[10px]">[{r.type}]</span>
                          {r.suggested_tags && (
                            <div className="text-[9px] text-slate-500 truncate">
                              Suggested: {r.suggested_tags.join(', ')}
                            </div>
                          )}
                        </div>
                        <select
                          value={roleMappings[r.role] || ''}
                          onChange={(e) => setRoleMappings({ ...roleMappings, [r.role]: e.target.value })}
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 w-48"
                        >
                          <option value="">-- Unbound / Generic --</option>
                          {plantAssets.map(a => (
                            <option key={a.id} value={a.id}>
                              {a.name} ({a.level})
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Placement Offset */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Canvas Offset X (px)</label>
                  <input
                    type="number"
                    value={offsetX}
                    onChange={(e) => setOffsetX(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Canvas Offset Y (px)</label>
                  <input
                    type="number"
                    value={offsetY}
                    onChange={(e) => setOffsetY(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedTemplate(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white flex items-center gap-2 transition-colors shadow-md"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Instantiating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Instantiate & Open Designer</span>
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
