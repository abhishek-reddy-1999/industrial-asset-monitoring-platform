import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, Layers, Search, Play, RefreshCw, Cpu, Activity,
  Server, Shield, Settings, FileText, ChevronDown, ChevronRight,
  Plus, Check, AlertTriangle, ExternalLink, Terminal, Database,
  ArrowRight, Radio, Compass, Clock, Zap, Pause, Trash2, Edit3,
  Code, Eye, Download, Key, UserCheck, X, Sliders, Wifi, Bell,
  FolderPlus, FilePlus, Copy, Wrench, CheckCircle2, AlertOctagon
} from 'lucide-react';
import * as echarts from 'echarts';
import { 
  fetchDmOverview, fetchFbTemplates, createFbTemplate, updateFbTemplate, deleteFbTemplate,
  fetchFbExecutions, createFbExecution, updateFbExecution, deleteFbExecution,
  runFbExecution, toggleFbExecutionStatus, fetchDevices, createDevice, updateDevice,
  deleteDevice, pingDevice, fetchDeviceDiagnostics, fetchBrokers, createBroker,
  updateBroker, deleteBroker, testBroker, fetchActivities, fetchAssetTree,
  fetchTagsList, queryTimeSeries, fetchAssetHealth, createAssetNode, updateAssetNode,
  deleteAssetNode, createTag, deleteTag, fetchAlarmRules, createAlarmRule,
  deleteAlarmRule, fetchAlarmEvents, ackAlarmEvent, shelveAlarmEvent, clearAlarmEvent,
  fetchClassicFBs, createClassicFB, tuneClassicFB, fetchSystemConfig,
  updateSystemConfig, fetchSecurityUsers, createSecurityUser, deleteSecurityUser,
  fetchSecurityApiKeys, createSecurityApiKey, revokeSecurityApiKey
} from '../api/client';

