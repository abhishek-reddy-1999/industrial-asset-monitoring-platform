import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AssetTreeSidebar from './components/AssetTreeSidebar';
import DashboardCanvas from './components/DashboardCanvas';
import AddPanelModal from './components/AddPanelModal';
import WidgetEditorModal from './components/WidgetEditorModal';
import NewDashboardModal from './components/NewDashboardModal';
import DashboardSettingsModal from './components/DashboardSettingsModal';
import DMApp from './views/dm/DMApp';
import FuxaScadaWidget from './components/FuxaScadaWidget';
import ScadaStudio from './views/di/scada/ScadaStudio';
import MasterAssetDashboard from './views/di/MasterAssetDashboard';
import ThingsBoardHub from './views/tb/ThingsBoardHub';
import UniversalWidgetStudio from './views/widgets/UniversalWidgetStudio';
import {
  fetchDashboards,
  fetchDashboard,
  updateDashboard,
  createDashboard,
  deleteDashboard,
  fetchAssetTree,
  fetchTagsList
} from './api/client';
import { telemetryWS } from './api/websocket';
import { useDM } from './views/dm/dmContext';

export default function App() {
  const [currentModule, setCurrentModule] = useState('TB'); // 'TB' | 'DI' | 'DM'
  const [diSubView, setDiSubView] = useState('dashboards'); // 'dashboards' | 'assets' | 'scada'
  const [dashboards, setDashboards] = useState([]);
  const [currentDashboard, setCurrentDashboard] = useState(null);
  const [layout, setLayout] = useState([]);
  const [assetTree, setAssetTree] = useState([]);
  const [tagsList, setTagsList] = useState([]);
  const [liveTelemetry, setLiveTelemetry] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);
  const [timeRange, setTimeRange] = useState('now-15m');
  const [isLive, setIsLive] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isNewDashModalOpen, setIsNewDashModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState(null);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved

  const { setActiveEntity } = useDM();

  // 1. Initial Data Fetch
  useEffect(() => {
    const initApp = async () => {
      try {
        const [dashList, tree, tags] = await Promise.all([
          fetchDashboards(),
          fetchAssetTree(),
          fetchTagsList()
        ]);
        setDashboards(dashList);
        setAssetTree(tree);
        setTagsList(tags);

        if (dashList.length > 0) {
          const defaultDash = await fetchDashboard(dashList[0].slug);
          setCurrentDashboard(defaultDash);
          setLayout(defaultDash.layout || []);
          setTimeRange(defaultDash.time_range || 'now-15m');
        }
      } catch (err) {
        console.error('Initialization error:', err);
      }
    };

    initApp();
  }, []);

  // 2. Connect Live WebSocket Telemetry with batching
  useEffect(() => {
    telemetryWS.connect();

    let batch = {};
    let rafId = null;
    let lastFlush = Date.now();

    const flushBatch = () => {
      rafId = null;
      if (Object.keys(batch).length > 0) {
        setLiveTelemetry(prev => ({ ...prev, ...batch }));
        batch = {};
        lastFlush = Date.now();
      }
    };

    const unsubscribe = telemetryWS.subscribe((incomingTags) => {
      if (!isLive) return;
      Object.assign(batch, incomingTags);

      const elapsed = Date.now() - lastFlush;
      if (elapsed > 250) {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(flushBatch);
      } else if (!rafId) {
        rafId = setTimeout(() => {
          rafId = requestAnimationFrame(flushBatch);
        }, 250 - elapsed);
      }
    });

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        clearTimeout(rafId);
      }
      unsubscribe();
      telemetryWS.cleanup();
    };
  }, [isLive]);

  // Switch Dashboard
  const handleSelectDashboard = async (slug) => {
    try {
      const dash = await fetchDashboard(slug);
      setCurrentDashboard(dash);
      setLayout(dash.layout || []);
      setTimeRange(dash.time_range || 'now-15m');
    } catch (err) {
      console.error('Failed to switch dashboard:', err);
    }
  };

  // Create New Dashboard
  const handleCreateDashboard = async (newDashData) => {
    try {
      await createDashboard(newDashData);
      const updatedList = await fetchDashboards();
      setDashboards(updatedList);
      await handleSelectDashboard(newDashData.slug);
    } catch (err) {
      console.error('Failed to create dashboard:', err);
    }
  };

  // Add Panel with Auto-Save
  const handleAddPanel = async (newPanel) => {
    const updated = [...layout, newPanel];
    setLayout(updated);
    if (currentDashboard) {
      try {
        setSaveStatus('saving');
        await updateDashboard(currentDashboard.slug, {
          layout: updated,
          time_range: timeRange
        });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err) {
        console.warn('Auto-save on add panel error:', err);
        setSaveStatus('idle');
      }
    }
  };

  // Remove Panel with Auto-Save
  const handleRemovePanel = async (panelId) => {
    const updated = layout.filter(p => p.id !== panelId);
    setLayout(updated);
    if (currentDashboard) {
      try {
        await updateDashboard(currentDashboard.slug, {
          layout: updated,
          time_range: timeRange
        });
      } catch (err) {
        console.warn('Auto-save on remove error:', err);
      }
    }
  };

  // Edit Panel Inspector
  const handleEditPanel = (panel) => {
    setEditingWidget(panel);
  };

  // Save changes from WidgetEditorModal
  const handleSaveWidget = async (updatedWidget) => {
    const updated = layout.map(p => p.id === updatedWidget.id ? updatedWidget : p);
    setLayout(updated);
    if (currentDashboard) {
      try {
        setSaveStatus('saving');
        await updateDashboard(currentDashboard.slug, {
          layout: updated,
          time_range: timeRange
        });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err) {
        console.warn('Auto-save on widget edit error:', err);
        setSaveStatus('idle');
      }
    }
  };

  // Add tag from ISA-95 sidebar directly into canvas
  const handleAddTagFromSidebar = async (tag) => {
    const maxY = (layout || []).reduce((max, p) => Math.max(max, (p.y ?? 0) + (p.h ?? 5)), 0);
    const newPanel = {
      id: 'p_tag_' + Date.now(),
      type: 'timeseries',
      title: `${tag.display_name} (${tag.tag_name})`,
      tags: [tag.tag_name],
      x: 0,
      y: maxY,
      w: 6,
      h: 5
    };
    await handleAddPanel(newPanel);
  };

  // Duplicate / Clone Panel
  const handleDuplicatePanel = async (panel) => {
    const maxY = (layout || []).reduce((max, p) => Math.max(max, (p.y ?? 0) + (p.h ?? 5)), 0);
    const duplicated = {
      ...panel,
      id: 'p_copy_' + Date.now(),
      title: `${panel.title} (Copy)`,
      x: (panel.x + 2) % 12,
      y: maxY,
    };
    await handleAddPanel(duplicated);
  };

  // Save Settings from DashboardSettingsModal
  const handleSaveDashboardSettings = async (settings) => {
    if (!currentDashboard) return;
    try {
      setSaveStatus('saving');
      const updated = await updateDashboard(currentDashboard.slug, {
        title: settings.title,
        description: settings.description,
        category: settings.category,
        time_range: settings.time_range,
        refresh_interval: settings.refresh_interval,
        layout: layout
      });
      setCurrentDashboard(updated);
      setTimeRange(settings.time_range);
      const dashList = await fetchDashboards();
      setDashboards(dashList);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Failed to update dashboard settings:', err);
      setSaveStatus('idle');
    }
  };

  // Clone Dashboard from DashboardSettingsModal
  const handleCloneDashboard = async (clonedData) => {
    try {
      await createDashboard(clonedData);
      const updatedList = await fetchDashboards();
      setDashboards(updatedList);
      await handleSelectDashboard(clonedData.slug);
    } catch (err) {
      console.error('Failed to clone dashboard:', err);
    }
  };

  // Import JSON Layout from DashboardSettingsModal
  const handleImportLayout = async (parsedJson) => {
    if (!currentDashboard) return;
    try {
      setSaveStatus('saving');
      const newLayout = parsedJson.layout || [];
      setLayout(newLayout);
      if (parsedJson.time_range) setTimeRange(parsedJson.time_range);

      const updated = await updateDashboard(currentDashboard.slug, {
        title: parsedJson.title || currentDashboard.title,
        description: parsedJson.description || currentDashboard.description,
        category: parsedJson.category || currentDashboard.category,
        time_range: parsedJson.time_range || timeRange,
        refresh_interval: parsedJson.refresh_interval || currentDashboard.refresh_interval,
        layout: newLayout
      });
      setCurrentDashboard(updated);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Failed to import layout:', err);
      setSaveStatus('idle');
    }
  };

  // Delete Dashboard from DashboardSettingsModal
  const handleDeleteDashboard = async (slug) => {
    try {
      await deleteDashboard(slug);
      const updatedList = await fetchDashboards();
      setDashboards(updatedList);
      if (updatedList.length > 0) {
        await handleSelectDashboard(updatedList[0].slug);
      } else {
        setCurrentDashboard(null);
        setLayout([]);
      }
    } catch (err) {
      console.error('Failed to delete dashboard:', err);
    }
  };

  // Save Dashboard Layout to Backend
  const handleSaveDashboard = async () => {
    if (!currentDashboard) return;
    try {
      setSaveStatus('saving');
      await updateDashboard(currentDashboard.slug, {
        layout: layout,
        time_range: timeRange
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (err) {
      console.error('Failed to save layout:', err);
      setSaveStatus('idle');
    }
  };

  // Switch to DM view from anywhere
  const handleNavigateToDM = (targetView) => {
    setCurrentModule('DM');
    if (targetView && setActiveEntity) {
      let viewKey = targetView;
      if (viewKey === 'devices') viewKey = 'device';
      if (viewKey === 'rule_chains') viewKey = 'rule_chain';
      if (viewKey === 'alarms') viewKey = 'alarm';
      if (viewKey === 'assets') viewKey = 'asset';
      setActiveEntity(viewKey);
    }
  };

  // Render Yokogawa Data Management (DM) Module
  if (currentModule === 'DM') {
    return (
      <div className="app-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <Navbar
          dashboards={dashboards}
          currentDashboard={currentDashboard}
          onSelectDashboard={handleSelectDashboard}
          onNewDashboard={() => setIsNewDashModalOpen(true)}
          timeRange={timeRange}
          onChangeTimeRange={setTimeRange}
          onAddPanel={() => setIsAddModalOpen(true)}
          onSaveDashboard={handleSaveDashboard}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
          isLive={isLive}
          onToggleLive={() => setIsLive(!isLive)}
          saveStatus={saveStatus}
          isEditMode={isEditMode}
          onToggleEditMode={() => setIsEditMode(!isEditMode)}
          currentModule={currentModule}
          onSelectModule={setCurrentModule}
          diSubView={diSubView}
          onSelectDiSubView={setDiSubView}
        />
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <DMApp onNavigateToDI={(view) => { setCurrentModule('DI'); if (view) setDiSubView(view); }} />
        </div>
      </div>
    );
  }

  // Render ThingsBoard IoT (TB) Reverse-Engineered Platform Hub
  if (currentModule === 'TB') {
    return (
      <div className="app-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <Navbar
          dashboards={dashboards}
          currentDashboard={currentDashboard}
          onSelectDashboard={handleSelectDashboard}
          onNewDashboard={() => setIsNewDashModalOpen(true)}
          timeRange={timeRange}
          onChangeTimeRange={setTimeRange}
          onAddPanel={() => setIsAddModalOpen(true)}
          onSaveDashboard={handleSaveDashboard}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
          isLive={isLive}
          onToggleLive={() => setIsLive(!isLive)}
          saveStatus={saveStatus}
          isEditMode={isEditMode}
          onToggleEditMode={() => setIsEditMode(!isEditMode)}
          currentModule={currentModule}
          onSelectModule={setCurrentModule}
          diSubView={diSubView}
          onSelectDiSubView={setDiSubView}
        />
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <ThingsBoardHub
            onNavigateToDI={(view) => { setCurrentModule('DI'); if (view) setDiSubView(view); }}
            onNavigateToDM={handleNavigateToDM}
          />
        </div>
      </div>
    );
  }

  // Render Universal Industrial Widget Studio (WS) Module
  if (currentModule === 'WS') {
    return (
      <div className="app-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <Navbar
          dashboards={dashboards}
          currentDashboard={currentDashboard}
          onSelectDashboard={handleSelectDashboard}
          onNewDashboard={() => setIsNewDashModalOpen(true)}
          timeRange={timeRange}
          onChangeTimeRange={setTimeRange}
          onAddPanel={() => setIsAddModalOpen(true)}
          onSaveDashboard={handleSaveDashboard}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
          isLive={isLive}
          onToggleLive={() => setIsLive(!isLive)}
          saveStatus={saveStatus}
          isEditMode={isEditMode}
          onToggleEditMode={() => setIsEditMode(!isEditMode)}
          currentModule={currentModule}
          onSelectModule={setCurrentModule}
          diSubView={diSubView}
          onSelectDiSubView={setDiSubView}
        />
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <UniversalWidgetStudio
            onNavigateToDI={(view) => { setCurrentModule('DI'); if (view) setDiSubView(view); }}
            onNavigateToDM={handleNavigateToDM}
          />
        </div>
      </div>
    );
  }

  // Render Data Insight (DI) Module
  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Clean Global Navbar */}
      <Navbar
        dashboards={dashboards}
        currentDashboard={currentDashboard}
        onSelectDashboard={handleSelectDashboard}
        onNewDashboard={() => setIsNewDashModalOpen(true)}
        timeRange={timeRange}
        onChangeTimeRange={setTimeRange}
        onAddPanel={() => setIsAddModalOpen(true)}
        onSaveDashboard={handleSaveDashboard}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
        isLive={isLive}
        onToggleLive={() => setIsLive(!isLive)}
        saveStatus={saveStatus}
        isEditMode={isEditMode}
        onToggleEditMode={() => setIsEditMode(!isEditMode)}
        currentModule={currentModule}
        onSelectModule={setCurrentModule}
        diSubView={diSubView}
        onSelectDiSubView={setDiSubView}
      />

      {/* DI Content: SCADA Studio Hierarchy vs Operational Dashboards vs Asset Twin */}
      {diSubView.startsWith('scada') ? (
        <ScadaStudio
          subView={diSubView}
          onSelectSubView={setDiSubView}
          onNavigateToDM={handleNavigateToDM}
        />
      ) : diSubView === 'assets' ? (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#0b1120]">
          <MasterAssetDashboard
            onNavigateToDM={handleNavigateToDM}
            isLiveStream={isLive}
          />
        </div>
      ) : (
        <div className="main-content">
          {/* Collapsible ISA-95 Tree with mobile backdrop */}
          {sidebarOpen && (
            <>
              <div
                className="mobile-sidebar-backdrop md:hidden"
                onClick={() => setSidebarOpen(false)}
              />
              <AssetTreeSidebar
                treeData={assetTree}
                liveTelemetry={liveTelemetry}
                onAddTagToDashboard={handleAddTagFromSidebar}
                onClose={() => setSidebarOpen(false)}
              />
            </>
          )}

          {/* Master Dashboard Canvas with All Working Widgets */}
          <DashboardCanvas
            layout={layout}
            onLayoutChange={setLayout}
            onRemovePanel={handleRemovePanel}
            onEditPanel={handleEditPanel}
            onDuplicatePanel={handleDuplicatePanel}
            onSelectDashboard={handleSelectDashboard}
            timeRange={timeRange}
            liveTelemetry={liveTelemetry}
            isEditMode={isEditMode}
            onNavigateToDM={handleNavigateToDM}
          />
        </div>
      )}

      {/* Add Panel Modal (Contains all ThingsBoard and Industrial Widgets) */}
      <AddPanelModal
        tagsList={tagsList}
        currentLayout={layout}
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddPanel}
        onAddAndConfigure={(panel) => setEditingWidget(panel)}
      />

      {/* Widget Editor & Tag Reassignment Inspector */}
      <WidgetEditorModal
        widget={editingWidget}
        tagsList={tagsList}
        dashboards={dashboards}
        isOpen={!!editingWidget}
        onClose={() => setEditingWidget(null)}
        onSave={handleSaveWidget}
      />

      {/* Dashboard Settings & JSON Export/Import Modal */}
      <DashboardSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        dashboard={currentDashboard}
        layout={layout}
        onSaveSettings={handleSaveDashboardSettings}
        onCloneDashboard={handleCloneDashboard}
        onImportLayout={handleImportLayout}
        onDeleteDashboard={handleDeleteDashboard}
      />

      {/* New Custom Dashboard Modal */}
      <NewDashboardModal
        isOpen={isNewDashModalOpen}
        onClose={() => setIsNewDashModalOpen(false)}
        onCreate={handleCreateDashboard}
      />
    </div>
  );
}
