import React, { useState, useMemo } from 'react';
import { Plus, Sliders, Trash2, Upload, Download, Tag } from 'lucide-react';
import { useDM } from './dmContext';
import DMCommonControls from './DMCommonControls';

export default function UoMEntityView() {
  const { uomList, addUom, deleteUom, showToast } = useDM();

  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    abbreviation: '',
    category: 'Temperature',
    ref_uom: '',
    factor: 1.0,
    offset: 0.0,
    canonical_factor: 1.0,
    canonical_offset: 0.0
  });

  const categories = ['ALL', 'Temperature', 'Pressure', 'Flow', 'Level', 'Electricity', 'Vibration', 'Speed', 'Mass'];

  const filtered = useMemo(() => {
    let list = [...uomList];
    if (categoryFilter !== 'ALL') {
      list = list.filter(u => u.category === categoryFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(u => 
        u.name.toLowerCase().includes(q) || 
        u.abbreviation.toLowerCase().includes(q) ||
        u.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [uomList, categoryFilter, search]);

  const columns = [
    { key: 'name', label: 'UoM Name' },
    { key: 'abbreviation', label: 'Abbreviation' },
    { key: 'category', label: 'Category' },
    { key: 'ref_uom', label: 'Reference Unit' },
    { key: 'factor', label: 'Factor' },
    { key: 'offset', label: 'Offset' },
    { key: 'canonical_factor', label: 'Canonical Factor' },
    { key: 'canonical_offset', label: 'Canonical Offset' }
  ];

  return (
    <div className="dm-entity-container">
      <div className="dm-entity-header-row">
        <div>
          <h2 className="dm-page-title">Unit of Measure (UoM) Entity (Section 9.9)</h2>
          <p className="dm-page-subtitle">
            Configure industrial units, conversion reference factors, and base canonical offsets across process categories.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="dm-btn dm-btn-primary" onClick={() => setIsAddModalOpen(true)}>
            <Plus size={14} /> <span>Add UoM</span>
          </button>
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="dm-filter-pills-bar">
        {categories.map(cat => (
          <button
            key={cat}
            className={`dm-filter-pill ${categoryFilter === cat ? 'active' : ''}`}
            onClick={() => setCategoryFilter(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="dm-tab-content-card">
        <DMCommonControls 
          columns={columns}
          searchQuery={search}
          onSearchChange={setSearch}
          totalRecords={filtered.length}
          onExport={() => {
            const blob = new Blob([JSON.stringify(uomList, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Yokogawa_UoM_Library.json`;
            a.click();
            showToast('Exported UoM Library', 'success');
          }}
        />

        <div className="dm-table-scroll-container">
          <table className="dm-data-table">
            <thead>
              <tr>
                <th>UoM Name</th>
                <th>Abbreviation</th>
                <th>Category</th>
                <th>Reference Unit</th>
                <th>Conversion Factor</th>
                <th>Offset</th>
                <th>Canonical Factor</th>
                <th>Canonical Offset</th>
                <th style={{ textAlign: 'right', width: '80px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                    <Tag size={28} style={{ margin: '0 auto 8px', color: '#475569' }} />
                    <div style={{ fontWeight: 600, color: '#f8fafc' }}>No Units of Measure Defined</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>Click "Add UoM" to configure standard engineering measurement units and conversion factors.</div>
                    <button className="dm-btn dm-btn-primary" style={{ margin: '12px auto 0' }} onClick={() => setIsAddModalOpen(true)}>
                      <Plus size={13} /> <span>Add UoM</span>
                    </button>
                  </td>
                </tr>
              ) : (
                filtered.map(u => (
                  <tr key={u.id} className="dm-table-row">
                    <td style={{ fontWeight: 600, color: '#f8fafc' }}>{u.name}</td>
                    <td>
                      <span className="dm-uom-tag" style={{ fontSize: '0.8rem' }}>{u.abbreviation}</span>
                    </td>
                    <td>
                      <span className="dm-tree-badge">{u.category}</span>
                    </td>
                    <td className="mono">{u.ref_uom || '-'}</td>
                    <td className="mono">{u.factor}</td>
                    <td className="mono">{u.offset}</td>
                    <td className="mono" style={{ color: '#38bdf8' }}>{u.canonical_factor}</td>
                    <td className="mono">{u.canonical_offset}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="dm-row-action-btn delete"
                        onClick={() => deleteUom(u.id)}
                        title="Delete UoM"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD UOM MODAL */}
      {isAddModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1400 }}>
          <div className="dm-modal-box" style={{ width: '560px' }}>
            <div className="dm-modal-header">
              <h3>Configure Unit of Measure</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="dm-close-btn">&times;</button>
            </div>
            <div className="dm-modal-body">
              <div className="dm-form-grid-2">
                <div className="dm-form-group">
                  <label className="dm-field-label">UoM Name</label>
                  <input 
                    type="text"
                    className="dm-input"
                    placeholder="e.g. Gigajoule"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="dm-form-group">
                  <label className="dm-field-label">Abbreviation</label>
                  <input 
                    type="text"
                    className="dm-input"
                    placeholder="e.g. GJ"
                    value={formData.abbreviation}
                    onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value })}
                  />
                </div>
              </div>

              <div className="dm-form-grid-2">
                <div className="dm-form-group">
                  <label className="dm-field-label">Category</label>
                  <select 
                    className="dm-select"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    {categories.filter(c => c !== 'ALL').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="dm-form-group">
                  <label className="dm-field-label">Reference UoM</label>
                  <input 
                    type="text"
                    className="dm-input"
                    placeholder="e.g. MJ"
                    value={formData.ref_uom}
                    onChange={(e) => setFormData({ ...formData, ref_uom: e.target.value })}
                  />
                </div>
              </div>

              <div className="dm-form-grid-2">
                <div className="dm-form-group">
                  <label className="dm-field-label">Conversion Factor</label>
                  <input 
                    type="number"
                    step="any"
                    className="dm-input"
                    value={formData.factor}
                    onChange={(e) => setFormData({ ...formData, factor: Number(e.target.value) })}
                  />
                </div>
                <div className="dm-form-group">
                  <label className="dm-field-label">Offset</label>
                  <input 
                    type="number"
                    step="any"
                    className="dm-input"
                    value={formData.offset}
                    onChange={(e) => setFormData({ ...formData, offset: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="dm-form-grid-2">
                <div className="dm-form-group">
                  <label className="dm-field-label">Canonical Factor (Base Unit)</label>
                  <input 
                    type="number"
                    step="any"
                    className="dm-input"
                    value={formData.canonical_factor}
                    onChange={(e) => setFormData({ ...formData, canonical_factor: Number(e.target.value) })}
                  />
                </div>
                <div className="dm-form-group">
                  <label className="dm-field-label">Canonical Offset</label>
                  <input 
                    type="number"
                    step="any"
                    className="dm-input"
                    value={formData.canonical_offset}
                    onChange={(e) => setFormData({ ...formData, canonical_offset: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>
            <div className="dm-modal-footer">
              <button className="dm-btn dm-btn-secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
              <button 
                className="dm-btn dm-btn-primary"
                onClick={() => {
                  if (!formData.name || !formData.abbreviation) return;
                  addUom(formData);
                  setIsAddModalOpen(false);
                }}
              >
                Save UoM
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
