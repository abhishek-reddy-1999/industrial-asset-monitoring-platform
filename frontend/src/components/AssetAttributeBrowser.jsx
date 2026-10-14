import React, { useState, useMemo } from 'react';
import { 
  FolderTree, Search, Filter, Star, Clock, CheckCircle2, 
  AlertTriangle, AlertCircle, HelpCircle, Layers, Tag,
  ChevronRight, ChevronDown, Check, Zap, Cpu, Radio, Hash
} from 'lucide-react';

export default function AssetAttributeBrowser({ 
  assets = [], 
  selectedAttribute = null, 
  onSelectAttribute, 
  title = "Asset Attribute Selector",
  compact = false 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL'); // ALL | Dynamic | Static | Runtime | Alias | Command | Integration
  const [dataTypeFilter, setDataTypeFilter] = useState('ALL');
  const [selectedAssetId, setSelectedAssetId] = useState(assets[0]?.id || '');
  const [expandedNodes, setExpandedNodes] = useState({ 'ast-enterprise': true, 'ast-site-jurong': true, 'ast-area-01': true });
  const [favorites, setFavorites] = useState(['attr-cdu-1', 'attr-pmp-1', 'attr-pmp-5']);
  const [recentlyUsed, setRecentlyUsed] = useState([]);

  // Flatten all assets and attributes for global search
  const allAttributesFlattened = useMemo(() => {
    const list = [];
    assets.forEach(ast => {
      (ast.attributes || []).forEach(attr => {
        list.push({
          ...attr,
          asset_id: ast.id,
          asset_name: ast.name,
          asset_path: ast.path || ast.name
        });
      });
    });
    return list;
  }, [assets]);

  // Filtered attributes for the currently selected asset OR global search
  const displayedAttributes = useMemo(() => {
    let source = [];
    if (searchTerm.trim()) {
      source = allAttributesFlattened;
    } else {
      const activeAst = assets.find(a => a.id === selectedAssetId);
      source = (activeAst?.attributes || []).map(attr => ({
        ...attr,
        asset_id: activeAst.id,
        asset_name: activeAst.name,
        asset_path: activeAst.path || activeAst.name
      }));
    }

    return source.filter(attr => {
      // Search matching tag, name, or asset
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const mName = (attr.name || '').toLowerCase().includes(q);
        const mTag = (attr.tag_name || '').toLowerCase().includes(q);
        const mAsset = (attr.asset_name || '').toLowerCase().includes(q);
        if (!mName && !mTag && !mAsset) return false;
      }

      // Type Filter
      if (typeFilter !== 'ALL' && attr.type !== typeFilter) {
        return false;
      }

      // Data Type Filter
      if (dataTypeFilter !== 'ALL') {
        const dt = (attr.data_type || 'Float').toLowerCase();
        if (dt !== dataTypeFilter.toLowerCase()) return false;
      }

      return true;
    });
  }, [assets, selectedAssetId, searchTerm, typeFilter, dataTypeFilter, allAttributesFlattened]);

  const toggleExpand = (id) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleFavorite = (attrId, e) => {
    e.stopPropagation();
    setFavorites(prev => 
      prev.includes(attrId) ? prev.filter(id => id !== attrId) : [...prev, attrId]
    );
  };

  const handleSelect = (attr) => {
    if (onSelectAttribute) {
      onSelectAttribute({
        asset_id: attr.asset_id,
        asset_name: attr.asset_name,
        attribute_id: attr.id,
        attribute_name: attr.name,
        tag_name: attr.tag_name || `${attr.asset_name}.${attr.name}`,
        uom: attr.uom || '',
        data_type: attr.data_type || 'Float',
        type: attr.type || 'Dynamic',
        value: attr.value,
        quality: attr.quality || 'Good'
      });
    }

    setRecentlyUsed(prev => {
      const filtered = prev.filter(id => id !== attr.id);
      return [attr.id, ...filtered].slice(0, 5);
    });
  };

  const getQualityBadge = (quality = 'Good') => {
    const q = (quality || 'Good').toUpperCase();
    if (q === 'GOOD') return <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800"><CheckCircle2 className="w-2.5 h-2.5" /> GOOD</span>;
    if (q === 'BAD') return <span className="inline-flex items-center gap-1 text-[10px] text-rose-400 font-bold bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800"><AlertTriangle className="w-2.5 h-2.5" /> BAD</span>;
    if (q === 'UNCERTAIN') return <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-bold bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800"><AlertCircle className="w-2.5 h-2.5" /> UNCERTAIN</span>;
    if (q === 'STALE') return <span className="inline-flex items-center gap-1 text-[10px] text-indigo-400 font-bold bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800"><Clock className="w-2.5 h-2.5" /> STALE</span>;
    return <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-bold bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700"><HelpCircle className="w-2.5 h-2.5" /> MISSING</span>;
  };

  const getTypeIcon = (type = 'Dynamic') => {
    switch (type) {
      case 'Dynamic': return <Cpu className="w-3 h-3 text-cyan-400" />;
      case 'Runtime': return <Zap className="w-3 h-3 text-amber-400" />;
      case 'Static': return <Hash className="w-3 h-3 text-slate-400" />;
      case 'Alias': return <Radio className="w-3 h-3 text-purple-400" />;
      default: return <Tag className="w-3 h-3 text-indigo-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#080e1a] border border-slate-800 rounded-lg overflow-hidden text-slate-200 text-xs">
      {/* Header */}
      <div className="px-3 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderTree className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-slate-200 tracking-wide">{title}</span>
        </div>
        <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
          {displayedAttributes.length} Attributes
        </span>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-2 border-b border-slate-800/80 bg-slate-950/40 space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search tags, metrics, assets (e.g. TIC_101, OEE)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-md text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Attribute Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
          {['ALL', 'Dynamic', 'Runtime', 'Static', 'Alias', 'Command'].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-2 py-0.5 rounded whitespace-nowrap font-medium transition ${
                typeFilter === t
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Main Dual-Pane or Split Selection */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left ISA-95 Tree: Enterprise -> Site -> Area -> Unit -> Equipment */}
        {!searchTerm && (
          <div className="w-48 border-r border-slate-800/80 bg-slate-950/60 overflow-y-auto p-1.5 space-y-0.5 shrink-0">
            <div className="text-[10px] uppercase font-bold text-slate-500 px-2 py-1 tracking-wider">
              Plant Hierarchy
            </div>
            {assets.map((ast) => {
              const isSelected = selectedAssetId === ast.id;
              const hasChildren = assets.some(a => a.parent_id === ast.id);
              const isExpanded = !!expandedNodes[ast.id];

              return (
                <div key={ast.id} className="space-y-0.5">
                  <div
                    onClick={() => setSelectedAssetId(ast.id)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer group text-[11px] transition ${
                      isSelected
                        ? 'bg-cyan-950/80 text-cyan-300 font-semibold border-l-2 border-cyan-400'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    {hasChildren && (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleExpand(ast.id); }}
                        className="text-slate-500 hover:text-slate-300 p-0.5"
                      >
                        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      </button>
                    )}
                    <span className="truncate flex-1" title={ast.name}>{ast.name}</span>
                    <span className="text-[9px] text-slate-500 font-mono">
                      {ast.attributes?.length || 0}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Right Attributes Grid */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 bg-[#090d16]">
          {displayedAttributes.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Layers className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
              <p>No attributes matching criteria found</p>
            </div>
          ) : (
            displayedAttributes.map((attr) => {
              const isSel = selectedAttribute && (
                selectedAttribute.attribute_id === attr.id || 
                selectedAttribute.tag_name === attr.tag_name
              );
              const isFav = favorites.includes(attr.id);

              return (
                <div
                  key={`${attr.asset_id}-${attr.id}`}
                  draggable={true}
                  onDragStart={(e) => {
                    const payload = {
                      asset_id: attr.asset_id,
                      asset_name: attr.asset_name,
                      attribute_id: attr.id,
                      attribute_name: attr.name,
                      tag_name: attr.tag_name || `${attr.asset_name}.${attr.name}`,
                      uom: attr.uom || '',
                      data_type: attr.data_type || 'Float',
                      type: attr.type || 'Dynamic',
                      value: attr.value,
                      quality: attr.quality || 'Good'
                    };
                    e.dataTransfer.setData('application/scada-attribute', JSON.stringify(payload));
                    e.dataTransfer.setData('text/plain', payload.tag_name);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() => handleSelect(attr)}
                  className={`p-2.5 rounded-lg border transition cursor-grab active:cursor-grabbing flex items-center justify-between group ${
                    isSel
                      ? 'bg-cyan-950/40 border-cyan-500 shadow-lg shadow-cyan-950/30'
                      : 'bg-slate-900/70 hover:bg-slate-800/60 border-slate-800 hover:border-slate-700'
                  }`}
                  title="Click to select or drag directly onto SCADA canvas"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="mt-0.5 p-1 rounded bg-slate-800 border border-slate-700/80 shrink-0">
                      {getTypeIcon(attr.type)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold text-xs truncate ${isSel ? 'text-cyan-300' : 'text-slate-200'}`}>
                          {attr.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {attr.uom ? `(${attr.uom})` : ''}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                        Tag: <span className="text-slate-300">{attr.tag_name || attr.name}</span>
                      </div>
                      {searchTerm && (
                        <div className="text-[10px] text-slate-500 truncate mt-0.5">
                          {attr.asset_name}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-slate-200">
                        {attr.value !== undefined && attr.value !== null ? String(attr.value) : '--'}
                        <span className="text-[10px] text-slate-400 font-normal ml-1">{attr.uom}</span>
                      </div>
                      <div className="mt-1">
                        {getQualityBadge(attr.quality)}
                      </div>
                    </div>

                    <button
                      onClick={(e) => toggleFavorite(attr.id, e)}
                      className={`p-1 rounded transition ${isFav ? 'text-amber-400 fill-amber-400' : 'text-slate-600 hover:text-slate-400'}`}
                      title="Favorite attribute"
                    >
                      <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-400' : ''}`} />
                    </button>

                    {isSel && (
                      <div className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
