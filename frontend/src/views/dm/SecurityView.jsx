import React, { useState } from 'react';
import { 
  Shield, UserCheck, Users, Key, Lock, Plus, 
  Trash2, Check, X, ShieldAlert, Sliders, ExternalLink, CheckCircle2 
} from 'lucide-react';
import { useDM } from './dmContext';
import DMCommonControls from './DMCommonControls';

export default function SecurityView() {
  const {
    users,
    userGroups,
    userOverrides,
    apiClients,
    objectSecurityRules,
    createUser,
    deleteUser,
    createApiClient,
    deleteApiClient,
    createObjectSecurityRule,
    deleteObjectSecurityRule,
    assets,
    showToast
  } = useDM();

  // Active sub-tab
  const [subTab, setSubTab] = useState('role_based'); // 'role_based' | 'object_based' | 'users' | 'user_groups' | 'api_clients'

  // User modal
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userFormData, setUserFormData] = useState({ upn: '', name: '', role: 'Operator', department: 'Operations' });

  // API Client modal
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientForm, setClientForm] = useState({
    name: '',
    auth_endpoint: 'https://api.yokogawa.cloud/auth/v1/token',
    api_endpoint: 'https://api.yokogawa.cloud/ahi/v1/gateway'
  });

  // Table 30 Default User Access Roles matrix
  const roleMatrixData = [
    { entity: 'Asset', read: ['A', 'E', 'O', 'V', 'D'], write: ['A', 'E', 'O'], delete: ['A', 'E', 'O'], annotate: [], share: [], assign: [], asset_table: ['A', 'E', 'O', 'V', 'D'], asset_media: ['A', 'E', 'O', 'V', 'D'] },
    { entity: 'Asset Template', read: ['A', 'E'], write: ['A', 'E'], delete: ['A', 'E'], annotate: [], share: [], assign: [], asset_table: [], asset_media: [] },
    { entity: 'Table List', read: ['A', 'E', 'O', 'V'], write: [], delete: ['A', 'E', 'O'], annotate: [], share: [], assign: [], asset_table: [], asset_media: [] },
    { entity: 'Media List', read: ['A', 'E', 'O', 'V'], write: [], delete: ['A', 'E', 'O'], annotate: [], share: [], assign: [], asset_table: [], asset_media: [] },
    { entity: 'Device', read: ['A', 'E', 'O', 'V'], write: ['A', 'E', 'O', 'V'], delete: ['A', 'E', 'O'], annotate: [], share: [], assign: [], asset_table: [], asset_media: [] },
    { entity: 'Device Template', read: ['A', 'E'], write: ['A', 'E'], delete: ['A', 'E'], annotate: [], share: [], assign: [], asset_table: [], asset_media: [] },
    { entity: 'Alarm', read: ['A', 'E', 'O', 'V'], write: [], delete: [], annotate: ['A', 'E', 'O'], share: [], assign: [], asset_table: [], asset_media: [] },
    { entity: 'Alarm Rule', read: ['A', 'E', 'O', 'V'], write: ['A', 'E', 'O'], delete: ['A', 'E', 'O'], annotate: [], share: [], assign: [], asset_table: [], asset_media: [] },
    { entity: 'Action', read: ['A', 'E', 'O', 'V'], write: ['A', 'E', 'O'], delete: ['A', 'E', 'O'], annotate: [], share: [], assign: [], asset_table: [], asset_media: [] },
    { entity: 'Broker', read: ['A', 'E', 'O', 'V'], write: ['A', 'E', 'O'], delete: ['A', 'E', 'O'], annotate: [], share: [], assign: [], asset_table: [], asset_media: [] },
    { entity: 'Integration', read: ['A', 'E', 'O', 'V'], write: ['A', 'E', 'O'], delete: ['A', 'E', 'O'], annotate: [], share: [], assign: [], asset_table: [], asset_media: [] },
    { entity: 'UoM', read: ['A', 'E', 'O', 'V'], write: ['A', 'E', 'O'], delete: ['A', 'E', 'O'], annotate: [], share: [], assign: [], asset_table: [], asset_media: [] },
    { entity: 'Activity Log', read: ['A', 'E', 'O', 'V'], write: [], delete: [], annotate: [], share: [], assign: [], asset_table: [], asset_media: [] },
    { entity: 'Setting', read: ['A', 'E'], write: ['A', 'E'], delete: [], annotate: [], share: [], assign: [], asset_table: [], asset_media: [] },
    { entity: 'Project', read: [], write: ['A', 'E'], delete: [], annotate: [], share: [], assign: ['A', 'E'], asset_table: [], asset_media: [] },
    { entity: 'Configuration', read: [], write: [], delete: [], annotate: [], share: ['A', 'E', 'O'], assign: [], asset_table: [], asset_media: [] }
  ];

  return (
    <div className="dm-entity-container">
      <div className="dm-entity-header-row">
        <div>
          <h2 className="dm-page-title">Security & Identity Control (Section 11)</h2>
          <p className="dm-page-subtitle">
            Enterprise role-based access control (RBAC Table 30) and object-based security (Table 33) across plant hierarchy assets.
          </p>
        </div>

        {/* Sub-Tabs */}
        <div className="dm-btn-group">
          <button 
            className={`dm-btn ${subTab === 'role_based' ? 'dm-btn-primary' : 'dm-btn-secondary'}`}
            onClick={() => setSubTab('role_based')}
          >
            <Shield size={13} />
            <span>Role-based Security (11.1)</span>
          </button>
          <button 
            className={`dm-btn ${subTab === 'object_based' ? 'dm-btn-primary' : 'dm-btn-secondary'}`}
            onClick={() => setSubTab('object_based')}
          >
            <Lock size={13} />
            <span>Object-based Security (11.2)</span>
          </button>
          <button 
            className={`dm-btn ${subTab === 'users' ? 'dm-btn-primary' : 'dm-btn-secondary'}`}
            onClick={() => setSubTab('users')}
          >
            <UserCheck size={13} />
            <span>User Entity (9.11)</span>
          </button>
          <button 
            className={`dm-btn ${subTab === 'api_clients' ? 'dm-btn-primary' : 'dm-btn-secondary'}`}
            onClick={() => setSubTab('api_clients')}
          >
            <Key size={13} />
            <span>API Client Entity (9.14)</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          11.1 ROLE-BASED SECURITY MATRIX (Table 30)
         ======================================================== */}
      {subTab === 'role_based' && (
        <div className="dm-tab-content-card">
          <div className="dm-security-rules-banner">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8', fontWeight: 600, marginBottom: '4px' }}>
              <ShieldAlert size={15} />
              <span>Privilege Dependency Rules (Manual Page 54):</span>
            </div>
            <ul style={{ margin: '0 0 0 16px', fontSize: '0.74rem', color: '#cbd5e1', lineHeight: '1.4' }}>
              <li>If user has <strong>Write</strong> privilege, <strong>Read</strong> privilege will be given by default.</li>
              <li>If user has <strong>Delete</strong> privilege, <strong>Write</strong> privilege will be given by default.</li>
              <li>If user does not have <strong>Read</strong> privilege, <strong>Write</strong> privilege will be disabled even assigned.</li>
              <li>If user does not have <strong>Write</strong> privilege, <strong>Delete</strong> privilege will be disabled even assigned.</li>
            </ul>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '14px 0 8px 0', fontSize: '0.74rem', color: '#94a3b8' }}>
            <strong>Legend:</strong>
            <span className="dm-legend-tag purple">A = Administrator</span>
            <span className="dm-legend-tag cyan">E = Engineer</span>
            <span className="dm-legend-tag orange">O = Operator</span>
            <span className="dm-legend-tag yellow">V = Viewer</span>
            <span className="dm-legend-tag blue">D = Data Viewer</span>
          </div>

          <div className="dm-table-scroll-container">
            <table className="dm-data-table">
              <thead>
                <tr>
                  <th>Entities</th>
                  <th style={{ textAlign: 'center' }}>Read</th>
                  <th style={{ textAlign: 'center' }}>Write</th>
                  <th style={{ textAlign: 'center' }}>Delete</th>
                  <th style={{ textAlign: 'center' }}>Annotate</th>
                  <th style={{ textAlign: 'center' }}>Share</th>
                  <th style={{ textAlign: 'center' }}>Assign</th>
                  <th style={{ textAlign: 'center' }}>Asset Table</th>
                  <th style={{ textAlign: 'center' }}>Asset Media</th>
                </tr>
              </thead>
              <tbody>
                {roleMatrixData.map((row, idx) => (
                  <tr key={idx} className="dm-table-row">
                    <td style={{ fontWeight: 600, color: '#f8fafc' }}>{row.entity}</td>
                    <td style={{ textAlign: 'center', fontFamily: 'monospace' }}>{row.read.join(', ') || '-'}</td>
                    <td style={{ textAlign: 'center', fontFamily: 'monospace', color: '#38bdf8' }}>{row.write.join(', ') || '-'}</td>
                    <td style={{ textAlign: 'center', fontFamily: 'monospace', color: '#ef4444' }}>{row.delete.join(', ') || '-'}</td>
                    <td style={{ textAlign: 'center', fontFamily: 'monospace', color: '#f59e0b' }}>{row.annotate.join(', ') || '-'}</td>
                    <td style={{ textAlign: 'center', fontFamily: 'monospace', color: '#10b981' }}>{row.share.join(', ') || '-'}</td>
                    <td style={{ textAlign: 'center', fontFamily: 'monospace', color: '#a855f7' }}>{row.assign.join(', ') || '-'}</td>
                    <td style={{ textAlign: 'center', fontFamily: 'monospace' }}>{row.asset_table.join(', ') || '-'}</td>
                    <td style={{ textAlign: 'center', fontFamily: 'monospace' }}>{row.asset_media.join(', ') || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          11.2 OBJECT-BASED SECURITY (Table 33)
         ======================================================== */}
      {subTab === 'object_based' && (
        <div className="dm-tab-content-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span className="dm-panel-subhead">Object-based Security Rules (Table 33)</span>
          </div>

          <p className="dm-modal-desc">
            Object-based security applies to individual instances of entities (e.g. restricting access to specific distillation columns or charge pumps on the plant hierarchy).
          </p>

          <div className="dm-table-scroll-container">
            <table className="dm-data-table">
              <thead>
                <tr>
                  <th>Resource (Plant Hierarchy Element Path)</th>
                  <th>Identity (User)</th>
                  <th>Privileges</th>
                  <th>Child Privilege Propagation</th>
                  <th style={{ textAlign: 'right', width: '80px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {objectSecurityRules.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                      <Lock size={28} style={{ margin: '0 auto 8px', color: '#475569' }} />
                      <div style={{ fontWeight: 600, color: '#f8fafc' }}>No Object Security Rules Configured</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>All plant hierarchy elements default to role-based access privileges (Table 30).</div>
                    </td>
                  </tr>
                ) : (
                  objectSecurityRules.map(rule => (
                    <tr key={rule.id} className="dm-table-row">
                      <td className="mono" style={{ color: '#38bdf8' }}>{rule.resource}</td>
                      <td style={{ fontWeight: 600, color: '#f8fafc' }}>{rule.identity}</td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {(rule.privilege || []).map(p => (
                            <span key={p} className="dm-tree-badge">{p}</span>
                          ))}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.74rem', color: '#f59e0b' }}>
                        {rule.child_privilege}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          className="dm-row-action-btn delete"
                          onClick={() => deleteObjectSecurityRule(rule.id)}
                          title="Delete Rule"
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
      )}

      {/* ========================================================
          9.11 USER ENTITY & ACCESS CONTROL OVERRIDE (Table 20, 21)
         ======================================================== */}
      {subTab === 'users' && (
        <div className="dm-tab-content-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span className="dm-panel-subhead">Project User Accounts (Section 9.11)</span>
            <button className="dm-btn dm-btn-primary" onClick={() => setIsUserModalOpen(true)}>
              <Plus size={14} /> <span>Add Project User</span>
            </button>
          </div>

          <div className="dm-table-scroll-container">
            <table className="dm-data-table">
              <thead>
                <tr>
                  <th>UPN (User Account Email)</th>
                  <th>Full Name</th>
                  <th>Department</th>
                  <th>Assigned Role</th>
                  <th style={{ textAlign: 'right', width: '80px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                      <Users size={28} style={{ margin: '0 auto 8px', color: '#475569' }} />
                      <div style={{ fontWeight: 600, color: '#f8fafc' }}>No User Accounts Added</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>Click "Add Project User" to create enterprise operator and engineer credentials.</div>
                      <button className="dm-btn dm-btn-primary" style={{ margin: '12px auto 0' }} onClick={() => setIsUserModalOpen(true)}>
                        <Plus size={13} /> <span>Add Project User</span>
                      </button>
                    </td>
                  </tr>
                ) : (
                  users.map(u => (
                    <tr key={u.id} className="dm-table-row">
                      <td className="mono" style={{ color: '#38bdf8' }}>{u.upn}</td>
                      <td style={{ fontWeight: 600, color: '#f8fafc' }}>{u.name}</td>
                      <td style={{ color: '#94a3b8' }}>{u.department}</td>
                      <td>
                        <span className="dm-alarm-badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid #0284c7' }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          className="dm-row-action-btn delete"
                          onClick={() => deleteUser(u.id)}
                          title="Remove User"
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
      )}

      {/* ========================================================
          9.14 API CLIENT ENTITY (Table 24, Table 25)
         ======================================================== */}
      {subTab === 'api_clients' && (
        <div className="dm-tab-content-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span className="dm-panel-subhead">Configured Web API Clients (Section 9.14)</span>
            <button className="dm-btn dm-btn-primary" onClick={() => setIsClientModalOpen(true)}>
              <Plus size={14} /> <span>New API Client</span>
            </button>
          </div>

          <div className="dm-table-scroll-container">
            <table className="dm-data-table">
              <thead>
                <tr>
                  <th>Client Name</th>
                  <th>Client ID</th>
                  <th>Client Secret</th>
                  <th>Authentication Endpoint</th>
                  <th>API Endpoint</th>
                  <th>Access Scopes</th>
                  <th style={{ textAlign: 'right', width: '80px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {apiClients.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                      <Key size={28} style={{ margin: '0 auto 8px', color: '#475569' }} />
                      <div style={{ fontWeight: 600, color: '#f8fafc' }}>No API Clients Configured</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>Click "New API Client" to provision OAuth2 / REST credentials for external systems.</div>
                      <button className="dm-btn dm-btn-primary" style={{ margin: '12px auto 0' }} onClick={() => setIsClientModalOpen(true)}>
                        <Plus size={13} /> <span>New API Client</span>
                      </button>
                    </td>
                  </tr>
                ) : (
                  apiClients.map(c => (
                    <tr key={c.id} className="dm-table-row">
                      <td style={{ fontWeight: 600, color: '#f8fafc' }}>{c.name}</td>
                      <td className="mono" style={{ color: '#38bdf8', fontSize: '0.72rem' }}>{c.client_id}</td>
                      <td className="mono" style={{ color: '#64748b', fontSize: '0.72rem' }}>••••••••••••••••</td>
                      <td className="mono" style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{c.auth_endpoint}</td>
                      <td className="mono" style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{c.api_endpoint}</td>
                      <td>
                        <span className="dm-value-badge">
                          {(c.scopes || []).length} scopes
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          className="dm-row-action-btn delete"
                          onClick={() => deleteApiClient(c.id)}
                          title="Delete Client"
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
      )}

      {/* ADD USER MODAL */}
      {isUserModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1400 }}>
          <div className="dm-modal-box" style={{ width: '480px' }}>
            <div className="dm-modal-header">
              <h3>Add Project User (Table 20)</h3>
              <button onClick={() => setIsUserModalOpen(false)} className="dm-close-btn">&times;</button>
            </div>
            <div className="dm-modal-body">
              <div className="dm-form-group">
                <label className="dm-field-label">UPN (Unique User Email)</label>
                <input 
                  type="email"
                  className="dm-input"
                  placeholder="e.g. engineer2@yokogawa.com"
                  value={userFormData.upn}
                  onChange={(e) => setUserFormData({ ...userFormData, upn: e.target.value })}
                />
              </div>
              <div className="dm-form-group">
                <label className="dm-field-label">Full Name</label>
                <input 
                  type="text"
                  className="dm-input"
                  placeholder="e.g. John Doe"
                  value={userFormData.name}
                  onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                />
              </div>
              <div className="dm-form-grid-2">
                <div className="dm-form-group">
                  <label className="dm-field-label">Assigned Role</label>
                  <select 
                    className="dm-select"
                    value={userFormData.role}
                    onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                  >
                    <option value="Administrator">Administrator</option>
                    <option value="Engineer">Engineer</option>
                    <option value="Operator">Operator</option>
                    <option value="Viewer">Viewer</option>
                    <option value="Data Viewer">Data Viewer</option>
                  </select>
                </div>
                <div className="dm-form-group">
                  <label className="dm-field-label">Department</label>
                  <input 
                    type="text"
                    className="dm-input"
                    value={userFormData.department}
                    onChange={(e) => setUserFormData({ ...userFormData, department: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="dm-modal-footer">
              <button className="dm-btn dm-btn-secondary" onClick={() => setIsUserModalOpen(false)}>Cancel</button>
              <button 
                className="dm-btn dm-btn-primary"
                onClick={() => {
                  if (!userFormData.upn) return;
                  createUser(userFormData);
                  setIsUserModalOpen(false);
                }}
              >
                Add User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE API CLIENT MODAL */}
      {isClientModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1400 }}>
          <div className="dm-modal-box" style={{ width: '540px' }}>
            <div className="dm-modal-header">
              <h3>Create API Client (Table 24)</h3>
              <button onClick={() => setIsClientModalOpen(false)} className="dm-close-btn">&times;</button>
            </div>
            <div className="dm-modal-body">
              <div className="dm-form-group">
                <label className="dm-field-label">API Client Name</label>
                <input 
                  type="text"
                  className="dm-input"
                  placeholder="e.g. Cloud Historian Connector"
                  value={clientForm.name}
                  onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                />
              </div>
              <div className="dm-form-group">
                <label className="dm-field-label">Authentication Endpoint</label>
                <input 
                  type="text"
                  className="dm-input mono"
                  value={clientForm.auth_endpoint}
                  onChange={(e) => setClientForm({ ...clientForm, auth_endpoint: e.target.value })}
                />
              </div>
              <div className="dm-form-group">
                <label className="dm-field-label">API Endpoint</label>
                <input 
                  type="text"
                  className="dm-input mono"
                  value={clientForm.api_endpoint}
                  onChange={(e) => setClientForm({ ...clientForm, api_endpoint: e.target.value })}
                />
              </div>
            </div>
            <div className="dm-modal-footer">
              <button className="dm-btn dm-btn-secondary" onClick={() => setIsClientModalOpen(false)}>Cancel</button>
              <button 
                className="dm-btn dm-btn-primary"
                onClick={async () => {
                  if (!clientForm.name) return;
                  await createApiClient({
                    ...clientForm,
                    scopes: [
                      { entity: 'Asset', permissions: ['Read Asset'] },
                      { entity: 'Device', permissions: ['Read Device'] }
                    ]
                  });
                  setIsClientModalOpen(false);
                }}
              >
                Generate API Client
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
