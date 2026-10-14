import React, { useState, useEffect } from 'react';
import { Layout, Palette, Layers, Eye, History, ArrowLeft, Cpu } from 'lucide-react';
import ScadaScreenList from './ScadaScreenList';
import ScadaDesigner from './ScadaDesigner';
import ScadaRuntimeViewer from './ScadaRuntimeViewer';
import ScadaSymbolLibrary from './ScadaSymbolLibrary';
import ScadaSymbolEditor from './ScadaSymbolEditor';
import ScadaVersionHistory from './ScadaVersionHistory';
import ScadaTemplateLibrary from './ScadaTemplateLibrary';

export default function ScadaStudio({ subView, onSelectSubView, onNavigateToDM }) {
  // viewMode: 'screens' | 'designer' | 'runtime' | 'symbols' | 'editor' | 'versions' | 'templates'
  const [viewMode, setViewMode] = useState('screens');
  const [activeScreenId, setActiveScreenId] = useState('screen-swimming-pool');
  const [editingSymbol, setEditingSymbol] = useState(null);

  // Sync internal mode if parent subView prop changes
  useEffect(() => {
    if (!subView) return;
    if (subView === 'scada-screens') {
      setViewMode('screens');
    } else if (subView === 'scada-studio' || subView === 'scada-designer') {
      setViewMode(prev => prev === 'runtime' ? 'runtime' : 'designer');
    } else if (subView === 'scada-symbols') {
      setViewMode('symbols');
    } else if (subView === 'scada-templates') {
      setViewMode('templates');
    }
  }, [subView]);

  // Sync back to parent when viewMode changes
  const changeMode = (newMode) => {
    setViewMode(newMode);
    if (onSelectSubView) {
      if (newMode === 'screens') onSelectSubView('scada-screens');
      else if (newMode === 'designer' || newMode === 'runtime') onSelectSubView('scada-studio');
      else if (newMode === 'symbols' || newMode === 'editor') onSelectSubView('scada-symbols');
      else if (newMode === 'templates') onSelectSubView('scada-templates');
    }
  };

  // Navigation handlers
  const handleOpenDesigner = (screenId) => {
    if (screenId) setActiveScreenId(screenId);
    changeMode('designer');
  };

  const handleOpenRuntime = (screenId) => {
    if (screenId) setActiveScreenId(screenId);
    changeMode('runtime');
  };

  const handleOpenVersions = (screenId) => {
    if (screenId) setActiveScreenId(screenId);
    changeMode('versions');
  };

  const handleEditSymbol = (symbol) => {
    setEditingSymbol(symbol);
    changeMode('editor');
  };

  const handleNewSymbol = () => {
    setEditingSymbol(null);
    changeMode('editor');
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden bg-[#020617] text-slate-100">
      {/* Sub-navigation bar inside DI for SCADA */}
      <div className="h-10 px-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between text-xs shrink-0 select-none">
        <div className="flex items-center gap-1">
          <button
            onClick={() => changeMode('screens')}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 font-medium transition-colors ${
              viewMode === 'screens' 
                ? 'bg-slate-800 text-cyan-400 font-semibold' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            <span>SCADA Screens</span>
          </button>

          <button
            onClick={() => changeMode('designer')}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 font-medium transition-colors ${
              viewMode === 'designer' 
                ? 'bg-slate-800 text-cyan-400 font-semibold' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Studio Designer</span>
          </button>

          <button
            onClick={() => changeMode('symbols')}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 font-medium transition-colors ${
              viewMode === 'symbols' || viewMode === 'editor'
                ? 'bg-slate-800 text-cyan-400 font-semibold' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Symbol Library</span>
          </button>

          <button
            onClick={() => changeMode('templates')}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 font-medium transition-colors ${
              viewMode === 'templates' 
                ? 'bg-slate-800 text-cyan-400 font-semibold' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Process Templates</span>
          </button>
        </div>

        {/* Right side status / active screen info */}
        <div className="flex items-center gap-3 text-slate-400 text-[11px]">
          {activeScreenId && (
            <span className="font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-slate-300">
              Active: {activeScreenId}
            </span>
          )}
          {viewMode === 'designer' && (
            <button
              onClick={() => handleOpenRuntime(activeScreenId)}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 font-medium transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Launch Live</span>
            </button>
          )}
          {viewMode === 'runtime' && (
            <button
              onClick={() => handleOpenDesigner(activeScreenId)}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 font-medium transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Editor</span>
            </button>
          )}
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {viewMode === 'screens' && (
          <ScadaScreenList
            onOpenDesigner={handleOpenDesigner}
            onOpenRuntime={handleOpenRuntime}
            onOpenVersions={handleOpenVersions}
            onOpenSymbolLibrary={() => changeMode('symbols')}
            onOpenTemplates={() => changeMode('templates')}
          />
        )}

        {viewMode === 'designer' && (
          <ScadaDesigner
            screenId={activeScreenId}
            onBack={() => changeMode('screens')}
            onLaunchRuntime={(id) => handleOpenRuntime(id || activeScreenId)}
            onOpenVersions={(id) => handleOpenVersions(id || activeScreenId)}
            onOpenTemplates={() => changeMode('templates')}
            onOpenSymbolLibrary={() => changeMode('symbols')}
            onNavigateToDM={onNavigateToDM}
          />
        )}

        {viewMode === 'runtime' && (
          <ScadaRuntimeViewer
            screenId={activeScreenId}
            onBack={() => changeMode('designer')}
            onOpenDesigner={(id) => handleOpenDesigner(id || activeScreenId)}
            onNavigateScreen={(targetId) => handleOpenRuntime(targetId)}
          />
        )}

        {viewMode === 'symbols' && (
          <ScadaSymbolLibrary
            onSelectSymbol={handleEditSymbol}
            onEditSymbol={handleEditSymbol}
            onNewSymbol={handleNewSymbol}
            onOpenDesigner={() => changeMode('designer')}
          />
        )}

        {viewMode === 'editor' && (
          <ScadaSymbolEditor
            initialSymbol={editingSymbol}
            onSaveSuccess={() => changeMode('symbols')}
            onCancel={() => changeMode('symbols')}
          />
        )}

        {viewMode === 'versions' && (
          <ScadaVersionHistory
            screenId={activeScreenId}
            onBack={() => changeMode('designer')}
            onRollbackComplete={() => changeMode('designer')}
          />
        )}

        {viewMode === 'templates' && (
          <ScadaTemplateLibrary
            onOpenDesigner={handleOpenDesigner}
            onOpenScreenList={() => changeMode('screens')}
          />
        )}
      </div>
    </div>
  );
}
