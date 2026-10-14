import React, { useState } from 'react';
import { 
  X, BookOpen, Layers, Shield, User, Globe, 
  ExternalLink, Search, Check, ChevronRight, FileText, Download
} from 'lucide-react';
import { useDM } from './dmContext';

// ==========================================
// 1. ONLINE USER MANUAL MODAL (Section 8.1.3)
// ==========================================
export function DMUserManualModal() {
  const { isManualOpen, setIsManualOpen } = useDM();
  const [activeSection, setActiveSection] = useState('8');
  const [searchManual, setSearchManual] = useState('');

  if (!isManualOpen) return null;

  const sections = [
    { id: '1', title: '1. Introduction', content: `Yokogawa's Asset Health Insights (AHI) provides customers with unified cloud-based OT data enablement & ecosystem platform to enable integration with various assets and systems. It enables user to monitor, gain insight and analyze 'any type of asset' and system to enhance decision making, business and operational productivity.\n\nAHI provides a 'self-service' model with low code / no code environment to design asset models, hierarchies, and visualization.` },
    { id: '6', title: '6. Related Documents', content: `• AHI-MAN-UM002: Data Insight User Manual (v1.3)\n• CENTUM VP Distributed Control System Integration Guide\n• Yokogawa OpreX DBM CFIHOS 1.5 Ontology Reference` },
    { id: '8', title: '8. Data Management Module Overview', content: `Data Management Module provides intuitive UI and features which help users quickly connect IIoT devices/sensors and organize plant hierarchies.\n\nCommon controls include Expand-Collapse, Table List Control Buttons (+ Add, Refresh, Filter, Delete, Import, Export, Edit Schema, Add Folder, Download, Upload), Search Control, Multi-column Sorting with Priority numbers, Pagination, Records per page (20/40/80/160), Setting control, User profile, Multi-language switcher, Notifications, Online User Manual, Sitemap, and Terms & Conditions.` },
    { id: '9.1', title: '9.1 Asset Entity', content: `Asset entity provides an element tree list view working space and parent-child design concept. Features include Drag & Drop hierarchy reordering without data impact, right-click Function Dialog (+ Add New, Edit Asset, Create Template, Clone Asset, Clone Asset & Children, Delete Asset, Access Control, Download Attribute Assembly, Bookmark).\n\nAsset Element detail tabs include:\n1. Asset Attribute (Static, Dynamic, Runtime, Alias, Integration, Command with Microsoft Math Class support)\n2. Asset Table (Tabular format storage, schema designer, record CRUD)\n3. Asset Media (File & folder hierarchical structure, upload, preview, download)` },
    { id: '9.2', title: '9.2 Asset Template Entity', content: `Template-based asset management with Device Markup support (e.g. Attribute1.device1.metric). Deploy Template wizard maps markup device groups to actual field IoT devices in 1-click.` },
    { id: '9.5', title: '9.5 Device Entity', content: `Manage IoT devices connecting via Azure IoT Hub, MQTT or CoAP. Features SAS token generator, Server Monitoring health check with disconnect timeout, Cloud-to-Device binding test, and Download Metrics Sample button.` },
    { id: '9.6', title: '9.6 Device Template Entity', content: `Manage JSON payload message mapping. Auto-parse JSON format payload messages into selectable metric keys (Figure 4) with data types (Double, Int, Timestamp, Bool, Text) and configure Cloud-to-Device bindings.` },
    { id: '9.7', title: '9.7 Broker Entity', content: `Core ingestion connectors: Azure IoT Hub (Tiers B1-B3, S1-S3), Azure Event Hub (Basic, Standard, Premium), Broker REST API (/api/v1/dm/broker/ingest), CoAP (RFC 7252/JWT), and MQTT.` },
    { id: '9.8', title: '9.8 Integration Entity', content: `Connect to external systems: Azure Event Hub, Green Koncepts Integration, and Yokogawa Digital Experience (YDX) Integration.` },
    { id: '9.9', title: '9.9 UoM (Unit of Measure) Entity', content: `Manage units of measure with categories (Temperature, Pressure, Flow, Level, Electricity, Vibration, Speed, Mass, Volume), conversion factors, and canonical offsets.` },
    { id: '9.10', title: '9.10 Event Forwarding Entity', content: `Forward asset attribute updates to external destinations (Azure Event Hub, RabbitMQ, Webhooks) with scope selection and simplified flattened payload toggle.` },
    { id: '10', title: '10. Alarm Management', content: `Adheres to ISA-18.2 standards with Table 27 priority color coding:\n• Urgent (751-1000): Purple\n• High (501-750): Red\n• Medium (251-500): Orange\n• Low (1-250): Yellow\n\nFeatures interactive Alarm History Trail (Figure 5: Unacknowledged -> Acknowledged -> Normal), Alarm Rules (Absolute Analog/Digital, Deviation), and Notifications (Email, Webhook, WhatsApp).` },
    { id: '11', title: '11. Security Control', content: `Comprehensive security layers:\n• 11.1 Role-based Security (Table 30 matrix across Administrator, Engineer, Operator, Viewer, Data Viewer with dependency rules)\n• 11.2 Object-based Security (Table 33: Resource path, Identity, Privileges, Child Privilege propagation)` }
  ];

  const currentSec = sections.find(s => s.id === activeSection) || sections[0];

  return (
    <div className="modal-backdrop" style={{ zIndex: 1600 }}>
      <div className="dm-modal-box" style={{ width: '840px', height: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div className="dm-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={18} color="#38bdf8" />
            <h3>AHI – Data Management Module User's Manual (v1.3)</h3>
          </div>
          <button onClick={() => setIsManualOpen(false)} className="dm-close-btn">&times;</button>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Table of Contents */}
          <div style={{ width: '260px', borderRight: '1px solid rgba(255,255,255,0.08)', padding: '12px', overflowY: 'auto' }}>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, marginBottom: '8px' }}>Table of Contents</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {sections.map(s => (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  style={{
                    textAlign: 'left',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    background: activeSection === s.id ? 'rgba(56,189,248,0.15)' : 'transparent',
                    border: 'none',
                    color: activeSection === s.id ? '#38bdf8' : '#cbd5e1',
                    fontSize: '0.76rem',
                    cursor: 'pointer',
                    fontWeight: activeSection === s.id ? 600 : 400
                  }}
                >
                  {s.title}
                </button>
              ))}
            </div>
          </div>

          {/* Chapter Content */}
          <div style={{ flex: 1, padding: '20px', overflowY: 'auto', background: '#0a0d14' }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#f8fafc', fontSize: '1.1rem' }}>{currentSec.title}</h3>
            <div style={{ whiteSpace: 'pre-line', fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.6' }}>
              {currentSec.content}
            </div>
          </div>
        </div>

        <div className="dm-modal-footer">
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Copyright © 2024, Yokogawa Electric Corporation. All Rights Reserved.</span>
          <button className="dm-btn dm-btn-primary" onClick={() => setIsManualOpen(false)}>Close Manual</button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. SITEMAP MODAL (Section 8.1.3)
// ==========================================
export function DMSitemapModal() {
  const { isSitemapOpen, setIsSitemapOpen, setActiveEntity } = useDM();
  if (!isSitemapOpen) return null;

  const mapGroups = [
    {
      group: "Asset Management",
      items: [
        { key: "asset", name: "Asset Entity", desc: "Plant hierarchy tree, Attributes, Tables, Media" },
        { key: "asset_template", name: "Asset Template Entity", desc: "Device markup models & 1-click deploy wizard" },
        { key: "table_list", name: "Table List Entity", desc: "Global repository of all tabular storages" },
        { key: "media_list", name: "Media List Entity", desc: "Global repository of all manuals, P&IDs, cutaways" }
      ]
    },
    {
      group: "Device & Connectivity",
      items: [
        { key: "device", name: "Device Entity", desc: "Connected IoT devices, SAS tokens, Server Monitoring" },
        { key: "device_template", name: "Device Template Entity", desc: "Figure 4 JSON payload message parser & bindings" },
        { key: "broker", name: "Broker Entity", desc: "Azure IoT Hub (B1-S3), Event Hub, REST API, CoAP, MQTT" },
        { key: "integration", name: "Integration Entity", desc: "Azure Event Hub, Green Koncepts, YDX Cloud" },
        { key: "event_forwarding", name: "Event Forwarding Entity", desc: "Forward telemetry to Event Hub, RabbitMQ, Webhooks" }
      ]
    },
    {
      group: "Master Data & Alarms",
      items: [
        { key: "uom", name: "UoM (Unit of Measure)", desc: "Engineering units, conversion factors & offsets" },
        { key: "alarms", name: "Alarm Management", desc: "Alarm List (Table 27), History Trail (Figure 5), Rules, Actions" }
      ]
    },
    {
      group: "Security & Governance",
      items: [
        { key: "security", name: "Security Control", desc: "Table 30 RBAC Matrix, Table 33 Object Security, Users, API Clients" },
        { key: "activity_log", name: "Activity Log Entity", desc: "Auditable trail of all configuration events" }
      ]
    }
  ];

  return (
    <div className="modal-backdrop" style={{ zIndex: 1600 }}>
      <div className="dm-modal-box" style={{ width: '740px' }}>
        <div className="dm-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} color="#38bdf8" />
            <h3>AHI Data Management Module Sitemap</h3>
          </div>
          <button onClick={() => setIsSitemapOpen(false)} className="dm-close-btn">&times;</button>
        </div>
        <div className="dm-modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {mapGroups.map(g => (
              <div key={g.group} style={{ background: '#0a0d14', padding: '12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#f59e0b' }}>{g.group}</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {g.items.map(it => (
                    <div 
                      key={it.key}
                      onClick={() => {
                        setActiveEntity(it.key);
                        setIsSitemapOpen(false);
                      }}
                      style={{ cursor: 'pointer', padding: '4px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.02)' }}
                    >
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#38bdf8' }}>{it.name}</div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{it.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="dm-modal-footer">
          <button className="dm-btn dm-btn-primary" onClick={() => setIsSitemapOpen(false)}>Close Sitemap</button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3. TERMS & CONDITIONS MODAL (Section 8.1.3)
// ==========================================
export function DMTermsModal() {
  const { isTermsOpen, setIsTermsOpen } = useDM();
  const [activeTab, setActiveTab] = useState('csa');
  if (!isTermsOpen) return null;

  const terms = {
    csa: { title: "Cloud Service Agreement", text: "Yokogawa Electric Corporation provides the Asset Health Insights (AHI) cloud platform subject to standard high-availability industrial reliability parameters. Yokogawa guarantees 99.9% uptime SLA for industrial data pipeline ingestion and storage." },
    slt: { title: "Specific License Term", text: "Enterprise licenses authorize continuous tag collection, distributed broker streaming, and machine learning model evaluation across authorized refinery, chemical, and offshore installations." },
    dpa: { title: "Data Processing Addendum", text: "Customer process telemetry, asset hierarchies, and calibration records are strictly encrypted in transit using TLS 1.3 and at rest using AES-256." },
    slo: { title: "Service Level Objective", text: "Target telemetry latency from edge IoT gateways (CENTUM VP, PRM Gateway) to AHI Data Management Data Hub is under 250 milliseconds globally." },
    gs: { title: "General Specification", text: "Compliant with ISO 27001, IEC 62443 industrial cybersecurity standards, and ISA-95 asset hierarchy taxonomy." }
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 1600 }}>
      <div className="dm-modal-box" style={{ width: '640px' }}>
        <div className="dm-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="#38bdf8" />
            <h3>Yokogawa AHI Terms & Conditions</h3>
          </div>
          <button onClick={() => setIsTermsOpen(false)} className="dm-close-btn">&times;</button>
        </div>
        <div className="dm-modal-body">
          <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
            {Object.keys(terms).map(k => (
              <button
                key={k}
                className={`dm-filter-pill ${activeTab === k ? 'active' : ''}`}
                onClick={() => setActiveTab(k)}
              >
                {terms[k].title}
              </button>
            ))}
          </div>

          <div style={{ background: '#0a0d14', padding: '16px', borderRadius: '6px', minHeight: '140px', fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.6' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#f8fafc' }}>{terms[activeTab].title}</h4>
            <p>{terms[activeTab].text}</p>
          </div>
        </div>
        <div className="dm-modal-footer">
          <button className="dm-btn dm-btn-primary" onClick={() => setIsTermsOpen(false)}>I Agree & Close</button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 4. USER PROFILE MODAL (Table 4)
// ==========================================
export function DMUserProfileModal() {
  const { isProfileOpen, setIsProfileOpen, userProfile, setUserProfile, showToast } = useDM();
  const [form, setForm] = useState({ ...userProfile });

  if (!isProfileOpen) return null;

  return (
    <div className="modal-backdrop" style={{ zIndex: 1600 }}>
      <div className="dm-modal-box" style={{ width: '500px' }}>
        <div className="dm-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={18} color="#38bdf8" />
            <h3>User Profile Settings (Table 4)</h3>
          </div>
          <button onClick={() => setIsProfileOpen(false)} className="dm-close-btn">&times;</button>
        </div>
        <div className="dm-modal-body">
          <div className="dm-form-grid-2">
            <div className="dm-form-group">
              <label className="dm-field-label">First Name</label>
              <input 
                type="text"
                className="dm-input"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              />
            </div>
            <div className="dm-form-group">
              <label className="dm-field-label">Last Name</label>
              <input 
                type="text"
                className="dm-input"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              />
            </div>
          </div>

          <div className="dm-form-group">
            <label className="dm-field-label">User Account ID (UPN)</label>
            <input 
              type="text"
              className="dm-input mono"
              value={form.account_id}
              readOnly
              style={{ background: '#0a0d14', color: '#94a3b8' }}
            />
          </div>

          <div className="dm-form-group">
            <label className="dm-field-label">Datetime Format (UTC Display Format)</label>
            <select 
              className="dm-select"
              value={form.datetime_format}
              onChange={(e) => setForm({ ...form, datetime_format: e.target.value })}
            >
              <option value="YYYY-MM-DD HH:mm:ss">YYYY-MM-DD HH:mm:ss</option>
              <option value="DD/MM/YYYY HH:mm:ss">DD/MM/YYYY HH:mm:ss</option>
              <option value="MM/DD/YYYY hh:mm:ss A">MM/DD/YYYY hh:mm:ss A</option>
              <option value="ISO-8601">ISO-8601 (2024-03-05T08:00:00Z)</option>
            </select>
          </div>

          <div className="dm-form-group">
            <label className="dm-field-label">Timezone (Ingestion Data UTC Display Timezone)</label>
            <select 
              className="dm-select"
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
            >
              <option value="UTC+08:00 (Singapore / Jurong Standard Time)">UTC+08:00 (Singapore / Jurong Standard Time)</option>
              <option value="UTC+09:00 (Tokyo / Kawasaki Japan Time)">UTC+09:00 (Tokyo / Kawasaki Japan Time)</option>
              <option value="UTC+00:00 (Coordinated Universal Time / London)">UTC+00:00 (Coordinated Universal Time / London)</option>
              <option value="UTC-05:00 (Houston / Texas Central Time)">UTC-05:00 (Houston / Texas Central Time)</option>
            </select>
          </div>
        </div>
        <div className="dm-modal-footer">
          <button className="dm-btn dm-btn-secondary" onClick={() => setIsProfileOpen(false)}>Cancel</button>
          <button 
            className="dm-btn dm-btn-primary"
            onClick={async () => {
              setUserProfile(form);
              try {
                await fetch('/api/v1/dm/user-profile', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(form)
                });
              } catch (e) {}
              showToast('User profile settings saved!', 'success');
              setIsProfileOpen(false);
            }}
          >
            Save Profile
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 5. SWITCH PROJECT MODAL (Section 8.1.3)
// ==========================================
export function DMSwitchProjectModal() {
  const { isProjectModalOpen, setIsProjectModalOpen, project, setProject, availableProjects, showToast } = useDM();
  if (!isProjectModalOpen) return null;

  return (
    <div className="modal-backdrop" style={{ zIndex: 1600 }}>
      <div className="dm-modal-box" style={{ width: '520px' }}>
        <div className="dm-modal-header">
          <h3>Switch Data Management Project</h3>
          <button onClick={() => setIsProjectModalOpen(false)} className="dm-close-btn">&times;</button>
        </div>
        <div className="dm-modal-body">
          <p className="dm-modal-desc">
            Select an enterprise operational facility to manage assets, devices, brokers, and telemetry rules.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {availableProjects.map(p => (
              <div 
                key={p.id}
                onClick={async () => {
                  setProject(p);
                  try {
                    await fetch('/api/v1/dm/switch-project', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ project_id: p.id })
                    });
                  } catch (e) {}
                  showToast(`Switched project to: ${p.name}`, 'success');
                  setIsProjectModalOpen(false);
                }}
                className={`dm-template-card ${project.id === p.id ? 'active' : ''}`}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <h4 style={{ margin: 0, color: '#f8fafc' }}>{p.name}</h4>
                  <span className="mono" style={{ fontSize: '0.72rem', color: '#38bdf8' }}>{p.code}</span>
                </div>
                <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '4px' }}>{p.region}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="dm-modal-footer">
          <button className="dm-btn dm-btn-primary" onClick={() => setIsProjectModalOpen(false)}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 6. APP PORTAL MODAL (Section 8.1.3)
// ==========================================
export function DMAppPortalModal({ onNavigateToDI }) {
  const { isAppPortalOpen, setIsAppPortalOpen } = useDM();
  if (!isAppPortalOpen) return null;

  return (
    <div className="modal-backdrop" style={{ zIndex: 1600 }}>
      <div className="dm-modal-box" style={{ width: '600px' }}>
        <div className="dm-modal-header">
          <h3>Yokogawa Asset Health Insights (AHI) Suite</h3>
          <button onClick={() => setIsAppPortalOpen(false)} className="dm-close-btn">&times;</button>
        </div>
        <div className="dm-modal-body">
          <p className="dm-modal-desc">
            AHI consists of 3 modular components engineered to collaborate seamlessly (Manual Page 6):
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
            <div 
              style={{
                background: 'rgba(56,189,248,0.1)',
                border: '1px solid #0284c7',
                padding: '14px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <h4 style={{ margin: '0 0 4px 0', color: '#38bdf8' }}>1. Data Management Module (Active)</h4>
                <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                  Device connectivity, plant hierarchy models, tabular inspection storage, brokers, and ISA-18.2 alarms.
                </div>
              </div>
              <span className="dm-health-badge connected"><span className="dm-dot" /> ACTIVE</span>
            </div>

            <div 
              onClick={() => {
                setIsAppPortalOpen(false);
                if (onNavigateToDI) onNavigateToDI();
              }}
              style={{
                background: '#0a0d14',
                border: '1px solid rgba(255,255,255,0.08)',
                padding: '14px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <h4 style={{ margin: '0 0 4px 0', color: '#f8fafc' }}>2. Data Insight (DI) Module</h4>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Industrial process operations dashboard, interactive mimic diagrams, and high-frequency real-time trends.
                </div>
              </div>
              <button className="dm-btn dm-btn-secondary" style={{ fontSize: '0.72rem' }}>
                Open DI &rarr;
              </button>
            </div>

            <div 
              style={{
                background: '#0a0d14',
                border: '1px solid rgba(255,255,255,0.08)',
                padding: '14px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <h4 style={{ margin: '0 0 4px 0', color: '#f8fafc' }}>3. Data Analytic (DA) Module</h4>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Mahalanobis-Taguchi multivariate anomaly detection, remaining useful life (RUL) estimation, and predictive maintenance.
                </div>
              </div>
              <span className="dm-tree-badge">INTEGRATED</span>
            </div>
          </div>
        </div>
        <div className="dm-modal-footer">
          <button className="dm-btn dm-btn-primary" onClick={() => setIsAppPortalOpen(false)}>Close Portal</button>
        </div>
      </div>
    </div>
  );
}
