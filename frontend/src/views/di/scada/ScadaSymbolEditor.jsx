import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, Code2, Play, Save, Check, AlertTriangle, 
  Tag, Sliders, Eye, RefreshCw, X, ShieldCheck, Box, 
  RotateCw, Droplets, Wind, Activity, ArrowLeft, Plus, Trash2
} from 'lucide-react';
import { sanitizeSvgPreview, registerScadaSymbol, updateScadaSymbol } from '../../../api/client';

export default function ScadaSymbolEditor({ 
  initialSymbol = null, 
  onSaveSuccess, 
  onCancel 
}) {
  const [activeTab, setActiveTab] = useState('svg_elements'); // 'general' | 'svg_elements' | 'tags' | 'behaviors' | 'preview'
  const [name, setName] = useState(initialSymbol?.name || 'Custom Centrifugal Pump');
  const [category, setCategory] = useState(initialSymbol?.category || 'Pumps');
  const [description, setDescription] = useState(initialSymbol?.description || '');
  const [version, setVersion] = useState(initialSymbol?.version || '1.0.0');
  const [defaultWidth, setDefaultWidth] = useState(initialSymbol?.default_width || 80);
  const [defaultHeight, setDefaultHeight] = useState(initialSymbol?.default_height || 80);
  
  // Raw SVG Content
  const [svgContent, setSvgContent] = useState(initialSymbol?.svg_content || `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <circle id="casing" cx="50" cy="50" r="35" fill="#1e293b" stroke="#64748b" stroke-width="3"/>
  <circle id="rotor" cx="50" cy="50" r="12" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
  <circle id="status_led" cx="72" cy="28" r="5" fill="#64748b"/>
</svg>`);

  const [sanitizationStatus, setSanitizationStatus] = useState(null); // { valid, tags, error }
  const [tags, setTags] = useState(initialSymbol?.tags || ['casing', 'rotor', 'status_led']);
  const [behaviors, setBehaviors] = useState(initialSymbol?.behaviors || [
    { type: 'rotation', target: 'rotor', trigger: 'running', speed: 1.0 },
    { type: 'fill', target: 'status_led', trigger: 'state_color' }
  ]);
  
  // Interactive Preview Controls state
  const [demoValues, setDemoValues] = useState({
    running: true,
    value: 65,
    state_color: '#10b981',
    level_pct: 65
  });

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [selectedSvgElement, setSelectedSvgElement] = useState(null);

  // Validate and sanitize whenever SVG changes
  const handleValidateSvg = async (svgStr) => {
    try {
      const res = await sanitizeSvgPreview(svgStr);
      setSanitizationStatus(res);
      if (res.valid && res.tags) {
        // Merge extracted IDs with existing tags
        const combined = Array.from(new Set([...tags, ...res.tags]));
        setTags(combined);
      }
    } catch (err) {
      setSanitizationStatus({ valid: false, error: err.message, tags: [] });
    }
  };

  useEffect(() => {
    handleValidateSvg(svgContent);
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setSvgContent(content);
        handleValidateSvg(content);
      }
    };
    reader.readAsText(file);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        name,
        category,
        description,
        version,
        default_width: Number(defaultWidth),
        default_height: Number(defaultHeight),
        svg_content: svgContent,
        tags,
        behaviors
      };

      let result;
      if (initialSymbol?.id) {
        result = await updateScadaSymbol(initialSymbol.id, payload);
      } else {
        result = await registerScadaSymbol(payload);
      }

      if (onSaveSuccess) onSaveSuccess(result);
    } catch (err) {
      setSaveError(err.message || 'Failed to save symbol');
    } finally {
      setSaving(false);
    }
  };

  const addBehavior = () => {
    setBehaviors(prev => [
      ...prev,
      { type: 'fill', target: tags[0] || 'body', trigger: 'state_color' }
    ]);
  };

  const removeBehavior = (idx) => {
    setBehaviors(prev => prev.filter((_, i) => i !== idx));
  };

  const updateBehavior = (idx, field, val) => {
    setBehaviors(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-[#020617] text-slate-100 overflow-hidden">
      {/* Top Header */}
      <div className="h-14 border-b border-slate-800 bg-slate-900/90 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-md transition-colors mr-1"
              title="Return to Symbol Library"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Sliders size={18} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              {initialSymbol ? `Edit Symbol: ${initialSymbol.name}` : 'Custom SVG Symbol Developer'}
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                Declarative State Engine
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">
              Inspect SVG nodes, assign symbolic tags, define state animations &amp; test with live simulator
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {saveError && (
            <span className="text-xs text-rose-400 font-mono flex items-center gap-1">
              <AlertTriangle size={13} />
              {saveError}
            </span>
          )}
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 rounded-md hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || sanitizationStatus?.valid === false}
            className="px-4 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm shadow-emerald-600/30"
          >
            <Save size={14} />
            <span>{saving ? 'Validating & Saving...' : 'Save Symbol to Library'}</span>
          </button>
        </div>
      </div>

      {/* Editor Sub-Tabs */}
      <div className="h-10 border-b border-slate-800 bg-slate-900/50 px-6 flex items-center gap-1">
        {[
          { key: 'general', label: '1. General Info', icon: Box },
          { key: 'svg_elements', label: '2. SVG Elements & Source', icon: Code2 },
          { key: 'tags', label: '3. Symbolic Tags', icon: Tag },
          { key: 'behaviors', label: '4. Dynamic Behaviors', icon: Activity },
          { key: 'preview', label: '5. Live Demo Sandbox', icon: Play }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                isActive
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Icon size={13} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Tab Views */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Interactive Workspace */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* TAB 1: GENERAL INFO */}
          {activeTab === 'general' && (
            <div className="max-w-xl space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Symbol Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  placeholder="e.g. Centrifugal Slurry Pump"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    {['Pumps', 'Motors', 'Valves', 'Tanks', 'Pipes', 'Process Equipment', 'Instruments', 'HMI Controls', 'Custom'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Version</label>
                  <input
                    type="text"
                    value={version}
                    onChange={e => setVersion(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                    placeholder="1.0.0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Default Width (px)</label>
                  <input
                    type="number"
                    value={defaultWidth}
                    onChange={e => setDefaultWidth(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Default Height (px)</label>
                  <input
                    type="number"
                    value={defaultHeight}
                    onChange={e => setDefaultHeight(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Engineering Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-md p-3 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  placeholder="Operational details, process piping connections, and equipment classification..."
                />
              </div>
            </div>
          )}

          {/* TAB 2: SVG ELEMENTS & SOURCE */}
          {activeTab === 'svg_elements' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-300">Sanitized SVG Source</span>
                  {sanitizationStatus?.valid ? (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
                      <ShieldCheck size={12} />
                      Valid &amp; Safe SVG
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 font-mono">
                      <AlertTriangle size={12} />
                      {sanitizationStatus?.error || 'Invalid SVG'}
                    </span>
                  )}
                </div>

                <label className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer flex items-center gap-1.5 transition-colors">
                  <Upload size={13} />
                  <span>Upload .SVG File</span>
                  <input type="file" accept=".svg" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              {/* Code editor textarea */}
              <textarea
                value={svgContent}
                onChange={e => {
                  setSvgContent(e.target.value);
                  handleValidateSvg(e.target.value);
                }}
                rows={14}
                className="w-full bg-slate-950 border border-slate-800 rounded-md p-3 font-mono text-[11px] text-sky-300 focus:outline-none focus:border-sky-500 leading-relaxed"
                spellCheck={false}
              />
            </div>
          )}

          {/* TAB 3: SYMBOLIC TAGS */}
          {activeTab === 'tags' && (
            <div className="max-w-xl space-y-4">
              <div className="text-xs text-slate-400">
                Symbolic tags identify specific internal SVG elements (e.g. <code className="text-sky-300">rotor</code>, <code className="text-sky-300">status_light</code>, <code className="text-sky-300">casing</code>) that will be controlled by dynamic behaviors.
              </div>

              <div className="space-y-2">
                {tags.map((tag, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2.5 rounded-md bg-slate-900/60 border border-slate-800">
                    <Tag size={14} className="text-sky-400" />
                    <input
                      type="text"
                      value={tag}
                      onChange={e => {
                        const newTags = [...tags];
                        newTags[idx] = e.target.value;
                        setTags(newTags);
                      }}
                      className="flex-1 bg-transparent text-xs text-slate-200 font-mono focus:outline-none"
                    />
                    <button
                      onClick={() => setTags(tags.filter((_, i) => i !== idx))}
                      className="text-slate-500 hover:text-rose-400 p-1"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setTags([...tags, `tag_${tags.length + 1}`])}
                className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-700 text-sky-300 flex items-center gap-1.5"
              >
                <Plus size={13} />
                <span>Add Custom Symbolic Tag</span>
              </button>
            </div>
          )}

          {/* TAB 4: DYNAMIC BEHAVIORS */}
          {activeTab === 'behaviors' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  Define declarative rules that map telemetry states to visual SVG modifications.
                </div>
                <button
                  onClick={addBehavior}
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1.5"
                >
                  <Plus size={13} />
                  <span>Add Behavior Rule</span>
                </button>
              </div>

              <div className="space-y-3">
                {behaviors.map((b, idx) => (
                  <div key={idx} className="p-3.5 rounded-lg bg-slate-900/70 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <Activity size={14} className="text-amber-400" />
                        Rule #{idx + 1}
                      </span>
                      <button
                        onClick={() => removeBehavior(idx)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Behavior Action</label>
                        <select
                          value={b.type}
                          onChange={e => updateBehavior(idx, 'type', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
                        >
                          <option value="rotation">Rotation (when running)</option>
                          <option value="fill">Fill Color Transition</option>
                          <option value="stroke">Stroke Color</option>
                          <option value="level_height">Liquid Level Fill (%)</option>
                          <option value="text">Digital Text Readout</option>
                          <option value="dash_flow">Animated Pipe Dash Flow</option>
                          <option value="blinking">Alarm Blinking</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Target SVG Tag</label>
                        <select
                          value={b.target}
                          onChange={e => updateBehavior(idx, 'target', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-mono"
                        >
                          {tags.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Trigger Attribute / State</label>
                        <input
                          type="text"
                          value={b.trigger}
                          onChange={e => updateBehavior(idx, 'trigger', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-mono"
                          placeholder="e.g. running, level_pct"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: LIVE DEMO SANDBOX */}
          {activeTab === 'preview' && (
            <div className="space-y-5 max-w-lg">
              <div className="text-xs text-slate-400">
                Adjust simulated process telemetry to verify that the symbol's declarative behaviors animate accurately.
              </div>

              {/* Running Switch */}
              <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Equipment State (Running / Stopped)</div>
                  <div className="text-[10px] text-slate-500">Triggers motor rotation and impeller speed</div>
                </div>
                <button
                  onClick={() => setDemoValues(prev => ({ ...prev, running: !prev.running }))}
                  className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                    demoValues.running
                      ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/40'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {demoValues.running ? 'RUNNING (1)' : 'STOPPED (0)'}
                </button>
              </div>

              {/* Liquid Level Slider */}
              <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">Process Level / Measurement</span>
                  <span className="font-mono text-sky-400 font-bold">{demoValues.level_pct}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={demoValues.level_pct}
                  onChange={e => setDemoValues(prev => ({ ...prev, level_pct: Number(e.target.value) }))}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>

              {/* Status Color Picker */}
              <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Status Indicator Color</div>
                  <div className="text-[10px] text-slate-500">Green = Good, Red = Trip/Alarm, Amber = Warning</div>
                </div>
                <div className="flex items-center gap-2">
                  {['#10b981', '#f59e0b', '#ef4444', '#64748b'].map(c => (
                    <button
                      key={c}
                      onClick={() => setDemoValues(prev => ({ ...prev, state_color: c }))}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        demoValues.state_color === c ? 'scale-110 border-white' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Preview Viewport */}
        <div className="w-96 border-l border-slate-800 bg-slate-950 flex flex-col items-center justify-center p-6 relative">
          <div className="absolute top-4 left-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Live Vector Canvas Preview
          </div>

          <div className="w-56 h-56 rounded-xl border border-slate-800 bg-[#020617] flex items-center justify-center p-4 shadow-2xl relative overflow-hidden">
            {/* Background grid */}
            <div 
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(#38bdf8 1px, transparent 1px)',
                backgroundSize: '16px 16px'
              }}
            />

            {/* Injected SVG with CSS animation rules applied according to demoValues */}
            <div
              className={`w-full h-full flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full ${
                demoValues.running ? '[&_#rotor]:animate-spin [&_#impeller]:animate-spin' : ''
              }`}
              style={{
                '--state-color': demoValues.state_color
              }}
              dangerouslySetInnerHTML={{
                __html: svgContent.replace(/id="status_led"[^>]*fill="[^"]*"/, `id="status_led" fill="${demoValues.state_color}"`)
              }}
            />
          </div>

          <div className="mt-4 text-center">
            <div className="text-xs font-bold text-slate-200">{name}</div>
            <div className="text-[10px] font-mono text-slate-500 mt-0.5">
              Canvas Size: {defaultWidth} × {defaultHeight} px
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
