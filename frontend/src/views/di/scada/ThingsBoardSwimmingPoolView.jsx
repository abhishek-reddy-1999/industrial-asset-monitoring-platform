import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ArrowLeft, Thermometer, Activity, Power, ChevronUp, ChevronDown, 
  CheckCircle2, AlertTriangle, Gauge, Clock, Droplets, 
  RotateCw, Wind, Zap, Waves, Sparkles, Sliders, ShieldCheck,
  Box, RefreshCw, Layers, Cpu, Server, Radio, Terminal, 
  Settings, Play, Database, Search, ArrowRight, ExternalLink,
  X, Maximize2, Minimize2, FileText, Check, ListFilter
} from 'lucide-react';

// ============================================================================
// 1. HELPER: SVG REAL-TIME TREND CHART COMPONENT
// ============================================================================
function ScadaTrendChart({ 
  title, 
  subtitle = 'Realtime - last 1 hour', 
  currentVal, 
  uom = '', 
  data = [], 
  color = '#16a34a',
  min = 0,
  max = 100,
  thresholds = [],
  series = null // optional multi-series [{ name, color, data }]
}) {
  const width = 460;
  const height = 150;
  const padL = 40;
  const padR = 20;
  const padT = 20;
  const padB = 25;

  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  const renderPath = (pts, strokeColor) => {
    if (!pts || pts.length === 0) return '';
    const step = chartW / Math.max(1, pts.length - 1);
    return pts.map((val, idx) => {
      const x = padL + idx * step;
      const normalized = Math.max(0, Math.min(1, (val - min) / (max - min || 1)));
      const y = padT + (1 - normalized) * chartH;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm flex flex-col justify-between">
      {/* Title & Current Readout */}
      <div className="flex items-start justify-between mb-1">
        <div>
          <div className="text-xs font-bold text-slate-800">{title}</div>
          <div className="text-[10px] text-slate-400 font-sans">{subtitle}</div>
        </div>
        <div className="text-right">
          <span className="text-sm font-extrabold font-mono text-slate-900">
            {currentVal !== undefined ? currentVal : (data[data.length - 1] ?? '--')}
          </span>
          <span className="text-[10px] text-slate-500 font-semibold ml-1">{uom}</span>
        </div>
      </div>

      {/* Threshold Indicators */}
      {thresholds.length > 0 && (
        <div className="flex items-center gap-3 text-[9px] font-mono text-slate-500 mb-1">
          {thresholds.map((t, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.color }} />
              <span>{t.label}</span>
            </span>
          ))}
        </div>
      )}

      {/* SVG Canvas */}
      <div className="w-full h-[120px] relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id={`grad-${title.replace(/[^a-zA-Z0-9]/g, '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={padL} y1={padT} x2={width - padR} y2={padT} stroke="#f1f5f9" strokeWidth="1" />
          <line x1={padL} y1={padT + chartH * 0.33} x2={width - padR} y2={padT + chartH * 0.33} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
          <line x1={padL} y1={padT + chartH * 0.66} x2={width - padR} y2={padT + chartH * 0.66} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
          <line x1={padL} y1={padT + chartH} x2={width - padR} y2={padT + chartH} stroke="#e2e8f0" strokeWidth="1" />

          {/* Y Axis Labels */}
          <text x={padL - 6} y={padT + 4} fill="#94a3b8" fontSize="8" textAnchor="end" fontFamily="monospace">{max}</text>
          <text x={padL - 6} y={padT + chartH + 3} fill="#94a3b8" fontSize="8" textAnchor="end" fontFamily="monospace">{min}</text>

          {/* Multi Series Or Single Series */}
          {series ? (
            series.map((s, idx) => (
              <g key={idx}>
                <path d={renderPath(s.data, s.color)} fill="none" stroke={s.color} strokeWidth="1.8" strokeLinecap="round" />
              </g>
            ))
          ) : (
            <>
              {data.length > 1 && (
                <path 
                  d={`${renderPath(data, color)} L ${width - padR} ${padT + chartH} L ${padL} ${padT + chartH} Z`} 
                  fill={`url(#grad-${title.replace(/[^a-zA-Z0-9]/g, '')})`} 
                />
              )}
              <path d={renderPath(data, color)} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
            </>
          )}

          {data.length > 0 && !series && (
            <circle 
              cx={width - padR} 
              cy={padT + (1 - Math.max(0, Math.min(1, ((data[data.length - 1] - min) / (max - min || 1))))) * chartH} 
              r="3.5" 
              fill={color} 
              stroke="#ffffff" 
              strokeWidth="1.5" 
            />
          )}
        </svg>
      </div>
    </div>
  );
}

// ============================================================================
// 2. HELPER: ALARMS CARD
// ============================================================================
function AlarmsCard({ deviceName = 'Device' }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-800">Alarms</span>
          <span className="text-[10px] text-slate-400 font-sans">Realtime - last day</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <Search size={13} className="hover:text-slate-600 cursor-pointer" />
          <Sliders size={13} className="hover:text-slate-600 cursor-pointer" />
        </div>
      </div>

      <div className="h-28 flex flex-col items-center justify-center text-slate-400 text-xs">
        <CheckCircle2 size={24} className="text-emerald-500 mb-1" />
        <span className="font-semibold text-slate-600">No alarms found</span>
        <span className="text-[10px] text-slate-400">All operating parameters for {deviceName} within nominal limits</span>
      </div>

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
        <span>Items per page: 10</span>
        <span>1 - 0 of 0</span>
      </div>
    </div>
  );
}

