import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import {
  Cpu, Play, Plus, RefreshCw, Trash2, Edit3, CheckCircle2,
  AlertTriangle, Code2, ArrowRight, Activity, Zap, Clock,
  Settings, Check, X, Layers, Database, ChevronRight, Terminal,
  ExternalLink, Sparkles, Sliders, Eye, Download, Upload, Copy,
  ZoomIn, ZoomOut, Maximize2, Grid, Star, FileText, ChevronDown,
  Compass, HelpCircle, Save, FolderTree, Tag, Radio, GitBranch,
  Shield, ShieldCheck, CheckSquare, Square, RotateCw, Pause, History,
  Info, List, Workflow, Box, Search, ArrowUpRight
} from 'lucide-react';
import { useDM } from './dmContext';
import {
  fetchFBTemplates, fetchFBTemplate, createFBTemplate, updateFBTemplate,
  deleteFBTemplate, cloneFBTemplate, createNewTemplateVersion, fetchFBTemplateVersions,
  validateFBTemplate, testFBTemplate, publishFBTemplate, updateFBTemplateMarkups,
  updateFBTemplateInputs, updateFBTemplateOutputs, updateFBTemplateCode,
  updateFBTemplateOutputMappings, exportFBTemplate, importFBTemplate,
  fetchFBExecutions, fetchFBExecution, createFBExecution, updateFBExecution, deleteFBExecution,
  activateFBExecution, pauseFBExecution, runFBExecution, fetchFBExecutionHistory
} from '../../api/client';
import AhiVisualGraph from './AhiVisualGraph';

