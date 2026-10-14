import React, { useState } from 'react';
import { 
  Bell, AlertTriangle, AlertOctagon, CheckCircle2, 
  Clock, Shield, Plus, Trash2, Mail, MessageSquare, 
  Send, ExternalLink, Activity, Info, Eye, Check,
  RotateCcw, Share2, Play, Sparkles, CheckCircle, Wifi,
  Edit3, Sliders, Wand2, Tag, ShieldAlert
} from 'lucide-react';
import { useDM } from './dmContext';
import DMCommonControls from './DMCommonControls';

export default function AlarmManagementView() {
  const {
    alarms,
    alarmHistories,
    alarmRules,
    alarmActions,
    acknowledgeAlarm,
    clearAlarm,
    triggerAlarm,
    updateAlarm,
    deleteAlarm,
    testForwardAlarm,
    createAlarmRule,
    updateAlarmRule,
    deleteAlarmRule,
    createAlarmAction,
    updateAlarmAction,
    deleteAlarmAction,
    assets,
    refreshState,
    showToast
  } = useDM();

  // Sub-tabs: 'list' (10.1) | 'history' (10.2) | 'rules' (10.3) | 'actions' (10.4)
  const [subTab, setSubTab] = useState('list');

  // Alarm History Trail Modal (Figure 5)
  const [activeHistoryTrail, setActiveHistoryTrail] = useState(null);
  const [selectedAlarmDetail, setSelectedAlarmDetail] = useState(null);

  // Edit Active Alarm Modal
  const [isEditAlarmModalOpen, setIsEditAlarmModalOpen] = useState(false);
  const [editingAlarmId, setEditingAlarmId] = useState(null);
  const [editAlarmForm, setEditAlarmForm] = useState({
    alarm_name: '',
    site_name: '',
    area: '',
    message: '',
    severity: 650,
    priority: 'High',
    state: 'In Alarm Unacknowledged',
    threshold_limit: 100,
    scan_rate_seconds: 1,
    class_type: 'Process Safety',
    notification_action_id: ''
  });

  // Filter & Search states
  const [alarmSearch, setAlarmSearch] = useState('');
  const [alarmStateFilter, setAlarmStateFilter] = useState('ALL');
  const [alarmSeverityFilter, setAlarmSeverityFilter] = useState('ALL');

  // Testing dispatch status
  const [testingAlarmId, setTestingAlarmId] = useState(null);

  // Create / Edit Rule Modal
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [ruleValidationErr, setRuleValidationErr] = useState('');
  const [ruleForm, setRuleForm] = useState({
    name: '',
    site_name: 'Refinery Plant Site 1',
    description: '',
    area: 'Fractionator Block A',
    group: 'Process Control',
    alarm_type: 'Analog',
    class_type: 'Process',
    source: '',
    signal: '',
    tag_name: '',
    uom: '',
    current_value: '',
    on_delay_seconds: 3,
    off_delay_seconds: 5,
    time_interval_seconds: 1,
    scan_rate_seconds: 1,
    required_acknowledge: true,
    enable_high_high: false,
    high_high_threshold: 300,
    high_high_priority: 'Urgent',
    high_high_severity: 850,
    high_high_message: 'High High process trip threshold exceeded!',
    enable_high: true,
    high_threshold: 250,
    high_priority: 'High',
    high_severity: 650,
    high_message: 'High warning threshold exceeded',
    enable_low: false,
    low_threshold: 40,
    low_priority: 'Medium',
    low_severity: 350,
    low_message: 'Low process limit warning',
    enable_low_low: false,
    low_low_threshold: 15,
    low_low_priority: 'Urgent',
    low_low_severity: 800,
    low_low_message: 'Low Low emergency trip threshold exceeded',
    enable_notification: true,
    notification_channel: 'Email',
    notification_contact: 'shift-supervisor@yokogawa.com',
    notification_action_id: '',
    forward_destination: 'http://localhost:1880/alarms'
  });

  // Create Process Alarm Modal (Direct from Alarm List)
  const [isCreateAlarmModalOpen, setIsCreateAlarmModalOpen] = useState(false);
  const [createAlarmForm, setCreateAlarmForm] = useState({
    alarm_name: '',
    site_name: 'Refinery Plant Site 1',
    area: 'Plant Area 1',
    source_asset: '',
    asset_id: '',
    attribute_name: '',
    tag_name: '',
    current_value: 0,
    threshold_limit: 100,
    priority: 'High',
    severity: 650,
    class_type: 'Process Safety',
    scan_rate_seconds: 1,
    uom: '',
    message: ''
  });

  // Create / Edit Action Wizard Modal (Table 29)
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [editingActionId, setEditingActionId] = useState(null);
  const [actionWizardStep, setActionWizardStep] = useState(1);
  const [actionForm, setActionForm] = useState({
    name: '',
    type: 'Email',
    subject: '[ALARM TRIP] Emergency Notification',
    to_contact: 'shift-supervisor@yokogawa.com',
    attach_acknowledge_link: true,
    add_ahi_header_footer: true,
    content: 'Process parameter {{alarm_name}} tripped! Current value {{current_value}} exceeded threshold {{threshold_limit}}. Action required immediately.'
  });

  // Helper: Severity color based on Table 27
  const getSeverityStyle = (severity, priority) => {
    if (severity >= 751 || priority === 'Urgent') {
      return { bg: 'rgba(147, 51, 234, 0.2)', color: '#c084fc', border: '#9333ea', label: 'Urgent (751-1000)' };
    }
    if (severity >= 501 || priority === 'High') {
      return { bg: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '#ef4444', label: 'High (501-750)' };
    }
    if (severity >= 251 || priority === 'Medium') {
      return { bg: 'rgba(249, 115, 22, 0.2)', color: '#fb923c', border: '#f97316', label: 'Medium (251-500)' };
    }
    return { bg: 'rgba(234, 179, 8, 0.2)', color: '#fde047', border: '#eab308', label: 'Low (1-250)' };
  };

  // Requirement 1: Only non-Normal alarms in Active Alarms list; Normal alarms separated
  const activeAlarms = alarms.filter(a => a.state !== 'Normal');
  const normalAlarms = alarms.filter(a => a.state === 'Normal');

  const filteredActiveAlarms = activeAlarms.filter(a => {
    if (alarmStateFilter !== 'ALL' && a.state !== alarmStateFilter) return false;
    if (alarmSeverityFilter !== 'ALL') {
      if (alarmSeverityFilter === 'Urgent' && !(a.severity >= 751 || a.priority === 'Urgent')) return false;
      if (alarmSeverityFilter === 'High' && !(a.severity >= 501 && a.severity <= 750 && a.priority !== 'Urgent')) return false;
      if (alarmSeverityFilter === 'Medium' && !(a.severity >= 251 && a.severity <= 500)) return false;
      if (alarmSeverityFilter === 'Low' && !(a.severity <= 250)) return false;
    }
    if (alarmSearch.trim()) {
      const q = alarmSearch.toLowerCase();
      return (a.alarm_name || '').toLowerCase().includes(q) || 
             (a.tag_name || '').toLowerCase().includes(q) || 
             (a.source_asset || '').toLowerCase().includes(q) ||
             (a.site_name || '').toLowerCase().includes(q) ||
             (a.area || '').toLowerCase().includes(q);
    }
    return true;
  });

  const filteredNormalAlarms = normalAlarms.filter(a => {
    if (alarmSeverityFilter !== 'ALL') {
      if (alarmSeverityFilter === 'Urgent' && !(a.severity >= 751 || a.priority === 'Urgent')) return false;
      if (alarmSeverityFilter === 'High' && !(a.severity >= 501 && a.severity <= 750 && a.priority !== 'Urgent')) return false;
      if (alarmSeverityFilter === 'Medium' && !(a.severity >= 251 && a.severity <= 500)) return false;
      if (alarmSeverityFilter === 'Low' && !(a.severity <= 250)) return false;
    }
    if (alarmSearch.trim()) {
      const q = alarmSearch.toLowerCase();
      return (a.alarm_name || '').toLowerCase().includes(q) || 
             (a.tag_name || '').toLowerCase().includes(q) || 
             (a.source_asset || '').toLowerCase().includes(q) ||
             (a.site_name || '').toLowerCase().includes(q) ||
             (a.area || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="dm-entity-container">
      {/* Top Header */}
      <div className="dm-entity-header-row">
        <div>
          <h2 className="dm-page-title">Alarm Management (Section 10)</h2>
          <p className="dm-page-subtitle">
            Comprehensive industrial manufacturing and plant alarm system adhering to ISA-18.2 standards with Table 27 urgency color-coding.
          </p>
        </div>

        {/* Sub-Tabs Selector */}
        <div className="dm-btn-group">
          <button 
            className={`dm-btn ${subTab === 'list' ? 'dm-btn-primary' : 'dm-btn-secondary'}`}
            onClick={() => setSubTab('list')}
          >
            <Bell size={13} />
            <span>Active Alarms ({activeAlarms.length})</span>
          </button>
          <button 
            className={`dm-btn ${subTab === 'normal' ? 'dm-btn-primary' : 'dm-btn-secondary'}`}
            onClick={() => setSubTab('normal')}
          >
            <CheckCircle2 size={13} style={{ color: '#10b981' }} />
            <span>Return to Normal (RTN) ({normalAlarms.length})</span>
          </button>
          <button 
            className={`dm-btn ${subTab === 'history' ? 'dm-btn-primary' : 'dm-btn-secondary'}`}
            onClick={() => setSubTab('history')}
          >
            <Clock size={13} />
            <span>Alarm History ({alarmHistories.length})</span>
          </button>
          <button 
            className={`dm-btn ${subTab === 'rules' ? 'dm-btn-primary' : 'dm-btn-secondary'}`}
            onClick={() => setSubTab('rules')}
          >
            <Shield size={13} />
            <span>Alarm Rules ({alarmRules.length})</span>
          </button>
          <button 
            className={`dm-btn ${subTab === 'actions' ? 'dm-btn-primary' : 'dm-btn-secondary'}`}
            onClick={() => setSubTab('actions')}
          >
            <Send size={13} />
            <span>Alarm Notifications ({alarmActions.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          10.1 ALARM LIST (Table 27 Urgency Color Codes)
         ======================================================== */}
      {subTab === 'list' && (
        <div className="dm-tab-content-card">
          <div className="dm-alarm-legend-row">
            <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600 }}>Table 27 Alarm Urgency:</span>
            <div className="dm-legend-tag purple">Urgent (751-1000)</div>
            <div className="dm-legend-tag red">High (501-750)</div>
            <div className="dm-legend-tag orange">Medium (251-500)</div>
            <div className="dm-legend-tag yellow">Low (1-250)</div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, marginRight: '4px' }}>State:</span>
            {['ALL', 'In Alarm Unacknowledged', 'In Alarm Acknowledged', 'Normal Unacknowledged', 'Event'].map(st => (
              <button 
                key={st}
                className={`dm-filter-pill ${alarmStateFilter === st ? 'active' : ''}`}
                onClick={() => setAlarmStateFilter(st)}
              >
                {st}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, marginRight: '4px' }}>Severity:</span>
            {['ALL', 'Urgent', 'High', 'Medium', 'Low'].map(sev => (
              <button 
                key={sev}
                className={`dm-filter-pill ${alarmSeverityFilter === sev ? 'active' : ''}`}
                onClick={() => setAlarmSeverityFilter(sev)}
                style={{
                  borderColor: sev === 'Urgent' ? '#9333ea' : sev === 'High' ? '#ef4444' : sev === 'Medium' ? '#f97316' : sev === 'Low' ? '#eab308' : undefined
                }}
              >
                {sev}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ flex: 1, minWidth: '280px' }}>
              <DMCommonControls 
                searchQuery={alarmSearch}
                onSearchChange={setAlarmSearch}
                totalRecords={filteredActiveAlarms.length}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="dm-btn dm-btn-primary"
                style={{ fontSize: '0.74rem', padding: '6px 12px' }}
                onClick={() => {
                  const defaultAsset = assets[0];
                  const defaultAttr = defaultAsset?.attributes?.[0];
                  const curVal = defaultAttr ? (parseFloat(defaultAttr.value) || 0) : 100;
                  setCreateAlarmForm({
                    alarm_name: defaultAsset && defaultAttr ? `${defaultAsset.name} ${defaultAttr.name} Alarm` : 'Process Parameter Alarm',
                    source_asset: defaultAsset?.name || '',
                    asset_id: defaultAsset?.id || '',
                    site_name: defaultAsset?.site || 'Site 1',
                    area: defaultAsset?.area || 'Area 1',
                    attribute_name: defaultAttr?.name || '',
                    tag_name: defaultAttr?.tag_name || (defaultAsset && defaultAttr ? `${defaultAsset.name}.${defaultAttr.name}` : ''),
                    current_value: curVal,
                    threshold_limit: curVal ? Math.round(curVal * 1.2) : 120,
                    priority: 'High',
                    severity: 650,
                    class_type: 'Process Safety',
                    scan_rate_seconds: 1,
                    uom: defaultAttr?.uom || '',
                    message: ''
                  });
                  setIsCreateAlarmModalOpen(true);
                }}
              >
                <Plus size={13} />
                <span>Create / Trip Alarm</span>
              </button>
              <button
                className="dm-btn dm-btn-secondary"
                style={{ fontSize: '0.74rem', padding: '6px 12px', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)' }}
                onClick={async () => {
                  try {
                    const res = await fetch('/api/v1/dm/alarm-rules/evaluate', { method: 'POST' });
                    const data = await res.json();
                    await refreshState();
                    showToast(`Rules Evaluated: ${data.active_alarms_count} active alarm(s)`, 'success');
                  } catch (e) {
                    showToast(`Evaluation error: ${e.message}`, 'error');
                  }
                }}
                title="Evaluate all alarm rules against current live asset attribute readings"
              >
                <Play size={13} />
                <span>Evaluate Rules</span>
              </button>
              <button
                className="dm-btn dm-btn-secondary"
                style={{ fontSize: '0.74rem', padding: '6px 12px', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                onClick={async () => {
                  try {
                    const res = await fetch('/api/v1/dm/alarms/trigger', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        alarm_name: 'C-101 Column Top High High Pressure Trip',
                        tag_name: 'PIC_101.PV',
                        current_value: 312.4,
                        threshold_limit: 280.0,
                        priority: 'Urgent',
                        severity: 850,
                        source_asset: 'Atmospheric Distillation Unit C-101',
                        scan_rate_seconds: 1
                      })
                    });
                    if (res.ok) {
                      await refreshState();
                      showToast('Emergency Process Trip triggered and dispatched to alarm forwarders!', 'error');
                    }
                  } catch (e) {
                    showToast(`Trip trigger error: ${e.message}`, 'error');
                  }
                }}
              >
                <AlertOctagon size={13} />
                <span>Simulate Emergency Trip</span>
              </button>
            </div>
          </div>

          <div className="dm-table-scroll-container">
            <table className="dm-data-table">
              <thead>
                <tr>
                  <th>Priority &amp; Severity</th>
                  <th>Alarm Name</th>
                  <th>State</th>
                  <th>Process Signal / Tag</th>
                  <th>Site &amp; Area</th>
                  <th>Current Value</th>
                  <th>Threshold</th>
                  <th>Class</th>
                  <th>Occurred At</th>
                  <th style={{ textAlign: 'right', width: '260px' }}>Actions &amp; Forwarding</th>
                </tr>
              </thead>
              <tbody>
                {filteredActiveAlarms.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                      <CheckCircle2 size={28} style={{ margin: '0 auto 8px', color: '#10b981' }} />
                      <div style={{ fontWeight: 600, color: '#f8fafc' }}>All Systems Normal — Zero Active Alarms</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                        No active or unacknowledged process alarms. All variables operating within designated safety limits.
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredActiveAlarms.map(a => {
                  const sStyle = getSeverityStyle(a.severity, a.priority);
                  const isUnack = a.state.includes('Unacknowledged');
                  const isTesting = testingAlarmId === a.id;
                  const rowSeverityClass = (a.priority === 'Urgent' || a.severity >= 751) 
                    ? 'dm-alarm-row-urgent' 
                    : (a.priority === 'High' || a.severity >= 501)
                    ? 'dm-alarm-row-high'
                    : (a.priority === 'Medium' || a.severity >= 251)
                    ? 'dm-alarm-row-medium'
                    : 'dm-alarm-row-low';

                  return (
                    <tr key={a.id} className={`dm-table-row ${rowSeverityClass}`}>
                      <td>
                        <span 
                          className="dm-alarm-badge"
                          style={{ background: sStyle.bg, color: sStyle.color, border: `1px solid ${sStyle.border}` }}
                        >
                          {a.priority} ({a.severity})
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: '#f8fafc' }}>
                        {a.alarm_name}
                      </td>
                      <td>
                        <span className={`dm-alarm-state-pill ${a.state.toLowerCase().replace(/[\s-]+/g, '_')}`}>
                          {a.state}
                        </span>
                      </td>
                      <td className="mono" style={{ color: '#38bdf8' }}>{a.tag_name}</td>
                      <td style={{ fontSize: '0.74rem' }}>
                        <span style={{ color: '#94a3b8' }}>{a.site_name || a.source_asset || 'Site 1'}</span> <span style={{ color: '#64748b' }}>/</span> <span style={{ color: '#38bdf8' }}>{a.area || 'Area 1'}</span>
                      </td>
                      <td className="mono font-bold" style={{ color: sStyle.color }}>{a.current_value}</td>
                      <td className="mono">{a.threshold_limit}</td>
                      <td>
                        <span className="dm-tree-badge">{a.class_type}</span>
                      </td>
                      <td className="dm-timestamp-cell">{a.occurred_at?.substring(0, 19).replace('T', ' ')}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', justifyContent: 'flex-end' }}>
                          <button
                            className="dm-btn dm-btn-secondary"
                            style={{ fontSize: '0.68rem', padding: '3px 7px', color: '#c084fc', borderColor: 'rgba(192, 132, 252, 0.4)' }}
                            onClick={() => setSelectedAlarmDetail(a)}
                            title="Inspect complete ThingsBoard alarm properties & timeline"
                          >
                            <Eye size={11} /> Details
                          </button>

                          <button
                            className="dm-btn dm-btn-secondary"
                            style={{ fontSize: '0.68rem', padding: '3px 7px', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)' }}
                            onClick={() => {
                              setEditingAlarmId(a.id);
                              setEditAlarmForm({
                                alarm_name: a.alarm_name || '',
                                site_name: a.site_name || '',
                                area: a.area || '',
                                message: a.message || '',
                                severity: a.severity || 650,
                                priority: a.priority || 'High',
                                state: a.state || 'In Alarm Unacknowledged',
                                threshold_limit: a.threshold_limit !== undefined ? a.threshold_limit : (a.threshold || 100),
                                current_value: a.current_value,
                                scan_rate_seconds: a.scan_rate_seconds || 1,
                                class_type: a.class_type || 'Process Safety',
                                notification_action_id: a.notification_action_id || ''
                              });
                              setIsEditAlarmModalOpen(true);
                            }}
                            title="Edit all alarm properties (threshold, name, priority, site, area, scan rate)"
                          >
                            <Edit3 size={11} /> Edit
                          </button>

                          {isUnack ? (
                            <button 
                              className="dm-btn dm-btn-primary" 
                              style={{ fontSize: '0.68rem', padding: '3px 7px' }}
                              onClick={() => acknowledgeAlarm(a.id)}
                              title="Acknowledge alarm (operator awareness)"
                            >
                              <Check size={11} /> Ack
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.68rem', color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '2px', marginRight: '4px' }}>
                              <CheckCircle2 size={11} /> Ack'd
                            </span>
                          )}

                          <button 
                            className="dm-btn dm-btn-secondary" 
                            style={{ fontSize: '0.68rem', padding: '3px 7px', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)' }}
                            disabled={isTesting}
                            onClick={async () => {
                              setTestingAlarmId(a.id);
                              await testForwardAlarm(a.id);
                              setTestingAlarmId(null);
                            }}
                            title="Test forward alarm event to Node-RED / n8n / Webhook channels"
                          >
                            {isTesting ? <Activity size={11} className="spin" /> : <Share2 size={11} />}
                            <span>Forward</span>
                          </button>

                          <button 
                            className="dm-btn dm-btn-secondary" 
                            style={{ fontSize: '0.68rem', padding: '3px 7px', color: '#fb923c', borderColor: 'rgba(251, 146, 60, 0.4)' }}
                            onClick={async () => {
                              try {
                                const res = await fetch(`/api/v1/dm/alarms/${a.id}/notify`, { method: 'POST' });
                                const data = await res.json();
                                showToast(`Notification dispatched for ${a.alarm_name}`, 'success');
                              } catch (e) {
                                showToast(`Notification error: ${e.message}`, 'error');
                              }
                            }}
                            title="Dispatch notification to configured email / messaging / webhook channels"
                          >
                            <Send size={11} />
                            <span>Notify</span>
                          </button>

                          <button 
                            className="dm-btn dm-btn-secondary" 
                            style={{ fontSize: '0.68rem', padding: '3px 7px', color: '#f43f5e', borderColor: 'rgba(244, 63, 94, 0.4)' }}
                            onClick={() => {
                              if (window.confirm(`Delete alarm '${a.alarm_name}'?`)) {
                                deleteAlarm(a.id);
                              }
                            }}
                            title="Delete this alarm record"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          10.1B RETURN TO NORMAL (RTN) ALARMS (Requirement 1 & 2)
         ======================================================== */}
      {subTab === 'normal' && (
        <div className="dm-tab-content-card">
          <div className="dm-alarm-toolbar">
            <div className="dm-panel-subhead">
              Returned to Normal (RTN) Process Alarms ({normalAlarms.length})
            </div>
            <div className="dm-alarm-actions">
              <span style={{ fontSize: '0.74rem', color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <CheckCircle2 size={13} />
                <span>Operating within normal safety bounds</span>
              </span>
            </div>
          </div>

          <div className="dm-table-scroll-container">
            <table className="dm-data-table">
              <thead>
                <tr>
                  <th>Priority &amp; Severity</th>
                  <th>Alarm Name</th>
                  <th>State</th>
                  <th>Process Signal / Tag</th>
                  <th>Site &amp; Area</th>
                  <th>Current Reading</th>
                  <th>Trip Limit</th>
                  <th>Normalized At (RTN)</th>
                  <th>Occurred At</th>
                  <th style={{ textAlign: 'right', width: '220px' }}>Actions &amp; Forwarding</th>
                </tr>
              </thead>
              <tbody>
                {filteredNormalAlarms.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                      <Activity size={28} style={{ margin: '0 auto 8px', color: '#38bdf8' }} />
                      <div style={{ fontWeight: 600, color: '#f8fafc' }}>No Normal / RTN Alarms</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                        Alarms that have recovered back to safe operating limits and returned to normal will be cataloged here.
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredNormalAlarms.map(a => {
                    const isTesting = testingAlarmId === a.id;
                    return (
                      <tr key={a.id} className="dm-table-row">
                        <td>
                          <span 
                            className="dm-alarm-badge"
                            style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}
                          >
                            {a.priority} ({a.severity})
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, color: '#f8fafc' }}>
                          {a.alarm_name}
                        </td>
                        <td>
                          <span className="dm-alarm-state-pill normal">
                            Normal (RTN)
                          </span>
                        </td>
                        <td className="mono" style={{ color: '#38bdf8' }}>{a.tag_name}</td>
                        <td style={{ fontSize: '0.74rem' }}>
                          <span style={{ color: '#94a3b8' }}>{a.site_name || a.source_asset || 'Site 1'}</span> <span style={{ color: '#64748b' }}>/</span> <span style={{ color: '#38bdf8' }}>{a.area || 'Area 1'}</span>
                        </td>
                        <td className="mono font-bold" style={{ color: '#10b981' }}>{a.current_value}</td>
                        <td className="mono">{a.threshold_limit}</td>
                        <td className="dm-timestamp-cell" style={{ color: '#10b981' }}>
                          {(a.cleared_at || a.updated_at || a.occurred_at)?.substring(0, 19).replace('T', ' ')}
                        </td>
                        <td className="dm-timestamp-cell">{a.occurred_at?.substring(0, 19).replace('T', ' ')}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', justifyContent: 'flex-end' }}>
                            <button
                              className="dm-btn dm-btn-secondary"
                              style={{ fontSize: '0.68rem', padding: '3px 7px', color: '#c084fc', borderColor: 'rgba(192, 132, 252, 0.4)' }}
                              onClick={() => setSelectedAlarmDetail(a)}
                              title="Inspect complete alarm properties & timeline"
                            >
                              <Eye size={11} /> Details
                            </button>

                            <button 
                              className="dm-btn dm-btn-secondary" 
                              style={{ fontSize: '0.68rem', padding: '3px 7px', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)' }}
                              disabled={isTesting}
                              onClick={async () => {
                                setTestingAlarmId(a.id);
                                await testForwardAlarm(a.id);
                                setTestingAlarmId(null);
                              }}
                              title="Test forward RTN event to Node-RED / n8n / Webhook channels"
                            >
                              {isTesting ? <Activity size={11} className="spin" /> : <Share2 size={11} />}
                              <span>Forward</span>
                            </button>

                            <button 
                              className="dm-btn dm-btn-secondary" 
                              style={{ fontSize: '0.68rem', padding: '3px 7px', color: '#f43f5e', borderColor: 'rgba(244, 63, 94, 0.4)' }}
                              onClick={() => {
                                if (window.confirm(`Delete normal alarm '${a.alarm_name}'?`)) {
                                  deleteAlarm(a.id);
                                }
                              }}
                              title="Delete this alarm record"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          10.2 ALARM HISTORY & FIGURE 5 TRAIL
         ======================================================== */}
      {subTab === 'history' && (
        <div className="dm-tab-content-card">
          <div className="dm-panel-subhead" style={{ marginBottom: '10px' }}>
            Historical Process Alarms (Returned to Normal State)
          </div>

          <div className="dm-table-scroll-container">
            <table className="dm-data-table">
              <thead>
                <tr>
                  <th>Alarm Identifier</th>
                  <th>Source Signal</th>
                  <th>Asset Element</th>
                  <th>Severity</th>
                  <th>Resolved At</th>
                  <th style={{ textAlign: 'right', width: '160px' }}>History Trail</th>
                </tr>
              </thead>
              <tbody>
                {alarmHistories.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                      <Clock size={28} style={{ margin: '0 auto 8px', color: '#475569' }} />
                      <div style={{ fontWeight: 600, color: '#f8fafc' }}>No Historical Alarm Events</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                        Past cleared and resolved alarms will be cataloged here with full audit trail history.
                      </div>
                    </td>
                  </tr>
                ) : (
                  alarmHistories.map(h => (
                  <tr key={h.id} className="dm-table-row">
                    <td style={{ fontWeight: 600, color: '#f8fafc' }}>{h.alarm_name}</td>
                    <td className="mono" style={{ color: '#38bdf8' }}>{h.source_signal}</td>
                    <td style={{ color: '#94a3b8' }}>{h.asset_name}</td>
                    <td>
                      <span className="dm-alarm-badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid #ef4444' }}>
                        {h.priority} ({h.severity})
                      </span>
                    </td>
                    <td className="dm-timestamp-cell">{h.cleared_at?.substring(0, 19).replace('T', ' ')}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="dm-btn dm-btn-secondary"
                        style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                        onClick={() => setActiveHistoryTrail(h)}
                      >
                        <Eye size={12} /> View History Trail (Fig 5)
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
          10.3 ALARM RULE (Table 28)
         ======================================================== */}
      {subTab === 'rules' && (
        <div className="dm-tab-content-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span className="dm-panel-subhead">Configured Process Alarm Trip Rules</span>
            <button className="dm-btn dm-btn-primary" onClick={() => setIsRuleModalOpen(true)}>
              <Plus size={14} /> <span>New Alarm Rule</span>
            </button>
          </div>

          <div className="dm-table-scroll-container">
            <table className="dm-data-table">
              <thead>
                <tr>
                  <th>Rule Name</th>
                  <th>Alarm Type</th>
                  <th>Class</th>
                  <th>Source Asset</th>
                  <th>Site &amp; Area</th>
                  <th>Monitored Signal</th>
                  <th>Scan Rate</th>
                  <th>Delays (On / Off)</th>
                  <th>Trip Limits</th>
                  <th style={{ textAlign: 'right', width: '80px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {alarmRules.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                      <AlertTriangle size={28} style={{ margin: '0 auto 8px', color: '#475569' }} />
                      <div style={{ fontWeight: 600, color: '#f8fafc' }}>No Alarm Trip Rules Configured</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                        Click "New Alarm Rule" to configure High/Low process thresholds, trip delays, and alarm severity classes.
                      </div>
                      <button className="dm-btn dm-btn-primary" style={{ margin: '12px auto 0' }} onClick={() => setIsRuleModalOpen(true)}>
                        <Plus size={13} /> <span>New Alarm Rule</span>
                      </button>
                    </td>
                  </tr>
                ) : (
                  alarmRules.map(r => (
                  <tr key={r.id} className="dm-table-row">
                    <td style={{ fontWeight: 600, color: '#f8fafc' }}>{r.name}</td>
                    <td>
                      <span className="dm-tree-badge">{r.alarm_type}</span>
                    </td>
                    <td>
                      <span className="dm-content-type-tag">{r.class_type}</span>
                    </td>
                    <td style={{ color: '#94a3b8' }}>{r.source}</td>
                    <td style={{ fontSize: '0.74rem' }}>
                      <span style={{ color: '#94a3b8' }}>{r.site_name || 'Site 1'}</span> <span style={{ color: '#64748b' }}>/</span> <span style={{ color: '#38bdf8' }}>{r.area || 'Area 1'}</span>
                    </td>
                    <td className="mono" style={{ color: '#38bdf8' }}>{r.signal}</td>
                    <td className="mono" style={{ color: '#10b981' }}>{r.time_interval_seconds || r.scan_rate_seconds || 1}s</td>
                    <td className="mono">{r.on_delay_seconds}s / {r.off_delay_seconds}s</td>
                    <td className="mono" style={{ color: '#ef4444' }}>
                      {r.high_high_threshold ? `HH: ${r.high_high_threshold}` : ''} {r.high_threshold ? `| H: ${r.high_threshold}` : ''}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                        <button 
                          className="dm-row-action-btn"
                          style={{ color: '#38bdf8' }}
                          onClick={() => {
                            setEditingRuleId(r.id);
                            const hasAnyFlag = ('enable_high_high' in r) || ('enable_high' in r) || ('enable_low' in r) || ('enable_low_low' in r);
                            setRuleForm({
                              ...r,
                              enable_high_high: hasAnyFlag ? Boolean(r.enable_high_high) : Boolean(r.high_high_threshold !== undefined && r.high_high_threshold !== null && r.high_high_threshold !== ''),
                              enable_high: hasAnyFlag ? Boolean(r.enable_high) : Boolean(r.high_threshold !== undefined && r.high_threshold !== null && r.high_threshold !== ''),
                              enable_low: hasAnyFlag ? Boolean(r.enable_low) : Boolean(r.low_threshold !== undefined && r.low_threshold !== null && r.low_threshold !== ''),
                              enable_low_low: hasAnyFlag ? Boolean(r.enable_low_low) : Boolean(r.low_low_threshold !== undefined && r.low_low_threshold !== null && r.low_low_threshold !== ''),
                              scan_rate_seconds: r.scan_rate_seconds || r.time_interval_seconds || 1
                            });
                            setIsRuleModalOpen(true);
                          }}
                          title="Edit Alarm Rule"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button 
                          className="dm-row-action-btn delete"
                          onClick={() => deleteAlarmRule(r.id)}
                          title="Delete Rule"
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
      )}

      {/* ========================================================
          10.4 ALARM NOTIFICATIONS / ACTIONS (Table 29)
         ======================================================== */}
      {subTab === 'actions' && (
        <div className="dm-tab-content-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span className="dm-panel-subhead">Alarm Action & Notification Channels (Table 29)</span>
            <button className="dm-btn dm-btn-primary" onClick={() => setIsActionModalOpen(true)}>
              <Plus size={14} /> <span>New Notification Action</span>
            </button>
          </div>

          <div className="dm-table-scroll-container">
            <table className="dm-data-table">
              <thead>
                <tr>
                  <th>Action Name</th>
                  <th>Channel Type</th>
                  <th>To Recipient / Contact</th>
                  <th>Ack Link</th>
                  <th>AHI Header/Footer</th>
                  <th>Message Template Content</th>
                  <th style={{ textAlign: 'right', width: '130px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {alarmActions.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                      <Send size={28} style={{ margin: '0 auto 8px', color: '#475569' }} />
                      <div style={{ fontWeight: 600, color: '#f8fafc' }}>No Alarm Notification Actions Configured</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                        Click "New Notification Action" to dispatch alarms to email, WhatsApp, Webhook, or Node-RED.
                      </div>
                      <button className="dm-btn dm-btn-primary" style={{ margin: '12px auto 0' }} onClick={() => setIsActionModalOpen(true)}>
                        <Plus size={13} /> <span>New Notification Action</span>
                      </button>
                    </td>
                  </tr>
                ) : (
                  alarmActions.map(act => (
                  <tr key={act.id} className="dm-table-row">
                    <td style={{ fontWeight: 600, color: '#f8fafc' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {act.type === 'Email' && <Mail size={14} color="#38bdf8" />}
                        {act.type === 'WhatsApp' && <MessageSquare size={14} color="#10b981" />}
                        {act.type === 'Webhook' && <Send size={14} color="#f59e0b" />}
                        {act.type === 'Node-RED Flow' && <Share2 size={14} color="#ef4444" />}
                        {act.type === 'n8n Webhook' && <Wifi size={14} color="#a855f7" />}
                        <span>{act.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className="dm-tree-badge">{act.type}</span>
                    </td>
                    <td className="mono" style={{ color: '#38bdf8' }}>{act.to_contact}</td>
                    <td>
                      <span className={`dm-quality-pill ${act.attach_acknowledge_link ? 'good' : 'bad'}`}>
                        {act.attach_acknowledge_link ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td>
                      <span className={`dm-quality-pill ${act.add_ahi_header_footer ? 'good' : 'bad'}`}>
                        {act.add_ahi_header_footer ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.74rem', color: '#94a3b8', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {act.content}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', justifyContent: 'flex-end' }}>
                        <button 
                          className="dm-btn dm-btn-secondary"
                          style={{ fontSize: '0.68rem', padding: '3px 7px', color: '#38bdf8' }}
                          title="Test trigger alarm forwarding to this notification channel"
                          onClick={async () => {
                            try {
                              showToast(`Testing dispatch to ${act.to_contact}...`, 'info');
                              const res = await fetch('/api/v1/dm/event-forwardings/test-direct', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  destination_url: act.to_contact.startsWith('http') ? act.to_contact : 'http://localhost:1880/alarms',
                                  payload: {
                                    event: "ALARM_TRIGGERED_TEST",
                                    action_name: act.name,
                                    channel_type: act.type,
                                    recipient: act.to_contact,
                                    timestamp: new Date().toISOString(),
                                    message: act.content
                                  }
                                })
                              });
                              const data = await res.json();
                              if (data.status === 'success') {
                                showToast(`Alarm test dispatched: HTTP ${data.status_code || 200}`, 'success');
                              } else {
                                showToast(`Alarm test result: ${data.message || data.status}`, 'warning');
                              }
                            } catch (e) {
                              showToast(`Channel test error: ${e.message}`, 'error');
                            }
                          }}
                        >
                          <Send size={10} /> Test
                        </button>
                        <button 
                          className="dm-row-action-btn"
                          style={{ color: '#38bdf8' }}
                          onClick={() => {
                            setEditingActionId(act.id);
                            setActionForm({
                              name: act.name || '',
                              type: act.type || 'Email',
                              subject: act.subject || '[ALARM TRIP] Emergency Notification',
                              to_contact: act.to_contact || '',
                              attach_acknowledge_link: !!act.attach_acknowledge_link,
                              add_ahi_header_footer: !!act.add_ahi_header_footer,
                              content: act.content || ''
                            });
                            setIsActionModalOpen(true);
                          }}
                          title="Edit Notification Action Template"
                        >
                          <Edit3 size={12} />
                        </button>
                        <button 
                          className="dm-row-action-btn delete"
                          onClick={() => deleteAlarmAction(act.id)}
                          title="Delete Action"
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
      )}

      {/* FIGURE 5 ALARM HISTORY TRAIL MODAL (Page 46 of manual) */}
      {activeHistoryTrail && (
        <div className="modal-backdrop" style={{ zIndex: 1400 }}>
          <div className="dm-modal-box" style={{ width: '640px' }}>
            <div className="dm-modal-header">
              <h3>Alarm History Trail &mdash; {activeHistoryTrail.alarm_name}</h3>
              <button onClick={() => setActiveHistoryTrail(null)} className="dm-close-btn">&times;</button>
            </div>
            <div className="dm-modal-body">
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '16px' }}>
                Source-Signal: <strong style={{ color: '#38bdf8' }}>{activeHistoryTrail.source_signal}</strong> | Asset: <strong>{activeHistoryTrail.asset_name}</strong>
              </div>

              {/* FIGURE 5 INTERACTIVE VISUAL TIMELINE */}
              <div className="dm-figure-5-trail-container">
                <div className="dm-trail-center-line" />

                {(activeHistoryTrail.trail || []).map((step, idx) => (
                  <div key={idx} className={`dm-trail-node-row ${step.step % 2 === 0 ? 'left' : 'right'}`}>
                    <div className="dm-trail-card" style={{ borderColor: step.status_color }}>
                      <div className="dm-trail-state" style={{ color: step.status_color }}>
                        {step.state}
                      </div>
                      <div className="dm-trail-val">
                        Signal value: <strong>{step.signal_value}</strong>
                      </div>
                      <div className="dm-trail-time">
                        {step.timestamp}
                      </div>
                      <div className="dm-trail-actor">
                        {step.actor}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="dm-modal-footer">
              <button className="dm-btn dm-btn-primary" onClick={() => setActiveHistoryTrail(null)}>Close Trail</button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT ALARM RULE MODAL (Table 28) */}
      {isRuleModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1400 }}>
          <div className="dm-modal-box" style={{ width: '680px' }}>
            <div className="dm-modal-header">
              <h3>{editingRuleId ? 'Edit Process Alarm Trip Rule' : 'Configure Alarm Rule (Table 28)'}</h3>
              <button onClick={() => { setIsRuleModalOpen(false); setEditingRuleId(null); }} className="dm-close-btn">&times;</button>
            </div>
            <div className="dm-modal-body">
              <div className="dm-form-grid-2">
                <div className="dm-form-group">
                  <label className="dm-field-label">Alarm Rule Name</label>
                  <input 
                    type="text"
                    className="dm-input"
                    placeholder="e.g. Fractionator High Pressure Trip"
                    value={ruleForm.name}
                    onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                  />
                </div>
                <div className="dm-form-group">
                  <label className="dm-field-label">Alarm Type</label>
                  <select 
                    className="dm-select"
                    value={ruleForm.alarm_type}
                    onChange={(e) => setRuleForm({ ...ruleForm, alarm_type: e.target.value })}
                  >
                    <option value="Analog">Absolute (Analog Alarm)</option>
                    <option value="Digital">Absolute (Digital State =0 / &lt;&gt;0)</option>
                    <option value="Deviation">Deviation Alarm (Target vs Signal)</option>
                  </select>
                </div>
              </div>

              <div className="dm-form-grid-2">
                <div className="dm-form-group">
                  <label className="dm-field-label">Alarm Class (Section 10.3)</label>
                  <select 
                    className="dm-select"
                    value={ruleForm.class_type}
                    onChange={(e) => setRuleForm({ ...ruleForm, class_type: e.target.value })}
                  >
                    <option value="Alert">Alert</option>
                    <option value="Communication">Communication</option>
                    <option value="Event">Event</option>
                    <option value="Fire Gas">Fire Gas</option>
                    <option value="Information">Information</option>
                    <option value="Process">Process</option>
                    <option value="Safety">Safety</option>
                    <option value="System">System</option>
                  </select>
                </div>
                <div className="dm-form-group">
                  <label className="dm-field-label">Source Asset</label>
                  <select 
                    className="dm-select"
                    value={ruleForm.source}
                    onChange={(e) => {
                      const selectedAssetName = e.target.value;
                      const matchedAsset = assets.find(a => a.name === selectedAssetName || a.id === selectedAssetName);
                      const firstAttr = matchedAsset?.attributes?.[0];
                      const curVal = firstAttr ? (parseFloat(firstAttr.value) || 0) : 0;
                      const suggestedHH = Math.round((curVal !== 0 ? curVal * 1.5 : 300) * 100) / 100;
                      const suggestedH = Math.round((curVal !== 0 ? curVal * 1.2 : 250) * 100) / 100;
                      const suggestedL = Math.round((curVal !== 0 ? curVal * 0.8 : 40) * 100) / 100;
                      const suggestedLL = Math.round((curVal !== 0 ? curVal * 0.5 : 15) * 100) / 100;

                      setRuleForm(prev => ({
                        ...prev,
                        source: selectedAssetName,
                        asset_id: matchedAsset?.id || '',
                        site_name: prev.site_name || matchedAsset?.site || 'Site 1',
                        area: prev.area || matchedAsset?.area || 'Area 1',
                        signal: firstAttr?.name || '',
                        attribute_name: firstAttr?.name || '',
                        tag_name: firstAttr?.tag_name || (matchedAsset && firstAttr ? `${matchedAsset.name}.${firstAttr.name}` : ''),
                        uom: firstAttr?.uom || '',
                        current_value: curVal,
                        high_high_threshold: suggestedHH,
                        high_threshold: suggestedH,
                        low_threshold: suggestedL,
                        low_low_threshold: suggestedLL,
                        name: prev.name ? prev.name : (matchedAsset && firstAttr ? `${matchedAsset.name} ${firstAttr.name} Trip Rule` : prev.name)
                      }));
                    }}
                  >
                    <option value="">-- Select Source Asset --</option>
                    {assets.map(a => (
                      <option key={a.id} value={a.name}>{a.name} ({a.category || a.type || 'Asset'})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Site Name and Plant Area Inputs (Table 28) */}
              <div className="dm-form-grid-2">
                <div className="dm-form-group">
                  <label className="dm-field-label">Site Name</label>
                  <input 
                    type="text"
                    className="dm-input"
                    placeholder="e.g. Site 1 / Refinery / Plant Alpha"
                    value={ruleForm.site_name || ''}
                    onChange={(e) => setRuleForm({ ...ruleForm, site_name: e.target.value })}
                  />
                </div>
                <div className="dm-form-group">
                  <label className="dm-field-label">Plant Area / Unit</label>
                  <input 
                    type="text"
                    className="dm-input"
                    placeholder="e.g. Area 1 / Tank Farm / Unit 4"
                    value={ruleForm.area || ''}
                    onChange={(e) => setRuleForm({ ...ruleForm, area: e.target.value })}
                  />
                </div>
              </div>

              {/* DYNAMIC ATTRIBUTE MAPPING & SCAN RATE */}
              <div className="dm-form-grid-2">
                <div className="dm-form-group">
                  <label className="dm-field-label">Asset Attribute (Monitored Signal)</label>
                  {(() => {
                    const selAsset = assets.find(a => a.name === ruleForm.source || a.id === ruleForm.source);
                    const attrs = selAsset?.attributes || [];
                    if (attrs.length === 0) {
                      return (
                        <input 
                          type="text"
                          className="dm-input"
                          placeholder="e.g. Column Top Pressure"
                          value={ruleForm.signal}
                          onChange={(e) => setRuleForm({ ...ruleForm, signal: e.target.value, attribute_name: e.target.value })}
                        />
                      );
                    }
                    return (
                      <select 
                        className="dm-select"
                        value={ruleForm.signal}
                        onChange={(e) => {
                          const attrName = e.target.value;
                          const attr = attrs.find(at => at.name === attrName);
                          if (attr) {
                            const curVal = typeof attr.value === 'number' ? attr.value : (parseFloat(attr.value) || 0);
                            const suggestedHH = Math.round((curVal !== 0 ? curVal * 1.5 : 300) * 100) / 100;
                            const suggestedH = Math.round((curVal !== 0 ? curVal * 1.2 : 250) * 100) / 100;
                            const suggestedL = Math.round((curVal !== 0 ? curVal * 0.8 : 40) * 100) / 100;
                            const suggestedLL = Math.round((curVal !== 0 ? curVal * 0.5 : 15) * 100) / 100;

                            setRuleForm(prev => ({
                              ...prev,
                              signal: attr.name,
                              attribute_name: attr.name,
                              tag_name: attr.tag_name || `${prev.source}.${attr.name}`,
                              uom: attr.uom || '',
                              current_value: curVal,
                              high_high_threshold: suggestedHH,
                              high_threshold: suggestedH,
                              low_threshold: suggestedL,
                              low_low_threshold: suggestedLL,
                              name: `${prev.source} ${attr.name} Trip Rule`
                            }));
                          }
                        }}
                      >
                        <option value="">-- Select Asset Attribute --</option>
                        {attrs.map(at => (
                          <option key={at.id || at.name} value={at.name}>
                            {at.name} ({at.type || 'Dynamic'} | Live: {at.value !== undefined ? at.value : '--'} {at.uom || ''})
                          </option>
                        ))}
                      </select>
                    );
                  })()}
                </div>

                <div className="dm-form-group">
                  <label className="dm-field-label">Scan Rate (Secs)</label>
                  <input 
                    type="number"
                    min="0.1"
                    step="0.5"
                    className="dm-input mono"
                    placeholder="e.g. 1"
                    value={ruleForm.scan_rate_seconds || 1}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setRuleForm({ ...ruleForm, scan_rate_seconds: val, time_interval_seconds: val });
                    }}
                  />
                </div>
              </div>

              {/* LIVE SIGNAL PREVIEW BADGE */}
              {ruleForm.source && (
                <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', padding: '6px 12px', borderRadius: '6px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem' }}>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Mapped Tag: </span>
                    <code style={{ color: '#38bdf8', fontWeight: 600 }}>{ruleForm.tag_name || `${ruleForm.source}.${ruleForm.signal}`}</code>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Live Reading: </span>
                    <strong style={{ color: '#10b981' }}>{ruleForm.current_value !== '' ? ruleForm.current_value : '--'} {ruleForm.uom}</strong>
                    <span style={{ color: '#94a3b8', marginLeft: '12px' }}>Scan Rate: </span>
                    <strong style={{ color: '#38bdf8' }}>{ruleForm.scan_rate_seconds || 1}s</strong>
                  </div>
                </div>
              )}

              <div className="dm-form-grid-2">
                <div className="dm-form-group">
                  <label className="dm-field-label">On Delay (Secs)</label>
                  <input 
                    type="number"
                    className="dm-input"
                    value={ruleForm.on_delay_seconds}
                    onChange={(e) => setRuleForm({ ...ruleForm, on_delay_seconds: Number(e.target.value) })}
                  />
                </div>
                <div className="dm-form-group">
                  <label className="dm-field-label">Off Delay (Secs)</label>
                  <input 
                    type="number"
                    className="dm-input"
                    value={ruleForm.off_delay_seconds}
                    onChange={(e) => setRuleForm({ ...ruleForm, off_delay_seconds: Number(e.target.value) })}
                  />
                </div>
              </div>

              {ruleForm.alarm_type === 'Analog' && (
                <div className="dm-broker-specific-box" style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontSize: '0.74rem', fontWeight: 600, color: '#38bdf8' }}>
                      ISA-18.2 Alert Thresholds &amp; Custom Messages (Select alerts using checkboxes)
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                      Only checked alerts will be evaluated and triggered
                    </div>
                  </div>

                  {/* HIGH-HIGH (HH) ALERT CARD */}
                  <div style={{ border: ruleForm.enable_high_high ? '1px solid #9333ea' : '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '10px', marginBottom: '8px', background: ruleForm.enable_high_high ? 'rgba(147, 51, 234, 0.08)' : 'rgba(255,255,255,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label className="dm-checkbox-inline" style={{ fontWeight: 600, color: '#c084fc', margin: 0 }}>
                        <input 
                          type="checkbox"
                          checked={ruleForm.enable_high_high}
                          onChange={(e) => setRuleForm({ ...ruleForm, enable_high_high: e.target.checked })}
                        />
                        <span>High-High (Urgent Emergency Trip &gt;=)</span>
                      </label>
                      <span className="dm-alarm-badge" style={{ background: 'rgba(147, 51, 234, 0.2)', color: '#c084fc', border: '1px solid #9333ea', fontSize: '0.65rem', padding: '1px 6px' }}>
                        Urgent (850)
                      </span>
                    </div>
                    {ruleForm.enable_high_high && (
                      <div className="dm-form-grid-2" style={{ marginTop: '6px' }}>
                        <div className="dm-form-group">
                          <label className="dm-field-label">High-High Threshold Limit ({ruleForm.uom || 'EU'})</label>
                          <input 
                            type="number"
                            step="any"
                            className="dm-input mono"
                            value={ruleForm.high_high_threshold}
                            onChange={(e) => setRuleForm({ ...ruleForm, high_high_threshold: Number(e.target.value) })}
                          />
                        </div>
                        <div className="dm-form-group">
                          <label className="dm-field-label">Custom Message on High-High Trip</label>
                          <input 
                            type="text"
                            className="dm-input"
                            placeholder="e.g. Critical high pressure trip!"
                            value={ruleForm.high_high_message}
                            onChange={(e) => setRuleForm({ ...ruleForm, high_high_message: e.target.value })}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* HIGH (H) ALERT CARD */}
                  <div style={{ border: ruleForm.enable_high ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '10px', marginBottom: '8px', background: ruleForm.enable_high ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255,255,255,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label className="dm-checkbox-inline" style={{ fontWeight: 600, color: '#f87171', margin: 0 }}>
                        <input 
                          type="checkbox"
                          checked={ruleForm.enable_high}
                          onChange={(e) => setRuleForm({ ...ruleForm, enable_high: e.target.checked })}
                        />
                        <span>High (Warning Alert &gt;=)</span>
                      </label>
                      <span className="dm-alarm-badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid #ef4444', fontSize: '0.65rem', padding: '1px 6px' }}>
                        High (650)
                      </span>
                    </div>
                    {ruleForm.enable_high && (
                      <div className="dm-form-grid-2" style={{ marginTop: '6px' }}>
                        <div className="dm-form-group">
                          <label className="dm-field-label">High Threshold Limit ({ruleForm.uom || 'EU'})</label>
                          <input 
                            type="number"
                            step="any"
                            className="dm-input mono"
                            value={ruleForm.high_threshold}
                            onChange={(e) => setRuleForm({ ...ruleForm, high_threshold: Number(e.target.value) })}
                          />
                        </div>
                        <div className="dm-form-group">
                          <label className="dm-field-label">Custom Message on High Alert</label>
                          <input 
                            type="text"
                            className="dm-input"
                            placeholder="e.g. High process limit warning"
                            value={ruleForm.high_message}
                            onChange={(e) => setRuleForm({ ...ruleForm, high_message: e.target.value })}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* LOW (L) ALERT CARD */}
                  <div style={{ border: ruleForm.enable_low ? '1px solid #f97316' : '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '10px', marginBottom: '8px', background: ruleForm.enable_low ? 'rgba(249, 115, 22, 0.08)' : 'rgba(255,255,255,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label className="dm-checkbox-inline" style={{ fontWeight: 600, color: '#fb923c', margin: 0 }}>
                        <input 
                          type="checkbox"
                          checked={ruleForm.enable_low}
                          onChange={(e) => setRuleForm({ ...ruleForm, enable_low: e.target.checked })}
                        />
                        <span>Low (Warning Alert &lt;=)</span>
                      </label>
                      <span className="dm-alarm-badge" style={{ background: 'rgba(249, 115, 22, 0.2)', color: '#fb923c', border: '1px solid #f97316', fontSize: '0.65rem', padding: '1px 6px' }}>
                        Medium (350)
                      </span>
                    </div>
                    {ruleForm.enable_low && (
                      <div className="dm-form-grid-2" style={{ marginTop: '6px' }}>
                        <div className="dm-form-group">
                          <label className="dm-field-label">Low Threshold Limit ({ruleForm.uom || 'EU'})</label>
                          <input 
                            type="number"
                            step="any"
                            className="dm-input mono"
                            value={ruleForm.low_threshold}
                            onChange={(e) => setRuleForm({ ...ruleForm, low_threshold: Number(e.target.value) })}
                          />
                        </div>
                        <div className="dm-form-group">
                          <label className="dm-field-label">Custom Message on Low Alert</label>
                          <input 
                            type="text"
                            className="dm-input"
                            placeholder="e.g. Low process warning"
                            value={ruleForm.low_message}
                            onChange={(e) => setRuleForm({ ...ruleForm, low_message: e.target.value })}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* LOW-LOW (LL) ALERT CARD */}
                  <div style={{ border: ruleForm.enable_low_low ? '1px solid #eab308' : '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '10px', marginBottom: '8px', background: ruleForm.enable_low_low ? 'rgba(234, 179, 8, 0.08)' : 'rgba(255,255,255,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label className="dm-checkbox-inline" style={{ fontWeight: 600, color: '#fde047', margin: 0 }}>
                        <input 
                          type="checkbox"
                          checked={ruleForm.enable_low_low}
                          onChange={(e) => setRuleForm({ ...ruleForm, enable_low_low: e.target.checked })}
                        />
                        <span>Low-Low (Emergency Trip &lt;=)</span>
                      </label>
                      <span className="dm-alarm-badge" style={{ background: 'rgba(234, 179, 8, 0.2)', color: '#fde047', border: '1px solid #eab308', fontSize: '0.65rem', padding: '1px 6px' }}>
                        Urgent (800)
                      </span>
                    </div>
                    {ruleForm.enable_low_low && (
                      <div className="dm-form-grid-2" style={{ marginTop: '6px' }}>
                        <div className="dm-form-group">
                          <label className="dm-field-label">Low-Low Threshold Limit ({ruleForm.uom || 'EU'})</label>
                          <input 
                            type="number"
                            step="any"
                            className="dm-input mono"
                            value={ruleForm.low_low_threshold}
                            onChange={(e) => setRuleForm({ ...ruleForm, low_low_threshold: Number(e.target.value) })}
                          />
                        </div>
                        <div className="dm-form-group">
                          <label className="dm-field-label">Custom Message on Low-Low Trip</label>
                          <input 
                            type="text"
                            className="dm-input"
                            placeholder="e.g. Critical low pressure trip!"
                            value={ruleForm.low_low_message}
                            onChange={(e) => setRuleForm({ ...ruleForm, low_low_message: e.target.value })}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* MAPPED NOTIFICATION WIZARD PROFILE (Table 29 & Requirement 5) */}
              <div className="dm-broker-specific-box" style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 600, color: '#38bdf8' }}>
                    Notification Profile Mapping (Section 10.4 / Table 29)
                  </div>
                  <button 
                    type="button" 
                    className="dm-btn dm-btn-secondary" 
                    style={{ fontSize: '0.68rem', padding: '2px 8px', color: '#38bdf8' }}
                    onClick={() => {
                      setEditingActionId(null);
                      setActionForm({
                        name: `${ruleForm.name || 'Process'} Alert Dispatch`,
                        type: 'Email',
                        subject: `[ALARM ALERT] ${ruleForm.name || 'Process Parameter Trip'}`,
                        to_contact: 'shift-supervisor@yokogawa.com',
                        attach_acknowledge_link: true,
                        add_ahi_header_footer: true,
                        content: 'CRITICAL ALERT: Alarm {{alarm_name}} triggered! Current value {{current_value}} exceeded threshold {{threshold_limit}}. Immediate attention required.'
                      });
                      setIsActionModalOpen(true);
                    }}
                  >
                    <Wand2 size={11} /> + Create Notification Wizard
                  </button>
                </div>

                <div className="dm-form-group">
                  <label className="dm-field-label">Map Dedicated Notification Profile to this Alert</label>
                  <select 
                    className="dm-select"
                    value={ruleForm.notification_action_id || ''}
                    onChange={(e) => {
                      const actId = e.target.value;
                      const matchedAct = alarmActions.find(a => a.id === actId);
                      setRuleForm(prev => ({
                        ...prev,
                        notification_action_id: actId,
                        enable_notification: !!actId,
                        notification_channel: matchedAct ? matchedAct.type : prev.notification_channel,
                        notification_contact: matchedAct ? matchedAct.to_contact : prev.notification_contact
                      }));
                    }}
                  >
                    <option value="">-- No Notification Profile Mapped --</option>
                    {alarmActions.map(act => (
                      <option key={act.id} value={act.id}>
                        {act.name} [{act.type} &rarr; {act.to_contact}]
                      </option>
                    ))}
                  </select>
                </div>

                {/* Show Preview of Mapped Notification */}
                {(() => {
                  const mappedAct = alarmActions.find(a => a.id === ruleForm.notification_action_id);
                  if (!mappedAct) return null;
                  return (
                    <div style={{ background: '#0a101f', border: '1px solid #1e293b', borderRadius: '6px', padding: '8px 10px', marginTop: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#38bdf8' }}>
                          Mapped: {mappedAct.name}
                        </span>
                        <span className="dm-tree-badge">{mappedAct.type}</span>
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                        Destination: <span className="mono" style={{ color: '#f8fafc' }}>{mappedAct.to_contact}</span>
                      </div>
                      <div style={{ fontSize: '0.67rem', color: '#cbd5e1', background: '#040812', padding: '5px 7px', borderRadius: '4px', marginTop: '4px', fontStyle: 'italic' }}>
                        "{mappedAct.content}"
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* MICROSERVICE EVENT FORWARDING */}
              <div className="dm-broker-specific-box">
                <div style={{ fontSize: '0.74rem', fontWeight: 600, color: '#38bdf8', marginBottom: '8px' }}>
                  External Event Forwarding (Triggered &amp; Return-to-Normal)
                </div>
                <div className="dm-form-group">
                  <label className="dm-field-label">Forwarding Destination URL (Node-RED / n8n / Webhook)</label>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                    <button 
                      type="button" 
                      className="dm-btn dm-btn-secondary" 
                      style={{ fontSize: '0.68rem', padding: '3px 8px' }}
                      onClick={() => setRuleForm({ ...ruleForm, forward_destination: 'http://localhost:1880/alarms' })}
                    >
                      Preset: Node-RED (:1880)
                    </button>
                    <button 
                      type="button" 
                      className="dm-btn dm-btn-secondary" 
                      style={{ fontSize: '0.68rem', padding: '3px 8px' }}
                      onClick={() => setRuleForm({ ...ruleForm, forward_destination: 'http://localhost:5678/webhook/alarms' })}
                    >
                      Preset: n8n (:5678)
                    </button>
                  </div>
                  <input 
                    type="text" 
                    className="dm-input mono" 
                    value={ruleForm.forward_destination} 
                    onChange={(e) => setRuleForm({ ...ruleForm, forward_destination: e.target.value })} 
                    placeholder="e.g. http://localhost:1880/alarms"
                  />
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '4px' }}>
                    Dispatches exact JSON event payload on both ALARM_TRIGGERED and ALARM_RETURN_TO_NORMAL.
                  </div>
                </div>
              </div>
            </div>

            <div className="dm-modal-footer">
              <button className="dm-btn dm-btn-secondary" onClick={() => { setIsRuleModalOpen(false); setEditingRuleId(null); }}>Cancel</button>
              <button 
                className="dm-btn dm-btn-primary"
                onClick={async () => {
                  if (!ruleForm.name) {
                    showToast('Alarm rule name is required', 'error');
                    return;
                  }
                  // Pre-flight validate against backend
                  try {
                    const valRes = await fetch('/api/v1/dm/alarm-rules/validate', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(ruleForm)
                    });
                    const valData = await valRes.json();
                    if (!valData.valid) {
                      const errMsg = (valData.errors && valData.errors.join('; ')) || valData.error || 'Validation failed';
                      showToast(`Validation Error: ${errMsg}`, 'error');
                      return;
                    }
                  } catch (e) {
                    // ignore network glitch on validator
                  }

                  try {
                    if (editingRuleId) {
                      await updateAlarmRule(editingRuleId, ruleForm);
                      setEditingRuleId(null);
                    } else {
                      await createAlarmRule(ruleForm);
                    }
                    setIsRuleModalOpen(false);
                  } catch (err) {
                    // keep modal open so user can fix if an error occurred
                  }
                }}
              >
                {editingRuleId ? 'Save Rule Changes' : 'Validate & Create Rule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICATION WIZARD MODAL (Table 29 & Requirement 5) */}
      {isActionModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1400 }}>
          <div className="dm-modal-box" style={{ width: '640px' }}>
            <div className="dm-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wand2 size={18} style={{ color: '#38bdf8' }} />
                <h3>{editingActionId ? 'Edit Notification Wizard Template' : 'Alarm Notification Wizard (Table 29)'}</h3>
              </div>
              <button onClick={() => { setIsActionModalOpen(false); setEditingActionId(null); }} className="dm-close-btn">&times;</button>
            </div>
            <div className="dm-modal-body">
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
                <button 
                  className={`dm-btn ${actionWizardStep === 1 ? 'dm-btn-primary' : 'dm-btn-secondary'}`}
                  style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                  onClick={() => setActionWizardStep(1)}
                >
                  1. Channel &amp; Identity
                </button>
                <button 
                  className={`dm-btn ${actionWizardStep === 2 ? 'dm-btn-primary' : 'dm-btn-secondary'}`}
                  style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                  onClick={() => setActionWizardStep(2)}
                >
                  2. Recipients &amp; Destination
                </button>
                <button 
                  className={`dm-btn ${actionWizardStep === 3 ? 'dm-btn-primary' : 'dm-btn-secondary'}`}
                  style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                  onClick={() => setActionWizardStep(3)}
                >
                  3. Message Template &amp; Tokens
                </button>
              </div>

              {actionWizardStep === 1 && (
                <div>
                  <div className="dm-form-grid-2">
                    <div className="dm-form-group">
                      <label className="dm-field-label">Notification Profile Name</label>
                      <input 
                        type="text"
                        className="dm-input"
                        placeholder="e.g. Operations Supervisor Alert"
                        value={actionForm.name}
                        onChange={(e) => setActionForm({ ...actionForm, name: e.target.value })}
                      />
                    </div>
                    <div className="dm-form-group">
                      <label className="dm-field-label">Delivery Channel</label>
                      <select 
                        className="dm-select"
                        value={actionForm.type}
                        onChange={(e) => {
                          const t = e.target.value;
                          let contact = actionForm.to_contact;
                          if (t === 'Node-RED Flow') contact = 'http://localhost:1880/alarms';
                          else if (t === 'n8n Webhook') contact = 'http://localhost:5678/webhook/alarms';
                          else if (t === 'WhatsApp' && (!contact || contact.includes('http') || contact.includes('@'))) contact = '+65 9123 4567';
                          setActionForm({ ...actionForm, type: t, to_contact: contact });
                        }}
                      >
                        <option value="Email">Email (SMTP Dispatch)</option>
                        <option value="WhatsApp">WhatsApp (Business API / Twilio)</option>
                        <option value="Webhook">Webhook Dispatcher</option>
                        <option value="Node-RED Flow">Node-RED Flow (:1880)</option>
                        <option value="n8n Webhook">n8n Automation (:5678)</option>
                      </select>
                    </div>
                  </div>

                  <div className="dm-broker-specific-box" style={{ marginTop: '12px' }}>
                    <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                      {actionForm.type === 'Email' && 'Sends automated emails with process context, acknowledge button, and plant headers.'}
                      {actionForm.type === 'WhatsApp' && 'Dispatches WhatsApp mobile alerts directly to on-duty plant engineers with real-time process readings.'}
                      {actionForm.type === 'Webhook' && 'Dispatches standard JSON HTTP POST payloads directly to enterprise incident gateways.'}
                      {actionForm.type === 'Node-RED Flow' && 'Feeds live alarm payloads into Node-RED industrial logic flows on port 1880.'}
                      {actionForm.type === 'n8n Webhook' && 'Triggers n8n multi-step incident workflows and automated maintenance tickets.'}
                    </div>
                  </div>
                </div>
              )}

              {actionWizardStep === 2 && (
                <div>
                  <div className="dm-form-group">
                    <label className="dm-field-label">
                      {actionForm.type === 'Email' ? 'Recipient Email Address(es)' :
                       actionForm.type === 'WhatsApp' ? 'Recipient WhatsApp Phone Number(s) with Country Code' :
                       'Target Endpoint URL'}
                    </label>
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                      <button 
                        type="button" 
                        className="dm-btn dm-btn-secondary" 
                        style={{ fontSize: '0.68rem', padding: '2px 8px' }}
                        onClick={() => setActionForm({ ...actionForm, to_contact: 'http://localhost:1880/alarms', type: 'Node-RED Flow' })}
                      >
                        Node-RED (:1880)
                      </button>
                      <button 
                        type="button" 
                        className="dm-btn dm-btn-secondary" 
                        style={{ fontSize: '0.68rem', padding: '2px 8px' }}
                        onClick={() => setActionForm({ ...actionForm, to_contact: 'http://localhost:5678/webhook/alarms', type: 'n8n Webhook' })}
                      >
                        n8n (:5678)
                      </button>
                      <button 
                        type="button" 
                        className="dm-btn dm-btn-secondary" 
                        style={{ fontSize: '0.68rem', padding: '2px 8px' }}
                        onClick={() => setActionForm({ ...actionForm, to_contact: '+65 9123 4567', type: 'WhatsApp' })}
                      >
                        Sample WhatsApp (+65...)
                      </button>
                    </div>
                    <input 
                      type="text"
                      className="dm-input mono"
                      placeholder={actionForm.type === 'WhatsApp' ? '+65 9123 4567, +91 9876543210' : 'shift-lead@yokogawa.com or http://...'}
                      value={actionForm.to_contact}
                      onChange={(e) => setActionForm({ ...actionForm, to_contact: e.target.value })}
                    />
                  </div>

                  <div className="dm-form-grid-2" style={{ background: '#0a0d14', padding: '10px', borderRadius: '6px', marginTop: '14px' }}>
                    <label className="dm-checkbox-inline">
                      <input 
                        type="checkbox"
                        checked={actionForm.attach_acknowledge_link}
                        onChange={(e) => setActionForm({ ...actionForm, attach_acknowledge_link: e.target.checked })}
                      />
                      <span>Attach 1-Click Acknowledge Link</span>
                    </label>
                    <label className="dm-checkbox-inline">
                      <input 
                        type="checkbox"
                        checked={actionForm.add_ahi_header_footer}
                        onChange={(e) => setActionForm({ ...actionForm, add_ahi_header_footer: e.target.checked })}
                      />
                      <span>Add Yokogawa OPREX AHI Header/Footer</span>
                    </label>
                  </div>
                </div>
              )}

              {actionWizardStep === 3 && (
                <div>
                  {actionForm.type === 'Email' && (
                    <div className="dm-form-group" style={{ marginBottom: '10px' }}>
                      <label className="dm-field-label">Email Subject Line</label>
                      <input 
                        type="text"
                        className="dm-input"
                        placeholder="[ALARM ALERT] {{alarm_name}}"
                        value={actionForm.subject || ''}
                        onChange={(e) => setActionForm({ ...actionForm, subject: e.target.value })}
                      />
                    </div>
                  )}

                  <div className="dm-form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label className="dm-field-label" style={{ margin: 0 }}>Message Template Content</label>
                      <span style={{ fontSize: '0.68rem', color: '#38bdf8' }}>Click token chip to insert:</span>
                    </div>

                    {/* DYNAMIC TOKEN CHIPS */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '8px' }}>
                      {[
                        '{{alarm_name}}',
                        '{{current_value}}',
                        '{{threshold_limit}}',
                        '{{trip_type}}',
                        '{{tag_name}}',
                        '{{source_asset}}',
                        '{{occurred_at}}',
                        '{{message}}'
                      ].map(token => (
                        <button
                          key={token}
                          type="button"
                          className="dm-btn dm-btn-secondary"
                          style={{ fontSize: '0.65rem', padding: '2px 6px', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)' }}
                          onClick={() => {
                            setActionForm(prev => ({
                              ...prev,
                              content: (prev.content || '') + ' ' + token
                            }));
                          }}
                        >
                          <Tag size={9} style={{ marginRight: '3px' }} />
                          {token}
                        </button>
                      ))}
                    </div>

                    <textarea 
                      rows={4}
                      className="dm-textarea"
                      placeholder="e.g. CRITICAL ALERT: Alarm {{alarm_name}} triggered! Current value {{current_value}} exceeded threshold {{threshold_limit}}."
                      value={actionForm.content}
                      onChange={(e) => setActionForm({ ...actionForm, content: e.target.value })}
                    />
                  </div>

                  {/* LIVE PREVIEW OF FORMATTED MESSAGE */}
                  <div style={{ background: '#091122', border: '1px solid #1e293b', borderRadius: '6px', padding: '10px', marginTop: '10px' }}>
                    <div style={{ fontSize: '0.70rem', fontWeight: 600, color: '#38bdf8', marginBottom: '4px' }}>
                      Live Rendered Message Preview:
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#cbd5e1', fontStyle: 'italic', background: '#040812', padding: '8px', borderRadius: '4px' }}>
                      {actionForm.content
                        ?.replace(/\{\{alarm_name\}\}/g, 'OIL TANK PRESSURE Trip Rule')
                        ?.replace(/\{\{current_value\}\}/g, '457.6 bar')
                        ?.replace(/\{\{threshold_limit\}\}/g, '400.0 bar')
                        ?.replace(/\{\{trip_type\}\}/g, 'High-High')
                        ?.replace(/\{\{tag_name\}\}/g, 'TEST_1.tags.FIC_101.PV')
                        ?.replace(/\{\{source_asset\}\}/g, 'OIL TANK')
                        ?.replace(/\{\{occurred_at\}\}/g, new Date().toISOString().substring(0, 19).replace('T', ' '))
                        ?.replace(/\{\{message\}\}/g, 'High High process trip threshold exceeded!')
                      }
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="dm-modal-footer">
              <button 
                className="dm-btn dm-btn-secondary" 
                onClick={() => { setIsActionModalOpen(false); setEditingActionId(null); }}
              >
                Cancel
              </button>
              {actionWizardStep > 1 && (
                <button 
                  className="dm-btn dm-btn-secondary" 
                  onClick={() => setActionWizardStep(actionWizardStep - 1)}
                >
                  &larr; Back
                </button>
              )}
              {actionWizardStep < 3 && (
                <button 
                  className="dm-btn dm-btn-primary" 
                  onClick={() => setActionWizardStep(actionWizardStep + 1)}
                >
                  Next &rarr;
                </button>
              )}
              {actionWizardStep === 3 && (
                <button 
                  className="dm-btn dm-btn-primary"
                  onClick={async () => {
                    if (!actionForm.name) {
                      showToast('Action name is required', 'error');
                      return;
                    }
                    if (editingActionId) {
                      await updateAlarmAction(editingActionId, actionForm);
                    } else {
                      await createAlarmAction(actionForm);
                    }
                    setIsActionModalOpen(false);
                    setEditingActionId(null);
                  }}
                >
                  {editingActionId ? 'Save Wizard Changes' : 'Create Notification Profile'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EDIT ACTIVE ALARM MODAL (Requirement 1) */}
      {isEditAlarmModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1400 }}>
          <div className="dm-modal-box" style={{ width: '640px' }}>
            <div className="dm-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit3 size={18} style={{ color: '#38bdf8' }} />
                <h3>Edit Active Process Alarm</h3>
              </div>
              <button onClick={() => { setIsEditAlarmModalOpen(false); setEditingAlarmId(null); }} className="dm-close-btn">&times;</button>
            </div>
            <div className="dm-modal-body">
              <div className="dm-form-grid-2">
                <div className="dm-form-group">
                  <label className="dm-field-label">Alarm Display Name</label>
                  <input
                    type="text"
                    className="dm-input"
                    value={editAlarmForm.alarm_name}
                    onChange={(e) => setEditAlarmForm({ ...editAlarmForm, alarm_name: e.target.value })}
                  />
                </div>
                <div className="dm-form-group">
                  <label className="dm-field-label">Alarm State</label>
                  <select
                    className="dm-select"
                    value={editAlarmForm.state}
                    onChange={(e) => setEditAlarmForm({ ...editAlarmForm, state: e.target.value })}
                  >
                    <option value="In Alarm Unacknowledged">In Alarm Unacknowledged</option>
                    <option value="In Alarm Acknowledged">In Alarm Acknowledged</option>
                    <option value="Normal">Normal</option>
                  </select>
                </div>
              </div>

              {/* Site Name and Area Fields */}
              <div className="dm-form-grid-2">
                <div className="dm-form-group">
                  <label className="dm-field-label">Site Name</label>
                  <input
                    type="text"
                    className="dm-input"
                    value={editAlarmForm.site_name || ''}
                    onChange={(e) => setEditAlarmForm({ ...editAlarmForm, site_name: e.target.value })}
                    placeholder="e.g. Site 1 / Refinery / Plant Alpha"
                  />
                </div>
                <div className="dm-form-group">
                  <label className="dm-field-label">Plant Area / Unit</label>
                  <input
                    type="text"
                    className="dm-input"
                    value={editAlarmForm.area || ''}
                    onChange={(e) => setEditAlarmForm({ ...editAlarmForm, area: e.target.value })}
                    placeholder="e.g. Area 1 / Tank Farm / Unit 4"
                  />
                </div>
              </div>

              <div className="dm-form-grid-2">
                <div className="dm-form-group">
                  <label className="dm-field-label">Priority (ISA-18.2)</label>
                  <select
                    className="dm-select"
                    value={editAlarmForm.priority}
                    onChange={(e) => setEditAlarmForm({ ...editAlarmForm, priority: e.target.value })}
                  >
                    <option value="Urgent">Urgent</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div className="dm-form-group">
                  <label className="dm-field-label">Severity Level (1 - 1000)</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    className="dm-input mono"
                    value={editAlarmForm.severity}
                    onChange={(e) => setEditAlarmForm({ ...editAlarmForm, severity: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="dm-form-grid-2">
                <div className="dm-form-group">
                  <label className="dm-field-label">Threshold Limit</label>
                  <input
                    type="number"
                    step="any"
                    className="dm-input mono"
                    value={editAlarmForm.threshold_limit}
                    onChange={(e) => setEditAlarmForm({ ...editAlarmForm, threshold_limit: Number(e.target.value) })}
                  />
                </div>
                <div className="dm-form-group">
                  <label className="dm-field-label">Scan Rate (Seconds)</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.5"
                    className="dm-input mono"
                    value={editAlarmForm.scan_rate_seconds || 1}
                    onChange={(e) => setEditAlarmForm({ ...editAlarmForm, scan_rate_seconds: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="dm-form-grid-2">
                <div className="dm-form-group">
                  <label className="dm-field-label">Alarm Class</label>
                  <select
                    className="dm-select"
                    value={editAlarmForm.class_type}
                    onChange={(e) => setEditAlarmForm({ ...editAlarmForm, class_type: e.target.value })}
                  >
                    <option value="Process Safety">Process Safety</option>
                    <option value="Process">Process</option>
                    <option value="Alert">Alert</option>
                    <option value="Communication">Communication</option>
                    <option value="Fire Gas">Fire Gas</option>
                    <option value="System">System</option>
                  </select>
                </div>
                <div className="dm-form-group">
                  <label className="dm-field-label">Mapped Notification Profile</label>
                  <select
                    className="dm-select"
                    value={editAlarmForm.notification_action_id || ''}
                    onChange={(e) => setEditAlarmForm({ ...editAlarmForm, notification_action_id: e.target.value })}
                  >
                    <option value="">-- No Notification Action Mapped --</option>
                    {alarmActions.map(act => (
                      <option key={act.id} value={act.id}>
                        {act.name} ({act.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="dm-form-group">
                <label className="dm-field-label">Alarm Message / Operator Directive</label>
                <textarea
                  rows={3}
                  className="dm-textarea"
                  value={editAlarmForm.message}
                  onChange={(e) => setEditAlarmForm({ ...editAlarmForm, message: e.target.value })}
                />
              </div>
            </div>

            <div className="dm-modal-footer">
              <button 
                className="dm-btn dm-btn-secondary" 
                onClick={() => { setIsEditAlarmModalOpen(false); setEditingAlarmId(null); }}
              >
                Cancel
              </button>
              <button 
                className="dm-btn dm-btn-primary"
                onClick={async () => {
                  try {
                    if (editingAlarmId) {
                      await updateAlarm(editingAlarmId, editAlarmForm);
                    }
                    setIsEditAlarmModalOpen(false);
                    setEditingAlarmId(null);
                  } catch (err) {
                    // keep modal open so user can fix if an error occurred
                  }
                }}
              >
                Save Alarm Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          THINGSBOARD ALARM DETAIL INSPECTOR MODAL
         ======================================================== */}
      {selectedAlarmDetail && (
        <div className="dm-modal-overlay">
          <div className="dm-modal-container" style={{ maxWidth: '640px' }}>
            <div className="dm-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={18} style={{ color: '#ef4444' }} />
                <div>
                  <h3 className="dm-modal-title">ThingsBoard Alarm Details</h3>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                    Alarm ID: {selectedAlarmDetail.id}
                  </span>
                </div>
              </div>
              <button className="dm-modal-close" onClick={() => setSelectedAlarmDetail(null)}>✕</button>
            </div>

            <div className="dm-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div style={{ background: '#091122', padding: '10px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Alarm Name / Type</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>
                    {selectedAlarmDetail.alarm_name}
                  </div>
                </div>

                <div style={{ background: '#091122', padding: '10px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Originator Entity</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#38bdf8', marginTop: '2px' }}>
                    {selectedAlarmDetail.source_asset}
                  </div>
                </div>

                <div style={{ background: '#091122', padding: '10px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Current Lifecycle State</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, marginTop: '2px', color: selectedAlarmDetail.state?.includes('Unacknowledged') ? '#f87171' : '#34d399' }}>
                    {selectedAlarmDetail.state}
                  </div>
                </div>

                <div style={{ background: '#091122', padding: '10px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Severity &amp; Table 27 Urgency</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#c084fc', marginTop: '2px' }}>
                    {selectedAlarmDetail.priority} ({selectedAlarmDetail.severity})
                  </div>
                </div>
              </div>

              <div style={{ background: '#091122', padding: '12px', borderRadius: '8px', border: '1px solid #1e293b', marginBottom: '14px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
                  Telemetry Process Signal Context
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '0.72rem', fontFamily: 'monospace' }}>
                  <div><span style={{ color: '#94a3b8' }}>Tag:</span> <span style={{ color: '#38bdf8' }}>{selectedAlarmDetail.tag_name}</span></div>
                  <div><span style={{ color: '#94a3b8' }}>Tripped Value:</span> <span style={{ color: '#f87171', fontWeight: 700 }}>{selectedAlarmDetail.current_value}</span></div>
                  <div><span style={{ color: '#94a3b8' }}>Threshold Limit:</span> <span>{selectedAlarmDetail.threshold_limit}</span></div>
                </div>
              </div>

              <div style={{ background: '#091122', padding: '12px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>
                  Alarm Attributes &amp; Event Payload (JSON)
                </div>
                <pre style={{ margin: 0, padding: '8px', background: '#040812', borderRadius: '6px', fontSize: '0.68rem', color: '#38bdf8', overflowX: 'auto' }}>
                  {JSON.stringify(selectedAlarmDetail, null, 2)}
                </pre>
              </div>
            </div>

            <div className="dm-modal-footer">
              <button 
                className="dm-btn dm-btn-secondary" 
                onClick={() => setSelectedAlarmDetail(null)}
              >
                Close
              </button>
              <button 
                className="dm-btn dm-btn-primary"
                onClick={async () => {
                  await acknowledgeAlarm(selectedAlarmDetail.id);
                  setSelectedAlarmDetail(prev => ({ ...prev, state: 'In Alarm Acknowledged' }));
                }}
              >
                <Check size={12} /> Acknowledge Alarm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          CREATE / TRIP PROCESS ALARM MODAL
         ======================================================== */}
      {isCreateAlarmModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1400 }}>
          <div className="dm-modal-box" style={{ width: '640px' }}>
            <div className="dm-modal-header">
              <h3>Create &amp; Trip Process Alarm</h3>
              <button onClick={() => setIsCreateAlarmModalOpen(false)} className="dm-close-btn">&times;</button>
            </div>
            <div className="dm-modal-body">
              {/* Asset and Attribute Selection */}
              <div className="dm-form-grid-2">
                <div className="dm-form-group">
                  <label className="dm-field-label">Source Asset</label>
                  <select 
                    className="dm-select"
                    value={createAlarmForm.source_asset}
                    onChange={(e) => {
                      const selectedAssetName = e.target.value;
                      const matchedAsset = assets.find(a => a.name === selectedAssetName || a.id === selectedAssetName);
                      const firstAttr = matchedAsset?.attributes?.[0];
                      const curVal = firstAttr ? (parseFloat(firstAttr.value) || 0) : 0;
                      setCreateAlarmForm(prev => ({
                        ...prev,
                        source_asset: selectedAssetName,
                        asset_id: matchedAsset?.id || '',
                        site_name: prev.site_name || matchedAsset?.site || 'Site 1',
                        area: prev.area || matchedAsset?.area || 'Area 1',
                        attribute_name: firstAttr?.name || '',
                        tag_name: firstAttr?.tag_name || (matchedAsset && firstAttr ? `${matchedAsset.name}.${firstAttr.name}` : ''),
                        uom: firstAttr?.uom || '',
                        current_value: curVal,
                        threshold_limit: curVal ? Math.round(curVal * 1.2 * 100) / 100 : 120,
                        alarm_name: matchedAsset && firstAttr ? `${matchedAsset.name} ${firstAttr.name} Process Alarm` : prev.alarm_name
                      }));
                    }}
                  >
                    <option value="">-- Select Source Asset --</option>
                    {assets.map(a => (
                      <option key={a.id} value={a.name}>{a.name} ({a.category || a.type || 'Asset'})</option>
                    ))}
                  </select>
                </div>

                <div className="dm-form-group">
                  <label className="dm-field-label">Asset Attribute to Map</label>
                  {(() => {
                    const selAsset = assets.find(a => a.name === createAlarmForm.source_asset || a.id === createAlarmForm.source_asset);
                    const attrs = selAsset?.attributes || [];
                    if (attrs.length === 0) {
                      return (
                        <input 
                          type="text"
                          className="dm-input"
                          placeholder="No attributes found or enter signal name"
                          value={createAlarmForm.attribute_name}
                          onChange={(e) => setCreateAlarmForm({ ...createAlarmForm, attribute_name: e.target.value })}
                        />
                      );
                    }
                    return (
                      <select 
                        className="dm-select"
                        value={createAlarmForm.attribute_name}
                        onChange={(e) => {
                          const attrName = e.target.value;
                          const attr = attrs.find(at => at.name === attrName);
                          if (attr) {
                            const curVal = typeof attr.value === 'number' ? attr.value : (parseFloat(attr.value) || 0);
                            setCreateAlarmForm(prev => ({
                              ...prev,
                              attribute_name: attr.name,
                              tag_name: attr.tag_name || `${prev.source_asset}.${attr.name}`,
                              uom: attr.uom || '',
                              current_value: curVal,
                              threshold_limit: curVal ? Math.round(curVal * 1.2 * 100) / 100 : 120,
                              alarm_name: `${prev.source_asset} ${attr.name} Alarm`
                            }));
                          }
                        }}
                      >
                        <option value="">-- Select Asset Attribute --</option>
                        {attrs.map(at => (
                          <option key={at.id || at.name} value={at.name}>
                            {at.name} ({at.type || 'Dynamic'} | Live: {at.value !== undefined ? at.value : '--'} {at.uom || ''})
                          </option>
                        ))}
                      </select>
                    );
                  })()}
                </div>
              </div>

              {/* Manual Site Name & Area Option */}
              <div className="dm-form-grid-2">
                <div className="dm-form-group">
                  <label className="dm-field-label">Site Name</label>
                  <input 
                    type="text"
                    className="dm-input"
                    placeholder="e.g. Site 1 / Refinery / Plant Alpha"
                    value={createAlarmForm.site_name || ''}
                    onChange={(e) => setCreateAlarmForm({ ...createAlarmForm, site_name: e.target.value })}
                  />
                </div>
                <div className="dm-form-group">
                  <label className="dm-field-label">Plant Area / Unit</label>
                  <input 
                    type="text"
                    className="dm-input"
                    placeholder="e.g. Area 1 / Tank Farm / Unit 4"
                    value={createAlarmForm.area || ''}
                    onChange={(e) => setCreateAlarmForm({ ...createAlarmForm, area: e.target.value })}
                  />
                </div>
              </div>

              {/* Tag Name & Live Attribute Preview */}
              <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', padding: '8px 12px', borderRadius: '6px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem' }}>
                <div>
                  <span style={{ color: '#94a3b8' }}>Mapped Tag: </span>
                  <code style={{ color: '#38bdf8', fontWeight: 600 }}>{createAlarmForm.tag_name || 'N/A'}</code>
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>Live Reading: </span>
                  <strong style={{ color: '#10b981' }}>{createAlarmForm.current_value} {createAlarmForm.uom}</strong>
                </div>
              </div>

              {/* Alarm Name & Scan Rate */}
              <div className="dm-form-grid-2">
                <div className="dm-form-group">
                  <label className="dm-field-label">Alarm Name</label>
                  <input 
                    type="text"
                    className="dm-input"
                    value={createAlarmForm.alarm_name}
                    onChange={(e) => setCreateAlarmForm({ ...createAlarmForm, alarm_name: e.target.value })}
                    placeholder="e.g. OIL TANK High Pressure Trip"
                  />
                </div>
                <div className="dm-form-group">
                  <label className="dm-field-label">Scan Rate (Secs)</label>
                  <input 
                    type="number"
                    min="0.1"
                    step="0.5"
                    className="dm-input mono"
                    value={createAlarmForm.scan_rate_seconds || 1}
                    onChange={(e) => setCreateAlarmForm({ ...createAlarmForm, scan_rate_seconds: Number(e.target.value) })}
                  />
                </div>
              </div>

              {/* Priority, Severity & Class */}
              <div className="dm-form-grid-3">
                <div className="dm-form-group">
                  <label className="dm-field-label">Priority (ISA-18.2)</label>
                  <select 
                    className="dm-select"
                    value={createAlarmForm.priority}
                    onChange={(e) => {
                      const p = e.target.value;
                      let s = 650;
                      if (p === 'Urgent') s = 850;
                      else if (p === 'High') s = 650;
                      else if (p === 'Medium') s = 450;
                      else s = 200;
                      setCreateAlarmForm({ ...createAlarmForm, priority: p, severity: s });
                    }}
                  >
                    <option value="Urgent">Urgent (Table 27 Purple)</option>
                    <option value="High">High (Table 27 Red)</option>
                    <option value="Medium">Medium (Table 27 Orange)</option>
                    <option value="Low">Low (Table 27 Yellow)</option>
                  </select>
                </div>
                <div className="dm-form-group">
                  <label className="dm-field-label">Severity Score (1-1000)</label>
                  <input 
                    type="number"
                    min="1"
                    max="1000"
                    className="dm-input"
                    value={createAlarmForm.severity}
                    onChange={(e) => setCreateAlarmForm({ ...createAlarmForm, severity: Number(e.target.value) })}
                  />
                </div>
                <div className="dm-form-group">
                  <label className="dm-field-label">Alarm Class</label>
                  <select 
                    className="dm-select"
                    value={createAlarmForm.class_type}
                    onChange={(e) => setCreateAlarmForm({ ...createAlarmForm, class_type: e.target.value })}
                  >
                    <option value="Process Safety">Process Safety</option>
                    <option value="Process Control">Process Control</option>
                    <option value="Environmental">Environmental</option>
                    <option value="Equipment Protection">Equipment Protection</option>
                  </select>
                </div>
              </div>

              {/* Process Trip Values */}
              <div className="dm-form-grid-2">
                <div className="dm-form-group">
                  <label className="dm-field-label">Current Process Value ({createAlarmForm.uom || 'EU'})</label>
                  <input 
                    type="number"
                    step="any"
                    className="dm-input"
                    value={createAlarmForm.current_value}
                    onChange={(e) => setCreateAlarmForm({ ...createAlarmForm, current_value: Number(e.target.value) })}
                  />
                </div>
                <div className="dm-form-group">
                  <label className="dm-field-label">Trip Threshold Limit ({createAlarmForm.uom || 'EU'})</label>
                  <input 
                    type="number"
                    step="any"
                    className="dm-input"
                    value={createAlarmForm.threshold_limit}
                    onChange={(e) => setCreateAlarmForm({ ...createAlarmForm, threshold_limit: Number(e.target.value) })}
                  />
                </div>
              </div>

              {/* Message */}
              <div className="dm-form-group">
                <label className="dm-field-label">Alarm Description / Message</label>
                <input 
                  type="text"
                  className="dm-input"
                  placeholder="e.g. Tank pressure exceeded safe threshold limit"
                  value={createAlarmForm.message}
                  onChange={(e) => setCreateAlarmForm({ ...createAlarmForm, message: e.target.value })}
                />
              </div>
            </div>

            <div className="dm-modal-footer">
              <button className="dm-btn dm-btn-secondary" onClick={() => setIsCreateAlarmModalOpen(false)}>Cancel</button>
              <button 
                className="dm-btn dm-btn-primary"
                onClick={async () => {
                  if (!createAlarmForm.alarm_name) {
                    showToast('Alarm name is required', 'error');
                    return;
                  }
                  try {
                    await triggerAlarm({
                      ...createAlarmForm,
                      time_interval_seconds: createAlarmForm.scan_rate_seconds
                    });
                    setIsCreateAlarmModalOpen(false);
                    showToast(`Alarm triggered: ${createAlarmForm.alarm_name}`, 'success');
                  } catch (err) {
                    showToast('Failed to trigger alarm', 'error');
                  }
                }}
              >
                <AlertTriangle size={13} />
                <span>Trip / Activate Alarm</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
