const API_BASE = '/api/v1';

export async function fetchDashboards() {
  const res = await fetch(`${API_BASE}/dashboards`);
  if (!res.ok) throw new Error('Failed to fetch dashboards');
  return res.json();
}

export async function fetchDashboard(slug) {
  const res = await fetch(`${API_BASE}/dashboards/${slug}`);
  if (!res.ok) throw new Error(`Failed to fetch dashboard ${slug}`);
  return res.json();
}

export async function updateDashboard(slug, data) {
  const res = await fetch(`${API_BASE}/dashboards/${slug}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update dashboard');
  return res.json();
}

export async function createDashboard(data) {
  const res = await fetch(`${API_BASE}/dashboards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create dashboard');
  return res.json();
}

export async function deleteDashboard(slug) {
  const res = await fetch(`${API_BASE}/dashboards/${slug}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete dashboard ${slug}`);
  return res.json();
}

export async function fetchAssetTree() {
  const res = await fetch(`${API_BASE}/tags/tree`);
  if (!res.ok) throw new Error('Failed to fetch asset tree');
  return res.json();
}

export async function fetchTagsList() {
  const res = await fetch(`${API_BASE}/tags/list`);
  if (!res.ok) throw new Error('Failed to fetch tags list');
  return res.json();
}

export async function queryTimeSeries(tags, timeFrom = 'now-15m', timeTo = 'now') {
  const params = new URLSearchParams({
    tags: Array.isArray(tags) ? tags.join(',') : tags,
    time_from: timeFrom,
    time_to: timeTo
  });
  const res = await fetch(`${API_BASE}/query/timeseries?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to query time series');
  return res.json();
}

export async function fetchAlarms() {
  const res = await fetch(`${API_BASE}/alarms`);
  if (!res.ok) throw new Error('Failed to fetch alarms');
  return res.json();
}

export async function ackAlarm(id) {
  const res = await fetch(`${API_BASE}/alarms/${id}/ack`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to acknowledge alarm');
  return res.json();
}

export async function fetchAhiHealth() {
  const res = await fetch(`${API_BASE}/ahi/health`);
  if (!res.ok) throw new Error('Failed to fetch AHI asset health');
  return res.json();
}

export async function fetchDbmOntology() {
  const res = await fetch(`${API_BASE}/ahi/dbm/ontology`);
  if (!res.ok) throw new Error('Failed to fetch DBM ontology status');
  return res.json();
}

// ==========================================
// Yokogawa Data Management (DM) Client APIs
// ==========================================

export async function fetchDmOverview() {
  const res = await fetch(`${API_BASE}/dm/overview`);
  if (!res.ok) throw new Error('Failed to fetch DM overview');
  return res.json();
}

export async function fetchFbTemplates() {
  const res = await fetch(`${API_BASE}/dm/function-blocks/templates`);
  if (!res.ok) throw new Error('Failed to fetch FB templates');
  return res.json();
}

export async function createFbTemplate(data) {
  const res = await fetch(`${API_BASE}/dm/function-blocks/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create FB template');
  return res.json();
}

export async function fetchFbExecutions() {
  const res = await fetch(`${API_BASE}/dm/function-blocks/executions`);
  if (!res.ok) throw new Error('Failed to fetch FB executions');
  return res.json();
}

export async function createFbExecution(data) {
  const res = await fetch(`${API_BASE}/dm/function-blocks/executions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create FB execution');
  return res.json();
}

export async function runFbExecution(execId) {
  const res = await fetch(`${API_BASE}/dm/function-blocks/executions/${execId}/run`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to run FB execution');
  return res.json();
}

export async function fetchDevices() {
  const res = await fetch(`${API_BASE}/dm/devices`);
  if (!res.ok) throw new Error('Failed to fetch devices');
  return res.json();
}

export async function createDevice(data) {
  const res = await fetch(`${API_BASE}/dm/devices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create device');
  return res.json();
}

export async function fetchBrokers() {
  const res = await fetch(`${API_BASE}/dm/brokers`);
  if (!res.ok) throw new Error('Failed to fetch brokers');
  return res.json();
}

export async function testBroker(brokerId) {
  const res = await fetch(`${API_BASE}/dm/brokers/${brokerId}/test`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to test broker');
  return res.json();
}

export async function fetchActivities(category = null) {
  const url = category && category !== 'ALL' 
    ? `${API_BASE}/dm/activities?category=${category}` 
    : `${API_BASE}/dm/activities`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch activity logs');
  return res.json();
}

// Asset Management Extended
export async function fetchAssetHealth() {
  const res = await fetch(`${API_BASE}/dm/assets/health`);
  if (!res.ok) throw new Error('Failed to fetch asset health');
  return res.json();
}

export async function createAssetNode(data) {
  const res = await fetch(`${API_BASE}/dm/assets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create asset');
  return res.json();
}

export async function updateAssetNode(assetId, data) {
  const res = await fetch(`${API_BASE}/dm/assets/${assetId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update asset');
  return res.json();
}

export async function deleteAssetNode(assetId) {
  const res = await fetch(`${API_BASE}/dm/assets/${assetId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete asset');
  return res.json();
}

export async function createTag(data) {
  const res = await fetch(`${API_BASE}/dm/tags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create tag');
  return res.json();
}

export async function deleteTag(tagName) {
  const res = await fetch(`${API_BASE}/dm/tags/${encodeURIComponent(tagName)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete tag');
  return res.json();
}

// Function Block V2 Extended
export async function updateFbTemplate(tmplId, data) {
  const res = await fetch(`${API_BASE}/dm/function-blocks/templates/${tmplId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update FB template');
  return res.json();
}

export async function deleteFbTemplate(tmplId) {
  const res = await fetch(`${API_BASE}/dm/function-blocks/templates/${tmplId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete FB template');
  return res.json();
}

export async function updateFbExecution(execId, data) {
  const res = await fetch(`${API_BASE}/dm/function-blocks/executions/${execId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update FB execution');
  return res.json();
}

export async function deleteFbExecution(execId) {
  const res = await fetch(`${API_BASE}/dm/function-blocks/executions/${execId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete FB execution');
  return res.json();
}

export async function toggleFbExecutionStatus(execId) {
  const res = await fetch(`${API_BASE}/dm/function-blocks/executions/${execId}/toggle-status`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to toggle FB execution status');
  return res.json();
}

// Device Extended
export async function updateDevice(deviceId, data) {
  const res = await fetch(`${API_BASE}/dm/devices/${deviceId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update device');
  return res.json();
}

export async function deleteDevice(deviceId) {
  const res = await fetch(`${API_BASE}/dm/devices/${deviceId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete device');
  return res.json();
}

export async function pingDevice(deviceId) {
  const res = await fetch(`${API_BASE}/dm/devices/${deviceId}/ping`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to ping device');
  return res.json();
}

export async function fetchDeviceDiagnostics(deviceId) {
  const res = await fetch(`${API_BASE}/dm/devices/${deviceId}/diagnostics`);
  if (!res.ok) throw new Error('Failed to fetch device diagnostics');
  return res.json();
}

// Broker Extended
export async function createBroker(data) {
  const res = await fetch(`${API_BASE}/dm/brokers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create broker');
  return res.json();
}

export async function updateBroker(brokerId, data) {
  const res = await fetch(`${API_BASE}/dm/brokers/${brokerId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update broker');
  return res.json();
}

export async function deleteBroker(brokerId) {
  const res = await fetch(`${API_BASE}/dm/brokers/${brokerId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete broker');
  return res.json();
}

// Alarm Management Extended
export async function fetchAlarmRules() {
  const res = await fetch(`${API_BASE}/dm/alarms/rules`);
  if (!res.ok) throw new Error('Failed to fetch alarm rules');
  return res.json();
}

export async function createAlarmRule(data) {
  const res = await fetch(`${API_BASE}/dm/alarms/rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create alarm rule');
  return res.json();
}

export async function deleteAlarmRule(ruleId) {
  const res = await fetch(`${API_BASE}/dm/alarms/rules/${ruleId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete alarm rule');
  return res.json();
}

export async function fetchAlarmEvents() {
  const res = await fetch(`${API_BASE}/dm/alarms/events`);
  if (!res.ok) throw new Error('Failed to fetch alarm events');
  return res.json();
}

export async function ackAlarmEvent(eventId) {
  const res = await fetch(`${API_BASE}/dm/alarms/events/${eventId}/ack`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to ack alarm');
  return res.json();
}

export async function shelveAlarmEvent(eventId) {
  const res = await fetch(`${API_BASE}/dm/alarms/events/${eventId}/shelve`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to shelve alarm');
  return res.json();
}

export async function clearAlarmEvent(eventId) {
  const res = await fetch(`${API_BASE}/dm/alarms/events/${eventId}/clear`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to clear alarm');
  return res.json();
}

// Classic Function Blocks
export async function fetchClassicFBs() {
  const res = await fetch(`${API_BASE}/dm/function-blocks/classic`);
  if (!res.ok) throw new Error('Failed to fetch classic FBs');
  return res.json();
}

export async function createClassicFB(data) {
  const res = await fetch(`${API_BASE}/dm/function-blocks/classic`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create classic FB');
  return res.json();
}

export async function tuneClassicFB(blockId, data) {
  const res = await fetch(`${API_BASE}/dm/function-blocks/classic/${blockId}/tune`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to tune classic FB');
  return res.json();
}

// Configuration
export async function fetchSystemConfig() {
  const res = await fetch(`${API_BASE}/dm/config`);
  if (!res.ok) throw new Error('Failed to fetch config');
  return res.json();
}

export async function updateSystemConfig(data) {
  const res = await fetch(`${API_BASE}/dm/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update config');
  return res.json();
}

// Security
export async function fetchSecurityUsers() {
  const res = await fetch(`${API_BASE}/dm/security/users`);
  if (!res.ok) throw new Error('Failed to fetch security users');
  return res.json();
}

export async function createSecurityUser(data) {
  const res = await fetch(`${API_BASE}/dm/security/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create user');
  return res.json();
}

export async function deleteSecurityUser(userId) {
  const res = await fetch(`${API_BASE}/dm/security/users/${userId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete user');
  return res.json();
}

export async function fetchSecurityApiKeys() {
  const res = await fetch(`${API_BASE}/dm/security/api-keys`);
  if (!res.ok) throw new Error('Failed to fetch API keys');
  return res.json();
}

export async function createSecurityApiKey(data) {
  const res = await fetch(`${API_BASE}/dm/security/api-keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create API key');
  return res.json();
}

export async function revokeSecurityApiKey(keyId) {
  const res = await fetch(`${API_BASE}/dm/security/api-keys/${keyId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to revoke API key');
  return res.json();
}

// ============================================================================
// DI SCADA/HMI Studio Client APIs
// ============================================================================
const SCADA_BASE = '/api/v2/di/scada';

export async function fetchScadaScreens() {
  const res = await fetch(`${SCADA_BASE}/screens`);
  if (!res.ok) throw new Error('Failed to fetch SCADA screens');
  return res.json();
}

export async function fetchScadaScreen(screenId) {
  const res = await fetch(`${SCADA_BASE}/screens/${screenId}`);
  if (!res.ok) throw new Error(`Failed to fetch SCADA screen ${screenId}`);
  return res.json();
}

export async function createScadaScreen(data) {
  const res = await fetch(`${SCADA_BASE}/screens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create SCADA screen');
  return res.json();
}

export async function updateScadaScreen(screenId, data) {
  const res = await fetch(`${SCADA_BASE}/screens/${screenId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update SCADA screen');
  return res.json();
}

export async function deleteScadaScreen(screenId) {
  const res = await fetch(`${SCADA_BASE}/screens/${screenId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete SCADA screen ${screenId}`);
  return res.json();
}

export async function validateScadaScreen(screenId) {
  const res = await fetch(`${SCADA_BASE}/screens/${screenId}/validate`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to validate screen');
  return res.json();
}

export async function publishScadaScreen(screenId, payload = {}) {
  const res = await fetch(`${SCADA_BASE}/screens/${screenId}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to publish SCADA screen');
  return res.json();
}

export async function fetchScadaVersions(screenId) {
  const res = await fetch(`${SCADA_BASE}/screens/${screenId}/versions`);
  if (!res.ok) throw new Error('Failed to fetch screen versions');
  return res.json();
}

export async function rollbackScadaScreen(screenId, version) {
  const res = await fetch(`${SCADA_BASE}/screens/${screenId}/rollback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version })
  });
  if (!res.ok) throw new Error('Failed to rollback SCADA screen');
  return res.json();
}

export async function fetchScadaRuntimeScreen(screenId) {
  const res = await fetch(`${SCADA_BASE}/screens/${screenId}/runtime`);
  if (!res.ok) throw new Error('Failed to fetch runtime screen');
  return res.json();
}

export async function fetchScadaSymbols(category = null) {
  const url = category && category !== 'ALL' ? `${SCADA_BASE}/symbols?category=${encodeURIComponent(category)}` : `${SCADA_BASE}/symbols`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch symbols');
  return res.json();
}

export async function registerScadaSymbol(data) {
  const res = await fetch(`${SCADA_BASE}/symbols`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to register symbol');
  }
  return res.json();
}

export async function updateScadaSymbol(symbolId, data) {
  const res = await fetch(`${SCADA_BASE}/symbols/${symbolId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update symbol');
  return res.json();
}

export async function sanitizeSvgPreview(svgContent) {
  const res = await fetch(`${SCADA_BASE}/symbols/sanitize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ svg_content: svgContent })
  });
  if (!res.ok) throw new Error('Failed to sanitize SVG');
  return res.json();
}

export async function fetchScadaValuesSnapshot(tags) {
  const res = await fetch(`${SCADA_BASE}/values/snapshot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tags })
  });
  if (!res.ok) throw new Error('Failed to fetch values snapshot');
  return res.json();
}

export async function fetchScadaTemplates(category = null) {
  const url = category && category !== 'ALL' ? `${SCADA_BASE}/templates?category=${encodeURIComponent(category)}` : `${SCADA_BASE}/templates`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch SCADA templates');
  return res.json();
}

export async function fetchScadaTemplate(templateId) {
  const res = await fetch(`${SCADA_BASE}/templates/${templateId}`);
  if (!res.ok) throw new Error(`Failed to fetch SCADA template ${templateId}`);
  return res.json();
}

export async function instantiateScadaTemplate(templateId, payload) {
  const res = await fetch(`${SCADA_BASE}/templates/${templateId}/instantiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to instantiate SCADA template');
  }
  return res.json();
}

export async function createCompositeSymbol(payload) {
  const res = await fetch(`${SCADA_BASE}/symbols/composite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to create composite symbol');
  }
  return res.json();
}

export async function exportSymbolPack(category = null) {
  const url = category && category !== 'ALL' ? `${SCADA_BASE}/symbols/pack/export?category=${encodeURIComponent(category)}` : `${SCADA_BASE}/symbols/pack/export`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to export symbol pack');
  return res.json();
}

export async function importSymbolPack(payload) {
  const res = await fetch(`${SCADA_BASE}/symbols/pack/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to import symbol pack');
  }
  return res.json();
}

export async function importThingsBoardDashboard(dashboardPayload) {
  const res = await fetch(`${SCADA_BASE}/import/thingsboard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dashboardPayload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to import ThingsBoard dashboard');
  }
  return res.json();
}

export async function exportThingsBoardDashboard(screenId) {
  const res = await fetch(`${SCADA_BASE}/export/thingsboard/${screenId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to export ThingsBoard dashboard');
  }
  return res.json();
}

export async function fetchScadaAssetAttributes(assetId) {
  const res = await fetch(`${SCADA_BASE}/assets/${assetId}/attributes`);
  if (!res.ok) throw new Error(`Failed to fetch attributes for asset ${assetId}`);
  return res.json();
}

export async function fetchScadaAssets() {
  const res = await fetch(`${SCADA_BASE}/assets`);
  if (!res.ok) throw new Error('Failed to fetch SCADA assets');
  return res.json();
}

// ============================================================================
// FUNCTION BLOCK V2 (TEMPLATE-FIRST ARCHITECTURE)
// ============================================================================
const FB_V2_BASE = '/api/v2/fb';

export async function fetchFBTemplates(status = null, category = null) {
  let url = `${FB_V2_BASE}/templates`;
  const params = [];
  if (status) params.push(`status=${encodeURIComponent(status)}`);
  if (category && category !== 'ALL') params.push(`category=${encodeURIComponent(category)}`);
  if (params.length) url += `?${params.join('&')}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch Function Block templates');
  return res.json();
}

export async function fetchFBTemplate(templateId) {
  const res = await fetch(`${FB_V2_BASE}/templates/${templateId}`);
  if (!res.ok) throw new Error(`Failed to fetch Function Block template ${templateId}`);
  return res.json();
}

export async function createFBTemplate(payload) {
  const res = await fetch(`${FB_V2_BASE}/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to create Function Block template');
  }
  return res.json();
}

export async function updateFBTemplate(templateId, payload) {
  const res = await fetch(`${FB_V2_BASE}/templates/${templateId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update Function Block template');
  }
  return res.json();
}

export async function deleteFBTemplate(templateId) {
  const res = await fetch(`${FB_V2_BASE}/templates/${templateId}`, {
    method: 'DELETE'
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to delete template');
  }
  return res.json();
}

export async function cloneFBTemplate(templateId, payload = {}) {
  const res = await fetch(`${FB_V2_BASE}/templates/${templateId}/clone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to clone template');
  }
  return res.json();
}

export async function createNewTemplateVersion(templateId) {
  const res = await fetch(`${FB_V2_BASE}/templates/${templateId}/new-version`, {
    method: 'POST'
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to create new template version');
  }
  return res.json();
}

export async function fetchFBTemplateVersions(templateId) {
  const res = await fetch(`${FB_V2_BASE}/templates/${templateId}/versions`);
  if (!res.ok) throw new Error('Failed to fetch template versions');
  return res.json();
}

export async function validateFBTemplate(templateId) {
  const res = await fetch(`${FB_V2_BASE}/templates/${templateId}/validate`, {
    method: 'POST'
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Template validation failed');
  }
  return res.json();
}

export async function testFBTemplate(templateId, payload) {
  const res = await fetch(`${FB_V2_BASE}/templates/${templateId}/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to run test execution');
  }
  return res.json();
}

export async function publishFBTemplate(templateId, payload = {}) {
  const res = await fetch(`${FB_V2_BASE}/templates/${templateId}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to publish Block Template');
  }
  return res.json();
}

export async function updateFBTemplateMarkups(templateId, markups) {
  const res = await fetch(`${FB_V2_BASE}/templates/${templateId}/markups`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ markups })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update asset markups');
  }
  return res.json();
}

export async function updateFBTemplateInputs(templateId, inputs) {
  const res = await fetch(`${FB_V2_BASE}/templates/${templateId}/inputs`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update inputs');
  }
  return res.json();
}

export async function updateFBTemplateOutputs(templateId, outputs) {
  const res = await fetch(`${FB_V2_BASE}/templates/${templateId}/outputs`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ outputs })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update outputs');
  }
  return res.json();
}

export async function updateFBTemplateCode(templateId, script_code) {
  const res = await fetch(`${FB_V2_BASE}/templates/${templateId}/code`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ script_code })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update code');
  }
  return res.json();
}

export async function updateFBTemplateOutputMappings(templateId, output_mappings) {
  const res = await fetch(`${FB_V2_BASE}/templates/${templateId}/output-mappings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ output_mappings })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update output mappings');
  }
  return res.json();
}

export async function exportFBTemplate(templateId) {
  const res = await fetch(`${FB_V2_BASE}/templates/${templateId}/export`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to export template');
  return res.json();
}

export async function importFBTemplate(payload) {
  const res = await fetch(`${FB_V2_BASE}/templates/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to import template');
  }
  return res.json();
}

// ----------------------------------------------------------------------------
// BLOCK EXECUTIONS
// ----------------------------------------------------------------------------
export async function fetchFBExecutions(status = null, templateId = null) {
  let url = `${FB_V2_BASE}/executions`;
  const params = [];
  if (status) params.push(`status=${encodeURIComponent(status)}`);
  if (templateId) params.push(`template_id=${encodeURIComponent(templateId)}`);
  if (params.length) url += `?${params.join('&')}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch Function Block executions');
  return res.json();
}

export async function fetchFBExecution(executionId) {
  const res = await fetch(`${FB_V2_BASE}/executions/${executionId}`);
  if (!res.ok) throw new Error(`Failed to fetch execution ${executionId}`);
  return res.json();
}

export async function createFBExecution(payload) {
  const res = await fetch(`${FB_V2_BASE}/executions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to create execution instance');
  }
  return res.json();
}

export async function updateFBExecution(executionId, payload) {
  const res = await fetch(`${FB_V2_BASE}/executions/${executionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update execution instance');
  }
  return res.json();
}

export async function deleteFBExecution(executionId) {
  const res = await fetch(`${FB_V2_BASE}/executions/${executionId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete execution');
  return res.json();
}

export async function activateFBExecution(executionId) {
  const res = await fetch(`${FB_V2_BASE}/executions/${executionId}/activate`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to activate execution');
  return res.json();
}

export async function pauseFBExecution(executionId) {
  const res = await fetch(`${FB_V2_BASE}/executions/${executionId}/pause`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to pause execution');
  return res.json();
}

export async function runFBExecution(executionId, payload = {}) {
  const res = await fetch(`${FB_V2_BASE}/executions/${executionId}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to execute block');
  }
  return res.json();
}

export async function fetchFBExecutionHistory(executionId) {
  const res = await fetch(`${FB_V2_BASE}/executions/${executionId}/history`);
  if (!res.ok) throw new Error('Failed to fetch execution history');
  return res.json();
}





