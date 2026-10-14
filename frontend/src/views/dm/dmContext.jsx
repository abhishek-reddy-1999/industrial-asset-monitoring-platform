import React, { createContext, useContext, useState, useEffect } from 'react';
import { DM_TRANSLATIONS } from './dmTranslations';
import { telemetryWS } from '../../api/websocket';

const DMContext = createContext(null);

export function useDM() {
  const ctx = useContext(DMContext);
  if (!ctx) throw new Error("useDM must be used within a DMProvider");
  return ctx;
}

export function DMProvider({ children, onNavigateToDI }) {
  const [lang, setLang] = useState(() => localStorage.getItem('ahi_dm_lang') || 'en');
  const _translations = DM_TRANSLATIONS[lang] || DM_TRANSLATIONS.en;
  const t = (key) => {
    if (!key) return '';
    if (_translations[key]) return _translations[key];
    // Map foo_entity -> entity_foo
    const flipped = key.endsWith('_entity') ? `entity_${key.replace(/_entity$/, '')}` : null;
    if (flipped && _translations[flipped]) return _translations[flipped];
    // Check entity_key
    if (_translations[`entity_${key}`]) return _translations[`entity_${key}`];
    // Check nav_key
    if (_translations[`nav_${key}`]) return _translations[`nav_${key}`];
    // Fallback: title-case human readable label
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  };
  Object.assign(t, _translations);

  // Active view navigation
  const [activeEntity, setActiveEntity] = useState(() => localStorage.getItem('ahi_dm_default_page') || 'asset');
  const [selectedAssetId, setSelectedAssetId] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Modals state
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isSitemapOpen, setIsSitemapOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isAppPortalOpen, setIsAppPortalOpen] = useState(false);
  const [activeNotificationsOpen, setActiveNotificationsOpen] = useState(false);

  // Toast feedback state
  const [toasts, setToasts] = useState([]);
  const showToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  // Main State
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState({
    id: "",
    name: "New Industrial Plant",
    code: "",
    region: ""
  });
  const [availableProjects, setAvailableProjects] = useState([]);
  const [userProfile, setUserProfile] = useState({
    first_name: "Admin",
    last_name: "User",
    account_id: "admin@local",
    role: "System Administrator",
    avatar: "",
    datetime_format: "YYYY-MM-DD HH:mm:ss",
    timezone: "UTC"
  });

  const [assets, setAssets] = useState([]);
  const selectedAsset = (assets || []).filter(Boolean).find(a => a?.id === selectedAssetId) || (assets || []).filter(Boolean)[0] || null;
  const [assetTemplates, setAssetTemplates] = useState([]);
  const [devices, setDevices] = useState([]);
  const [deviceTemplates, setDeviceTemplates] = useState([]);
  const [brokers, setBrokers] = useState([]);
  const [integrations, setIntegrations] = useState([]);
  const [uomList, setUomList] = useState([]);
  const [eventForwardings, setEventForwardings] = useState([]);
  const [alarms, setAlarms] = useState([]);
  const [alarmHistories, setAlarmHistories] = useState([]);
  const [alarmRules, setAlarmRules] = useState([]);
  const [alarmActions, setAlarmActions] = useState([]);
  const [users, setUsers] = useState([]);
  const [userGroups, setUserGroups] = useState([]);
  const [userOverrides, setUserOverrides] = useState([]);
  const [apiClients, setApiClients] = useState([]);
  const [objectSecurityRules, setObjectSecurityRules] = useState([]);
  const [functionBlocks, setFunctionBlocks] = useState([]);
  const [functionBlockTemplates, setFunctionBlockTemplates] = useState([]);
  const [scadaWindows, setScadaWindows] = useState([]);
  const [mappableDmTags, setMappableDmTags] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);

  // Fetch DM State from Backend
  const refreshState = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/dm/state');
      if (res.ok) {
        const data = await res.json();
        setScadaWindows(data.scada_windows || []);
        setProject(data.project || project);
        setAvailableProjects(data.available_projects || []);
        setUserProfile(data.user_profile || userProfile);
        setAssets((data.assets || []).filter(Boolean));
        setAssetTemplates(data.asset_templates || []);
        setDevices(data.devices || []);
        setDeviceTemplates(data.device_templates || []);
        setBrokers(data.brokers || []);
        setIntegrations(data.integrations || []);
        setUomList(data.uom_list || []);
        setEventForwardings(data.event_forwardings || []);
        setAlarms(data.alarms || []);
        setAlarmHistories(data.alarm_histories || []);
        setAlarmRules(data.alarm_rules || []);
        setAlarmActions(data.alarm_actions || []);
        setUsers(data.users || []);
        setUserGroups(data.user_groups || []);
        setUserOverrides(data.user_overrides || []);
        setApiClients(data.api_clients || []);
        setObjectSecurityRules(data.object_security_rules || []);
        setFunctionBlocks(data.function_blocks || []);
        setFunctionBlockTemplates(data.function_block_templates || []);
        setActivityLogs(data.activity_logs || []);
        if (data.assets?.length > 0 && !selectedAssetId) {
          setSelectedAssetId(data.assets[0].id);
        }
      }
    } catch (err) {
      console.warn("Could not fetch state from backend, using cached state:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshState();
  }, []);

  // Real-time WebSocket device & asset telemetry listener
  useEffect(() => {
    const unsub = telemetryWS.subscribe((incoming) => {
      if (!incoming) return;

      // 0. Live Alarms Real-time Sync Frame
      if (incoming._alarms_update || incoming.event === 'alarms_updated' || incoming.alarms) {
        const newAlarms = incoming.alarms || incoming._alarms_update?.alarms;
        if (Array.isArray(newAlarms)) {
          setAlarms(newAlarms);
        }
      }

      // 1. Direct Asset Telemetry Frame
      if (incoming._asset_telemetry || incoming.event === 'asset_telemetry' || incoming.assets) {
        const newAssets = incoming.assets || incoming._asset_telemetry?.assets;
        if (Array.isArray(newAssets)) {
          setAssets(newAssets);
        }
      }

      // 2. Device Health Update (Connection Status changed)
      if (incoming._device_health_update || incoming.event === 'device_health_update') {
        const hu = incoming._device_health_update || incoming;
        const targetId = hu.device_id || hu.identifier;
        const newStatus = hu.status || (hu.is_connected ? 'Connected' : 'Disconnected');
        if (targetId) {
          setDevices(prev => prev.map(d => {
            const isMatch = (d.id && String(d.id).toLowerCase() === String(targetId).toLowerCase()) ||
                            (d.identifier && String(d.identifier).toLowerCase() === String(targetId).toLowerCase()) ||
                            (d.name && String(d.name).toLowerCase() === String(targetId).toLowerCase());
            return isMatch ? { ...d, status: newStatus, ...(hu.device || {}) } : d;
          }));

          // Dynamically adjust linked asset attributes quality: Connected -> Good, Disconnected -> Bad
          setAssets(prev => prev.map(ast => {
            const targetIdLow = String(targetId).trim().toLowerCase();
            const updatedAttrs = (ast.attributes || []).map(attr => {
              const devRef = String(attr.device_id || attr.device_markup || '').trim().toLowerCase();
              if (attr.type in ['Dynamic', 'Integration', 'Command'] && devRef === targetIdLow) {
                return { ...attr, quality: newStatus === 'Connected' ? 'Good' : 'Bad' };
              }
              return attr;
            });

            // Recheck Runtime attributes quality
            const badNames = new Set(updatedAttrs.filter(a => a.quality === 'Bad').map(a => a.name.toLowerCase()));
            const finalAttrs = updatedAttrs.map(attr => {
              if (attr.type === 'Runtime' && attr.expression) {
                const refs = attr.expression.match(/@([a-zA-Z0-9_]+)/g) || [];
                const isBad = refs.some(r => badNames.has(r.substring(1).toLowerCase()) || badNames.has(r.substring(1).toLowerCase().replace(/_/g, ' ')));
                return { ...attr, quality: isBad ? 'Bad' : 'Good' };
              }
              return attr;
            });

            return { ...ast, attributes: finalAttrs };
          }));
        }
      }

      // 3. Live Device Telemetry Packet
      if (incoming._device_telemetry || incoming.event === 'device_telemetry') {
        const dt = incoming._device_telemetry || incoming;
        const targetId = dt.device_id || dt.device?.identifier || dt.device?.id;
        const payload = dt.payload;
        const nowIso = dt.timestamp || new Date().toISOString();
        const dev = dt.device;
        const packetTimestamp = dev?.last_data_received || dt.last_data_received || payload?.timestamp || payload?.time || payload?.ts || payload?.timestampunix || nowIso;

        if (Array.isArray(dt.assets)) {
          setAssets(dt.assets);
        }

        if (targetId) {
          setDevices(prev => {
            const matchTarget = (d) => (
              (d.identifier && String(d.identifier).trim().toLowerCase() === String(targetId).trim().toLowerCase()) ||
              (d.id && String(d.id).trim().toLowerCase() === String(targetId).trim().toLowerCase())
            );
            const exists = prev.some(matchTarget);
            if (exists) {
              return prev.map(d => matchTarget(d) ? {
                ...d,
                ...(dev || {}),
                status: "Connected",
                last_seen: nowIso,
                last_data_received: packetTimestamp,
                last_payload: payload,
              } : d);
            } else if (dev) {
              return [...prev, { ...dev, status: "Connected", last_seen: nowIso, last_data_received: packetTimestamp, last_payload: payload }];
            }
            return prev;
          });
        }
      }
    });
    return () => unsub();
  }, []);

  // Live Alarms Background Polling Safeguard (Guarantees fresh alarms without manual page refresh)
  useEffect(() => {
    const syncTimer = setInterval(async () => {
      try {
        const res = await fetch('/api/v1/dm/state');
        if (res.ok) {
          const stateData = await res.json();
          if (Array.isArray(stateData.alarms)) {
            setAlarms(stateData.alarms);
          }
          if (Array.isArray(stateData.alarm_histories)) {
            setAlarmHistories(stateData.alarm_histories);
          }
        }
      } catch (err) {
        // silent catch
      }
    }, 2500);
    return () => clearInterval(syncTimer);
  }, []);

  const changeLanguage = (newLang) => {
    setLang(newLang);
    localStorage.setItem('ahi_dm_lang', newLang);
    showToast(`Language set to ${newLang.toUpperCase()}`, 'info');
  };

  const setAsDefaultPage = (entityKey) => {
    localStorage.setItem('ahi_dm_default_page', entityKey);
    showToast(`Current entity '${entityKey}' set as default start page!`, 'success');
  };

  // Helper to log audit activity
  const logActivity = (entity, entityId, action, status = "Success", details = "") => {
    const newLog = {
      id: `log-${Date.now().toString(36)}`,
      entity,
      entity_id: String(entityId),
      action,
      event_initiated_by: userProfile.account_id,
      status,
      created_at: new Date().toISOString(),
      details
    };
    setActivityLogs(prev => [newLog, ...prev]);
  };

  // ----------------------------------------------------
  // ASSET ENTITY OPERATIONS
  // ----------------------------------------------------
  const createAsset = async (assetData) => {
    try {
      const res = await fetch('/api/v1/dm/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assetData)
      });
      const newAsset = res.ok ? await res.json() : {
        id: `ast-${Date.now().toString(36)}`,
        ...assetData,
        is_bookmarked: false,
        attributes: [],
        tables: [],
        media: []
      };
      setAssets(prev => [...prev, newAsset]);
      setSelectedAssetId(newAsset.id);
      logActivity("Asset", newAsset.id, "Add", "Success", `Created asset element '${newAsset.name}'`);
      showToast(`Asset '${newAsset.name}' created successfully`, 'success');
      return newAsset;
    } catch (err) {
      showToast(`Asset creation failed: ${err.message}`, 'error');
    }
  };

  const updateAsset = async (assetId, updates) => {
    try {
      await fetch(`/api/v1/dm/assets/${assetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      setAssets(prev => prev.map(a => a.id === assetId ? { ...a, ...updates } : a));
      logActivity("Asset", assetId, "Update", "Success", `Updated asset properties`);
      showToast(`Asset updated`, 'success');
    } catch (err) {
      showToast(`Update error: ${err.message}`, 'error');
    }
  };

  const deleteAsset = async (assetId) => {
    try {
      await fetch(`/api/v1/dm/assets/${assetId}`, { method: 'DELETE' });
      // remove asset and all children
      const toDelete = new Set([assetId]);
      let changed = true;
      while (changed) {
        changed = false;
        (assets || []).filter(Boolean).forEach(a => {
          if (a?.parent_id && toDelete.has(a.parent_id) && !toDelete.has(a.id)) {
            toDelete.add(a.id);
            changed = true;
          }
        });
      }
      const remaining = (assets || []).filter(a => a?.id && !toDelete.has(a.id));
      setAssets(remaining);
      if (selectedAssetId && toDelete.has(selectedAssetId)) {
        setSelectedAssetId(remaining[0]?.id || null);
      }
      logActivity("Asset", assetId, "Delete", "Success", `Deleted asset ${assetId}`);
      showToast(`Asset and sub-elements deleted`, 'info');
    } catch (err) {
      showToast(`Delete error: ${err.message}`, 'error');
    }
  };

  const reorderHierarchy = async (movedAssetId, newParentId) => {
    try {
      await fetch('/api/v1/dm/assets/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moved_asset_id: movedAssetId, new_parent_id: newParentId })
      });
      setAssets(prev => (prev || []).filter(Boolean).map(a => {
        if (a?.id === movedAssetId) {
          const newParent = (prev || []).find(p => p?.id === newParentId);
          const pPath = newParent ? newParent.path : "";
          return {
            ...a,
            parent_id: newParentId,
            path: `${pPath} / ${a.name}`.replace(/^\s*\/\s*/, '')
          };
        }
        return a;
      }));
      logActivity("Asset", movedAssetId, "Reorder", "Success", `Hierarchy reorganized via drag & drop`);
      showToast(`Asset hierarchy level updated`, 'success');
    } catch (err) {
      showToast(`Reorder failed: ${err.message}`, 'error');
    }
  };

  const cloneAsset = async (assetId, includeChildren = false) => {
    try {
      const res = await fetch(`/api/v1/dm/assets/${assetId}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ include_children: includeChildren })
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.assets)) {
          setAssets(data.assets.filter(Boolean));
        } else if (data.asset) {
          setAssets(prev => [...(prev || []).filter(Boolean), data.asset]);
        } else if (data && data.id) {
          setAssets(prev => [...(prev || []).filter(Boolean), data]);
        }
        showToast(includeChildren ? `Cloned asset and children sub-tree!` : `Cloned asset element!`, 'success');
      } else {
        throw new Error("Clone API failed");
      }
    } catch (err) {
      // Local fallback clone
      const target = (assets || []).find(a => a?.id === assetId);
      if (!target) return;
      const clone = JSON.parse(JSON.stringify(target));
      clone.id = `ast-${Date.now().toString(36)}`;
      clone.name = `${target.name} (Copy)`;
      clone.path = `${target.path} (Copy)`;
      setAssets(prev => [...(prev || []).filter(Boolean), clone]);
      showToast(`Cloned asset element!`, 'success');
    }
  };

  const toggleBookmark = async (assetId) => {
    try {
      await fetch(`/api/v1/dm/assets/${assetId}/bookmark`, { method: 'POST' });
    } catch (e) {}
    setAssets(prev => prev.map(a => a.id === assetId ? { ...a, is_bookmarked: !a.is_bookmarked } : a));
  };

  const downloadAttributeAssembly = async (assetId) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;
    const assembly = {
      asset_id: asset.id,
      asset_name: asset.name,
      path: asset.path,
      exported_at: new Date().toISOString(),
      attributes: asset.attributes || [],
      tables: asset.tables || []
    };
    const blob = new Blob([JSON.stringify(assembly, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${asset.name.replace(/[\s/]+/g, '_')}_Assembly.json`;
    link.click();
    URL.revokeObjectURL(url);
    logActivity("Asset", assetId, "Download", "Success", `Downloaded attribute assembly`);
    showToast(`Downloaded attribute assembly for ${asset.name}`, 'success');
  };

  // ----------------------------------------------------
  // ASSET ATTRIBUTES
  // ----------------------------------------------------
  const addAssetAttribute = async (assetId, attrData) => {
    try {
      const res = await fetch(`/api/v1/dm/assets/${assetId}/attributes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attrData)
      });
      const newAttr = res.ok ? await res.json() : {
        id: `attr-${Date.now().toString(36)}`,
        ...attrData,
        quality: "Good",
        timestamp: new Date().toISOString()
      };
      setAssets(prev => prev.map(a => a.id === assetId ? {
        ...a,
        attributes: [...(a.attributes || []), newAttr]
      } : a));
      logActivity("Asset Attribute", newAttr.id, "Add", "Success", `Added attribute '${newAttr.name}'`);
      showToast(`Attribute '${newAttr.name}' added`, 'success');
      return newAttr;
    } catch (err) {
      showToast(`Add attribute failed: ${err.message}`, 'error');
    }
  };

  const updateAssetAttribute = async (assetId, attrId, updates) => {
    try {
      await fetch(`/api/v1/dm/assets/${assetId}/attributes/${attrId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      setAssets(prev => prev.map(a => {
        if (a.id !== assetId) return a;
        return {
          ...a,
          attributes: (a.attributes || []).map(at => at.id === attrId ? { ...at, ...updates, timestamp: new Date().toISOString() } : at)
        };
      }));
      showToast(`Attribute updated`, 'success');
    } catch (err) {
      showToast(`Update error: ${err.message}`, 'error');
    }
  };

  const deleteAssetAttribute = async (assetId, attrId) => {
    try {
      await fetch(`/api/v1/dm/assets/${assetId}/attributes/${attrId}`, { method: 'DELETE' });
      setAssets(prev => prev.map(a => a.id === assetId ? {
        ...a,
        attributes: (a.attributes || []).filter(at => at.id !== attrId)
      } : a));
      logActivity("Asset Attribute", attrId, "Delete", "Success", `Deleted attribute`);
      showToast(`Attribute deleted`, 'info');
    } catch (err) {
      showToast(`Delete error: ${err.message}`, 'error');
    }
  };

  // ----------------------------------------------------
  // ASSET TABLE CRUD
  // ----------------------------------------------------
  const createAssetTable = async (assetId, tableData) => {
    try {
      const res = await fetch(`/api/v1/dm/assets/${assetId}/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tableData)
      });
      const newTable = res.ok ? await res.json() : {
        id: `tbl-${Date.now().toString(36)}`,
        ...tableData,
        rows: [],
        last_edited: new Date().toISOString()
      };
      setAssets(prev => prev.map(a => a.id === assetId ? {
        ...a,
        tables: [...(a.tables || []), newTable]
      } : a));
      logActivity("Asset Table", newTable.id, "Add", "Success", `Created table '${newTable.name}'`);
      showToast(`Table '${newTable.name}' created`, 'success');
      return newTable;
    } catch (err) {
      showToast(`Create table failed: ${err.message}`, 'error');
    }
  };

  const updateTableSchema = async (assetId, tableId, schemaData) => {
    try {
      await fetch(`/api/v1/dm/assets/${assetId}/tables/${tableId}/schema`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schemaData)
      });
      setAssets(prev => prev.map(a => {
        if (a.id !== assetId) return a;
        return {
          ...a,
          tables: (a.tables || []).map(t => t.id === tableId ? { ...t, ...schemaData, last_edited: new Date().toISOString() } : t)
        };
      }));
      logActivity("Asset Table", tableId, "Edit Schema", "Success", `Updated table schema`);
      showToast(`Table schema updated`, 'success');
    } catch (err) {
      showToast(`Schema update failed: ${err.message}`, 'error');
    }
  };

  const addTableRow = async (assetId, tableId, rowData) => {
    try {
      await fetch(`/api/v1/dm/assets/${assetId}/tables/${tableId}/rows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rowData)
      });
      setAssets(prev => prev.map(a => {
        if (a.id !== assetId) return a;
        return {
          ...a,
          tables: (a.tables || []).map(t => t.id === tableId ? {
            ...t,
            rows: [...(t.rows || []), rowData],
            last_edited: new Date().toISOString()
          } : t)
        };
      }));
      showToast(`Record added to table`, 'success');
    } catch (err) {
      showToast(`Add row error: ${err.message}`, 'error');
    }
  };

  const deleteAssetTable = async (assetId, tableId) => {
    try {
      await fetch(`/api/v1/dm/assets/${assetId}/tables/${tableId}`, { method: 'DELETE' });
      setAssets(prev => prev.map(a => a.id === assetId ? {
        ...a,
        tables: (a.tables || []).filter(t => t.id !== tableId)
      } : a));
      logActivity("Asset Table", tableId, "Delete", "Success", `Deleted table`);
      showToast(`Table deleted`, 'info');
    } catch (err) {
      showToast(`Delete table error: ${err.message}`, 'error');
    }
  };

  // ----------------------------------------------------
  // ASSET MEDIA CRUD
  // ----------------------------------------------------
  const addAssetMedia = async (assetId, mediaData) => {
    try {
      const res = await fetch(`/api/v1/dm/assets/${assetId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mediaData)
      });
      const newItem = res.ok ? await res.json() : {
        id: `med-${Date.now().toString(36)}`,
        ...mediaData,
        last_edited: new Date().toISOString()
      };
      setAssets(prev => prev.map(a => a.id === assetId ? {
        ...a,
        media: [...(a.media || []), newItem]
      } : a));
      showToast(`Added ${newItem.type}: ${newItem.name}`, 'success');
      return newItem;
    } catch (err) {
      showToast(`Add media failed: ${err.message}`, 'error');
    }
  };

  const deleteAssetMedia = async (assetId, mediaId) => {
    try {
      await fetch(`/api/v1/dm/assets/${assetId}/media/${mediaId}`, { method: 'DELETE' });
      setAssets(prev => prev.map(a => a.id === assetId ? {
        ...a,
        media: (a.media || []).filter(m => m.id !== mediaId)
      } : a));
      showToast(`Media item deleted`, 'info');
    } catch (err) {
      showToast(`Delete media error: ${err.message}`, 'error');
    }
  };

  // ----------------------------------------------------
  // ASSET TEMPLATE & DEPLOY WIZARD
  // ----------------------------------------------------
  const createAssetTemplate = async (templateData) => {
    try {
      const res = await fetch('/api/v1/dm/asset-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
      });
      const newTmpl = res.ok ? await res.json() : {
        id: `tmpl-${Date.now().toString(36)}`,
        ...templateData
      };
      setAssetTemplates(prev => [...prev, newTmpl]);
      logActivity("Asset Template", newTmpl.id, "Add", "Success", `Created template '${newTmpl.name}'`);
      showToast(`Template '${newTmpl.name}' created`, 'success');
      return newTmpl;
    } catch (err) {
      showToast(`Create template error: ${err.message}`, 'error');
    }
  };

  const updateAssetTemplate = async (tmplId, templateData) => {
    try {
      const res = await fetch(`/api/v1/dm/asset-templates/${tmplId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
      });
      const updatedTmpl = res.ok ? await res.json() : { id: tmplId, ...templateData };
      setAssetTemplates(prev => {
        const exists = prev.some(t => t.id === tmplId || t.name === tmplId);
        if (exists) {
          return prev.map(t => (t.id === tmplId || t.name === tmplId) ? { ...t, ...updatedTmpl } : t);
        }
        return [...prev, updatedTmpl];
      });
      logActivity("Asset Template", tmplId, "Edit", "Success", `Updated template '${updatedTmpl.name || tmplId}'`);
      showToast(`Template updated successfully`, 'success');
      return updatedTmpl;
    } catch (err) {
      showToast(`Update template error: ${err.message}`, 'error');
    }
  };

  const deleteAssetTemplate = async (tmplId) => {
    try {
      await fetch(`/api/v1/dm/asset-templates/${tmplId}`, { method: 'DELETE' });
      setAssetTemplates(prev => prev.filter(t => t.id !== tmplId && t.name !== tmplId));
      logActivity("Asset Template", tmplId, "Delete", "Success", `Deleted template ${tmplId}`);
      showToast(`Template deleted`, 'info');
    } catch (err) {
      showToast(`Delete template error: ${err.message}`, 'error');
    }
  };

  const deployAssetTemplate = async (tmplId, deployPayload) => {
    try {
      const res = await fetch(`/api/v1/dm/asset-templates/${tmplId}/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deployPayload)
      });
      if (res.ok) {
        const data = await res.json();
        const createdList = Array.isArray(data.created_assets) && data.created_assets.length > 0 
          ? data.created_assets 
          : (data.asset ? [data.asset] : []);

        if (createdList.length > 0) {
          setAssets(prev => {
            const existingIds = new Set((prev || []).map(a => a?.id));
            const newOnes = createdList.filter(a => !existingIds.has(a.id));
            return [...(prev || []), ...newOnes];
          });
          setSelectedAssetId(createdList[0]?.id);
          setActiveEntity('asset');
          // Refresh devices list so auto-registered devices appear immediately
          fetchDevices();
          logActivity("Asset Template", tmplId, "Deploy", "Success", `Deployed template to create ${createdList.length} asset(s)`);
          showToast(`Successfully created ${createdList.length} asset(s) from template!`, 'success');
          return createdList[0];
        } else if (Array.isArray(data.assets)) {
          setAssets(data.assets.filter(Boolean));
          fetchDevices();
        }
      }
    } catch (err) {
      showToast(`Deploy template error: ${err.message}`, 'error');
    }
  };

  // ----------------------------------------------------
  // DEVICES & TELEMETRY
  // ----------------------------------------------------
  const createDevice = async (deviceData) => {
    try {
      const res = await fetch('/api/v1/dm/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deviceData)
      });
      const newDev = res.ok ? await res.json() : {
        id: deviceData.identifier || `dev-${Date.now().toString(36)}`,
        ...deviceData,
        status: deviceData.health_check ? "Connected" : "Configured",
        last_edited: new Date().toISOString()
      };
      setDevices(prev => [...prev.filter(d => d.id !== newDev.id && d.identifier !== newDev.identifier), newDev]);
      logActivity("Device", newDev.id, "Add", "Success", `Registered device '${newDev.name}' (${newDev.identifier})`);
      showToast(`Device '${newDev.name}' registered successfully`, 'success');
      return newDev;
    } catch (err) {
      const fallback = {
        id: deviceData.identifier || `dev-${Date.now().toString(36)}`,
        ...deviceData,
        status: deviceData.health_check ? "Connected" : "Configured",
        last_edited: new Date().toISOString()
      };
      setDevices(prev => [...prev.filter(d => d.id !== fallback.id && d.identifier !== fallback.identifier), fallback]);
      showToast(`Device registered locally`, 'info');
      return fallback;
    }
  };

  const updateDevice = async (deviceId, updates) => {
    try {
      const res = await fetch(`/api/v1/dm/devices/${deviceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const updated = res.ok ? await res.json() : { ...updates, id: deviceId };
      setDevices(prev => prev.map(d => (d.id === deviceId || d.identifier === deviceId) ? {
        ...d,
        ...updated,
        last_payload: (updated.last_payload !== undefined && updated.last_payload !== null) ? updated.last_payload : d.last_payload,
        last_data_received: updated.last_data_received || d.last_data_received,
        last_edited: new Date().toISOString()
      } : d));
      logActivity("Device", deviceId, "Update", "Success", `Updated configuration for device '${updated.name || deviceId}'`);
      showToast(`Device '${updated.name || deviceId}' updated successfully`, 'success');
      return updated;
    } catch (err) {
      setDevices(prev => prev.map(d => (d.id === deviceId || d.identifier === deviceId) ? {
        ...d,
        ...updates,
        last_payload: (updates.last_payload !== undefined && updates.last_payload !== null) ? updates.last_payload : d.last_payload,
        last_data_received: updates.last_data_received || d.last_data_received,
        last_edited: new Date().toISOString()
      } : d));
      showToast(`Device updated locally`, 'info');
      return { ...updates, id: deviceId };
    }
  };

  const deleteDevice = async (deviceId) => {
    try {
      await fetch(`/api/v1/dm/devices/${deviceId}`, { method: 'DELETE' });
      setDevices(prev => prev.filter(d => d.id !== deviceId && d.identifier !== deviceId));
      logActivity("Device", deviceId, "Delete", "Success", `Deleted device ${deviceId}`);
      showToast(`Device deleted`, 'info');
    } catch (err) {
      setDevices(prev => prev.filter(d => d.id !== deviceId && d.identifier !== deviceId));
      showToast(`Device deleted locally`, 'info');
    }
  };

  // ----------------------------------------------------
  // DEVICE TEMPLATE OPERATIONS
  // ----------------------------------------------------
  const createDeviceTemplate = async (templateData) => {
    try {
      const res = await fetch('/api/v1/dm/device-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
      });
      const newTmpl = res.ok ? await res.json() : {
        id: `dt-${Date.now().toString(36)}`,
        ...templateData
      };
      setDeviceTemplates(prev => {
        const filtered = prev.filter(t => t.id !== newTmpl.id);
        return [...filtered, newTmpl];
      });
      logActivity("DeviceTemplate", newTmpl.id, "Add", "Success", `Created device template '${newTmpl.template_name || newTmpl.id}'`);
      showToast(`Device template '${newTmpl.template_name || newTmpl.id}' created and saved!`, 'success');
      return newTmpl;
    } catch (err) {
      const fallback = { id: `dt-${Date.now().toString(36)}`, ...templateData };
      setDeviceTemplates(prev => [...prev.filter(t => t.id !== fallback.id), fallback]);
      showToast(`Device template saved locally`, 'info');
      return fallback;
    }
  };

  const updateDeviceTemplate = async (templateId, updates) => {
    try {
      const res = await fetch(`/api/v1/dm/device-templates/${templateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const updated = res.ok ? await res.json() : { id: templateId, ...updates };
      setDeviceTemplates(prev => prev.map(t => t.id === templateId ? { ...t, ...updated } : t));
      logActivity("DeviceTemplate", templateId, "Update", "Success", `Updated device template '${updated.template_name || templateId}'`);
      showToast(`Device template '${updated.template_name || templateId}' saved to server!`, 'success');
      return updated;
    } catch (err) {
      setDeviceTemplates(prev => prev.map(t => t.id === templateId ? { ...t, ...updates } : t));
      showToast(`Device template updated locally`, 'info');
      return { id: templateId, ...updates };
    }
  };

  const deleteDeviceTemplate = async (templateId) => {
    try {
      await fetch(`/api/v1/dm/device-templates/${templateId}`, { method: 'DELETE' });
      setDeviceTemplates(prev => prev.filter(t => t.id !== templateId));
      logActivity("DeviceTemplate", templateId, "Delete", "Success", `Deleted device template '${templateId}'`);
      showToast(`Device template removed`, 'info');
    } catch (err) {
      setDeviceTemplates(prev => prev.filter(t => t.id !== templateId));
      showToast(`Device template removed locally`, 'info');
    }
  };

  const generateSasToken = async (deviceId, days = 365) => {
    try {
      const res = await fetch(`/api/v1/dm/devices/${deviceId}/generate-sas?duration_days=${days}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, sas_token: data.sas_token, sas_token_duration: days } : d));
        showToast(`Generated Azure IoT Hub SAS Token (Valid ${days} days)`, 'success');
        return data.sas_token;
      }
    } catch (err) {
      showToast(`SAS generation error: ${err.message}`, 'error');
    }
  };

  const sendDeviceBinding = async (deviceId, val) => {
    try {
      await fetch(`/api/v1/dm/devices/${deviceId}/send-binding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: val })
      });
      setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, binding_value: String(val) } : d));
      showToast(`Cloud-to-Device binding signal '${val}' dispatched!`, 'success');
    } catch (err) {
      showToast(`Binding command error: ${err.message}`, 'error');
    }
  };

  const ingestBrokerPayload = async (payload) => {
    try {
      const res = await fetch('/api/v1/dm/broker/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const result = await res.json();
        const targetId = result.device_id || payload.deviceid || payload.deviceId || payload.identifier || payload.id || 'device';
        const nowIso = new Date().toISOString();
        // Immediately update devices state with the latest payload and timestamp so UI updates with zero delay
        setDevices(prev => {
          const matchTarget = (d) => (
            (d.identifier && String(d.identifier).trim().toLowerCase() === String(targetId).trim().toLowerCase()) ||
            (d.id && String(d.id).trim().toLowerCase() === String(targetId).trim().toLowerCase())
          );
          const exists = prev.some(matchTarget);
          if (exists) {
            return prev.map(d => matchTarget(d) ? {
              ...d,
              status: "Connected",
              last_seen: nowIso,
              last_data_received: nowIso,
              last_payload: payload,
              ...(result.device || {})
            } : d);
          } else if (result.device) {
            return [...prev, result.device];
          }
          return prev;
        });
        if (Array.isArray(result.assets)) {
          setAssets(result.assets);
        }
        showToast(`Ingested live payload for ${targetId}!`, 'success');
        refreshState();
        return result;
      } else {
        const errJson = await res.json().catch(() => ({}));
        showToast(`Ingestion error: ${errJson.detail || 'Bad Request'}`, 'error');
      }
    } catch (err) {
      showToast(`Ingestion error: ${err.message}`, 'error');
    }
  };

  // ----------------------------------------------------
  // ALARM MANAGEMENT
  // ----------------------------------------------------
  const acknowledgeAlarm = async (alarmId) => {
    try {
      await fetch(`/api/v1/dm/alarms/${alarmId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: userProfile.account_id })
      });
      setAlarms(prev => prev.map(a => a.id === alarmId ? {
        ...a,
        state: "In Alarm Acknowledged",
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: userProfile.account_id
      } : a));
      logActivity("Alarm", alarmId, "Annotate Alarm", "Success", `Operator acknowledged alarm`);
      showToast(`Alarm acknowledged by ${userProfile.account_id}`, 'success');
    } catch (err) {
      showToast(`Acknowledge error: ${err.message}`, 'error');
    }
  };

  const clearAlarm = async (alarmId) => {
    try {
      const res = await fetch(`/api/v1/dm/alarms/${alarmId}/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: userProfile.account_id })
      });
      const data = await res.json();
      if (res.ok) {
        const clearedAlarm = data.cleared_alarm;
        setAlarms(prev => prev.filter(a => a.id !== alarmId));
        if (clearedAlarm) {
          setAlarmHistories(prev => [
            {
              id: `hist-${Date.now().toString(36)}`,
              alarm_name: clearedAlarm.alarm_name,
              source_signal: clearedAlarm.tag_name,
              asset_name: clearedAlarm.source_asset,
              priority: clearedAlarm.priority,
              severity: clearedAlarm.severity,
              cleared_at: new Date().toISOString(),
              trail: [
                { step: 1, state: 'In Alarm Unacknowledged', signal_value: clearedAlarm.current_value, timestamp: clearedAlarm.occurred_at, actor: 'System Auto-Trip', status_color: '#ef4444' },
                { step: 2, state: 'Return To Normal (Cleared)', signal_value: 'Normal Range', timestamp: new Date().toISOString(), actor: userProfile.account_id, status_color: '#10b981' }
              ]
            },
            ...prev
          ]);
        }
        logActivity("Alarm", alarmId, "Clear Alarm", "Success", `Alarm cleared & Return-to-Normal dispatched`);
        showToast(`Alarm returned to normal & dispatched to forwarders`, 'success');
        return data;
      } else {
        throw new Error(data.detail || 'Failed to clear alarm');
      }
    } catch (err) {
      showToast(`Clear alarm error: ${err.message}`, 'error');
    }
  };

  const triggerAlarm = async (alarmData) => {
    try {
      const res = await fetch('/api/v1/dm/alarms/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alarmData)
      });
      if (res.ok) {
        const data = await res.json();
        const newAlarm = data.alarm;
        setAlarms(prev => [newAlarm, ...prev]);
        logActivity("Alarm", newAlarm.id, "Trip Alarm", "Success", `Triggered alarm '${newAlarm.alarm_name}'`);
        showToast(`Process alarm '${newAlarm.alarm_name}' generated!`, 'warning');
        return newAlarm;
      }
    } catch (err) {
      showToast(`Trigger alarm error: ${err.message}`, 'error');
    }
  };

  const deleteAlarm = async (alarmId) => {
    try {
      const res = await fetch(`/api/v1/dm/alarms/${alarmId}`, { method: 'DELETE' });
      if (res.ok) {
        setAlarms(prev => prev.filter(a => a.id !== alarmId));
        logActivity("Alarm", alarmId, "Delete Alarm", "Success", `Deleted alarm ${alarmId}`);
        showToast('Alarm removed', 'info');
      }
    } catch (err) {
      showToast(`Delete alarm error: ${err.message}`, 'error');
    }
  };

  const testForwardAlarm = async (alarmId, destinationUrl = null) => {
    try {
      const res = await fetch(`/api/v1/dm/alarms/${alarmId}/test-forward`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination_url: destinationUrl })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Alarm notification dispatched to ${data.destinations_forwarded || 1} destination(s)`, 'success');
        return data;
      } else {
        throw new Error(data.detail || 'Test forward failed');
      }
    } catch (err) {
      showToast(`Forward test error: ${err.message}`, 'error');
    }
  };

  const updateAlarm = async (alarmId, alarmData) => {
    try {
      const res = await fetch(`/api/v1/dm/alarms/${alarmId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alarmData)
      });
      if (res.ok) {
        const data = await res.json();
        const updated = data.alarm || { id: alarmId, ...alarmData };
        setAlarms(prev => prev.map(a => a.id === alarmId ? updated : a));
        logActivity("Alarm", alarmId, "Edit Alarm", "Success", `Updated alarm '${updated.alarm_name}'`);
        showToast(`Alarm '${updated.alarm_name}' saved successfully`, 'success');
        // Instantly refresh state from backend
        try {
          const stateRes = await fetch('/api/v1/dm/state');
          if (stateRes.ok) {
            const s = await stateRes.json();
            if (s.alarms) setAlarms(s.alarms);
            if (s.alarm_rules) setAlarmRules(s.alarm_rules);
          }
        } catch (e) {}
        return updated;
      } else {
        const errData = await res.json().catch(() => ({}));
        const errDetail = errData.detail || res.statusText || 'Failed to save alarm';
        showToast(`Failed to save alarm: ${errDetail}`, 'error');
        throw new Error(errDetail);
      }
    } catch (err) {
      showToast(`Update alarm error: ${err.message}`, 'error');
      throw err;
    }
  };

  const createAlarmRule = async (ruleData) => {
    try {
      const res = await fetch('/api/v1/dm/alarm-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleData)
      });
      const newRule = res.ok ? await res.json() : {
        id: `rule-${Date.now().toString(36)}`,
        ...ruleData
      };
      setAlarmRules(prev => [...prev, newRule]);
      logActivity("Alarm Rule", newRule.id, "Add", "Success", `Created alarm rule '${newRule.name}'`);
      showToast(`Alarm Rule '${newRule.name}' configured`, 'success');
      return newRule;
    } catch (err) {
      showToast(`Rule creation error: ${err.message}`, 'error');
    }
  };

  const updateAlarmRule = async (ruleId, ruleData) => {
    try {
      const res = await fetch(`/api/v1/dm/alarm-rules/${ruleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleData)
      });
      if (res.ok) {
        const updated = await res.json();
        setAlarmRules(prev => prev.map(r => r.id === ruleId ? updated : r));
        logActivity("Alarm Rule", ruleId, "Edit", "Success", `Updated alarm rule '${updated.name}'`);
        showToast(`Alarm Rule '${updated.name}' saved successfully`, 'success');
        // Trigger live re-fetch of alarms & rules
        try {
          const stateRes = await fetch('/api/v1/dm/state');
          if (stateRes.ok) {
            const s = await stateRes.json();
            if (s.alarms) setAlarms(s.alarms);
            if (s.alarm_rules) setAlarmRules(s.alarm_rules);
          }
        } catch (e) {}
        return updated;
      } else {
        const errData = await res.json().catch(() => ({}));
        const errDetail = errData.detail || res.statusText || 'Failed to update rule';
        showToast(`Failed to update rule: ${errDetail}`, 'error');
        throw new Error(errDetail);
      }
    } catch (err) {
      showToast(`Update rule error: ${err.message}`, 'error');
      throw err;
    }
  };

  const deleteAlarmRule = async (ruleId) => {
    try {
      await fetch(`/api/v1/dm/alarm-rules/${ruleId}`, { method: 'DELETE' });
      setAlarmRules(prev => prev.filter(r => r.id !== ruleId));
      logActivity("Alarm Rule", ruleId, "Delete", "Success", `Deleted alarm rule`);
      showToast(`Alarm rule deleted`, 'info');
    } catch (err) {
      showToast(`Delete rule error: ${err.message}`, 'error');
    }
  };

  const createAlarmAction = async (actionData) => {
    try {
      const res = await fetch('/api/v1/dm/alarm-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actionData)
      });
      const newAct = res.ok ? await res.json() : { id: `act-${Date.now().toString(36)}`, ...actionData };
      setAlarmActions(prev => [...prev, newAct]);
      logActivity("Action", newAct.id, "Add", "Success", `Created notification action '${newAct.name}'`);
      showToast(`Notification action '${newAct.name}' created`, 'success');
      return newAct;
    } catch (err) {
      const fallback = { id: `act-${Date.now().toString(36)}`, ...actionData };
      setAlarmActions(prev => [...prev, fallback]);
      showToast(`Notification action created`, 'success');
      return fallback;
    }
  };

  const updateAlarmAction = async (actionId, actionData) => {
    try {
      const res = await fetch(`/api/v1/dm/alarm-actions/${actionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actionData)
      });
      const updated = res.ok ? await res.json() : { id: actionId, ...actionData };
      setAlarmActions(prev => prev.map(a => a.id === actionId ? updated : a));
      logActivity("Action", actionId, "Edit", "Success", `Updated notification action '${updated.name}'`);
      showToast(`Notification action '${updated.name}' updated`, 'success');
      return updated;
    } catch (err) {
      showToast(`Update action error: ${err.message}`, 'error');
    }
  };

  const deleteAlarmAction = async (actionId) => {
    try {
      await fetch(`/api/v1/dm/alarm-actions/${actionId}`, { method: 'DELETE' });
      setAlarmActions(prev => prev.filter(a => a.id !== actionId));
      logActivity("Action", actionId, "Delete", "Success", `Deleted action`);
      showToast(`Notification action deleted`, 'info');
    } catch (err) {
      setAlarmActions(prev => prev.filter(a => a.id !== actionId));
      showToast(`Notification action deleted`, 'info');
    }
  };

  // ----------------------------------------------------
  // UOM & BROKER & INTEGRATIONS & EVENT FORWARDING
  // ----------------------------------------------------
  const addUom = (uomData) => {
    const item = { id: `uom-${Date.now().toString(36)}`, ...uomData };
    setUomList(prev => [...prev, item]);
    logActivity("UoM", item.id, "Add", "Success", `Created UoM ${item.name} (${item.abbreviation})`);
    showToast(`UoM '${item.name}' added`, 'success');
  };

  const deleteUom = (uomId) => {
    setUomList(prev => prev.filter(u => u.id !== uomId));
    logActivity("UoM", uomId, "Delete", "Success", `Deleted UoM`);
    showToast(`UoM deleted`, 'info');
  };

  const toggleEventForwarding = async (efId) => {
    try {
      const res = await fetch(`/api/v1/dm/event-forwardings/${efId}/toggle`, {
        method: 'PUT'
      });
      if (res.ok) {
        const updated = await res.json();
        setEventForwardings(prev => prev.map(ef => ef.id === efId ? updated : ef));
        const nextActive = updated.active;
        logActivity("Event", efId, nextActive ? "RUN" : "STOP", "Success", `Toggled Event Forwarding '${updated.name}'`);
        showToast(`Event Forwarding '${updated.name}' status: ${nextActive ? 'RUNNING' : 'STOPPED'}`, 'info');
        return updated;
      }
    } catch (err) {
      console.error("Failed to toggle event forwarding via API:", err);
    }
    // Fallback local update
    setEventForwardings(prev => prev.map(ef => {
      if (ef.id === efId) {
        const nextActive = !ef.active;
        logActivity("Event", efId, nextActive ? "RUN" : "STOP", "Success", `Toggled Event Forwarding '${ef.name}'`);
        showToast(`Event Forwarding '${ef.name}' status: ${nextActive ? 'RUNNING' : 'STOPPED'}`, 'info');
        return { ...ef, active: nextActive };
      }
      return ef;
    }));
  };

  const createEventForwarding = async (efData) => {
    try {
      const res = await fetch('/api/v1/dm/event-forwardings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(efData)
      });
      if (res.ok) {
        const newEf = await res.json();
        setEventForwardings(prev => [...prev.filter(e => e.id !== newEf.id), newEf]);
        logActivity("Event", newEf.id, "Add", "Success", `Configured Event Forwarding '${newEf.name}'`);
        showToast(`Event Forwarding '${newEf.name}' configured and saved`, 'success');
        return newEf;
      }
    } catch (err) {
      console.error("Failed to create event forwarding via API:", err);
    }
    const item = { id: `ef-${Date.now().toString(36)}`, ...efData };
    setEventForwardings(prev => [...prev, item]);
    logActivity("Event", item.id, "Add", "Success", `Configured Event Forwarding '${item.name}'`);
    showToast(`Event Forwarding configured locally`, 'info');
    return item;
  };

  const updateEventForwarding = async (efId, efData) => {
    try {
      const res = await fetch(`/api/v1/dm/event-forwardings/${efId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(efData)
      });
      if (res.ok) {
        const updated = await res.json();
        setEventForwardings(prev => prev.map(e => e.id === efId ? updated : e));
        logActivity("Event", efId, "Update", "Success", `Updated Event Forwarding '${updated.name}'`);
        showToast(`Event Forwarding '${updated.name}' updated and saved`, 'success');
        return updated;
      }
    } catch (err) {
      console.error("Failed to update event forwarding via API:", err);
    }
    setEventForwardings(prev => prev.map(e => e.id === efId ? { ...e, ...efData } : e));
    logActivity("Event", efId, "Update", "Success", `Updated Event Forwarding`);
    showToast(`Event Forwarding updated locally`, 'info');
  };

  const deleteEventForwarding = async (efId) => {
    try {
      const res = await fetch(`/api/v1/dm/event-forwardings/${efId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setEventForwardings(prev => prev.filter(e => e.id !== efId));
        logActivity("Event", efId, "Delete", "Success", `Deleted Event Forwarding`);
        showToast(`Event forwarding removed`, 'info');
        return;
      }
    } catch (err) {
      console.error("Failed to delete event forwarding via API:", err);
    }
    setEventForwardings(prev => prev.filter(e => e.id !== efId));
    logActivity("Event", efId, "Delete", "Success", `Deleted Event Forwarding`);
    showToast(`Event forwarding removed`, 'info');
  };

  const createBroker = async (bData) => {
    try {
      const res = await fetch('/api/v1/dm/brokers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bData)
      });
      const newBroker = res.ok ? await res.json() : { id: `brk-${Date.now().toString(36)}`, status: "ONLINE", ...bData };
      setBrokers(prev => [...prev, newBroker]);
      logActivity("Broker", newBroker.id, "Add", "Success", `Deployed data broker '${newBroker.name}'`);
      showToast(`Broker '${newBroker.name}' deployed`, 'success');
      return newBroker;
    } catch (err) {
      const fallback = { id: `brk-${Date.now().toString(36)}`, status: "ONLINE", ...bData };
      setBrokers(prev => [...prev, fallback]);
      showToast(`Broker deployed locally`, 'info');
      return fallback;
    }
  };

  const deleteBroker = async (bId) => {
    try {
      await fetch(`/api/v1/dm/brokers/${bId}`, { method: 'DELETE' });
      setBrokers(prev => prev.filter(b => b.id !== bId));
      logActivity("Broker", bId, "Delete", "Success", `Deleted broker`);
      showToast(`Broker removed`, 'info');
    } catch (err) {
      setBrokers(prev => prev.filter(b => b.id !== bId));
      showToast(`Broker removed locally`, 'info');
    }
  };

  const createIntegration = (iData) => {
    const item = { id: `int-${Date.now().toString(36)}`, status: "CONNECTED", ...iData };
    setIntegrations(prev => [...prev, item]);
    logActivity("Integration", item.id, "Add", "Success", `Configured external integration '${item.name}'`);
    showToast(`Integration '${item.name}' configured`, 'success');
  };

  const deleteIntegration = (iId) => {
    setIntegrations(prev => prev.filter(i => i.id !== iId));
    logActivity("Integration", iId, "Delete", "Success", `Deleted integration`);
    showToast(`Integration removed`, 'info');
  };

  // ----------------------------------------------------
  // SECURITY & USERS
  // ----------------------------------------------------
  const createUser = (userData) => {
    const item = { id: `usr-${Date.now().toString(36)}`, ...userData };
    setUsers(prev => [...prev, item]);
    logActivity("User", item.id, "Add", "Success", `Added user account ${item.upn}`);
    showToast(`User '${item.upn}' added`, 'success');
  };

  const deleteUser = (userId) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    logActivity("User", userId, "Delete", "Success", `Removed user`);
    showToast(`User removed`, 'info');
  };

  const createApiClient = async (clientData) => {
    try {
      const res = await fetch('/api/v1/dm/api-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData)
      });
      const newClient = res.ok ? await res.json() : {
        id: `apic-${Date.now().toString(36)}`,
        client_id: `ahi-client-${Math.random().toString(36).substring(2, 10)}`,
        client_secret: `sec_${Math.random().toString(36).substring(2)}`,
        ...clientData,
        created_at: new Date().toISOString()
      };
      setApiClients(prev => [...prev, newClient]);
      logActivity("API Client", newClient.id, "Add", "Success", `Registered API Client '${newClient.name}'`);
      showToast(`API Client '${newClient.name}' generated`, 'success');
      return newClient;
    } catch (err) {
      showToast(`Create API client error: ${err.message}`, 'error');
    }
  };

  const deleteApiClient = (clientId) => {
    setApiClients(prev => prev.filter(c => c.id !== clientId));
    logActivity("API Client", clientId, "Delete", "Success", `Deleted API Client`);
    showToast(`API Client deleted`, 'info');
  };

  const createObjectSecurityRule = (ruleData) => {
    const item = { id: `sec-obj-${Date.now().toString(36)}`, ...ruleData };
    setObjectSecurityRules(prev => [...prev, item]);
    logActivity("Security", item.id, "Add Object Security", "Success", `Configured object-based security`);
    showToast(`Object-based security rule applied`, 'success');
  };

  const deleteObjectSecurityRule = (ruleId) => {
    setObjectSecurityRules(prev => prev.filter(r => r.id !== ruleId));
    logActivity("Security", ruleId, "Delete Object Security", "Success", `Removed object security rule`);
    showToast(`Security rule removed`, 'info');
  };

  const createFunctionBlock = async (payload) => {
    try {
      const res = await fetch('/api/v1/dm/function-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const newBlock = await res.json();
        setFunctionBlocks(prev => [...prev, newBlock]);
        showToast(`Created Function Block: ${newBlock.name}`, 'success');
        return newBlock;
      }
    } catch (err) {
      showToast('Error creating function block', 'error');
    }
  };

  const updateFunctionBlock = async (fbId, payload) => {
    try {
      const res = await fetch(`/api/v1/dm/function-blocks/${fbId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const updated = await res.json();
        setFunctionBlocks(prev => prev.map(b => b.id === fbId ? updated : b));
        showToast(`Updated Function Block: ${updated.name}`, 'success');
        return updated;
      }
    } catch (err) {
      showToast('Error updating function block', 'error');
    }
  };

  const deleteFunctionBlock = async (fbId) => {
    try {
      const res = await fetch(`/api/v1/dm/function-blocks/${fbId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setFunctionBlocks(prev => prev.filter(b => b.id !== fbId));
        showToast('Function block deleted', 'success');
        return true;
      }
    } catch (err) {
      showToast('Error deleting function block', 'error');
    }
  };

  const executeFunctionBlock = async (fbId, customInputs = null) => {
    try {
      const res = await fetch(`/api/v1/dm/function-blocks/${fbId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: customInputs ? JSON.stringify(customInputs) : null
      });
      if (res.ok) {
        const data = await res.json();
        if (data.block) {
          setFunctionBlocks(prev => prev.map(b => b.id === fbId ? data.block : b));
        }
        showToast(`Executed ${fbId}: ${data.duration_ms}ms`, data.success ? 'success' : 'error');
        return data;
      }
    } catch (err) {
      showToast('Failed to execute function block', 'error');
    }
  };

  const testRunFunctionBlock = async (formulaCode, inputs) => {
    try {
      const res = await fetch('/api/v1/dm/function-blocks/test-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formula_code: formulaCode, inputs })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const createScadaWindow = async (payload) => {
    try {
      const res = await fetch('/api/v1/dm/scada/windows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const newWin = await res.json();
        setScadaWindows(prev => [...prev, newWin]);
        showToast(`Created SCADA Window: ${newWin.title}`, 'success');
        return newWin;
      }
    } catch (err) {
      showToast('Error creating SCADA window', 'error');
    }
  };

  const updateScadaWindow = async (winId, payload) => {
    try {
      const res = await fetch(`/api/v1/dm/scada/windows/${winId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const updated = await res.json();
        setScadaWindows(prev => prev.map(w => w.id === winId ? updated : w));
        showToast(`Saved Window '${updated.title}' layout`, 'success');
        return updated;
      }
    } catch (err) {
      showToast('Error updating SCADA window', 'error');
    }
  };

  const deleteScadaWindow = async (winId) => {
    try {
      const res = await fetch(`/api/v1/dm/scada/windows/${winId}`, { method: 'DELETE' });
      if (res.ok) {
        setScadaWindows(prev => prev.filter(w => w.id !== winId));
        showToast('SCADA window deleted', 'info');
        return true;
      }
    } catch (err) {
      showToast('Error deleting SCADA window', 'error');
    }
  };

  const addScadaElement = async (winId, elementData) => {
    try {
      const res = await fetch(`/api/v1/dm/scada/windows/${winId}/elements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(elementData)
      });
      if (res.ok) {
        const newElem = await res.json();
        setScadaWindows(prev => prev.map(w => {
          if (w.id === winId) {
            return { ...w, elements: [...(w.elements || []), newElem] };
          }
          return w;
        }));
        showToast(`Added ${newElem.label} to window`, 'success');
        return newElem;
      }
    } catch (err) {
      showToast('Error adding SCADA element', 'error');
    }
  };

  const updateScadaElement = async (winId, elemId, elementData) => {
    try {
      const res = await fetch(`/api/v1/dm/scada/windows/${winId}/elements/${elemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(elementData)
      });
      if (res.ok) {
        const updated = await res.json();
        setScadaWindows(prev => prev.map(w => {
          if (w.id === winId) {
            return { ...w, elements: (w.elements || []).map(el => el.id === elemId ? updated : el) };
          }
          return w;
        }));
        if (elementData.mapped_tag && elementData.bound_property) {
          showToast(`Mapped ${updated.label || 'element'} to ${updated.mapped_tag}`, 'success');
        }
        return updated;
      }
    } catch (err) {
      console.warn('Error updating SCADA element:', err);
    }
  };

  const deleteScadaElement = async (winId, elemId) => {
    try {
      const res = await fetch(`/api/v1/dm/scada/windows/${winId}/elements/${elemId}`, { method: 'DELETE' });
      if (res.ok) {
        setScadaWindows(prev => prev.map(w => {
          if (w.id === winId) {
            return { ...w, elements: (w.elements || []).filter(el => el.id !== elemId) };
          }
          return w;
        }));
        showToast('Element removed from window', 'info');
        return true;
      }
    } catch (err) {
      showToast('Error removing element', 'error');
    }
  };

  const fetchMappableDmTags = async () => {
    try {
      const res = await fetch('/api/v1/dm/scada/tags');
      if (res.ok) {
        const data = await res.json();
        setMappableDmTags(data);
        return data;
      }
    } catch (err) {
      console.warn('Failed to fetch mappable DM tags:', err);
    }
    return [];
  };

  return (
    <DMContext.Provider value={{
      lang,
      changeLanguage,
      t,
      activeEntity,
      setActiveEntity,
      selectedAssetId,
      setSelectedAssetId,
      selectedAsset,
      sidebarCollapsed,
      setSidebarCollapsed,
      loading,
      project,
      setProject,
      availableProjects,
      userProfile,
      setUserProfile,
      setAsDefaultPage,
      toasts,
      showToast,
      isManualOpen,
      setIsManualOpen,
      isSitemapOpen,
      setIsSitemapOpen,
      isTermsOpen,
      setIsTermsOpen,
      isProfileOpen,
      setIsProfileOpen,
      isProjectModalOpen,
      setIsProjectModalOpen,
      isAppPortalOpen,
      setIsAppPortalOpen,
      activeNotificationsOpen,
      setActiveNotificationsOpen,
      assets,
      assetTemplates,
      devices,
      deviceTemplates,
      brokers,
      integrations,
      uomList,
      eventForwardings,
      alarms,
      alarmHistories,
      alarmRules,
      alarmActions,
      users,
      userGroups,
      userOverrides,
      apiClients,
      objectSecurityRules,
      functionBlocks,
      functionBlockTemplates,
      scadaWindows,
      mappableDmTags,
      activityLogs,

      // Actions
      refreshState,
      logActivity,
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
      updateAssetTemplate,
      deleteAssetTemplate,
      deployAssetTemplate,
      createDeviceTemplate,
      updateDeviceTemplate,
      deleteDeviceTemplate,
      createDevice,
      updateDevice,
      deleteDevice,
      generateSasToken,
      sendDeviceBinding,
      ingestBrokerPayload,
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
      addUom,
      deleteUom,
      toggleEventForwarding,
      createEventForwarding,
      updateEventForwarding,
      deleteEventForwarding,
      createBroker,
      deleteBroker,
      createIntegration,
      deleteIntegration,
      createUser,
      deleteUser,
      createApiClient,
      deleteApiClient,
      createObjectSecurityRule,
      deleteObjectSecurityRule,
      createFunctionBlock,
      updateFunctionBlock,
      deleteFunctionBlock,
      executeFunctionBlock,
      testRunFunctionBlock,
      createScadaWindow,
      updateScadaWindow,
      deleteScadaWindow,
      addScadaElement,
      updateScadaElement,
      deleteScadaElement,
      fetchMappableDmTags
    }}>
      {children}
    </DMContext.Provider>
  );
}