export default function DataManagementView({ onNavigateToDI }) {
  // Navigation active tab
  const [activeMenu, setActiveMenu] = useState('home');
  const [fbV2Expanded, setFbV2Expanded] = useState(true);

  // Core Data states
  const [overview, setOverview] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [devices, setDevices] = useState([]);
  const [brokers, setBrokers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [activityCategory, setActivityCategory] = useState('ALL');
  const [activitySearch, setActivitySearch] = useState('');
  const [assetTree, setAssetTree] = useState([]);
  const [tagsList, setTagsList] = useState([]);
  const [assetHealthList, setAssetHealthList] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);

  // Data Explorer states
  const [explorerTags, setExplorerTags] = useState([]);
  const [explorerTimeRange, setExplorerTimeRange] = useState('now-1h');
  const [explorerSeries, setExplorerSeries] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [liveStreamEnabled, setLiveStreamEnabled] = useState(false);
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // Classic FB States
  const [classicFBs, setClassicFBs] = useState([]);
  const [tuningBlock, setTuningBlock] = useState(null);
  const [isClassicModalOpen, setIsClassicModalOpen] = useState(false);

  // Alarm Management States
  const [alarmTab, setAlarmTab] = useState('active'); // 'active' or 'rules'
  const [alarmRules, setAlarmRules] = useState([]);
  const [alarmEvents, setAlarmEvents] = useState([]);
  const [isAlarmRuleModalOpen, setIsAlarmRuleModalOpen] = useState(false);

  // System Configuration States
  const [systemConfig, setSystemConfig] = useState({
    timezone: 'UTC',
    sampling_rate_ms: 1000,
    tier1_retention_days: 90,
    tier2_retention_years: 5,
    js_timeout_ms: 5000,
    redis_cache_ttl_sec: 3600
  });

  // Security States
  const [securityUsers, setSecurityUsers] = useState([]);
  const [securityApiKeys, setSecurityApiKeys] = useState([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [generatedKeyResult, setGeneratedKeyResult] = useState(null);

  // Modals for FB V2, Assets, Devices, Brokers
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [isExecutionModalOpen, setIsExecutionModalOpen] = useState(false);
  const [editingExecutionId, setEditingExecutionId] = useState(null);
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [deviceDiagnosticsModal, setDeviceDiagnosticsModal] = useState(null);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isBrokerModalOpen, setIsBrokerModalOpen] = useState(false);
  const [viewLogExecution, setViewLogExecution] = useState(null);

  // Template Form State
  const [tmplForm, setTmplForm] = useState({
    template_code: 'FB_CUSTOM_CALC',
    name: 'Custom Refinery Algorithm',
    category: 'Analytics',
    description: 'Custom calculation engine for distillation column optimization.',
    inputs: [
      { name: 'val1', type: 'Float', unit: '°C', default: 120 },
      { name: 'val2', type: 'Float', unit: '°C', default: 240 }
    ],
    outputs: [
      { name: 'result', type: 'Float', unit: '°C' }
    ],
    formula_code: `/**
 * Custom Yokogawa AHI Function Block V2
 * @param {Object} inputs - Process sensor inputs
 * @returns {Object} output calculations
 */
function execute(inputs) {
  const v1 = Number(inputs.val1 || 0);
  const v2 = Number(inputs.val2 || 0);
  const result = Number((v2 - v1).toFixed(2));

  console.log("Calculated Delta result:", result);

  return {
    result: result,
    status: result > 100 ? 'OPTIMAL' : 'LOW'
  };
}`
  });

  // Preset Template Code Snippets for Quick Loading
  const PRESET_SNIPPETS = {
    ANOMALY: {
      name: "Mahalanobis-Taguchi Multivariate Anomaly",
      code: `/**
 * Yokogawa OpreX PDA Mahalanobis-Taguchi Multivariate Anomaly
 * @param {Object} inputs - Process sensor inputs: temp_top, temp_bottom, pressure, vibration
 * @returns {Object} Calculated MT distance score and anomaly flag
 */
function execute(inputs) {
  const top = Number(inputs.temp_top || 118.0);
  const bot = Number(inputs.temp_bottom || 235.0);
  const press = Number(inputs.pressure || 145.0);
  const vib = Number(inputs.vibration || 2.1);

  // Normalized Mahalanobis vector calculation against baseline covariance
  const z_top = (top - 118.0) / 4.5;
  const z_bot = (bot - 235.0) / 6.2;
  const z_press = (press - 145.0) / 5.0;
  const z_vib = (vib - 2.1) / 0.4;

  const mt_sq = (z_top*z_top + z_bot*z_bot + z_press*z_press + z_vib*z_vib) / 4.0;
  const mt_distance = Number(Math.sqrt(mt_sq).toFixed(2));
  const is_anomaly = mt_distance > 3.0;

  console.log("Computed MT Distance:", mt_distance, "Anomaly?", is_anomaly);

  return {
    mt_distance: mt_distance,
    is_anomaly: is_anomaly,
    health_status: is_anomaly ? 'ANOMALY_DETECTED' : 'NORMAL'
  };
}`
    },
    DELTA_T: {
      name: "Column Thermal Gradient Delta",
      code: `/**
 * Fractionation Column Thermal Gradient Delta
 * @param {Object} inputs - t_reboiler, t_overhead
 * @returns {Object} delta_t and gradient status
 */
function execute(inputs) {
  const top = Number(inputs.t_overhead || 118.0);
  const bot = Number(inputs.t_reboiler || 235.0);
  const dt = Number((bot - top).toFixed(2));
  
  let status = 'NORMAL';
  if (dt > 130.0) status = 'EXCESSIVE_REBOIL';
  if (dt < 95.0) status = 'INSUFFICIENT_SEPARATION';

  console.log("Thermal Delta T:", dt, "Status:", status);

  return {
    delta_t: dt,
    gradient_status: status
  };
}`
    },
    CAVITATION: {
      name: "Pump NPSH & Cavitation Risk",
      code: `/**
 * Centrifugal Pump NPSH Margin & Impeller Cavitation Risk
 * @param {Object} inputs - suction_pressure, liquid_temp, flow_rate
 * @returns {Object} npsh_margin and cavitation_risk
 */
function execute(inputs) {
  const p_suction = Number(inputs.suction_pressure || 120.0);
  const temp = Number(inputs.liquid_temp || 65.0);
  const flow = Number(inputs.flow_rate || 550.0);

  // Vapor pressure estimate for hydrocarbon mixture
  const p_vap = 0.5 * Math.pow(temp / 50.0, 2.2);
  const head_suction = (p_suction - p_vap) * 0.102;
  const npsh_margin = Number((head_suction - 3.2).toFixed(2));

  let risk = 'LOW';
  if (npsh_margin < 0.8) risk = 'HIGH_CAVITATION_ALERT';
  else if (npsh_margin < 1.5) risk = 'MODERATE';

  console.log("NPSH Margin:", npsh_margin, "Risk:", risk);

  return {
    npsh_margin: npsh_margin,
    cavitation_risk: risk
  };
}`
    },
    HEAT_EXCHANGER: {
      name: "Heat Exchanger Duty & Efficiency",
      code: `/**
 * Heat Exchanger Thermal Duty (Q = m * Cp * dT)
 * @param {Object} inputs - flow_rate, t_inlet, t_outlet
 * @returns {Object} duty_mw and efficiency
 */
function execute(inputs) {
  const flow = Number(inputs.flow_rate || 420.0); // m3/h
  const t_in = Number(inputs.t_inlet || 85.0);    // C
  const t_out = Number(inputs.t_outlet || 145.0); // C
  
  const dT = t_out - t_in;
  const cp = 2.15; // kJ/kg.K
  const rho = 840; // kg/m3
  const mass_flow = (flow * rho) / 3600; // kg/s
  const duty_kw = mass_flow * cp * dT;
  const duty_mw = Number((duty_kw / 1000).toFixed(2));

  return {
    duty_mw: duty_mw,
    delta_t: Number(dT.toFixed(1)),
    heat_transfer_rate: duty_mw > 15 ? 'HIGH' : 'NORMAL'
  };
}`
    }
  };

  // Template Live Testing State
  const [testInputs, setTestInputs] = useState('{\n  "val1": 118.5,\n  "val2": 236.2\n}');
  const [testOutput, setTestOutput] = useState(null);
  const [testingCode, setTestingCode] = useState(false);

  // Execution Form State
  const [execForm, setExecForm] = useState({
    execution_name: '',
    template_id: '',
    target_tag: '',
    schedule_interval: '1s',
    bindings: {}
  });

  // Device Form State
  const [devForm, setDevForm] = useState({
    device_id: 'DEV-YOKO-001',
    name: 'Atmospheric Tower Transmitter',
    model: 'Yokogawa EJX110A',
    device_type: 'Transmitter',
    protocol: 'HART 7',
    ip_address: '10.20.1.120',
    firmware_version: 'FW-4.5.0',
    status: 'ONLINE'
  });

  // Broker Form State
  const [brokerForm, setBrokerForm] = useState({
    name: 'CENTUM VP OPC UA Node 2',
    broker_type: 'OPC_UA',
    endpoint_url: 'opc.tcp://10.20.1.20',
    port: 4840,
    topic_or_path: 'ns=2;s=CENTUM_VP.FCS0102',
    status: 'CONNECTED'
  });

  // Asset Form State
  const [assetForm, setAssetForm] = useState({
    name: '',
    level: 'EQUIPMENT',
    path: '',
    parent_id: null,
    description: ''
  });

  // Tag Form State
  const [tagForm, setTagForm] = useState({
    asset_id: null,
    tag_name: '',
    display_name: '',
    eng_units: '°C',
    min_range: 0,
    max_range: 200,
    source_type: 'CENTUM_VP'
  });

  // Alarm Rule Form State
  const [ruleForm, setRuleForm] = useState({
    tag_name: '',
    condition: 'GT',
    threshold: 0.0,
    severity: 'CRITICAL',
    message: '',
    enabled: true
  });

  // User Form State
  const [userForm, setUserForm] = useState({
    username: '',
    full_name: '',
    email: '',
    role: 'Process Reliability Engineer'
  });

  // API Key Form State
  const [apiKeyForm, setApiKeyForm] = useState({
    name: '',
    scope: 'telemetry:read, asset:read',
    expires_in_days: 365
  });

  // Classic FB Form State
  const [classicForm, setClassicForm] = useState({
    tag_name: '',
    description: '',
    block_type: 'PID',
    pv_tag: '',
    mv_tag: '',
    sp: 0.0,
    kp: 1.0,
    ti: 60.0,
    td: 0.0,
    mode: 'AUT'
  });

  // Feedback Toast
  const [feedback, setFeedback] = useState(null);

  const showToast = (msg, type = 'info') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  // 1. Initial Load
  useEffect(() => {
    loadAllDmData();
  }, []);

  const loadAllDmData = async () => {
    try {
      const [
        ov, tmpls, execs, devs, brks, acts, tree, tags, health,
        rules, events, cFBs, cfg, secUsers, secKeys
      ] = await Promise.all([
        fetchDmOverview(),
        fetchFbTemplates(),
        fetchFbExecutions(),
        fetchDevices(),
        fetchBrokers(),
        fetchActivities(),
        fetchAssetTree(),
        fetchTagsList(),
        fetchAssetHealth(),
        fetchAlarmRules(),
        fetchAlarmEvents(),
        fetchClassicFBs(),
        fetchSystemConfig(),
        fetchSecurityUsers(),
        fetchSecurityApiKeys()
      ]);

      setOverview(ov);
      setTemplates(tmpls);
      setExecutions(execs);
      setDevices(devs);
      setBrokers(brks);
      setActivities(acts);
      setAssetTree(tree);
      setTagsList(tags);
      setAssetHealthList(health);
      setAlarmRules(rules);
      setAlarmEvents(events);
      setClassicFBs(cFBs);
      setSystemConfig(cfg);
      setSecurityUsers(secUsers);
      setSecurityApiKeys(secKeys);

      if (tree.length > 0 && !selectedAsset) {
        setSelectedAsset(tree[0]);
      }
    } catch (err) {
      console.error('Error loading DM data:', err);
    }
  };

  // Auto-refresh execution list every 3s when viewing FB execution tab
  useEffect(() => {
    if (activeMenu !== 'fb_execution') return;
    const interval = setInterval(() => {
      fetchFbExecutions().then(setExecutions).catch(console.error);
    }, 3000);
    return () => clearInterval(interval);
  }, [activeMenu]);

  // 2. Data Explorer ECharts Render
  useEffect(() => {
    if (activeMenu === 'data_explorer' && explorerTags.length > 0) {
      setLoadingData(true);
      queryTimeSeries(explorerTags, explorerTimeRange, 'now')
        .then(res => {
          setExplorerSeries(res.series || []);
          setLoadingData(false);
        })
        .catch(err => {
          console.error(err);
          setLoadingData(false);
        });
    }
  }, [activeMenu, explorerTags, explorerTimeRange]);

  // Live streaming for Data Explorer
  useEffect(() => {
    if (!liveStreamEnabled || activeMenu !== 'data_explorer') return;
    const interval = setInterval(() => {
      queryTimeSeries(explorerTags, explorerTimeRange, 'now')
        .then(res => setExplorerSeries(res.series || []))
        .catch(console.error);
    }, 2000);
    return () => clearInterval(interval);
  }, [liveStreamEnabled, activeMenu, explorerTags, explorerTimeRange]);

  useEffect(() => {
    if (activeMenu !== 'data_explorer' || !chartRef.current || explorerSeries.length === 0) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const colors = ['#38bdf8', '#f59e0b', '#10b981', '#a855f7', '#ec4899', '#06b6d4'];
    const seriesConfig = explorerSeries.map((s, idx) => ({
      name: s.tag_name,
      type: 'line',
      smooth: true,
      showSymbol: false,
      data: s.datapoints.map(p => [p.timestamp, p.value]),
      itemStyle: { color: colors[idx % colors.length] },
      lineStyle: { width: 2 },
      markLine: {
        data: [{ type: 'average', name: 'Avg' }],
        lineStyle: { type: 'dashed', color: 'rgba(255,255,255,0.2)' }
      }
    }));

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: '#334155',
        textStyle: { color: '#f8fafc', fontSize: 11 }
      },
      legend: {
        data: explorerSeries.map(s => s.tag_name),
        textStyle: { color: '#94a3b8' },
        top: 0
      },
      grid: { left: '3%', right: '3%', top: '15%', bottom: '12%', containLabel: true },
      dataZoom: [
        { type: 'inside', start: 0, end: 100 },
        { type: 'slider', bottom: 0, height: 16, borderColor: '#334155', textStyle: { color: '#64748b' } }
      ],
      xAxis: {
        type: 'time',
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#64748b', fontSize: 10 }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
        axisLabel: { color: '#64748b', fontSize: 10 }
      },
      series: seriesConfig
    };

    chartInstance.current.setOption(option, true);

    const handleResize = () => chartInstance.current?.resize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [explorerSeries, activeMenu]);

  // ==========================================
  // HANDLERS FOR FUNCTION BLOCK V2
  // ==========================================

  // Trigger manual on-demand FB execution
  const handleTriggerRun = async (execId) => {
    try {
      showToast(`Executing JavaScript block #${execId} in Node.js runtime...`);
      const res = await runFbExecution(execId);
      if (res.success) {
        showToast(`Execution #${execId} SUCCESS: Result ${res.output_value} computed in ${res.duration_ms}ms`, 'success');
      } else {
        showToast(`Execution error: ${res.error}`, 'error');
      }
      const [updatedExecs, updatedActs] = await Promise.all([
        fetchFbExecutions(),
        fetchActivities()
      ]);
      setExecutions(updatedExecs);
      setActivities(updatedActs);
    } catch (err) {
      showToast(`Execution failed: ${err.message}`, 'error');
    }
  };

  // Toggle execution schedule status (ACTIVE vs PAUSED)
  const handleToggleStatus = async (execId) => {
    try {
      const res = await toggleFbExecutionStatus(execId);
      showToast(`Schedule status set to ${res.status}`, 'info');
      const updatedExecs = await fetchFbExecutions();
      setExecutions(updatedExecs);
    } catch (err) {
      showToast('Status toggle failed', 'error');
    }
  };

  // Test JavaScript Code in Node.js Harness
  const handleTestCode = async () => {
    try {
      setTestingCode(true);
      let parsedInputs = {};
      try {
        parsedInputs = JSON.parse(testInputs);
      } catch (e) {
        showToast('Invalid JSON in Test Inputs', 'error');
        setTestingCode(false);
        return;
      }

      const res = await fetch('/api/v1/dm/function-blocks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formula_code: tmplForm.formula_code,
          sample_inputs: parsedInputs
        })
      });
      const data = await res.json();
      setTestOutput(data);
      setTestingCode(false);
      if (data.success) {
        showToast(`Node.js executed successfully in ${data.duration_ms}ms!`, 'success');
      } else {
        showToast(`Node.js script error: ${data.error}`, 'error');
      }
    } catch (err) {
      setTestOutput({ success: false, error: err.message });
      setTestingCode(false);
    }
  };

  // Save or Update Block Template
  const handleSaveTemplate = async () => {
    try {
      const payload = {
        template_code: tmplForm.template_code,
        name: tmplForm.name,
        category: tmplForm.category,
        description: tmplForm.description,
        inputs_schema: JSON.stringify(tmplForm.inputs),
        outputs_schema: JSON.stringify(tmplForm.outputs),
        formula_code: tmplForm.formula_code,
        version: tmplForm.version || 'v2.0'
      };

      if (editingTemplateId) {
        await updateFbTemplate(editingTemplateId, payload);
        showToast(`Block Template '${tmplForm.name}' updated!`, 'success');
      } else {
        await createFbTemplate(payload);
        showToast(`Block Template '${tmplForm.name}' created!`, 'success');
      }
      setIsTemplateModalOpen(false);
      setEditingTemplateId(null);
      const updatedTmpls = await fetchFbTemplates();
      setTemplates(updatedTmpls);
    } catch (err) {
      showToast(`Failed to save template: ${err.message}`, 'error');
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm('Delete this Function Block Template?')) return;
    try {
      await deleteFbTemplate(id);
      showToast('Template deleted', 'info');
      setTemplates(await fetchFbTemplates());
    } catch (err) {
      showToast(`Delete failed: ${err.message}`, 'error');
    }
  };

  // Save or Update Execution
  const handleSaveExecution = async () => {
    try {
      if (!execForm.template_id || !execForm.execution_name) {
        showToast('Please provide an execution name and select a template.', 'error');
        return;
      }
      const payload = {
        execution_name: execForm.execution_name,
        template_id: Number(execForm.template_id),
        target_tag: execForm.target_tag || 'CDU_CALC_OUT.PV',
        schedule_interval: execForm.schedule_interval || '1s',
        input_bindings: JSON.stringify(execForm.bindings)
      };

      if (editingExecutionId) {
        await updateFbExecution(editingExecutionId, payload);
        showToast(`Execution '${execForm.execution_name}' updated!`, 'success');
      } else {
        await createFbExecution(payload);
        showToast(`Execution scheduled successfully!`, 'success');
      }
      setIsExecutionModalOpen(false);
      setEditingExecutionId(null);
      setExecutions(await fetchFbExecutions());
    } catch (err) {
      showToast(`Failed to configure execution: ${err.message}`, 'error');
    }
  };

  const handleDeleteExecution = async (id) => {
    if (!window.confirm('Delete this scheduled execution?')) return;
    try {
      await deleteFbExecution(id);
      showToast('Execution removed', 'info');
      setExecutions(await fetchFbExecutions());
    } catch (err) {
      showToast(`Delete failed: ${err.message}`, 'error');
    }
  };

  // ==========================================
  // HANDLERS FOR OTHER DM ACTIVITIES
  // ==========================================

  // Asset Handlers
  const handleCreateAsset = async () => {
    try {
      await createAssetNode(assetForm);
      showToast(`Asset '${assetForm.name}' created!`, 'success');
      setIsAssetModalOpen(false);
      const tree = await fetchAssetTree();
      setAssetTree(tree);
    } catch (err) {
      showToast(`Failed to create asset: ${err.message}`, 'error');
    }
  };

  const handleDeleteAsset = async (assetId) => {
    if (!window.confirm('Delete this asset node and its sub-hierarchy?')) return;
    try {
      await deleteAssetNode(assetId);
      showToast('Asset deleted', 'info');
      const tree = await fetchAssetTree();
      setAssetTree(tree);
      setSelectedAsset(tree[0] || null);
    } catch (err) {
      showToast(`Failed to delete asset: ${err.message}`, 'error');
    }
  };

  // Tag Handlers
  const handleCreateTag = async () => {
    try {
      await createTag({
        ...tagForm,
        asset_id: selectedAsset ? selectedAsset.id : null
      });
      showToast(`Tag '${tagForm.tag_name}' bound successfully!`, 'success');
      setIsTagModalOpen(false);
      setTagsList(await fetchTagsList());
    } catch (err) {
      showToast(`Failed to bind tag: ${err.message}`, 'error');
    }
  };

  const handleDeleteTag = async (tagName) => {
    if (!window.confirm(`Delete tag ${tagName}?`)) return;
    try {
      await deleteTag(tagName);
      showToast(`Tag ${tagName} deleted`, 'info');
      setTagsList(await fetchTagsList());
    } catch (err) {
      showToast(`Failed to delete tag: ${err.message}`, 'error');
    }
  };

  // Device Handlers
  const handleRegisterDevice = async () => {
    try {
      await createDevice(devForm);
      showToast('Device registered successfully!', 'success');
      setIsDeviceModalOpen(false);
      setDevices(await fetchDevices());
    } catch (err) {
      showToast(`Device registration failed: ${err.message}`, 'error');
    }
  };

  const handlePingDevice = async (id) => {
    try {
      const res = await pingDevice(id);
      showToast(`Pinged ${res.device}: ${res.status} (${res.latency_ms}ms)`, 'success');
      setDevices(await fetchDevices());
    } catch (err) {
      showToast(`Ping failed: ${err.message}`, 'error');
    }
  };

  const handleInspectDiagnostics = async (id) => {
    try {
      const diag = await fetchDeviceDiagnostics(id);
      setDeviceDiagnosticsModal(diag);
    } catch (err) {
      showToast('Failed to read diagnostics', 'error');
    }
  };

  const handleDeleteDevice = async (id) => {
    if (!window.confirm('Remove field device from fleet?')) return;
    try {
      await deleteDevice(id);
      showToast('Device removed', 'info');
      setDevices(await fetchDevices());
    } catch (err) {
      showToast(`Remove failed: ${err.message}`, 'error');
    }
  };

  // Broker Handlers
  const handleRegisterBroker = async () => {
    try {
      await createBroker(brokerForm);
      showToast(`Broker '${brokerForm.name}' configured!`, 'success');
      setIsBrokerModalOpen(false);
      setBrokers(await fetchBrokers());
    } catch (err) {
      showToast(`Failed to register broker: ${err.message}`, 'error');
    }
  };

  const handleTestBroker = async (brokerId) => {
    try {
      const res = await testBroker(brokerId);
      showToast(`Broker Test: ${res.message} (${res.latency_ms}ms)`, 'success');
      setBrokers(await fetchBrokers());
    } catch (err) {
      showToast(`Broker test failed: ${err.message}`, 'error');
    }
  };

  const handleDeleteBroker = async (brokerId) => {
    if (!window.confirm('Delete broker configuration?')) return;
    try {
      await deleteBroker(brokerId);
      showToast('Broker configuration removed', 'info');
      setBrokers(await fetchBrokers());
    } catch (err) {
      showToast(`Failed to delete broker: ${err.message}`, 'error');
    }
  };

  // Alarm Handlers
  const handleCreateAlarmRule = async () => {
    try {
      await createAlarmRule(ruleForm);
      showToast('Alarm rule created successfully!', 'success');
      setIsAlarmRuleModalOpen(false);
      setAlarmRules(await fetchAlarmRules());
    } catch (err) {
      showToast(`Failed to create alarm rule: ${err.message}`, 'error');
    }
  };

  const handleDeleteAlarmRule = async (ruleId) => {
    try {
      await deleteAlarmRule(ruleId);
      showToast('Alarm rule deleted', 'info');
      setAlarmRules(await fetchAlarmRules());
    } catch (err) {
      showToast(`Failed to delete alarm rule: ${err.message}`, 'error');
    }
  };

  const handleAckAlarm = async (eventId) => {
    try {
      await ackAlarmEvent(eventId);
      showToast('Alarm event acknowledged', 'success');
      setAlarmEvents(await fetchAlarmEvents());
    } catch (err) {
      showToast(`Ack failed: ${err.message}`, 'error');
    }
  };

  const handleShelveAlarm = async (eventId) => {
    try {
      await shelveAlarmEvent(eventId);
      showToast('Alarm event shelved for 30m', 'info');
      setAlarmEvents(await fetchAlarmEvents());
    } catch (err) {
      showToast(`Shelve failed: ${err.message}`, 'error');
    }
  };

  const handleClearAlarm = async (eventId) => {
    try {
      await clearAlarmEvent(eventId);
      showToast('Alarm cleared', 'info');
      setAlarmEvents(await fetchAlarmEvents());
    } catch (err) {
      showToast(`Clear failed: ${err.message}`, 'error');
    }
  };

  // Classic FB Handlers
  const handleCreateClassicFB = async () => {
    try {
      await createClassicFB(classicForm);
      showToast(`Classic controller '${classicForm.tag_name}' created!`, 'success');
      setIsClassicModalOpen(false);
      setClassicFBs(await fetchClassicFBs());
    } catch (err) {
      showToast(`Failed to create classic FB: ${err.message}`, 'error');
    }
  };

  const handleApplyTuning = async () => {
    if (!tuningBlock) return;
    try {
      await tuneClassicFB(tuningBlock.id, {
        kp: tuningBlock.kp,
        ti: tuningBlock.ti,
        td: tuningBlock.td,
        sp: tuningBlock.sp,
        mode: tuningBlock.mode
      });
      showToast(`Tuning parameters applied to ${tuningBlock.tag_name}!`, 'success');
      setTuningBlock(null);
      setClassicFBs(await fetchClassicFBs());
    } catch (err) {
      showToast(`Failed to tune controller: ${err.message}`, 'error');
    }
  };

  // Config Handlers
  const handleSaveConfig = async () => {
    try {
      await updateSystemConfig(systemConfig);
      showToast('System configuration saved successfully!', 'success');
    } catch (err) {
      showToast(`Config save failed: ${err.message}`, 'error');
    }
  };

  // Security Handlers
  const handleCreateUser = async () => {
    try {
      await createSecurityUser(userForm);
      showToast(`User account '${userForm.username}' added!`, 'success');
      setIsUserModalOpen(false);
      setSecurityUsers(await fetchSecurityUsers());
    } catch (err) {
      showToast(`Failed to add user: ${err.message}`, 'error');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Delete this user account?')) return;
    try {
      await deleteSecurityUser(userId);
      showToast('User deleted', 'info');
      setSecurityUsers(await fetchSecurityUsers());
    } catch (err) {
      showToast(`Delete failed: ${err.message}`, 'error');
    }
  };

  const handleCreateApiKey = async () => {
    try {
      const res = await createSecurityApiKey(apiKeyForm);
      setGeneratedKeyResult(res);
      showToast('API Key generated successfully!', 'success');
      setSecurityApiKeys(await fetchSecurityApiKeys());
    } catch (err) {
      showToast(`API Key creation failed: ${err.message}`, 'error');
    }
  };

  const handleRevokeApiKey = async (keyId) => {
    if (!window.confirm('Revoke this API Key?')) return;
    try {
      await revokeSecurityApiKey(keyId);
      showToast('API Key revoked', 'info');
      setSecurityApiKeys(await fetchSecurityApiKeys());
    } catch (err) {
      showToast(`Revocation failed: ${err.message}`, 'error');
    }
  };

  return (
    <div style={{
      display: 'flex',
      height: 'calc(100vh - 58px)',
      background: '#0a0d14',
      color: '#e2e8f0',
      overflow: 'hidden',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* ========================================================================= */}
      {/* YOKOGAWA DATA MANAGEMENT SIDEBAR (Matches uploaded screenshot exactly)   */}
      {/* ========================================================================= */}
      <div style={{
        width: '260px',
        background: '#0d111a',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none'
      }}>
        {/* DM Platform Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            background: 'linear-gradient(135deg, #0284c7, #2563eb)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 800,
            fontSize: '12px'
          }}>
            DM
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', letterSpacing: '0.3px' }}>
              Data Management
            </div>
            <div style={{ fontSize: '0.68rem', color: '#38bdf8' }}>
              Yokogawa OpreX AHI
            </div>
          </div>
        </div>

        {/* Sidebar Nav Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }}>
          <NavItem icon={<Home size={16} />} label="Home" active={activeMenu === 'home'} onClick={() => setActiveMenu('home')} />
          <NavItem icon={<Layers size={16} />} label="Asset Management" hasDropdown active={activeMenu === 'asset_mgt'} onClick={() => setActiveMenu('asset_mgt')} />
          <NavItem icon={<Search size={16} />} label="Data Explorer" hasDropdown active={activeMenu === 'data_explorer'} onClick={() => setActiveMenu('data_explorer')} />
          <NavItem icon={<Cpu size={16} />} label="Function Block" hasDropdown active={activeMenu === 'fb_classic'} onClick={() => setActiveMenu('fb_classic')} />

          {/* Function Block V2 Expandable */}
          <div style={{ marginBottom: '2px' }}>
            <div
              onClick={() => setFbV2Expanded(!fbV2Expanded)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                color: activeMenu.startsWith('fb_') ? '#38bdf8' : '#cbd5e1',
                fontSize: '0.82rem',
                fontWeight: 500,
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Cpu size={16} color="#38bdf8" />
                <span>Function Block V2</span>
              </div>
              {fbV2Expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>

            {fbV2Expanded && (
              <div style={{ paddingLeft: '32px', display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
                <SubNavItem icon={<Layers size={14} />} label="Block Template" active={activeMenu === 'fb_template'} onClick={() => setActiveMenu('fb_template')} />
                <SubNavItem icon={<RefreshCw size={14} />} label="Block Execution" active={activeMenu === 'fb_execution'} onClick={() => setActiveMenu('fb_execution')} />
              </div>
            )}
          </div>

          <NavItem icon={<Radio size={16} />} label="Device Management" hasDropdown active={activeMenu === 'devices'} onClick={() => setActiveMenu('devices')} />
          <NavItem icon={<Activity size={16} />} label="Alarm Management" hasDropdown active={activeMenu === 'alarms'} onClick={() => setActiveMenu('alarms')} />
          <NavItem icon={<Server size={16} />} label="Broker Management" hasDropdown active={activeMenu === 'brokers'} onClick={() => setActiveMenu('brokers')} />
          <NavItem icon={<Settings size={16} />} label="Configuration" hasDropdown active={activeMenu === 'config'} onClick={() => setActiveMenu('config')} />
          <NavItem icon={<Shield size={16} />} label="Security" hasDropdown active={activeMenu === 'security'} onClick={() => setActiveMenu('security')} />
          <NavItem icon={<FileText size={16} />} label="Activity Log" hasDropdown active={activeMenu === 'activity_log'} onClick={() => setActiveMenu('activity_log')} />
        </div>

        {/* Quick jump to Data Insight (Dashboards) */}
        <div style={{
          padding: '14px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          background: '#090d14'
        }}>
          <button
            onClick={onNavigateToDI}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #0369a1, #1d4ed8)',
              border: '1px solid #38bdf8',
              color: '#fff',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <span>Launch Data Insight (Dashboards)</span>
            <ExternalLink size={13} />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN DM WORKSPACE AREA                                                    */}
      {/* ========================================================================= */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top Breadcrumb Bar */}
        <div style={{
          height: '46px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: '#0d111a',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem' }}>
            <span style={{ color: '#64748b' }}>Yokogawa DM</span>
            <span style={{ color: '#475569' }}>/</span>
            <span style={{ color: '#f8fafc', fontWeight: 600, textTransform: 'capitalize' }}>
              {activeMenu.replace('_', ' ')}
            </span>
          </div>

          {feedback && (
            <div style={{
              fontSize: '0.75rem',
              color: feedback.type === 'error' ? '#ef4444' : feedback.type === 'success' ? '#10b981' : '#38bdf8',
              background: feedback.type === 'error' ? 'rgba(239,68,68,0.1)' : feedback.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(56, 189, 248, 0.1)',
              padding: '4px 12px',
              borderRadius: '4px',
              border: '1px solid currentColor'
            }}>
              {feedback.msg}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={loadAllDmData}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={12} /> Sync DM
            </button>
          </div>
        </div>

        {/* Dynamic Workspace Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {activeMenu === 'home' && renderHomeView()}
          {activeMenu === 'asset_mgt' && renderAssetManagementView()}
          {activeMenu === 'data_explorer' && renderDataExplorerView()}
          {activeMenu === 'fb_classic' && renderFbClassicView()}
          {activeMenu === 'fb_template' && renderFbTemplateView()}
          {activeMenu === 'fb_execution' && renderFbExecutionView()}
          {activeMenu === 'devices' && renderDeviceManagementView()}
          {activeMenu === 'alarms' && renderAlarmManagementView()}
          {activeMenu === 'brokers' && renderBrokerManagementView()}
          {activeMenu === 'config' && renderConfigurationView()}
          {activeMenu === 'security' && renderSecurityView()}
          {activeMenu === 'activity_log' && renderActivityLogView()}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ALL INTERACTIVE MODALS FOR COMPLETE DM ACTIVITIES                         */}
      {/* ========================================================================= */}

      {/* 1. Create/Edit Block Template Modal (JavaScript Monaco/Text Editor & Test Harness) */}
      {isTemplateModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1200 }}>
          <div className="modal-content" style={{
            width: '980px',
            maxWidth: '95vw',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            background: '#131822',
            border: '1px solid #1e3a8a',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f8fafc' }}>
                  {editingTemplateId ? 'Edit Function Block V2 Template' : 'Create Function Block V2 Template'}
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                  Define input arguments, outputs schema, and author custom JavaScript execution logic for Node.js runtime.
                </p>
              </div>
              <button onClick={() => { setIsTemplateModalOpen(false); setEditingTemplateId(null); }} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '18px', overflowY: 'auto', flex: 1, paddingRight: '8px' }}>
              {/* Left Column: Properties & Input/Output Schema */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Template Code</label>
                    <input
                      type="text"
                      value={tmplForm.template_code}
                      onChange={(e) => setTmplForm({ ...tmplForm, template_code: e.target.value })}
                      style={{ width: '100%', padding: '6px 10px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#38bdf8', fontFamily: 'monospace' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Category</label>
                    <select
                      value={tmplForm.category}
                      onChange={(e) => setTmplForm({ ...tmplForm, category: e.target.value })}
                      style={{ width: '100%', padding: '6px 10px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }}
                    >
                      <option value="Analytics">Analytics</option>
                      <option value="Calculation">Calculation</option>
                      <option value="Anomaly">Anomaly Detection</option>
                      <option value="Health">Equipment Health</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Template Name</label>
                  <input
                    type="text"
                    value={tmplForm.name}
                    onChange={(e) => setTmplForm({ ...tmplForm, name: e.target.value })}
                    style={{ width: '100%', padding: '6px 10px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Description</label>
                  <textarea
                    rows={2}
                    value={tmplForm.description}
                    onChange={(e) => setTmplForm({ ...tmplForm, description: e.target.value })}
                    style={{ width: '100%', padding: '6px 10px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#cbd5e1', fontSize: '0.75rem' }}
                  />
                </div>

                {/* Input Arguments Schema Builder */}
                <div style={{ background: '#10141d', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#38bdf8' }}>Input Arguments Schema ({tmplForm.inputs.length})</span>
                    <button
                      type="button"
                      onClick={() => setTmplForm({
                        ...tmplForm,
                        inputs: [...tmplForm.inputs, { name: `arg_${tmplForm.inputs.length + 1}`, type: 'Float', unit: '', default: 0 }]
                      })}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.68rem', padding: '2px 6px' }}
                    >
                      + Add Input
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '120px', overflowY: 'auto' }}>
                    {tmplForm.inputs.map((inp, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <input
                          type="text"
                          placeholder="Name"
                          value={inp.name}
                          onChange={(e) => {
                            const updated = [...tmplForm.inputs];
                            updated[idx].name = e.target.value;
                            setTmplForm({ ...tmplForm, inputs: updated });
                          }}
                          style={{ flex: 1, padding: '3px 6px', background: '#1a2232', border: '1px solid #334155', borderRadius: '3px', color: '#38bdf8', fontSize: '0.72rem', fontFamily: 'monospace' }}
                        />
                        <select
                          value={inp.type}
                          onChange={(e) => {
                            const updated = [...tmplForm.inputs];
                            updated[idx].type = e.target.value;
                            setTmplForm({ ...tmplForm, inputs: updated });
                          }}
                          style={{ width: '80px', padding: '3px 6px', background: '#1a2232', border: '1px solid #334155', borderRadius: '3px', color: '#fff', fontSize: '0.72rem' }}
                        >
                          <option value="Float">Float</option>
                          <option value="String">String</option>
                          <option value="Boolean">Boolean</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Unit"
                          value={inp.unit || ''}
                          onChange={(e) => {
                            const updated = [...tmplForm.inputs];
                            updated[idx].unit = e.target.value;
                            setTmplForm({ ...tmplForm, inputs: updated });
                          }}
                          style={{ width: '60px', padding: '3px 6px', background: '#1a2232', border: '1px solid #334155', borderRadius: '3px', color: '#fff', fontSize: '0.72rem' }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = tmplForm.inputs.filter((_, i) => i !== idx);
                            setTmplForm({ ...tmplForm, inputs: updated });
                          }}
                          style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preset Snippet Loader */}
                <div style={{ background: '#10141d', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Load Yokogawa Standard Algorithm Snippet:</label>
                  <select
                    onChange={(e) => {
                      const snip = PRESET_SNIPPETS[e.target.value];
                      if (snip) {
                        setTmplForm({
                          ...tmplForm,
                          name: snip.name,
                          formula_code: snip.code
                        });
                        showToast(`Loaded ${snip.name} snippet`, 'info');
                      }
                    }}
                    defaultValue=""
                    style={{ width: '100%', padding: '5px 8px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#38bdf8', fontSize: '0.75rem' }}
                  >
                    <option value="" disabled>-- Select Preset Algorithm --</option>
                    <option value="ANOMALY">Mahalanobis-Taguchi Multivariate Anomaly</option>
                    <option value="DELTA_T">Distillation Column Thermal Delta T</option>
                    <option value="CAVITATION">Centrifugal Pump Cavitation Risk</option>
                    <option value="HEAT_EXCHANGER">Heat Exchanger Duty (Q = m*Cp*dT)</option>
                  </select>
                </div>
              </div>

              {/* Right Column: Monospace JavaScript Editor & Interactive Node.js Test Harness */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: 600 }}>JavaScript Code (ECMAScript / Node.js Engine)</label>
                  <span style={{ fontSize: '0.7rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Code size={12} /> Node.js v24.18.0
                  </span>
                </div>
                <textarea
                  rows={11}
                  value={tmplForm.formula_code}
                  onChange={(e) => setTmplForm({ ...tmplForm, formula_code: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: '#090d14',
                    border: '1px solid #0284c7',
                    borderRadius: '6px',
                    color: '#38bdf8',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '0.72rem',
                    lineHeight: '1.4'
                  }}
                />

                {/* Interactive Test Harness */}
                <div style={{ background: '#10141d', padding: '12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#cbd5e1' }}>Test Execution with Sample Inputs JSON:</span>
                    <button
                      onClick={handleTestCode}
                      disabled={testingCode}
                      className="btn btn-primary"
                      style={{ fontSize: '0.7rem', padding: '3px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Play size={10} /> {testingCode ? 'Running in Node.js...' : 'Run Test Script'}
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={testInputs}
                    onChange={(e) => setTestInputs(e.target.value)}
                    style={{ width: '100%', background: '#090d14', border: '1px solid #334155', borderRadius: '4px', color: '#10b981', fontFamily: 'monospace', fontSize: '0.72rem', padding: '6px' }}
                  />

                  {testOutput && (
                    <div style={{ marginTop: '8px', fontSize: '0.72rem', padding: '8px', borderRadius: '4px', background: testOutput.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: testOutput.success ? '#10b981' : '#ef4444', border: `1px solid ${testOutput.success ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                      {testOutput.success ? (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <strong>Success Output:</strong>
                            <span style={{ color: '#38bdf8' }}>Executed in {testOutput.duration_ms} ms</span>
                          </div>
                          <pre style={{ margin: 0, maxHeight: '80px', overflowY: 'auto' }}>{JSON.stringify(testOutput.result, null, 2)}</pre>
                          {testOutput.logs && testOutput.logs.length > 0 && (
                            <div style={{ marginTop: '4px', color: '#94a3b8', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '4px' }}>
                              <em>Console Logs:</em> {testOutput.logs.join(' | ')}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <strong>Execution Error:</strong>
                          <div>{testOutput.error}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px' }}>
              <button className="btn" onClick={() => { setIsTemplateModalOpen(false); setEditingTemplateId(null); }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveTemplate}>
                {editingTemplateId ? 'Update Block Template' : 'Save Block Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Configure/Schedule Block Execution Modal */}
      {isExecutionModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1200 }}>
          <div className="modal-content" style={{
            width: '680px',
            maxWidth: '95vw',
            background: '#131822',
            border: '1px solid #1e3a8a',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f8fafc' }}>
                  {editingExecutionId ? 'Edit Block Execution' : 'Schedule Function Block Execution'}
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                  Bind JavaScript template arguments to plant telemetry tags and set execution interval.
                </p>
              </div>
              <button onClick={() => { setIsExecutionModalOpen(false); setEditingExecutionId(null); }} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Execution Name</label>
                <input
                  type="text"
                  placeholder="e.g., CDU Overhead Separation Efficiency"
                  value={execForm.execution_name}
                  onChange={(e) => setExecForm({ ...execForm, execution_name: e.target.value })}
                  style={{ width: '100%', padding: '6px 10px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Select Block Template</label>
                  <select
                    value={execForm.template_id}
                    onChange={(e) => {
                      const tmpl = templates.find(t => t.id === Number(e.target.value));
                      const defaultBindings = {};
                      if (tmpl) {
                        tmpl.inputs_schema.forEach(inp => {
                          defaultBindings[inp.name] = tagsList[0]?.tag_name || '';
                        });
                      }
                      setExecForm({ ...execForm, template_id: e.target.value, bindings: defaultBindings });
                    }}
                    style={{ width: '100%', padding: '6px 10px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#38bdf8' }}
                  >
                    <option value="">-- Choose Template --</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.template_code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Schedule Interval</label>
                  <select
                    value={execForm.schedule_interval}
                    onChange={(e) => setExecForm({ ...execForm, schedule_interval: e.target.value })}
                    style={{ width: '100%', padding: '6px 10px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }}
                  >
                    <option value="1s">Every 1 second (High Speed Real-time)</option>
                    <option value="5s">Every 5 seconds</option>
                    <option value="10s">Every 10 seconds</option>
                    <option value="30s">Every 30 seconds</option>
                    <option value="1m">Every 1 minute</option>
                    <option value="5m">Every 5 minutes</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Target Output Calculated Tag</label>
                <input
                  type="text"
                  placeholder="e.g., CDU_EFFICIENCY.CALC"
                  value={execForm.target_tag}
                  onChange={(e) => setExecForm({ ...execForm, target_tag: e.target.value })}
                  style={{ width: '100%', padding: '6px 10px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#10b981', fontFamily: 'monospace' }}
                />
              </div>

              {/* Tag Binding Mapping */}
              {execForm.template_id && (
                <div style={{ background: '#10141d', padding: '12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#38bdf8', marginBottom: '8px' }}>
                    Bind Template Arguments to Live Plant Telemetry Tags:
                  </div>
                  {Object.keys(execForm.bindings).map(argName => (
                    <div key={argName} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.75rem', color: '#cbd5e1', fontFamily: 'monospace' }}>{argName}:</span>
                      <select
                        value={execForm.bindings[argName]}
                        onChange={(e) => {
                          const updated = { ...execForm.bindings, [argName]: e.target.value };
                          setExecForm({ ...execForm, bindings: updated });
                        }}
                        style={{ width: '320px', padding: '4px 8px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#38bdf8', fontSize: '0.75rem' }}
                      >
                        {tagsList.map(t => (
                          <option key={t.tag_name} value={t.tag_name}>{t.tag_name} ({t.display_name})</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px' }}>
              <button className="btn" onClick={() => { setIsExecutionModalOpen(false); setEditingExecutionId(null); }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveExecution}>
                {editingExecutionId ? 'Save Changes' : 'Activate Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Execution Diagnostic Log Modal */}
      {viewLogExecution && (
        <div className="modal-backdrop" style={{ zIndex: 1200 }}>
          <div className="modal-content" style={{ width: '650px', maxWidth: '95vw', background: '#131822', border: '1px solid #1e3a8a', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#f8fafc' }}>Execution Diagnostic Log: {viewLogExecution.execution_name}</h3>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Target Tag: {viewLogExecution.target_tag} | Interval: {viewLogExecution.schedule_interval}</span>
              </div>
              <button onClick={() => setViewLogExecution(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ background: '#090d14', padding: '14px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.75rem', color: '#38bdf8', maxHeight: '350px', overflowY: 'auto', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
              {viewLogExecution.execution_log || 'No detailed log recorded yet.'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px' }}>
              <span style={{ fontSize: '0.72rem', color: '#10b981' }}>Last Execution Duration: {viewLogExecution.last_execution_ms} ms</span>
              <button className="btn" onClick={() => setViewLogExecution(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Register Field Device Modal */}
      {isDeviceModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1200 }}>
          <div className="modal-content" style={{ width: '560px', maxWidth: '95vw', background: '#131822', border: '1px solid #1e3a8a', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#f8fafc' }}>Register Yokogawa Field Device</h3>
              <button onClick={() => setIsDeviceModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Device Identifier</label>
                <input type="text" value={devForm.device_id} onChange={(e) => setDevForm({ ...devForm, device_id: e.target.value })} style={{ width: '100%', padding: '6px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#38bdf8', fontFamily: 'monospace' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Instrument Name</label>
                <input type="text" value={devForm.name} onChange={(e) => setDevForm({ ...devForm, name: e.target.value })} style={{ width: '100%', padding: '6px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Model</label>
                  <input type="text" value={devForm.model} onChange={(e) => setDevForm({ ...devForm, model: e.target.value })} style={{ width: '100%', padding: '6px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Protocol</label>
                  <select value={devForm.protocol} onChange={(e) => setDevForm({ ...devForm, protocol: e.target.value })} style={{ width: '100%', padding: '6px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }}>
                    <option value="HART 7">HART 7</option>
                    <option value="Foundation Fieldbus H1">Foundation Fieldbus H1</option>
                    <option value="Modbus TCP">Modbus TCP</option>
                    <option value="WirelessHART / ISA100">WirelessHART / ISA100</option>
                    <option value="OPC UA">OPC UA</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>IP Address / Loop Address</label>
                <input type="text" value={devForm.ip_address} onChange={(e) => setDevForm({ ...devForm, ip_address: e.target.value })} style={{ width: '100%', padding: '6px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#cbd5e1' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button className="btn" onClick={() => setIsDeviceModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleRegisterDevice}>Register Device</button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Device Diagnostics Modal */}
      {deviceDiagnosticsModal && (
        <div className="modal-backdrop" style={{ zIndex: 1200 }}>
          <div className="modal-content" style={{ width: '600px', maxWidth: '95vw', background: '#131822', border: '1px solid #1e3a8a', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#f8fafc' }}>
                  Field Instrument Diagnostics: {deviceDiagnosticsModal.name}
                </h3>
                <span style={{ fontSize: '0.72rem', color: '#38bdf8' }}>{deviceDiagnosticsModal.model} ({deviceDiagnosticsModal.protocol})</span>
              </div>
              <button onClick={() => setDeviceDiagnosticsModal(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div style={{ background: '#090d14', padding: '10px', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Primary Variable (PV)</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#38bdf8' }}>{deviceDiagnosticsModal.primary_variable.val} {deviceDiagnosticsModal.primary_variable.unit}</div>
              </div>
              <div style={{ background: '#090d14', padding: '10px', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Loop Current (QV)</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#10b981' }}>{deviceDiagnosticsModal.tertiary_variable.val} {deviceDiagnosticsModal.tertiary_variable.unit}</div>
              </div>
            </div>

            <div style={{ background: '#10141d', padding: '12px', borderRadius: '6px', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '6px', color: '#cbd5e1' }}>
              <div>Signal Health: <strong style={{ color: '#10b981' }}>{deviceDiagnosticsModal.signal_health}</strong></div>
              <div>Sensor Zero Trim: <strong>{deviceDiagnosticsModal.sensor_trim.zero_trim}</strong> | Span: <strong>{deviceDiagnosticsModal.sensor_trim.span_trim}</strong></div>
              <div>Calibration Verified: <strong>{deviceDiagnosticsModal.sensor_trim.last_calibrated}</strong></div>
              <div>Diagnostics Summary: <em>{deviceDiagnosticsModal.diagnostics_summary}</em></div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button className="btn" onClick={() => setDeviceDiagnosticsModal(null)}>Close Diagnostics</button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Add/Edit Asset Modal */}
      {isAssetModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1200 }}>
          <div className="modal-content" style={{ width: '500px', maxWidth: '95vw', background: '#131822', border: '1px solid #1e3a8a', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#f8fafc' }}>Add Asset to Hierarchy (ISA-95)</h3>
              <button onClick={() => setIsAssetModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Asset Name</label>
                <input type="text" placeholder="e.g., Heavy Gas Oil Stripper C-202" value={assetForm.name} onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })} style={{ width: '100%', padding: '6px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Hierarchy Level</label>
                  <select value={assetForm.level} onChange={(e) => setAssetForm({ ...assetForm, level: e.target.value })} style={{ width: '100%', padding: '6px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }}>
                    <option value="SITE">SITE</option>
                    <option value="AREA">AREA</option>
                    <option value="UNIT">UNIT</option>
                    <option value="EQUIPMENT">EQUIPMENT</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Hierarchy Path</label>
                  <input type="text" placeholder="e.g., YGE/SGP-JURONG/C-202" value={assetForm.path} onChange={(e) => setAssetForm({ ...assetForm, path: e.target.value })} style={{ width: '100%', padding: '6px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#38bdf8', fontFamily: 'monospace' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Description</label>
                <textarea rows={2} value={assetForm.description} onChange={(e) => setAssetForm({ ...assetForm, description: e.target.value })} style={{ width: '100%', padding: '6px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#cbd5e1' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button className="btn" onClick={() => setIsAssetModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateAsset}>Create Asset</button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Add Tag to Asset Modal */}
      {isTagModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1200 }}>
          <div className="modal-content" style={{ width: '500px', maxWidth: '95vw', background: '#131822', border: '1px solid #1e3a8a', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#f8fafc' }}>Bind Process Tag to {selectedAsset?.name || 'Asset'}</h3>
              <button onClick={() => setIsTagModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Tag Identifier (CENTUM VP / DCS)</label>
                <input type="text" placeholder="e.g., TIC_202.PV" value={tagForm.tag_name} onChange={(e) => setTagForm({ ...tagForm, tag_name: e.target.value })} style={{ width: '100%', padding: '6px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#38bdf8', fontFamily: 'monospace' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Display Label</label>
                <input type="text" placeholder="e.g., Stripper Bottom Temperature" value={tagForm.display_name} onChange={(e) => setTagForm({ ...tagForm, display_name: e.target.value })} style={{ width: '100%', padding: '6px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Units</label>
                  <input type="text" value={tagForm.eng_units} onChange={(e) => setTagForm({ ...tagForm, eng_units: e.target.value })} style={{ width: '100%', padding: '6px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Min Range</label>
                  <input type="number" value={tagForm.min_range} onChange={(e) => setTagForm({ ...tagForm, min_range: Number(e.target.value) })} style={{ width: '100%', padding: '6px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Max Range</label>
                  <input type="number" value={tagForm.max_range} onChange={(e) => setTagForm({ ...tagForm, max_range: Number(e.target.value) })} style={{ width: '100%', padding: '6px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button className="btn" onClick={() => setIsTagModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateTag}>Bind Tag</button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Add Alarm Rule Modal */}
      {isAlarmRuleModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1200 }}>
          <div className="modal-content" style={{ width: '520px', maxWidth: '95vw', background: '#131822', border: '1px solid #1e3a8a', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#f8fafc' }}>Configure ISA-18.2 Alarm Trip Rule</h3>
              <button onClick={() => setIsAlarmRuleModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Process Tag</label>
                <select value={ruleForm.tag_name} onChange={(e) => setRuleForm({ ...ruleForm, tag_name: e.target.value })} style={{ width: '100%', padding: '6px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#38bdf8' }}>
                  {tagsList.map(t => (
                    <option key={t.tag_name} value={t.tag_name}>{t.tag_name} ({t.display_name})</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Trip Condition</label>
                  <select value={ruleForm.condition} onChange={(e) => setRuleForm({ ...ruleForm, condition: e.target.value })} style={{ width: '100%', padding: '6px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }}>
                    <option value="GT">High (&gt; Threshold)</option>
                    <option value="GTE">High-High (&gt;= Threshold)</option>
                    <option value="LT">Low (&lt; Threshold)</option>
                    <option value="LTE">Low-Low (&lt;= Threshold)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Trip Threshold</label>
                  <input type="number" step="0.1" value={ruleForm.threshold} onChange={(e) => setRuleForm({ ...ruleForm, threshold: Number(e.target.value) })} style={{ width: '100%', padding: '6px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#ef4444', fontWeight: 700 }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Severity Priority</label>
                <select value={ruleForm.severity} onChange={(e) => setRuleForm({ ...ruleForm, severity: e.target.value })} style={{ width: '100%', padding: '6px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }}>
                  <option value="CRITICAL">CRITICAL (Emergency Action Required)</option>
                  <option value="WARNING">WARNING (Prompt Action Required)</option>
                  <option value="INFO">INFO (Advisory Only)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Alarm Dispatch Message</label>
                <input type="text" value={ruleForm.message} onChange={(e) => setRuleForm({ ...ruleForm, message: e.target.value })} style={{ width: '100%', padding: '6px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button className="btn" onClick={() => setIsAlarmRuleModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateAlarmRule}>Arm Alarm Rule</button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Classic DCS Function Block Tuning Modal */}
      {tuningBlock && (
        <div className="modal-backdrop" style={{ zIndex: 1200 }}>
          <div className="modal-content" style={{ width: '520px', maxWidth: '95vw', background: '#131822', border: '1px solid #1e3a8a', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#f8fafc' }}>Tune Regulatory Controller: {tuningBlock.tag_name}</h3>
                <span style={{ fontSize: '0.72rem', color: '#38bdf8' }}>{tuningBlock.description}</span>
              </div>
              <button onClick={() => setTuningBlock(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Setpoint (SP)</label>
                  <input type="number" step="0.5" value={tuningBlock.sp} onChange={(e) => setTuningBlock({ ...tuningBlock, sp: Number(e.target.value) })} style={{ width: '100%', padding: '6px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#10b981', fontWeight: 700 }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Control Mode</label>
                  <select value={tuningBlock.mode} onChange={(e) => setTuningBlock({ ...tuningBlock, mode: e.target.value })} style={{ width: '100%', padding: '6px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }}>
                    <option value="AUT">AUT (Automatic Closed Loop)</option>
                    <option value="MAN">MAN (Manual Operator Control)</option>
                    <option value="CAS">CAS (Cascade Slave)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Gain (Kp)</label>
                  <input type="number" step="0.05" value={tuningBlock.kp} onChange={(e) => setTuningBlock({ ...tuningBlock, kp: Number(e.target.value) })} style={{ width: '100%', padding: '6px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#38bdf8' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Reset (Ti sec)</label>
                  <input type="number" step="5" value={tuningBlock.ti} onChange={(e) => setTuningBlock({ ...tuningBlock, ti: Number(e.target.value) })} style={{ width: '100%', padding: '6px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#38bdf8' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Rate (Td sec)</label>
                  <input type="number" step="1" value={tuningBlock.td} onChange={(e) => setTuningBlock({ ...tuningBlock, td: Number(e.target.value) })} style={{ width: '100%', padding: '6px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#38bdf8' }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button className="btn" onClick={() => setTuningBlock(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleApplyTuning}>Apply Live Tuning</button>
            </div>
          </div>
        </div>
      )}

      {/* 10. Add User Modal */}
      {isUserModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1200 }}>
          <div className="modal-content" style={{ width: '480px', maxWidth: '95vw', background: '#131822', border: '1px solid #1e3a8a', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#f8fafc' }}>Add Enterprise Operator / Engineer</h3>
              <button onClick={() => setIsUserModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Username</label>
                <input type="text" placeholder="e.g., s.alvarez" value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} style={{ width: '100%', padding: '6px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#38bdf8' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Full Name</label>
                <input type="text" placeholder="e.g., Sofia Alvarez" value={userForm.full_name} onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })} style={{ width: '100%', padding: '6px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Email Address</label>
                <input type="email" placeholder="e.g., s.alvarez@yokogawa.com" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} style={{ width: '100%', padding: '6px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Assigned RBAC Role</label>
                <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })} style={{ width: '100%', padding: '6px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }}>
                  <option value="Process Reliability Engineer">Process Reliability Engineer</option>
                  <option value="DCS Board Operator">DCS Board Operator</option>
                  <option value="Plant Administrator">Plant Administrator</option>
                  <option value="Compliance Auditor">Compliance Auditor (Read-Only)</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button className="btn" onClick={() => setIsUserModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateUser}>Create Account</button>
            </div>
          </div>
        </div>
      )}

      {/* 11. Generate API Key Modal */}
      {isApiKeyModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1200 }}>
          <div className="modal-content" style={{ width: '480px', maxWidth: '95vw', background: '#131822', border: '1px solid #1e3a8a', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#f8fafc' }}>Generate Ingestion API Key</h3>
              <button onClick={() => { setIsApiKeyModalOpen(false); setGeneratedKeyResult(null); }} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            {generatedKeyResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600, marginBottom: '4px' }}>API Key Generated! Copy it now (will not be displayed again):</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#f8fafc', background: '#090d14', padding: '8px', borderRadius: '4px', wordBreak: 'break-all' }}>
                    {generatedKeyResult.raw_secret}
                  </div>
                </div>
                <button className="btn btn-primary" onClick={() => { setIsApiKeyModalOpen(false); setGeneratedKeyResult(null); }}>Done</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Integration Name</label>
                  <input type="text" value={apiKeyForm.name} onChange={(e) => setApiKeyForm({ ...apiKeyForm, name: e.target.value })} style={{ width: '100%', padding: '6px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Access Scope</label>
                  <input type="text" value={apiKeyForm.scope} onChange={(e) => setApiKeyForm({ ...apiKeyForm, scope: e.target.value })} style={{ width: '100%', padding: '6px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#38bdf8', fontFamily: 'monospace' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                  <button className="btn" onClick={() => setIsApiKeyModalOpen(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleCreateApiKey}>Generate Key</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // =========================================================================
  // RENDER VIEWS FOR ALL DM ACTIVITIES
  // =========================================================================

  function renderHomeView() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 6px 0', color: '#f8fafc' }}>
            Yokogawa OpreX Data Management (DM) Control Hub
          </h2>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>
            Enterprise ISA-95 Asset Topology, JavaScript Function Block V2 Engine, Field Instrument Fleet, and Data Model Broker.
          </p>
        </div>

        {/* 6 Metric KPI Hero Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '14px' }}>
          <KpiCard label="Total Plant Assets" value={overview?.asset_count || 7} sub="Enterprise to Equipment" icon={<Layers color="#38bdf8" />} />
          <KpiCard label="Bound Process Tags" value={overview?.tag_count || 21} sub="CENTUM VP & AHI" icon={<Database color="#10b981" />} />
          <KpiCard label="Connected Devices" value={`${overview?.online_devices || 5} / ${overview?.device_count || 5}`} sub="HART & Wireless" icon={<Radio color="#f59e0b" />} />
          <KpiCard label="FB Executions (V2)" value={overview?.execution_count || 3} sub="Scheduled Node.js Cycles" icon={<Cpu color="#a855f7" />} />
          <KpiCard label="Data Brokers (DBM)" value={overview?.broker_count || 4} sub="OPC UA & Redis Streams" icon={<Server color="#06b6d4" />} />
          <KpiCard label="Active ISA-18 Alarms" value={overview?.active_alarms || alarmEvents.filter(e => e.status === 'ACTIVE').length} sub="Trip Setpoints" icon={<Activity color="#ef4444" />} />
        </div>

        {/* Quick Activity Shortcuts */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          <ActionCard
            title="Configure Function Block V2"
            desc="Author custom JavaScript algorithms for Mahalanobis-Taguchi multivariate distance, Column ΔT gradient, and cavitation risk."
            btnText="Open Block Templates"
            onClick={() => setActiveMenu('fb_template')}
          />
          <ActionCard
            title="Active Block Executions"
            desc="Inspect real-time scheduled execution cycles, view duration (ms), and trigger manual test calculations on plant tags."
            btnText="View Executions"
            onClick={() => setActiveMenu('fb_execution')}
          />
          <ActionCard
            title="Field Instrument Fleet"
            desc="Inspect connected Yokogawa EJX Differential Pressure, YTA Temperature, and ADMAG AXF Flow transmitters."
            btnText="Manage Devices"
            onClick={() => setActiveMenu('devices')}
          />
        </div>

        {/* Recent DM Activity Logs */}
        <div style={{ background: '#10141d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc' }}>Recent Data Management Activities</div>
            <button onClick={() => setActiveMenu('activity_log')} style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '0.75rem', cursor: 'pointer' }}>
              View All Logs →
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#64748b', textAlign: 'left' }}>
                <th style={{ padding: '8px' }}>Timestamp</th>
                <th style={{ padding: '8px' }}>Category</th>
                <th style={{ padding: '8px' }}>Action</th>
                <th style={{ padding: '8px' }}>User</th>
                <th style={{ padding: '8px' }}>Details</th>
                <th style={{ padding: '8px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {activities.slice(0, 5).map(a => (
                <tr key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '8px', color: '#94a3b8' }}>{new Date(a.timestamp).toLocaleTimeString()}</td>
                  <td style={{ padding: '8px' }}>
                    <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}>
                      {a.category}
                    </span>
                  </td>
                  <td style={{ padding: '8px', fontWeight: 600, color: '#f1f5f9' }}>{a.action}</td>
                  <td style={{ padding: '8px', color: '#94a3b8' }}>{a.user}</td>
                  <td style={{ padding: '8px', color: '#cbd5e1' }}>{a.details}</td>
                  <td style={{ padding: '8px' }}><span style={{ color: '#10b981', fontWeight: 600 }}>{a.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderAssetManagementView() {
    const boundTags = tagsList.filter(t => selectedAsset ? t.asset_id === selectedAsset.id : true);
    const healthInfo = assetHealthList.find(h => selectedAsset && (selectedAsset.name.includes(h.equipment_tag) || selectedAsset.path.includes(h.equipment_tag)));

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 6px 0', color: '#f8fafc' }}>
              Asset Management & ISA-95 Hierarchy
            </h2>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>
              Model enterprise refining complexes, units, and equipment with bound process attributes and AHI health scores.
            </p>
          </div>
          <button
            onClick={() => setIsAssetModalOpen(true)}
            className="btn btn-primary"
            style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FolderPlus size={14} /> + Add Asset Node
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
          {/* Hierarchy Tree Explorer */}
          <div style={{ background: '#10141d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '16px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '12px', color: '#38bdf8' }}>
              Plant Topology Explorer
            </div>
            <div style={{ fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {assetTree.map(root => (
                <div key={root.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div
                    onClick={() => setSelectedAsset(root)}
                    style={{ fontWeight: 600, color: selectedAsset?.id === root.id ? '#38bdf8' : '#f8fafc', cursor: 'pointer', padding: '4px 6px', borderRadius: '4px', background: selectedAsset?.id === root.id ? 'rgba(56,189,248,0.1)' : 'transparent' }}
                  >
                    🏢 {root.name}
                  </div>
                  {root.children?.map(site => (
                    <div key={site.id} style={{ paddingLeft: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div
                        onClick={() => setSelectedAsset(site)}
                        style={{ color: selectedAsset?.id === site.id ? '#38bdf8' : '#cbd5e1', cursor: 'pointer', padding: '3px 6px', borderRadius: '4px', background: selectedAsset?.id === site.id ? 'rgba(56,189,248,0.1)' : 'transparent' }}
                      >
                        📍 {site.name}
                      </div>
                      {site.children?.map(area => (
                        <div key={area.id} style={{ paddingLeft: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div
                            onClick={() => setSelectedAsset(area)}
                            style={{ color: selectedAsset?.id === area.id ? '#38bdf8' : '#94a3b8', cursor: 'pointer', padding: '3px 6px', borderRadius: '4px', background: selectedAsset?.id === area.id ? 'rgba(56,189,248,0.1)' : 'transparent' }}
                          >
                            ⚙️ {area.name}
                          </div>
                          {area.children?.map(unit => (
                            <div
                              key={unit.id}
                              onClick={() => setSelectedAsset(unit)}
                              style={{ paddingLeft: '14px', color: selectedAsset?.id === unit.id ? '#38bdf8' : '#64748b', cursor: 'pointer', padding: '3px 6px', borderRadius: '4px', background: selectedAsset?.id === unit.id ? 'rgba(56,189,248,0.1)' : 'transparent' }}
                            >
                              🔹 <strong>{unit.name}</strong> ({unit.level})
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Asset Details & Bound Tags Table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {selectedAsset && (
              <div style={{ background: '#10141d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', color: '#f8fafc' }}>{selectedAsset.name}</h3>
                    <div style={{ fontSize: '0.72rem', color: '#38bdf8', fontFamily: 'monospace' }}>{selectedAsset.path}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', background: 'rgba(2,132,199,0.2)', color: '#38bdf8', fontWeight: 600 }}>
                      {selectedAsset.level}
                    </span>
                    <button onClick={() => handleDeleteAsset(selectedAsset.id)} className="btn btn-secondary" style={{ padding: '2px 6px', color: '#ef4444' }} title="Delete Asset">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {healthInfo && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', background: '#090d14', padding: '10px', borderRadius: '6px', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Health Index</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#10b981' }}>{healthInfo.health_index}%</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Remaining Life</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#38bdf8' }}>{healthInfo.rul_days} days</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>MT Distance</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f59e0b' }}>{healthInfo.mt_distance}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Risk Status</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: healthInfo.risk_level === 'NORMAL' ? '#10b981' : '#ef4444' }}>{healthInfo.risk_level}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bound Tags Table */}
            <div style={{ background: '#10141d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>
                  Bound Process Attributes & Telemetry Tags ({boundTags.length})
                </div>
                <button onClick={() => setIsTagModalOpen(true)} className="btn btn-primary" style={{ fontSize: '0.72rem', padding: '3px 8px' }}>
                  + Bind New Tag
                </button>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#64748b', textAlign: 'left' }}>
                    <th style={{ padding: '6px' }}>Tag Name</th>
                    <th style={{ padding: '6px' }}>Display Name</th>
                    <th style={{ padding: '6px' }}>Unit</th>
                    <th style={{ padding: '6px' }}>Range</th>
                    <th style={{ padding: '6px' }}>Source</th>
                    <th style={{ padding: '6px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {boundTags.map(t => (
                    <tr key={t.tag_name} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '6px', fontFamily: 'monospace', color: '#38bdf8' }}>{t.tag_name}</td>
                      <td style={{ padding: '6px', color: '#f1f5f9' }}>{t.display_name}</td>
                      <td style={{ padding: '6px', color: '#94a3b8' }}>{t.eng_units || '-'}</td>
                      <td style={{ padding: '6px', color: '#94a3b8' }}>{t.min_range} - {t.max_range}</td>
                      <td style={{ padding: '6px' }}>
                        <span style={{ padding: '1px 5px', borderRadius: '3px', fontSize: '0.68rem', background: 'rgba(255,255,255,0.05)', color: '#a855f7' }}>
                          {t.source_type}
                        </span>
                      </td>
                      <td style={{ padding: '6px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '4px' }}>
                          <button
                            onClick={() => {
                              setExplorerTags([t.tag_name]);
                              setActiveMenu('data_explorer');
                            }}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.68rem', padding: '2px 6px', color: '#38bdf8' }}
                          >
                            Explore
                          </button>
                          <button
                            onClick={() => handleDeleteTag(t.tag_name)}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.68rem', padding: '2px 6px', color: '#ef4444' }}
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderDataExplorerView() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 6px 0', color: '#f8fafc' }}>
            Data Explorer & Multi-Tag Trend Workbench
          </h2>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>
            Overlay multiple DCS telemetry signals, inspect signal noise, and export historical CSV datasets.
          </p>
        </div>

        {/* Controls Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#10141d', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Active Overlay Tags:</span>
            {explorerTags.map(tag => (
              <span key={tag} style={{ padding: '3px 8px', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid #0284c7', color: '#38bdf8', fontSize: '0.75rem', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {tag}
                {explorerTags.length > 1 && (
                  <X size={12} style={{ cursor: 'pointer' }} onClick={() => setExplorerTags(explorerTags.filter(t => t !== tag))} />
                )}
              </span>
            ))}
            {explorerTags.length < 5 && (
              <select
                onChange={(e) => {
                  if (e.target.value && !explorerTags.includes(e.target.value)) {
                    setExplorerTags([...explorerTags, e.target.value]);
                  }
                }}
                value=""
                style={{ background: '#1a2232', color: '#fff', border: '1px solid #334155', borderRadius: '4px', padding: '3px 8px', fontSize: '0.75rem' }}
              >
                <option value="">+ Add Tag Overlay</option>
                {tagsList.filter(t => !explorerTags.includes(t.tag_name)).map(t => (
                  <option key={t.tag_name} value={t.tag_name}>{t.tag_name} ({t.display_name})</option>
                ))}
              </select>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setLiveStreamEnabled(!liveStreamEnabled)}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '0.72rem',
                cursor: 'pointer',
                background: liveStreamEnabled ? '#10b981' : '#1a2232',
                color: liveStreamEnabled ? '#000' : '#94a3b8',
                border: '1px solid rgba(255,255,255,0.08)',
                fontWeight: liveStreamEnabled ? 700 : 500,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Zap size={11} /> {liveStreamEnabled ? 'Live Streaming' : 'Stream Off'}
            </button>
            {['now-15m', 'now-1h', 'now-6h', 'now-24h'].map(tr => (
              <button
                key={tr}
                onClick={() => setExplorerTimeRange(tr)}
                style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '0.72rem', cursor: 'pointer', background: explorerTimeRange === tr ? '#0284c7' : '#1a2232', color: explorerTimeRange === tr ? '#fff' : '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {tr.replace('now-', '')}
              </button>
            ))}
            <a
              href={`/api/v1/query/export?tags=${explorerTags.join(',')}&time_from=${explorerTimeRange}&time_to=now`}
              download
              className="btn btn-secondary"
              style={{ fontSize: '0.72rem', padding: '4px 10px', textDecoration: 'none', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Download size={12} /> CSV
            </a>
          </div>
        </div>

        {/* ECharts Multi-Tag Trend Plot */}
        <div style={{ background: '#10141d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '16px', height: '360px' }}>
          {loadingData ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Loading telemetry...</div>
          ) : (
            <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
          )}
        </div>
      </div>
    );
  }

  function renderFbClassicView() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 6px 0', color: '#f8fafc' }}>
              Function Block (Classic DCS Regulatory Logic)
            </h2>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>
              Yokogawa CENTUM VP Field Control Station regulatory PID loops, ratio controls, and lead-lag compensators.
            </p>
          </div>
          <button
            onClick={() => setIsClassicModalOpen(true)}
            className="btn btn-primary"
            style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={14} /> + New Classic Block
          </button>
        </div>

        {/* Classic Blocks Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
          {classicFBs.map(b => (
            <div key={b.id} style={{ background: '#10141d', padding: '16px', borderRadius: '8px', border: '1px solid #1e3a8a', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.95rem' }}>{b.tag_name}</span>
                <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.68rem', background: b.mode === 'AUT' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: b.mode === 'AUT' ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
                  {b.mode}
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{b.description}</div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', background: '#090d14', padding: '8px', borderRadius: '6px', textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b' }}>SP</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#10b981' }}>{b.sp}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b' }}>PV</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#38bdf8' }}>{b.pv}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b' }}>MV</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f59e0b' }}>{b.mv}%</div>
                </div>
              </div>

              <div style={{ fontSize: '0.72rem', color: '#cbd5e1', display: 'flex', justifyContent: 'space-between' }}>
                <span>Kp: <strong>{b.kp}</strong></span>
                <span>Ti: <strong>{b.ti}s</strong></span>
                <span>Td: <strong>{b.td}s</strong></span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button
                  onClick={() => setTuningBlock(b)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.72rem', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Sliders size={12} /> Tune Parameters
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderFbTemplateView() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 6px 0', color: '#f8fafc' }}>
              Function Block V2: Block Templates (JavaScript Engine)
            </h2>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>
              Yokogawa AHI cloud calculation templates powered by a native JavaScript / Node.js execution runtime.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingTemplateId(null);
              setTmplForm({
                template_code: 'FB_CUSTOM_CALC',
                name: 'Custom Refinery Algorithm',
                category: 'Analytics',
                description: 'Custom calculation engine for distillation column optimization.',
                inputs: [
                  { name: 'val1', type: 'Float', unit: '°C', default: 120 },
                  { name: 'val2', type: 'Float', unit: '°C', default: 240 }
                ],
                outputs: [
                  { name: 'result', type: 'Float', unit: '°C' }
                ],
                formula_code: `function execute(inputs) {\n  const v1 = Number(inputs.val1 || 0);\n  const v2 = Number(inputs.val2 || 0);\n  return { result: Number((v2 - v1).toFixed(2)) };\n}`
              });
              setIsTemplateModalOpen(true);
            }}
            className="btn btn-primary"
            style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={14} /> Create Block Template
          </button>
        </div>

        {/* Templates Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          {templates.map(tmpl => (
            <div
              key={tmpl.id}
              style={{
                background: '#10141d',
                border: '1px solid #1e3a8a',
                borderRadius: '8px',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: 'rgba(2, 132, 199, 0.2)',
                  color: '#38bdf8',
                  fontSize: '0.72rem',
                  fontFamily: 'monospace',
                  fontWeight: 600
                }}>
                  {tmpl.template_code}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>JavaScript V2</span>
              </div>

              <div>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
                  {tmpl.name}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#94a3b8', lineHeight: '1.4' }}>
                  {tmpl.description}
                </div>
              </div>

              {/* Inputs & Outputs Pill summary */}
              <div style={{ display: 'flex', gap: '16px', fontSize: '0.72rem', color: '#cbd5e1' }}>
                <div><strong>Inputs:</strong> {tmpl.inputs_schema.map(i => i.name).join(', ')}</div>
                <div><strong>Outputs:</strong> {tmpl.outputs_schema.map(o => o.name).join(', ')}</div>
              </div>

              {/* Real JavaScript Code View */}
              <div style={{
                background: '#090d14',
                padding: '10px',
                borderRadius: '6px',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '0.72rem',
                color: '#38bdf8',
                maxHeight: '120px',
                overflowY: 'auto'
              }}>
                <pre style={{ margin: 0 }}>{tmpl.formula_code}</pre>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => {
                      setEditingTemplateId(tmpl.id);
                      setTmplForm({
                        template_code: tmpl.template_code,
                        name: tmpl.name,
                        category: tmpl.category,
                        description: tmpl.description,
                        inputs: tmpl.inputs_schema,
                        outputs: tmpl.outputs_schema,
                        formula_code: tmpl.formula_code,
                        version: tmpl.version
                      });
                      setIsTemplateModalOpen(true);
                    }}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.72rem', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Edit3 size={11} /> Edit / Test
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(tmpl.id)}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.72rem', padding: '3px 6px', color: '#ef4444' }}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>

                <button
                  onClick={() => {
                    const defaultBindings = {};
                    tmpl.inputs_schema.forEach(inp => {
                      defaultBindings[inp.name] = tagsList[0]?.tag_name || '';
                    });
                    setExecForm({
                      execution_name: `${tmpl.name} (Unit Run)`,
                      template_id: tmpl.id,
                      target_tag: `${tmpl.template_code}.CALC`,
                      schedule_interval: '1s',
                      bindings: defaultBindings
                    });
                    setIsExecutionModalOpen(true);
                  }}
                  className="btn btn-primary"
                  style={{ fontSize: '0.72rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Plus size={12} /> Schedule Execution
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderFbExecutionView() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 6px 0', color: '#f8fafc' }}>
              Function Block V2: Scheduled & Triggered Executions
            </h2>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>
              Background scheduler continuously runs active JavaScript blocks on live DCS telemetry.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingExecutionId(null);
              setExecForm({
                execution_name: '',
                template_id: templates[0]?.id || '',
                target_tag: '',
                schedule_interval: '1s',
                bindings: {}
              });
              setIsExecutionModalOpen(true);
            }}
            className="btn btn-primary"
            style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={14} /> Schedule New Execution
          </button>
        </div>

        {/* Executions Table */}
        <div style={{ background: '#10141d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#64748b', textAlign: 'left' }}>
                <th style={{ padding: '8px' }}>Execution Name</th>
                <th style={{ padding: '8px' }}>Template Code</th>
                <th style={{ padding: '8px' }}>Target Tag</th>
                <th style={{ padding: '8px' }}>Schedule Interval</th>
                <th style={{ padding: '8px' }}>Last Run</th>
                <th style={{ padding: '8px' }}>Duration</th>
                <th style={{ padding: '8px' }}>Computed Output</th>
                <th style={{ padding: '8px' }}>Status</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {executions.map(exec => (
                <tr key={exec.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '8px', fontWeight: 600, color: '#f8fafc' }}>{exec.execution_name}</td>
                  <td style={{ padding: '8px', color: '#38bdf8', fontFamily: 'monospace' }}>{exec.template_code}</td>
                  <td style={{ padding: '8px', fontFamily: 'monospace', color: '#10b981' }}>{exec.target_tag}</td>
                  <td style={{ padding: '8px', color: '#94a3b8' }}>{exec.schedule_interval}</td>
                  <td style={{ padding: '8px', color: '#94a3b8' }}>
                    {exec.last_run_at ? new Date(exec.last_run_at).toLocaleTimeString() : 'Pending'}
                  </td>
                  <td style={{ padding: '8px', color: '#94a3b8' }}>{exec.last_execution_ms} ms</td>
                  <td style={{ padding: '8px', fontWeight: 700, color: '#f59e0b' }}>{exec.last_output_value}</td>
                  <td style={{ padding: '8px' }}>
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      background: exec.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: exec.status === 'ACTIVE' ? '#10b981' : '#ef4444'
                    }}>
                      {exec.status}
                    </span>
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        onClick={() => handleTriggerRun(exec.id)}
                        className="btn btn-primary"
                        style={{ fontSize: '0.7rem', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="Trigger Execution Immediately via Node.js"
                      >
                        <Play size={10} /> Trigger Now
                      </button>
                      <button
                        onClick={() => handleToggleStatus(exec.id)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.7rem', padding: '3px 6px' }}
                        title={exec.status === 'ACTIVE' ? 'Pause automatic schedule' : 'Resume automatic schedule'}
                      >
                        {exec.status === 'ACTIVE' ? <Pause size={11} color="#f59e0b" /> : <Play size={11} color="#10b981" />}
                      </button>
                      <button
                        onClick={() => setViewLogExecution(exec)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.7rem', padding: '3px 6px' }}
                        title="View Detailed Diagnostic Log"
                      >
                        <Eye size={11} />
                      </button>
                      <button
                        onClick={() => handleDeleteExecution(exec.id)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.7rem', padding: '3px 6px', color: '#ef4444' }}
                        title="Delete Execution"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderDeviceManagementView() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 6px 0', color: '#f8fafc' }}>
              Device Management & Yokogawa Instrument Fleet
            </h2>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>
              Connected Yokogawa DPharp transmitters, ADMAG magnetic flowmeters, and PRM Edge Gateways.
            </p>
          </div>
          <button
            onClick={() => setIsDeviceModalOpen(true)}
            className="btn btn-primary"
            style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={14} /> Register Field Device
          </button>
        </div>

        <div style={{ background: '#10141d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#64748b', textAlign: 'left' }}>
                <th style={{ padding: '8px' }}>Device ID</th>
                <th style={{ padding: '8px' }}>Instrument Name</th>
                <th style={{ padding: '8px' }}>Model</th>
                <th style={{ padding: '8px' }}>Protocol</th>
                <th style={{ padding: '8px' }}>IP / Field Loop</th>
                <th style={{ padding: '8px' }}>Firmware</th>
                <th style={{ padding: '8px' }}>Battery</th>
                <th style={{ padding: '8px' }}>Status</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {devices.map(d => (
                <tr key={d.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '8px', fontFamily: 'monospace', color: '#38bdf8' }}>{d.device_id}</td>
                  <td style={{ padding: '8px', fontWeight: 600, color: '#f8fafc' }}>{d.name}</td>
                  <td style={{ padding: '8px', color: '#94a3b8' }}>{d.model}</td>
                  <td style={{ padding: '8px', color: '#a855f7' }}>{d.protocol}</td>
                  <td style={{ padding: '8px', color: '#94a3b8' }}>{d.ip_address || 'Field Loop'}</td>
                  <td style={{ padding: '8px', color: '#94a3b8' }}>{d.firmware_version}</td>
                  <td style={{ padding: '8px', color: '#10b981' }}>{d.battery_level}%</td>
                  <td style={{ padding: '8px' }}>
                    <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                      {d.status}
                    </span>
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '4px' }}>
                      <button
                        onClick={() => handlePingDevice(d.id)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.68rem', padding: '2px 6px' }}
                        title="Ping Device"
                      >
                        Ping
                      </button>
                      <button
                        onClick={() => handleInspectDiagnostics(d.id)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.68rem', padding: '2px 6px', color: '#38bdf8' }}
                        title="Read HART Diagnostics"
                      >
                        <Wrench size={11} />
                      </button>
                      <button
                        onClick={() => handleDeleteDevice(d.id)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.68rem', padding: '2px 6px', color: '#ef4444' }}
                        title="Remove Device"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderAlarmManagementView() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 6px 0', color: '#f8fafc' }}>
              Alarm Management (ISA-18.2 Trip Limits)
            </h2>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>
              Setpoints, trip thresholds, deadbands, priority rationalization, and active event dispatching.
            </p>
          </div>
          <button
            onClick={() => setIsAlarmRuleModalOpen(true)}
            className="btn btn-primary"
            style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={14} /> + New Alarm Rule
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setAlarmTab('active')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: alarmTab === 'active' ? '#0284c7' : '#1a2232',
              color: alarmTab === 'active' ? '#fff' : '#94a3b8',
              border: '1px solid rgba(255,255,255,0.08)'
            }}
          >
            Active Alarms ({alarmEvents.filter(e => e.status === 'ACTIVE').length})
          </button>
          <button
            onClick={() => setAlarmTab('rules')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: alarmTab === 'rules' ? '#0284c7' : '#1a2232',
              color: alarmTab === 'rules' ? '#fff' : '#94a3b8',
              border: '1px solid rgba(255,255,255,0.08)'
            }}
          >
            Configured Trip Rules ({alarmRules.length})
          </button>
        </div>

        {/* Active Alarms Console */}
        {alarmTab === 'active' && (
          <div style={{ background: '#10141d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#64748b', textAlign: 'left' }}>
                  <th style={{ padding: '8px' }}>Tag Name</th>
                  <th style={{ padding: '8px' }}>Severity</th>
                  <th style={{ padding: '8px' }}>Message</th>
                  <th style={{ padding: '8px' }}>Value at Trip</th>
                  <th style={{ padding: '8px' }}>Triggered At</th>
                  <th style={{ padding: '8px' }}>Status</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {alarmEvents.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '20px', textAlign: 'center', color: '#10b981' }}>
                      <CheckCircle2 size={18} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                      No active alarm conditions present. Plant operation nominal.
                    </td>
                  </tr>
                ) : (
                  alarmEvents.map(e => (
                    <tr key={e.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '8px', fontFamily: 'monospace', color: '#38bdf8' }}>{e.tag_name}</td>
                      <td style={{ padding: '8px' }}>
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          background: e.severity === 'CRITICAL' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                          color: e.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b'
                        }}>
                          {e.severity}
                        </span>
                      </td>
                      <td style={{ padding: '8px', color: '#f8fafc' }}>{e.message}</td>
                      <td style={{ padding: '8px', color: '#f59e0b', fontWeight: 600 }}>{e.value}</td>
                      <td style={{ padding: '8px', color: '#94a3b8' }}>{new Date(e.triggered_at).toLocaleTimeString()}</td>
                      <td style={{ padding: '8px', color: '#ef4444', fontWeight: 600 }}>{e.status}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '4px' }}>
                          <button onClick={() => handleAckAlarm(e.id)} className="btn btn-secondary" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>ACK</button>
                          <button onClick={() => handleShelveAlarm(e.id)} className="btn btn-secondary" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>Shelve</button>
                          <button onClick={() => handleClearAlarm(e.id)} className="btn btn-secondary" style={{ fontSize: '0.68rem', padding: '2px 6px', color: '#10b981' }}>Clear</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Configured Rules */}
        {alarmTab === 'rules' && (
          <div style={{ background: '#10141d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#64748b', textAlign: 'left' }}>
                  <th style={{ padding: '8px' }}>Tag Name</th>
                  <th style={{ padding: '8px' }}>Condition</th>
                  <th style={{ padding: '8px' }}>Threshold</th>
                  <th style={{ padding: '8px' }}>Severity</th>
                  <th style={{ padding: '8px' }}>Message</th>
                  <th style={{ padding: '8px' }}>Enabled</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {alarmRules.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '8px', fontFamily: 'monospace', color: '#38bdf8' }}>{r.tag_name}</td>
                    <td style={{ padding: '8px', color: '#cbd5e1' }}>{r.condition}</td>
                    <td style={{ padding: '8px', color: '#ef4444', fontWeight: 700 }}>{r.threshold}</td>
                    <td style={{ padding: '8px', color: r.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b', fontWeight: 600 }}>{r.severity}</td>
                    <td style={{ padding: '8px', color: '#cbd5e1' }}>{r.message}</td>
                    <td style={{ padding: '8px', color: r.enabled ? '#10b981' : '#64748b' }}>{r.enabled ? 'Yes' : 'No'}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>
                      <button onClick={() => handleDeleteAlarmRule(r.id)} className="btn btn-secondary" style={{ fontSize: '0.68rem', padding: '2px 6px', color: '#ef4444' }}>
                        <Trash2 size={11} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  function renderBrokerManagementView() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 6px 0', color: '#f8fafc' }}>
              Broker Management (Yokogawa DBM, OPC UA & Telemetry Pipelines)
            </h2>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>
              Bridge OT control networks, CENTUM VP FCS stations, Redis streams, and Yokogawa Cloud ingestion.
            </p>
          </div>
          <button
            onClick={() => setIsBrokerModalOpen(true)}
            className="btn btn-primary"
            style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={14} /> + New Broker Node
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          {brokers.map(b => (
            <div
              key={b.id}
              style={{
                background: '#10141d',
                border: '1px solid #1e3a8a',
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc' }}>{b.name}</span>
                <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                  {b.status}
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                <div>Endpoint: <strong style={{ color: '#38bdf8' }}>{b.endpoint_url}:{b.port}</strong></div>
                <div>Path/Topic: {b.topic_or_path}</div>
              </div>
              <div style={{ display: 'flex', gap: '20px', fontSize: '0.75rem', color: '#cbd5e1' }}>
                <div>Throughput: <strong>{b.messages_per_sec} msg/s</strong></div>
                <div>Total Packets: <strong>{b.total_messages.toLocaleString()}</strong></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                <button
                  onClick={() => handleDeleteBroker(b.id)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.72rem', padding: '3px 6px', color: '#ef4444' }}
                >
                  <Trash2 size={11} /> Remove
                </button>
                <button
                  onClick={() => handleTestBroker(b.id)}
                  style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid #0284c7', color: '#38bdf8', padding: '4px 10px', borderRadius: '4px', fontSize: '0.72rem', cursor: 'pointer' }}
                >
                  Test Connection (Ping)
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderConfigurationView() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 6px 0', color: '#f8fafc' }}>
              System Configuration & Engineering Dictionary
            </h2>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>
              Global engineering units, sampling rates, timezones, and data retention policies.
            </p>
          </div>
          <button
            onClick={handleSaveConfig}
            className="btn btn-primary"
            style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Check size={14} /> Save Configuration
          </button>
        </div>

        <div style={{ background: '#10141d', padding: '20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', fontSize: '0.82rem' }}>
            <div>
              <label style={{ color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Primary Time Zone</label>
              <input
                type="text"
                value={systemConfig.timezone}
                onChange={(e) => setSystemConfig({ ...systemConfig, timezone: e.target.value })}
                style={{ width: '100%', padding: '8px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#f8fafc' }}
              />
            </div>
            <div>
              <label style={{ color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Telemetry Sampling Rate (ms)</label>
              <input
                type="number"
                value={systemConfig.sampling_rate_ms}
                onChange={(e) => setSystemConfig({ ...systemConfig, sampling_rate_ms: Number(e.target.value) })}
                style={{ width: '100%', padding: '8px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#f8fafc' }}
              />
            </div>
            <div>
              <label style={{ color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Data Retention Tier 1 - Raw Telemetry (Days)</label>
              <input
                type="number"
                value={systemConfig.tier1_retention_days}
                onChange={(e) => setSystemConfig({ ...systemConfig, tier1_retention_days: Number(e.target.value) })}
                style={{ width: '100%', padding: '8px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#f8fafc' }}
              />
            </div>
            <div>
              <label style={{ color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Data Retention Tier 2 - Downsampled Archive (Years)</label>
              <input
                type="number"
                value={systemConfig.tier2_retention_years}
                onChange={(e) => setSystemConfig({ ...systemConfig, tier2_retention_years: Number(e.target.value) })}
                style={{ width: '100%', padding: '8px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#f8fafc' }}
              />
            </div>
            <div>
              <label style={{ color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Node.js JS Function Block Timeout (ms)</label>
              <input
                type="number"
                value={systemConfig.js_timeout_ms}
                onChange={(e) => setSystemConfig({ ...systemConfig, js_timeout_ms: Number(e.target.value) })}
                style={{ width: '100%', padding: '8px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#f8fafc' }}
              />
            </div>
            <div>
              <label style={{ color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Redis Cache TTL (Seconds)</label>
              <input
                type="number"
                value={systemConfig.redis_cache_ttl_sec}
                onChange={(e) => setSystemConfig({ ...systemConfig, redis_cache_ttl_sec: Number(e.target.value) })}
                style={{ width: '100%', padding: '8px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#f8fafc' }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderSecurityView() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 6px 0', color: '#f8fafc' }}>
              Security & Role-Based Access Control (RBAC)
            </h2>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>
              Manage engineering accounts, operator privileges, and secure cloud ingestion API keys.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setIsUserModalOpen(true)}
              className="btn btn-primary"
              style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={14} /> + Add User
            </button>
            <button
              onClick={() => setIsApiKeyModalOpen(true)}
              className="btn btn-secondary"
              style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Key size={14} /> Generate API Key
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div style={{ background: '#10141d', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f8fafc', marginBottom: '10px' }}>User Accounts & Roles</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#64748b', textAlign: 'left' }}>
                <th style={{ padding: '8px' }}>Username</th>
                <th style={{ padding: '8px' }}>Full Name</th>
                <th style={{ padding: '8px' }}>Email</th>
                <th style={{ padding: '8px' }}>Role</th>
                <th style={{ padding: '8px' }}>MFA</th>
                <th style={{ padding: '8px' }}>Last Login</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {securityUsers.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '8px', fontWeight: 600, color: '#38bdf8' }}>{u.username}</td>
                  <td style={{ padding: '8px', color: '#f8fafc' }}>{u.full_name}</td>
                  <td style={{ padding: '8px', color: '#94a3b8' }}>{u.email}</td>
                  <td style={{ padding: '8px', color: '#10b981', fontWeight: 600 }}>{u.role}</td>
                  <td style={{ padding: '8px', color: u.mfa_enabled ? '#10b981' : '#f59e0b' }}>{u.mfa_enabled ? 'Enabled' : 'Disabled'}</td>
                  <td style={{ padding: '8px', color: '#94a3b8' }}>{u.last_login}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>
                    <button onClick={() => handleDeleteUser(u.id)} className="btn btn-secondary" style={{ fontSize: '0.68rem', padding: '2px 6px', color: '#ef4444' }}>
                      <Trash2 size={11} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* API Keys Table */}
        <div style={{ background: '#10141d', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f8fafc', marginBottom: '10px' }}>Ingestion & Pipeline API Keys</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#64748b', textAlign: 'left' }}>
                <th style={{ padding: '8px' }}>Key Name</th>
                <th style={{ padding: '8px' }}>Prefix</th>
                <th style={{ padding: '8px' }}>Scopes</th>
                <th style={{ padding: '8px' }}>Issued Date</th>
                <th style={{ padding: '8px' }}>Status</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {securityApiKeys.map(k => (
                <tr key={k.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '8px', fontWeight: 600, color: '#f8fafc' }}>{k.name}</td>
                  <td style={{ padding: '8px', fontFamily: 'monospace', color: '#38bdf8' }}>{k.prefix}</td>
                  <td style={{ padding: '8px', color: '#cbd5e1' }}>{k.scope}</td>
                  <td style={{ padding: '8px', color: '#94a3b8' }}>{k.created_at}</td>
                  <td style={{ padding: '8px', color: '#10b981', fontWeight: 600 }}>{k.status}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>
                    <button onClick={() => handleRevokeApiKey(k.id)} className="btn btn-secondary" style={{ fontSize: '0.68rem', padding: '2px 6px', color: '#ef4444' }}>
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderActivityLogView() {
    const filtered = activities.filter(a => {
      if (!activitySearch) return true;
      const s = activitySearch.toLowerCase();
      return (
        a.action.toLowerCase().includes(s) ||
        a.user.toLowerCase().includes(s) ||
        (a.details && a.details.toLowerCase().includes(s))
      );
    });

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 6px 0', color: '#f8fafc' }}>
            Activity Log & Operational Audit Trail
          </h2>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>
            Comprehensive chronological audit trail for FDA 21 CFR Part 11 and ISA-95 compliance.
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['ALL', 'ASSET', 'BLOCK', 'DEVICE', 'BROKER', 'ALARM', 'SECURITY'].map(cat => (
              <button
                key={cat}
                onClick={() => {
                  setActivityCategory(cat);
                  fetchActivities(cat).then(setActivities);
                }}
                style={{
                  padding: '4px 12px',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  background: activityCategory === cat ? '#0284c7' : '#1a2232',
                  color: activityCategory === cat ? '#fff' : '#94a3b8',
                  border: '1px solid rgba(255,255,255,0.08)'
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="Search audit trail..."
            value={activitySearch}
            onChange={(e) => setActivitySearch(e.target.value)}
            style={{ width: '240px', padding: '5px 10px', background: '#1a2232', border: '1px solid #334155', borderRadius: '4px', color: '#fff', fontSize: '0.75rem' }}
          />
        </div>

        <div style={{ background: '#10141d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#64748b', textAlign: 'left' }}>
                <th style={{ padding: '8px' }}>ID</th>
                <th style={{ padding: '8px' }}>Timestamp</th>
                <th style={{ padding: '8px' }}>Category</th>
                <th style={{ padding: '8px' }}>Action</th>
                <th style={{ padding: '8px' }}>User</th>
                <th style={{ padding: '8px' }}>Details</th>
                <th style={{ padding: '8px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '8px', color: '#64748b' }}>#{a.id}</td>
                  <td style={{ padding: '8px', color: '#94a3b8' }}>{new Date(a.timestamp).toLocaleString()}</td>
                  <td style={{ padding: '8px' }}>
                    <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}>
                      {a.category}
                    </span>
                  </td>
                  <td style={{ padding: '8px', fontWeight: 600, color: '#f8fafc' }}>{a.action}</td>
                  <td style={{ padding: '8px', color: '#94a3b8' }}>{a.user}</td>
                  <td style={{ padding: '8px', color: '#cbd5e1' }}>{a.details}</td>
                  <td style={{ padding: '8px', color: '#10b981', fontWeight: 600 }}>{a.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
}

// Subcomponents
function NavItem({ icon, label, hasDropdown, active, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '9px 12px',
        borderRadius: '6px',
        cursor: 'pointer',
        color: active ? '#38bdf8' : '#cbd5e1',
        background: active ? 'rgba(2, 132, 199, 0.16)' : 'transparent',
        fontSize: '0.82rem',
        fontWeight: active ? 600 : 500,
        marginBottom: '2px',
        transition: 'all 0.15s ease'
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {icon}
        <span>{label}</span>
      </div>
      {hasDropdown && <ChevronDown size={14} color="#64748b" />}
    </div>
  );
}

function SubNavItem({ icon, label, active, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '7px 10px',
        borderRadius: '5px',
        cursor: 'pointer',
        color: active ? '#38bdf8' : '#94a3b8',
        background: active ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
        fontSize: '0.78rem',
        fontWeight: active ? 600 : 400
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

function KpiCard({ label, value, sub, icon }) {
  return (
    <div style={{ background: '#10141d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{label}</span>
        {icon}
      </div>
      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc' }}>{value}</div>
      <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{sub}</div>
    </div>
  );
}

function ActionCard({ title, desc, btnText, onClick }) {
  return (
    <div style={{ background: '#10141d', border: '1px solid #1e3a8a', borderRadius: '8px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc' }}>{title}</div>
      <div style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: '1.4', flex: 1 }}>{desc}</div>
      <button
        onClick={onClick}
        style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid #0284c7', color: '#38bdf8', padding: '6px 14px', borderRadius: '5px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '6px' }}
      >
        <span>{btnText}</span>
        <ArrowRight size={13} />
      </button>
    </div>
  );
}
