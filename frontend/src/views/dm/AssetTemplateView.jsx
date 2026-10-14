import React, { useState, useEffect } from 'react';
import { 
  Plus, Cpu, Zap, Database, Terminal, Link, Activity, 
  Trash2, Play, Check, ChevronRight, X, ArrowRight, Layers, Edit2, Sparkles, Variable, Eye
} from 'lucide-react';
import { useDM } from './dmContext';
import DMCommonControls from './DMCommonControls';
import ExpressionEditor from './ExpressionEditor';

export default function AssetTemplateView() {
  const {
    assetTemplates = [],
    createAssetTemplate,
    updateAssetTemplate,
    deleteAssetTemplate,
    deployAssetTemplate,
    assets = [],
    devices = [],
    deviceTemplates = [],
    integrations = [],
    uomList = [],
    showToast
  } = useDM();

  const [selectedTemplateId, setSelectedTemplateId] = useState(assetTemplates[0]?.id || null);
  const selectedTemplate = assetTemplates.find(t => t.id === selectedTemplateId) || assetTemplates[0];

  useEffect(() => {
    if (assetTemplates && assetTemplates.length > 0) {
      if (!selectedTemplateId || !assetTemplates.some(t => t.id === selectedTemplateId)) {
        setSelectedTemplateId(assetTemplates[0].id);
      }
    }
  }, [assetTemplates, selectedTemplateId]);

  // Deploy Template Wizard State
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [deployParentId, setDeployParentId] = useState('');

  useEffect(() => {
    if (assets?.length > 0 && !deployParentId) {
      setDeployParentId(assets[0].id);
    }
  }, [assets, deployParentId]);
  const [deployAssetName, setDeployAssetName] = useState('');
  const [deviceMappings, setDeviceMappings] = useState({});
  const [channelMappings, setChannelMappings] = useState({});
  const [deployMode, setDeployMode] = useState('single'); // 'single' or 'batch'
  const [customDeviceId, setCustomDeviceId] = useState('');
  const [batchDeviceIds, setBatchDeviceIds] = useState('PUMP-101A, PUMP-101B, PUMP-102A');

  // Create & Edit Template Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    markup_devices: ['device1', 'device2'],
    markup_channels: ['channel1'],
    attributes: [
      { name: 'Suction Pressure', type: 'Dynamic', uom: 'kPa', device_markup: 'device1', metric: 'suction_pressure', data_type: 'Double', decimal_place: 1 },
      { name: 'Discharge Pressure', type: 'Dynamic', uom: 'kPa', device_markup: 'device1', metric: 'discharge_pressure', data_type: 'Double', decimal_place: 1 },
      { name: 'Bearing Vibration', type: 'Dynamic', uom: 'mm/s', device_markup: 'device2', metric: 'bearing_vibration', data_type: 'Double', decimal_place: 2 },
      { name: 'Pump Head Calculation', type: 'Runtime', uom: 'm', expression: 'return (1000 * (@Discharge_Pressure - @Suction_Pressure) / (9.81 * 850));', data_type: 'Double', decimal_place: 2, trigger_attribute: 'Discharge Pressure' }
    ]
  });

  // Inline / Submodal Attribute Mapping State (for both Create Modal & Existing Template)
  const [isAttrSubFormOpen, setIsAttrSubFormOpen] = useState(false);
  const [editingAttrIndex, setEditingAttrIndex] = useState(null); // index in templateForm.attributes or null
  const [attrSubFormTarget, setAttrSubFormTarget] = useState('create'); // 'create' or 'existing'
  const [attrDraft, setAttrDraft] = useState({
    name: '',
    type: 'Dynamic',
    uom: 'kPa',
    device_markup: 'device1',
    metric: '',
    expression: '',
    data_type: 'Double',
    decimal_place: 1,
    default_value: '0.0',
    trigger_attribute: ''
  });

  // Collect all known metric keys from device templates and connected devices for quick selection
  const allKnownDeviceMetrics = React.useMemo(() => {
    const list = [];
    (deviceTemplates || []).forEach(dt => {
      (dt.metric_keys || dt.metrics || []).forEach(mk => {
        const k = typeof mk === 'string' ? mk : (mk.key || mk.name);
        if (k && !list.includes(k)) list.push(k);
      });
    });
    (devices || []).forEach(d => {
      if (d.last_payload && typeof d.last_payload === 'object') {
        const extractKeys = (obj, prefix = '') => {
          Object.keys(obj).forEach(key => {
            const full = prefix ? `${prefix}.${key}` : key;
            if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
              extractKeys(obj[key], full);
            } else {
              if (!list.includes(full)) list.push(full);
            }
          });
        };
        extractKeys(d.last_payload);
      }
    });
    // Add common Yokogawa metrics if list is short
    ['suction_pressure', 'discharge_pressure', 'bearing_vibration', 'temperature', 'tags.FIC_101.PV', 'tags.LIC_101.PV', 'flow_rate', 'power_kw'].forEach(k => {
      if (!list.includes(k)) list.push(k);
    });
    return list;
  }, [deviceTemplates, devices]);

  const columns = [
    { key: 'name', label: 'Attribute Name' },
    { key: 'type', label: 'Type' },
    { key: 'uom', label: 'UoM' },
    { key: 'device_markup', label: 'Device Markup' },
    { key: 'metric', label: 'Metric Key' },
    { key: 'expression', label: 'Expression' },
    { key: 'data_type', label: 'Data Type' }
  ];

  const handleOpenDeploy = (tmpl) => {
    setSelectedTemplateId(tmpl.id);
    setDeployAssetName(`${tmpl.name} Unit`);
    setDeployParentId(assets[0]?.id || '');

    // Prepare default mappings for each markup device
    const devMap = {};
    (tmpl.markup_devices || ['device1']).forEach((d, idx) => {
      devMap[d] = devices[idx]?.identifier || devices[0]?.identifier || '';
    });
    setDeviceMappings(devMap);

    const chanMap = {};
    (tmpl.markup_channels || []).forEach((c, idx) => {
      chanMap[c] = integrations[idx]?.name || integrations[0]?.name || '';
    });
    setChannelMappings(chanMap);

    setIsDeployModalOpen(true);
  };

  return (
    <div className="dm-entity-container">
      <div className="dm-entity-header-row">
        <div>
          <h2 className="dm-page-title">Asset Template Entity (Section 9.2)</h2>
          <p className="dm-page-subtitle">
            Configure standardized asset models with Device Markups (e.g. <code>Attribute.device1.metric</code>) and deploy repeatable plant equipment in 1-click.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="dm-btn dm-btn-primary" onClick={() => setIsCreateModalOpen(true)}>
            <Plus size={14} /> <span>Create Asset Template</span>
          </button>
        </div>
      </div>

      <div className="dm-templates-grid">
        {/* Templates Sidebar List */}
        <div className="dm-templates-list-panel">
          <div className="dm-panel-subhead">Configured Templates ({assetTemplates.length})</div>
          {assetTemplates.length === 0 ? (
            <div style={{ padding: '24px 12px', textAlign: 'center', color: '#64748b', fontSize: '0.78rem' }}>
              No asset templates created yet.
            </div>
          ) : (
            assetTemplates.map(tmpl => (
              <div 
                key={tmpl.id}
                className={`dm-template-card ${selectedTemplate?.id === tmpl.id ? 'active' : ''}`}
                onClick={() => setSelectedTemplateId(tmpl.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#f8fafc' }}>{tmpl.name}</h4>
                  <span className="dm-tbl-row-count">{tmpl.attributes?.length || 0} attrs</span>
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.74rem', color: '#94a3b8' }}>
                  {tmpl.description}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                  <span style={{ fontSize: '0.68rem', color: '#38bdf8', fontFamily: 'monospace' }}>
                    Markups: {(tmpl.markup_devices || []).join(', ') || 'device1'}
                  </span>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button 
                      className="dm-btn dm-btn-primary" 
                      style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                      onClick={(e) => { e.stopPropagation(); handleOpenDeploy(tmpl); }}
                      title="Deploy Template"
                    >
                      <Play size={10} /> Deploy
                    </button>
                    <button 
                      className="dm-row-action-btn delete" 
                      style={{ padding: '4px 6px' }}
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        if (window.confirm(`Are you sure you want to delete template "${tmpl.name}"?`)) {
                          deleteAssetTemplate(tmpl.id);
                        }
                      }}
                      title={`Delete Template ${tmpl.name}`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Selected Template Attribute Inspector */}
        <div className="dm-template-detail-panel">
          {selectedTemplate ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#f8fafc' }}>{selectedTemplate.name}</h3>
                  <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '2px' }}>{selectedTemplate.description}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className="dm-btn dm-btn-secondary" 
                    onClick={() => {
                      setAttrSubFormTarget('existing');
                      setEditingAttrIndex(null);
                      setAttrDraft({
                        name: '',
                        type: 'Dynamic',
                        uom: 'kPa',
                        device_markup: selectedTemplate.markup_devices?.[0] || 'device1',
                        metric: '',
                        expression: '',
                        data_type: 'Double',
                        decimal_place: 1,
                        default_value: '0.0',
                        trigger_attribute: ''
                      });
                      setIsAttrSubFormOpen(true);
                    }}
                  >
                    <Plus size={13} /> Add Attribute to Template
                  </button>
                  <button 
                    className="dm-btn dm-btn-primary" 
                    onClick={() => handleOpenDeploy(selectedTemplate)}
                  >
                    <Play size={13} /> Deploy Asset Template
                  </button>
                  <button 
                    className="dm-btn dm-btn-danger" 
                    style={{ background: 'rgba(239, 68, 68, 0.15)', borderColor: '#ef4444', color: '#fca5a5' }}
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete template "${selectedTemplate.name}"?`)) {
                        deleteAssetTemplate(selectedTemplate.id);
                      }
                    }}
                    title="Delete Asset Template"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>

              <div className="dm-markup-notice-box">
                <span style={{ color: '#f59e0b', fontWeight: 600 }}>💡 Device Markup Optimization (Page 22-23):</span>
                <span>
                  Attributes configured with markup groups like <code>device1</code> and <code>device2</code> allow bulk assignment of real field IoT devices upon deployment without entering device IDs 9+ times.
                </span>
              </div>

              <DMCommonControls 
                columns={[...columns, { key: 'actions', label: 'Actions' }]}
                totalRecords={selectedTemplate.attributes?.length || 0}
              />

              <div className="dm-table-scroll-container">
                <table className="dm-data-table">
                  <thead>
                    <tr>
                      <th>Attribute Name</th>
                      <th>Type</th>
                      <th>UoM</th>
                      <th>Device Markup Group</th>
                      <th>Metric Key</th>
                      <th>Expression</th>
                      <th>Data Type</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!selectedTemplate.attributes || selectedTemplate.attributes.length === 0) ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '36px 12px', color: '#94a3b8' }}>
                          <div style={{ marginBottom: '8px', fontSize: '0.82rem' }}>No attributes mapped to this template yet.</div>
                          <button 
                            className="dm-btn dm-btn-primary" 
                            style={{ fontSize: '0.75rem', padding: '5px 12px' }}
                            onClick={() => {
                              setAttrSubFormTarget('existing');
                              setEditingAttrIndex(null);
                              setAttrDraft({
                                name: '',
                                type: 'Dynamic',
                                uom: 'kPa',
                                device_markup: selectedTemplate.markup_devices?.[0] || 'device1',
                                metric: '',
                                expression: '',
                                data_type: 'Double',
                                decimal_place: 1,
                                default_value: '0.0',
                                trigger_attribute: ''
                              });
                              setIsAttrSubFormOpen(true);
                            }}
                          >
                            <Plus size={13} /> Map Attribute to Template
                          </button>
                        </td>
                      </tr>
                    ) : (
                      selectedTemplate.attributes.map((attr, idx) => (
                      <tr key={idx} className="dm-table-row">
                        <td style={{ fontWeight: 600, color: '#f8fafc' }}>{attr.name}</td>
                        <td>
                          <span className="dm-tree-badge">{attr.type}</span>
                        </td>
                        <td>{attr.uom || '-'}</td>
                        <td className="mono" style={{ color: '#f59e0b' }}>
                          {attr.device_markup ? <code>{attr.device_markup}</code> : '-'}
                        </td>
                        <td className="mono" style={{ color: '#38bdf8' }}>{attr.metric || '-'}</td>
                        <td className="mono" style={{ color: '#a855f7', fontSize: '0.74rem' }}>{attr.expression || '-'}</td>
                        <td>{attr.data_type || 'Double'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="dm-row-action-btn"
                            title="Edit Attribute"
                            style={{ marginRight: '6px' }}
                            onClick={() => {
                              setAttrSubFormTarget('existing');
                              setEditingAttrIndex(idx);
                              setAttrDraft({ ...attr });
                              setIsAttrSubFormOpen(true);
                            }}
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            className="dm-row-action-btn delete"
                            title="Remove Attribute from Template"
                            onClick={async () => {
                              const updatedAttrs = (selectedTemplate.attributes || []).filter((_, i) => i !== idx);
                              await updateAssetTemplate(selectedTemplate.id, {
                                ...selectedTemplate,
                                attributes: updatedAttrs
                              });
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
              <Layers size={36} style={{ margin: '0 auto 12px', opacity: 0.3, color: '#38bdf8' }} />
              <h4 style={{ color: '#f8fafc', fontSize: '1rem', marginBottom: '6px' }}>No Asset Templates</h4>
              <p style={{ fontSize: '0.8rem', maxWidth: '400px', margin: '0 auto 16px' }}>
                Create an asset template with dynamic and runtime attributes to standardize equipment definitions across your plant.
              </p>
              <button className="dm-btn dm-btn-primary" onClick={() => setIsCreateModalOpen(true)}>
                <Plus size={14} /> Create Asset Template
              </button>
            </div>
          )}
        </div>
      </div>

      {/* DEPLOY TEMPLATE WIZARD MODAL (Manual Page 22-23) */}
      {isDeployModalOpen && selectedTemplate && (
        <div className="modal-backdrop" style={{ zIndex: 1400 }}>
          <div className="dm-modal-box" style={{ width: '600px' }}>
            <div className="dm-modal-header">
              <h3>Deploy Template: {selectedTemplate.name}</h3>
              <button onClick={() => setIsDeployModalOpen(false)} className="dm-close-btn"><X size={18} /></button>
            </div>
            <div className="dm-modal-body">
              <p className="dm-modal-desc">
                Instantiate new asset(s) in the plant hierarchy. Map each Device Markup to assign all {selectedTemplate.attributes?.length || 0} attributes. You can assign existing devices or supply new Device IDs.
              </p>

              {/* Deployment Mode Switch */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', background: '#0a0d14', padding: '4px', borderRadius: '6px' }}>
                <button
                  type="button"
                  className="dm-btn"
                  onClick={() => setDeployMode('single')}
                  style={{
                    flex: 1,
                    fontSize: '0.75rem',
                    background: deployMode === 'single' ? '#0284c7' : 'transparent',
                    color: deployMode === 'single' ? '#fff' : '#94a3b8',
                    border: 'none',
                    fontWeight: deployMode === 'single' ? 600 : 400
                  }}
                >
                  Single Asset Deployment
                </button>
                <button
                  type="button"
                  className="dm-btn"
                  onClick={() => setDeployMode('batch')}
                  style={{
                    flex: 1,
                    fontSize: '0.75rem',
                    background: deployMode === 'batch' ? '#0284c7' : 'transparent',
                    color: deployMode === 'batch' ? '#fff' : '#94a3b8',
                    border: 'none',
                    fontWeight: deployMode === 'batch' ? 600 : 400
                  }}
                >
                  ⚡ Batch Deploy (Multiple Device IDs)
                </button>
              </div>

              <div className="dm-form-group">
                <label className="dm-field-label">Target Plant Hierarchy Parent</label>
                <select 
                  className="dm-select"
                  value={deployParentId}
                  onChange={(e) => setDeployParentId(e.target.value)}
                >
                  {assets.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.level}) — {a.path}</option>
                  ))}
                </select>
              </div>

              <div className="dm-form-group">
                <label className="dm-field-label">
                  {deployMode === 'batch' ? 'Base Asset Name Pattern' : 'New Asset Name'}
                </label>
                <input 
                  type="text"
                  className="dm-input"
                  value={deployAssetName}
                  onChange={(e) => setDeployAssetName(e.target.value)}
                  placeholder={deployMode === 'batch' ? "e.g. Quench Water Circulation Pump" : "e.g. Quench Water Circulation Pump P-102B"}
                />
              </div>

              {deployMode === 'batch' ? (
                /* BATCH DEPLOYMENT MODE */
                <div className="dm-form-group" style={{ background: '#0a0d14', padding: '12px', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                  <label className="dm-field-label" style={{ color: '#38bdf8' }}>
                    Enter Device IDs (Comma-separated)
                  </label>
                  <input 
                    type="text"
                    className="dm-input mono"
                    value={batchDeviceIds}
                    onChange={(e) => setBatchDeviceIds(e.target.value)}
                    placeholder="e.g. PUMP-01, PUMP-02, PUMP-03, PUMP-04"
                  />
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '6px' }}>
                    Will create {batchDeviceIds.split(',').filter(s => s.trim()).length} identical assets, each bound to its respective Device ID!
                  </div>
                </div>
              ) : (
                /* SINGLE DEPLOYMENT MODE */
                <div className="dm-form-group">
                  <label className="dm-field-label">Device Binding Strategy</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#0a0d14', padding: '10px', borderRadius: '6px' }}>
                    {/* Direct Custom Device ID */}
                    <div style={{ marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '4px', display: 'block' }}>
                        Enter Target Device ID directly (or choose from list below):
                      </label>
                      <input 
                        type="text"
                        className="dm-input mono"
                        placeholder="e.g. PUMP-DEV-101A (auto-registered if new)"
                        value={customDeviceId}
                        onChange={(e) => setCustomDeviceId(e.target.value)}
                      />
                    </div>

                    {(selectedTemplate.markup_devices || ['device1']).map(markup => (
                      <div key={markup} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="mono" style={{ width: '100px', color: '#f59e0b', fontSize: '0.8rem' }}>
                          {markup} &rarr;
                        </span>
                        <select 
                          className="dm-select"
                          value={customDeviceId ? '' : (deviceMappings[markup] || '')}
                          disabled={!!customDeviceId}
                          onChange={(e) => setDeviceMappings({ ...deviceMappings, [markup]: e.target.value })}
                          style={{ flex: 1, opacity: customDeviceId ? 0.5 : 1 }}
                        >
                          <option value="">{customDeviceId ? `Using custom Device ID: ${customDeviceId}` : '-- Or Assign Existing Field Device --'}</option>
                          {devices.map(d => (
                            <option key={d.id} value={d.identifier}>{d.name} ({d.identifier})</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tag Name Preview Box */}
              <div style={{ marginTop: '10px', background: 'rgba(255,255,255,0.02)', padding: '8px 10px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Generated Tag Sample: </span>
                <span className="mono" style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>
                  {(customDeviceId || (deployMode === 'batch' ? batchDeviceIds.split(',')[0]?.trim() : Object.values(deviceMappings)[0]) || 'DEV_ID') + '.' + (selectedTemplate.attributes?.[0]?.metric || 'discharge_pressure')}
                </span>
              </div>
            </div>

            <div className="dm-modal-footer">
              <button className="dm-btn dm-btn-secondary" onClick={() => setIsDeployModalOpen(false)}>Cancel</button>
              <button 
                className="dm-btn dm-btn-primary"
                onClick={async () => {
                  if (!deployAssetName) {
                    showToast('Please enter an asset name', 'error');
                    return;
                  }

                  if (deployMode === 'batch') {
                    const ids = batchDeviceIds.split(',').map(s => s.trim()).filter(Boolean);
                    if (ids.length === 0) {
                      showToast('Please enter at least one Device ID', 'error');
                      return;
                    }
                    await deployAssetTemplate(selectedTemplate.id, {
                      parent_id: deployParentId,
                      asset_name: deployAssetName,
                      device_ids: ids,
                      channel_mappings: channelMappings
                    });
                  } else {
                    const effectiveMappings = customDeviceId 
                      ? (selectedTemplate.markup_devices || ['device1']).reduce((acc, m) => ({ ...acc, [m]: customDeviceId }), {})
                      : deviceMappings;

                    await deployAssetTemplate(selectedTemplate.id, {
                      parent_id: deployParentId,
                      asset_name: deployAssetName,
                      device_id: customDeviceId || undefined,
                      device_mappings: effectiveMappings,
                      channel_mappings: channelMappings
                    });
                  }
                  setIsDeployModalOpen(false);
                }}
              >
                {deployMode === 'batch' ? '⚡ Batch Deploy Assets' : 'Deploy into Plant Hierarchy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE ASSET TEMPLATE MODAL WITH ATTRIBUTE MAPPING */}
      {isCreateModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1400 }}>
          <div className="dm-modal-box" style={{ width: '840px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="dm-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={18} color="#38bdf8" />
                <h3>Create Asset Template &amp; Map Attributes</h3>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="dm-close-btn"><X size={18} /></button>
            </div>
            
            <div className="dm-modal-body" style={{ overflowY: 'auto', flex: 1 }}>
              <div className="dm-form-grid-2">
                <div className="dm-form-group">
                  <label className="dm-field-label">Template Name *</label>
                  <input 
                    type="text"
                    className="dm-input"
                    placeholder="e.g. Centrifugal Compressor Template"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  />
                </div>
                <div className="dm-form-group">
                  <label className="dm-field-label">Markup Devices (comma-separated)</label>
                  <input 
                    type="text"
                    className="dm-input mono"
                    placeholder="e.g. device1, device2"
                    value={templateForm.markup_devices.join(', ')}
                    onChange={(e) => setTemplateForm({ ...templateForm, markup_devices: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  />
                </div>
              </div>

              <div className="dm-form-group">
                <label className="dm-field-label">Template Description</label>
                <input 
                  type="text"
                  className="dm-input"
                  placeholder="Standardized asset model specification..."
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                />
              </div>

              {/* Mapped Attributes Section */}
              <div style={{ marginTop: '16px', background: '#070b14', borderRadius: '6px', padding: '12px', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Activity size={14} />
                      <span>Mapped Template Attributes ({templateForm.attributes.length})</span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
                      Define static, dynamic (device-bound), and runtime formula attributes that instantiate on every deployed asset.
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      className="dm-btn dm-btn-secondary"
                      style={{ fontSize: '0.7rem', padding: '4px 8px' }}
                      onClick={() => {
                        setTemplateForm({
                          ...templateForm,
                          attributes: [
                            { name: 'Suction Pressure', type: 'Dynamic', uom: 'kPa', device_markup: 'device1', metric: 'suction_pressure', data_type: 'Double', decimal_place: 1 },
                            { name: 'Discharge Pressure', type: 'Dynamic', uom: 'kPa', device_markup: 'device1', metric: 'discharge_pressure', data_type: 'Double', decimal_place: 1 },
                            { name: 'Bearing Vibration', type: 'Dynamic', uom: 'mm/s', device_markup: 'device2', metric: 'bearing_vibration', data_type: 'Double', decimal_place: 2 },
                            { name: 'Pump Head Calculation', type: 'Runtime', uom: 'm', expression: 'return (1000 * (@Discharge_Pressure - @Suction_Pressure) / (9.81 * 850));', data_type: 'Double', decimal_place: 2, trigger_attribute: 'Discharge Pressure' }
                          ]
                        });
                      }}
                    >
                      ⚡ Reset Defaults
                    </button>
                    <button
                      type="button"
                      className="dm-btn dm-btn-primary"
                      style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                      onClick={() => {
                        setAttrSubFormTarget('create');
                        setEditingAttrIndex(null);
                        setAttrDraft({
                          name: '',
                          type: 'Dynamic',
                          uom: 'kPa',
                          device_markup: templateForm.markup_devices[0] || 'device1',
                          metric: allKnownDeviceMetrics[0] || 'discharge_pressure',
                          expression: '',
                          data_type: 'Double',
                          decimal_place: 1,
                          default_value: '0.0',
                          trigger_attribute: ''
                        });
                        setIsAttrSubFormOpen(true);
                      }}
                    >
                      <Plus size={12} /> Add Attribute
                    </button>
                  </div>
                </div>

                {templateForm.attributes.length > 0 ? (
                  <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.73rem' }}>
                      <thead>
                        <tr style={{ background: '#0a0f1d', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', textAlign: 'left' }}>
                          <th style={{ padding: '6px 8px' }}>Attribute Name</th>
                          <th style={{ padding: '6px 8px' }}>Type</th>
                          <th style={{ padding: '6px 8px' }}>UoM</th>
                          <th style={{ padding: '6px 8px' }}>Device Markup</th>
                          <th style={{ padding: '6px 8px' }}>Metric / Expression</th>
                          <th style={{ padding: '6px 8px' }}>Data Type</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {templateForm.attributes.map((attr, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding: '6px 8px', fontWeight: 600, color: '#f8fafc' }}>{attr.name}</td>
                            <td style={{ padding: '6px 8px' }}>
                              <span style={{ fontSize: '0.64rem', padding: '1px 6px', borderRadius: '3px', background: attr.type === 'Dynamic' ? 'rgba(56,189,248,0.15)' : attr.type === 'Runtime' ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.08)', color: attr.type === 'Dynamic' ? '#38bdf8' : attr.type === 'Runtime' ? '#c084fc' : '#e2e8f0' }}>
                                {attr.type}
                              </span>
                            </td>
                            <td style={{ padding: '6px 8px', color: '#94a3b8' }}>{attr.uom || '-'}</td>
                            <td className="mono" style={{ padding: '6px 8px', color: '#f59e0b' }}>
                              {attr.device_markup ? <code>{attr.device_markup}</code> : '-'}
                            </td>
                            <td className="mono" style={{ padding: '6px 8px', color: attr.type === 'Runtime' ? '#a855f7' : '#38bdf8' }}>
                              {attr.metric || attr.expression || attr.default_value || '-'}
                            </td>
                            <td style={{ padding: '6px 8px', color: '#94a3b8' }}>{attr.data_type || 'Double'}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                              <button
                                type="button"
                                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', marginRight: '6px' }}
                                onClick={() => {
                                  setAttrSubFormTarget('create');
                                  setEditingAttrIndex(idx);
                                  setAttrDraft({ ...attr });
                                  setIsAttrSubFormOpen(true);
                                }}
                                title="Edit Attribute"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                type="button"
                                style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }}
                                onClick={() => {
                                  setTemplateForm({
                                    ...templateForm,
                                    attributes: templateForm.attributes.filter((_, i) => i !== idx)
                                  });
                                }}
                                title="Remove Attribute"
                              >
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '16px', color: '#64748b', fontSize: '0.74rem', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '4px' }}>
                    No attributes mapped yet. Click "+ Add Attribute" to define attributes for this template.
                  </div>
                )}
              </div>
            </div>

            <div className="dm-modal-footer">
              <button className="dm-btn dm-btn-secondary" onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
              <button 
                className="dm-btn dm-btn-primary"
                onClick={async () => {
                  if (!templateForm.name.trim()) {
                    showToast('Please enter a Template Name', 'error');
                    return;
                  }
                  await createAssetTemplate(templateForm);
                  setIsCreateModalOpen(false);
                }}
              >
                Create Asset Template ({templateForm.attributes.length} attrs)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBMODAL: ADD / EDIT MAPPED ATTRIBUTE (FOR CREATE MODAL OR EXISTING TEMPLATE) */}
      {isAttrSubFormOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1500 }}>
          <div className="dm-modal-box" style={{ width: '620px' }}>
            <div className="dm-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Variable size={16} color="#38bdf8" />
                <h3>{editingAttrIndex !== null ? 'Edit Mapped Attribute' : 'Map New Attribute to Template'}</h3>
              </div>
              <button onClick={() => setIsAttrSubFormOpen(false)} className="dm-close-btn"><X size={18} /></button>
            </div>

            <div className="dm-modal-body">
              <div className="dm-form-grid-2">
                <div className="dm-form-group">
                  <label className="dm-field-label">Attribute Type</label>
                  <select 
                    className="dm-select"
                    value={attrDraft.type}
                    onChange={(e) => setAttrDraft({ ...attrDraft, type: e.target.value })}
                  >
                    <option value="Dynamic">Dynamic (Bound to IoT Device Markup)</option>
                    <option value="Runtime">Runtime (Calculated Formula)</option>
                    <option value="Static">Static (Constant Value)</option>
                    <option value="Integration">Integration Channel</option>
                  </select>
                </div>

                <div className="dm-form-group">
                  <label className="dm-field-label">Attribute Name *</label>
                  <input 
                    type="text"
                    className="dm-input"
                    placeholder="e.g. Discharge Pressure"
                    value={attrDraft.name}
                    onChange={(e) => setAttrDraft({ ...attrDraft, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="dm-form-grid-2">
                <div className="dm-form-group">
                  <label className="dm-field-label">Unit of Measure (UoM)</label>
                  <select 
                    className="dm-select"
                    value={attrDraft.uom}
                    onChange={(e) => setAttrDraft({ ...attrDraft, uom: e.target.value })}
                  >
                    <option value="">-- None --</option>
                    {uomList.map(u => (
                      <option key={u.id} value={u.abbreviation}>{u.name} ({u.abbreviation}) - {u.category}</option>
                    ))}
                    {/* Fallback standard industrial UoMs */}
                    {!uomList.some(u => u.abbreviation === 'kPa') && <option value="kPa">kPa - Pressure</option>}
                    {!uomList.some(u => u.abbreviation === 'bar') && <option value="bar">bar - Pressure</option>}
                    {!uomList.some(u => u.abbreviation === '°C') && <option value="°C">°C - Temperature</option>}
                    {!uomList.some(u => u.abbreviation === 'mm/s') && <option value="mm/s">mm/s - Vibration</option>}
                    {!uomList.some(u => u.abbreviation === 'm') && <option value="m">m - Length / Head</option>}
                    {!uomList.some(u => u.abbreviation === 'kg/m³') && <option value="kg/m³">kg/m³ - Density</option>}
                  </select>
                </div>

                <div className="dm-form-group">
                  <label className="dm-field-label">Data Type</label>
                  <select 
                    className="dm-select"
                    value={attrDraft.data_type}
                    onChange={(e) => setAttrDraft({ ...attrDraft, data_type: e.target.value })}
                  >
                    <option value="Double">Double</option>
                    <option value="Int">Int</option>
                    <option value="Bool">Bool</option>
                    <option value="Text">Text</option>
                    <option value="Timestamp">Timestamp</option>
                  </select>
                </div>
              </div>

              {/* DYNAMIC ATTRIBUTE MAPPING */}
              {attrDraft.type === 'Dynamic' && (
                <div className="dm-form-grid-2">
                  <div className="dm-form-group">
                    <label className="dm-field-label">Device Markup Placeholder</label>
                    <select 
                      className="dm-select"
                      value={attrDraft.device_markup}
                      onChange={(e) => setAttrDraft({ ...attrDraft, device_markup: e.target.value })}
                    >
                      {(attrSubFormTarget === 'create' ? templateForm.markup_devices : (selectedTemplate?.markup_devices || ['device1'])).map(m => (
                        <option key={m} value={m}>{m} (Markup Group)</option>
                      ))}
                      <option value="device1">device1</option>
                      <option value="device2">device2</option>
                      <option value="device3">device3</option>
                    </select>
                  </div>

                  <div className="dm-form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="dm-field-label">Metric Key</label>
                      <span style={{ fontSize: '0.66rem', color: '#38bdf8' }}>Select or type below</span>
                    </div>
                    {allKnownDeviceMetrics.length > 0 && (
                      <select 
                        className="dm-select"
                        value={allKnownDeviceMetrics.includes(attrDraft.metric) ? attrDraft.metric : ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            setAttrDraft({
                              ...attrDraft,
                              metric: e.target.value,
                              name: (!attrDraft.name || attrDraft.name.trim() === '') ? e.target.value.replace(/^tags\./, '') : attrDraft.name
                            });
                          }
                        }}
                        style={{ marginBottom: '6px' }}
                      >
                        <option value="">-- Choose from Device Metric Schemas --</option>
                        {allKnownDeviceMetrics.map(mk => (
                          <option key={mk} value={mk}>{mk}</option>
                        ))}
                      </select>
                    )}
                    <input 
                      type="text"
                      className="dm-input mono"
                      placeholder="e.g. tags.FIC_101.PV or discharge_pressure"
                      value={attrDraft.metric}
                      onChange={(e) => setAttrDraft({ ...attrDraft, metric: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* STATIC ATTRIBUTE DEFAULT VALUE */}
              {attrDraft.type === 'Static' && (
                <div className="dm-form-group">
                  <label className="dm-field-label">Default Value</label>
                  <input 
                    type="text"
                    className="dm-input"
                    placeholder="Enter constant value..."
                    value={attrDraft.default_value}
                    onChange={(e) => setAttrDraft({ ...attrDraft, default_value: e.target.value })}
                  />
                </div>
              )}

              {/* RUNTIME FORMULA ATTRIBUTE */}
              {attrDraft.type === 'Runtime' && (
                <div className="dm-runtime-box" style={{ background: '#0a0f1d', padding: '12px', borderRadius: '6px', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                  <ExpressionEditor 
                    value={attrDraft.expression}
                    onChange={(expr) => setAttrDraft({ ...attrDraft, expression: expr })}
                    availableAttributes={attrSubFormTarget === 'create' ? templateForm.attributes : (selectedTemplate?.attributes || [])}
                    placeholder="e.g. (@Discharge_Pressure - @Suction_Pressure) * 1000 / (9.81 * 850)"
                    label="Expression Formula (Type @ to select created attributes)"
                  />
                  <div className="dm-form-group" style={{ marginTop: '10px' }}>
                    <label className="dm-field-label">Trigger Attribute (Optional)</label>
                    <select 
                      className="dm-select"
                      value={attrDraft.trigger_attribute}
                      onChange={(e) => setAttrDraft({ ...attrDraft, trigger_attribute: e.target.value })}
                    >
                      <option value="">-- Select Trigger Attribute --</option>
                      {(attrSubFormTarget === 'create' ? templateForm.attributes : (selectedTemplate?.attributes || [])).map((a, i) => (
                        <option key={i} value={a.name}>{a.name} ({a.type})</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="dm-modal-footer">
              <button className="dm-btn dm-btn-secondary" onClick={() => setIsAttrSubFormOpen(false)}>Cancel</button>
              <button 
                className="dm-btn dm-btn-primary"
                onClick={async () => {
                  if (!attrDraft.name.trim()) {
                    showToast('Please enter an attribute name', 'error');
                    return;
                  }

                  if (attrSubFormTarget === 'create') {
                    // Update in templateForm.attributes
                    if (editingAttrIndex !== null) {
                      const updated = [...templateForm.attributes];
                      updated[editingAttrIndex] = { ...attrDraft };
                      setTemplateForm({ ...templateForm, attributes: updated });
                    } else {
                      setTemplateForm({ ...templateForm, attributes: [...templateForm.attributes, { ...attrDraft }] });
                    }
                    showToast(`Attribute '${attrDraft.name}' saved to template schema`, 'success');
                  } else if (selectedTemplate) {
                    // Update in selectedTemplate
                    let updatedAttrs;
                    if (editingAttrIndex !== null) {
                      updatedAttrs = (selectedTemplate.attributes || []).map((a, i) => i === editingAttrIndex ? { ...attrDraft } : a);
                    } else {
                      updatedAttrs = [...(selectedTemplate.attributes || []), { ...attrDraft }];
                    }
                    await updateAssetTemplate(selectedTemplate.id, {
                      ...selectedTemplate,
                      attributes: updatedAttrs
                    });
                  }

                  setIsAttrSubFormOpen(false);
                }}
              >
                Save Attribute to Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
