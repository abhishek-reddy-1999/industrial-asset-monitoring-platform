import React, { useState } from 'react';
import { 
  Plus, RefreshCw, Filter, Trash2, Upload, Download, 
  Settings, Search, ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight, X, Check
} from 'lucide-react';
import { useDM } from './dmContext';

export default function DMCommonControls({
  onAdd,
  onRefresh,
  onDelete,
  onImport,
  onExport,
  onEditSchema,
  onAddFolder,
  onDownload,
  onUpload,
  showEditSchema = false,
  showAddFolder = false,
  showDownload = false,
  showUpload = false,
  searchQuery,
  onSearchChange,
  columns = [],
  sortConfig = [],
  onSortChange,
  hiddenColumns = [],
  onToggleHiddenColumn,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  recordsPerPage = 20,
  onRecordsPerPageChange,
  totalRecords = 0,
  filterCriteria = [],
  onApplyFilters
}) {
  const { t } = useDM();
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isSettingModalOpen, setIsSettingModalOpen] = useState(false);

  // Filter dialog local state (Section 8.1.1, Table 2)
  const [localFilters, setLocalFilters] = useState(filterCriteria || []);
  const [filterColumn, setFilterColumn] = useState(columns[0]?.key || '');
  const [filterOperator, setFilterOperator] = useState('Contains');
  const [filterValue, setFilterValue] = useState('');

  const filterOperators = [
    'Equals',
    'Not Equals',
    'Contains',
    'Not Contains',
    'Starts With',
    'Not Starts With',
    'End With',
    'Not End With'
  ];

  const handleAddFilterRule = () => {
    if (!filterColumn || !filterValue) return;
    setLocalFilters(prev => [
      ...prev,
      { column: filterColumn, operator: filterOperator, value: filterValue }
    ]);
    setFilterValue('');
  };

  const handleRemoveFilterRule = (idx) => {
    setLocalFilters(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveFilters = () => {
    if (onApplyFilters) onApplyFilters(localFilters);
    setIsFilterModalOpen(false);
  };

  return (
    <div className="dm-common-controls-bar">
      {/* 1. Control Buttons Group (Table 1) */}
      <div className="dm-btn-group">
        {onAdd && (
          <button className="dm-btn dm-btn-primary" onClick={onAdd} title={t.add}>
            <Plus size={14} />
            <span>{t.add}</span>
          </button>
        )}
        {onRefresh && (
          <button className="dm-btn dm-btn-secondary" onClick={onRefresh} title={t.refresh}>
            <RefreshCw size={13} />
            <span>{t.refresh}</span>
          </button>
        )}
        <button 
          className={`dm-btn dm-btn-secondary ${localFilters.length > 0 ? 'active-filter' : ''}`}
          onClick={() => setIsFilterModalOpen(true)}
          title={t.filter}
        >
          <Filter size={13} />
          <span>{t.filter} {localFilters.length > 0 ? `(${localFilters.length})` : ''}</span>
        </button>
        {onDelete && (
          <button className="dm-btn dm-btn-secondary dm-btn-danger" onClick={onDelete} title={t.delete}>
            <Trash2 size={13} />
            <span>{t.delete}</span>
          </button>
        )}
        {onImport && (
          <button className="dm-btn dm-btn-secondary" onClick={onImport} title={t.import}>
            <Upload size={13} />
            <span>{t.import}</span>
          </button>
        )}
        {onExport && (
          <button className="dm-btn dm-btn-secondary" onClick={onExport} title={t.export}>
            <Download size={13} />
            <span>{t.export}</span>
          </button>
        )}
        {showEditSchema && onEditSchema && (
          <button className="dm-btn dm-btn-secondary" onClick={onEditSchema} title={t.edit_schema}>
            <Settings size={13} />
            <span>{t.edit_schema}</span>
          </button>
        )}
        {showAddFolder && onAddFolder && (
          <button className="dm-btn dm-btn-secondary" onClick={onAddFolder} title={t.add_folder}>
            <Plus size={13} />
            <span>{t.add_folder}</span>
          </button>
        )}
        {showDownload && onDownload && (
          <button className="dm-btn dm-btn-secondary" onClick={onDownload} title={t.download}>
            <Download size={13} />
            <span>{t.download}</span>
          </button>
        )}
        {showUpload && onUpload && (
          <button className="dm-btn dm-btn-secondary" onClick={onUpload} title={t.upload}>
            <Upload size={13} />
            <span>{t.upload}</span>
          </button>
        )}
      </div>

      {/* 2. Search & List Settings Group (Section 8.1 & Table 3) */}
      <div className="dm-right-controls">
        <div className="dm-search-wrapper">
          <Search size={14} className="dm-search-icon" />
          <input
            type="text"
            className="dm-search-input"
            placeholder={t.search_placeholder}
            value={searchQuery || ''}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button className="dm-clear-search" onClick={() => onSearchChange && onSearchChange('')}>
              <X size={12} />
            </button>
          )}
        </div>

        {/* Record Per Page Control: <Max object per page>/<Total object available inside list view> e.g. 20/187 */}
        <div className="dm-record-count-pill" title="Max per page / Total items">
          <select 
            value={recordsPerPage} 
            onChange={(e) => onRecordsPerPageChange && onRecordsPerPageChange(Number(e.target.value))}
            className="dm-per-page-select"
          >
            <option value={20}>20</option>
            <option value={40}>40</option>
            <option value={80}>80</option>
            <option value={160}>160</option>
          </select>
          <span className="dm-total-count">/{totalRecords}</span>
        </div>

        {/* Table List Page Control: < 1 2 > */}
        <div className="dm-pagination-controls">
          <button 
            className="dm-page-btn" 
            disabled={currentPage <= 1}
            onClick={() => onPageChange && onPageChange(currentPage - 1)}
          >
            <ChevronLeft size={14} />
          </button>
          <span className="dm-page-indicator">{currentPage} / {totalPages || 1}</span>
          <button 
            className="dm-page-btn" 
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange && onPageChange(currentPage + 1)}
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Table List Setting Control (Table 3) */}
        <button 
          className="dm-btn dm-btn-icon" 
          onClick={() => setIsSettingModalOpen(true)}
          title="Table List Column Settings"
        >
          <Settings size={14} />
        </button>
      </div>

      {/* FILTER DIALOG (Section 8.1.1, Table 2) */}
      {isFilterModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1400 }}>
          <div className="dm-modal-box" style={{ width: '560px' }}>
            <div className="dm-modal-header">
              <h3>Table List Filter</h3>
              <button onClick={() => setIsFilterModalOpen(false)} className="dm-close-btn"><X size={18} /></button>
            </div>
            <div className="dm-modal-body">
              <p className="dm-modal-desc">
                Filter objects across any table column. Multiple filter criteria can be combined.
              </p>

              {/* Add New Filter Rule Form */}
              <div className="dm-filter-form-row">
                <div style={{ flex: 1.2 }}>
                  <label className="dm-field-label">Filter (Column)</label>
                  <select 
                    className="dm-select"
                    value={filterColumn}
                    onChange={(e) => setFilterColumn(e.target.value)}
                  >
                    {columns.map(c => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1.2 }}>
                  <label className="dm-field-label">Operator</label>
                  <select 
                    className="dm-select"
                    value={filterOperator}
                    onChange={(e) => setFilterOperator(e.target.value)}
                  >
                    {filterOperators.map(op => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1.5 }}>
                  <label className="dm-field-label">Value</label>
                  <input 
                    type="text"
                    className="dm-input"
                    placeholder="Filter value..."
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddFilterRule()}
                  />
                </div>
                <div style={{ alignSelf: 'flex-end' }}>
                  <button className="dm-btn dm-btn-primary" onClick={handleAddFilterRule}>
                    + Add
                  </button>
                </div>
              </div>

              {/* Current Active Filter Rules List */}
              <div className="dm-active-filter-rules">
                <div className="dm-rules-heading">Active Filter Conditions:</div>
                {localFilters.length === 0 ? (
                  <div className="dm-rules-empty">No filter conditions applied. Showing all items.</div>
                ) : (
                  localFilters.map((rule, idx) => (
                    <div key={idx} className="dm-filter-chip">
                      <span className="dm-chip-col">{columns.find(c => c.key === rule.column)?.label || rule.column}</span>
                      <span className="dm-chip-op">{rule.operator}</span>
                      <span className="dm-chip-val">"{rule.value}"</span>
                      <button onClick={() => handleRemoveFilterRule(idx)} className="dm-chip-remove">
                        <X size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="dm-modal-footer">
              <button className="dm-btn dm-btn-secondary" onClick={() => setLocalFilters([])}>Clear All</button>
              <button className="dm-btn dm-btn-primary" onClick={handleSaveFilters}>Apply Filter</button>
            </div>
          </div>
        </div>
      )}

      {/* TABLE LIST SETTING MODAL (Section 8.1.2, Table 3, Figure 1) */}
      {isSettingModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1400 }}>
          <div className="dm-modal-box" style={{ width: '520px' }}>
            <div className="dm-modal-header">
              <h3>Table List Setting</h3>
              <button onClick={() => setIsSettingModalOpen(false)} className="dm-close-btn"><X size={18} /></button>
            </div>
            <div className="dm-modal-body">
              <p className="dm-modal-desc">
                Configure list view column visibility and sortable properties.
              </p>
              
              <table className="dm-settings-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>No</th>
                    <th>Label</th>
                    <th style={{ textAlign: 'center', width: '80px' }}>Hidden</th>
                    <th style={{ textAlign: 'center', width: '80px' }}>Sortable</th>
                  </tr>
                </thead>
                <tbody>
                  {columns.map((col, idx) => {
                    const isHidden = hiddenColumns.includes(col.key);
                    return (
                      <tr key={col.key}>
                        <td className="mono">{idx + 1}</td>
                        <td style={{ fontWeight: 600, color: '#f1f5f9' }}>{col.label}</td>
                        <td style={{ textAlign: 'center' }}>
                          <input 
                            type="checkbox"
                            checked={isHidden}
                            onChange={() => onToggleHiddenColumn && onToggleHiddenColumn(col.key)}
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <input 
                            type="checkbox"
                            checked={col.sortable !== false}
                            readOnly
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="dm-modal-footer">
              <button className="dm-btn dm-btn-primary" onClick={() => setIsSettingModalOpen(false)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