// ============================================================================
// 3. SEPARATE WINDOW: EQUIPMENT TAG & TREND MONITOR DIALOG
// ============================================================================
export function EquipmentTrendWindow({
  device, // { id, name, type, image, tags, charts, controls }
  onClose,
  onOpenFullView,
  onUpdateControl,
  liveValues
}) {
  const [activeTab, setActiveTab] = useState('trends'); // 'trends' | 'tags' | 'controls' | 'alarms'
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [timeRange, setTimeRange] = useState('1h'); // '5m' | '1h' | '24h'

  // Pop out to a native standalone browser window
  const handlePopOut = () => {
    const w = 1040;
    const h = 760;
    const left = Math.max(50, (window.screen.width - w) / 2);
    const top = Math.max(50, (window.screen.height - h) / 2);
    const popup = window.open(
      '',
      `tb_monitor_${device.id}_${Date.now()}`,
      `width=${w},height=${h},top=${top},left=${left},resizable=yes,scrollbars=yes`
    );
    if (popup) {
      const primaryTag = (device.tags || [])[0] || { label: 'Metric', value: '--', uom: '' };
      popup.document.write(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>${device.name} — Realtime Equipment Telemetry Monitor</title>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif; background: #020617; color: #f8fafc; margin: 0; padding: 24px; }
            .glow-emerald { box-shadow: 0 0 15px rgba(16, 185, 129, 0.25); }
            .glow-sky { box-shadow: 0 0 15px rgba(14, 165, 233, 0.25); }
            @keyframes pulsePing { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.3); } }
            .animate-ping-slow { animation: pulsePing 2s cubic-bezier(0, 0, 0.2, 1) infinite; }
          </style>
        </head>
        <body class="bg-slate-950 text-slate-100 min-h-screen">
          <!-- Top Window Navigation Bar -->
          <div class="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 font-bold text-lg">
                &bull;&bull;&bull;
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h1 class="text-xl font-black text-sky-400 tracking-tight">${device.name}</h1>
                  <span class="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    ${device.type}
                  </span>
                </div>
                <p class="text-xs text-slate-400 font-mono mt-0.5">
                  ThingsBoard SCADA Dedicated Remote Equipment Diagnostic & Historical Trend Viewer
                </p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 glow-emerald">
                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping-slow"></span>
                <span>STREAM ACTIVE</span>
              </span>
              <button onclick="window.print()" class="px-3 py-1 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition">
                Print Inspection Log
              </button>
              <button onclick="window.close()" class="px-3 py-1 text-xs font-bold bg-rose-950 hover:bg-rose-900 text-rose-300 rounded-lg border border-rose-800 transition">
                Close Window
              </button>
            </div>
          </div>

          <!-- Quick Metrics Bar -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            ${(device.tags || []).slice(0, 4).map(t => `
              <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-lg">
                <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">${t.label}</span>
                <div class="flex items-baseline gap-1 my-2">
                  <span class="text-2xl font-black font-mono text-white" id="val-${t.tag.replace(/[^a-zA-Z0-9]/g, '_')}">${t.value}</span>
                  <span class="text-xs text-slate-400 font-bold">${t.uom || ''}</span>
                </div>
                <div class="flex items-center justify-between text-[11px] font-mono text-emerald-400">
                  <span>${t.tag}</span>
                  <span class="px-1.5 py-0.5 bg-emerald-950/60 rounded text-emerald-300 border border-emerald-800/40">GOOD (0x00)</span>
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Live Multi-Trace Trend Sparkline Graph -->
          <div class="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6 shadow-xl">
            <div class="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h2 class="text-sm font-bold text-white tracking-wide">Realtime Telemetry Process Curve</h2>
                <p class="text-xs text-slate-400">Continuous 1-second sampling with high/low threshold envelopes</p>
              </div>
              <div class="flex items-center gap-2 text-xs font-mono text-slate-400">
                <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span> Nominal</span>
                <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-amber-500"></span> Caution</span>
                <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-rose-500"></span> Safety Trip</span>
              </div>
            </div>
            
            <div class="w-full h-48 relative bg-slate-950/70 rounded-lg p-2 border border-slate-800/80">
              <svg viewBox="0 0 900 180" class="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="popGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.3"/>
                    <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.0"/>
                  </linearGradient>
                </defs>
                <!-- Grid Lines -->
                <line x1="40" y1="20" x2="880" y2="20" stroke="#1e293b" stroke-width="1" />
                <line x1="40" y1="70" x2="880" y2="70" stroke="#1e293b" stroke-width="1" stroke-dasharray="4 4" />
                <line x1="40" y1="120" x2="880" y2="120" stroke="#1e293b" stroke-width="1" stroke-dasharray="4 4" />
                <line x1="40" y1="160" x2="880" y2="160" stroke="#334155" stroke-width="1" />
                <!-- Axis labels -->
                <text x="32" y="24" fill="#64748b" font-size="10" text-anchor="end" font-family="monospace">HIGH</text>
                <text x="32" y="74" fill="#64748b" font-size="10" text-anchor="end" font-family="monospace">SP</text>
                <text x="32" y="164" fill="#64748b" font-size="10" text-anchor="end" font-family="monospace">0.0</text>
                <!-- Trend Path -->
                <path d="M 40 120 Q 150 90, 260 75 T 480 65 T 700 80 T 880 70 L 880 160 L 40 160 Z" fill="url(#popGrad)" />
                <path d="M 40 120 Q 150 90, 260 75 T 480 65 T 700 80 T 880 70" fill="none" stroke="#06b6d4" stroke-width="2.5" stroke-linecap="round" />
                <circle cx="880" cy="70" r="4" fill="#06b6d4" stroke="#ffffff" stroke-width="2" />
              </svg>
            </div>
          </div>

          <!-- Modbus Registers & Telemetry Table -->
          <div class="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
            <div class="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <h2 class="text-sm font-bold text-white tracking-wide">All Associated Modbus Field Registers & Telemetry Tags</h2>
              <span class="text-xs font-mono text-cyan-400">${(device.tags || []).length} Registers Configured</span>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="border-b border-slate-800 text-slate-400 font-semibold text-xs">
                    <th class="py-2.5 px-3">Modbus Address</th>
                    <th class="py-2.5 px-3">SCADA Tag Identifier</th>
                    <th class="py-2.5 px-3">Engineering Attribute</th>
                    <th class="py-2.5 px-3">Current Value</th>
                    <th class="py-2.5 px-3">Quality Code</th>
                    <th class="py-2.5 px-3 text-right">Last Scan</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800 font-mono">
                  ${(device.tags || []).map((t, i) => `
                    <tr class="hover:bg-slate-800/40 transition">
                      <td class="py-2.5 px-3 text-cyan-400 font-bold">${t.register || ('HR 4000' + (i+1))}</td>
                      <td class="py-2.5 px-3 text-slate-200">${t.tag}</td>
                      <td class="py-2.5 px-3 text-slate-400 font-sans font-medium">${t.label}</td>
                      <td class="py-2.5 px-3 text-emerald-400 font-bold">${t.value} ${t.uom || ''}</td>
                      <td class="py-2.5 px-3"><span class="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px]">0x00 GOOD</span></td>
                      <td class="py-2.5 px-3 text-right text-slate-500" id="time-${i}">Just now</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Live Heartbeat Script -->
          <script>
            let scan = 0;
            setInterval(() => {
              scan++;
              const now = new Date().toLocaleTimeString();
              const timeEls = document.querySelectorAll('[id^="time-"]');
              timeEls.forEach(el => { el.innerText = now; });
            }, 1000);
          </script>
        </body>
        </html>
      `);
      popup.document.close();
    }
  };

  // Minimized Floating Widget
  if (isMinimized) {
    const firstTag = (device.tags || [])[0];
    return (
      <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl p-3.5 flex items-center gap-3.5 text-white animate-fadeIn select-none ring-1 ring-sky-500/40">
        <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
          <Activity size={18} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white tracking-tight">{device.name.split(' ')[0]}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[10px] font-mono text-emerald-400 font-bold">LIVE DOCKED</span>
          </div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-sm font-black font-mono text-cyan-300">
              {firstTag?.value ?? '--'}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">{firstTag?.uom || ''}</span>
            <span className="text-[10px] text-slate-400 ml-1">({firstTag?.label || 'Reading'})</span>
          </div>
        </div>
        <div className="flex items-center gap-1 border-l border-slate-800 pl-2.5 ml-1">
          <button 
            onClick={handlePopOut} 
            className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded transition"
            title="Pop out in separate standalone browser window"
          >
            <ExternalLink size={14} />
          </button>
          <button 
            onClick={() => setIsMinimized(false)} 
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
            title="Restore Trend Window"
          >
            <Maximize2 size={14} />
          </button>
          <button 
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
            title="Close"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div 
        className={`bg-white rounded-2xl shadow-2xl border border-slate-300 flex flex-col overflow-hidden transition-all duration-200 ${
          isMaximized 
            ? 'w-[98vw] h-[95vh]' 
            : 'w-full max-w-4xl h-[720px] max-h-[92vh]'
        }`}
      >
        {/* =================================================================== */}
        {/* WINDOW TITLE BAR & CONTROLS                                         */}
        {/* =================================================================== */}
        <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between border-b border-slate-800 shrink-0 select-none">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-600/30 border border-sky-500/50 flex items-center justify-center text-sky-400">
              <Activity size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">{device.name}</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  {device.type}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold ml-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  ONLINE
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                ThingsBoard Tag Telemetry & Historic Trend Monitor Window
              </p>
            </div>
          </div>

          {/* Window Action Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePopOut}
              className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded transition"
              title="Pop out in separate browser window"
            >
              <ExternalLink size={14} />
            </button>
            <button
              onClick={() => onOpenFullView?.(device.id)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
              title="Switch to full screen device view"
            >
              <Layers size={14} />
            </button>
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
              title="Minimize to floating widget"
            >
              <Minimize2 size={14} />
            </button>
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
              title={isMaximized ? "Restore window" : "Maximize window"}
            >
              <Maximize2 size={14} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition ml-1"
              title="Close monitor window"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* =================================================================== */}
        {/* SUB-HEADER: TABS & TIME-RANGE SELECTOR                              */}
        {/* =================================================================== */}
        <div className="bg-slate-100/90 px-5 py-2 flex items-center justify-between border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-1">
            {[
              { id: 'trends', label: 'Live Trends & Charts', icon: Activity },
              { id: 'tags', label: 'All Tags & Registers', icon: Database },
              { id: 'controls', label: 'Manual Controls', icon: Sliders },
              { id: 'alarms', label: 'Alarms & Status', icon: AlertTriangle }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition ${
                    isActive 
                      ? 'bg-white text-slate-900 border border-slate-300 shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon size={13} className={isActive ? 'text-sky-600' : 'text-slate-400'} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {activeTab === 'trends' && (
            <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg border border-slate-300">
              {['5m', '15m', '1h', '24h'].map(t => (
                <button
                  key={t}
                  onClick={() => setTimeRange(t)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition ${
                    timeRange === t ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* =================================================================== */}
        {/* WINDOW CONTENT BODY                                                */}
        {/* =================================================================== */}
        <div className="flex-1 overflow-y-auto p-5 bg-[#f8fafc] flex flex-col gap-4">
          {/* TAB 1: LIVE TRENDS */}
          {activeTab === 'trends' && (
            <div className="space-y-4">
              {/* Top Quick KPI Strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(device.tags || []).slice(0, 4).map((t, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{t.label}</span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-base font-black font-mono text-slate-900">{t.value}</span>
                      <span className="text-xs text-slate-500 font-semibold">{t.uom || ''}</span>
                    </div>
                    <span className="text-[9px] font-mono text-emerald-600 flex items-center gap-1 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      GOOD &bull; {t.tag}
                    </span>
                  </div>
                ))}
              </div>

              {/* Grid of Dynamic Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(device.charts || []).map((ch, idx) => (
                  <ScadaTrendChart
                    key={idx}
                    title={ch.title}
                    uom={ch.uom}
                    currentVal={ch.currentVal}
                    data={ch.data}
                    min={ch.min}
                    max={ch.max}
                    color={ch.color}
                    thresholds={ch.thresholds}
                    series={ch.series}
                  />
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: ALL TAGS & MODBUS REGISTERS */}
          {activeTab === 'tags' && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-800">Telemetry Tag Catalog & Modbus Mapping</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                    {device.tags?.length || 0} Registers Mapped
                  </span>
                </div>

                <div className="overflow-x-auto mt-2">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-semibold text-[11px]">
                        <th className="py-2.5 px-3">Modbus Address</th>
                        <th className="py-2.5 px-3">SCADA Tag Name</th>
                        <th className="py-2.5 px-3">Engineering Attribute</th>
                        <th className="py-2.5 px-3">Live Value</th>
                        <th className="py-2.5 px-3">Quality</th>
                        <th className="py-2.5 px-3 text-right">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(device.tags || []).map((t, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 px-3 font-mono text-cyan-700 font-semibold text-[11px]">{t.register || `HR 4000${idx + 1}`}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-900 font-bold">{t.tag}</td>
                          <td className="py-2.5 px-3 text-slate-600">{t.label}</td>
                          <td className="py-2.5 px-3 font-mono font-extrabold text-slate-900">
                            {t.value} <span className="text-[10px] text-slate-500 font-normal">{t.uom || ''}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              GOOD (0x00)
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-[10px] text-slate-400">
                            Just now
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CONTROLS */}
          {activeTab === 'controls' && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800">Operational Manual Overrides & Setpoints</span>
                <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100 px-2 py-0.5 rounded-full">
                  REMOTE CONTROL ENABLED
                </span>
              </div>

              {device.controls}
            </div>
          )}

          {/* TAB 4: ALARMS */}
          {activeTab === 'alarms' && (
            <div className="space-y-4">
              <AlarmsCard deviceName={device.name} />
              
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2 text-xs">
                <div className="font-bold text-slate-800 pb-2 border-b border-slate-100">
                  Engineering Safety Trip Thresholds
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">High Pressure Trip</span>
                    <span className="text-sm font-bold text-slate-800 font-mono mt-0.5">5.2 bar</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Low Flow Cutoff</span>
                    <span className="text-sm font-bold text-slate-800 font-mono mt-0.5">60 L/min</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">High Temp Safety Trip</span>
                    <span className="text-sm font-bold text-slate-800 font-mono mt-0.5">42.0 °C</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* =================================================================== */}
        {/* WINDOW FOOTER BAR                                                   */}
        {/* =================================================================== */}
        <div className="bg-white px-5 py-2.5 border-t border-slate-200 flex items-center justify-between shrink-0 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Poll Rate: <strong>1000 ms</strong> &bull; Protocol: <strong>Modbus TCP / MQTT</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenFullView?.(device.id)}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-bold transition flex items-center gap-1"
            >
              <span>Full Screen View</span>
              <ArrowRight size={12} />
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded font-bold transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 3.5 STANDALONE HELPER TO BUILD SWIMMING POOL EQUIPMENT DEFINITIONS
// ============================================================================
export function getSwimmingPoolEquipmentDefs({
  pumpRunning = true,
  heaterRunning = true,
  targetTemp = 36.0,
  filterMode = 'Filter',
  flowRate = 198,
  filterDp = 0.42,
  poolTemp = 35.9,
  outdoorTemp = 32.4,
  poolVolume = 55000,
  poolLevel = 98.2,
  poolPh = 7.35,
  poolOrp = 715,
  rpmTrend = null,
  flowTrend = null,
  pressureTrend = null,
  vibrationTrend = null,
  powerTrend = null,
  tempMultiSeries = null,
  togglePump = () => {},
  toggleHeater = () => {},
  selectFilterMode = () => {},
  handleTempDelta = () => {}
} = {}) {
  const rTrend = rpmTrend || Array.from({ length: 30 }, (_, i) => pumpRunning ? (2120 + Math.sin(i * 0.9) * 200) : 0);
  const fTrend = flowTrend || Array.from({ length: 30 }, (_, i) => pumpRunning ? (198 + Math.sin(i * 0.7) * 4) : 0);
  const pTrend = pressureTrend || Array.from({ length: 30 }, (_, i) => pumpRunning ? Number((4.4 + Math.sin(i * 0.5) * 0.2).toFixed(2)) : 0.8);
  const vTrend = vibrationTrend || Array.from({ length: 30 }, (_, i) => pumpRunning ? Number((1.05 + Math.sin(i * 1.2) * 0.4).toFixed(2)) : 0.05);
  const pwTrend = powerTrend || Array.from({ length: 30 }, (_, i) => Math.round((pumpRunning ? 65 : 0) + (heaterRunning ? 55 : 0) + Math.sin(i * 0.4) * 6));
  const tSeries = tempMultiSeries || [
    { name: 'target', color: '#16a34a', data: Array(30).fill(targetTemp) },
    { name: 'currentIn', color: '#0284c7', data: Array.from({ length: 30 }, (_, i) => Number(poolTemp) + Math.sin(i * 0.2) * 0.3) },
    { name: 'currentOut', color: '#dc2626', data: Array.from({ length: 30 }, (_, i) => Number(poolTemp) + (heaterRunning ? 1.8 : 0) + Math.sin(i * 0.2) * 0.3) },
    { name: 'ambient', color: '#a855f7', data: Array(30).fill(Number(outdoorTemp)) }
  ];

  return {
    'sand-filter': {
      id: 'sand-filter',
      name: 'SF-201 Commercial Sand Filter with Multi-Port Valve',
      type: 'High-Rate Filtration Plant',
      tags: [
        { tag: 'FILTER_MODE.VAL', label: 'Multiport Valve Mode', value: filterMode, register: 'Holding Reg 40010' },
        { tag: 'FILTER_DP.PV', label: 'Differential Pressure (dP)', value: filterDp, uom: 'bar', register: 'Input Reg 30012' },
        { tag: 'FLOW_RATE.PV', label: 'Circulation Flow Rate', value: flowRate, uom: 'L/min', register: 'Input Reg 30014' },
        { tag: 'FILTER_PRESSURE.PV', label: 'Vessel Pressure', value: pTrend[pTrend.length - 1], uom: 'bar', register: 'Input Reg 30016' },
        { tag: 'VIBRATION.PV', label: 'Filter Vibration', value: vTrend[vTrend.length - 1], uom: 'mm/s', register: 'Input Reg 30018' },
        { tag: 'TURBIDITY.PV', label: 'Filtrate Turbidity', value: 0.18, uom: 'NTU', register: 'Input Reg 30020' }
      ],
      charts: [
        { title: 'Rotation speed', uom: 'RPM', currentVal: pumpRunning ? 2120 : 0, data: rTrend, min: 600, max: 2400, color: '#16a34a' },
        { title: 'Flow rate', uom: 'L/min', currentVal: flowRate, data: fTrend, min: 80, max: 200, color: '#0284c7' },
        { title: 'Vibration', uom: 'mm/s', currentVal: vTrend[vTrend.length - 1], data: vTrend, min: 0, max: 2.5, color: '#16a34a' },
        { title: 'Pressure', uom: 'bar', currentVal: pTrend[pTrend.length - 1], data: pTrend, min: 3.0, max: 5.0, color: '#16a34a' }
      ],
      controls: (
        <div className="space-y-3">
          <span className="text-xs text-slate-500 font-semibold block">Select Multi-Port Valve Operational Mode:</span>
          <div className="grid grid-cols-3 gap-2">
            {['Filter', 'Waste', 'Backwash', 'Recirculate', 'Rinse', 'Closed'].map(m => (
              <button
                key={m}
                onClick={() => selectFilterMode(m)}
                className={`p-2.5 rounded-lg text-xs font-bold border transition flex items-center justify-between ${
                  filterMode === m 
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-300' 
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{m}</span>
                {filterMode === m && <Check size={14} className="text-emerald-600" />}
              </button>
            ))}
          </div>
        </div>
      )
    },

    'water-pump': {
      id: 'water-pump',
      name: 'P-101 Heavy Industrial Circulation Pump',
      type: 'Centrifugal TEFC Motor Assembly',
      tags: [
        { tag: 'FILTER_PUMP.RUN', label: 'Motor Run Command', value: pumpRunning ? 'RUNNING' : 'STOPPED', register: 'Coil 00001' },
        { tag: 'FLOW_RATE.PV', label: 'Discharge Flow Rate', value: flowRate, uom: 'L/min', register: 'Input Reg 30002' },
        { tag: 'PUMP_SPEED.PV', label: 'Inverter Speed', value: pumpRunning ? 2150 : 0, uom: 'RPM', register: 'Input Reg 30004' },
        { tag: 'PUMP_POWER.PV', label: 'Electrical Power', value: pumpRunning ? 104 : 0, uom: 'kWh', register: 'Input Reg 30006' },
        { tag: 'PUMP_TEMP.PV', label: 'Stator Winding Temp', value: pumpRunning ? 63.5 : 24.0, uom: '°C', register: 'Input Reg 30008' },
        { tag: 'VIBRATION.PV', label: 'Bearing Vibration', value: vTrend[vTrend.length - 1], uom: 'mm/s', register: 'Input Reg 30010' }
      ],
      charts: [
        { title: 'Flow rate', uom: 'L/min', currentVal: flowRate, data: fTrend, min: 80, max: 200, color: '#16a34a' },
        { title: 'Rotation speed', uom: 'RPM', currentVal: pumpRunning ? 2120 : 0, data: rTrend, min: 1600, max: 2400, color: '#16a34a' },
        { title: 'Power consumption', uom: 'kWh', currentVal: pumpRunning ? 104 : 0, data: pwTrend, min: 80, max: 120, color: '#16a34a' },
        { title: 'Vibration', uom: 'mm/s', currentVal: vTrend[vTrend.length - 1], data: vTrend, min: 0, max: 2.0, color: '#16a34a' }
      ],
      controls: (
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <div className="text-xs font-bold text-slate-800">Primary Motor Contactor</div>
            <div className="text-[11px] text-slate-400">Energize or isolate the 3-phase TEFC drive</div>
          </div>
          <button
            onClick={togglePump}
            className={`px-4 py-2 rounded-lg text-xs font-bold text-white transition flex items-center gap-2 shadow-sm ${
              pumpRunning ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            <Power size={14} />
            <span>{pumpRunning ? 'STOP PUMP' : 'START PUMP'}</span>
          </button>
        </div>
      )
    },

    'heat-pump': {
      id: 'heat-pump',
      name: 'HP-301 Commercial Inverter Pool Heat Pump',
      type: 'Air-Source Chiller / Heat Exchanger',
      tags: [
        { tag: 'HEAT_PUMP.RUN', label: 'Compressor State', value: heaterRunning ? 'RUNNING' : 'STOPPED', register: 'Coil 00005' },
        { tag: 'TARGET_TEMP.SP', label: 'Target Temperature SP', value: targetTemp.toFixed(1), uom: '°C', register: 'Holding Reg 40020' },
        { tag: 'POOL_TEMP.PV', label: 'Water Inlet Temp', value: poolTemp, uom: '°C', register: 'Input Reg 30022' },
        { tag: 'OUTDOOR_TEMP.PV', label: 'Ambient Air Temp', value: outdoorTemp, uom: '°C', register: 'Input Reg 30024' },
        { tag: 'COMPRESSOR_TEMP.PV', label: 'Discharge Gas Temp', value: 56.2, uom: '°C', register: 'Input Reg 30026' },
        { tag: 'REFRIGERANT_P.PV', label: 'Suction Pressure', value: 2.8, uom: 'bar', register: 'Input Reg 30028' }
      ],
      charts: [
        { title: 'Temperature Curves', uom: '°C', currentVal: `${poolTemp} °C`, series: tSeries, min: 20, max: 45 },
        { title: 'Compressor temperature', uom: '°C', currentVal: 56.2, data: Array.from({ length: 30 }, (_, i) => 55 + Math.sin(i * 0.8) * 3), min: 45, max: 65, color: '#16a34a' },
        { title: 'Power consumption', uom: 'kWh', currentVal: heaterRunning ? 115 : 0, data: pwTrend, min: 0, max: 300, color: '#16a34a' },
        { title: 'Refrigerant pressure', uom: 'bar', currentVal: 2.8, data: Array.from({ length: 30 }, (_, i) => 2.8 + Math.sin(i * 1.1) * 0.15), min: 1.0, max: 4.0, color: '#16a34a' }
      ],
      controls: (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-800">Inverter Compressor Power</span>
            <button
              onClick={toggleHeater}
              className={`px-4 py-2 rounded-lg text-xs font-bold text-white transition flex items-center gap-2 ${
                heaterRunning ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <Power size={14} />
              <span>{heaterRunning ? 'SHUTDOWN' : 'ACTIVATE'}</span>
            </button>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Temperature Setpoint (SP)</span>
              <span className="text-[11px] text-slate-500">Thermostatic PID target regulation</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-lg font-black font-mono text-cyan-600 bg-white px-3 py-1 rounded-lg border border-slate-300">
                {targetTemp.toFixed(1)} °C
              </span>
              <div className="flex flex-col gap-1">
                <button onClick={() => handleTempDelta(0.5)} className="p-1 bg-white hover:bg-slate-100 rounded border border-slate-300">
                  <ChevronUp size={14} />
                </button>
                <button onClick={() => handleTempDelta(-0.5)} className="p-1 bg-white hover:bg-slate-100 rounded border border-slate-300">
                  <ChevronDown size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    },

    'pool': {
      id: 'pool',
      name: 'POOL-01 Commercial Basin & Reservoir',
      type: '55,000 L Recirculation Volume',
      tags: [
        { tag: 'POOL_VOLUME.PV', label: 'Stored Water Volume', value: poolVolume, uom: 'L', register: 'Input Reg 30030' },
        { tag: 'POOL_LEVEL.PV', label: 'Skimmer Level', value: poolLevel, uom: '%', register: 'Input Reg 30032' },
        { tag: 'POOL_TEMP.PV', label: 'Basin Temperature', value: poolTemp, uom: '°C', register: 'Input Reg 30034' },
        { tag: 'POOL_PH.PV', label: 'Water pH Level', value: poolPh, uom: 'pH', register: 'Input Reg 30036' },
        { tag: 'POOL_ORP.PV', label: 'Redox Potential', value: poolOrp, uom: 'mV', register: 'Input Reg 30038' },
        { tag: 'POOL_STATUS', label: 'System Mode', value: 'Active', register: 'Holding Reg 40001' }
      ],
      charts: [
        { title: 'Pool Volume', uom: 'L', currentVal: poolVolume, data: Array(30).fill(poolVolume), min: 40000, max: 60000, color: '#0284c7' },
        { title: 'Water Level %', uom: '%', currentVal: poolLevel, data: Array.from({ length: 30 }, (_, i) => 98.2 + Math.sin(i * 0.4) * 0.6), min: 80, max: 100, color: '#16a34a' },
        { title: 'Water Temperature', uom: '°C', currentVal: poolTemp, data: Array.from({ length: 30 }, (_, i) => Number(poolTemp) + Math.sin(i * 0.3) * 0.2), min: 30, max: 40, color: '#f59e0b' },
        { title: 'pH Chemistry', uom: 'pH', currentVal: poolPh, data: Array.from({ length: 30 }, (_, i) => Number(poolPh) + Math.sin(i * 0.5) * 0.08), min: 7.0, max: 7.8, color: '#16a34a' }
      ],
      controls: (
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
          <span className="font-bold text-slate-800 block">Basin Water Make-Up & Drainage</span>
          <div className="flex gap-2">
            <button className="flex-1 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg transition">
              Trigger Fresh Water Refill
            </button>
            <button className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition">
              Emergency Basin Drain
            </button>
          </div>
        </div>
      )
    },

    'flowmeter': {
      id: 'flowmeter',
      name: 'FT-101 Digital Electromagnetic Flow Transmitter',
      type: 'Inline Magmeter / Signal Converter',
      tags: [
        { tag: 'FLOW_RATE.PV', label: 'Instantaneous Flow Rate', value: flowRate, uom: 'L/min', register: 'Input Reg 30002' },
        { tag: 'FLOW_TOTAL.PV', label: 'Accumulated Total Volume', value: '143.2', uom: 'm³', register: 'Input Reg 30044' },
        { tag: 'FLOW_VELOCITY.PV', label: 'Pipe Fluid Velocity', value: pumpRunning ? (flowRate / 95).toFixed(2) : '0.00', uom: 'm/s', register: 'Input Reg 30046' },
        { tag: 'ELECTRODE_SIGNAL.PV', label: 'Sensor Electrode Health', value: pumpRunning ? '99.4' : '12.0', uom: '%', register: 'Input Reg 30048' },
        { tag: 'EMPTY_PIPE_DETECTION', label: 'Pipe Status', value: pumpRunning ? 'FULL' : 'NO_FLOW', register: 'Discrete In 10004' }
      ],
      charts: [
        { title: 'Circulation Flow Rate', uom: 'L/min', currentVal: flowRate, data: fTrend, min: 0, max: 240, color: '#0284c7' },
        { title: 'Fluid Velocity', uom: 'm/s', currentVal: pumpRunning ? Number((flowRate / 95).toFixed(2)) : 0, data: fTrend.map(v => Number((v / 95).toFixed(2))), min: 0, max: 3.0, color: '#16a34a' }
      ],
      controls: (
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-3">
          <span className="font-bold text-slate-800 block">Flow Transmitter Calibration & Zeroing</span>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg transition">
              Reset Accumulated Totalizer
            </button>
            <button className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition">
              Zero Point Calibration
            </button>
          </div>
        </div>
      )
    },

    'ph-canister': {
      id: 'ph-canister',
      name: 'CH-401 Automated Chemical Dosing & Disinfection Cell',
      type: 'Potentiostatic pH / ORP Injection Controller',
      tags: [
        { tag: 'POOL_PH.PV', label: 'Potentiometric pH Sensor', value: poolPh, uom: 'pH', register: 'Input Reg 30036' },
        { tag: 'POOL_ORP.PV', label: 'Redox Potential (ORP)', value: poolOrp, uom: 'mV', register: 'Input Reg 30038' },
        { tag: 'FREE_CHLORINE.PV', label: 'Free Available Chlorine', value: '2.15', uom: 'ppm', register: 'Input Reg 30050' },
        { tag: 'DOSING_PUMP_RATE', label: 'Peristaltic Dosing Rate', value: '14.2', uom: 'mL/min', register: 'Input Reg 30052' },
        { tag: 'ACID_TANK_LEVEL', label: 'Acid Chemical Tank (HCl)', value: '84.5', uom: '%', register: 'Input Reg 30054' },
        { tag: 'CHLORINE_TANK_LEVEL', label: 'Chlorine Reservoir (NaOCl)', value: '78.0', uom: '%', register: 'Input Reg 30056' },
        { tag: 'DOSING_MODE', label: 'Auto PID Controller Mode', value: 'AUTO_PROPORTIONAL', register: 'Holding Reg 40030' }
      ],
      charts: [
        { title: 'Water pH Value', uom: 'pH', currentVal: poolPh, data: Array.from({ length: 30 }, (_, i) => Number(poolPh) + Math.sin(i * 0.5) * 0.08), min: 7.0, max: 7.8, color: '#16a34a', thresholds: [{ label: 'Ideal 7.2-7.6', color: '#16a34a' }] },
        { title: 'ORP Redox Potential', uom: 'mV', currentVal: poolOrp, data: Array.from({ length: 30 }, (_, i) => Number(poolOrp) + Math.sin(i * 0.4) * 8), min: 650, max: 800, color: '#0284c7', thresholds: [{ label: '> 700 mV Sanitized', color: '#16a34a' }] }
      ],
      controls: (
        <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
          <span className="font-bold text-slate-800 block">Manual Chemical Injection Boost Pulse</span>
          <div className="grid grid-cols-2 gap-2">
            <button className="py-2 px-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg transition">
              Inject pH- Acid Pulse (50 mL)
            </button>
            <button className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition">
              Inject Chlorine Shock (100 mL)
            </button>
          </div>
        </div>
      )
    },

    'gateway': {
      id: 'gateway',
      name: 'GW-900 ThingsBoard Modbus IoT Edge Gateway',
      type: 'Industrial ARM Linux Gateway / Edge Node',
      tags: [
        { tag: 'GW_STATUS', label: 'Cloud Broker Uplink', value: 'CONNECTED', register: 'Status' },
        { tag: 'MQTT_LATENCY', label: 'Round-Trip Latency', value: '18', uom: 'ms', register: 'Metrics' },
        { tag: 'MODBUS_POLL_RATE', label: 'Field Scan Cycle Interval', value: '1000', uom: 'ms', register: 'Config' },
        { tag: 'TELEMETRY_INGEST_RATE', label: 'Active Ingest Rate', value: '48', uom: 'tags/sec', register: 'Metrics' },
        { tag: 'EDGE_QUEUE_BUFFER', label: 'Local Flash Telemetry Spool', value: '0', uom: 'events', register: 'Diagnostics' }
      ],
      charts: [
        { title: 'MQTT Round-Trip Ping', uom: 'ms', currentVal: 18, data: Array.from({ length: 30 }, (_, i) => 18 + Math.sin(i * 0.8) * 3), min: 10, max: 40, color: '#16a34a' },
        { title: 'Telemetry Throughput', uom: 'tags/s', currentVal: 48, data: Array(30).fill(48), min: 0, max: 80, color: '#0284c7' }
      ],
      controls: (
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
          <span className="font-bold text-slate-800 block">Gateway Diagnostic Commands</span>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition">
              Force Instant Telemetry Push
            </button>
            <button className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition">
              Reconnect MQTT Transport
            </button>
          </div>
        </div>
      )
    }
  };
}

// ============================================================================
// 4. MAIN THINGSBOARD SWIMMING POOL VIEW
// ============================================================================
export default function ThingsBoardSwimmingPoolView({ 
  telemetry = {}, 
  onUpdateTelemetry,
  onOpenDesigner 
}) {
  // Top View Mode: 'traditional' | 'hi-perf'
  const [viewMode, setViewMode] = useState('traditional');

  // Full Screen Device View in Traditional: null (mimic) | 'sand-filter' | 'water-pump' | 'heat-pump' | 'gateway' | 'pool'
  const [deviceState, setDeviceState] = useState(null);

  // SEPARATE WINDOW: Active equipment popup monitor dialog (null | 'sand-filter' | 'water-pump' | 'heat-pump' | 'pool' | 'gateway')
  const [monitorWindowDevice, setMonitorWindowDevice] = useState(null);

  // Hi-Perf Sub-Tabs: 'main' | 'pump' | 'heater' | 'filter' | 'alarms'
  const [hpTab, setHpTab] = useState('main');

  // Local interactive operational overrides
  const [pumpRunning, setPumpRunning] = useState(true);
  const [heaterRunning, setHeaterRunning] = useState(true);
  const [targetTemp, setTargetTemp] = useState(36.0);
  const [filterMode, setFilterMode] = useState('Filter'); // 'Filter' | 'Waste' | 'Backwash' | 'Recirculate' | 'Rinse' | 'Closed'

  // Operational valves states (true = OPEN / 100%, false = CLOSED / 0%)
  const [valvesState, setValvesState] = useState({
    'valve-1': true,   // V-01 Skimmer Suction (Green Vertical)
    'valve-2': true,   // V-02 Water Supply Make-Up (Green Horizontal)
    'valve-3': true,   // V-03 Bottom Drain Suction (Green Vertical)
    'valve-4': true,   // V-04 Pump Discharge Isolation (Green Horizontal)
    'valve-5': false,  // V-05 Waste & Backwash Drain (Green Vertical, normally closed)
    'valve-6': true,   // V-06 Heat Pump Inlet (Green Vertical)
    'valve-7': true,   // V-07 Heat Pump Outlet (Green Vertical)
    'valve-8': false,  // V-08 Heat Pump Bypass (Black Horizontal, normally closed)
    'valve-9': true    // V-09 Pool Return Line Spoke Gate Valve
  });

  const toggleValve = (valveId) => {
    setValvesState(prev => {
      const nextVal = !prev[valveId];
      const updated = { ...prev, [valveId]: nextVal };
      if (onUpdateTelemetry) {
        const tagKey = `${valveId.toUpperCase().replace('-', '_')}.POS`;
        onUpdateTelemetry({ [tagKey]: { value: nextVal ? 100 : 0, uom: '%' } });
      }
      return updated;
    });
  };

  // Derive live values with graceful fallbacks
  const outdoorTemp = Number(telemetry['OUTDOOR_TEMP.PV']?.value ?? 26.6).toFixed(1);
  const poolTemp = Number(telemetry['POOL_TEMP.PV']?.value ?? 35.9).toFixed(1);
  const poolVolume = Number(telemetry['POOL_VOLUME.PV']?.value ?? 55000);
  const poolLevel = Number(telemetry['POOL_LEVEL.PV']?.value ?? 98.2).toFixed(1);
  const flowRate = Math.round(Number(telemetry['FLOW_RATE.PV']?.value ?? 198));
  const poolPh = Number(telemetry['POOL_PH.PV']?.value ?? 7.35).toFixed(2);
  const poolOrp = Math.round(Number(telemetry['POOL_ORP.PV']?.value ?? 715));
  const filterDp = Number(telemetry['FILTER_DP.PV']?.value ?? 0.42).toFixed(2);

  // Time-step for live animated trends
  const [timeStep, setTimeStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeStep(s => s + 1);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  // Sync state if telemetry updates from backend
  useEffect(() => {
    if (telemetry['FILTER_PUMP.RUN']?.value !== undefined) {
      setPumpRunning(Boolean(telemetry['FILTER_PUMP.RUN'].value));
    }
    if (telemetry['HEAT_PUMP.RUN']?.value !== undefined) {
      setHeaterRunning(Boolean(telemetry['HEAT_PUMP.RUN'].value));
    }
    if (telemetry['TARGET_TEMP.SP']?.value !== undefined) {
      setTargetTemp(Number(telemetry['TARGET_TEMP.SP'].value));
    }
    if (telemetry['FILTER_MODE.VAL']?.value) {
      setFilterMode(String(telemetry['FILTER_MODE.VAL'].value));
    }
    ['valve-1', 'valve-2', 'valve-3', 'valve-4', 'valve-5', 'valve-6', 'valve-7', 'valve-8', 'valve-9'].forEach(vId => {
      const tagKey = `${vId.toUpperCase().replace('-', '_')}.POS`;
      if (telemetry[tagKey]?.value !== undefined) {
        setValvesState(prev => ({ ...prev, [vId]: telemetry[tagKey].value > 0 }));
      }
    });
  }, [telemetry]);

  // Handle Target Temp Adjustments
  const handleTempDelta = (delta) => {
    setTargetTemp(prev => {
      const next = Number((prev + delta).toFixed(1));
      if (onUpdateTelemetry) {
        onUpdateTelemetry({ 'TARGET_TEMP.SP': { value: next, uom: '°C' } });
      }
      return next;
    });
  };

  // Handle Pump Toggle
  const togglePump = () => {
    const next = !pumpRunning;
    setPumpRunning(next);
    if (onUpdateTelemetry) {
      onUpdateTelemetry({ 'FILTER_PUMP.RUN': { value: next ? 1 : 0 } });
    }
  };

  // Handle Heater Toggle
  const toggleHeater = () => {
    const next = !heaterRunning;
    setHeaterRunning(next);
    if (onUpdateTelemetry) {
      onUpdateTelemetry({ 'HEAT_PUMP.RUN': { value: next ? 1 : 0 } });
    }
  };

  // Handle Filter Mode Select
  const selectFilterMode = (mode) => {
    setFilterMode(mode);
    if (onUpdateTelemetry) {
      onUpdateTelemetry({ 'FILTER_MODE.VAL': { value: mode } });
    }
  };

  // Synthetic Historical Curves
  const flowTrend = useMemo(() => {
    const base = pumpRunning ? 198 : 0;
    return Array.from({ length: 30 }, (_, i) => {
      if (!pumpRunning) return 0;
      if (filterMode === 'Backwash' && i > 24) return 85;
      return base + Math.sin((i + timeStep) * 0.7) * 4 + ((i % 3) - 1) * 1.5;
    });
  }, [pumpRunning, filterMode, timeStep]);

  const rpmTrend = useMemo(() => {
    const base = pumpRunning ? 2150 : 0;
    return Array.from({ length: 30 }, (_, i) => {
      if (!pumpRunning) return 0;
      return base + Math.sin((i + timeStep) * 0.9) * 280 + ((i % 5) - 2) * 40;
    });
  }, [pumpRunning, timeStep]);

  const pressureTrend = useMemo(() => {
    const base = pumpRunning ? 4.4 : 0.8;
    return Array.from({ length: 30 }, (_, i) => {
      if (!pumpRunning) return 0.8;
      return Number((base + Math.sin((i + timeStep) * 0.5) * 0.25).toFixed(2));
    });
  }, [pumpRunning, timeStep]);

  const vibrationTrend = useMemo(() => {
    const base = pumpRunning ? 1.05 : 0.05;
    return Array.from({ length: 30 }, (_, i) => {
      if (!pumpRunning) return 0.05;
      return Number((base + Math.sin((i + timeStep) * 1.2) * 0.45).toFixed(2));
    });
  }, [pumpRunning, timeStep]);

  const powerTrend = useMemo(() => {
    const base = (pumpRunning ? 65 : 0) + (heaterRunning ? 55 : 0);
    return Array.from({ length: 30 }, (_, i) => {
      return base + Math.sin((i + timeStep) * 0.4) * 8;
    });
  }, [pumpRunning, heaterRunning, timeStep]);

  const tempMultiSeries = useMemo(() => {
    return [
      { name: 'target', color: '#16a34a', data: Array(30).fill(targetTemp) },
      { name: 'currentIn', color: '#0284c7', data: Array.from({ length: 30 }, (_, i) => Number(poolTemp) + Math.sin((i + timeStep) * 0.2) * 0.3) },
      { name: 'currentOut', color: '#dc2626', data: Array.from({ length: 30 }, (_, i) => Number(poolTemp) + (heaterRunning ? 1.8 : 0) + Math.sin((i + timeStep) * 0.2) * 0.3) },
      { name: 'ambient', color: '#a855f7', data: Array(30).fill(Number(outdoorTemp)) }
    ];
  }, [targetTemp, poolTemp, heaterRunning, outdoorTemp, timeStep]);

  // Equipment Metadata Config for the Separate Monitor Window
  const equipmentMonitorDefs = useMemo(() => {
    return {
      'sand-filter': {
        id: 'sand-filter',
        name: 'SF-201 Commercial Sand Filter with Multi-Port Valve',
        type: 'High-Rate Filtration Plant',
        tags: [
          { tag: 'FILTER_MODE.VAL', label: 'Multiport Valve Mode', value: filterMode, register: 'Holding Reg 40010' },
          { tag: 'FILTER_DP.PV', label: 'Differential Pressure (dP)', value: filterDp, uom: 'bar', register: 'Input Reg 30012' },
          { tag: 'FLOW_RATE.PV', label: 'Circulation Flow Rate', value: flowRate, uom: 'L/min', register: 'Input Reg 30014' },
          { tag: 'FILTER_PRESSURE.PV', label: 'Vessel Pressure', value: pressureTrend[pressureTrend.length - 1], uom: 'bar', register: 'Input Reg 30016' },
          { tag: 'VIBRATION.PV', label: 'Filter Vibration', value: vibrationTrend[vibrationTrend.length - 1], uom: 'mm/s', register: 'Input Reg 30018' },
          { tag: 'TURBIDITY.PV', label: 'Filtrate Turbidity', value: 0.18, uom: 'NTU', register: 'Input Reg 30020' }
        ],
        charts: [
          { title: 'Rotation speed', uom: 'RPM', currentVal: pumpRunning ? 2120 : 0, data: rpmTrend, min: 600, max: 2400, color: '#16a34a', thresholds: [{ label: '< 800', color: '#ef4444' }, { label: '800-2400', color: '#16a34a' }] },
          { title: 'Flow rate', uom: 'L/min', currentVal: flowRate, data: flowTrend, min: 80, max: 200, color: '#0284c7' },
          { title: 'Vibration', uom: 'mm/s', currentVal: vibrationTrend[vibrationTrend.length - 1], data: vibrationTrend, min: 0, max: 2.5, color: '#16a34a' },
          { title: 'Pressure', uom: 'bar', currentVal: pressureTrend[pressureTrend.length - 1], data: pressureTrend, min: 3.0, max: 5.0, color: '#16a34a' }
        ],
        controls: (
          <div className="space-y-3">
            <span className="text-xs text-slate-500 font-semibold block">Select Multi-Port Valve Operational Mode:</span>
            <div className="grid grid-cols-3 gap-2">
              {['Filter', 'Waste', 'Backwash', 'Recirculate', 'Rinse', 'Closed'].map(m => (
                <button
                  key={m}
                  onClick={() => selectFilterMode(m)}
                  className={`p-2.5 rounded-lg text-xs font-bold border transition flex items-center justify-between ${
                    filterMode === m 
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-300' 
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{m}</span>
                  {filterMode === m && <Check size={14} className="text-emerald-600" />}
                </button>
              ))}
            </div>
          </div>
        )
      },

      'water-pump': {
        id: 'water-pump',
        name: 'P-101 Heavy Industrial Circulation Pump',
        type: 'Centrifugal TEFC Motor Assembly',
        tags: [
          { tag: 'FILTER_PUMP.RUN', label: 'Motor Run Command', value: pumpRunning ? 'RUNNING' : 'STOPPED', register: 'Coil 00001' },
          { tag: 'FLOW_RATE.PV', label: 'Discharge Flow Rate', value: flowRate, uom: 'L/min', register: 'Input Reg 30002' },
          { tag: 'PUMP_SPEED.PV', label: 'Inverter Speed', value: pumpRunning ? 2150 : 0, uom: 'RPM', register: 'Input Reg 30004' },
          { tag: 'PUMP_POWER.PV', label: 'Electrical Power', value: pumpRunning ? 104 : 0, uom: 'kWh', register: 'Input Reg 30006' },
          { tag: 'PUMP_TEMP.PV', label: 'Stator Winding Temp', value: pumpRunning ? 63.5 : 24.0, uom: '°C', register: 'Input Reg 30008' },
          { tag: 'VIBRATION.PV', label: 'Bearing Vibration', value: vibrationTrend[vibrationTrend.length - 1], uom: 'mm/s', register: 'Input Reg 30010' }
        ],
        charts: [
          { title: 'Flow rate', uom: 'L/min', currentVal: flowRate, data: flowTrend, min: 80, max: 200, color: '#16a34a' },
          { title: 'Rotation speed', uom: 'RPM', currentVal: pumpRunning ? 2120 : 0, data: rpmTrend, min: 1600, max: 2400, color: '#16a34a' },
          { title: 'Power consumption', uom: 'kWh', currentVal: pumpRunning ? 104 : 0, data: powerTrend, min: 80, max: 120, color: '#16a34a' },
          { title: 'Vibration', uom: 'mm/s', currentVal: vibrationTrend[vibrationTrend.length - 1], data: vibrationTrend, min: 0, max: 2.0, color: '#16a34a' }
        ],
        controls: (
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <div className="text-xs font-bold text-slate-800">Primary Motor Contactor</div>
              <div className="text-[11px] text-slate-400">Energize or isolate the 3-phase TEFC drive</div>
            </div>
            <button
              onClick={togglePump}
              className={`px-4 py-2 rounded-lg text-xs font-bold text-white transition flex items-center gap-2 shadow-sm ${
                pumpRunning ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <Power size={14} />
              <span>{pumpRunning ? 'STOP PUMP' : 'START PUMP'}</span>
            </button>
          </div>
        )
      },

      'heat-pump': {
        id: 'heat-pump',
        name: 'HP-301 Commercial Inverter Pool Heat Pump',
        type: 'Air-Source Chiller / Heat Exchanger',
        tags: [
          { tag: 'HEAT_PUMP.RUN', label: 'Compressor State', value: heaterRunning ? 'RUNNING' : 'STOPPED', register: 'Coil 00005' },
          { tag: 'TARGET_TEMP.SP', label: 'Target Temperature SP', value: targetTemp.toFixed(1), uom: '°C', register: 'Holding Reg 40020' },
          { tag: 'POOL_TEMP.PV', label: 'Water Inlet Temp', value: poolTemp, uom: '°C', register: 'Input Reg 30022' },
          { tag: 'OUTDOOR_TEMP.PV', label: 'Ambient Air Temp', value: outdoorTemp, uom: '°C', register: 'Input Reg 30024' },
          { tag: 'COMPRESSOR_TEMP.PV', label: 'Discharge Gas Temp', value: 56.2, uom: '°C', register: 'Input Reg 30026' },
          { tag: 'REFRIGERANT_P.PV', label: 'Suction Pressure', value: 2.8, uom: 'bar', register: 'Input Reg 30028' }
        ],
        charts: [
          { title: 'Temperature Curves', uom: '°C', currentVal: `${poolTemp} °C`, series: tempMultiSeries, min: 20, max: 45 },
          { title: 'Compressor temperature', uom: '°C', currentVal: 56.2, data: Array.from({ length: 30 }, (_, i) => 55 + Math.sin(i * 0.8) * 3), min: 45, max: 65, color: '#16a34a' },
          { title: 'Power consumption', uom: 'kWh', currentVal: heaterRunning ? 115 : 0, data: powerTrend, min: 0, max: 300, color: '#16a34a' },
          { title: 'Refrigerant pressure', uom: 'bar', currentVal: 2.8, data: Array.from({ length: 30 }, (_, i) => 2.8 + Math.sin(i * 1.1) * 0.15), min: 1.0, max: 4.0, color: '#16a34a' }
        ],
        controls: (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-800">Inverter Compressor Power</span>
              <button
                onClick={toggleHeater}
                className={`px-4 py-2 rounded-lg text-xs font-bold text-white transition flex items-center gap-2 ${
                  heaterRunning ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                <Power size={14} />
                <span>{heaterRunning ? 'SHUTDOWN' : 'ACTIVATE'}</span>
              </button>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Temperature Setpoint (SP)</span>
                <span className="text-[11px] text-slate-500">Thermostatic PID target regulation</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-black font-mono text-cyan-600 bg-white px-3 py-1 rounded-lg border border-slate-300">
                  {targetTemp.toFixed(1)} °C
                </span>
                <div className="flex flex-col gap-1">
                  <button onClick={() => handleTempDelta(0.5)} className="p-1 bg-white hover:bg-slate-100 rounded border border-slate-300">
                    <ChevronUp size={14} />
                  </button>
                  <button onClick={() => handleTempDelta(-0.5)} className="p-1 bg-white hover:bg-slate-100 rounded border border-slate-300">
                    <ChevronDown size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      },

      'pool': {
        id: 'pool',
        name: 'POOL-01 Commercial Basin & Reservoir',
        type: '55,000 L Recirculation Volume',
        tags: [
          { tag: 'POOL_VOLUME.PV', label: 'Stored Water Volume', value: poolVolume, uom: 'L', register: 'Input Reg 30030' },
          { tag: 'POOL_LEVEL.PV', label: 'Skimmer Level', value: poolLevel, uom: '%', register: 'Input Reg 30032' },
          { tag: 'POOL_TEMP.PV', label: 'Basin Temperature', value: poolTemp, uom: '°C', register: 'Input Reg 30034' },
          { tag: 'POOL_PH.PV', label: 'Water pH Level', value: poolPh, uom: 'pH', register: 'Input Reg 30036' },
          { tag: 'POOL_ORP.PV', label: 'Redox Potential', value: poolOrp, uom: 'mV', register: 'Input Reg 30038' },
          { tag: 'POOL_STATUS', label: 'System Mode', value: 'Active', register: 'Holding Reg 40001' }
        ],
        charts: [
          { title: 'Pool Volume', uom: 'L', currentVal: poolVolume, data: Array(30).fill(poolVolume), min: 40000, max: 60000, color: '#0284c7' },
          { title: 'Water Level %', uom: '%', currentVal: poolLevel, data: Array.from({ length: 30 }, (_, i) => 98.2 + Math.sin(i * 0.4) * 0.6), min: 80, max: 100, color: '#16a34a' },
          { title: 'Water Temperature', uom: '°C', currentVal: poolTemp, data: Array.from({ length: 30 }, (_, i) => Number(poolTemp) + Math.sin(i * 0.3) * 0.2), min: 30, max: 40, color: '#f59e0b' },
          { title: 'pH Chemistry', uom: 'pH', currentVal: poolPh, data: Array.from({ length: 30 }, (_, i) => Number(poolPh) + Math.sin(i * 0.5) * 0.08), min: 7.0, max: 7.8, color: '#16a34a' }
        ],
        controls: (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
            <span className="font-bold text-slate-800 block">Basin Water Make-Up & Drainage</span>
            <div className="flex gap-2">
              <button className="flex-1 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg transition">
                Trigger Fresh Water Refill
              </button>
              <button className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition">
                Emergency Basin Drain
              </button>
            </div>
          </div>
        )
      },

      'flowmeter': {
        id: 'flowmeter',
        name: 'FT-101 Digital Electromagnetic Flow Transmitter',
        type: 'Inline Magmeter / Signal Converter',
        tags: [
          { tag: 'FLOW_RATE.PV', label: 'Instantaneous Flow Rate', value: flowRate, uom: 'L/min', register: 'Input Reg 30002' },
          { tag: 'FLOW_TOTAL.PV', label: 'Accumulated Total Volume', value: (142.8 + (timeStep * 0.05)).toFixed(1), uom: 'm³', register: 'Input Reg 30044' },
          { tag: 'FLOW_VELOCITY.PV', label: 'Pipe Fluid Velocity', value: pumpRunning ? (flowRate / 95).toFixed(2) : '0.00', uom: 'm/s', register: 'Input Reg 30046' },
          { tag: 'ELECTRODE_SIGNAL.PV', label: 'Sensor Electrode Health', value: pumpRunning ? '99.4' : '12.0', uom: '%', register: 'Input Reg 30048' },
          { tag: 'EMPTY_PIPE_DETECTION', label: 'Pipe Status', value: pumpRunning ? 'FULL' : 'NO_FLOW', register: 'Discrete In 10004' }
        ],
        charts: [
          { title: 'Circulation Flow Rate', uom: 'L/min', currentVal: flowRate, data: flowTrend, min: 0, max: 240, color: '#0284c7' },
          { title: 'Fluid Velocity', uom: 'm/s', currentVal: pumpRunning ? Number((flowRate / 95).toFixed(2)) : 0, data: flowTrend.map(v => Number((v / 95).toFixed(2))), min: 0, max: 3.0, color: '#16a34a' }
        ],
        controls: (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-3">
            <span className="font-bold text-slate-800 block">Flow Transmitter Calibration & Zeroing</span>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg transition">
                Reset Accumulated Totalizer
              </button>
              <button className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition">
                Zero Point Calibration
              </button>
            </div>
          </div>
        )
      },

      'ph-canister': {
        id: 'ph-canister',
        name: 'CH-401 Automated Chemical Dosing & Disinfection Cell',
        type: 'Potentiostatic pH / ORP Injection Controller',
        tags: [
          { tag: 'POOL_PH.PV', label: 'Potentiometric pH Sensor', value: poolPh, uom: 'pH', register: 'Input Reg 30036' },
          { tag: 'POOL_ORP.PV', label: 'Redox Potential (ORP)', value: poolOrp, uom: 'mV', register: 'Input Reg 30038' },
          { tag: 'FREE_CHLORINE.PV', label: 'Free Available Chlorine', value: '2.15', uom: 'ppm', register: 'Input Reg 30050' },
          { tag: 'DOSING_PUMP_RATE', label: 'Peristaltic Dosing Rate', value: '14.2', uom: 'mL/min', register: 'Input Reg 30052' },
          { tag: 'ACID_TANK_LEVEL', label: 'Acid Chemical Tank (HCl)', value: '84.5', uom: '%', register: 'Input Reg 30054' },
          { tag: 'CHLORINE_TANK_LEVEL', label: 'Chlorine Reservoir (NaOCl)', value: '78.0', uom: '%', register: 'Input Reg 30056' },
          { tag: 'DOSING_MODE', label: 'Auto PID Controller Mode', value: 'AUTO_PROPORTIONAL', register: 'Holding Reg 40030' }
        ],
        charts: [
          { title: 'Water pH Value', uom: 'pH', currentVal: poolPh, data: Array.from({ length: 30 }, (_, i) => Number(poolPh) + Math.sin(i * 0.5) * 0.08), min: 7.0, max: 7.8, color: '#16a34a', thresholds: [{ label: 'Ideal 7.2-7.6', color: '#16a34a' }] },
          { title: 'ORP Redox Potential', uom: 'mV', currentVal: poolOrp, data: Array.from({ length: 30 }, (_, i) => Number(poolOrp) + Math.sin(i * 0.4) * 8), min: 650, max: 800, color: '#0284c7', thresholds: [{ label: '> 700 mV Sanitized', color: '#16a34a' }] }
        ],
        controls: (
          <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <span className="font-bold text-slate-800 block">Manual Chemical Injection Boost Pulse</span>
            <div className="grid grid-cols-2 gap-2">
              <button className="py-2 px-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg transition">
                Inject pH- Acid Pulse (50 mL)
              </button>
              <button className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition">
                Inject Chlorine Shock (100 mL)
              </button>
            </div>
          </div>
        )
      },

      'gateway': {
        id: 'gateway',
        name: 'GW-900 ThingsBoard Modbus IoT Edge Gateway',
        type: 'Industrial ARM Linux Gateway / Edge Node',
        tags: [
          { tag: 'GW_STATUS', label: 'Cloud Broker Uplink', value: 'CONNECTED', register: 'Status' },
          { tag: 'MQTT_LATENCY', label: 'Round-Trip Latency', value: '18', uom: 'ms', register: 'Metrics' },
          { tag: 'MODBUS_POLL_RATE', label: 'Field Scan Cycle Interval', value: '1000', uom: 'ms', register: 'Config' },
          { tag: 'TELEMETRY_INGEST_RATE', label: 'Active Ingest Rate', value: '48', uom: 'tags/sec', register: 'Metrics' },
          { tag: 'EDGE_QUEUE_BUFFER', label: 'Local Flash Telemetry Spool', value: '0', uom: 'events', register: 'Diagnostics' }
        ],
        charts: [
          { title: 'MQTT Round-Trip Ping', uom: 'ms', currentVal: 18, data: Array.from({ length: 30 }, (_, i) => 18 + Math.sin(i * 0.8) * 3), min: 10, max: 40, color: '#16a34a' },
          { title: 'Telemetry Throughput', uom: 'tags/s', currentVal: 48, data: Array(30).fill(48), min: 0, max: 80, color: '#0284c7' }
        ],
        controls: (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
            <span className="font-bold text-slate-800 block">Gateway Diagnostic Commands</span>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition">
                Force Instant Telemetry Push
              </button>
              <button className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition">
                Reconnect MQTT Transport
              </button>
            </div>
          </div>
        )
      },

      'valve-1': {
        id: 'valve-1',
        name: 'V-01 Skimmer Suction Isolation Valve',
        type: 'Quarter-Turn Motorized Ball Valve (DN80)',
        tags: [
          { tag: 'VALVE_1.POS', label: 'Valve Position', value: valvesState['valve-1'] ? '100' : '0', uom: '%', register: 'Coil 00011' },
          { tag: 'VALVE_1.STATE', label: 'Operating State', value: valvesState['valve-1'] ? 'OPEN' : 'CLOSED', register: 'Status' },
          { tag: 'VALVE_1.FLOW', label: 'Line Flow Rate', value: valvesState['valve-1'] ? Math.round(flowRate * 0.55) : 0, uom: 'L/min', register: 'Input Reg 30040' },
          { tag: 'VALVE_1.TORQUE', label: 'Actuator Torque', value: valvesState['valve-1'] ? '12.4' : '0.0', uom: 'Nm', register: 'Diagnostics' }
        ],
        charts: [
          { title: 'Valve Position', uom: '%', currentVal: valvesState['valve-1'] ? 100 : 0, data: Array(30).fill(valvesState['valve-1'] ? 100 : 0), min: 0, max: 100, color: '#16a34a' },
          { title: 'Line Flow', uom: 'L/min', currentVal: valvesState['valve-1'] ? Math.round(flowRate * 0.55) : 0, data: Array(30).fill(valvesState['valve-1'] ? Math.round(flowRate * 0.55) : 0), min: 0, max: 150, color: '#0284c7' }
        ],
        controls: (
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Skimmer Isolation Actuator</span>
              <span className="text-[11px] text-slate-500">Current status: {valvesState['valve-1'] ? 'OPEN (Permitting Skimmer Inflow)' : 'CLOSED (Skimmer Isolated)'}</span>
            </div>
            <button
              onClick={() => toggleValve('valve-1')}
              className={`px-4 py-2 rounded-lg text-xs font-bold text-white transition flex items-center gap-2 shadow-sm ${
                valvesState['valve-1'] ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <Power size={14} />
              <span>{valvesState['valve-1'] ? 'CLOSE VALVE' : 'OPEN VALVE'}</span>
            </button>
          </div>
        )
      },

      'valve-2': {
        id: 'valve-2',
        name: 'V-02 Fresh Water Make-Up Supply Valve',
        type: 'Automated Potable Make-Up Solenoid/Ball Valve',
        tags: [
          { tag: 'VALVE_2.POS', label: 'Valve Position', value: valvesState['valve-2'] ? '100' : '0', uom: '%', register: 'Coil 00012' },
          { tag: 'VALVE_2.STATE', label: 'Operating State', value: valvesState['valve-2'] ? 'OPEN' : 'CLOSED', register: 'Status' },
          { tag: 'SUPPLY_PRESSURE', label: 'Mains Supply Pressure', value: '3.8', uom: 'bar', register: 'Input Reg 30042' },
          { tag: 'INFLOW_RATE', label: 'Fresh Water Inflow', value: valvesState['valve-2'] ? '15.4' : '0.0', uom: 'L/min', register: 'Input Reg 30044' }
        ],
        charts: [
          { title: 'Valve Position', uom: '%', currentVal: valvesState['valve-2'] ? 100 : 0, data: Array(30).fill(valvesState['valve-2'] ? 100 : 0), min: 0, max: 100, color: '#16a34a' },
          { title: 'Mains Inflow', uom: 'L/min', currentVal: valvesState['valve-2'] ? 15.4 : 0, data: Array(30).fill(valvesState['valve-2'] ? 15.4 : 0), min: 0, max: 30, color: '#0284c7' }
        ],
        controls: (
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Mains Water Supply Make-Up</span>
              <span className="text-[11px] text-slate-500">Replenishes pool water from municipal supply</span>
            </div>
            <button
              onClick={() => toggleValve('valve-2')}
              className={`px-4 py-2 rounded-lg text-xs font-bold text-white transition flex items-center gap-2 shadow-sm ${
                valvesState['valve-2'] ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <Power size={14} />
              <span>{valvesState['valve-2'] ? 'CLOSE VALVE' : 'OPEN VALVE'}</span>
            </button>
          </div>
        )
      },

      'valve-3': {
        id: 'valve-3',
        name: 'V-03 Main Drain Bottom Suction Valve',
        type: 'Basin Floor Hydrostatic Suction Valve (DN100)',
        tags: [
          { tag: 'VALVE_3.POS', label: 'Valve Position', value: valvesState['valve-3'] ? '100' : '0', uom: '%', register: 'Coil 00013' },
          { tag: 'VALVE_3.STATE', label: 'Operating State', value: valvesState['valve-3'] ? 'OPEN' : 'CLOSED', register: 'Status' },
          { tag: 'DRAIN_SUCTION_FLOW', label: 'Bottom Suction Flow', value: valvesState['valve-3'] ? Math.round(flowRate * 0.45) : 0, uom: 'L/min', register: 'Input Reg 30046' },
          { tag: 'BASIN_PRESSURE', label: 'Bottom Hydrostatic Head', value: '1.45', uom: 'bar', register: 'Input Reg 30048' }
        ],
        charts: [
          { title: 'Valve Position', uom: '%', currentVal: valvesState['valve-3'] ? 100 : 0, data: Array(30).fill(valvesState['valve-3'] ? 100 : 0), min: 0, max: 100, color: '#16a34a' },
          { title: 'Bottom Flow', uom: 'L/min', currentVal: valvesState['valve-3'] ? Math.round(flowRate * 0.45) : 0, data: Array(30).fill(valvesState['valve-3'] ? Math.round(flowRate * 0.45) : 0), min: 0, max: 150, color: '#0284c7' }
        ],
        controls: (
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Pool Floor Main Drain Header</span>
              <span className="text-[11px] text-slate-500">Draws heavy sediment and deep pool water to the filtration loop</span>
            </div>
            <button
              onClick={() => toggleValve('valve-3')}
              className={`px-4 py-2 rounded-lg text-xs font-bold text-white transition flex items-center gap-2 shadow-sm ${
                valvesState['valve-3'] ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <Power size={14} />
              <span>{valvesState['valve-3'] ? 'CLOSE VALVE' : 'OPEN VALVE'}</span>
            </button>
          </div>
        )
      },

      'valve-4': {
        id: 'valve-4',
        name: 'V-04 Pump Discharge Isolation Valve',
        type: 'High-Pressure Centrifugal Discharge Gate/Ball Valve',
        tags: [
          { tag: 'VALVE_4.POS', label: 'Valve Position', value: valvesState['valve-4'] ? '100' : '0', uom: '%', register: 'Coil 00014' },
          { tag: 'VALVE_4.STATE', label: 'Operating State', value: valvesState['valve-4'] ? 'OPEN' : 'CLOSED', register: 'Status' },
          { tag: 'DISCHARGE_PRESSURE', label: 'Discharge Manifold Pressure', value: pumpRunning && valvesState['valve-4'] ? '4.2' : '0.4', uom: 'bar', register: 'Input Reg 30050' },
          { tag: 'FLOW_RATE', label: 'Delivered Flow', value: pumpRunning && valvesState['valve-4'] ? flowRate : 0, uom: 'L/min', register: 'Input Reg 30052' }
        ],
        charts: [
          { title: 'Valve Position', uom: '%', currentVal: valvesState['valve-4'] ? 100 : 0, data: Array(30).fill(valvesState['valve-4'] ? 100 : 0), min: 0, max: 100, color: '#16a34a' },
          { title: 'Discharge Pressure', uom: 'bar', currentVal: pumpRunning && valvesState['valve-4'] ? 4.2 : 0.4, data: Array(30).fill(pumpRunning && valvesState['valve-4'] ? 4.2 : 0.4), min: 0, max: 6.0, color: '#16a34a' }
        ],
        controls: (
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Circulation Pump Discharge Isolator</span>
              <span className="text-[11px] text-slate-500">Isolates P-101 discharge line before the Sand Filter multi-port manifold</span>
            </div>
            <button
              onClick={() => toggleValve('valve-4')}
              className={`px-4 py-2 rounded-lg text-xs font-bold text-white transition flex items-center gap-2 shadow-sm ${
                valvesState['valve-4'] ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <Power size={14} />
              <span>{valvesState['valve-4'] ? 'CLOSE VALVE' : 'OPEN VALVE'}</span>
            </button>
          </div>
        )
      },

      'valve-5': {
        id: 'valve-5',
        name: 'V-05 Waste & Backwash Drain Valve',
        type: 'Waste Effluent Isolation Valve (Normally Closed)',
        tags: [
          { tag: 'VALVE_5.POS', label: 'Valve Position', value: valvesState['valve-5'] ? '100' : '0', uom: '%', register: 'Coil 00015' },
          { tag: 'VALVE_5.STATE', label: 'Operating State', value: valvesState['valve-5'] ? 'OPEN' : 'CLOSED', register: 'Status' },
          { tag: 'EFFLUENT_FLOW', label: 'Waste Drainage Flow', value: valvesState['valve-5'] ? '198' : '0', uom: 'L/min', register: 'Input Reg 30054' },
          { tag: 'DRAIN_TURBIDITY', label: 'Waste Turbidity', value: valvesState['valve-5'] ? '4.8' : '0.0', uom: 'NTU', register: 'Input Reg 30056' }
        ],
        charts: [
          { title: 'Valve Position', uom: '%', currentVal: valvesState['valve-5'] ? 100 : 0, data: Array(30).fill(valvesState['valve-5'] ? 100 : 0), min: 0, max: 100, color: '#dc2626' },
          { title: 'Waste Flow Rate', uom: 'L/min', currentVal: valvesState['valve-5'] ? 198 : 0, data: Array(30).fill(valvesState['valve-5'] ? 198 : 0), min: 0, max: 250, color: '#0284c7' }
        ],
        controls: (
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Wastewater Drain Header</span>
              <span className="text-[11px] text-slate-500">Opens to purge contaminated backwash effluent to municipal sewer</span>
            </div>
            <button
              onClick={() => toggleValve('valve-5')}
              className={`px-4 py-2 rounded-lg text-xs font-bold text-white transition flex items-center gap-2 shadow-sm ${
                valvesState['valve-5'] ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <Power size={14} />
              <span>{valvesState['valve-5'] ? 'CLOSE VALVE' : 'OPEN VALVE'}</span>
            </button>
          </div>
        )
      },

      'valve-6': {
        id: 'valve-6',
        name: 'V-06 Heat Pump Inflow Diverter Valve',
        type: 'Thermal Loop Diverter Valve (Inlet)',
        tags: [
          { tag: 'VALVE_6.POS', label: 'Valve Position', value: valvesState['valve-6'] ? '100' : '0', uom: '%', register: 'Coil 00016' },
          { tag: 'VALVE_6.STATE', label: 'Operating State', value: valvesState['valve-6'] ? 'OPEN' : 'CLOSED', register: 'Status' },
          { tag: 'HEATER_IN_TEMP', label: 'Heat Exchanger Water In', value: poolTemp, uom: '°C', register: 'Input Reg 30058' },
          { tag: 'HEATER_IN_FLOW', label: 'Heat Exchanger Flow', value: valvesState['valve-6'] ? flowRate : 0, uom: 'L/min', register: 'Input Reg 30060' }
        ],
        charts: [
          { title: 'Valve Position', uom: '%', currentVal: valvesState['valve-6'] ? 100 : 0, data: Array(30).fill(valvesState['valve-6'] ? 100 : 0), min: 0, max: 100, color: '#16a34a' },
          { title: 'Inflow Temp', uom: '°C', currentVal: poolTemp, data: Array(30).fill(Number(poolTemp)), min: 20, max: 45, color: '#0284c7' }
        ],
        controls: (
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Heat Pump Inlet Isolation</span>
              <span className="text-[11px] text-slate-500">Controls filtered water entry into the HP-301 heat exchanger</span>
            </div>
            <button
              onClick={() => toggleValve('valve-6')}
              className={`px-4 py-2 rounded-lg text-xs font-bold text-white transition flex items-center gap-2 shadow-sm ${
                valvesState['valve-6'] ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <Power size={14} />
              <span>{valvesState['valve-6'] ? 'CLOSE VALVE' : 'OPEN VALVE'}</span>
            </button>
          </div>
        )
      },

      'valve-7': {
        id: 'valve-7',
        name: 'V-07 Heat Pump Outflow Valve',
        type: 'Thermal Loop Return Valve (Outlet)',
        tags: [
          { tag: 'VALVE_7.POS', label: 'Valve Position', value: valvesState['valve-7'] ? '100' : '0', uom: '%', register: 'Coil 00017' },
          { tag: 'VALVE_7.STATE', label: 'Operating State', value: valvesState['valve-7'] ? 'OPEN' : 'CLOSED', register: 'Status' },
          { tag: 'HEATER_OUT_TEMP', label: 'Heated Water Temp Out', value: (Number(poolTemp) + (heaterRunning ? 1.8 : 0)).toFixed(1), uom: '°C', register: 'Input Reg 30062' },
          { tag: 'HEAT_OUTPUT', label: 'Delivered Thermal Power', value: heaterRunning ? '18.5' : '0.0', uom: 'kW', register: 'Input Reg 30064' }
        ],
        charts: [
          { title: 'Valve Position', uom: '%', currentVal: valvesState['valve-7'] ? 100 : 0, data: Array(30).fill(valvesState['valve-7'] ? 100 : 0), min: 0, max: 100, color: '#16a34a' },
          { title: 'Delivered Temp', uom: '°C', currentVal: (Number(poolTemp) + (heaterRunning ? 1.8 : 0)).toFixed(1), data: Array(30).fill(Number(poolTemp) + (heaterRunning ? 1.8 : 0)), min: 20, max: 45, color: '#dc2626' }
        ],
        controls: (
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Heat Pump Outlet Return</span>
              <span className="text-[11px] text-slate-500">Channels warmed water from HP-301 to the pool return manifold</span>
            </div>
            <button
              onClick={() => toggleValve('valve-7')}
              className={`px-4 py-2 rounded-lg text-xs font-bold text-white transition flex items-center gap-2 shadow-sm ${
                valvesState['valve-7'] ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <Power size={14} />
              <span>{valvesState['valve-7'] ? 'CLOSE VALVE' : 'OPEN VALVE'}</span>
            </button>
          </div>
        )
      },

      'valve-8': {
        id: 'valve-8',
        name: 'V-08 Heat Pump Bypass Valve',
        type: 'Direct Bypass Line Valve (Normally Closed, Black Body)',
        tags: [
          { tag: 'VALVE_8.POS', label: 'Valve Position', value: valvesState['valve-8'] ? '100' : '0', uom: '%', register: 'Coil 00018' },
          { tag: 'VALVE_8.STATE', label: 'Operating State', value: valvesState['valve-8'] ? 'OPEN' : 'CLOSED', register: 'Status' },
          { tag: 'BYPASS_FLOW', label: 'Bypass Line Flow', value: valvesState['valve-8'] ? flowRate : '0', uom: 'L/min', register: 'Input Reg 30066' },
          { tag: 'SYSTEM_DELTA_P', label: 'Loop Resistance dP', value: '0.12', uom: 'bar', register: 'Input Reg 30068' }
        ],
        charts: [
          { title: 'Valve Position', uom: '%', currentVal: valvesState['valve-8'] ? 100 : 0, data: Array(30).fill(valvesState['valve-8'] ? 100 : 0), min: 0, max: 100, color: '#64748b' },
          { title: 'Bypass Flow', uom: 'L/min', currentVal: valvesState['valve-8'] ? flowRate : 0, data: Array(30).fill(valvesState['valve-8'] ? flowRate : 0), min: 0, max: 200, color: '#0284c7' }
        ],
        controls: (
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Heater Bypass Loop</span>
              <span className="text-[11px] text-slate-500">Opens to bypass HP-301 entirely during servicing or summer passive circulation</span>
            </div>
            <button
              onClick={() => toggleValve('valve-8')}
              className={`px-4 py-2 rounded-lg text-xs font-bold text-white transition flex items-center gap-2 shadow-sm ${
                valvesState['valve-8'] ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-800 hover:bg-slate-900'
              }`}
            >
              <Power size={14} />
              <span>{valvesState['valve-8'] ? 'CLOSE BYPASS' : 'OPEN BYPASS'}</span>
            </button>
          </div>
        )
      },

      'valve-9': {
        id: 'valve-9',
        name: 'V-09 Main Pool Return Spoke Gate Valve',
        type: 'Multi-Turn Handwheel Spoke Gate Valve (DN100)',
        tags: [
          { tag: 'VALVE_9.POS', label: 'Valve Position', value: valvesState['valve-9'] ? '100' : '0', uom: '%', register: 'Coil 00019' },
          { tag: 'VALVE_9.STATE', label: 'Operating State', value: valvesState['valve-9'] ? 'OPEN' : 'CLOSED', register: 'Status' },
          { tag: 'RETURN_FLOW', label: 'Basin Return Flow', value: valvesState['valve-9'] ? flowRate : '0', uom: 'L/min', register: 'Input Reg 30070' },
          { tag: 'RETURN_PRESSURE', label: 'Return Line Head Loss', value: valvesState['valve-9'] ? '0.85' : '0.0', uom: 'bar', register: 'Input Reg 30072' }
        ],
        charts: [
          { title: 'Valve Position', uom: '%', currentVal: valvesState['valve-9'] ? 100 : 0, data: Array(30).fill(valvesState['valve-9'] ? 100 : 0), min: 0, max: 100, color: '#16a34a' },
          { title: 'Return Velocity', uom: 'm/s', currentVal: valvesState['valve-9'] ? 1.65 : 0, data: Array(30).fill(valvesState['valve-9'] ? 1.65 : 0), min: 0, max: 3.0, color: '#0284c7' }
        ],
        controls: (
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Main Return Header Gate Valve</span>
              <span className="text-[11px] text-slate-500">Regulates conditioned water injection back into pool basin perimeter jets</span>
            </div>
            <button
              onClick={() => toggleValve('valve-9')}
              className={`px-4 py-2 rounded-lg text-xs font-bold text-white transition flex items-center gap-2 shadow-sm ${
                valvesState['valve-9'] ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <Power size={14} />
              <span>{valvesState['valve-9'] ? 'CLOSE VALVE' : 'OPEN VALVE'}</span>
            </button>
          </div>
        )
      },

      'strainer': {
        id: 'strainer',
        name: 'ST-101 Hair & Lint Strainer Basket Pot',
        type: 'Inline Pre-Filter with Polycarbonate Transparent Cover',
        tags: [
          { tag: 'STRAINER_DP', label: 'Basket Differential Pressure', value: '0.08', uom: 'bar', register: 'Input Reg 30074' },
          { tag: 'BASKET_FOULING', label: 'Fouling Factor', value: '12', uom: '%', register: 'Diagnostics' },
          { tag: 'LID_SEAL_STATUS', label: 'Vacuum Seal Integrity', value: 'TIGHT (0x00)', register: 'Status' },
          { tag: 'CLEAN_INTERVAL', label: 'Run Hours Since Cleaned', value: '42.5', uom: 'hrs', register: 'Maintenance' }
        ],
        charts: [
          { title: 'Basket dP', uom: 'bar', currentVal: 0.08, data: Array(30).fill(0.08), min: 0, max: 0.5, color: '#16a34a' },
          { title: 'Basket Fouling %', uom: '%', currentVal: 12, data: Array(30).fill(12), min: 0, max: 100, color: '#0284c7' }
        ],
        controls: (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-slate-800 block">Pre-Filter Maintenance</span>
              <span className="text-[11px] text-slate-500">Clear basket trap of coarse debris before pump impeller</span>
            </div>
            <button className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg transition">
              Log Basket Cleaned
            </button>
          </div>
        )
      },

      'water-level': {
        id: 'water-level',
        name: 'LT-101 Basin Water Level Dial Gauge',
        type: 'Continuous Hydrostatic / Ultrasonic Level Gauge',
        tags: [
          { tag: 'POOL_LEVEL.PV', label: 'Basin Water Level', value: poolLevel, uom: '%', register: 'Input Reg 30076' },
          { tag: 'SKIMMER_FREEBOARD', label: 'Weir Freeboard Margin', value: '12.4', uom: 'cm', register: 'Input Reg 30078' },
          { tag: 'AUTO_TOPUP_REQ', label: 'Automatic Fill Request', value: poolLevel < 95 ? 'ACTIVE' : 'STANDBY', register: 'Status' }
        ],
        charts: [
          { title: 'Basin Level %', uom: '%', currentVal: poolLevel, data: Array.from({ length: 30 }, (_, i) => Number(poolLevel) + Math.sin(i * 0.3) * 0.2), min: 80, max: 105, color: '#0284c7' }
        ],
        controls: (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-slate-800 block">Auto Water Replenish</span>
              <span className="text-[11px] text-slate-500">Target Level: 98.0% - 100.0%</span>
            </div>
            <button 
              onClick={() => toggleValve('valve-2')}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition"
            >
              Trigger Top-Up Solenoid
            </button>
          </div>
        )
      },

      'water-supply': {
        id: 'water-supply',
        name: 'WS-100 Municipal Fresh Water Make-Up Header',
        type: 'Potable Water Inflow & RPZ Backflow Preventer',
        tags: [
          { tag: 'SUPPLY_MAINS_P', label: 'City Water Pressure', value: '3.8', uom: 'bar', register: 'Input Reg 30080' },
          { tag: 'DAILY_INFLOW', label: 'Accumulated Today', value: '420', uom: 'L', register: 'Totalizer' },
          { tag: 'VALVE_2_STATE', label: 'Inlet Valve V-02', value: valvesState['valve-2'] ? 'OPEN' : 'CLOSED', register: 'Status' }
        ],
        charts: [
          { title: 'City Supply Pressure', uom: 'bar', currentVal: 3.8, data: Array(30).fill(3.8), min: 2.0, max: 6.0, color: '#16a34a' }
        ],
        controls: (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-slate-800 block">Supply Header Isolation</span>
              <span className="text-[11px] text-slate-500">Mains city water line</span>
            </div>
            <button 
              onClick={() => toggleValve('valve-2')}
              className={`px-3 py-1.5 rounded-lg text-white font-bold transition ${valvesState['valve-2'] ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
            >
              {valvesState['valve-2'] ? 'Isolate Mains' : 'Supply Fresh Water'}
            </button>
          </div>
        )
      },

      'water-drain': {
        id: 'water-drain',
        name: 'DR-100 Wastewater Backwash Discharge Trench',
        type: 'Gravity Sewer Air-Gap Drainage Manifold',
        tags: [
          { tag: 'DRAIN_FLOW', label: 'Discharge Velocity Flow', value: (filterMode === 'Waste' || filterMode === 'Backwash' || valvesState['valve-5']) ? '198' : '0', uom: 'L/min', register: 'Input Reg 30082' },
          { tag: 'DISCHARGE_MODE', label: 'Filter Station State', value: filterMode, register: 'Status' },
          { tag: 'TOTAL_DRAINED', label: 'Total Volume Discharged', value: '1850', uom: 'L', register: 'Totalizer' }
        ],
        charts: [
          { title: 'Drain Flow', uom: 'L/min', currentVal: (filterMode === 'Waste' || filterMode === 'Backwash' || valvesState['valve-5']) ? 198 : 0, data: Array(30).fill((filterMode === 'Waste' || filterMode === 'Backwash' || valvesState['valve-5']) ? 198 : 0), min: 0, max: 250, color: '#0284c7' }
        ],
        controls: (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-slate-800 block">Backwash & Rinse Purge</span>
              <span className="text-[11px] text-slate-500">Purge filter bed washings to drain</span>
            </div>
            <button 
              onClick={() => selectFilterMode(filterMode === 'Waste' ? 'Filter' : 'Waste')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition"
            >
              {filterMode === 'Waste' ? 'Stop Drain' : 'Purge to Drain'}
            </button>
          </div>
        )
      },

      'ph-badge': {
        id: 'ph-badge',
        name: 'AT-401 Inline Water Chemistry Sensor Badge',
        type: 'High-Precision pH & ORP Flow-Through Cell',
        tags: [
          { tag: 'POOL_PH.PV', label: 'Current Water pH', value: poolPh, register: 'Input Reg 30084' },
          { tag: 'POOL_ORP.PV', label: 'Redox Potential (ORP)', value: poolOrp, uom: 'mV', register: 'Input Reg 30086' },
          { tag: 'DOSING_PID_STATE', label: 'Chemical Regulation', value: 'AUTO-OPTIMAL', register: 'Status' }
        ],
        charts: [
          { title: 'Water pH', uom: 'pH', currentVal: poolPh, data: Array.from({ length: 30 }, (_, i) => Number(poolPh) + Math.sin(i * 0.4) * 0.05), min: 6.8, max: 8.0, color: '#06b6d4', thresholds: [{ label: 'Ideal (7.2-7.6)', color: '#16a34a' }] },
          { title: 'Sanitizer ORP', uom: 'mV', currentVal: poolOrp, data: Array.from({ length: 30 }, (_, i) => poolOrp + Math.sin(i * 0.6) * 12), min: 600, max: 850, color: '#16a34a' }
        ],
        controls: (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-slate-800 block">Sanitizer PID Doser</span>
              <span className="text-[11px] text-slate-500">Injects balancing buffer into recirculating line</span>
            </div>
            <button className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-lg transition">
              Pulse Acid Dose
            </button>
          </div>
        )
      },

      'outdoor-temp': {
        id: 'outdoor-temp',
        name: 'Outdoor Ambient Air Temperature',
        type: 'ThingsBoard Weather & Environment Sensor',
        tags: [
          { tag: 'OUTDOOR_TEMP.PV', label: 'Ambient Air Temperature', value: outdoorTemp, uom: '°C', register: 'Input Reg 30024' },
          { tag: 'HUMIDITY.PV', label: 'Relative Humidity', value: '62.4', uom: '%', register: 'Input Reg 30088' },
          { tag: 'DEW_POINT.PV', label: 'Atmospheric Dew Point', value: '18.2', uom: '°C', register: 'Diagnostics' },
          { tag: 'WEATHER_STATION_STATUS', label: 'Telemetry Sensor State', value: 'ONLINE (0x01)', register: 'Status' }
        ],
        charts: [
          { title: 'Outdoor temperature', uom: '°C', currentVal: `${outdoorTemp} °C`, data: Array.from({ length: 30 }, (_, i) => Number(outdoorTemp) + Math.sin((i + timeStep) * 0.2) * 0.4), min: 15, max: 45, color: '#a855f7' }
        ],
        controls: (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
            <span className="font-bold text-slate-800 block">ThingsBoard State: traditional_outdoor_temperature</span>
            <p className="text-[11px] text-slate-500">Live ambient air telemetry feed mapped to Heat Pump inverter efficiency compensation curve.</p>
          </div>
        )
      },

      'target-temp': {
        id: 'target-temp',
        name: 'Target Water Temperature Setpoint',
        type: 'ThingsBoard PID Thermostat Setpoint',
        tags: [
          { tag: 'TARGET_TEMP.SP', label: 'Target Setpoint (SP)', value: targetTemp.toFixed(1), uom: '°C', register: 'Holding Reg 40020' },
          { tag: 'DEADBAND.CFG', label: 'Thermostatic Deadband', value: '0.5', uom: '°C', register: 'Holding Reg 40022' },
          { tag: 'HEATER_CALL', label: 'Heating Demand Call', value: Number(poolTemp) < targetTemp ? 'ACTIVE' : 'SATISFIED', register: 'Discrete In 10008' }
        ],
        charts: [
          { title: 'Target temperature', uom: '°C', currentVal: `${targetTemp.toFixed(1)} °C`, data: Array(30).fill(targetTemp), min: 20, max: 42, color: '#16a34a' }
        ],
        controls: (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-slate-800 block">ThingsBoard State: traditional_target_temperature</span>
                <span className="text-[11px] text-slate-500">Adjust thermostatic target regulation</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black font-mono text-emerald-600 bg-white px-3 py-1 rounded border border-slate-300">
                  {targetTemp.toFixed(1)} °C
                </span>
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => handleTempDelta(0.5)} className="p-1 bg-white hover:bg-slate-100 rounded border border-slate-300">
                    <ChevronUp size={12} />
                  </button>
                  <button onClick={() => handleTempDelta(-0.5)} className="p-1 bg-white hover:bg-slate-100 rounded border border-slate-300">
                    <ChevronDown size={12} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      },

      'pool-temp': {
        id: 'pool-temp',
        name: 'Pool Basin Water Temperature',
        type: 'ThingsBoard Immersion RTD Pt100 Sensor',
        tags: [
          { tag: 'POOL_TEMP.PV', label: 'Basin Process Value (PV)', value: poolTemp, uom: '°C', register: 'Input Reg 30034' },
          { tag: 'TARGET_TEMP.SP', label: 'Target Setpoint (SP)', value: targetTemp.toFixed(1), uom: '°C', register: 'Holding Reg 40020' },
          { tag: 'TEMP_ERROR.ERR', label: 'Thermal Deviation Error', value: (Number(poolTemp) - targetTemp).toFixed(1), uom: '°C', register: 'Diagnostics' },
          { tag: 'SENSOR_STATUS', label: 'RTD Transmitter Health', value: 'NOMINAL (0x00)', register: 'Status' }
        ],
        charts: [
          { title: 'Pool temperature', uom: '°C', currentVal: `${poolTemp} °C`, data: Array.from({ length: 30 }, (_, i) => Number(poolTemp) + Math.sin((i + timeStep) * 0.3) * 0.25), min: 25, max: 40, color: '#0284c7', thresholds: [{ label: `SP: ${targetTemp.toFixed(1)}°C`, color: '#16a34a' }] }
        ],
        controls: (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
            <span className="font-bold text-slate-800 block">ThingsBoard State: traditional_temperature</span>
            <p className="text-[11px] text-slate-500">Live immersion sensor telemetry reading pool basin water return line before filtration intake.</p>
          </div>
        )
      }
    };
  }, [pumpRunning, heaterRunning, targetTemp, filterMode, flowRate, filterDp, poolTemp, outdoorTemp, poolVolume, poolLevel, poolPh, poolOrp, rpmTrend, flowTrend, pressureTrend, vibrationTrend, powerTrend, tempMultiSeries, timeStep, valvesState]);

  return (
    <div className="w-full h-full flex flex-col bg-[#e8ecf1] text-slate-800 font-sans select-none overflow-y-auto">
      {/* ===================================================================== */}
      {/* 1. TOP HEADER & VIEW MODE SELECTOR (Hi-Perf vs Traditional)          */}
      {/* ===================================================================== */}
      <div className="py-2.5 px-6 flex items-center justify-between border-b border-slate-300 bg-white/95 backdrop-blur-md shadow-xs shrink-0 z-30">
        <div className="flex items-center gap-3">
          {deviceState && (
            <button
              onClick={() => setDeviceState(null)}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition border border-slate-300"
              title="Return to Main Mimic"
            >
              <ArrowLeft size={14} />
              <span>Back to main</span>
            </button>
          )}

          <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white shadow-sm">
            <Waves size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              SCADA Swimming Pool Management System
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                ThingsBoard Cloud Architecture
              </span>
              {deviceState && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-300">
                  Device: {deviceState.replace('-', ' ').toUpperCase()}
                </span>
              )}
            </h2>
            <p className="text-[11px] text-slate-500">
              Photorealistic 3D Mimic, Closed-Loop Recirculation, High-Rate Sand Filtration & Air-Source Heat Pump
            </p>
          </div>
        </div>

        {/* Top Controls */}
        <div className="flex items-center gap-3">
          {/* Quick Monitor in Separate Window Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-300">
            <span className="text-[11px] font-bold text-slate-600 px-2 flex items-center gap-1">
              <Activity size={12} className="text-sky-600" />
              <span>Trend Window:</span>
            </span>
            {[
              { id: 'water-pump', label: 'Pump P-101' },
              { id: 'sand-filter', label: 'Filter SF-201' },
              { id: 'heat-pump', label: 'Heat Pump' },
              { id: 'pool', label: 'Pool Basin' },
              { id: 'flowmeter', label: 'Flowmeter' },
              { id: 'strainer', label: 'Strainer' },
              { id: 'ph-canister', label: 'pH / Cl Cell' },
              { id: 'water-level', label: 'Level Gauge' },
              { id: 'valve-1', label: 'V-01 Skimmer' },
              { id: 'valve-9', label: 'V-09 Return' },
              { id: 'gateway', label: 'Gateway' }
            ].map(b => (
              <button
                key={b.id}
                onClick={() => setMonitorWindowDevice(b.id)}
                className="px-2.5 py-1 bg-white hover:bg-sky-50 text-slate-800 hover:text-sky-700 text-[11px] font-bold rounded-lg border border-slate-200 shadow-xs transition"
              >
                {b.label}
              </button>
            ))}
          </div>

          {/* Quick Gateway shortcut button */}
          <button
            onClick={() => setDeviceState(deviceState === 'gateway' ? null : 'gateway')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
              deviceState === 'gateway'
                ? 'bg-slate-900 text-cyan-300 border-slate-800 shadow-sm'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
          >
            <Server size={13} className="text-cyan-500" />
            <span>Pool Gateway</span>
          </button>

          {/* Traditional / Hi-Perf Toggle Switch (Matching ThingsBoard UI) */}
          <div className="flex items-center bg-slate-200 p-1 rounded-full border border-slate-300 shadow-inner">
            <button
              onClick={() => { setViewMode('hi-perf'); setDeviceState(null); }}
              className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all ${
                viewMode === 'hi-perf'
                  ? 'bg-slate-900 text-cyan-300 shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hi-Perf
            </button>
            <button
              onClick={() => { setViewMode('traditional'); }}
              className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all ${
                viewMode === 'traditional'
                  ? 'bg-[#15803d] text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Traditional
            </button>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. MODE: TRADITIONAL 3D SCADA (MAIN MIMIC VIEW WITH PROPER ALIGNMENT)  */}
      {/* ===================================================================== */}
      {viewMode === 'traditional' && !deviceState && (
        <div className="flex-1 p-6 flex flex-col justify-center items-center max-w-[1720px] mx-auto w-full">
          {/* Main 3D Photographic Process Mimic Canvas Container */}
          <div className="relative w-full max-w-[1540px] aspect-[2238/1207] bg-[#eef1f5] rounded-2xl shadow-xl border border-slate-300 overflow-hidden">
            {/* 1. MASTER 3D PHOTOREALISTIC BACKGROUND IMAGE */}
            <img 
              src="/assets/scada/thingsboard/traditional.webp" 
              alt="ThingsBoard Swimming Pool SCADA Mimic"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            />

            {/* 2. PROPERLY ALIGNED DYNAMIC OVERLAYS & INTERACTIVE CONTROLS */}

            {/* (A) TOP-LEFT KPI STATUS CARDS */}
            <div 
              style={{ left: '1.6%', top: '2.9%', width: '12.3%', height: '6.2%' }}
              className="absolute bg-white/95 rounded-xl px-3 py-1.5 shadow-sm border border-slate-200 flex flex-col justify-center"
            >
              <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Status</span>
              <span className="text-xs font-extrabold text-emerald-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </span>
            </div>

            <div 
              style={{ left: '1.6%', top: '12.0%', width: '12.3%', height: '6.2%' }}
              className="absolute bg-white/95 rounded-xl px-3 py-1.5 shadow-sm border border-slate-200 flex items-center justify-between cursor-pointer hover:border-emerald-500 hover:ring-1 hover:ring-emerald-300 transition group"
              onClick={() => setMonitorWindowDevice('outdoor-temp')}
              title="ThingsBoard State: traditional_outdoor_temperature &bull; Click to open Trend Window"
            >
              <div className="flex items-center gap-1.5">
                <Thermometer size={14} className="text-slate-400 group-hover:text-emerald-600 transition" />
                <span className="text-xs font-medium text-slate-700">Outdoor</span>
              </div>
              <span className="text-xs font-bold text-emerald-600 font-mono">{outdoorTemp} °C</span>
            </div>

            <div 
              style={{ left: '1.6%', top: '21.5%', width: '12.3%', height: '6.2%' }}
              className="absolute bg-white/95 rounded-xl px-3 py-1.5 shadow-sm border border-slate-200 flex items-center justify-between cursor-pointer hover:border-emerald-500 hover:ring-1 hover:ring-emerald-300 transition group"
              onClick={() => setMonitorWindowDevice('target-temp')}
              title="ThingsBoard State: traditional_target_temperature &bull; Click to open Trend Window"
            >
              <div className="flex items-center gap-1.5">
                <Thermometer size={14} className="text-slate-400 group-hover:text-emerald-600 transition" />
                <span className="text-xs font-medium text-slate-700">Target</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-emerald-600 font-mono">{targetTemp.toFixed(1)} °C</span>
                <div className="flex flex-col">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleTempDelta(0.5); }} 
                    className="p-0.5 hover:bg-slate-100 rounded text-slate-600 active:scale-95 transition"
                    title="Increase target setpoint"
                  >
                    <ChevronUp size={11} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleTempDelta(-0.5); }} 
                    className="p-0.5 hover:bg-slate-100 rounded text-slate-600 active:scale-95 transition"
                    title="Decrease target setpoint"
                  >
                    <ChevronDown size={11} />
                  </button>
                </div>
              </div>
            </div>

            <div 
              style={{ left: '1.6%', top: '31.5%', width: '12.3%', height: '6.2%' }}
              className="absolute bg-white/95 rounded-xl px-3 py-1.5 shadow-sm border border-slate-200 flex items-center justify-between cursor-pointer hover:border-emerald-500 hover:ring-1 hover:ring-emerald-300 transition group"
              onClick={() => setMonitorWindowDevice('pool-temp')}
              title="ThingsBoard State: traditional_temperature &bull; Click to open Trend Window"
            >
              <div className="flex items-center gap-1.5">
                <Thermometer size={14} className="text-slate-400 group-hover:text-emerald-600 transition" />
                <span className="text-xs font-medium text-slate-700">Pool</span>
              </div>
              <span className="text-xs font-bold text-emerald-600 font-mono">{poolTemp} °C</span>
            </div>

            {/* (B) POOL CAPACITY BADGE ("55000 L") */}
            <div 
              style={{ left: '42.9%', top: '37.3%', width: '8.9%', height: '7.0%' }}
              className="absolute bg-white/95 rounded-xl shadow-md border border-slate-200 flex items-center justify-center cursor-pointer hover:border-sky-400 transition group"
              onClick={() => setMonitorWindowDevice('pool')}
              title="Click to monitor Pool Tags & Trends in separate window"
            >
              <span className="text-xs md:text-sm font-extrabold text-slate-800 font-mono">{poolVolume} L</span>
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap">
                Click to open Trend Window
              </div>
            </div>

            {/* (C) PROPERLY ALIGNED EQUIPMENT HOTSPOTS WITH CLICK-TO-MONITOR & INTERACTION */}

            {/* 1. SWIMMING POOL BASIN */}
            <div 
              style={{ left: '25.7%', top: '9.1%', width: '41.5%', height: '26.1%' }}
              className="absolute cursor-pointer group rounded-lg hover:ring-2 hover:ring-sky-400/60 transition"
              onClick={() => setMonitorWindowDevice('pool')}
              title="Click to monitor Pool Tags & Trends in separate window"
            >
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition bg-slate-900/90 text-white text-[10px] px-2.5 py-1 rounded shadow flex items-center gap-1 z-30 pointer-events-none">
                <Activity size={11} className="text-sky-400" />
                <span>Open Pool Trend Window</span>
              </div>
            </div>

            {/* WATER LEVEL DIAL GAUGE */}
            <div 
              style={{ left: '20.91%', top: '15.33%', width: '3.89%', height: '7.04%' }}
              className="absolute z-20 cursor-pointer group rounded-full hover:ring-2 hover:ring-sky-400/80 transition flex items-center justify-center"
              onClick={() => setMonitorWindowDevice('water-level')}
              title={`Water Level Indicator (${poolLevel}%) - Click to open Trend Window`}
            >
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition bg-slate-900/95 text-white text-[9px] px-2 py-0.5 rounded shadow whitespace-nowrap z-30 pointer-events-none">
                LT-101 Level ({poolLevel}%) &bull; Trends
              </div>
            </div>

            {/* VALVE 1: SKIMMER SUCTION (V-01) */}
            <div 
              style={{ left: '16.31%', top: '28.17%', width: '2.23%', height: '7.04%' }}
              className="absolute z-20 cursor-pointer group rounded flex items-center justify-center transition"
              onClick={() => toggleValve('valve-1')}
              title={`V-01 Skimmer Valve: ${valvesState['valve-1'] ? 'OPEN' : 'CLOSED'} (Click to toggle)`}
            >
              <div className={`w-3.5 h-3.5 rounded-full border shadow flex items-center justify-center text-[7px] font-black transition ${
                valvesState['valve-1'] ? 'bg-emerald-500 text-white border-emerald-400 ring-2 ring-emerald-300' : 'bg-slate-700 text-rose-300 border-slate-500'
              }`}>
                {valvesState['valve-1'] ? 'O' : 'C'}
              </div>
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition bg-slate-900/95 text-white text-[9px] px-2 py-0.5 rounded shadow whitespace-nowrap flex items-center gap-1.5 z-30 pointer-events-auto">
                <span className="font-bold">V-01 Skimmer: {valvesState['valve-1'] ? 'OPEN' : 'CLOSED'}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setMonitorWindowDevice('valve-1'); }}
                  className="px-1.5 py-0.2 bg-sky-600 hover:bg-sky-500 rounded text-white text-[8px] font-bold"
                >
                  Trends
                </button>
              </div>
            </div>

            {/* VALVE 3: BOTTOM DRAIN SUCTION (V-03) */}
            <div 
              style={{ left: '26.81%', top: '41.01%', width: '2.23%', height: '7.04%' }}
              className="absolute z-20 cursor-pointer group rounded flex items-center justify-center transition"
              onClick={() => toggleValve('valve-3')}
              title={`V-03 Bottom Drain Valve: ${valvesState['valve-3'] ? 'OPEN' : 'CLOSED'} (Click to toggle)`}
            >
              <div className={`w-3.5 h-3.5 rounded-full border shadow flex items-center justify-center text-[7px] font-black transition ${
                valvesState['valve-3'] ? 'bg-emerald-500 text-white border-emerald-400 ring-2 ring-emerald-300' : 'bg-slate-700 text-rose-300 border-slate-500'
              }`}>
                {valvesState['valve-3'] ? 'O' : 'C'}
              </div>
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition bg-slate-900/95 text-white text-[9px] px-2 py-0.5 rounded shadow whitespace-nowrap flex items-center gap-1.5 z-30 pointer-events-auto">
                <span className="font-bold">V-03 Bottom Drain: {valvesState['valve-3'] ? 'OPEN' : 'CLOSED'}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setMonitorWindowDevice('valve-3'); }}
                  className="px-1.5 py-0.2 bg-sky-600 hover:bg-sky-500 rounded text-white text-[8px] font-bold"
                >
                  Trends
                </button>
              </div>
            </div>

            {/* WATER SUPPLY BADGE */}
            <div 
              style={{ left: '4.92%', top: '50.12%', width: '7.37%', height: '4.14%' }}
              className="absolute z-20 cursor-pointer group rounded hover:ring-2 hover:ring-sky-400/80 transition flex items-center justify-center"
              onClick={() => setMonitorWindowDevice('water-supply')}
              title="Fresh Water Supply Header - Click to open Trend Window"
            >
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition bg-slate-900/95 text-white text-[9px] px-2 py-0.5 rounded shadow whitespace-nowrap z-30 pointer-events-none">
                Water Supply &bull; Trend Window
              </div>
            </div>

            {/* VALVE 2: FRESH WATER SUPPLY MAKE-UP (V-02) */}
            <div 
              style={{ left: '11.84%', top: '48.30%', width: '3.80%', height: '3.98%' }}
              className="absolute z-20 cursor-pointer group rounded flex items-center justify-center transition"
              onClick={() => toggleValve('valve-2')}
              title={`V-02 Water Supply Valve: ${valvesState['valve-2'] ? 'OPEN' : 'CLOSED'} (Click to toggle)`}
            >
              <div className={`w-3.5 h-3.5 rounded-full border shadow flex items-center justify-center text-[7px] font-black transition ${
                valvesState['valve-2'] ? 'bg-emerald-500 text-white border-emerald-400 ring-2 ring-emerald-300' : 'bg-slate-700 text-rose-300 border-slate-500'
              }`}>
                {valvesState['valve-2'] ? 'O' : 'C'}
              </div>
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition bg-slate-900/95 text-white text-[9px] px-2 py-0.5 rounded shadow whitespace-nowrap flex items-center gap-1.5 z-30 pointer-events-auto">
                <span className="font-bold">V-02 Supply: {valvesState['valve-2'] ? 'OPEN' : 'CLOSED'}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setMonitorWindowDevice('valve-2'); }}
                  className="px-1.5 py-0.2 bg-sky-600 hover:bg-sky-500 rounded text-white text-[8px] font-bold"
                >
                  Trends
                </button>
              </div>
            </div>

            {/* HAIR & LINT STRAINER (ST-101) */}
            <div 
              style={{ left: '22.56%', top: '59.65%', width: '2.90%', height: '12.26%' }}
              className="absolute z-20 cursor-pointer group rounded hover:ring-2 hover:ring-emerald-400/80 transition flex items-center justify-center"
              onClick={() => setMonitorWindowDevice('strainer')}
              title="Hair & Lint Strainer ST-101 - Click to open Trend Window"
            >
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition bg-slate-900/95 text-white text-[9px] px-2 py-0.5 rounded shadow whitespace-nowrap z-30 pointer-events-none">
                Strainer ST-101 &bull; Trend Window
              </div>
            </div>

            {/* 2. CIRCULATION PUMP (P-101) */}
            <div 
              style={{ left: '29.0%', top: '53.9%', width: '13.9%', height: '19.0%' }}
              className="absolute cursor-pointer group rounded-xl hover:ring-2 hover:ring-emerald-400/70 transition"
              onClick={() => setDeviceState('water-pump')}
              title="Click to view Water Pump P-101 Dashboard & Tags"
            >
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition bg-slate-900/95 text-white text-[10px] px-2.5 py-1 rounded shadow whitespace-nowrap flex items-center gap-1.5 z-30 pointer-events-auto">
                <Activity size={11} className="text-emerald-400" />
                <span className="font-bold">Water Pump P-101</span>
                <span>&bull; View Dashboard</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setMonitorWindowDevice('water-pump'); }}
                  className="ml-1 px-1.5 py-0.5 bg-sky-600 hover:bg-sky-500 rounded text-white text-[9px] font-bold"
                  title="Monitor in Separate Window"
                >
                  Trend Window
                </button>
              </div>
            </div>

            {/* Pump Power Switch Button Overlay */}
            <div 
              style={{ left: '43.2%', top: '70.8%', width: '2.0%', height: '3.6%' }}
              className="absolute z-20 flex items-center justify-center"
            >
              <button
                onClick={(e) => { e.stopPropagation(); togglePump(); }}
                className={`w-6 h-6 rounded-full border shadow flex items-center justify-center transition-all ${
                  pumpRunning 
                    ? 'bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600 ring-2 ring-emerald-300' 
                    : 'bg-slate-200 text-slate-500 border-slate-300 hover:bg-slate-300'
                }`}
                title={pumpRunning ? 'Click to stop pump' : 'Click to start pump'}
              >
                <Power size={11} />
              </button>
            </div>

            {/* VALVE 4: PUMP DISCHARGE ISOLATION (V-04) */}
            <div 
              style={{ left: '35.97%', top: '48.30%', width: '4.02%', height: '3.98%' }}
              className="absolute z-20 cursor-pointer group rounded flex items-center justify-center transition"
              onClick={() => toggleValve('valve-4')}
              title={`V-04 Pump Discharge Valve: ${valvesState['valve-4'] ? 'OPEN' : 'CLOSED'} (Click to toggle)`}
            >
              <div className={`w-3.5 h-3.5 rounded-full border shadow flex items-center justify-center text-[7px] font-black transition ${
                valvesState['valve-4'] ? 'bg-emerald-500 text-white border-emerald-400 ring-2 ring-emerald-300' : 'bg-slate-700 text-rose-300 border-slate-500'
              }`}>
                {valvesState['valve-4'] ? 'O' : 'C'}
              </div>
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition bg-slate-900/95 text-white text-[9px] px-2 py-0.5 rounded shadow whitespace-nowrap flex items-center gap-1.5 z-30 pointer-events-auto">
                <span className="font-bold">V-04 Discharge: {valvesState['valve-4'] ? 'OPEN' : 'CLOSED'}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setMonitorWindowDevice('valve-4'); }}
                  className="px-1.5 py-0.2 bg-sky-600 hover:bg-sky-500 rounded text-white text-[8px] font-bold"
                >
                  Trends
                </button>
              </div>
            </div>

            {/* 3. HIGH-RATE SAND FILTER (SF-201) */}
            <div 
              style={{ left: '49.8%', top: '47.6%', width: '11.2%', height: '31.5%' }}
              className="absolute cursor-pointer group rounded-xl hover:ring-2 hover:ring-emerald-400/70 transition"
              onClick={() => setDeviceState('sand-filter')}
              title="Click to view Sand Filter SF-201 Dashboard & Modes"
            >
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition bg-slate-900/95 text-white text-[10px] px-2.5 py-1 rounded shadow whitespace-nowrap flex items-center gap-1.5 z-30 pointer-events-auto">
                <Activity size={11} className="text-emerald-400" />
                <span className="font-bold">Sand Filter SF-201</span>
                <span>&bull; View Dashboard</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setMonitorWindowDevice('sand-filter'); }}
                  className="ml-1 px-1.5 py-0.5 bg-sky-600 hover:bg-sky-500 rounded text-white text-[9px] font-bold"
                  title="Monitor in Separate Window"
                >
                  Trend Window
                </button>
              </div>
            </div>

            {/* 6-Button Interactive Mode Matrix (Over top of sand filter body) */}
            <div 
              style={{ left: '51.2%', top: '61.3%', width: '8.5%', height: '10.4%' }}
              className="absolute z-20 grid grid-cols-2 gap-1 p-0.5"
            >
              {[
                { id: 'Filter', label: 'Filter' },
                { id: 'Waste', label: 'Waste' },
                { id: 'Backwash', label: 'Backwash' },
                { id: 'Recirculate', label: 'Recirc' },
                { id: 'Rinse', label: 'Rinse' },
                { id: 'Closed', label: 'Closed' }
              ].map(m => {
                const isActive = filterMode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={(e) => { e.stopPropagation(); selectFilterMode(m.id); }}
                    className={`h-4 md:h-5 rounded flex items-center gap-1 px-1 text-[8px] md:text-[9px] font-bold transition-all border ${
                      isActive
                        ? 'bg-white border-emerald-500 text-slate-900 shadow-sm ring-1 ring-emerald-400'
                        : 'bg-white/80 border-slate-300 text-slate-600 hover:bg-white hover:text-slate-900'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 ring-2 ring-emerald-200' : 'bg-slate-300'}`} />
                    <span className="truncate">{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* VALVE 5: WASTE DRAIN VALVE (V-05) */}
            <div 
              style={{ left: '60.77%', top: '59.65%', width: '2.23%', height: '7.04%' }}
              className="absolute z-20 cursor-pointer group rounded flex items-center justify-center transition"
              onClick={() => toggleValve('valve-5')}
              title={`V-05 Waste Drain Valve: ${valvesState['valve-5'] ? 'OPEN' : 'CLOSED'} (Click to toggle)`}
            >
              <div className={`w-3.5 h-3.5 rounded-full border shadow flex items-center justify-center text-[7px] font-black transition ${
                valvesState['valve-5'] ? 'bg-emerald-500 text-white border-emerald-400 ring-2 ring-emerald-300' : 'bg-slate-700 text-rose-300 border-slate-500'
              }`}>
                {valvesState['valve-5'] ? 'O' : 'C'}
              </div>
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition bg-slate-900/95 text-white text-[9px] px-2 py-0.5 rounded shadow whitespace-nowrap flex items-center gap-1.5 z-30 pointer-events-auto">
                <span className="font-bold">V-05 Waste: {valvesState['valve-5'] ? 'OPEN' : 'CLOSED'}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setMonitorWindowDevice('valve-5'); }}
                  className="px-1.5 py-0.2 bg-sky-600 hover:bg-sky-500 rounded text-white text-[8px] font-bold"
                >
                  Trends
                </button>
              </div>
            </div>

            {/* WATER DRAIN BADGE */}
            <div 
              style={{ left: '63.67%', top: '82.44%', width: '6.93%', height: '4.14%' }}
              className="absolute z-20 cursor-pointer group rounded hover:ring-2 hover:ring-sky-400/80 transition flex items-center justify-center"
              onClick={() => setMonitorWindowDevice('water-drain')}
              title="Wastewater Drain Trench - Click to open Trend Window"
            >
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition bg-slate-900/95 text-white text-[9px] px-2 py-0.5 rounded shadow whitespace-nowrap z-30 pointer-events-none">
                Water Drain &bull; Trend Window
              </div>
            </div>

            {/* 4. DIGITAL FLOW METER (FT-101) */}
            <div 
              style={{ left: '61.89%', top: '47.06%', width: '3.57%', height: '6.63%' }}
              className="absolute z-20 flex flex-col items-center justify-center cursor-pointer group"
              onClick={() => setMonitorWindowDevice('flowmeter')}
              title="Click to monitor Flow Transmitter tags & trends in separate window"
            >
              <div className="bg-white/95 px-1 rounded border border-emerald-400 shadow-sm flex flex-col items-center -mt-1 group-hover:ring-1 group-hover:ring-emerald-400">
                <span className="text-[10px] md:text-xs font-black font-mono text-slate-900 leading-none">{flowRate}</span>
                <span className="text-[7px] text-slate-400 font-semibold">L/min</span>
              </div>
            </div>

            {/* VALVE 8: HEATER BYPASS VALVE (V-08) */}
            <div 
              style={{ left: '74.17%', top: '48.22%', width: '3.66%', height: '3.98%' }}
              className="absolute z-20 cursor-pointer group rounded flex items-center justify-center transition"
              onClick={() => toggleValve('valve-8')}
              title={`V-08 Heater Bypass Valve: ${valvesState['valve-8'] ? 'OPEN' : 'CLOSED'} (Click to toggle)`}
            >
              <div className={`w-3.5 h-3.5 rounded-full border shadow flex items-center justify-center text-[7px] font-black transition ${
                valvesState['valve-8'] ? 'bg-emerald-500 text-white border-emerald-400 ring-2 ring-emerald-300' : 'bg-slate-800 text-slate-300 border-slate-600'
              }`}>
                {valvesState['valve-8'] ? 'O' : 'C'}
              </div>
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition bg-slate-900/95 text-white text-[9px] px-2 py-0.5 rounded shadow whitespace-nowrap flex items-center gap-1.5 z-30 pointer-events-auto">
                <span className="font-bold">V-08 Bypass: {valvesState['valve-8'] ? 'OPEN' : 'CLOSED'}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setMonitorWindowDevice('valve-8'); }}
                  className="px-1.5 py-0.2 bg-sky-600 hover:bg-sky-500 rounded text-white text-[8px] font-bold"
                >
                  Trends
                </button>
              </div>
            </div>

            {/* VALVE 6: HEATER INFLOW DIVERTER (V-06) */}
            <div 
              style={{ left: '71.49%', top: '53.85%', width: '2.23%', height: '7.04%' }}
              className="absolute z-20 cursor-pointer group rounded flex items-center justify-center transition"
              onClick={() => toggleValve('valve-6')}
              title={`V-06 Heater Inlet Valve: ${valvesState['valve-6'] ? 'OPEN' : 'CLOSED'} (Click to toggle)`}
            >
              <div className={`w-3.5 h-3.5 rounded-full border shadow flex items-center justify-center text-[7px] font-black transition ${
                valvesState['valve-6'] ? 'bg-emerald-500 text-white border-emerald-400 ring-2 ring-emerald-300' : 'bg-slate-700 text-rose-300 border-slate-500'
              }`}>
                {valvesState['valve-6'] ? 'O' : 'C'}
              </div>
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition bg-slate-900/95 text-white text-[9px] px-2 py-0.5 rounded shadow whitespace-nowrap flex items-center gap-1.5 z-30 pointer-events-auto">
                <span className="font-bold">V-06 Heater In: {valvesState['valve-6'] ? 'OPEN' : 'CLOSED'}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setMonitorWindowDevice('valve-6'); }}
                  className="px-1.5 py-0.2 bg-sky-600 hover:bg-sky-500 rounded text-white text-[8px] font-bold"
                >
                  Trends
                </button>
              </div>
            </div>

            {/* 5. HEAT PUMP (HP-301) */}
            <div 
              style={{ left: '81.3%', top: '66.3%', width: '13.7%', height: '19.0%' }}
              className="absolute cursor-pointer group rounded-xl hover:ring-2 hover:ring-emerald-400/70 transition"
              onClick={() => setDeviceState('heat-pump')}
              title="Click to view Heat Pump HP-301 Dashboard & Inverter State"
            >
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition bg-slate-900/95 text-white text-[10px] px-2.5 py-1 rounded shadow whitespace-nowrap flex items-center gap-1.5 z-30 pointer-events-auto">
                <Activity size={11} className="text-emerald-400" />
                <span className="font-bold">Heat Pump HP-301</span>
                <span>&bull; View Dashboard</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setMonitorWindowDevice('heat-pump'); }}
                  className="ml-1 px-1.5 py-0.5 bg-sky-600 hover:bg-sky-500 rounded text-white text-[9px] font-bold"
                  title="Monitor in Separate Window"
                >
                  Trend Window
                </button>
              </div>
            </div>

            {/* Heat Pump Digital Target Setpoint Display */}
            <div 
              style={{ left: '83.1%', top: '69.2%', width: '2.9%', height: '3.3%' }}
              className="absolute z-20 flex items-center justify-center pointer-events-none"
            >
              <span className="text-xs md:text-sm font-black font-mono text-slate-900">
                {Math.round(targetTemp)}
              </span>
            </div>

            {/* Heat Pump Up/Down Arrow Setpoint Buttons */}
            <div 
              style={{ left: '83.1%', top: '73.3%', width: '2.9%', height: '2.5%' }}
              className="absolute z-20 flex gap-0.5 justify-center items-center"
            >
              <button
                onClick={(e) => { e.stopPropagation(); handleTempDelta(1); }}
                className="w-3.5 h-3.5 bg-slate-100 hover:bg-slate-200 rounded flex items-center justify-center text-slate-700 shadow-sm active:scale-95"
                title="Increase heater setpoint"
              >
                <ChevronUp size={10} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleTempDelta(-1); }}
                className="w-3.5 h-3.5 bg-slate-100 hover:bg-slate-200 rounded flex items-center justify-center text-slate-700 shadow-sm active:scale-95"
                title="Decrease heater setpoint"
              >
                <ChevronDown size={10} />
              </button>
            </div>

            {/* Heat Pump Power Toggle Button */}
            <div 
              style={{ left: '82.9%', top: '79.5%', width: '1.8%', height: '3.4%' }}
              className="absolute z-20 flex items-center justify-center"
            >
              <button
                onClick={(e) => { e.stopPropagation(); toggleHeater(); }}
                className={`w-6 h-6 rounded-full border shadow flex items-center justify-center transition-all ${
                  heaterRunning 
                    ? 'bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600 ring-2 ring-emerald-300' 
                    : 'bg-slate-200 text-slate-500 border-slate-300 hover:bg-slate-300'
                }`}
                title={heaterRunning ? 'Turn Heat Pump OFF' : 'Turn Heat Pump ON'}
              >
                <Power size={11} />
              </button>
            </div>

            {/* Heat Pump Axial Fan Spin Animation */}
            {heaterRunning && (
              <div 
                style={{ left: '86.9%', top: '69.6%', width: '6.5%', height: '12.0%', animationDuration: '0.8s' }}
                className="absolute z-10 pointer-events-none rounded-full flex items-center justify-center animate-spin"
              >
                <svg viewBox="0 0 100 100" className="w-full h-full opacity-30">
                  <path d="M 50 50 C 46 35, 62 25, 50 20 C 43 30, 46 43, 50 50 Z" fill="#22c55e" />
                  <path d="M 50 50 C 63 54, 73 70, 77 60 C 67 53, 57 54, 50 50 Z" fill="#22c55e" />
                  <path d="M 50 50 C 37 61, 27 77, 23 67 C 33 60, 43 61, 50 50 Z" fill="#22c55e" />
                </svg>
              </div>
            )}

            {/* VALVE 7: HEATER OUTFLOW RETURN (V-07) */}
            <div 
              style={{ left: '78.19%', top: '53.85%', width: '2.23%', height: '7.04%' }}
              className="absolute z-20 cursor-pointer group rounded flex items-center justify-center transition"
              onClick={() => toggleValve('valve-7')}
              title={`V-07 Heater Outlet Valve: ${valvesState['valve-7'] ? 'OPEN' : 'CLOSED'} (Click to toggle)`}
            >
              <div className={`w-3.5 h-3.5 rounded-full border shadow flex items-center justify-center text-[7px] font-black transition ${
                valvesState['valve-7'] ? 'bg-emerald-500 text-white border-emerald-400 ring-2 ring-emerald-300' : 'bg-slate-700 text-rose-300 border-slate-500'
              }`}>
                {valvesState['valve-7'] ? 'O' : 'C'}
              </div>
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition bg-slate-900/95 text-white text-[9px] px-2 py-0.5 rounded shadow whitespace-nowrap flex items-center gap-1.5 z-30 pointer-events-auto">
                <span className="font-bold">V-07 Heater Out: {valvesState['valve-7'] ? 'OPEN' : 'CLOSED'}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setMonitorWindowDevice('valve-7'); }}
                  className="px-1.5 py-0.2 bg-sky-600 hover:bg-sky-500 rounded text-white text-[8px] font-bold"
                >
                  Trends
                </button>
              </div>
            </div>

            {/* 6. WATER DRAIN DISCHARGE SPLASH (Waste / Backwash Active) */}
            {(filterMode === 'Waste' || filterMode === 'Backwash' || valvesState['valve-5']) && (
              <div 
                style={{ left: '64.12%', top: '86.33%', width: '2.90%', height: '6.05%' }}
                className="absolute z-20 pointer-events-none flex items-center justify-center animate-pulse"
              >
                <Droplets size={22} className="text-sky-500 drop-shadow" />
              </div>
            )}

            {/* pH SENSOR BADGE ("pH 7.35") */}
            <div 
              style={{ left: '84.36%', top: '40.76%', width: '3.44%', height: '4.14%' }}
              className="absolute z-20 cursor-pointer group rounded hover:ring-2 hover:ring-cyan-400/80 transition flex items-center justify-center"
              onClick={() => setMonitorWindowDevice('ph-badge')}
              title={`Inline pH Sensor (${poolPh}) - Click to open Trend Window`}
            >
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition bg-slate-900/95 text-white text-[9px] px-2 py-0.5 rounded shadow whitespace-nowrap z-30 pointer-events-none">
                pH Analyzer ({poolPh}) &bull; Trends
              </div>
            </div>

            {/* 7. pH & CHLORINE DOSING CELL (CH-401) */}
            <div 
              style={{ left: '84.36%', top: '46.81%', width: '3.44%', height: '11.60%' }}
              className="absolute z-20 flex flex-col items-center justify-center cursor-pointer group rounded-lg hover:ring-2 hover:ring-cyan-400/80 transition"
              onClick={() => setMonitorWindowDevice('ph-canister')}
              title="Click to monitor pH & Chlorine Injection Cell tags & trends in separate window"
            >
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition bg-slate-900/95 text-white text-[10px] px-2.5 py-1 rounded shadow whitespace-nowrap flex items-center gap-1 pointer-events-none z-30">
                <Activity size={10} className="text-cyan-400" />
                <span>pH & Cl Cell &bull; Trend Window</span>
              </div>
            </div>

            {/* VALVE 9: MAIN RETURN SPOKE GATE VALVE (V-09) */}
            <div 
              style={{ left: '73.95%', top: '15.33%', width: '7.15%', height: '6.63%' }}
              className="absolute z-20 cursor-pointer group rounded-xl hover:ring-2 hover:ring-emerald-400/80 transition flex items-center justify-center"
              onClick={() => toggleValve('valve-9')}
              title={`V-09 Return Spoke Gate Valve: ${valvesState['valve-9'] ? 'OPEN' : 'CLOSED'} (Click to toggle)`}
            >
              <div className={`w-4 h-4 rounded-full border shadow flex items-center justify-center text-[8px] font-black transition ${
                valvesState['valve-9'] ? 'bg-emerald-500 text-white border-emerald-400 ring-2 ring-emerald-300' : 'bg-slate-700 text-rose-300 border-slate-500'
              }`}>
                {valvesState['valve-9'] ? 'O' : 'C'}
              </div>
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition bg-slate-900/95 text-white text-[9px] px-2 py-0.5 rounded shadow whitespace-nowrap flex items-center gap-1.5 z-30 pointer-events-auto">
                <span className="font-bold">V-09 Spoke Gate: {valvesState['valve-9'] ? 'OPEN' : 'CLOSED'}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setMonitorWindowDevice('valve-9'); }}
                  className="px-1.5 py-0.2 bg-sky-600 hover:bg-sky-500 rounded text-white text-[8px] font-bold"
                >
                  Trends
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3A. DEDICATED FULL SCREEN WATER PUMP VIEW */}
      {viewMode === 'traditional' && deviceState === 'water-pump' && (
        <div className="flex-1 p-6 max-w-[1720px] mx-auto w-full flex flex-col gap-5">
          {/* Top Bar inside device dashboard */}
          <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-slate-200 shadow-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDeviceState(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition border border-slate-300"
              >
                <ArrowLeft size={14} />
                <span>Back to main</span>
              </button>
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span>Water Pump P-101 Operational State</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  pumpRunning ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {pumpRunning ? 'Running' : 'Stopped'}
                </span>
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMonitorWindowDevice('water-pump')}
                className="px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold flex items-center gap-1.5 transition border border-sky-300"
              >
                <ExternalLink size={13} />
                <span>Monitor in Separate Window</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
            {/* Left 4 Cols: Graphic & Info */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col items-center">
                <div className="w-full flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-800">Water pump</span>
                  <button
                    onClick={togglePump}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold transition ${
                      pumpRunning ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {pumpRunning ? 'STOP PUMP' : 'START PUMP'}
                  </button>
                </div>
                <div className="w-64 h-56 my-3 relative flex items-center justify-center">
                  <img 
                    src="/assets/scada/symbols_3d/water_pump_3d.png" 
                    alt="Water Pump 3D" 
                    className={`max-h-full max-w-full object-contain drop-shadow-md transition-transform ${
                      pumpRunning ? 'scale-105' : 'opacity-85'
                    }`} 
                  />
                  {pumpRunning && (
                    <span className="absolute bottom-2 right-2 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-200 animate-ping" />
                  )}
                </div>
              </div>

              {/* Water Pump Info Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 font-bold text-slate-800">
                  <span>Water pump info</span>
                  <Activity size={13} className="text-slate-400" />
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Name</span>
                  <span className="font-semibold text-slate-800">Water pump</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Status</span>
                  <span className={`font-bold ${pumpRunning ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {pumpRunning ? 'Running' : 'Stopped'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Maintenance</span>
                  <span className="font-mono text-slate-700">20 Nov 2024</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Expected maintenance</span>
                  <span className="font-mono text-slate-700">15 Jun 2025</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Power Rating</span>
                  <span className="font-mono text-slate-700">2.2 kW (2850 RPM)</span>
                </div>
              </div>
            </div>

            {/* Right 8 Cols: Alarms Table + Realtime Charts */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              {/* Alarms Table */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                  <span className="font-bold text-slate-800">Alarms (Realtime - last day)</span>
                  <span className="text-[10px] text-slate-400 font-mono">0 active trips</span>
                </div>
                <div className="py-5 text-center text-xs text-slate-400 font-medium">
                  {pumpRunning ? (
                    <span className="flex items-center justify-center gap-1.5 text-emerald-600">
                      <CheckCircle2 size={14} />
                      No alarms found &mdash; All process variables within nominal tolerances
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-1.5 text-amber-600">
                      <AlertCircle size={14} />
                      Pump contactor open &mdash; Standby state
                    </span>
                  )}
                </div>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ScadaTrendChart
                  title="Flow rate"
                  subtitle="Realtime - last 1 hour"
                  uom="L/min"
                  currentVal={pumpRunning ? flowRate : 0}
                  data={pumpRunning ? flowTrend : Array(30).fill(0)}
                  min={80}
                  max={200}
                  color="#0284c7"
                />
                <ScadaTrendChart
                  title="Rotation speed"
                  subtitle="Realtime - last 1 hour"
                  uom="RPM"
                  currentVal={pumpRunning ? 2120 : 0}
                  data={pumpRunning ? rpmTrend : Array(30).fill(0)}
                  min={1600}
                  max={2400}
                  color="#16a34a"
                  thresholds={[
                    { label: '0 - 800', color: '#ef4444' },
                    { label: '800 - 1000', color: '#f59e0b' },
                    { label: '1000 - 3000', color: '#10b981' },
                    { label: '3000 - 3200', color: '#f59e0b' },
                    { label: '≥ 3200', color: '#ef4444' }
                  ]}
                />
                <ScadaTrendChart
                  title="Power consumption"
                  subtitle="Realtime - last 1 hour"
                  uom="Wh"
                  currentVal={pumpRunning ? powerTrend[powerTrend.length - 1] : 0}
                  data={pumpRunning ? powerTrend : Array(30).fill(0)}
                  min={80}
                  max={120}
                  color="#eab308"
                  thresholds={[
                    { label: '0 - 50', color: '#f59e0b' },
                    { label: '50 - 150', color: '#10b981' },
                    { label: '≥ 150', color: '#ef4444' }
                  ]}
                />
                <ScadaTrendChart
                  title="Vibration"
                  subtitle="Realtime - last 1 hour"
                  uom="mm/s"
                  currentVal={pumpRunning ? vibrationTrend[vibrationTrend.length - 1] : 0}
                  data={pumpRunning ? vibrationTrend : Array(30).fill(0)}
                  min={0}
                  max={2.0}
                  color="#16a34a"
                  thresholds={[
                    { label: '< 5', color: '#10b981' },
                    { label: '≥ 5', color: '#ef4444' }
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3B. DEDICATED FULL SCREEN SAND FILTER VIEW */}
      {viewMode === 'traditional' && deviceState === 'sand-filter' && (
        <div className="flex-1 p-6 max-w-[1720px] mx-auto w-full flex flex-col gap-5">
          {/* Top Bar */}
          <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-slate-200 shadow-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDeviceState(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition border border-slate-300"
              >
                <ArrowLeft size={14} />
                <span>Back to main</span>
              </button>
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span>Sand Filter SF-201 Operational State</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Mode: {filterMode}
                </span>
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMonitorWindowDevice('sand-filter')}
                className="px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold flex items-center gap-1.5 transition border border-sky-300"
              >
                <ExternalLink size={13} />
                <span>Monitor in Separate Window</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
            {/* Left 4 Cols: 3D Filter + 6 Modes + Info */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col items-center">
                <div className="w-full flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-800">Sand filter</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Mode: {filterMode}
                  </span>
                </div>
                <div className="w-60 h-64 my-2 relative flex items-center justify-center">
                  <img src="/assets/scada/symbols_3d/sand_filter_3d.png" alt="Commercial Sand Filter 3D" className="max-h-full max-w-full object-contain drop-shadow-md" />
                </div>

                {/* 6 Mode Matrix */}
                <div className="w-full grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-slate-100">
                  {[
                    { id: 'Filter', label: 'Filter' },
                    { id: 'Waste', label: 'Waste' },
                    { id: 'Backwash', label: 'Backwash' },
                    { id: 'Recirculate', label: 'Recirculate' },
                    { id: 'Rinse', label: 'Rinse' },
                    { id: 'Closed', label: 'Closed' }
                  ].map(m => {
                    const isActive = filterMode === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => selectFilterMode(m.id)}
                        className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center gap-2 border transition ${
                          isActive
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : 'bg-slate-400'}`} />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Info Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 font-bold text-slate-800">
                  <span>Sand filter info</span>
                  <Activity size={13} className="text-slate-400" />
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Name</span>
                  <span className="font-semibold text-slate-800">Sand filter</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Status</span>
                  <span className="font-bold text-emerald-600">{filterMode}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Differential Pressure (ΔP)</span>
                  <span className="font-mono font-bold text-slate-800">{filterDp} bar</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Maintenance</span>
                  <span className="font-mono text-slate-700">25 Nov 2024</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Expected maintenance</span>
                  <span className="font-mono text-slate-700">7 Jun 2025</span>
                </div>
              </div>
            </div>

            {/* Right 8 Cols: Charts Grid */}
            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              <ScadaTrendChart
                title="Rotation speed"
                subtitle="Realtime - last 1 hour"
                uom="RPM"
                currentVal={pumpRunning ? 2120 : 0}
                data={rpmTrend}
                min={600}
                max={2400}
                color="#16a34a"
                thresholds={[
                  { label: '< 600', color: '#ef4444' },
                  { label: '600 - 800', color: '#f59e0b' },
                  { label: '800 - 2500', color: '#10b981' },
                  { label: '2500 - 2800', color: '#f59e0b' },
                  { label: '≥ 2800', color: '#ef4444' }
                ]}
              />
              <ScadaTrendChart
                title="Flow rate"
                subtitle="Realtime - last 1 hour"
                uom="L/min"
                currentVal={flowRate}
                data={flowTrend}
                min={80}
                max={200}
                color="#0284c7"
              />
              <ScadaTrendChart
                title="Vibration"
                subtitle="Realtime - last 1 hour"
                uom="mm/s"
                currentVal={vibrationTrend[vibrationTrend.length - 1]}
                data={vibrationTrend}
                min={0}
                max={2.5}
                color="#16a34a"
                thresholds={[
                  { label: '< 5', color: '#10b981' },
                  { label: '≥ 5', color: '#ef4444' }
                ]}
              />
              <ScadaTrendChart
                title="Pressure"
                subtitle="Realtime - last 1 hour"
                uom="bar"
                currentVal={pressureTrend[pressureTrend.length - 1]}
                data={pressureTrend}
                min={3.0}
                max={5.0}
                color="#16a34a"
                thresholds={[
                  { label: '< 3', color: '#ef4444' },
                  { label: '3 - 6', color: '#10b981' },
                  { label: '≥ 6', color: '#ef4444' }
                ]}
              />
            </div>
          </div>
        </div>
      )}

      {/* 3C. DEDICATED FULL SCREEN HEAT PUMP VIEW */}
      {viewMode === 'traditional' && deviceState === 'heat-pump' && (
        <div className="flex-1 p-6 max-w-[1720px] mx-auto w-full flex flex-col gap-5">
          {/* Top Bar */}
          <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-slate-200 shadow-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDeviceState(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition border border-slate-300"
              >
                <ArrowLeft size={14} />
                <span>Back to main</span>
              </button>
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span>Inverter Heat Pump HP-301 Operational State</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  heaterRunning ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {heaterRunning ? 'Running' : 'Standby'}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                  Target: {targetTemp.toFixed(1)} °C
                </span>
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMonitorWindowDevice('heat-pump')}
                className="px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold flex items-center gap-1.5 transition border border-sky-300"
              >
                <ExternalLink size={13} />
                <span>Monitor in Separate Window</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
            {/* Left 4 Cols: 3D Heat Pump + Controls + Info */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col items-center">
                <div className="w-full flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-800">Heat pump</span>
                  <button
                    onClick={toggleHeater}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold transition ${
                      heaterRunning ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {heaterRunning ? 'STOP HEATER' : 'START HEATER'}
                  </button>
                </div>
                <div className="w-64 h-56 my-3 relative flex items-center justify-center">
                  <img src="/assets/scada/symbols_3d/heat_pump_3d.png" alt="Inverter Heat Pump 3D" className="max-h-full max-w-full object-contain drop-shadow-md" />
                </div>
                {/* Temperature Controls */}
                <div className="w-full flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 mt-2">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Target Temperature</span>
                    <span className="text-lg font-black font-mono text-emerald-600">{targetTemp.toFixed(1)} °C</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => handleTempDelta(0.5)}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700"
                    >
                      +
                    </button>
                    <button 
                      onClick={() => handleTempDelta(-0.5)}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700"
                    >
                      -
                    </button>
                  </div>
                </div>
              </div>

              {/* Info Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 font-bold text-slate-800">
                  <span>Heat pump info</span>
                  <Activity size={13} className="text-slate-400" />
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Name</span>
                  <span className="font-semibold text-slate-800">Heat pump</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Label</span>
                  <span className="font-mono text-slate-700">HP-301 Inverter</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Status</span>
                  <span className={`font-bold ${heaterRunning ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {heaterRunning ? 'Running' : 'Standby'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">COP Efficiency</span>
                  <span className="font-mono font-bold text-emerald-600">5.4 COP</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Maintenance</span>
                  <span className="font-mono text-slate-700">25 Nov 2024</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Refrigerant Type</span>
                  <span className="font-mono text-slate-700">R32 Eco Inverter</span>
                </div>
              </div>
            </div>

            {/* Right 8 Cols: Alarms + Charts Grid */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                  <span className="font-bold text-slate-800">Alarms (Realtime - last day)</span>
                  <span className="text-[10px] text-slate-400 font-mono">0 active trips</span>
                </div>
                <div className="py-5 text-center text-xs text-slate-400 font-medium">
                  <span className="flex items-center justify-center gap-1.5 text-emerald-600">
                    <CheckCircle2 size={14} />
                    No alarms found &mdash; Heat pump operates at optimal thermodynamic COP
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ScadaTrendChart
                  title="Temperature Multi-Series"
                  subtitle="Realtime - last 1 hour"
                  uom="°C"
                  currentVal={targetTemp}
                  series={tempMultiSeries}
                  min={24}
                  max={42}
                  color="#16a34a"
                />
                <ScadaTrendChart
                  title="Rotation speed"
                  subtitle="Realtime - last 1 hour"
                  uom="RPM"
                  currentVal={heaterRunning ? 120 : 0}
                  data={heaterRunning ? Array.from({ length: 30 }, (_, i) => 120 + Math.sin(i * 0.4) * 20) : Array(30).fill(0)}
                  min={40}
                  max={160}
                  color="#16a34a"
                  thresholds={[
                    { label: '< 50', color: '#f59e0b' },
                    { label: '50 - 200', color: '#10b981' },
                    { label: '≥ 200', color: '#ef4444' }
                  ]}
                />
                <ScadaTrendChart
                  title="Compressor temperature"
                  subtitle="Realtime - last 5 minutes"
                  uom="°C"
                  currentVal={heaterRunning ? 58 : 28}
                  data={heaterRunning ? Array.from({ length: 30 }, (_, i) => 56 + Math.sin(i * 0.3) * 6) : Array(30).fill(28)}
                  min={48}
                  max={66}
                  color="#16a34a"
                  thresholds={[
                    { label: '< 100', color: '#10b981' },
                    { label: '100 - 200', color: '#f59e0b' },
                    { label: '≥ 200', color: '#ef4444' }
                  ]}
                />
                <ScadaTrendChart
                  title="Power consumption"
                  subtitle="Realtime - last 1 hour"
                  uom="Wh"
                  currentVal={heaterRunning ? 3000 : 100}
                  data={heaterRunning ? Array.from({ length: 30 }, (_, i) => 2800 + Math.sin(i * 0.2) * 200) : Array(30).fill(100)}
                  min={0}
                  max={3200}
                  color="#eab308"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gateway View */}
      {viewMode === 'traditional' && deviceState === 'gateway' && (
        <div className="flex-1 p-6 max-w-[1720px] mx-auto w-full flex flex-col gap-5">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {[
              { label: 'Status', value: 'Active', badgeColor: 'text-emerald-600', dot: true },
              { label: 'Gateway Name', value: 'Pool System Gateway' },
              { label: 'Gateway Type', value: 'default' },
              { label: 'Devices (Active | Inactive)', value: '14 | 0', badgeColor: 'text-sky-600' },
              { label: 'Connectors (Enabled | Disabled)', value: '1 | 0', badgeColor: 'text-emerald-600' },
              { label: 'Errors', value: '0', badgeColor: 'text-slate-500' }
            ].map((k, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">{k.label}</span>
                <span className={`text-xs md:text-sm font-bold mt-1 flex items-center gap-1.5 ${k.badgeColor || 'text-slate-800'}`}>
                  {k.dot && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                  {k.value}
                </span>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-800 mb-3">14 Connected Modbus Devices</h3>
            <table className="w-full text-left text-xs divide-y divide-slate-100">
              <thead>
                <tr className="text-slate-400 font-medium">
                  <th className="py-2 px-3">Device Name</th>
                  <th className="py-2 px-3">Type</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Connector</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Water pump (P-101)', type: 'Circulation Pump', status: pumpRunning ? 'Active' : 'Standby' },
                  { name: 'Sand filter (SF-201)', type: 'Pressure Filter', status: 'Active' },
                  { name: 'Heat pump (HP-301)', type: 'Inverter Chiller', status: heaterRunning ? 'Active' : 'Standby' },
                  { name: 'Filter PH sensor', type: 'pH Sensor', status: 'Active' },
                  { name: 'Flow meter transmitter', type: 'Electromagnetic', status: 'Active' },
                  { name: 'Pool level transmitter', type: 'Level Dial', status: 'Active' }
                ].map((d, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-semibold text-slate-800">{d.name}</td>
                    <td className="py-2 px-3 text-slate-500">{d.type}</td>
                    <td className="py-2 px-3"><span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">{d.status}</span></td>
                    <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">modbus</td>
                    <td className="py-2 px-3 text-right">
                      <button onClick={() => setMonitorWindowDevice(d.name.includes('pump') ? 'water-pump' : 'sand-filter')} className="text-cyan-600 font-semibold text-[11px]">
                        Open Monitor
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 4. MODE: HIGH-PERFORMANCE (HP) SCADA VIEW (5 Specialized Tabs)        */}
      {/* ===================================================================== */}
      {viewMode === 'hi-perf' && (
        <div className="flex-1 flex flex-col p-6 max-w-[1720px] mx-auto w-full gap-4">
          <div className="flex items-center gap-2 border-b border-slate-300 pb-3">
            {[
              { id: 'main', label: 'Main' },
              { id: 'pump', label: 'Water pump' },
              { id: 'heater', label: 'Heat pump' },
              { id: 'filter', label: 'Sand filter' },
              { id: 'alarms', label: 'Alarms' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setHpTab(tab.id)}
                className={`px-6 py-2 rounded-lg text-xs font-bold transition-all border ${
                  hpTab === tab.id
                    ? 'bg-slate-900 text-cyan-300 border-slate-800 shadow-md'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {hpTab === 'main' && (
            <div className="flex-1 relative aspect-[2237/1207] max-w-[1540px] mx-auto w-full rounded-2xl shadow-xl border border-slate-300 overflow-hidden bg-[#eef1f5]">
              <img src="/assets/scada/thingsboard/high-performance.webp" alt="High Performance SCADA Main" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
              {/* Dynamic Overlays */}
              <div style={{ left: '1.8%', top: '9.0%' }} className="absolute text-xs font-bold text-sky-600 font-mono">Active</div>
              <div style={{ left: '4.8%', top: '34.8%' }} className="absolute text-xs font-bold text-slate-800 font-mono">{outdoorTemp}</div>
              <div style={{ left: '11.8%', top: '32.8%' }} className="absolute text-xs font-bold text-slate-800 font-mono">{poolTemp}</div>
              <div style={{ left: '39.8%', top: '40.5%' }} className="absolute text-xs font-bold text-slate-900 font-mono">{poolVolume} L</div>
              <div style={{ left: '61.5%', top: '40.5%' }} className="absolute text-xs font-bold text-slate-900 font-mono">{flowRate} L/min</div>
              {/* Pump Toggle */}
              <div style={{ left: '28.0%', top: '85.5%' }} className="absolute flex gap-1">
                <button onClick={() => setPumpRunning(true)} className={`px-2 py-0.5 rounded text-[10px] font-bold ${pumpRunning ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'}`}>On</button>
                <button onClick={() => setPumpRunning(false)} className={`px-2 py-0.5 rounded text-[10px] font-bold ${!pumpRunning ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-700'}`}>Off</button>
              </div>
              {/* Heater Toggle */}
              <div style={{ left: '89.5%', top: '82.5%' }} className="absolute flex gap-1">
                <button onClick={() => setHeaterRunning(true)} className={`px-2 py-0.5 rounded text-[10px] font-bold ${heaterRunning ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'}`}>On</button>
                <button onClick={() => setHeaterRunning(false)} className={`px-2 py-0.5 rounded text-[10px] font-bold ${!heaterRunning ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-700'}`}>Off</button>
              </div>
            </div>
          )}

          {hpTab === 'pump' && (
            <div className="flex-1 relative aspect-[2237/1208] max-w-[1540px] mx-auto w-full rounded-2xl shadow-xl border border-slate-300 overflow-hidden bg-[#eef1f5]">
              <img src="/assets/scada/thingsboard/hp-water-pump-state.webp" alt="HP Water Pump State" className="absolute inset-0 w-full h-full object-cover" />
            </div>
          )}
          {hpTab === 'heater' && (
            <div className="flex-1 relative aspect-[2237/1208] max-w-[1540px] mx-auto w-full rounded-2xl shadow-xl border border-slate-300 overflow-hidden bg-[#eef1f5]">
              <img src="/assets/scada/thingsboard/hp-heat-pump-state.webp" alt="HP Heat Pump State" className="absolute inset-0 w-full h-full object-cover" />
            </div>
          )}
          {hpTab === 'filter' && (
            <div className="flex-1 relative aspect-[2238/1208] max-w-[1540px] mx-auto w-full rounded-2xl shadow-xl border border-slate-300 overflow-hidden bg-[#eef1f5]">
              <img src="/assets/scada/thingsboard/hp-sand-filter-state.webp" alt="HP Sand Filter State" className="absolute inset-0 w-full h-full object-cover" />
            </div>
          )}
          {hpTab === 'alarms' && (
            <div className="flex-1 relative aspect-[2187/1208] max-w-[1540px] mx-auto w-full rounded-2xl shadow-xl border border-slate-300 overflow-hidden bg-[#eef1f5]">
              <img src="/assets/scada/thingsboard/hp-gateway.webp" alt="HP Alarms and Gateway" className="absolute inset-0 w-full h-full object-cover" />
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* 5. SEPARATE MONITOR WINDOW OVERLAY (OPENS ON EQUIPMENT CLICK)         */}
      {/* ===================================================================== */}
      {monitorWindowDevice && equipmentMonitorDefs[monitorWindowDevice] && (
        <EquipmentTrendWindow
          device={equipmentMonitorDefs[monitorWindowDevice]}
          onClose={() => setMonitorWindowDevice(null)}
          onOpenFullView={(devId) => {
            setMonitorWindowDevice(null);
            setDeviceState(devId);
          }}
          liveValues={telemetry}
        />
      )}
    </div>
  );
}
