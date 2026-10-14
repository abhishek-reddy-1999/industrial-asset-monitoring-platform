import React, { useState, useMemo } from 'react';
import { Activity, Search, Download, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { useDM } from './dmContext';
import DMCommonControls from './DMCommonControls';

export default function ActivityLogView() {
  const { activityLogs, showToast } = useDM();

  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const entities = ['ALL', 'Asset', 'Asset Attribute', 'Asset Table', 'Asset Media', 'Device', 'Broker', 'Alarm', 'Security'];

  const filtered = useMemo(() => {
    let list = [...(activityLogs || [])];
    if (entityFilter !== 'ALL') {
      list = list.filter(l => l.entity === entityFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(l => 
        l.entity.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        (l.details || '').toLowerCase().includes(q) ||
        (l.event_initiated_by || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [activityLogs, entityFilter, search]);

  const columns = [
    { key: 'entity', label: 'Entity' },
    { key: 'entity_id', label: 'Entity ID' },
    { key: 'action', label: 'Action' },
    { key: 'event_initiated_by', label: 'Event Initiated By' },
    { key: 'status', label: 'Status' },
    { key: 'created_at', label: 'Created At' }
  ];

  return (
    <div className="dm-entity-container">
      <div className="dm-entity-header-row">
        <div>
          <h2 className="dm-page-title">Activity Log Entity (Section 9.15)</h2>
          <p className="dm-page-subtitle">
            Auditable trail of all operations, modifications, configuration changes, user access overrides and alarms across DM.
          </p>
        </div>
      </div>

      <div className="dm-filter-pills-bar">
        {entities.map(ent => (
          <button 
            key={ent}
            className={`dm-filter-pill ${entityFilter === ent ? 'active' : ''}`}
            onClick={() => setEntityFilter(ent)}
          >
            {ent}
          </button>
        ))}
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
          onExport={() => {
            const blob = new Blob([JSON.stringify(activityLogs, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Activity_Audit_Log.json`;
            a.click();
            showToast('Exported Audit Log JSON', 'success');
          }}
        />

        <div className="dm-table-scroll-container">
          <table className="dm-data-table">
            <thead>
              <tr>
                <th>Entity</th>
                <th>Entity ID</th>
                <th>Action</th>
                <th>Event Initiated By</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                    <Activity size={28} style={{ margin: '0 auto 8px', color: '#475569' }} />
                    <div style={{ fontWeight: 600, color: '#f8fafc' }}>No Activity Log Entries</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                      Auditable logs of asset edits, user changes, and protocol activity will appear here in real-time.
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.slice((page - 1) * perPage, page * perPage).map(log => (
                  <tr key={log.id} className="dm-table-row">
                    <td>
                      <span className="dm-tree-badge">{log.entity}</span>
                    </td>
                    <td className="mono" style={{ color: '#38bdf8', fontSize: '0.74rem' }}>{log.entity_id}</td>
                    <td style={{ fontWeight: 600, color: '#f8fafc' }}>{log.action}</td>
                    <td className="mono" style={{ color: '#94a3b8' }}>{log.event_initiated_by}</td>
                    <td>
                      <span className={`dm-health-badge ${log.status === 'Success' ? 'connected' : 'disconnected'}`}>
                        <span className="dm-dot" />
                        {log.status}
                      </span>
                    </td>
                    <td className="dm-timestamp-cell">
                      {log.created_at?.substring(0, 19).replace('T', ' ')}
                    </td>
                    <td style={{ fontSize: '0.74rem', color: '#cbd5e1' }}>
                      {log.details || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function catToEnt(e) {
  return e;
}
