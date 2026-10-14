import React, { useState, useMemo } from 'react';
import { Database, Trash2, ExternalLink, Download, FileSpreadsheet, Eye } from 'lucide-react';
import { useDM } from './dmContext';
import DMCommonControls from './DMCommonControls';

export default function TableListEntityView() {
  const { assets, deleteAssetTable, setSelectedAssetId, setActiveEntity, showToast } = useDM();

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [viewingTable, setViewingTable] = useState(null); // { table, assetName }

  // Aggregate all tables across all asset elements (Section 9.3)
  const allTables = useMemo(() => {
    const list = [];
    (assets || []).filter(Boolean).forEach(asset => {
      if (!asset?.id) return;
      (asset.tables || []).filter(Boolean).forEach(tbl => {
        if (!tbl?.id) return;
        list.push({
          id: tbl.id,
          name: tbl.name,
          asset_id: asset.id,
          asset_name: asset.name,
          asset_path: asset.path,
          description: tbl.description,
          locked_by: tbl.locked_by,
          columns_count: tbl.columns?.length || 0,
          rows_count: tbl.rows?.length || 0,
          last_edited: tbl.last_edited,
          raw_table: tbl
        });
      });
    });
    return list;
  }, [assets]);

  const filtered = useMemo(() => {
    let res = [...allTables];
    if (search.trim()) {
      const q = search.toLowerCase();
      res = res.filter(r => 
        r.name.toLowerCase().includes(q) ||
        r.asset_name.toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q)
      );
    }
    return res;
  }, [allTables, search]);

  const columns = [
    { key: 'name', label: 'Storage Name' },
    { key: 'asset_name', label: 'Asset Name' },
    { key: 'columns_count', label: 'Columns' },
    { key: 'rows_count', label: 'Rows' },
    { key: 'last_edited', label: 'Last Edited' }
  ];

  return (
    <div className="dm-entity-container">
      <div className="dm-entity-header-row">
        <div>
          <h2 className="dm-page-title">Table List Entity (Section 9.3)</h2>
          <p className="dm-page-subtitle">
            Global view of all tabular format storage units across all asset elements. Manage maintenance schedules, inspection logs and calibration data.
          </p>
        </div>
      </div>

      <div className="dm-tab-content-card">
        <DMCommonControls 
          columns={columns}
          searchQuery={search}
          onSearchChange={setSearch}
          totalRecords={filtered.length}
          recordsPerPage={perPage}
          onRecordsPerPageChange={setPerPage}
          currentPage={page}
          totalPages={Math.ceil(filtered.length / perPage) || 1}
          onPageChange={setPage}
        />

        <div className="dm-table-scroll-container">
          <table className="dm-data-table">
            <thead>
              <tr>
                <th>Storage Name</th>
                <th>Asset Name</th>
                <th>Columns</th>
                <th>Records</th>
                <th>Last Edited Datetime</th>
                <th style={{ textAlign: 'right', width: '130px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="dm-empty-state">
                    No tabular storage found across plant assets.
                  </td>
                </tr>
              ) : (
                filtered
                  .slice((page - 1) * perPage, page * perPage)
                  .map(row => (
                    <tr key={row.id} className="dm-table-row">
                      <td style={{ fontWeight: 600, color: '#f8fafc' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Database size={14} color="#38bdf8" />
                          <span>{row.name}</span>
                        </div>
                      </td>
                      <td style={{ color: '#94a3b8' }}>{row.asset_name}</td>
                      <td className="mono">{row.columns_count} cols</td>
                      <td className="mono" style={{ color: '#10b981' }}>{row.rows_count} records</td>
                      <td className="dm-timestamp-cell">
                        {row.last_edited ? row.last_edited.substring(0, 19).replace('T', ' ') : '-'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '4px' }}>
                          <button 
                            className="dm-row-action-btn view"
                            onClick={() => setViewingTable({ table: row.raw_table, assetName: row.asset_name })}
                            title="Inspect Table Data"
                          >
                            <Eye size={13} />
                          </button>
                          <button 
                            className="dm-row-action-btn view"
                            onClick={() => {
                              setSelectedAssetId(row.asset_id);
                              setActiveEntity('asset');
                            }}
                            title="Open in Asset Hierarchy"
                          >
                            <ExternalLink size={13} />
                          </button>
                          <button 
                            className="dm-row-action-btn delete"
                            onClick={() => {
                              if (window.confirm(`Delete table '${row.name}' from asset '${row.asset_name}'?`)) {
                                deleteAssetTable(row.asset_id, row.id);
                              }
                            }}
                            title="Delete Table"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Table Data Viewer Modal */}
      {viewingTable && (
        <div className="modal-backdrop" style={{ zIndex: 1400 }}>
          <div className="dm-modal-box" style={{ width: '780px' }}>
            <div className="dm-modal-header">
              <h3>{viewingTable.table.name} &mdash; {viewingTable.assetName}</h3>
              <button onClick={() => setViewingTable(null)} className="dm-close-btn">&times;</button>
            </div>
            <div className="dm-modal-body">
              <p style={{ margin: '0 0 10px 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                {viewingTable.table.description || 'No description provided.'}
              </p>
              <div className="dm-table-scroll-container" style={{ maxHeight: '350px' }}>
                <table className="dm-data-table">
                  <thead>
                    <tr>
                      {viewingTable.table.columns.map(c => (
                        <th key={c.name}>{c.name} ({c.data_type})</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(viewingTable.table.rows || []).map((r, i) => (
                      <tr key={i}>
                        {viewingTable.table.columns.map(c => (
                          <td key={c.name}>{String(r[c.name] ?? '-')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="dm-modal-footer">
              <button className="dm-btn dm-btn-primary" onClick={() => setViewingTable(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
