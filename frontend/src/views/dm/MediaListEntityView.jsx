import React, { useState, useMemo } from 'react';
import { Folder, FileText, Image, Video, FileCode, Download, Trash2, Eye, ExternalLink } from 'lucide-react';
import { useDM } from './dmContext';
import DMCommonControls from './DMCommonControls';

export default function MediaListEntityView() {
  const { assets, deleteAssetMedia, setSelectedAssetId, setActiveEntity } = useDM();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [previewItem, setPreviewItem] = useState(null);

  // Aggregate all media across all assets
  const allMedia = useMemo(() => {
    const list = [];
    (assets || []).filter(Boolean).forEach(asset => {
      if (!asset?.id) return;
      (asset.media || []).filter(Boolean).forEach(med => {
        if (!med?.id) return;
        list.push({
          id: med.id,
          name: med.name,
          type: med.type,
          content_type: med.content_type,
          file_size_kb: med.file_size_kb,
          path: med.path,
          url: med.url,
          last_edited: med.last_edited,
          asset_id: asset.id,
          asset_name: asset.name
        });
      });
    });
    return list;
  }, [assets]);

  const filtered = useMemo(() => {
    let res = [...allMedia];
    if (search.trim()) {
      const q = search.toLowerCase();
      res = res.filter(m => 
        m.name.toLowerCase().includes(q) ||
        m.asset_name.toLowerCase().includes(q) ||
        (m.content_type || '').toLowerCase().includes(q)
      );
    }
    return res;
  }, [allMedia, search]);

  const getMediaIcon = (type, ctype) => {
    if (type === 'Folder') return <Folder size={18} style={{ color: '#f59e0b' }} />;
    const ct = (ctype || '').toUpperCase();
    if (ct.includes('PDF')) return <FileText size={18} style={{ color: '#ef4444' }} />;
    if (ct.includes('JPEG') || ct.includes('PNG') || ct.includes('IMAGE')) return <Image size={18} style={{ color: '#38bdf8' }} />;
    if (ct.includes('MP4') || ct.includes('VIDEO')) return <Video size={18} style={{ color: '#a855f7' }} />;
    return <FileCode size={18} style={{ color: '#10b981' }} />;
  };

  const columns = [
    { key: 'name', label: 'Media File Name' },
    { key: 'asset_name', label: 'Asset Name' },
    { key: 'content_type', label: 'Content Type' },
    { key: 'file_size_kb', label: 'File Size (KB)' },
    { key: 'last_edited', label: 'Last Edited' }
  ];

  return (
    <div className="dm-entity-container">
      <div className="dm-entity-header-row">
        <div>
          <h2 className="dm-page-title">Media List Entity (Section 9.4)</h2>
          <p className="dm-page-subtitle">
            Global repository of all drawings, P&IDs, safety manuals, cutaways and calibration certificates across the entire plant hierarchy.
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
                <th style={{ width: '50px' }}>Type</th>
                <th>Media File Name</th>
                <th>Asset Name</th>
                <th>Content Type</th>
                <th>File Size (KB)</th>
                <th>Last Edited Datetime</th>
                <th style={{ textAlign: 'right', width: '130px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="dm-empty-state">
                    No media items found across plant elements.
                  </td>
                </tr>
              ) : (
                filtered
                  .slice((page - 1) * perPage, page * perPage)
                  .map(row => (
                    <tr key={row.id} className="dm-table-row">
                      <td style={{ textAlign: 'center' }}>
                        {getMediaIcon(row.type, row.content_type)}
                      </td>
                      <td style={{ fontWeight: 600, color: '#f8fafc' }}>{row.name}</td>
                      <td style={{ color: '#94a3b8' }}>{row.asset_name}</td>
                      <td>
                        <span className="dm-content-type-tag">{row.content_type || 'Unknown'}</span>
                      </td>
                      <td className="mono">{row.type === 'Folder' ? '-' : `${row.file_size_kb} KB`}</td>
                      <td className="dm-timestamp-cell">
                        {row.last_edited ? row.last_edited.substring(0, 19).replace('T', ' ') : '-'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '4px' }}>
                          {row.type !== 'Folder' && (
                            <>
                              <button 
                                className="dm-row-action-btn view"
                                onClick={() => setPreviewItem(row)}
                                title="View Media"
                              >
                                <Eye size={13} />
                              </button>
                              <a 
                                href={row.url || '#'}
                                target="_blank"
                                rel="noreferrer"
                                className="dm-row-action-btn download"
                                title="Download File"
                              >
                                <Download size={13} />
                              </a>
                            </>
                          )}
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
                              if (window.confirm(`Delete media '${row.name}' from asset '${row.asset_name}'?`)) {
                                deleteAssetMedia(row.asset_id, row.id);
                              }
                            }}
                            title="Delete Item"
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

      {/* Preview Modal */}
      {previewItem && (
        <div className="modal-backdrop" style={{ zIndex: 1400 }}>
          <div className="dm-modal-box" style={{ width: '640px' }}>
            <div className="dm-modal-header">
              <h3>Preview: {previewItem.name}</h3>
              <button onClick={() => setPreviewItem(null)} className="dm-close-btn">&times;</button>
            </div>
            <div className="dm-modal-body" style={{ textAlign: 'center' }}>
              <img 
                src={previewItem.url || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800'} 
                alt={previewItem.name}
                style={{ maxWidth: '100%', maxHeight: '350px', borderRadius: '6px' }}
              />
              <div style={{ marginTop: '10px', fontSize: '0.78rem', color: '#94a3b8' }}>
                Asset: {previewItem.asset_name} | Type: {previewItem.content_type} | Path: {previewItem.path}
              </div>
            </div>
            <div className="dm-modal-footer">
              <button className="dm-btn dm-btn-primary" onClick={() => setPreviewItem(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
