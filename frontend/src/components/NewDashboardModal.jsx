import React, { useState } from 'react';
import { X, Plus, LayoutGrid, Layers, Sparkles, CheckCircle2, ShieldCheck, Cpu } from 'lucide-react';

export default function NewDashboardModal({ isOpen, onClose, onCreate }) {
  const [activeTab, setActiveTab] = useState('generator'); // 'generator' or 'custom'
  
  // Custom Form
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Process Monitoring');
  const [template, setTemplate] = useState('standard');

  // Generator Form
  const [genMachinery, setGenMachinery] = useState('pump');
  const [genAssetName, setGenAssetName] = useState('Charge Pump P-101A');
  const [genDeviceId, setGenDeviceId] = useState('pump-p101a-hub-01');
  const [genTitle, setGenTitle] = useState('Charge Pump P-101A Dynamic SCADA');
  const [genLoading, setGenLoading] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

  if (!isOpen) return null;

  const handleRunGenerator = async () => {
    try {
      setGenLoading(true);
      const res = await fetch('/api/v1/dashboards/generate-ui', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: genTitle,
          asset_name: genAssetName,
          device_id: genDeviceId,
          machinery_type: genMachinery
        })
      });
      const data = await res.json();
      setValidationResult(data);

      if (data.status === 'SUCCESS' && data.layout) {
        // Dispatch to parent
        setTimeout(() => {
          onCreate({
            title: data.title,
            slug: data.slug,
            category: 'Asset Health Insights',
            time_range: 'now-15m',
            refresh_interval: '1s',
            layout: data.layout
          });
          onClose();
        }, 1200);
      }
    } catch (e) {
      console.error("UI Generation error:", e);
    } finally {
      setGenLoading(false);
    }
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const slug = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    let initialLayout = [];
    if (template === 'standard') {
      initialLayout = [
        { id: 'p_ts1', type: 'timeseries', title: 'Process Temperature Trend', tags: ['TIC_101.PV', 'TIC_102.PV'], x: 0, y: 0, w: 8, h: 5 },
        { id: 'p_g1', type: 'gauge', title: 'Column Pressure', tags: ['PIC_101.PV'], min: 0, max: 200, unit: 'kPa', x: 8, y: 0, w: 4, h: 5 },
        { id: 'p_stat1', type: 'singlestat', title: 'Feed Flow Rate', tags: ['FIC_101.PV'], unit: 'm³/h', x: 0, y: 5, w: 4, h: 4 },
        { id: 'p_alm1', type: 'alarms', title: 'Unit Alarms Log', tags: [], x: 4, y: 5, w: 8, h: 4 }
      ];
    } else if (template === 'analytics') {
      initialLayout = [
        { id: 'p_anom1', type: 'mt_anomaly', title: 'Yokogawa MT-Anomaly Radar', tags: ['AHI_C101.MT_DIST', 'AHI_C101.HEALTH'], x: 0, y: 0, w: 6, h: 6 },
        { id: 'p_script1', type: 'echart_script', title: 'Custom Thermal Differential (ΔT)', tags: ['TIC_101.PV', 'TIC_102.PV'], x: 6, y: 0, w: 6, h: 6 },
        { id: 'p_stat1', type: 'singlestat', title: 'Asset Health Score', tags: ['AHI_C101.HEALTH'], unit: '%', x: 0, y: 6, w: 4, h: 4 },
        { id: 'p_stat2', type: 'singlestat', title: 'Pump Vibration RMS', tags: ['VIB_101.RMS'], unit: 'mm/s', x: 4, y: 6, w: 4, h: 4 },
        { id: 'p_stat3', type: 'singlestat', title: 'MT Distance Anomaly', tags: ['AHI_C101.MT_DIST'], unit: 'score', x: 8, y: 6, w: 4, h: 4 }
      ];
    }

    onCreate({
      title: title.trim(),
      slug: slug || 'custom-dash-' + Date.now(),
      category: category,
      time_range: 'now-15m',
      refresh_interval: '1s',
      layout: initialLayout
    });

    setTitle('');
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LayoutGrid size={18} color="#38bdf8" />
            <span style={{ fontWeight: 600, fontSize: '0.95rem', color: '#f1f5f9' }}>
              Create & Validate Dashboard UI
            </span>
          </div>
          <button className="btn" onClick={onClose} style={{ padding: '4px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Top Tab Mode Selector */}
        <div style={{ display: 'flex', background: '#0a0d14', padding: '4px', margin: '12px 20px 0 20px', borderRadius: '6px' }}>
          <button
            type="button"
            className="dm-btn"
            onClick={() => setActiveTab('generator')}
            style={{
              flex: 1,
              fontSize: '0.78rem',
              background: activeTab === 'generator' ? '#0284c7' : 'transparent',
              color: activeTab === 'generator' ? '#fff' : '#94a3b8',
              border: 'none',
              fontWeight: activeTab === 'generator' ? 600 : 400
            }}
          >
            ⚡ Smart UI Generator & Validator
          </button>
          <button
            type="button"
            className="dm-btn"
            onClick={() => setActiveTab('custom')}
            style={{
              flex: 1,
              fontSize: '0.78rem',
              background: activeTab === 'custom' ? '#0284c7' : 'transparent',
              color: activeTab === 'custom' ? '#fff' : '#94a3b8',
              border: 'none',
              fontWeight: activeTab === 'custom' ? 600 : 400
            }}
          >
            Custom Canvas / Starter Templates
          </button>
        </div>

        {activeTab === 'generator' ? (
          /* ========================================================
             TAB 1: SMART UI GENERATOR & VALIDATOR
             ======================================================== */
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>
              Generates an industrial dashboard with centered machinery schematics, symmetric gauges & donut meters, and a <strong>Columnar DataTable</strong>. Automatically runs 5 geometric and data stream validation checks.
            </p>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Machinery Type</label>
              <select
                className="form-select"
                value={genMachinery}
                onChange={(e) => {
                  const m = e.target.value;
                  setGenMachinery(m);
                  if (m === 'pump') {
                    setGenAssetName('Charge Pump P-101A');
                    setGenDeviceId('pump-p101a-hub-01');
                    setGenTitle('Charge Pump P-101A Dynamic SCADA');
                  } else if (m === 'column') {
                    setGenAssetName('Crude Distillation Column C-101');
                    setGenDeviceId('cdu-overhead-yokogawa-yta610');
                    setGenTitle('Atmospheric Fractionator C-101 SCADA');
                  } else if (m === 'tank') {
                    setGenAssetName('Crude Feed Storage Tank TK-101');
                    setGenDeviceId('dfc4960b-b9f0-42ef-8d94-43fd65e95631');
                    setGenTitle('Storage Tank TK-101 Level & Inventory');
                  }
                }}
              >
                <option value="pump">Centrifugal Pump Array (Differential Head, Vibration, Flow)</option>
                <option value="column">Fractionator / Distillation Column (Temps, Delta T, Column Top)</option>
                <option value="tank">Industrial Storage Tank (Level Gauge, Inventory)</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Asset / Machinery Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={genAssetName}
                  onChange={(e) => setGenAssetName(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Device ID Binding</label>
                <input
                  type="text"
                  className="form-input mono"
                  value={genDeviceId}
                  onChange={(e) => setGenDeviceId(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Dashboard Title</label>
              <input
                type="text"
                className="form-input"
                value={genTitle}
                onChange={(e) => setGenTitle(e.target.value)}
              />
            </div>

            {/* Validation Feedback Card */}
            {validationResult && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '6px',
                padding: '10px 12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontWeight: 700, fontSize: '0.82rem' }}>
                    <ShieldCheck size={16} />
                    <span>{validationResult.validation_summary}</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 600 }}>
                    Score: {validationResult.validation_score}% ({validationResult.widgets_count} Widgets Generated)
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {validationResult.validation_checks?.map((chk, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: '#cbd5e1' }}>
                      <CheckCircle2 size={12} color="#10b981" />
                      <strong>{chk.check}:</strong> <span>{chk.detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="modal-footer" style={{ marginTop: '8px', padding: 0 }}>
              <button type="button" className="btn" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleRunGenerator}
                disabled={genLoading}
              >
                <Sparkles size={14} />
                <span>{genLoading ? 'Generating & Validating...' : 'Generate & Validate Machinery UI'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* ========================================================
             TAB 2: CUSTOM STARTER FORM
             ======================================================== */
          <form onSubmit={handleCustomSubmit}>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Dashboard Title</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g. Vacuum Fractionator Unit 200"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="form-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="Process Monitoring">Process Monitoring</option>
                  <option value="Asset Health Insights">Asset Health Insights</option>
                  <option value="Plant-Wide Operations">Plant-Wide Operations</option>
                  <option value="Petrochemical & Refining">Petrochemical & Refining</option>
                  <option value="Custom Engineering">Custom Engineering</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Starter Template</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {[
                    { id: 'blank', name: 'Blank Canvas', desc: 'Empty drag-and-drop workspace' },
                    { id: 'standard', name: 'Standard Unit', desc: 'Trends, Gauge & Alarms' },
                    { id: 'analytics', name: 'AI Analytics', desc: 'MT-Anomaly, Script & KPIs' },
                  ].map(t => (
                    <div
                      key={t.id}
                      onClick={() => setTemplate(t.id)}
                      style={{
                        padding: '10px 8px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        border: template === t.id ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.08)',
                        background: template === t.id ? 'rgba(56, 189, 248, 0.15)' : 'rgba(0,0,0,0.2)',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: template === t.id ? '#38bdf8' : '#f1f5f9' }}>
                        {t.name}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
                        {t.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                <Plus size={14} /> Create Dashboard
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
