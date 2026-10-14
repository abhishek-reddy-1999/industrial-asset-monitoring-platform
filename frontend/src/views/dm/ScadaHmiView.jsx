import React, { useState } from 'react';
import { 
  Gauge, Activity, Sliders, Layers, RefreshCw, Cpu, 
  AlertTriangle, CheckCircle2, Shield, Radio, Terminal, ExternalLink
} from 'lucide-react';
import FuxaScadaWidget from '../../components/FuxaScadaWidget';
import { useDM } from './dmContext';

export default function ScadaHmiView() {
  const { 
    setActiveEntity, 
    refreshState,
    assets = [],
    devices = [],
    functionBlocks = []
  } = useDM();

  const [selectedUnit, setSelectedUnit] = useState(assets[0]?.id || '');

  return (
    <div className="p-6 space-y-6 bg-slate-950 text-slate-100 min-h-screen">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 rounded-xl text-cyan-400 shadow-inner">
            <Gauge className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white">FUXA SCADA HMI</h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Web-based SCADA Synoptic Active
              </span>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300">
                CENTUM VP DCS Emulation
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Real-time SVG process graphics with animated pipe flows, dynamic vessel liquid levels, rotating centrifugal pumps, interactive valves, and CENTUM VP PID Faceplates.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveEntity('function_block')}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-indigo-300 hover:text-white transition"
          >
            <Cpu className="w-4 h-4" />
            Function Blocks ({functionBlocks.length})
          </button>
          <button
            onClick={() => refreshState()}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg shadow-indigo-600/30 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Sync All
          </button>
        </div>
      </div>

      {/* Main FUXA SCADA Widget Component */}
      <FuxaScadaWidget 
        onOpenFunctionBlock={(fbId) => {
          setActiveEntity('function_block');
        }}
      />
    </div>
  );
}
