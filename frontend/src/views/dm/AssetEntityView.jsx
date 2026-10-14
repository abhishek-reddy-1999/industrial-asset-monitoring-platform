import React, { useState, useMemo, useEffect } from 'react';
import { 
  Folder, FolderPlus, FileText, Image, Video, FileCode, Plus, 
  ChevronRight, ChevronDown, Bookmark, Star, MoreVertical, Edit2, 
  Copy, Trash2, Shield, Download, Upload, Zap, Database, Link, 
  Terminal, Activity, Eye, X, Check, Search, Cpu, RefreshCw, AlertCircle, Variable
} from 'lucide-react';
import { useDM } from './dmContext';
import DMCommonControls from './DMCommonControls';
import ExpressionEditor from './ExpressionEditor';
import { fetchFBExecutions, runFBExecution } from '../../api/client';

export default function AssetEntityView() {
  const {
    assets,
    assetTemplates,
    deployAssetTemplate,
    selectedAsset,
    selectedAssetId,
    setSelectedAssetId,
    createAsset,
    updateAsset,
    deleteAsset,
    reorderHierarchy,
    cloneAsset,
    toggleBookmark,
    downloadAttributeAssembly,
    addAssetAttribute,
    updateAssetAttribute,
    deleteAssetAttribute,
    createAssetTable,
    updateTableSchema,
    addTableRow,
    deleteAssetTable,
    addAssetMedia,
    deleteAssetMedia,
    createAssetTemplate,
    createObjectSecurityRule,
    devices,
    deviceTemplates = [],
    integrations,
    uomList,
    userProfile,
    showToast,
    refreshState
  } = useDM();

  // Active Tab: attributes | tables | media
  const [activeTab, setActiveTab] = useState('attributes');

  // Hierarchy Tree state
  const [treeSearch, setTreeSearch] = useState('');
  const [expandedNodes, setExpandedNodes] = useState(() => {
    const s = new Set();
    (assets || []).filter(Boolean).forEach(a => {
      if (a?.id) s.add(a.id);
    });
    return s;
  });

  useEffect(() => {
    if (assets && assets.length > 0) {
      setExpandedNodes(prev => {
        const next = new Set(prev);
        assets.filter(Boolean).forEach(a => {
          if (a?.id) next.add(a.id);
        });
        return next;
      });
    }
  }, [assets]);

  const [draggedAssetId, setDraggedAssetId] = useState(null);

  // Context Menu (Asset Element Function Dialog, Figure 2 & Table 5)
  const [contextMenu, setContextMenu] = useState(null); // { x, y, asset }

  // Modals
  const [isAddAssetModalOpen, setIsAddAssetModalOpen] = useState(false);
  const [assetFormParentId, setAssetFormParentId] = useState(null);
  const [assetFormData, setAssetFormData] = useState({ name: '', level: 'EQUIPMENT', description: '', installed_date: '2024-03-05' });
  const [editingAsset, setEditingAsset] = useState(null);
  const [assetCreateMode, setAssetCreateMode] = useState('template'); // 'template' or 'blank'
  const [chosenTemplateId, setChosenTemplateId] = useState('');
  const [templateDeviceId, setTemplateDeviceId] = useState('');

  // Attribute Modals
  const [isAttributeModalOpen, setIsAttributeModalOpen] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState(null);
  const [attributeForm, setAttributeForm] = useState({
    type: 'Dynamic',
    name: '',
    value: '0.0',
    uom: '°C',
    device_id: '',
    metric: '',
    channel: '',
    target_asset_name: '',
    target_attribute_name: '',
    expression: '',
    data_type: 'Double',
    trigger_attribute: '',
    source: '',
    function_block_id: '',
    function_block_output: '',
    runtime_mode: 'EXPRESSION'
  });

  const [fbExecutions, setFbExecutions] = useState([]);
  const [calcTestResult, setCalcTestResult] = useState(null);
  const [isTestingFB, setIsTestingFB] = useState(false);

  useEffect(() => {
    fetchFBExecutions().then(res => setFbExecutions(res || [])).catch(() => {});
  }, []);

  // Selected device for dynamic attribute mapping
  const selectedDev = useMemo(() => {
    if (!attributeForm.device_id) return null;
    return devices.find(d => 
      (d.identifier && String(d.identifier).trim().toLowerCase() === String(attributeForm.device_id).trim().toLowerCase()) ||
      (d.id && String(d.id).trim().toLowerCase() === String(attributeForm.device_id).trim().toLowerCase()) ||
      (d.name && String(d.name).trim().toLowerCase() === String(attributeForm.device_id).trim().toLowerCase())
    );
  }, [attributeForm.device_id, devices]);

  // Linked metrics available from selected device (Requirements 2)
  const linkedDeviceMetrics = useMemo(() => {
    if (!selectedDev) return [];
    const metricsMap = new Map();

    // 1. Metrics from the device's assigned template
    const devTmpl = deviceTemplates.find(t => 
      t.id === selectedDev.template_id || 
      t.template_name === selectedDev.template_name || 
      t.name === selectedDev.template_name
    );
    if (devTmpl && (devTmpl.metric_keys || devTmpl.metrics)) {
      (devTmpl.metric_keys || devTmpl.metrics).forEach(mk => {
        const k = typeof mk === 'string' ? mk : (mk.key || mk.name);
        if (k && !metricsMap.has(k)) {
          metricsMap.set(k, {
            key: k,
            name: typeof mk === 'object' ? (mk.name || k) : k,
            data_type: typeof mk === 'object' ? (mk.data_type || 'Double') : 'Double',
            source: 'Device Template Schema'
          });
        }
      });
    }

    // 2. Metrics from last_payload (including nested tags)
    if (selectedDev.last_payload && typeof selectedDev.last_payload === 'object') {
      const p = selectedDev.last_payload;
      ['tags', 'metrics', 'measurements', 'data', 'telemetry', 'values'].forEach(c => {
        if (p[c] && typeof p[c] === 'object' && !Array.isArray(p[c])) {
          Object.keys(p[c]).forEach(subK => {
            const fullKey = `${c}.${subK}`;
            if (!metricsMap.has(fullKey)) {
              metricsMap.set(fullKey, {
                key: fullKey,
                name: subK,
                data_type: 'Double',
                source: `Live Payload (${c})`
              });
            }
            if (!metricsMap.has(subK)) {
              metricsMap.set(subK, {
                key: subK,
                name: subK,
                data_type: 'Double',
                source: `Live Payload (${c} tag)`
              });
            }
          });
        }
      });

      // Top level payload keys
      Object.keys(p).forEach(k => {
        if (!['deviceid', 'device_id', 'id', 'identifier', 'timestamp', 'tags', 'metrics', 'data'].includes(k.toLowerCase())) {
          if (!metricsMap.has(k)) {
            metricsMap.set(k, {
              key: k,
              name: k,
              data_type: 'Double',
              source: 'Live Payload (root)'
            });
          }
        }
      });
    }

    return Array.from(metricsMap.values());
  }, [selectedDev, deviceTemplates]);

  const formatCleanValue = (val) => {
    if (val === null || val === undefined || val === '') return '-';
    const str = String(val).trim();
    if (!isNaN(str) && !isNaN(parseFloat(str))) {
      const num = parseFloat(str);
      if (Number.isInteger(num)) {
        return String(num);
      }
      return String(parseFloat(num.toFixed(4)));
    }
    return str;
  };

  const computeEffectiveQuality = (attr) => {
    if (!attr) return 'Bad';
    if (attr.type === 'Static') return 'Good';

    // 1. Dynamic or Command attributes: check linked IoT device status
    if (attr.type === 'Dynamic' || attr.type === 'Command') {
      const devRef = String(attr.device_id || attr.device_markup || '').trim().toLowerCase();
      if (!devRef) return attr.quality || 'Bad';
      const dev = (devices || []).find(d => 
        String(d.id || '').trim().toLowerCase() === devRef ||
        String(d.identifier || '').trim().toLowerCase() === devRef ||
        String(d.name || '').trim().toLowerCase() === devRef
      );
      if (!dev) return attr.quality || 'Bad';
      return dev.status === 'Connected' ? 'Good' : 'Bad';
    }

    if (attr.type === 'Integration') {
      return attr.quality || 'Good';
    }

    // 2. Runtime attributes: if any referenced attribute is Bad, runtime is Bad
    if (attr.type === 'Runtime') {
      const expr = attr.expression || '';
      const refs = (expr.match(/@([a-zA-Z0-9_]+)/g) || []).map(r => r.substring(1));
      if (refs.length > 0 && selectedAsset?.attributes) {
        const hasBad = refs.some(refName => {
          const refAttr = selectedAsset.attributes.find(a => 
            a.name?.toLowerCase() === refName.toLowerCase() ||
            a.name?.toLowerCase().replace(/\s+/g, '_') === refName.toLowerCase()
          );
          if (!refAttr) return false;
          return computeEffectiveQuality(refAttr) === 'Bad';
        });
        if (hasBad) return 'Bad';
      }
      return attr.quality || 'Good';
    }

    return attr.quality || 'Good';
  };

  const handleOpenAddAttribute = () => {
    setEditingAttribute(null);
    setCalcTestResult(null);
    const matchingExec = fbExecutions.find(x => 
      Object.values(x.asset_bindings || {}).includes(selectedAsset?.id)
    ) || fbExecutions[0];
    const defaultOut = matchingExec?.template_snapshot?.outputs?.[0]?.output_key || '';

    setAttributeForm({
      type: 'Dynamic',
      name: '',
      value: '0.0',
      uom: '°C',
      device_id: '',
      metric: '',
      channel: '',
      target_asset_name: '',
      target_attribute_name: '',
      expression: '',
      data_type: 'Double',
      trigger_attribute: '',
      source: '',
      function_block_id: matchingExec?.id || '',
      function_block_output: defaultOut,
      runtime_mode: 'EXPRESSION'
    });
    setIsAttributeModalOpen(true);
  };

  const handleOpenEditAttribute = (attr) => {
    setEditingAttribute(attr);
    setCalcTestResult(null);
    const isFB = attr.source === 'FUNCTION_BLOCK' || Boolean(attr.function_block_id);
    const matchingExec = fbExecutions.find(x => x.id === attr.function_block_id) || 
      fbExecutions.find(x => Object.values(x.asset_bindings || {}).includes(selectedAsset?.id)) ||
      fbExecutions[0];
    const defaultOut = matchingExec?.template_snapshot?.outputs?.[0]?.output_key || '';

    setAttributeForm({
      type: attr.type || 'Dynamic',
      name: attr.name || '',
      value: attr.value != null ? formatCleanValue(attr.value) : '0',
      uom: attr.uom || '°C',
      device_id: attr.device_id || attr.device_markup || '',
      metric: attr.metric || '',
      channel: attr.channel || '',
      target_asset_name: attr.target_asset_name || '',
      target_attribute_name: attr.target_attribute_name || '',
      expression: attr.expression || '',
      data_type: attr.data_type || 'Double',
      trigger_attribute: attr.trigger_attribute || '',
      source: attr.source || (isFB ? 'FUNCTION_BLOCK' : ''),
      function_block_id: attr.function_block_id || matchingExec?.id || '',
      function_block_output: attr.function_block_output || defaultOut,
      runtime_mode: isFB ? 'FUNCTION_BLOCK' : 'EXPRESSION'
    });
    setIsAttributeModalOpen(true);
  };

  // Table Modals
  const [isCreateTableModalOpen, setIsCreateTableModalOpen] = useState(false);

  const [tableFormData, setTableFormData] = useState({
    name: '',
    description: '',
    locked_by: userProfile.account_id,
    columns: [
      { name: 'ID', data_type: 'Varchar(25)', default_value: '1', allow_null: false, primary: true },
      { name: 'Recorded_At', data_type: 'Datetime', default_value: '2024-03-05 12:00:00', allow_null: false, primary: false },
      { name: 'Value', data_type: 'Double', default_value: '0.0', allow_null: true, primary: false }
    ]
  });
  const [activeTableId, setActiveTableId] = useState(null);
  const [isEditSchemaModalOpen, setIsEditSchemaModalOpen] = useState(false);
  const [editingSchemaTable, setEditingSchemaTable] = useState(null);
  const [isAddRowModalOpen, setIsAddRowModalOpen] = useState(false);
  const [newRowData, setNewRowData] = useState({});

  // Media Modals
  const [isAddFolderModalOpen, setIsAddFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isUploadMediaModalOpen, setIsUploadMediaModalOpen] = useState(false);
  const [mediaUploadForm, setMediaUploadForm] = useState({ name: '', content_type: 'PDF', file_size_kb: 1024, url: '' });
  const [previewMediaItem, setPreviewMediaItem] = useState(null);

  // Access Control Dialog (Table 33 Object-based Security)
  const [isAccessControlModalOpen, setIsAccessControlModalOpen] = useState(false);
  const [accessControlTargetAsset, setAccessControlTargetAsset] = useState(null);
  const [accessControlForm, setAccessControlForm] = useState({
    identity: 's.alvarez@yokogawa.com',
    privilege: ['Read Asset', 'Write Asset', 'Asset Table', 'Asset Media'],
    child_privilege: 'Update child privileges for modified identities'
  });

  // Common Controls State for Attribute Table
  const [attrSearch, setAttrSearch] = useState('');
  const [attrFilters, setAttrFilters] = useState([]);
  const [attrSortConfig, setAttrSortConfig] = useState([{ key: 'name', dir: 'asc' }]);
  const [attrHiddenCols, setAttrHiddenCols] = useState([]);
  const [attrPage, setAttrPage] = useState(1);
  const [attrPerPage, setAttrPerPage] = useState(20);

  // Toggle tree node expand
  const toggleNode = (id) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Build tree hierarchy
  const assetTree = useMemo(() => {
    const map = {};
    const roots = [];
    (assets || []).filter(Boolean).forEach(a => {
      if (a?.id) map[a.id] = { ...a, children: [] };
    });
    (assets || []).filter(Boolean).forEach(a => {
      if (!a?.id) return;
      if (a.parent_id && map[a.parent_id]) {
        map[a.parent_id].children.push(map[a.id]);
      } else if (map[a.id]) {
        roots.push(map[a.id]);
      }
    });
    return roots;
  }, [assets]);

  // Bookmarked assets
  const bookmarkedAssets = useMemo(() => {
    return (assets || []).filter(a => a && a.is_bookmarked);
  }, [assets]);

  // Right-click handler for tree node
  const handleContextMenu = (e, asset) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      asset
    });
  };

  // Drag and Drop hierarchy reorder
  const handleDragStart = (e, assetId) => {
    e.stopPropagation();
    setDraggedAssetId(assetId);
    e.dataTransfer.setData('text/plain', assetId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetParentId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedAssetId || draggedAssetId === targetParentId) return;
    reorderHierarchy(draggedAssetId, targetParentId);
    setDraggedAssetId(null);
  };

  // Filtered & Paginated Attributes
  const filteredAttributes = useMemo(() => {
    if (!selectedAsset?.attributes) return [];
    let list = [...selectedAsset.attributes];

    // Search across all columns
    if (attrSearch.trim()) {
      const q = attrSearch.toLowerCase();
      list = list.filter(a => 
        (a.name || '').toLowerCase().includes(q) ||
        (a.type || '').toLowerCase().includes(q) ||
        (a.tag_name || '').toLowerCase().includes(q) ||
        (a.value || '').toLowerCase().includes(q) ||
        (a.uom || '').toLowerCase().includes(q) ||
        (a.expression || '').toLowerCase().includes(q)
      );
    }

    // Advanced filters
    attrFilters.forEach(f => {
      list = list.filter(item => {
        const val = String(item[f.column] || '').toLowerCase();
        const fVal = String(f.value || '').toLowerCase();
        switch (f.operator) {
          case 'Equals': return val === fVal;
          case 'Not Equals': return val !== fVal;
          case 'Contains': return val.includes(fVal);
          case 'Not Contains': return !val.includes(fVal);
          case 'Starts With': return val.startsWith(fVal);
          case 'Not Starts With': return !val.startsWith(fVal);
          case 'End With': return val.endsWith(fVal);
          case 'Not End With': return !val.endsWith(fVal);
          default: return true;
        }
      });
    });

    return list;
  }, [selectedAsset, attrSearch, attrFilters]);

  // Attribute table columns definition (Section 9.1 & Table 6)
  const attributeColumns = [
    { key: 'type', label: 'Type' },
    { key: 'name', label: 'Name' },
    { key: 'value', label: 'Value' },
    { key: 'tag_name', label: 'Tag Name' },
    { key: 'expression', label: 'Expression' },
    { key: 'quality', label: 'Quality' },
    { key: 'timestamp', label: 'Timestamp' }
  ];

  // Helper icon for attribute types
  const getAttributeTypeIcon = (type, source) => {
    switch (type) {
      case 'Dynamic': return <Zap size={14} className="dm-type-dynamic" title="Dynamic Device Telemetry" />;
      case 'Static': return <Database size={14} className="dm-type-static" title="Static Value" />;
      case 'Runtime':
        if (source === 'FUNCTION_BLOCK') {
          return <Cpu size={14} style={{ color: '#a855f7' }} title="Runtime Attribute (Function Block V2 Engine)" />;
        }
        return <Terminal size={14} className="dm-type-runtime" title="Runtime Attribute (Expression Formula)" />;
      case 'Alias': return <Link size={14} className="dm-type-alias" title="Alias Mapped Attribute" />;
      case 'Integration': return <Cpu size={14} className="dm-type-integration" title="External Integration Telemetry" />;
      case 'Command': return <Activity size={14} className="dm-type-command" title="Cloud-to-Device Command" />;
      default: return <Database size={14} />;
    }
  };

  // Helper icon for media items
  const getMediaIcon = (type, ctype) => {
    if (type === 'Folder') return <Folder size={18} style={{ color: '#f59e0b' }} />;
    const ct = (ctype || '').toUpperCase();
    if (ct.includes('PDF')) return <FileText size={18} style={{ color: '#ef4444' }} />;
    if (ct.includes('JPEG') || ct.includes('PNG') || ct.includes('IMAGE')) return <Image size={18} style={{ color: '#38bdf8' }} />;
    if (ct.includes('MP4') || ct.includes('VIDEO')) return <Video size={18} style={{ color: '#a855f7' }} />;
    return <FileCode size={18} style={{ color: '#10b981' }} />;
  };

  // Tree Node Renderer Component
  const renderTreeNode = (node, depth = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedAssetId === node.id;
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} className="dm-tree-node-wrapper">
        <div 
          className={`dm-tree-item ${isSelected ? 'selected' : ''}`}
          style={{ paddingLeft: `${depth * 14 + 6}px` }}
          onClick={() => setSelectedAssetId(node.id)}
          onContextMenu={(e) => handleContextMenu(e, node)}
          draggable
          onDragStart={(e) => handleDragStart(e, node.id)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, node.id)}
          title={`Right click for actions. Level: ${node.level}`}
        >
          {hasChildren ? (
            <span 
              className="dm-tree-expand-icon"
              onClick={(e) => { e.stopPropagation(); toggleNode(node.id); }}
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          ) : (
            <span className="dm-tree-expand-placeholder" />
          )}

          <span className="dm-tree-node-icon">
            {node.level === 'ENTERPRISE' && '🏢'}
            {node.level === 'SITE' && '🏭'}
            {node.level === 'AREA' && '⚙️'}
            {node.level === 'UNIT' && '🛢️'}
            {node.level === 'EQUIPMENT' && '🔹'}
          </span>

          <span className="dm-tree-label">{node.name}</span>

          <span className="dm-tree-badge">{node.level}</span>

          {node.is_bookmarked && (
            <Star size={12} className="dm-tree-bookmark-star" fill="#f59e0b" color="#f59e0b" />
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className="dm-tree-children">
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="dm-asset-layout">
      {/* ========================================================
          LEFT COLUMN: Plant Hierarchy Tree & Bookmarks Workspace
         ======================================================== */}
      <div className="dm-asset-tree-panel">
        <div className="dm-tree-header">
          <div className="dm-tree-title-row">
            <span className="dm-tree-title">Plant Hierarchy</span>
            <button 
              className="dm-btn dm-btn-icon" 
              onClick={() => {
                setAssetFormParentId(null);
                setAssetFormData({ name: '', level: 'SITE', description: '', installed_date: '2024-03-05' });
                setIsAddAssetModalOpen(true);
              }}
              title="Add Root Asset"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Bookmarks Section (Section 9.1.1 Table 5) */}
          {bookmarkedAssets.length > 0 && (
            <div className="dm-tree-bookmarks-bar">
              <span className="dm-bm-label"><Star size={11} fill="#f59e0b" color="#f59e0b" /> Pinned:</span>
              <div className="dm-bm-tags">
                {bookmarkedAssets.map(b => (
                  <span 
                    key={b.id} 
                    className={`dm-bm-pill ${selectedAssetId === b.id ? 'active' : ''}`}
                    onClick={() => setSelectedAssetId(b.id)}
                    title={b.path}
                  >
                    {b.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Search filter in tree */}
          <div className="dm-tree-search-wrapper">
            <Search size={13} className="dm-search-icon" />
            <input 
              type="text" 
              className="dm-tree-search-input"
              placeholder="Search plant hierarchy..."
              value={treeSearch}
              onChange={(e) => setTreeSearch(e.target.value)}
            />
            {treeSearch && (
              <button className="dm-clear-search" onClick={() => setTreeSearch('')}><X size={11} /></button>
            )}
          </div>
        </div>

        {/* Tree Container */}
        <div className="dm-tree-content" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, null)}>
          {assetTree.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 12px', color: '#64748b' }}>
              <div style={{ fontSize: '1.6rem', marginBottom: '8px' }}>🏢</div>
              <div style={{ fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 600 }}>Hierarchy Empty</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>No plant hierarchy elements configured yet.</div>
              <button
                className="dm-btn dm-btn-primary"
                style={{ marginTop: '14px', width: '100%', fontSize: '0.74rem', justifyContent: 'center' }}
                onClick={() => {
                  setAssetFormParentId(null);
                  setAssetFormData({ name: '', level: 'SITE', description: '', installed_date: '2024-03-05' });
                  setIsAddAssetModalOpen(true);
                }}
              >
                <Plus size={13} /> <span>Create Root Asset</span>
              </button>
            </div>
          ) : (
            assetTree.map(rootNode => renderTreeNode(rootNode))
          )}
        </div>
      </div>

      {/* ========================================================
          RIGHT COLUMN: Selected Asset Workspace & Tabs
         ======================================================== */}
      <div className="dm-asset-workspace-panel">
        {selectedAsset ? (
          <>
            {/* Asset Breadcrumb & Header Card */}
            <div className="dm-asset-header-card">
              <div className="dm-asset-title-block">
                <div className="dm-asset-path-breadcrumb">{selectedAsset.path}</div>
                <div className="dm-asset-name-row">
                  <h2 className="dm-asset-heading">{selectedAsset.name}</h2>
                  <span className="dm-asset-level-badge">{selectedAsset.level}</span>
                  <button 
                    className={`dm-bookmark-btn ${selectedAsset.is_bookmarked ? 'bookmarked' : ''}`}
                    onClick={() => toggleBookmark(selectedAsset.id)}
                    title="Bookmark this asset element"
                  >
                    <Star size={16} fill={selectedAsset.is_bookmarked ? '#f59e0b' : 'none'} color={selectedAsset.is_bookmarked ? '#f59e0b' : '#94a3b8'} />
                  </button>
                  <button 
                    className="dm-btn dm-btn-secondary"
                    onClick={() => downloadAttributeAssembly(selectedAsset.id)}
                    title="Download Attribute Assembly for Data Insight"
                  >
                    <Download size={13} />
                    <span>Download Assembly</span>
                  </button>
                </div>
                {selectedAsset.description && (
                  <p className="dm-asset-desc">{selectedAsset.description}</p>
                )}
              </div>

              {/* Tabs Bar: Asset Attribute | Asset Table | Asset Media */}
              <div className="dm-asset-tabs-bar">
                <button 
                  className={`dm-asset-tab ${activeTab === 'attributes' ? 'active' : ''}`}
                  onClick={() => setActiveTab('attributes')}
                >
                  <Activity size={14} />
                  <span>Asset Attribute ({selectedAsset.attributes?.length || 0})</span>
                </button>
                <button 
                  className={`dm-asset-tab ${activeTab === 'tables' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('tables');
                    if (!activeTableId && selectedAsset.tables?.length > 0) {
                      setActiveTableId(selectedAsset.tables[0].id);
                    }
                  }}
                >
                  <Database size={14} />
                  <span>Asset Table ({selectedAsset.tables?.length || 0})</span>
                </button>
                <button 
                  className={`dm-asset-tab ${activeTab === 'media' ? 'active' : ''}`}
                  onClick={() => setActiveTab('media')}
                >
                  <Folder size={14} />
                  <span>Asset Media ({selectedAsset.media?.length || 0})</span>
                </button>
              </div>
            </div>

            {/* TAB 1: ASSET ATTRIBUTE (Section 9.1.3, Table 6) */}
            {activeTab === 'attributes' && (
              <div className="dm-tab-content-card">
                <DMCommonControls 
                  onAdd={handleOpenAddAttribute}
                  onRefresh={() => showToast('Refreshed attribute values', 'info')}
                  onExport={() => {
                    const blob = new Blob([JSON.stringify(selectedAsset.attributes || [], null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `${selectedAsset.name}_Attributes.json`;
                    link.click();
                  }}
                  searchQuery={attrSearch}
                  onSearchChange={setAttrSearch}
                  columns={attributeColumns}
                  hiddenColumns={attrHiddenCols}
                  onToggleHiddenColumn={(colKey) => {
                    setAttrHiddenCols(prev => 
                      prev.includes(colKey) ? prev.filter(c => c !== colKey) : [...prev, colKey]
                    );
                  }}
                  totalRecords={filteredAttributes.length}
                  recordsPerPage={attrPerPage}
                  onRecordsPerPageChange={setAttrPerPage}
                  currentPage={attrPage}
                  totalPages={Math.ceil(filteredAttributes.length / attrPerPage) || 1}
                  onPageChange={setAttrPage}
                  filterCriteria={attrFilters}
                  onApplyFilters={setAttrFilters}
                />

                <div className="dm-table-scroll-container">
                  <table className="dm-data-table">
                    <thead>
                      <tr>
                        {!attrHiddenCols.includes('type') && <th style={{ width: '60px' }}>Type</th>}
                        {!attrHiddenCols.includes('name') && <th>Name</th>}
                        {!attrHiddenCols.includes('value') && <th>Value</th>}
                        {!attrHiddenCols.includes('tag_name') && <th>Tag Name</th>}
                        {!attrHiddenCols.includes('expression') && <th>Expression</th>}
                        {!attrHiddenCols.includes('quality') && <th style={{ width: '80px' }}>Quality</th>}
                        {!attrHiddenCols.includes('timestamp') && <th>Timestamp</th>}
                        <th style={{ width: '80px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAttributes.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="dm-empty-state">
                            No attributes configured for this asset element. Click "+ Add" to create one.
                          </td>
                        </tr>
                      ) : (
                        filteredAttributes
                          .slice((attrPage - 1) * attrPerPage, attrPage * attrPerPage)
                          .map(attr => (
                            <tr key={attr.id} className="dm-table-row">
                              {!attrHiddenCols.includes('type') && (
                                <td style={{ textAlign: 'center' }}>
                                  {getAttributeTypeIcon(attr.type, attr.source)}
                                </td>
                              )}
                              {!attrHiddenCols.includes('name') && (
                                <td style={{ fontWeight: 600, color: '#f8fafc' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>{attr.name}</span>
                                    {attr.type === 'Runtime' && (
                                      attr.source === 'FUNCTION_BLOCK' ? (
                                        <span style={{
                                          fontSize: '0.62rem',
                                          padding: '1px 5px',
                                          borderRadius: '3px',
                                          background: 'rgba(168, 85, 247, 0.2)',
                                          border: '1px solid rgba(168, 85, 247, 0.5)',
                                          color: '#d8b4fe',
                                          fontWeight: 700
                                        }}>
                                          Runtime (FB)
                                        </span>
                                      ) : (
                                        <span style={{
                                          fontSize: '0.62rem',
                                          padding: '1px 5px',
                                          borderRadius: '3px',
                                          background: 'rgba(56, 189, 248, 0.15)',
                                          border: '1px solid rgba(56, 189, 248, 0.4)',
                                          color: '#38bdf8',
                                          fontWeight: 600
                                        }}>
                                          Runtime (Formula)
                                        </span>
                                      )
                                    )}
                                  </div>
                                </td>
                              )}
                              {!attrHiddenCols.includes('value') && (
                                <td>
                                  <span className="dm-value-badge">
                                    {formatCleanValue(attr.value)} {attr.uom ? <span className="dm-uom-tag">{attr.uom}</span> : ''}
                                  </span>
                                </td>
                              )}
                              {!attrHiddenCols.includes('tag_name') && (
                                <td className="mono" style={{ color: '#38bdf8' }} title={`Tag: ${attr.tag_name}`}>
                                  {attr.tag_name || '-'}
                                </td>
                              )}
                              {!attrHiddenCols.includes('expression') && (
                                <td>
                                  {attr.source === 'FUNCTION_BLOCK' ? (
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        background: 'rgba(168, 85, 247, 0.15)',
                                        border: '1px solid rgba(168, 85, 247, 0.35)',
                                        color: '#c084fc',
                                        fontSize: '0.72rem',
                                        fontFamily: 'monospace',
                                        fontWeight: 600
                                      }}>
                                        <Zap size={11} /> FB: {attr.function_block_output || 'Output Port'}
                                        {(() => {
                                          const matchedEx = fbExecutions.find(x => x.id === attr.function_block_id);
                                          return matchedEx ? <span style={{ color: '#e9d5ff', fontWeight: 400 }}>[{matchedEx.name}]</span> : null;
                                        })()}
                                      </span>
                                      {attr.function_block_id && (
                                        <button
                                          onClick={async () => {
                                            try {
                                              const res = await runFBExecution(attr.function_block_id);
                                              showToast(`Executed '${attr.name}': ${res.result?.[attr.function_block_output] ?? 'calculated'} in ${res.duration_ms}ms`, 'success');
                                              if (refreshState) refreshState();
                                            } catch (e) {
                                              showToast(e.message || 'Run FB failed', 'error');
                                            }
                                          }}
                                          style={{
                                            padding: '2px 7px',
                                            borderRadius: '4px',
                                            background: 'rgba(168, 85, 247, 0.25)',
                                            border: '1px solid rgba(168, 85, 247, 0.5)',
                                            color: '#f3e8ff',
                                            fontSize: '0.65rem',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '3px',
                                            fontWeight: 600
                                          }}
                                          title="Execute Function Block now and refresh live value"
                                        >
                                          <Activity size={10} /> Run FB
                                        </button>
                                      )}
                                    </div>
                                  ) : attr.expression ? (
                                    <span className="mono" style={{ color: '#38bdf8', fontSize: '0.74rem' }}>
                                      f(x): {attr.expression}
                                    </span>
                                  ) : (
                                    <span style={{ color: '#64748b' }}>-</span>
                                  )}
                                </td>
                              )}
                              {!attrHiddenCols.includes('quality') && (
                                <td>
                                  <span className={`dm-quality-pill ${computeEffectiveQuality(attr) === 'Good' ? 'good' : 'bad'}`}>
                                    {computeEffectiveQuality(attr)}
                                  </span>
                                </td>
                              )}
                              {!attrHiddenCols.includes('timestamp') && (
                                <td className="dm-timestamp-cell">
                                  {attr.timestamp ? attr.timestamp.substring(0, 19).replace('T', ' ') : '-'}
                                </td>
                              )}
                              <td style={{ textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', gap: '4px' }}>
                                  <button 
                                    className="dm-row-action-btn edit"
                                    onClick={() => handleOpenEditAttribute(attr)}
                                    title="Edit Attribute"
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                  <button 
                                    className="dm-row-action-btn delete"
                                    onClick={() => deleteAssetAttribute(selectedAsset.id, attr.id)}
                                    title="Delete Attribute"
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

            {/* TAB 2: ASSET TABLE (Section 9.1.4, Table 7) */}
            {activeTab === 'tables' && (
              <div className="dm-tab-content-card">
                <div className="dm-table-selector-bar">
                  <div className="dm-tables-tabs-list">
                    {(selectedAsset.tables || []).map(t => (
                      <button 
                        key={t.id}
                        className={`dm-tbl-tab-btn ${activeTableId === t.id ? 'active' : ''}`}
                        onClick={() => setActiveTableId(t.id)}
                      >
                        <Database size={13} />
                        <span>{t.name}</span>
                        <span className="dm-tbl-row-count">({t.rows?.length || 0})</span>
                      </button>
                    ))}
                    <button 
                      className="dm-tbl-tab-btn add"
                      onClick={() => setIsCreateTableModalOpen(true)}
                    >
                      <Plus size={13} />
                      <span>New Table</span>
                    </button>
                  </div>
                </div>

                {/* Active Table Viewer */}
                {(() => {
                  const currentTable = (selectedAsset.tables || []).find(t => t.id === activeTableId) || selectedAsset.tables?.[0];
                  if (!currentTable) {
                    return (
                      <div className="dm-empty-state-large">
                        <Database size={36} color="#64748b" />
                        <p>No tabular storage attached to this asset. Create one to store calibration logs or inspection records.</p>
                        <button className="dm-btn dm-btn-primary" onClick={() => setIsCreateTableModalOpen(true)}>
                          <Plus size={14} /> <span>Create Asset Table</span>
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="dm-active-table-view">
                      <DMCommonControls 
                        onAdd={() => {
                          setNewRowData({});
                          setIsAddRowModalOpen(true);
                        }}
                        showEditSchema={true}
                        onEditSchema={() => {
                          setEditingSchemaTable(JSON.parse(JSON.stringify(currentTable)));
                          setIsEditSchemaModalOpen(true);
                        }}
                        onDelete={() => {
                          if (window.confirm(`Delete table '${currentTable.name}'?`)) {
                            deleteAssetTable(selectedAsset.id, currentTable.id);
                          }
                        }}
                        onExport={() => {
                          const csvRows = [];
                          const headers = currentTable.columns.map(c => c.name);
                          csvRows.push(headers.join(','));
                          (currentTable.rows || []).forEach(r => {
                            csvRows.push(headers.map(h => JSON.stringify(r[h] ?? '')).join(','));
                          });
                          const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${currentTable.name}.csv`;
                          a.click();
                        }}
                        totalRecords={currentTable.rows?.length || 0}
                      />

                      <div className="dm-table-info-meta">
                        <span><strong>Table Description:</strong> {currentTable.description || 'No description'}</span>
                        <span><strong>Locked By:</strong> {currentTable.locked_by || 'Unlocked'}</span>
                        <span><strong>Last Edited:</strong> {currentTable.last_edited?.substring(0, 19).replace('T', ' ')}</span>
                      </div>

                      <div className="dm-table-scroll-container">
                        <table className="dm-data-table">
                          <thead>
                            <tr>
                              {currentTable.columns.map(col => (
                                <th key={col.name}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {col.primary && <span title="Primary Key" style={{ color: '#f59e0b' }}>🔑</span>}
                                    <span>{col.name}</span>
                                    <span style={{ fontSize: '0.66rem', color: '#94a3b8' }}>({col.data_type})</span>
                                  </div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {(!currentTable.rows || currentTable.rows.length === 0) ? (
                              <tr>
                                <td colSpan={currentTable.columns.length} className="dm-empty-state">
                                  No records in this table. Click "+ Add" to insert a record.
                                </td>
                              </tr>
                            ) : (
                              currentTable.rows.map((row, idx) => (
                                <tr key={idx} className="dm-table-row">
                                  {currentTable.columns.map(col => (
                                    <td key={col.name} className={col.primary ? 'mono font-bold' : ''}>
                                      {String(row[col.name] ?? '-')}
                                    </td>
                                  ))}
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* TAB 3: ASSET MEDIA (Section 9.1.5, Table 8) */}
            {activeTab === 'media' && (
              <div className="dm-tab-content-card">
                <DMCommonControls 
                  showAddFolder={true}
                  onAddFolder={() => {
                    setNewFolderName('');
                    setIsAddFolderModalOpen(true);
                  }}
                  showUpload={true}
                  onUpload={() => {
                    setMediaUploadForm({ name: '', content_type: 'PDF', file_size_kb: 1024, url: '' });
                    setIsUploadMediaModalOpen(true);
                  }}
                  totalRecords={selectedAsset.media?.length || 0}
                />

                <div className="dm-table-scroll-container">
                  <table className="dm-data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '60px' }}>Type</th>
                        <th>Name</th>
                        <th>Content Type</th>
                        <th>File Size (KB)</th>
                        <th>Last Edited</th>
                        <th style={{ textAlign: 'right', width: '120px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(!selectedAsset.media || selectedAsset.media.length === 0) ? (
                        <tr>
                          <td colSpan={6} className="dm-empty-state">
                            No media files or folders attached. Click "Add Folder" or "Upload" to organize files.
                          </td>
                        </tr>
                      ) : (
                        selectedAsset.media.map(item => (
                          <tr key={item.id} className="dm-table-row">
                            <td style={{ textAlign: 'center' }}>
                              {getMediaIcon(item.type, item.content_type)}
                            </td>
                            <td style={{ fontWeight: 600, color: '#f8fafc' }}>
                              {item.name}
                            </td>
                            <td>
                              <span className="dm-content-type-tag">
                                {item.content_type || 'Unknown'}
                              </span>
                            </td>
                            <td className="mono">
                              {item.type === 'Folder' ? '-' : `${item.file_size_kb} KB`}
                            </td>
                            <td className="dm-timestamp-cell">
                              {item.last_edited?.substring(0, 19).replace('T', ' ')}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '6px' }}>
                                {item.type !== 'Folder' && (
                                  <>
                                    <button 
                                      className="dm-row-action-btn view"
                                      onClick={() => setPreviewMediaItem(item)}
                                      title="Preview Media"
                                    >
                                      <Eye size={13} />
                                    </button>
                                    <a 
                                      href={item.url || '#'}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="dm-row-action-btn download"
                                      title="Download Media File"
                                    >
                                      <Download size={13} />
                                    </a>
                                  </>
                                )}
                                <button 
                                  className="dm-row-action-btn delete"
                                  onClick={() => deleteAssetMedia(selectedAsset.id, item.id)}
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
            )}
          </>
        ) : (
          <div className="dm-empty-state-large">
            <p>Select an asset from the hierarchy on the left or create a new one.</p>
          </div>
        )}
      </div>

      {/* ========================================================
          CONTEXT MENU (Asset Element Function Dialog, Figure 2 & Table 5)
         ======================================================== */}
      {contextMenu && (
        <div 
          className="dm-context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={() => setContextMenu(null)}
        >
          <div className="dm-context-header">
            <span>{contextMenu.asset.name}</span>
          </div>

          <div 
            className="dm-context-item"
            onClick={() => {
              setAssetFormParentId(contextMenu.asset.id);
              setAssetFormData({ name: '', level: 'EQUIPMENT', description: '', installed_date: '2024-03-05' });
              setIsAddAssetModalOpen(true);
            }}
          >
            <Plus size={14} />
            <span>+ Add New</span>
          </div>

          <div 
            className="dm-context-item"
            onClick={() => {
              setEditingAsset(contextMenu.asset);
              setAssetFormData({
                name: contextMenu.asset.name,
                level: contextMenu.asset.level,
                description: contextMenu.asset.description || '',
                installed_date: contextMenu.asset.installed_date || '2024-03-05'
              });
              setIsAddAssetModalOpen(true);
            }}
          >
            <Edit2 size={14} />
            <span>Edit Asset</span>
          </div>

          <div 
            className="dm-context-item"
            onClick={() => {
              createAssetTemplate({
                name: `${contextMenu.asset.name} Template`,
                description: `Created from asset ${contextMenu.asset.name}`,
                markup_devices: ['device1'],
                attributes: contextMenu.asset.attributes || []
              });
            }}
          >
            <Cpu size={14} />
            <span>Create Template</span>
          </div>

          <div 
            className="dm-context-item"
            onClick={() => cloneAsset(contextMenu.asset.id, false)}
          >
            <Copy size={14} />
            <span>Clone Asset</span>
          </div>

          <div 
            className="dm-context-item"
            onClick={() => cloneAsset(contextMenu.asset.id, true)}
          >
            <Copy size={14} />
            <span>Clone Asset & Children</span>
          </div>

          <div 
            className="dm-context-item danger"
            onClick={() => {
              if (window.confirm(`Delete asset '${contextMenu.asset.name}' and all sub-elements?`)) {
                deleteAsset(contextMenu.asset.id);
              }
            }}
          >
            <Trash2 size={14} />
            <span>Delete Asset</span>
          </div>

          <div className="dm-context-divider" />

          <div 
            className="dm-context-item"
            onClick={() => {
              setAccessControlTargetAsset(contextMenu.asset);
              setIsAccessControlModalOpen(true);
            }}
          >
            <Shield size={14} />
            <span>Access Control</span>
          </div>

          <div 
            className="dm-context-item"
            onClick={() => downloadAttributeAssembly(contextMenu.asset.id)}
          >
            <Download size={14} />
            <span>Download Attribute Assembly</span>
          </div>

          <div 
            className="dm-context-item"
            onClick={() => toggleBookmark(contextMenu.asset.id)}
          >
            <Bookmark size={14} />
            <span>{contextMenu.asset.is_bookmarked ? 'Remove Bookmark' : 'Bookmark'}</span>
          </div>
        </div>
      )}

      {/* ========================================================
          MODALS
         ======================================================== */}

      {/* 1. Add / Edit Asset Modal */}
      {isAddAssetModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1400 }}>
          <div className="dm-modal-box" style={{ width: '560px' }}>
            <div className="dm-modal-header">
              <h3>{editingAsset ? 'Edit Asset Element' : '+ Add Asset Element'}</h3>
              <button onClick={() => { setIsAddAssetModalOpen(false); setEditingAsset(null); }} className="dm-close-btn"><X size={18} /></button>
            </div>
            <div className="dm-modal-body">
              {!editingAsset && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', background: '#0a0d14', padding: '4px', borderRadius: '6px' }}>
                  <button
                    type="button"
                    className="dm-btn"
                    onClick={() => {
                      setAssetCreateMode('template');
                      if (!chosenTemplateId && assetTemplates?.length > 0) {
                        setChosenTemplateId(assetTemplates[0].id);
                        setAssetFormData(prev => ({ ...prev, name: `${assetTemplates[0].name} Unit` }));
                      }
                    }}
                    style={{
                      flex: 1,
                      fontSize: '0.75rem',
                      background: assetCreateMode === 'template' ? '#0284c7' : 'transparent',
                      color: assetCreateMode === 'template' ? '#fff' : '#94a3b8',
                      border: 'none',
                      fontWeight: assetCreateMode === 'template' ? 600 : 400
                    }}
                  >
                    ⚡ From Asset Template
                  </button>
                  <button
                    type="button"
                    className="dm-btn"
                    onClick={() => setAssetCreateMode('blank')}
                    style={{
                      flex: 1,
                      fontSize: '0.75rem',
                      background: assetCreateMode === 'blank' ? '#0284c7' : 'transparent',
                      color: assetCreateMode === 'blank' ? '#fff' : '#94a3b8',
                      border: 'none',
                      fontWeight: assetCreateMode === 'blank' ? 600 : 400
                    }}
                  >
                    Blank Hierarchy Element
                  </button>
                </div>
              )}

              {!editingAsset && assetCreateMode === 'template' && (
                <>
                  <div className="dm-form-group">
                    <label className="dm-field-label">Select Standard Asset Template</label>
                    <select 
                      className="dm-select"
                      value={chosenTemplateId || assetTemplates?.[0]?.id || ''}
                      onChange={(e) => {
                        setChosenTemplateId(e.target.value);
                        const tmpl = assetTemplates.find(t => t.id === e.target.value);
                        if (tmpl) setAssetFormData(prev => ({ ...prev, name: `${tmpl.name} Unit` }));
                      }}
                    >
                      {(assetTemplates || []).map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.attributes?.length || 0} attributes)</option>
                      ))}
                    </select>
                  </div>

                  <div className="dm-form-group">
                    <label className="dm-field-label">Target Device ID (or Comma-Separated for Batch)</label>
                    <input 
                      type="text"
                      className="dm-input mono"
                      placeholder="e.g. PUMP-101A (or PUMP-101A, PUMP-101B)"
                      value={templateDeviceId}
                      onChange={(e) => setTemplateDeviceId(e.target.value)}
                    />
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px' }}>
                      Auto-registers device if new and binds all template metrics (e.g. <code>{templateDeviceId ? templateDeviceId.split(',')[0].trim() : 'PUMP-101A'}.discharge_pressure</code>)
                    </div>
                  </div>
                </>
              )}

              <div className="dm-form-group">
                <label className="dm-field-label">Asset Name</label>
                <input 
                  type="text"
                  className="dm-input"
                  placeholder="e.g. Overhead Separator Drum V-102"
                  value={assetFormData.name}
                  onChange={(e) => setAssetFormData({ ...assetFormData, name: e.target.value })}
                />
              </div>

              <div className="dm-form-grid-2">
                <div className="dm-form-group">
                  <label className="dm-field-label">Hierarchy Level</label>
                  <select 
                    className="dm-select"
                    value={assetFormData.level}
                    onChange={(e) => setAssetFormData({ ...assetFormData, level: e.target.value })}
                  >
                    <option value="ENTERPRISE">ENTERPRISE</option>
                    <option value="SITE">SITE</option>
                    <option value="AREA">AREA</option>
                    <option value="UNIT">UNIT</option>
                    <option value="EQUIPMENT">EQUIPMENT</option>
                  </select>
                </div>
                <div className="dm-form-group">
                  <label className="dm-field-label">Installed Date</label>
                  <input 
                    type="date"
                    className="dm-input"
                    value={assetFormData.installed_date}
                    onChange={(e) => setAssetFormData({ ...assetFormData, installed_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="dm-form-group">
                <label className="dm-field-label">Description</label>
                <textarea 
                  rows={2}
                  className="dm-textarea"
                  placeholder="Asset specifications, operating duties and location notes..."
                  value={assetFormData.description}
                  onChange={(e) => setAssetFormData({ ...assetFormData, description: e.target.value })}
                />
              </div>
            </div>

            <div className="dm-modal-footer">
              <button className="dm-btn dm-btn-secondary" onClick={() => { setIsAddAssetModalOpen(false); setEditingAsset(null); }}>Cancel</button>
              <button 
                className="dm-btn dm-btn-primary"
                onClick={async () => {
                  if (!assetFormData.name) {
                    showToast('Please specify an asset name', 'error');
                    return;
                  }

                  if (!editingAsset && assetCreateMode === 'template') {
                    const tmplId = chosenTemplateId || assetTemplates?.[0]?.id;
                    if (!tmplId) {
                      showToast('No asset template available to deploy', 'error');
                      return;
                    }
                    const rawDevIds = templateDeviceId.split(',').map(s => s.trim()).filter(Boolean);
                    await deployAssetTemplate(tmplId, {
                      parent_id: assetFormParentId || selectedAssetId || (assets[0]?.id || ''),
                      asset_name: assetFormData.name,
                      device_id: rawDevIds.length === 1 ? rawDevIds[0] : undefined,
                      device_ids: rawDevIds.length > 1 ? rawDevIds : undefined
                    });
                  } else if (editingAsset) {
                    await updateAsset(editingAsset.id, assetFormData);
                  } else {
                    await createAsset({
                      ...assetFormData,
                      parent_id: assetFormParentId || selectedAssetId || (assets[0]?.id || '')
                    });
                  }
                  setIsAddAssetModalOpen(false);
                  setEditingAsset(null);
                }}
              >
                {!editingAsset && assetCreateMode === 'template' ? '⚡ Deploy Template Asset' : 'Save Asset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Add Asset Attribute Modal (Table 6 Configurable Items) */}
      {isAttributeModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1400 }}>
          <div className="dm-modal-box" style={{ width: '620px' }}>
            <div className="dm-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Variable size={16} color="#38bdf8" />
                <h3>{editingAttribute ? 'Edit Asset Attribute' : 'Add Asset Attribute'} for {selectedAsset?.name}</h3>
              </div>
              <button onClick={() => { setIsAttributeModalOpen(false); setEditingAttribute(null); }} className="dm-close-btn"><X size={18} /></button>
            </div>
            <div className="dm-modal-body">
              <div className="dm-form-grid-2">
                <div className="dm-form-group">
                  <label className="dm-field-label">Attribute Type</label>
                  <select 
                    className="dm-select"
                    value={attributeForm.type}
                    onChange={(e) => setAttributeForm({ ...attributeForm, type: e.target.value })}
                  >
                    <option value="Dynamic">Dynamic (Real-time device metric)</option>
                    <option value="Static">Static (Constant value)</option>
                    <option value="Runtime">Runtime (Custom formula calculation)</option>
                    <option value="Alias">Alias (Mapped from another asset attribute)</option>
                    <option value="Integration">Integration (External API/Cloud source)</option>
                    <option value="Command">Command (Send value to IoT Hub device)</option>
                  </select>
                </div>
                <div className="dm-form-group">
                  <label className="dm-field-label">Attribute Name</label>
                  <input 
                    type="text"
                    className="dm-input"
                    placeholder="e.g. Discharge Pressure"
                    value={attributeForm.name}
                    onChange={(e) => setAttributeForm({ ...attributeForm, name: e.target.value })}
                  />
                </div>
              </div>

              {/* UoM Selection */}
              <div className="dm-form-grid-2">
                <div className="dm-form-group">
                  <label className="dm-field-label">Unit of Measure (UoM)</label>
                  <select 
                    className="dm-select"
                    value={attributeForm.uom}
                    onChange={(e) => setAttributeForm({ ...attributeForm, uom: e.target.value })}
                  >
                    <option value="">-- None --</option>
                    {uomList.map(u => (
                      <option key={u.id} value={u.abbreviation}>{u.name} ({u.abbreviation}) - {u.category}</option>
                    ))}
                  </select>
                </div>
                <div className="dm-form-group">
                  <label className="dm-field-label">Data Type</label>
                  <select 
                    className="dm-select"
                    value={attributeForm.data_type}
                    onChange={(e) => setAttributeForm({ ...attributeForm, data_type: e.target.value })}
                  >
                    <option value="Double">Double</option>
                    <option value="Int">Int</option>
                    <option value="Bool">Bool</option>
                    <option value="Text">Text</option>
                    <option value="Timestamp">Timestamp</option>
                  </select>
                </div>
              </div>

              {/* Conditional Fields based on Attribute Type */}
              {attributeForm.type === 'Static' && (
                <div className="dm-form-group">
                  <label className="dm-field-label">Default Value</label>
                  <input 
                    type="text"
                    className="dm-input"
                    placeholder="Enter static constant..."
                    value={attributeForm.value}
                    onChange={(e) => setAttributeForm({ ...attributeForm, value: e.target.value })}
                  />
                </div>
              )}

              {(attributeForm.type === 'Dynamic' || attributeForm.type === 'Command') && (
                <div className="dm-form-grid-2">
                  <div className="dm-form-group">
                    <label className="dm-field-label">Linked IoT Device *</label>
                    <select 
                      className="dm-select"
                      value={attributeForm.device_id}
                      onChange={(e) => setAttributeForm({ ...attributeForm, device_id: e.target.value })}
                    >
                      <option value="">-- Select IoT Device --</option>
                      {devices.map(d => (
                        <option key={d.id} value={d.identifier}>{d.name} ({d.identifier})</option>
                      ))}
                    </select>
                  </div>
                  <div className="dm-form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="dm-field-label">Linked Metric Key *</label>
                      {selectedDev && (
                        <span style={{ fontSize: '0.68rem', color: '#38bdf8' }}>
                          {linkedDeviceMetrics.length} linked metrics found
                        </span>
                      )}
                    </div>
                    {selectedDev && linkedDeviceMetrics.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <select 
                          className="dm-select"
                          value={linkedDeviceMetrics.some(m => m.key === attributeForm.metric) ? attributeForm.metric : ''}
                          onChange={(e) => {
                            if (e.target.value) {
                              const chosen = linkedDeviceMetrics.find(m => m.key === e.target.value);
                              setAttributeForm(prev => ({
                                ...prev,
                                metric: e.target.value,
                                name: (!prev.name || prev.name.trim() === '') ? (chosen?.name || e.target.value.replace(/^tags\./, '')) : prev.name,
                                data_type: chosen?.data_type || prev.data_type
                              }));
                            }
                          }}
                        >
                          <option value="">-- Select Linked Metric from {selectedDev.name} --</option>
                          {linkedDeviceMetrics.map(m => (
                            <option key={m.key} value={m.key}>
                              {m.key} {m.key !== m.name ? `(${m.name})` : ''} - [{m.source}]
                            </option>
                          ))}
                        </select>
                        <input 
                          type="text"
                          className="dm-input"
                          placeholder="Or type custom metric key..."
                          value={attributeForm.metric}
                          onChange={(e) => setAttributeForm({ ...attributeForm, metric: e.target.value })}
                        />
                      </div>
                    ) : (
                      <input 
                        type="text"
                        className="dm-input"
                        placeholder={selectedDev ? "e.g. discharge_pressure or tags.TAG_1" : "Select a device first..."}
                        value={attributeForm.metric}
                        onChange={(e) => setAttributeForm({ ...attributeForm, metric: e.target.value })}
                      />
                    )}
                  </div>
                </div>
              )}

              {attributeForm.type === 'Integration' && (
                <div className="dm-form-grid-2">
                  <div className="dm-form-group">
                    <label className="dm-field-label">Integration Channel</label>
                    <select 
                      className="dm-select"
                      value={attributeForm.channel}
                      onChange={(e) => setAttributeForm({ ...attributeForm, channel: e.target.value })}
                    >
                      <option value="">-- Select Integration Channel --</option>
                      {integrations.map(i => (
                        <option key={i.id} value={i.name}>{i.name} ({i.integration_type})</option>
                      ))}
                    </select>
                  </div>
                  <div className="dm-form-group">
                    <label className="dm-field-label">Metric Key</label>
                    <input 
                      type="text"
                      className="dm-input"
                      placeholder="e.g. co2_ppm"
                      value={attributeForm.metric}
                      onChange={(e) => setAttributeForm({ ...attributeForm, metric: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {attributeForm.type === 'Alias' && (
                <div className="dm-form-grid-2">
                  <div className="dm-form-group">
                    <label className="dm-field-label">Target Asset</label>
                    <select 
                      className="dm-select"
                      value={attributeForm.target_asset_name}
                      onChange={(e) => setAttributeForm({ ...attributeForm, target_asset_name: e.target.value })}
                    >
                      <option value="">-- Select Asset --</option>
                      {(assets || []).filter(a => a?.id && a.id !== selectedAsset?.id).map(a => (
                        <option key={a.id} value={a.name}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="dm-form-group">
                    <label className="dm-field-label">Target Attribute Name</label>
                    <input 
                      type="text"
                      className="dm-input"
                      placeholder="e.g. Overhead Vapor Temperature"
                      value={attributeForm.target_attribute_name}
                      onChange={(e) => setAttributeForm({ ...attributeForm, target_attribute_name: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {attributeForm.type === 'Runtime' && (
                <div className="dm-runtime-box" style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '10px', padding: '16px' }}>
                  {/* Mode switcher: Expression vs Function Block V2 */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', background: '#090d16', padding: '4px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                    <button
                      type="button"
                      onClick={() => setAttributeForm(prev => ({ ...prev, runtime_mode: 'EXPRESSION', source: '' }))}
                      style={{
                        flex: 1,
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        background: attributeForm.runtime_mode === 'EXPRESSION' ? 'linear-gradient(135deg, #0284c7, #0369a1)' : 'transparent',
                        color: attributeForm.runtime_mode === 'EXPRESSION' ? '#fff' : '#94a3b8'
                      }}
                    >
                      <Terminal size={13} />
                      <span>1. Expression Formula (Math)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAttributeForm(prev => ({ ...prev, runtime_mode: 'FUNCTION_BLOCK', source: 'FUNCTION_BLOCK', expression: '' }))}
                      style={{
                        flex: 1,
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        background: attributeForm.runtime_mode === 'FUNCTION_BLOCK' ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : 'transparent',
                        color: attributeForm.runtime_mode === 'FUNCTION_BLOCK' ? '#fff' : '#94a3b8'
                      }}
                    >
                      <Zap size={13} />
                      <span>2. Function Block V2 Engine (AHI)</span>
                    </button>
                  </div>

                  {attributeForm.runtime_mode === 'EXPRESSION' ? (
                    <div>
                      <ExpressionEditor 
                        value={attributeForm.expression}
                        onChange={(expr) => setAttributeForm(prev => ({ ...prev, expression: expr }))}
                        availableAttributes={selectedAsset?.attributes || []}
                        placeholder="e.g. (@Discharge_Pressure - @Suction_Pressure) * 1000 / (9.81 * 850)"
                        label="Expression Formula (Type @ to select created attributes)"
                        rows={3}
                      />
                      <div className="dm-form-group" style={{ marginTop: '12px' }}>
                        <label className="dm-field-label">Trigger Attribute (Runs expression when this attribute receives new value)</label>
                        <select 
                          className="dm-select"
                          value={attributeForm.trigger_attribute}
                          onChange={(e) => setAttributeForm({ ...attributeForm, trigger_attribute: e.target.value })}
                        >
                          <option value="">-- Automatic (Any Referenced @Attribute) --</option>
                          {(selectedAsset?.attributes || []).map(a => (
                            <option key={a.id} value={a.name}>{a.name} ({a.type})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ background: 'rgba(124, 58, 237, 0.1)', border: '1px solid rgba(124, 58, 237, 0.3)', borderRadius: '8px', padding: '12px', fontSize: '0.74rem', color: '#c4b5fd' }}>
                        <div style={{ fontWeight: 600, marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Zap size={14} color="#a855f7" />
                          <span>Driven by Yokogawa OpreX AHI Function Block V2</span>
                        </div>
                        This attribute's value, timestamp, and quality are written automatically when the linked Function Block executes in the isolated Node.js V8 sandbox.
                      </div>

                      <div className="dm-form-grid-2">
                        <div className="dm-form-group">
                          <label className="dm-field-label">Linked Block Execution Instance *</label>
                          <select
                            className="dm-select"
                            value={attributeForm.function_block_id}
                            onChange={(e) => {
                              const execId = e.target.value;
                              const foundExec = fbExecutions.find(x => x.id === execId);
                              const firstOut = foundExec?.template_snapshot?.outputs?.[0]?.output_key || '';
                              const outObj = foundExec?.template_snapshot?.outputs?.[0];
                              setAttributeForm(prev => ({
                                ...prev,
                                function_block_id: execId,
                                function_block_output: firstOut,
                                name: prev.name && prev.name !== '0.0' ? prev.name : (outObj?.runtime_attribute_name || outObj?.output_key || prev.name),
                                uom: outObj?.uom || prev.uom,
                                data_type: outObj?.data_type || prev.data_type
                              }));
                              setCalcTestResult(null);
                            }}
                          >
                            <option value="">-- Select Block Execution --</option>
                            {fbExecutions.map(ex => (
                              <option key={ex.id} value={ex.id}>
                                {ex.name} ({ex.template_code}) [{ex.status}]
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="dm-form-group">
                          <label className="dm-field-label">Block Output Port Key *</label>
                          {(() => {
                            const currentExec = fbExecutions.find(x => x.id === attributeForm.function_block_id);
                            const outputs = currentExec?.template_snapshot?.outputs || [];
                            if (outputs.length > 0) {
                              return (
                                <select
                                  className="dm-select"
                                  value={attributeForm.function_block_output}
                                  onChange={(e) => {
                                    const chosenOutKey = e.target.value;
                                    const outObj = outputs.find(o => o.output_key === chosenOutKey);
                                    setAttributeForm(prev => ({
                                      ...prev,
                                      function_block_output: chosenOutKey,
                                      name: prev.name ? prev.name : (outObj?.runtime_attribute_name || chosenOutKey),
                                      uom: outObj?.uom || prev.uom,
                                      data_type: outObj?.data_type || prev.data_type
                                    }));
                                  }}
                                >
                                  <option value="">-- Select Output Port --</option>
                                  {outputs.map(out => (
                                    <option key={out.output_key} value={out.output_key}>
                                      {out.output_key} ({out.data_type || 'Double'}) → {out.runtime_attribute_name}
                                    </option>
                                  ))}
                                </select>
                              );
                            }
                            return (
                              <input
                                type="text"
                                className="dm-input"
                                placeholder="e.g. specificEnergy, isRunning"
                                value={attributeForm.function_block_output}
                                onChange={(e) => setAttributeForm(prev => ({ ...prev, function_block_output: e.target.value }))}
                              />
                            );
                          })()}
                        </div>
                      </div>

                      {/* Execution Details & Live Calculation Test Button */}
                      {(() => {
                        const currentExec = fbExecutions.find(x => x.id === attributeForm.function_block_id);
                        if (!currentExec) return null;
                        const tmpl = currentExec.template_snapshot || {};
                        const inputBindings = currentExec.input_bindings || {};

                        return (
                          <div style={{ background: '#0a0f1d', border: '1px solid #1e293b', borderRadius: '8px', padding: '12px', fontSize: '0.72rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <span style={{ color: '#38bdf8', fontWeight: 600 }}>
                                Instance: {currentExec.name} ({tmpl.template_code || currentExec.template_code})
                              </span>
                              <button
                                type="button"
                                disabled={isTestingFB}
                                onClick={async () => {
                                  try {
                                    setIsTestingFB(true);
                                    const res = await runFBExecution(currentExec.id);
                                    setCalcTestResult(res);
                                    const computedVal = res.result?.[attributeForm.function_block_output];
                                    if (computedVal !== undefined) {
                                      setAttributeForm(prev => ({ ...prev, value: String(computedVal) }));
                                    }
                                    showToast(`Calculated: ${attributeForm.function_block_output} = ${computedVal ?? 'OK'} (${res.duration_ms}ms)`, 'success');
                                  } catch (err) {
                                    showToast('Calculation test failed: ' + err.message, 'error');
                                  } finally {
                                    setIsTestingFB(false);
                                  }
                                }}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '5px',
                                  background: 'linear-gradient(135deg, #10b981, #059669)',
                                  color: '#fff',
                                  border: 'none',
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  cursor: isTestingFB ? 'not-allowed' : 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '5px'
                                }}
                              >
                                <Zap size={11} />
                                <span>{isTestingFB ? 'Running...' : '▶ Run Calculation Now'}</span>
                              </button>
                            </div>

                            {/* Input mapping preview */}
                            <div style={{ color: '#94a3b8', marginBottom: '6px' }}>
                              <strong>Bound Inputs:</strong> {Object.entries(inputBindings).map(([k, v]) => `${k} ← ${v.attribute_name}`).join(', ') || 'Auto'}
                            </div>

                            {/* Output preview */}
                            <div style={{ color: '#94a3b8' }}>
                              <strong>Writing To:</strong> Output port <code style={{ color: '#c084fc' }}>{attributeForm.function_block_output || 'port'}</code> writes to this runtime attribute.
                            </div>

                            {calcTestResult && (
                              <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', color: '#6ee7b7' }}>
                                <strong>Live Execution Result ({calcTestResult.duration_ms}ms):</strong>
                                <pre style={{ margin: '4px 0 0 0', fontSize: '0.68rem', fontFamily: 'monospace' }}>
                                  {JSON.stringify(calcTestResult.result, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="dm-modal-footer">
              <button 
                className="dm-btn dm-btn-secondary" 
                onClick={() => {
                  setIsAttributeModalOpen(false);
                  setEditingAttribute(null);
                }}
              >
                Cancel
              </button>
              <button 
                className="dm-btn dm-btn-primary"
                onClick={async () => {
                  if (!attributeForm.name) {
                    showToast('Please enter an attribute name', 'error');
                    return;
                  }

                  const payloadToSave = { ...attributeForm };
                  if (payloadToSave.type === 'Runtime') {
                    if (payloadToSave.runtime_mode === 'FUNCTION_BLOCK') {
                      payloadToSave.source = 'FUNCTION_BLOCK';
                      payloadToSave.use_expression = false;
                      payloadToSave.expression = '';
                    } else {
                      payloadToSave.source = 'EXPRESSION';
                      payloadToSave.use_expression = true;
                      payloadToSave.function_block_id = '';
                      payloadToSave.function_block_output = '';
                    }
                  }

                  if (editingAttribute) {
                    await updateAssetAttribute(selectedAsset.id, editingAttribute.id, payloadToSave);
                  } else {
                    await addAssetAttribute(selectedAsset.id, payloadToSave);
                  }
                  setIsAttributeModalOpen(false);
                  setEditingAttribute(null);
                  setAttributeForm({
                    type: 'Dynamic',
                    name: '',
                    value: '0.0',
                    uom: '°C',
                    device_id: '',
                    metric: '',
                    channel: '',
                    target_asset_name: '',
                    target_attribute_name: '',
                    expression: '',
                    data_type: 'Double',
                    trigger_attribute: ''
                  });
                }}
              >
                {editingAttribute ? 'Update Attribute' : 'Save Attribute'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Create Table Modal */}
      {isCreateTableModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1400 }}>
          <div className="dm-modal-box" style={{ width: '540px' }}>
            <div className="dm-modal-header">
              <h3>Create Tabular Storage for {selectedAsset?.name}</h3>
              <button onClick={() => setIsCreateTableModalOpen(false)} className="dm-close-btn"><X size={18} /></button>
            </div>
            <div className="dm-modal-body">
              <div className="dm-form-group">
                <label className="dm-field-label">Table Name</label>
                <input 
                  type="text"
                  className="dm-input"
                  placeholder="e.g. Mechanical Seal Inspection Log"
                  value={tableFormData.name}
                  onChange={(e) => setTableFormData({ ...tableFormData, name: e.target.value })}
                />
              </div>
              <div className="dm-form-group">
                <label className="dm-field-label">Description</label>
                <textarea 
                  rows={2}
                  className="dm-textarea"
                  placeholder="Table purpose, API standard and inspection interval..."
                  value={tableFormData.description}
                  onChange={(e) => setTableFormData({ ...tableFormData, description: e.target.value })}
                />
              </div>
            </div>
            <div className="dm-modal-footer">
              <button className="dm-btn dm-btn-secondary" onClick={() => setIsCreateTableModalOpen(false)}>Cancel</button>
              <button 
                className="dm-btn dm-btn-primary"
                onClick={async () => {
                  if (!tableFormData.name) return;
                  const tbl = await createAssetTable(selectedAsset.id, tableFormData);
                  if (tbl) setActiveTableId(tbl.id);
                  setIsCreateTableModalOpen(false);
                }}
              >
                Create Table
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Edit Schema Modal (Section 9.1.4 Table 7) */}
      {isEditSchemaModalOpen && editingSchemaTable && (
        <div className="modal-backdrop" style={{ zIndex: 1400 }}>
          <div className="dm-modal-box" style={{ width: '680px' }}>
            <div className="dm-modal-header">
              <h3>Edit Table Schema: {editingSchemaTable.name}</h3>
              <button onClick={() => setIsEditSchemaModalOpen(false)} className="dm-close-btn"><X size={18} /></button>
            </div>
            <div className="dm-modal-body">
              <p className="dm-modal-desc">
                Define columns, data types (Double, Bigint, Boolean, Int, Text, Datetime, Timestamp, Varchar), default values and primary keys.
              </p>

              <div className="dm-schema-columns-list">
                {editingSchemaTable.columns.map((col, idx) => (
                  <div key={idx} className="dm-schema-col-row">
                    <input 
                      type="text"
                      className="dm-input"
                      placeholder="Column Name"
                      value={col.name}
                      onChange={(e) => {
                        const updated = [...editingSchemaTable.columns];
                        updated[idx].name = e.target.value;
                        setEditingSchemaTable({ ...editingSchemaTable, columns: updated });
                      }}
                      style={{ flex: 1.5 }}
                    />
                    <select 
                      className="dm-select"
                      value={col.data_type}
                      onChange={(e) => {
                        const updated = [...editingSchemaTable.columns];
                        updated[idx].data_type = e.target.value;
                        setEditingSchemaTable({ ...editingSchemaTable, columns: updated });
                      }}
                      style={{ flex: 1.2 }}
                    >
                      <option value="Double">Double</option>
                      <option value="Bigint">Bigint</option>
                      <option value="Boolean">Boolean</option>
                      <option value="Int">Int</option>
                      <option value="Text">Text</option>
                      <option value="Datetime">Datetime</option>
                      <option value="Timestamp">Timestamp</option>
                      <option value="Varchar(25)">Varchar(25)</option>
                      <option value="Varchar(50)">Varchar(50)</option>
                      <option value="Varchar(255)">Varchar(255)</option>
                    </select>
                    <input 
                      type="text"
                      className="dm-input"
                      placeholder="Default"
                      value={col.default_value || ''}
                      onChange={(e) => {
                        const updated = [...editingSchemaTable.columns];
                        updated[idx].default_value = e.target.value;
                        setEditingSchemaTable({ ...editingSchemaTable, columns: updated });
                      }}
                      style={{ flex: 1 }}
                    />
                    <label className="dm-checkbox-inline" title="Allow Null">
                      <input 
                        type="checkbox"
                        checked={col.allow_null}
                        onChange={(e) => {
                          const updated = [...editingSchemaTable.columns];
                          updated[idx].allow_null = e.target.checked;
                          setEditingSchemaTable({ ...editingSchemaTable, columns: updated });
                        }}
                      />
                      <span>Null</span>
                    </label>
                    <label className="dm-checkbox-inline" title="Primary Key">
                      <input 
                        type="checkbox"
                        checked={col.primary}
                        onChange={(e) => {
                          const updated = [...editingSchemaTable.columns];
                          updated[idx].primary = e.target.checked;
                          setEditingSchemaTable({ ...editingSchemaTable, columns: updated });
                        }}
                      />
                      <span>PK</span>
                    </label>
                    <button 
                      className="dm-btn dm-btn-icon dm-btn-danger"
                      onClick={() => {
                        const updated = editingSchemaTable.columns.filter((_, i) => i !== idx);
                        setEditingSchemaTable({ ...editingSchemaTable, columns: updated });
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <button 
                className="dm-btn dm-btn-secondary"
                style={{ marginTop: '10px' }}
                onClick={() => {
                  setEditingSchemaTable({
                    ...editingSchemaTable,
                    columns: [
                      ...editingSchemaTable.columns,
                      { name: `Col_${editingSchemaTable.columns.length + 1}`, data_type: 'Double', default_value: '0.0', allow_null: true, primary: false }
                    ]
                  });
                }}
              >
                + Add Column
              </button>
            </div>
            <div className="dm-modal-footer">
              <button className="dm-btn dm-btn-secondary" onClick={() => setIsEditSchemaModalOpen(false)}>Cancel</button>
              <button 
                className="dm-btn dm-btn-primary"
                onClick={async () => {
                  await updateTableSchema(selectedAsset.id, editingSchemaTable.id, editingSchemaTable);
                  setIsEditSchemaModalOpen(false);
                }}
              >
                Save Schema
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Add Table Row Modal */}
      {isAddRowModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1400 }}>
          <div className="dm-modal-box" style={{ width: '500px' }}>
            <div className="dm-modal-header">
              <h3>Insert Table Record</h3>
              <button onClick={() => setIsAddRowModalOpen(false)} className="dm-close-btn"><X size={18} /></button>
            </div>
            <div className="dm-modal-body">
              {(() => {
                const currentTable = (selectedAsset.tables || []).find(t => t.id === activeTableId) || selectedAsset.tables?.[0];
                if (!currentTable) return null;
                return currentTable.columns.map(col => (
                  <div key={col.name} className="dm-form-group">
                    <label className="dm-field-label">
                      {col.name} ({col.data_type}) {col.primary && '— Primary Key'}
                    </label>
                    <input 
                      type="text"
                      className="dm-input"
                      placeholder={col.default_value || ''}
                      value={newRowData[col.name] ?? col.default_value ?? ''}
                      onChange={(e) => setNewRowData({ ...newRowData, [col.name]: e.target.value })}
                    />
                  </div>
                ));
              })()}
            </div>
            <div className="dm-modal-footer">
              <button className="dm-btn dm-btn-secondary" onClick={() => setIsAddRowModalOpen(false)}>Cancel</button>
              <button 
                className="dm-btn dm-btn-primary"
                onClick={async () => {
                  const currentTable = (selectedAsset.tables || []).find(t => t.id === activeTableId) || selectedAsset.tables?.[0];
                  if (!currentTable) return;
                  await addTableRow(selectedAsset.id, currentTable.id, newRowData);
                  setIsAddRowModalOpen(false);
                }}
              >
                Insert Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Media Preview Modal */}
      {previewMediaItem && (
        <div className="modal-backdrop" style={{ zIndex: 1400 }}>
          <div className="dm-modal-box" style={{ width: '640px' }}>
            <div className="dm-modal-header">
              <h3>Media Preview: {previewMediaItem.name}</h3>
              <button onClick={() => setPreviewMediaItem(null)} className="dm-close-btn"><X size={18} /></button>
            </div>
            <div className="dm-modal-body" style={{ textAlign: 'center' }}>
              <img 
                src={previewMediaItem.url || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800'} 
                alt={previewMediaItem.name} 
                style={{ maxWidth: '100%', maxHeight: '350px', borderRadius: '6px', objectFit: 'contain' }}
              />
              <div style={{ marginTop: '12px', fontSize: '0.8rem', color: '#94a3b8' }}>
                Type: {previewMediaItem.content_type} | Size: {previewMediaItem.file_size_kb} KB | Path: {previewMediaItem.path}
              </div>
            </div>
            <div className="dm-modal-footer">
              <button className="dm-btn dm-btn-primary" onClick={() => setPreviewMediaItem(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Object-based Access Control Modal (Table 33) */}
      {isAccessControlModalOpen && accessControlTargetAsset && (
        <div className="modal-backdrop" style={{ zIndex: 1400 }}>
          <div className="dm-modal-box" style={{ width: '560px' }}>
            <div className="dm-modal-header">
              <h3>Object-based Security: {accessControlTargetAsset.name}</h3>
              <button onClick={() => setIsAccessControlModalOpen(false)} className="dm-close-btn"><X size={18} /></button>
            </div>
            <div className="dm-modal-body">
              <div className="dm-form-group">
                <label className="dm-field-label">Resource Path</label>
                <input 
                  type="text"
                  className="dm-input mono"
                  value={accessControlTargetAsset.path}
                  readOnly
                  style={{ background: '#0a0d14', color: '#38bdf8' }}
                />
              </div>

              <div className="dm-form-group">
                <label className="dm-field-label">User Identity</label>
                <input 
                  type="text"
                  className="dm-input"
                  value={accessControlForm.identity}
                  onChange={(e) => setAccessControlForm({ ...accessControlForm, identity: e.target.value })}
                />
              </div>

              <div className="dm-form-group">
                <label className="dm-field-label">Privileges for this Resource</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
                  {['Read Asset', 'Write Asset', 'Delete Asset', 'Asset Table', 'Asset Media'].map(priv => (
                    <label key={priv} className="dm-checkbox-inline">
                      <input 
                        type="checkbox"
                        checked={accessControlForm.privilege.includes(priv)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setAccessControlForm(prev => ({
                            ...prev,
                            privilege: checked ? [...prev.privilege, priv] : prev.privilege.filter(p => p !== priv)
                          }));
                        }}
                      />
                      <span>{priv}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="dm-form-group">
                <label className="dm-field-label">Child Privilege Propagation</label>
                <select 
                  className="dm-select"
                  value={accessControlForm.child_privilege}
                  onChange={(e) => setAccessControlForm({ ...accessControlForm, child_privilege: e.target.value })}
                >
                  <option value="Update child privileges for modified identities">
                    Update child privileges for modified identities (Inherit recursively)
                  </option>
                  <option value="Do not modify child privileges">
                    Do not modify child privileges (This element only)
                  </option>
                </select>
              </div>
            </div>
            <div className="dm-modal-footer">
              <button className="dm-btn dm-btn-secondary" onClick={() => setIsAccessControlModalOpen(false)}>Cancel</button>
              <button 
                className="dm-btn dm-btn-primary"
                onClick={() => {
                  createObjectSecurityRule({
                    resource: accessControlTargetAsset.path,
                    identity: accessControlForm.identity,
                    privilege: accessControlForm.privilege,
                    child_privilege: accessControlForm.child_privilege
                  });
                  setIsAccessControlModalOpen(false);
                }}
              >
                Save Access Control
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Add Folder Modal */}
      {isAddFolderModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1400 }}>
          <div className="dm-modal-box" style={{ width: '420px' }}>
            <div className="dm-modal-header">
              <h3>Add Media Folder</h3>
              <button onClick={() => setIsAddFolderModalOpen(false)} className="dm-close-btn"><X size={18} /></button>
            </div>
            <div className="dm-modal-body">
              <div className="dm-form-group">
                <label className="dm-field-label">Folder Name</label>
                <input 
                  type="text"
                  className="dm-input"
                  placeholder="e.g. Electrical Schematics & Drawings"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                />
              </div>
            </div>
            <div className="dm-modal-footer">
              <button className="dm-btn dm-btn-secondary" onClick={() => setIsAddFolderModalOpen(false)}>Cancel</button>
              <button 
                className="dm-btn dm-btn-primary"
                onClick={async () => {
                  if (!newFolderName) return;
                  await addAssetMedia(selectedAsset.id, {
                    type: 'Folder',
                    name: newFolderName,
                    content_type: 'Folder',
                    file_size_kb: 0,
                    path: `/${newFolderName}`
                  });
                  setIsAddFolderModalOpen(false);
                }}
              >
                Create Folder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Upload Media Modal */}
      {isUploadMediaModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1400 }}>
          <div className="dm-modal-box" style={{ width: '480px' }}>
            <div className="dm-modal-header">
              <h3>Upload Media File</h3>
              <button onClick={() => setIsUploadMediaModalOpen(false)} className="dm-close-btn"><X size={18} /></button>
            </div>
            <div className="dm-modal-body">
              <div className="dm-form-group">
                <label className="dm-field-label">File Name</label>
                <input 
                  type="text"
                  className="dm-input"
                  placeholder="e.g. Pump_Impeller_Vibration_Spectrum.png"
                  value={mediaUploadForm.name}
                  onChange={(e) => setMediaUploadForm({ ...mediaUploadForm, name: e.target.value })}
                />
              </div>
              <div className="dm-form-grid-2">
                <div className="dm-form-group">
                  <label className="dm-field-label">Content Type</label>
                  <select 
                    className="dm-select"
                    value={mediaUploadForm.content_type}
                    onChange={(e) => setMediaUploadForm({ ...mediaUploadForm, content_type: e.target.value })}
                  >
                    <option value="PDF">PDF</option>
                    <option value="JPEG">JPEG</option>
                    <option value="PNG">PNG</option>
                    <option value="XML">XML</option>
                    <option value="MP4">MP4 Video</option>
                  </select>
                </div>
                <div className="dm-form-group">
                  <label className="dm-field-label">File Size (KB)</label>
                  <input 
                    type="number"
                    className="dm-input"
                    value={mediaUploadForm.file_size_kb}
                    onChange={(e) => setMediaUploadForm({ ...mediaUploadForm, file_size_kb: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>
            <div className="dm-modal-footer">
              <button className="dm-btn dm-btn-secondary" onClick={() => setIsUploadMediaModalOpen(false)}>Cancel</button>
              <button 
                className="dm-btn dm-btn-primary"
                onClick={async () => {
                  if (!mediaUploadForm.name) return;
                  await addAssetMedia(selectedAsset.id, {
                    type: 'Media File',
                    name: mediaUploadForm.name,
                    content_type: mediaUploadForm.content_type,
                    file_size_kb: mediaUploadForm.file_size_kb,
                    path: `/${mediaUploadForm.name}`,
                    url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800'
                  });
                  setIsUploadMediaModalOpen(false);
                }}
              >
                Upload File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
