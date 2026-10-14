import React, { useState, useEffect } from 'react';
import { 
  History, ArrowLeft, RotateCcw, CheckCircle2, Clock, 
  FileText, ShieldCheck, Layers, RefreshCw, AlertCircle, Eye 
} from 'lucide-react';
import { fetchScadaVersions, rollbackScadaScreen } from '../../../api/client';

export default function ScadaVersionHistory({ 
  screenId, 
  onBack, 
  onRollbackComplete 
}) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [rollingBack, setRollingBack] = useState(false);
  const [error, setError] = useState(null);

  const loadVersions = async () => {
    try {
      setLoading(true);
      const data = await fetchScadaVersions(screenId);
      setVersions(data);
      if (data.length > 0) {
        setSelectedVersion(data[data.length - 1]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load versions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVersions();
  }, [screenId]);

  const handleRollback = async (verStr) => {
    if (!window.confirm(`Are you sure you want to rollback this screen to immutable version ${verStr}? Any unsaved draft changes will be replaced.`)) {
      return;
    }
    setRollingBack(true);
    try {
      await rollbackScadaScreen(screenId, verStr);
      await loadVersions();
      if (onRollbackComplete) onRollbackComplete();
    } catch (err) {
      setError(err.message || 'Rollback failed');
    } finally {
      setRollingBack(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#020617] text-slate-100 overflow-hidden">
      {/* Header */}
      <div className="h-14 border-b border-slate-800 bg-slate-900/90 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-md transition-colors"
              title="Back"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <History size={18} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              SCADA Screen Version History &amp; Immutable Audit Trail
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                ISO 27001 / IEC 62443 Compliant
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">
              Screen ID: <code className="text-sky-400 font-mono">{screenId}</code> — Inspect immutable release snapshots &amp; trigger rollback
            </p>
          </div>
        </div>

        <button
          onClick={loadVersions}
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
          title="Refresh"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Timeline List */}
        <div className="w-96 border-r border-slate-800 bg-slate-950 flex flex-col overflow-y-auto p-4 space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Publication Timeline ({versions.length} Releases)
          </div>

          {loading ? (
            <div className="h-32 flex items-center justify-center text-xs text-slate-500 gap-2">
              <RefreshCw size={14} className="animate-spin text-sky-400" />
              <span>Loading release history...</span>
            </div>
          ) : versions.length === 0 ? (
            <div className="h-32 flex flex-col items-center justify-center text-xs text-slate-500 gap-2">
              <History size={24} className="text-slate-600" />
              <span>No published releases yet (Screen is currently in Draft)</span>
            </div>
          ) : (
            versions.map((ver, idx) => {
              const isSelected = selectedVersion?.version === ver.version;
              const isLatest = idx === versions.length - 1;
              return (
                <div
                  key={ver.version}
                  onClick={() => setSelectedVersion(ver)}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all space-y-2 ${
                    isSelected
                      ? 'bg-indigo-500/10 border-indigo-500/40 shadow-lg shadow-indigo-500/5 ring-1 ring-indigo-500/20'
                      : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-100">
                        v{ver.version}
                      </span>
                      {isLatest && (
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded font-semibold uppercase">
                          Active
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                      <Clock size={10} />
                      {ver.published_at ? new Date(ver.published_at).toLocaleString() : 'N/A'}
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 font-sans line-clamp-2">
                    {ver.changelog || 'Automated release publish snapshot'}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-800/60">
                    <span>By: {ver.published_by || 'System'}</span>
                    <span>{(ver.screen_snapshot?.elements || []).length} elements</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Snapshot Details & Rollback Trigger */}
        {selectedVersion ? (
          <div className="flex-1 flex flex-col overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <span>Release Snapshot: v{selectedVersion.version}</span>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Immutable
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Published on {new Date(selectedVersion.published_at).toUTCString()} by {selectedVersion.published_by}
                </p>
              </div>

              <button
                onClick={() => handleRollback(selectedVersion.version)}
                disabled={rollingBack}
                className="px-4 py-2 rounded-md bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-amber-600/30 transition-colors"
              >
                <RotateCcw size={14} className={rollingBack ? 'animate-spin' : ''} />
                <span>{rollingBack ? 'Restoring Snapshot...' : `Rollback Screen to v${selectedVersion.version}`}</span>
              </button>
            </div>

            {/* Changelog Card */}
            <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Release Changelog &amp; Notes
              </span>
              <p className="text-xs text-slate-200 leading-relaxed font-sans">
                {selectedVersion.changelog || 'No release notes provided.'}
              </p>
            </div>

            {/* Elements Inventory */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Components in this Snapshot ({selectedVersion.screen_snapshot?.elements?.length || 0})
              </span>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {(selectedVersion.screen_snapshot?.elements || []).map((el, i) => (
                  <div
                    key={i}
                    className="p-3 rounded bg-slate-900/40 border border-slate-800 text-xs space-y-1 font-mono"
                  >
                    <div className="font-semibold text-slate-200 truncate">{el.label || el.instance_id}</div>
                    <div className="text-[10px] text-sky-400">{el.symbol_id}</div>
                    <div className="text-[10px] text-slate-500">
                      Pos: ({el.x}, {el.y}) | Dim: {el.width}×{el.height}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
            Select a version snapshot to inspect its configuration
          </div>
        )}
      </div>
    </div>
  );
}
