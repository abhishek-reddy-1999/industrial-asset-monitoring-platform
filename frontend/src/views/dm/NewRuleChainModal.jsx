import React, { useState } from 'react';
import { 
  X, GitFork, Plus, Layers, Shield, Check, AlertTriangle, 
  Settings, FolderTree, Tag, Radio, Zap
} from 'lucide-react';

export default function NewRuleChainModal({ isOpen, onClose, onChainCreated }) {
  const [name, setName] = useState('New Telemetry Processing Pipeline');
  const [description, setDescription] = useState('Ingests sensor telemetry, performs custom calculations, and dispatches actions.');
  const [category, setCategory] = useState('General');
  const [projectScope, setProjectScope] = useState('Yokogawa Refinery Unit A');
  const [isRoot, setIsRoot] = useState(false);
  const [defaultQueue, setDefaultQueue] = useState('Main');
  const [enabled, setEnabled] = useState(true);
  const [messageTypes, setMessageTypes] = useState([
    'POST_TELEMETRY_REQUEST',
    'POST_ATTRIBUTES_REQUEST'
  ]);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const toggleMessageType = (type) => {
    if (messageTypes.includes(type)) {
      setMessageTypes(messageTypes.filter(t => t !== type));
    } else {
      setMessageTypes([...messageTypes, type]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a Rule Chain Name');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        category,
        project_id: projectScope,
        is_root: isRoot,
        default_queue: defaultQueue,
        enabled,
        input_message_types: messageTypes
      };

      const res = await fetch('/api/v2/rule-chains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const created = await res.json();
        if (onChainCreated) onChainCreated(created);
        onClose();
      } else {
        const err = await res.json();
        alert(`Failed to create rule chain: ${err.detail || 'Server error'}`);
      }
    } catch (err) {
      alert(`Network error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0b1329] border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden text-slate-200">
        
        {/* HEADER */}
        <div className="h-14 px-6 border-b border-slate-800 bg-[#091024] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-950/70 border border-indigo-700 text-indigo-400">
              <GitFork className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white tracking-wide">
                Create New Rule Chain
              </h2>
              <p className="text-xs text-slate-400">
                Visual event-driven processing workflow with sandboxed JavaScript nodes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FORM BODY */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Rule Chain Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              placeholder="e.g. Pump Telemetry & KPI Processing Chain"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              placeholder="Describe the routing, filtering, and calculation scope..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="General">General Ingestion</option>
                <option value="KPI Analytics">KPI Analytics & Derivations</option>
                <option value="Alarm Processing">Alarm & Safety Trips</option>
                <option value="External Integration">External REST / Kafka / MQTT</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Default Queue
              </label>
              <select
                value={defaultQueue}
                onChange={(e) => setDefaultQueue(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="Main">Main (Default Asynchronous)</option>
                <option value="HighPriority">High Priority (Immediate)</option>
                <option value="Sequential">Sequential (Strict FIFO Ordering)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Input Message Types
            </label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {[
                { id: 'POST_TELEMETRY_REQUEST', label: 'Post Telemetry' },
                { id: 'POST_ATTRIBUTES_REQUEST', label: 'Post Attributes' },
                { id: 'ALARM_EVENT', label: 'Alarm Events' },
                { id: 'ACTIVITY_EVENT', label: 'Activity Logs' }
              ].map(t => (
                <label 
                  key={t.id}
                  onClick={() => toggleMessageType(t.id)}
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs font-medium transition ${
                    messageTypes.includes(t.id)
                      ? 'bg-indigo-950/60 border-indigo-700 text-indigo-300'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/40'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={messageTypes.includes(t.id)}
                    onChange={() => {}}
                    className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0"
                  />
                  <span>{t.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-800/80">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isRoot}
                onChange={(e) => setIsRoot(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
              />
              <span className="text-xs font-semibold text-slate-300">Set as Root Rule Chain</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-emerald-600 focus:ring-0"
              />
              <span className="text-xs font-semibold text-slate-300">Enable on Creation</span>
            </label>
          </div>

          {/* ACTIONS */}
          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{submitting ? 'Creating...' : 'Create & Open Studio'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