export default function FunctionBlockStudioV2({ initialTab = 'templates' }) {
  const { assets = [], showToast, refreshState, addAssetAttribute } = useDM();

  // Top Subview Mode: 'templates' (Block Templates) | 'executions' (Block Executions)
  const [subView, setSubView] = useState(initialTab || 'templates');

  useEffect(() => {
    if (initialTab) setSubView(initialTab);
  }, [initialTab]);

  // AHI Visual Graph Modal state
  const [graphModalOpen, setGraphModalOpen] = useState(false);
  const [activeGraphTarget, setActiveGraphTarget] = useState({ template: null, execution: null });

  // Templates List State
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateFilterCategory, setTemplateFilterCategory] = useState('ALL');
  const [templateFilterStatus, setTemplateFilterStatus] = useState('ALL');
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');

  // Executions List State
  const [executions, setExecutions] = useState([]);
  const [loadingExecutions, setLoadingExecutions] = useState(false);
  const [executionFilterStatus, setExecutionFilterStatus] = useState('ALL');
  const [executionSearchQuery, setExecutionSearchQuery] = useState('');

  // Template Designer Modal State
  const [designerOpen, setDesignerOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [designerTab, setDesignerTab] = useState('general'); // general | markups | inputs | outputs | code | mappings | validate
  const [designerValidation, setDesignerValidation] = useState(null);
  const [designerTestResult, setDesignerTestResult] = useState(null);
  const [testingInSandbox, setTestingInSandbox] = useState(false);
  const [testInputsJson, setTestInputsJson] = useState('{\n  "flow": 20.0,\n  "power": 15.0,\n  "running": true\n}');

  // Execution Wizard Modal State
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedTemplateForDeploy, setSelectedTemplateForDeploy] = useState(null);
  const [editingExecutionId, setEditingExecutionId] = useState(null);
  const [wizardStep, setWizardStep] = useState(1); // 1: Select Template | 2: Map Assets | 3: Map Inputs | 4: Preview Runtime Outputs | 5: Triggers
  const [wizardExecutionName, setWizardExecutionName] = useState('');
  const [wizardAssetBindings, setWizardAssetBindings] = useState({});
  const [wizardInputBindings, setWizardInputBindings] = useState({});
  const [wizardOutputBindings, setWizardOutputBindings] = useState([]);
  const [wizardTriggerConfig, setWizardTriggerConfig] = useState({
    type: 'ATTRIBUTE_UPDATED',
    trigger_attribute: 'flow',
    debounce_ms: 200,
    freshness_sec: 30
  });

  // Trace Logs History Modal State
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyExecution, setHistoryExecution] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Load Data on Mount
  useEffect(() => {
    loadTemplates();
    loadExecutions();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const data = await fetchFBTemplates();
      setTemplates(data);
    } catch (e) {
      console.error('Failed to load templates:', e);
      if (showToast) showToast('Failed to load Block Templates', 'error');
    } finally {
      setLoadingTemplates(false);
    }
  };

  const loadExecutions = async () => {
    try {
      setLoadingExecutions(true);
      const data = await fetchFBExecutions();
      setExecutions(data);
    } catch (e) {
      console.error('Failed to load executions:', e);
      if (showToast) showToast('Failed to load Block Executions', 'error');
    } finally {
      setLoadingExecutions(false);
    }
  };

  // --------------------------------------------------------------------------
  // TEMPLATE MANAGER ACTIONS
  // --------------------------------------------------------------------------

  const handleOpenCreateTemplate = () => {
    const freshTemplate = {
      id: '',
      template_code: `FB_CALC_${Math.floor(100 + Math.random() * 900)}`,
      name: 'New Industrial Calculation Block',
      category: 'Analytics',
      asset_type: 'General',
      description: 'Calculates performance metrics and validates operational state.',
      version: '1.0.0',
      status: 'DRAFT',
      author: 'Lead Process Engineer',
      markups: [
        {
          id: `mk-${Date.now()}-1`,
          name: 'Equipment',
          placeholder: '@Equipment',
          expected_asset_type: 'EQUIPMENT',
          description: 'Primary industrial process equipment',
          required: true,
          selection_scope: 'EQUIPMENT',
          device_markup: ''
        }
      ],
      inputs: [
        {
          id: `inp-${Date.now()}-1`,
          name: 'measurement',
          display_name: 'Process Measurement',
          description: 'Primary sensor input tag',
          asset_markup: '@Equipment',
          attribute_reference: 'Measurement',
          attribute_type: 'Dynamic',
          data_type: 'Double',
          uom: '',
          required: true,
          default_value: 0.0,
          quality_policy: 'STRICT',
          max_data_age_sec: 60,
          missing_data_policy: 'USE_DEFAULT'
        }
      ],
      outputs: [
        {
          id: `out-${Date.now()}-1`,
          name: 'CalculatedMetric',
          output_key: 'calculatedMetric',
          description: 'Computed metric persisted to asset runtime attribute',
          target_asset_markup: '@Equipment',
          runtime_attribute_name: 'CalculatedMetric',
          data_type: 'Double',
          uom: '',
          decimal_places: 2,
          nullable: true,
          default_value: 0.0,
          script_result_key: 'calculatedMetric',
          persist_historian: true,
          publish_event: true,
          quality_propagation_policy: 'PROPAGATE_WORST'
        }
      ],
      script_code: `function calculate(ctx, inputs) {
  const measurement = inputs.measurement;
  const valid = Number.isFinite(measurement) && measurement >= 0;

  return {
    calculatedMetric: valid ? Number((measurement * 1.05).toFixed(2)) : null
  };
}`,
      output_mappings: [
        {
          script_result_key: 'calculatedMetric',
          output_key: 'calculatedMetric',
          target_asset_markup: '@Equipment',
          runtime_attribute_name: 'CalculatedMetric',
          data_type: 'Double',
          uom: ''
        }
      ],
      parameters: []
    };
    setEditingTemplate(freshTemplate);
    setDesignerTab('general');
    setDesignerValidation(null);
    setDesignerTestResult(null);
    setTestInputsJson('{\n  "measurement": 50.0\n}');
    setDesignerOpen(true);
  };

  const handleEditTemplate = (tmpl) => {
    const clone = JSON.parse(JSON.stringify(tmpl));
    setEditingTemplate(clone);
    setDesignerTab('general');
    setDesignerValidation(null);
    setDesignerTestResult(null);
    // Build default test json from inputs
    const testMap = {};
    (clone.inputs || []).forEach(i => {
      testMap[i.name] = i.default_value !== undefined ? i.default_value : 0.0;
    });
    setTestInputsJson(JSON.stringify(testMap, null, 2));
    setDesignerOpen(true);
  };

  const handleSaveDraftTemplate = async () => {
    if (!editingTemplate) return;
    try {
      if (!editingTemplate.id) {
        // Create new
        const created = await createFBTemplate(editingTemplate);
        setEditingTemplate(created);
        if (showToast) showToast(`Created template ${created.template_code}`, 'success');
      } else {
        // Update existing
        const updated = await updateFBTemplate(editingTemplate.id, editingTemplate);
        setEditingTemplate(updated);
        if (showToast) showToast(`Saved template ${updated.template_code}`, 'success');
      }
      loadTemplates();
    } catch (e) {
      if (showToast) showToast(e.message || 'Failed to save template', 'error');
    }
  };

  const handleValidateDesigner = async () => {
    if (!editingTemplate) return;
    try {
      // First save draft if template already exists
      if (editingTemplate.id) {
        await updateFBTemplate(editingTemplate.id, editingTemplate);
        const valRes = await validateFBTemplate(editingTemplate.id);
        setDesignerValidation(valRes);
        if (valRes.valid) {
          if (showToast) showToast('Template validated successfully! Zero errors found.', 'success');
        } else {
          if (showToast) showToast(`Validation failed: ${valRes.errors.length} issue(s) detected`, 'warning');
        }
      } else {
        const created = await createFBTemplate(editingTemplate);
        setEditingTemplate(created);
        const valRes = await validateFBTemplate(created.id);
        setDesignerValidation(valRes);
        loadTemplates();
      }
    } catch (e) {
      if (showToast) showToast(e.message || 'Validation error', 'error');
    }
  };

  const handleTestInSandbox = async () => {
    if (!editingTemplate) return;
    try {
      setTestingInSandbox(true);
      let parsedInputs = {};
      try {
        parsedInputs = JSON.parse(testInputsJson);
      } catch (err) {
        throw new Error('Test Inputs JSON syntax is invalid');
      }

      // If template not saved yet, save it first
      let currentId = editingTemplate.id;
      if (!currentId) {
        const created = await createFBTemplate(editingTemplate);
        setEditingTemplate(created);
        currentId = created.id;
      } else {
        await updateFBTemplate(currentId, editingTemplate);
      }

      const res = await testFBTemplate(currentId, { inputs: parsedInputs });
      setDesignerTestResult(res);
      if (res.success) {
        if (showToast) showToast(`Execution successful (${res.duration_ms}ms)`, 'success');
      } else {
        if (showToast) showToast(`Execution failed: ${res.error}`, 'error');
      }
    } catch (e) {
      if (showToast) showToast(e.message || 'Sandbox error', 'error');
    } finally {
      setTestingInSandbox(false);
    }
  };

  const handlePublishTemplateAction = async () => {
    if (!editingTemplate) return;
    try {
      let currentId = editingTemplate.id;
      if (!currentId) {
        const created = await createFBTemplate(editingTemplate);
        currentId = created.id;
      } else {
        await updateFBTemplate(currentId, editingTemplate);
      }

      const pubRes = await publishFBTemplate(currentId, {
        user_role: 'Engineer',
        user_email: 'engineer@yokogawa.com'
      });
      setEditingTemplate(pubRes.template);
      if (showToast) showToast(`Template ${pubRes.template.template_code} published as immutable v${pubRes.template.version}`, 'success');
      loadTemplates();
    } catch (e) {
      if (showToast) showToast(e.message || 'Failed to publish template', 'error');
    }
  };

  const handleCloneTemplate = async (tmpl) => {
    try {
      const cloned = await cloneFBTemplate(tmpl.id, {
        name: `${tmpl.name} (Clone)`,
        template_code: `${tmpl.template_code}_COPY`
      });
      if (showToast) showToast(`Cloned template to ${cloned.template_code}`, 'success');
      loadTemplates();
    } catch (e) {
      if (showToast) showToast(e.message || 'Clone failed', 'error');
    }
  };

  const handleCreateNewVersion = async (tmpl) => {
    try {
      const res = await createNewTemplateVersion(tmpl.id);
      if (showToast) showToast(`Created draft version ${res.version} of ${res.template_code}`, 'success');
      loadTemplates();
    } catch (e) {
      if (showToast) showToast(e.message || 'Version bump failed', 'error');
    }
  };

  const handleDeleteTemplate = async (tmpl) => {
    if (!window.confirm(`Delete or retire template ${tmpl.template_code}?`)) return;
    try {
      await deleteFBTemplate(tmpl.id);
      if (showToast) showToast(`Template ${tmpl.template_code} removed`, 'info');
      loadTemplates();
    } catch (e) {
      if (showToast) showToast(e.message || 'Failed to delete template', 'error');
    }
  };

  const handleExportTemplate = async (tmpl) => {
    try {
      const data = await exportFBTemplate(tmpl.id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tmpl.template_code}_v${tmpl.version}.fb-template.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      if (showToast) showToast('Failed to export template', 'error');
    }
  };

  // --------------------------------------------------------------------------
  // BLOCK EXECUTION WIZARD & MANAGEMENT ACTIONS
  // --------------------------------------------------------------------------

  const syncBindingsForAssets = (tmpl, assetMap, currentInpBindings = {}, currentOutBindings = []) => {
    const updatedInputs = { ...currentInpBindings };
    (tmpl.inputs || []).forEach(inp => {
      const targetAid = assetMap[inp.asset_markup] || assets[0]?.id || '';
      const targetAsset = assets.find(a => a.id === targetAid);
      const attrs = targetAsset?.attributes || [];
      const matchingAttr = attrs.find(a => 
        (a.name || '').toLowerCase() === (inp.attribute_reference || '').toLowerCase() || 
        (a.name || '').toLowerCase() === (inp.name || '').toLowerCase()
      ) || attrs[0];
      
      updatedInputs[inp.name] = {
        asset_id: targetAid,
        attribute_name: matchingAttr?.name || inp.attribute_reference || inp.name,
        attribute_id: matchingAttr?.id || ''
      };
    });

    const updatedOutputs = (tmpl.outputs || []).map(out => {
      const existing = currentOutBindings.find(x => x.output_key === out.output_key);
      const targetAid = assetMap[out.target_asset_markup] || assets[0]?.id || '';
      const targetAsset = assets.find(a => a.id === targetAid);
      const matchingExisting = (targetAsset?.attributes || []).find(a => 
        (a.name || '').toLowerCase() === (out.runtime_attribute_name || '').toLowerCase() ||
        (a.name || '').toLowerCase() === (out.output_key || '').toLowerCase()
      );

      return {
        output_key: out.output_key,
        script_result_key: out.script_result_key || out.output_key,
        target_asset_markup: out.target_asset_markup,
        runtime_attribute_name: existing?.runtime_attribute_name || out.runtime_attribute_name,
        attribute_id: existing?.attribute_id || (matchingExisting ? matchingExisting.id : ''),
        mode: existing?.mode || (matchingExisting ? 'MAP_EXISTING' : 'CREATE_NEW')
      };
    });

    return { inputs: updatedInputs, outputs: updatedOutputs };
  };

  const handleStartDeployWizard = (tmpl) => {
    setSelectedTemplateForDeploy(tmpl);
    setEditingExecutionId(null);
    setWizardExecutionName(`${tmpl.name} [Execution ${executions.length + 1}]`);
    
    // Pre-populate asset bindings
    const defaultAssetMap = {};
    (tmpl.markups || []).forEach(m => {
      const match = assets.find(a => a.level === m.expected_asset_type || a.name.toLowerCase().includes(m.name.toLowerCase()));
      defaultAssetMap[m.placeholder] = match ? match.id : (assets[0]?.id || '');
    });
    setWizardAssetBindings(defaultAssetMap);

    const { inputs, outputs } = syncBindingsForAssets(tmpl, defaultAssetMap, {}, []);
    setWizardInputBindings(inputs);
    setWizardOutputBindings(outputs);

    // Default trigger
    setWizardTriggerConfig({
      type: 'ATTRIBUTE_UPDATED',
      trigger_attribute: tmpl.inputs[0]?.name || 'flow',
      debounce_ms: 200,
      freshness_sec: 30
    });

    setWizardStep(1);
    setWizardOpen(true);
  };

  const handleOpenEditExecution = (ex) => {
    const tmpl = templates.find(t => t.id === ex.template_id || t.template_code === ex.template_code) || ex.template_snapshot;
    if (!tmpl) {
      if (showToast) showToast('Template definition not found for this execution', 'error');
      return;
    }
    setSelectedTemplateForDeploy(tmpl);
    setEditingExecutionId(ex.id);
    setWizardExecutionName(ex.name);
    setWizardAssetBindings(ex.asset_bindings || {});
    setWizardInputBindings(ex.input_bindings || {});

    // Format output bindings
    const formattedOutputs = (tmpl.outputs || []).map(out => {
      const bound = (ex.output_bindings || []).find(b => b.output_key === out.output_key);
      return {
        output_key: out.output_key,
        script_result_key: out.script_result_key || out.output_key,
        target_asset_markup: out.target_asset_markup,
        runtime_attribute_name: bound?.runtime_attribute_name || out.runtime_attribute_name,
        attribute_id: bound?.runtime_attribute_id || '',
        mode: bound?.runtime_attribute_id ? 'MAP_EXISTING' : 'CREATE_NEW'
      };
    });
    setWizardOutputBindings(formattedOutputs);
    setWizardTriggerConfig(ex.trigger_config || {
      type: 'ATTRIBUTE_UPDATED',
      trigger_attribute: tmpl.inputs[0]?.name || 'flow',
      debounce_ms: 200,
      freshness_sec: 30
    });
    setWizardStep(1);
    setWizardOpen(true);
  };

  const handleCompleteDeployExecution = async () => {
    if (!selectedTemplateForDeploy) return;
    try {
      const payload = {
        name: wizardExecutionName,
        template_id: selectedTemplateForDeploy.id,
        template_code: selectedTemplateForDeploy.template_code,
        asset_bindings: wizardAssetBindings,
        input_bindings: wizardInputBindings,
        output_bindings: wizardOutputBindings.map(ob => ({
          output_key: ob.output_key,
          script_result_key: ob.script_result_key,
          target_asset_markup: ob.target_asset_markup,
          runtime_attribute_name: ob.runtime_attribute_name,
          attribute_id: ob.mode === 'MAP_EXISTING' ? ob.attribute_id : undefined
        })),
        trigger_config: wizardTriggerConfig,
        status: 'ACTIVE'
      };
      if (editingExecutionId) {
        await updateFBExecution(editingExecutionId, payload);
        if (showToast) showToast(`Updated execution instance '${payload.name}' and re-bound attributes!`, 'success');
        await runFBExecution(editingExecutionId).catch(() => {});
      } else {
        const created = await createFBExecution(payload);
        await runFBExecution(created.id).catch(() => {});
        if (showToast) showToast(`Deployed execution instance '${created.name}' and provisioned Runtime Attributes!`, 'success');
      }
      setWizardOpen(false);
      setSubView('executions');
      loadExecutions();
      if (refreshState) refreshState();
    } catch (e) {
      if (showToast) showToast(e.message || 'Execution deployment failed', 'error');
    }
  };

  const handleRunExecution = async (ex) => {
    try {
      const res = await runFBExecution(ex.id);
      if (showToast) showToast(`Execution '${ex.name}' ran in ${res.duration_ms}ms`, 'success');
      loadExecutions();
      if (refreshState) refreshState();
    } catch (e) {
      if (showToast) showToast(e.message || 'Run failed', 'error');
    }
  };

  const handleToggleExecutionStatus = async (ex) => {
    try {
      if (ex.status === 'ACTIVE') {
        await pauseFBExecution(ex.id);
        if (showToast) showToast(`Paused execution '${ex.name}'`, 'info');
      } else {
        await activateFBExecution(ex.id);
        if (showToast) showToast(`Activated execution '${ex.name}'`, 'success');
      }
      loadExecutions();
    } catch (e) {
      if (showToast) showToast(e.message || 'Status toggle failed', 'error');
    }
  };

  const handleDeleteExecution = async (ex) => {
    if (!window.confirm(`Delete execution instance '${ex.name}'?`)) return;
    try {
      await deleteFBExecution(ex.id);
      if (showToast) showToast(`Deleted execution instance '${ex.name}'`, 'info');
      loadExecutions();
    } catch (e) {
      if (showToast) showToast(e.message || 'Failed to delete execution', 'error');
    }
  };

  const handleViewExecutionHistory = async (ex) => {
    setHistoryExecution(ex);
    setHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const logs = await fetchFBExecutionHistory(ex.id);
      setHistoryLogs(logs);
    } catch (e) {
      console.error('History load error:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Filtered Templates
  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      if (templateFilterCategory !== 'ALL' && t.category !== templateFilterCategory) return false;
      if (templateFilterStatus !== 'ALL' && t.status !== templateFilterStatus) return false;
      if (templateSearchQuery) {
        const q = templateSearchQuery.toLowerCase();
        const matchCode = t.template_code?.toLowerCase().includes(q);
        const matchName = t.name?.toLowerCase().includes(q);
        const matchDesc = t.description?.toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchDesc) return false;
      }
      return true;
    });
  }, [templates, templateFilterCategory, templateFilterStatus, templateSearchQuery]);

  // Filtered Executions
  const filteredExecutions = useMemo(() => {
    return executions.filter(e => {
      if (executionFilterStatus !== 'ALL' && e.status !== executionFilterStatus) return false;
      if (executionSearchQuery) {
        const q = executionSearchQuery.toLowerCase();
        const matchName = e.name?.toLowerCase().includes(q);
        const matchCode = e.template_code?.toLowerCase().includes(q);
        if (!matchName && !matchCode) return false;
      }
      return true;
    });
  }, [executions, executionFilterStatus, executionSearchQuery]);

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      
      {/* ===================================================================== */}
      {/* TOP HEADER & SUBVIEW NAVIGATION SWITCHER                              */}
      {/* ===================================================================== */}
      <div className="h-14 border-b border-slate-800 bg-slate-900/90 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-800 text-cyan-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-wide">
                Function Block V2 Studio
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-800">
                TEMPLATE-FIRST AHI ARCHITECTURE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Reusable Block Templates, Asset Markups, Sandboxed Monaco JavaScript, and Output Runtime Attribute Provisioning
            </p>
          </div>
        </div>

        {/* View Switcher Tabs: Block Templates vs Block Executions */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-950 p-1 rounded-lg border border-slate-800 flex items-center gap-1">
            <button
              onClick={() => setSubView('templates')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-all ${
                subView === 'templates'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Workflow size={14} />
              <span>Block Templates ({templates.length})</span>
            </button>
            <button
              onClick={() => setSubView('executions')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-all ${
                subView === 'executions'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Activity size={14} />
              <span>Block Executions ({executions.length})</span>
            </button>
          </div>

          {subView === 'templates' ? (
            <button
              onClick={handleOpenCreateTemplate}
              className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Plus size={14} />
              <span>Create Block Template</span>
            </button>
          ) : (
            <button
              onClick={() => {
                const published = templates.filter(t => t.status === 'PUBLISHED');
                if (published.length === 0) {
                  if (showToast) showToast('Please publish at least one Block Template first', 'warning');
                  return;
                }
                handleStartDeployWizard(published[0]);
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Plus size={14} />
              <span>Deploy Block Execution</span>
            </button>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SUBVIEW 1: BLOCK TEMPLATES MANAGER (PART 3)                           */}
      {/* ===================================================================== */}
      {subView === 'templates' && (
        <div className="flex-1 flex flex-col p-6 min-h-0 overflow-y-auto">
          {/* Filter & Search Bar */}
          <div className="flex items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search templates by code or name..."
                  value={templateSearchQuery}
                  onChange={(e) => setTemplateSearchQuery(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-72"
                />
              </div>

              {/* Category Filter */}
              <select
                value={templateFilterCategory}
                onChange={(e) => setTemplateFilterCategory(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
              >
                <option value="ALL">All Categories</option>
                <option value="Analytics">Analytics</option>
                <option value="Calculation">Calculation</option>
                <option value="Energy & Sustainability">Energy & Sustainability</option>
                <option value="Control">Control</option>
                <option value="Custom">Custom</option>
              </select>

              {/* Status Filter */}
              <select
                value={templateFilterStatus}
                onChange={(e) => setTemplateFilterStatus(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="PUBLISHED">Published</option>
                <option value="DRAFT">Draft</option>
                <option value="VALIDATED">Validated</option>
                <option value="RETIRED">Retired</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadTemplates}
                className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-white"
                title="Refresh templates"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {/* Templates Grid / Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map(tmpl => {
              const isPublished = tmpl.status === 'PUBLISHED';
              const isDraft = tmpl.status === 'DRAFT';
              const isValidated = tmpl.status === 'VALIDATED';

              return (
                <div
                  key={tmpl.id}
                  className="bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 rounded-xl p-5 flex flex-col justify-between transition-all group shadow-sm hover:shadow-md"
                >
                  <div>
                    {/* Header: Code & Status */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-900 px-2 py-0.5 rounded">
                          {tmpl.template_code}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          v{tmpl.version}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isPublished
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : isValidated
                            ? 'bg-blue-950 text-blue-400 border border-blue-800'
                            : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}
                      >
                        {tmpl.status}
                      </span>
                    </div>

                    {/* Name & Description */}
                    <h3 className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors mb-1">
                      {tmpl.name}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 mb-4">
                      {tmpl.description || 'No description provided.'}
                    </p>

                    {/* Meta tags: Markups, Inputs, Outputs */}
                    <div className="grid grid-cols-3 gap-2 py-2.5 px-3 bg-slate-950/60 rounded-lg border border-slate-900 mb-4 text-center">
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Markups</span>
                        <span className="text-xs font-mono font-semibold text-slate-300">
                          {tmpl.markups?.length || 0}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Inputs</span>
                        <span className="text-xs font-mono font-semibold text-slate-300">
                          {tmpl.inputs?.length || 0}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Outputs</span>
                        <span className="text-xs font-mono font-semibold text-emerald-400">
                          {tmpl.outputs?.length || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleEditTemplate(tmpl)}
                        className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 transition-colors"
                        title="Edit Template Definition"
                      >
                        <Edit3 size={12} />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveGraphTarget({ template: tmpl, execution: null });
                          setGraphModalOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-md bg-cyan-950/80 border border-cyan-800 hover:bg-cyan-900 text-cyan-300 text-xs font-medium flex items-center gap-1 transition-colors"
                        title="Open Yokogawa OpreX AHI UDF Graph"
                      >
                        <Workflow size={12} />
                        <span>AHI Graph</span>
                      </button>

                      {isPublished && (
                        <button
                          onClick={() => handleStartDeployWizard(tmpl)}
                          className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1 transition-colors shadow-sm"
                          title="Deploy Execution Instance to Actual Assets"
                        >
                          <Play size={12} />
                          <span>Deploy</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCloneTemplate(tmpl)}
                        className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                        title="Clone Template"
                      >
                        <Copy size={13} />
                      </button>

                      {isPublished && (
                        <button
                          onClick={() => handleCreateNewVersion(tmpl)}
                          className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                          title="Create New Draft Version"
                        >
                          <GitBranch size={13} />
                        </button>
                      )}

                      <button
                        onClick={() => handleExportTemplate(tmpl)}
                        className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                        title="Export Template (JSON)"
                      >
                        <Download size={13} />
                      </button>

                      <button
                        onClick={() => handleDeleteTemplate(tmpl)}
                        className="p-1.5 rounded hover:bg-red-950/60 text-slate-500 hover:text-red-400"
                        title="Delete / Retire Template"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <Box className="w-12 h-12 text-slate-600 mb-3" />
              <h3 className="text-sm font-semibold text-slate-300 mb-1">No Block Templates Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mb-4">
                Create a reusable Block Template to define Asset Markups, Input interfaces, and Output Runtime Attributes before deploying to physical equipment.
              </p>
              <button
                onClick={handleOpenCreateTemplate}
                className="px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-2"
              >
                <Plus size={14} />
                <span>Create New Template</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUBVIEW 2: BLOCK EXECUTIONS MANAGER (PARTS 10 & 11)                   */}
      {/* ===================================================================== */}
      {subView === 'executions' && (
        <div className="flex-1 flex flex-col p-6 min-h-0 overflow-y-auto">
          {/* Filter & Search Bar */}
          <div className="flex items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search execution instances..."
                  value={executionSearchQuery}
                  onChange={(e) => setExecutionSearchQuery(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-72"
                />
              </div>

              {/* Status Filter */}
              <select
                value={executionFilterStatus}
                onChange={(e) => setExecutionFilterStatus(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PAUSED">Paused</option>
                <option value="ERROR">Error</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadExecutions}
                className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-white"
                title="Refresh executions"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {/* Executions Table */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Execution Name & ID</th>
                  <th className="py-3 px-4">Template Version</th>
                  <th className="py-3 px-4">Asset Bindings</th>
                  <th className="py-3 px-4">Trigger Policy</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Run & KPI Output</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredExecutions.map(ex => {
                  const isActive = ex.status === 'ACTIVE';
                  const isError = ex.status === 'ERROR';

                  return (
                    <tr key={ex.id} className="hover:bg-slate-800/30 transition-colors">
                      {/* Name & ID */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{ex.name}</div>
                        <div className="font-mono text-[11px] text-slate-500">{ex.id}</div>
                      </td>

                      {/* Template Version */}
                      <td className="py-3 px-4 font-mono text-xs">
                        <span className="text-cyan-400">{ex.template_code}</span>
                        <span className="text-slate-500 ml-1.5">v{ex.template_version}</span>
                      </td>

                      {/* Asset Bindings */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(ex.asset_bindings || {}).map(([ph, aid]) => {
                            const ast = assets.find(a => a.id === aid);
                            return (
                              <span
                                key={ph}
                                className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-950 text-slate-300 border border-slate-800"
                                title={`${ph} mapped to ${ast?.name || aid}`}
                              >
                                {ph} → <strong className="text-cyan-300">{ast?.name || aid}</strong>
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      {/* Trigger Policy */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} className="text-slate-500" />
                          <span>{ex.trigger_config?.type || 'MANUAL'}</span>
                        </div>
                        {ex.trigger_config?.trigger_attribute && (
                          <div className="text-[10px] text-slate-500">
                            Tag: @{ex.trigger_config.trigger_attribute}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isActive
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : isError
                              ? 'bg-red-950 text-red-400 border border-red-800'
                              : 'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-current'}`} />
                          {ex.status}
                        </span>
                      </td>

                      {/* Last Run & Output KPIs */}
                      <td className="py-3 px-4">
                        <div className="text-[11px] text-slate-400 font-mono">
                          {ex.last_run_at ? new Date(ex.last_run_at).toLocaleTimeString() : 'Never run'}
                          {ex.last_execution_ms ? ` (${ex.last_execution_ms}ms)` : ''}
                        </div>
                        {ex.last_output_data && Object.keys(ex.last_output_data).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Object.entries(ex.last_output_data).slice(0, 2).map(([k, v]) => (
                              <span key={k} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-950 font-mono text-emerald-300 border border-emerald-900/60">
                                {k}: {String(v)}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setActiveGraphTarget({ template: ex.template_snapshot, execution: ex });
                              setGraphModalOpen(true);
                            }}
                            className="p-1.5 rounded bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-800"
                            title="Open Yokogawa OpreX AHI UDF Graph with live bound assets"
                          >
                            <Workflow size={13} />
                          </button>

                          <button
                            onClick={() => handleRunExecution(ex)}
                            className="p-1.5 rounded bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800"
                            title="Execute Immediately"
                          >
                            <Play size={13} />
                          </button>

                          <button
                            onClick={() => handleOpenEditExecution(ex)}
                            className="p-1.5 rounded bg-blue-950/80 hover:bg-blue-900 text-blue-300 border border-blue-800"
                            title="Edit Execution Bindings & Mappings"
                          >
                            <Edit3 size={13} />
                          </button>

                          <button
                            onClick={() => handleToggleExecutionStatus(ex)}
                            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                            title={isActive ? 'Pause execution' : 'Activate execution'}
                          >
                            {isActive ? <Pause size={13} /> : <Play size={13} />}
                          </button>

                          <button
                            onClick={() => handleViewExecutionHistory(ex)}
                            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                            title="View Execution Trace Logs"
                          >
                            <History size={13} />
                          </button>

                          <button
                            onClick={() => handleDeleteExecution(ex)}
                            className="p-1.5 rounded hover:bg-red-950/60 text-slate-500 hover:text-red-400"
                            title="Delete execution"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredExecutions.length === 0 && (
              <div className="p-12 text-center text-slate-500">
                <Activity className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                <p className="text-xs">No active block execution instances deployed.</p>
                <p className="text-[11px] text-slate-600 mt-1">
                  Click 'Deploy Block Execution' from any published template to bind physical assets and activate calculations.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: BLOCK TEMPLATE DESIGNER STUDIO (PARTS 3-9)                   */}
      {/* ===================================================================== */}
      {designerOpen && editingTemplate && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            
            {/* Modal Header */}
            <div className="h-14 border-b border-slate-800 bg-slate-950 px-6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400">
                  <Code2 size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-white">
                      Block Template Designer: {editingTemplate.name}
                    </h2>
                    <span className="font-mono text-xs text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-900">
                      {editingTemplate.template_code} (v{editingTemplate.version})
                    </span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {editingTemplate.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons in Modal Header */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveDraftTemplate}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
                >
                  <Save size={13} />
                  <span>Save Draft</span>
                </button>

                <button
                  onClick={handleValidateDesigner}
                  className="px-3 py-1.5 rounded-lg bg-blue-950 hover:bg-blue-900 text-blue-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-blue-800"
                >
                  <ShieldCheck size={13} />
                  <span>Validate</span>
                </button>

                <button
                  onClick={handlePublishTemplateAction}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <CheckCircle2 size={13} />
                  <span>Publish v{editingTemplate.version}</span>
                </button>

                <button
                  onClick={() => setDesignerOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Stepper Navigation Tabs */}
            <div className="h-11 border-b border-slate-800 bg-slate-950/60 px-6 flex items-center gap-1 shrink-0 overflow-x-auto">
              {[
                { key: 'general', label: '1. General Info', icon: Settings },
                { key: 'markups', label: '2. Asset Markups', icon: Layers },
                { key: 'inputs', label: '3. Input Attributes', icon: ArrowRight },
                { key: 'outputs', label: '4. Output Runtime Attributes', icon: Zap },
                { key: 'code', label: '5. Monaco JavaScript', icon: Code2 },
                { key: 'mappings', label: '6. Output Mappings', icon: GitBranch },
                { key: 'validate', label: '7. Test & Validation', icon: ShieldCheck },
                { key: 'graph', label: '8. AHI Visual Graph', icon: Workflow }
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = designerTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setDesignerTab(tab.key)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <Icon size={13} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Modal Body / Active Tab Content */}
            <div className="flex-1 min-h-0 overflow-y-auto p-6 bg-slate-950/40">
              
              {/* TAB 1: GENERAL INFO */}
              {designerTab === 'general' && (
                <div className="max-w-3xl space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Template Name *
                      </label>
                      <input
                        type="text"
                        value={editingTemplate.name}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Unique Template Code *
                      </label>
                      <input
                        type="text"
                        value={editingTemplate.template_code}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, template_code: e.target.value.toUpperCase() })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-cyan-400 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                      <select
                        value={editingTemplate.category}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, category: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value="Analytics">Analytics</option>
                        <option value="Calculation">Calculation</option>
                        <option value="Energy & Sustainability">Energy & Sustainability</option>
                        <option value="Control">Control</option>
                        <option value="Custom">Custom</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Asset Type</label>
                      <input
                        type="text"
                        value={editingTemplate.asset_type}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, asset_type: e.target.value })}
                        placeholder="e.g. Pump, Motor, Column"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Version</label>
                      <input
                        type="text"
                        value={editingTemplate.version}
                        disabled
                        className="w-full bg-slate-900/50 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-400 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                    <textarea
                      rows={3}
                      value={editingTemplate.description}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: ASSET MARKUP DESIGNER (PART 4) */}
              {designerTab === 'markups' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Custom Asset Markups (Logical Placeholders)</h3>
                      <p className="text-xs text-slate-400">
                        Define reusable placeholders such as @Pump, @Motor, @Process. Deployed instances bind actual plant assets to these placeholders.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const next = [...(editingTemplate.markups || [])];
                        next.push({
                          id: `mk-${Date.now()}`,
                          name: `Asset_${next.length + 1}`,
                          placeholder: `@Asset_${next.length + 1}`,
                          expected_asset_type: 'EQUIPMENT',
                          description: '',
                          required: true,
                          selection_scope: 'EQUIPMENT',
                          device_markup: ''
                        });
                        setEditingTemplate({ ...editingTemplate, markups: next });
                      }}
                      className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Plus size={13} />
                      <span>Add Asset Markup</span>
                    </button>
                  </div>

                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">Placeholder (@)</th>
                          <th className="py-2.5 px-3">Markup Name</th>
                          <th className="py-2.5 px-3">Expected Type</th>
                          <th className="py-2.5 px-3">Device Markup</th>
                          <th className="py-2.5 px-3">Required</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-sans">
                        {(editingTemplate.markups || []).map((m, idx) => (
                          <tr key={m.id || idx}>
                            <td className="py-2 px-3 font-mono">
                              <input
                                type="text"
                                value={m.placeholder}
                                onChange={(e) => {
                                  const next = [...editingTemplate.markups];
                                  next[idx].placeholder = e.target.value.startsWith('@') ? e.target.value : `@${e.target.value}`;
                                  setEditingTemplate({ ...editingTemplate, markups: next });
                                }}
                                className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-cyan-300 font-mono w-32"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={m.name}
                                onChange={(e) => {
                                  const next = [...editingTemplate.markups];
                                  next[idx].name = e.target.value;
                                  setEditingTemplate({ ...editingTemplate, markups: next });
                                }}
                                className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white w-40"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <select
                                value={m.expected_asset_type}
                                onChange={(e) => {
                                  const next = [...editingTemplate.markups];
                                  next[idx].expected_asset_type = e.target.value;
                                  setEditingTemplate({ ...editingTemplate, markups: next });
                                }}
                                className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300"
                              >
                                <option value="EQUIPMENT">EQUIPMENT</option>
                                <option value="UNIT">UNIT</option>
                                <option value="AREA">AREA</option>
                                <option value="SITE">SITE</option>
                              </select>
                            </td>
                            <td className="py-2 px-3 font-mono">
                              <input
                                type="text"
                                value={m.device_markup || ''}
                                placeholder="@DevicePlaceholder"
                                onChange={(e) => {
                                  const next = [...editingTemplate.markups];
                                  next[idx].device_markup = e.target.value;
                                  setEditingTemplate({ ...editingTemplate, markups: next });
                                }}
                                className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 font-mono w-36"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="checkbox"
                                checked={m.required}
                                onChange={(e) => {
                                  const next = [...editingTemplate.markups];
                                  next[idx].required = e.target.checked;
                                  setEditingTemplate({ ...editingTemplate, markups: next });
                                }}
                                className="rounded bg-slate-900 border-slate-800 text-cyan-600 focus:ring-0"
                              />
                            </td>
                            <td className="py-2 px-3 text-right">
                              <button
                                onClick={() => {
                                  const next = editingTemplate.markups.filter((_, i) => i !== idx);
                                  setEditingTemplate({ ...editingTemplate, markups: next });
                                }}
                                className="p-1 text-slate-500 hover:text-red-400"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: INPUT ATTRIBUTES (PART 5) */}
              {designerTab === 'inputs' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Input Asset Attribute Interface</h3>
                      <p className="text-xs text-slate-400">
                        Define input variables used in calculate(ctx, inputs) BEFORE writing JavaScript. Reference target Asset Markups and engineering units.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const next = [...(editingTemplate.inputs || [])];
                        next.push({
                          id: `inp-${Date.now()}`,
                          name: `input_${next.length + 1}`,
                          display_name: `Input Variable ${next.length + 1}`,
                          description: '',
                          asset_markup: editingTemplate.markups[0]?.placeholder || '@Equipment',
                          attribute_reference: 'Tag',
                          attribute_type: 'Dynamic',
                          data_type: 'Double',
                          uom: '',
                          required: true,
                          default_value: 0.0,
                          quality_policy: 'STRICT',
                          max_data_age_sec: 60,
                          missing_data_policy: 'USE_DEFAULT'
                        });
                        setEditingTemplate({ ...editingTemplate, inputs: next });
                      }}
                      className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Plus size={13} />
                      <span>Add Input Attribute</span>
                    </button>
                  </div>

                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">Variable Name</th>
                          <th className="py-2.5 px-3">Asset Markup Ref</th>
                          <th className="py-2.5 px-3">Expected Tag / Attr</th>
                          <th className="py-2.5 px-3">Data Type</th>
                          <th className="py-2.5 px-3">UoM</th>
                          <th className="py-2.5 px-3">Quality Policy</th>
                          <th className="py-2.5 px-3">Default Value</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-sans">
                        {(editingTemplate.inputs || []).map((inp, idx) => (
                          <tr key={inp.id || idx}>
                            <td className="py-2 px-3 font-mono">
                              <input
                                type="text"
                                value={inp.name}
                                onChange={(e) => {
                                  const next = [...editingTemplate.inputs];
                                  next[idx].name = e.target.value;
                                  setEditingTemplate({ ...editingTemplate, inputs: next });
                                }}
                                className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-cyan-300 font-mono w-28"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <select
                                value={inp.asset_markup}
                                onChange={(e) => {
                                  const next = [...editingTemplate.inputs];
                                  next[idx].asset_markup = e.target.value;
                                  setEditingTemplate({ ...editingTemplate, inputs: next });
                                }}
                                className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 font-mono"
                              >
                                {(editingTemplate.markups || []).map(m => (
                                  <option key={m.placeholder} value={m.placeholder}>{m.placeholder}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={inp.attribute_reference}
                                onChange={(e) => {
                                  const next = [...editingTemplate.inputs];
                                  next[idx].attribute_reference = e.target.value;
                                  setEditingTemplate({ ...editingTemplate, inputs: next });
                                }}
                                className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white w-28"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <select
                                value={inp.data_type}
                                onChange={(e) => {
                                  const next = [...editingTemplate.inputs];
                                  next[idx].data_type = e.target.value;
                                  setEditingTemplate({ ...editingTemplate, inputs: next });
                                }}
                                className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300"
                              >
                                <option value="Double">Double</option>
                                <option value="Boolean">Boolean</option>
                                <option value="Int">Int</option>
                                <option value="String">String</option>
                              </select>
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={inp.uom}
                                placeholder="e.g. m3/h"
                                onChange={(e) => {
                                  const next = [...editingTemplate.inputs];
                                  next[idx].uom = e.target.value;
                                  setEditingTemplate({ ...editingTemplate, inputs: next });
                                }}
                                className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 w-16"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <select
                                value={inp.quality_policy}
                                onChange={(e) => {
                                  const next = [...editingTemplate.inputs];
                                  next[idx].quality_policy = e.target.value;
                                  setEditingTemplate({ ...editingTemplate, inputs: next });
                                }}
                                className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-300"
                              >
                                <option value="STRICT">STRICT (Good only)</option>
                                <option value="ALLOW_UNCERTAIN">ALLOW_UNCERTAIN</option>
                              </select>
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={inp.default_value}
                                onChange={(e) => {
                                  const next = [...editingTemplate.inputs];
                                  next[idx].default_value = e.target.value;
                                  setEditingTemplate({ ...editingTemplate, inputs: next });
                                }}
                                className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 w-16"
                              />
                            </td>
                            <td className="py-2 px-3 text-right">
                              <button
                                onClick={() => {
                                  const next = editingTemplate.inputs.filter((_, i) => i !== idx);
                                  setEditingTemplate({ ...editingTemplate, inputs: next });
                                }}
                                className="p-1 text-slate-500 hover:text-red-400"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: OUTPUT RUNTIME ATTRIBUTES (PART 6) */}
              {designerTab === 'outputs' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Output Runtime Attribute Designer</h3>
                      <p className="text-xs text-slate-400">
                        Declare the Runtime Attributes that will be provisioned on target assets. When deployed, the system binds or auto-provisions these attributes with source = 'FUNCTION_BLOCK'.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const next = [...(editingTemplate.outputs || [])];
                        const nextMappings = [...(editingTemplate.output_mappings || [])];
                        const keyName = `output_${next.length + 1}`;
                        next.push({
                          id: `out-${Date.now()}`,
                          name: `Output ${next.length + 1}`,
                          output_key: keyName,
                          description: '',
                          target_asset_markup: editingTemplate.markups[0]?.placeholder || '@Equipment',
                          runtime_attribute_name: `KPI_${next.length + 1}`,
                          data_type: 'Double',
                          uom: '',
                          decimal_places: 2,
                          nullable: true,
                          default_value: 0.0,
                          script_result_key: keyName,
                          persist_historian: true,
                          publish_event: true,
                          quality_propagation_policy: 'PROPAGATE_WORST'
                        });
                        nextMappings.push({
                          script_result_key: keyName,
                          output_key: keyName,
                          target_asset_markup: editingTemplate.markups[0]?.placeholder || '@Equipment',
                          runtime_attribute_name: `KPI_${next.length + 1}`,
                          data_type: 'Double',
                          uom: ''
                        });
                        setEditingTemplate({
                          ...editingTemplate,
                          outputs: next,
                          output_mappings: nextMappings
                        });
                      }}
                      className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Plus size={13} />
                      <span>Add Output Runtime Attribute</span>
                    </button>
                  </div>

                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">Output Key</th>
                          <th className="py-2.5 px-3">Target Asset Markup</th>
                          <th className="py-2.5 px-3">Runtime Attribute Name</th>
                          <th className="py-2.5 px-3">Data Type</th>
                          <th className="py-2.5 px-3">UoM</th>
                          <th className="py-2.5 px-3">Historian</th>
                          <th className="py-2.5 px-3">Event</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-sans">
                        {(editingTemplate.outputs || []).map((out, idx) => (
                          <tr key={out.id || idx}>
                            <td className="py-2 px-3 font-mono">
                              <input
                                type="text"
                                value={out.output_key}
                                onChange={(e) => {
                                  const next = [...editingTemplate.outputs];
                                  next[idx].output_key = e.target.value;
                                  next[idx].script_result_key = e.target.value;
                                  setEditingTemplate({ ...editingTemplate, outputs: next });
                                }}
                                className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-emerald-400 font-mono w-28"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <select
                                value={out.target_asset_markup}
                                onChange={(e) => {
                                  const next = [...editingTemplate.outputs];
                                  next[idx].target_asset_markup = e.target.value;
                                  setEditingTemplate({ ...editingTemplate, outputs: next });
                                }}
                                className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 font-mono"
                              >
                                {(editingTemplate.markups || []).map(m => (
                                  <option key={m.placeholder} value={m.placeholder}>{m.placeholder}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 px-3 font-semibold text-white">
                              <input
                                type="text"
                                value={out.runtime_attribute_name}
                                onChange={(e) => {
                                  const next = [...editingTemplate.outputs];
                                  next[idx].runtime_attribute_name = e.target.value;
                                  setEditingTemplate({ ...editingTemplate, outputs: next });
                                }}
                                className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white w-32"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <select
                                value={out.data_type}
                                onChange={(e) => {
                                  const next = [...editingTemplate.outputs];
                                  next[idx].data_type = e.target.value;
                                  setEditingTemplate({ ...editingTemplate, outputs: next });
                                }}
                                className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300"
                              >
                                <option value="Double">Double</option>
                                <option value="Boolean">Boolean</option>
                                <option value="Int">Int</option>
                                <option value="String">String</option>
                              </select>
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={out.uom}
                                placeholder="kWh/m3"
                                onChange={(e) => {
                                  const next = [...editingTemplate.outputs];
                                  next[idx].uom = e.target.value;
                                  setEditingTemplate({ ...editingTemplate, outputs: next });
                                }}
                                className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 w-16"
                              />
                            </td>
                            <td className="py-2 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={out.persist_historian}
                                onChange={(e) => {
                                  const next = [...editingTemplate.outputs];
                                  next[idx].persist_historian = e.target.checked;
                                  setEditingTemplate({ ...editingTemplate, outputs: next });
                                }}
                                className="rounded bg-slate-900 border-slate-800 text-cyan-600 focus:ring-0"
                              />
                            </td>
                            <td className="py-2 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={out.publish_event}
                                onChange={(e) => {
                                  const next = [...editingTemplate.outputs];
                                  next[idx].publish_event = e.target.checked;
                                  setEditingTemplate({ ...editingTemplate, outputs: next });
                                }}
                                className="rounded bg-slate-900 border-slate-800 text-cyan-600 focus:ring-0"
                              />
                            </td>
                            <td className="py-2 px-3 text-right">
                              <button
                                onClick={() => {
                                  const next = editingTemplate.outputs.filter((_, i) => i !== idx);
                                  setEditingTemplate({ ...editingTemplate, outputs: next });
                                }}
                                className="p-1 text-slate-500 hover:text-red-400"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 5: MONACO JAVASCRIPT EDITOR (PART 7) */}
              {designerTab === 'code' && (
                <div className="h-full flex flex-col space-y-3">
                  {/* Variable reference bar */}
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2 overflow-x-auto">
                      <span className="text-[11px] font-bold uppercase text-slate-500">Inputs:</span>
                      {(editingTemplate.inputs || []).map(inp => (
                        <span
                          key={inp.name}
                          className="px-2 py-0.5 rounded bg-slate-950 text-cyan-300 font-mono text-[11px] border border-slate-800"
                          title={`${inp.name} (${inp.data_type}) from ${inp.asset_markup}`}
                        >
                          inputs.{inp.name}
                        </span>
                      ))}

                      <div className="w-[1px] h-4 bg-slate-800 mx-2" />

                      <span className="text-[11px] font-bold uppercase text-slate-500">Outputs:</span>
                      {(editingTemplate.outputs || []).map(out => (
                        <span
                          key={out.output_key}
                          className="px-2 py-0.5 rounded bg-slate-950 text-emerald-400 font-mono text-[11px] border border-slate-800"
                          title={`Target: ${out.target_asset_markup}.${out.runtime_attribute_name}`}
                        >
                          {out.output_key}
                        </span>
                      ))}
                    </div>

                    <div className="text-[11px] text-slate-400 font-mono">
                      Isolated Node.js Sandbox (Memory Ceiled, Anti-XSS, Resource Guards)
                    </div>
                  </div>

                  {/* Monaco Editor Container */}
                  <div className="flex-1 min-h-[360px] border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                    <Editor
                      height="100%"
                      defaultLanguage="javascript"
                      theme="vs-dark"
                      value={editingTemplate.script_code}
                      onChange={(val) => setEditingTemplate({ ...editingTemplate, script_code: val || '' })}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 13,
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        tabSize: 2,
                        wordWrap: 'on'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* TAB 6: OUTPUT MAPPINGS (PART 8) */}
              {designerTab === 'mappings' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white">Script Result Key → Runtime Attribute Mapping</h3>
                    <p className="text-xs text-slate-400">
                      Visual structured contract connecting JavaScript return object properties to target physical assets and runtime attributes.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {(editingTemplate.outputs || []).map(out => (
                      <div
                        key={out.output_key}
                        className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between"
                      >
                        {/* Source Script Field */}
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-900 text-emerald-400 font-mono text-xs">
                            result.{out.output_key}
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-500" />
                          <div>
                            <div className="text-xs font-semibold text-white">
                              Runtime Attribute: {out.runtime_attribute_name}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              Type: {out.data_type} ({out.uom || 'no unit'})
                            </div>
                          </div>
                        </div>

                        {/* Destination Target Asset Markup */}
                        <div className="flex items-center gap-3">
                          <ArrowRight className="w-4 h-4 text-slate-500" />
                          <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-900 text-cyan-300 font-mono text-xs">
                            Asset Placeholder: {out.target_asset_markup}
                          </div>
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 7: VALIDATION, TESTING & PUBLISH GATE (PART 9) */}
              {designerTab === 'validate' && (
                <div className="space-y-6">
                  {/* Validation Status Panel */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <ShieldCheck className="w-5 h-5 text-cyan-400" />
                        <h3 className="text-sm font-bold text-white">Template Integrity & Validation Checklist</h3>
                      </div>
                      <button
                        onClick={handleValidateDesigner}
                        className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5"
                      >
                        <ShieldCheck size={14} />
                        <span>Run Full Validation Check</span>
                      </button>
                    </div>

                    {designerValidation ? (
                      <div className="space-y-2">
                        {designerValidation.valid ? (
                          <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>All schemas, JavaScript syntax, unique markups, and output mappings are 100% valid. Ready to publish!</span>
                          </div>
                        ) : (
                          <div className="p-3 bg-red-950/60 border border-red-800 rounded-lg text-red-300 text-xs space-y-1">
                            <div className="font-semibold flex items-center gap-1.5 text-red-200">
                              <AlertTriangle className="w-4 h-4 text-red-400" />
                              <span>Validation Errors Detected:</span>
                            </div>
                            {designerValidation.errors.map((err, i) => (
                              <div key={i} className="pl-6 font-mono text-[11px] text-red-300">• {err}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">
                        Click 'Run Full Validation Check' to verify port naming, circular dependencies, script syntax, and output mappings before publication.
                      </p>
                    )}
                  </div>

                  {/* Sandbox Test Simulator */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold text-slate-300">Test Inputs JSON</label>
                        <button
                          onClick={handleTestInSandbox}
                          disabled={testingInSandbox}
                          className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-1"
                        >
                          <Play size={12} />
                          <span>{testingInSandbox ? 'Testing...' : 'Test Calculation'}</span>
                        </button>
                      </div>
                      <textarea
                        rows={6}
                        value={testInputsJson}
                        onChange={(e) => setTestInputsJson(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col">
                      <div className="text-xs font-semibold text-slate-300 mb-2">Calculation Output & Logs</div>
                      <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2.5 font-mono text-xs overflow-y-auto">
                        {designerTestResult ? (
                          designerTestResult.success ? (
                            <div className="space-y-2">
                              <div className="text-emerald-400 font-semibold">
                                ✓ Success ({designerTestResult.duration_ms}ms)
                              </div>
                              <pre className="text-slate-200 text-[11px]">
                                {JSON.stringify(designerTestResult.result, null, 2)}
                              </pre>
                              {designerTestResult.logs && designerTestResult.logs.length > 0 && (
                                <div className="pt-2 border-t border-slate-800 text-slate-400 text-[10px]">
                                  <strong>Console Logs:</strong>
                                  {designerTestResult.logs.map((l, i) => (
                                    <div key={i}>{l}</div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-red-400">
                              Error: {designerTestResult.error}
                            </div>
                          )
                        ) : (
                          <span className="text-slate-600">Run test calculation to view simulated outputs...</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 8: AHI VISUAL GRAPH (IMAGE 2) */}
              {designerTab === 'graph' && (
                <div className="h-[620px] rounded-xl overflow-hidden border border-slate-800">
                  <AhiVisualGraph template={editingTemplate} assets={assets} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: BLOCK EXECUTION DEPLOYMENT WIZARD (PART 10)                  */}
      {/* ===================================================================== */}
      {wizardOpen && selectedTemplateForDeploy && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col">
            
            {/* Header */}
            <div className="h-14 border-b border-slate-800 bg-slate-950 px-6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400">
                  <Play size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">
                    {editingExecutionId ? 'Edit Block Execution Instance' : 'Deploy Block Execution Instance'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Template: {selectedTemplateForDeploy.name} ({selectedTemplateForDeploy.template_code} v{selectedTemplateForDeploy.version})
                  </p>
                </div>
              </div>
              <button onClick={() => setWizardOpen(false)} className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800">
                <X size={16} />
              </button>
            </div>

            {/* Stepper Tabs */}
            <div className="h-10 border-b border-slate-800 bg-slate-950/60 px-6 flex items-center gap-4 text-xs font-medium text-slate-400">
              <span className={wizardStep === 1 ? 'text-cyan-400 font-bold' : ''}>1. Name & Assets</span>
              <span className="text-slate-700">›</span>
              <span className={wizardStep === 2 ? 'text-cyan-400 font-bold' : ''}>2. Input Tag Binding</span>
              <span className="text-slate-700">›</span>
              <span className={wizardStep === 3 ? 'text-cyan-400 font-bold' : ''}>3. Output Provisioning & Triggers</span>
            </div>

            {/* Step Body */}
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
              
              {/* STEP 1: Name and Asset Markup Mapping */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Execution Instance Name *
                    </label>
                    <input
                      type="text"
                      value={wizardExecutionName}
                      onChange={(e) => setWizardExecutionName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Resolve Asset Markup Placeholders to Actual Equipment Assets
                    </h4>
                    <div className="space-y-2">
                      {(selectedTemplateForDeploy.markups || []).map(mk => (
                        <div key={mk.placeholder} className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-lg">
                          <div>
                            <span className="font-mono text-xs font-bold text-cyan-400 mr-2">
                              {mk.placeholder}
                            </span>
                            <span className="text-xs text-slate-300">({mk.name})</span>
                          </div>
                          <select
                            value={wizardAssetBindings[mk.placeholder] || ''}
                            onChange={(e) => {
                              const nextBindings = {
                                ...wizardAssetBindings,
                                [mk.placeholder]: e.target.value
                              };
                              setWizardAssetBindings(nextBindings);
                              const { inputs, outputs } = syncBindingsForAssets(
                                selectedTemplateForDeploy,
                                nextBindings,
                                wizardInputBindings,
                                wizardOutputBindings
                              );
                              setWizardInputBindings(inputs);
                              setWizardOutputBindings(outputs);
                            }}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white w-64"
                          >
                            {assets.map(a => (
                              <option key={a.id} value={a.id}>
                                {a.name} ({a.level})
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Input Tag Binding */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Bind Input Ports to Physical Asset Attributes
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      Values automatically fed into Function Block script execution
                    </span>
                  </div>
                  <div className="space-y-3">
                    {(selectedTemplateForDeploy.inputs || []).map(inp => {
                      const boundAid = wizardAssetBindings[inp.asset_markup] || assets[0]?.id;
                      const boundAsset = assets.find(a => a.id === boundAid);
                      const currentBinding = wizardInputBindings[inp.name] || {};
                      const assetAttrs = boundAsset?.attributes || [];

                      return (
                        <div key={inp.name} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-cyan-300">
                                {inp.name}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-mono">
                                {inp.data_type || 'Double'}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                from <span className="text-cyan-400 font-semibold">{inp.asset_markup}</span> ({boundAsset?.name || 'Not Bound'})
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={async () => {
                                const attrName = prompt(`Create attribute on ${boundAsset?.name || 'Asset'} for input '${inp.name}':`, inp.attribute_reference || inp.name);
                                if (!attrName) return;
                                try {
                                  const newAttr = await addAssetAttribute(boundAid, {
                                    name: attrName,
                                    type: 'Dynamic',
                                    value: '0',
                                    data_type: inp.data_type || 'Double',
                                    uom: inp.uom || ''
                                  });
                                  if (showToast) showToast(`Added attribute '${attrName}' to ${boundAsset?.name}`, 'success');
                                  if (refreshState) await refreshState();
                                  setWizardInputBindings({
                                    ...wizardInputBindings,
                                    [inp.name]: {
                                      asset_id: boundAid,
                                      attribute_name: attrName,
                                      attribute_id: newAttr?.id || ''
                                    }
                                  });
                                } catch (err) {
                                  if (showToast) showToast('Failed to create attribute: ' + err.message, 'error');
                                }
                              }}
                              className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 hover:underline"
                            >
                              <Plus size={11} /> + Quick Add Attribute
                            </button>
                          </div>

                          <div className="flex items-center gap-3">
                            <select
                              value={currentBinding.attribute_name || inp.attribute_reference}
                              onChange={(e) => {
                                const selectedAttr = assetAttrs.find(a => a.name === e.target.value);
                                setWizardInputBindings({
                                  ...wizardInputBindings,
                                  [inp.name]: {
                                    asset_id: boundAid,
                                    attribute_name: e.target.value,
                                    attribute_id: selectedAttr?.id || ''
                                  }
                                });
                              }}
                              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                            >
                              <option value="">-- Select Attribute from {boundAsset?.name || 'Asset'} --</option>
                              {assetAttrs.map(a => (
                                <option key={a.id || a.name} value={a.name}>
                                  {a.name} ({a.type}) [Val: {a.value ?? '-'}] {a.uom ? `• ${a.uom}` : ''}
                                </option>
                              ))}
                            </select>

                            <div className="shrink-0 text-[11px] text-slate-400 font-mono">
                              Units: {inp.uom || 'None'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 3: Preview Output Provisioning & Triggers */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
                      Runtime Attributes to Write on Plant Assets (Yokogawa AHI)
                    </h4>
                    <p className="text-xs text-slate-400 mb-3">
                      Configure how each calculation output is written. The engine provisions/links the attribute with source = 'FUNCTION_BLOCK' so the calculated value is recorded automatically.
                    </p>
                    <div className="space-y-3">
                      {wizardOutputBindings.map((ob, idx) => {
                        const targetAid = wizardAssetBindings[ob.target_asset_markup];
                        const targetAsset = assets.find(a => a.id === targetAid);
                        const assetAttrs = targetAsset?.attributes || [];
                        const tmplOut = (selectedTemplateForDeploy.outputs || []).find(o => o.output_key === ob.output_key);

                        return (
                          <div key={ob.output_key} className="p-3 bg-slate-950 border border-emerald-900/60 rounded-xl space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-cyan-300 font-bold">[{ob.output_key}]</span>
                                <span className="text-slate-300">from {ob.target_asset_markup}</span>
                                {tmplOut && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-emerald-400 font-mono">
                                    {tmplOut.data_type || 'Double'} {tmplOut.uom ? `(${tmplOut.uom})` : ''}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] font-mono text-emerald-400">
                                Target Asset: <strong>{targetAsset?.name || targetAid || 'Not Bound'}</strong>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-1">
                              <div>
                                <label className="block text-[10px] text-slate-400 mb-1">
                                  {ob.mode === 'MAP_EXISTING' ? 'Target Attribute' : 'Target Runtime Attribute Name *'}
                                </label>
                                {ob.mode === 'MAP_EXISTING' ? (
                                  <select
                                    value={ob.attribute_id}
                                    onChange={(e) => {
                                      const next = [...wizardOutputBindings];
                                      next[idx].attribute_id = e.target.value;
                                      const sel = assetAttrs.find(a => a.id === e.target.value);
                                      if (sel) next[idx].runtime_attribute_name = sel.name;
                                      setWizardOutputBindings(next);
                                    }}
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white"
                                  >
                                    <option value="">-- Select Existing Attribute --</option>
                                    {assetAttrs.map(a => (
                                      <option key={a.id} value={a.id}>
                                        {a.name} ({a.type}) {a.source === 'FUNCTION_BLOCK' ? '[FB Runtime]' : ''} [Val: {a.value ?? '-'}]
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    value={ob.runtime_attribute_name}
                                    onChange={(e) => {
                                      const next = [...wizardOutputBindings];
                                      next[idx].runtime_attribute_name = e.target.value;
                                      setWizardOutputBindings(next);
                                    }}
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white"
                                    placeholder="e.g. SpecificEnergy"
                                  />
                                )}
                              </div>

                              <div>
                                <label className="block text-[10px] text-slate-400 mb-1">Binding Mode</label>
                                <select
                                  value={ob.mode}
                                  onChange={(e) => {
                                    const next = [...wizardOutputBindings];
                                    next[idx].mode = e.target.value;
                                    setWizardOutputBindings(next);
                                  }}
                                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200"
                                >
                                  <option value="CREATE_NEW">Auto-Provision New Attribute</option>
                                  <option value="MAP_EXISTING">Write to Existing Attribute</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Trigger Configuration
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Trigger Type</label>
                        <select
                          value={wizardTriggerConfig.type}
                          onChange={(e) => setWizardTriggerConfig({ ...wizardTriggerConfig, type: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        >
                          <option value="ATTRIBUTE_UPDATED">Any Bound Attribute Updated</option>
                          <option value="TRIGGER_ATTRIBUTE_UPDATED">Designated Trigger Attribute Updated</option>
                          <option value="SCHEDULED">Scheduled Interval</option>
                          <option value="MANUAL">Manual Trigger Only</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Debounce (ms)</label>
                        <input
                          type="number"
                          value={wizardTriggerConfig.debounce_ms}
                          onChange={(e) => setWizardTriggerConfig({ ...wizardTriggerConfig, debounce_ms: Number(e.target.value) })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Navigation */}
            <div className="h-14 border-t border-slate-800 bg-slate-950 px-6 flex items-center justify-between shrink-0">
              <button
                onClick={() => setWizardStep(prev => Math.max(1, prev - 1))}
                disabled={wizardStep === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 text-xs font-semibold"
              >
                Back
              </button>

              {wizardStep < 3 ? (
                <button
                  onClick={() => setWizardStep(prev => prev + 1)}
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
                >
                  Continue ›
                </button>
              ) : (
                <button
                  onClick={handleCompleteDeployExecution}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <CheckCircle2 size={14} />
                  <span>{editingExecutionId ? 'Save & Re-bind Instance' : 'Deploy & Activate Instance'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: EXECUTION TRACE LOGS & DIAGNOSTICS (PART 11)                 */}
      {/* ===================================================================== */}
      {historyModalOpen && historyExecution && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="h-14 border-b border-slate-800 bg-slate-950 px-6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <History className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Execution Trace History</h3>
                  <p className="text-xs text-slate-400">{historyExecution.name} ({historyExecution.id})</p>
                </div>
              </div>
              <button onClick={() => setHistoryModalOpen(false)} className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-3 font-mono text-xs">
              {historyLogs.length > 0 ? (
                historyLogs.map(log => (
                  <div key={log.execution_id} className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="text-emerald-400 font-bold">{log.status}</span>
                      <span>{new Date(log.timestamp).toLocaleString()} ({log.duration_ms}ms)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-500 block mb-0.5">Inputs:</span>
                        <pre className="p-2 bg-slate-900/60 rounded border border-slate-800 text-cyan-300">
                          {JSON.stringify(log.inputs, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <span className="text-slate-500 block mb-0.5">Output KPIs:</span>
                        <pre className="p-2 bg-slate-900/60 rounded border border-slate-800 text-emerald-300">
                          {JSON.stringify(log.result, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-500">
                  No trace executions logged yet. Click 'Run Now' to execute.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: AHI VISUAL GRAPH MODAL (IMAGE 2) */}
      {graphModalOpen && activeGraphTarget.template && (
        <AhiVisualGraph
          template={activeGraphTarget.template}
          execution={activeGraphTarget.execution}
          assets={assets}
          onClose={() => setGraphModalOpen(false)}
          isModal={true}
        />
      )}

    </div>
  );
}
