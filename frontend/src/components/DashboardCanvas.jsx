import React, { useState } from 'react';
import GridLayout, { useContainerWidth } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Maximize2, Minimize2, Trash2, GripHorizontal, Settings, Copy, LayoutDashboard } from 'lucide-react';

import TimeSeriesPanel from '../panels/TimeSeriesPanel';
import GaugePanel from '../panels/GaugePanel';
import SynopticPIDPanel from '../panels/SynopticPIDPanel';
import MTAnomalyPanel from '../panels/MTAnomalyPanel';
import AlarmBannerPanel from '../panels/AlarmBannerPanel';
import CustomEChartsPanel from '../panels/CustomEChartsPanel';
import SingleStatPanel from '../panels/SingleStatPanel';
import BulletGraphPanel from '../panels/BulletGraphPanel';
import LevelCirclePanel from '../panels/LevelCirclePanel';
import DynamicLoaderPanel from '../panels/DynamicLoaderPanel';
import SankeyPanel from '../panels/SankeyPanel';
import XYPlotPanel from '../panels/XYPlotPanel';
import PieDonutPanel from '../panels/PieDonutPanel';
import CorrelationMatrixPanel from '../panels/CorrelationMatrixPanel';
import StateTimelinePanel from '../panels/StateTimelinePanel';
import DatatablePanel from '../panels/DatatablePanel';
import FloorHeatmapPanel from '../panels/FloorHeatmapPanel';
import CardPanel from '../panels/CardPanel';
import NavigatorPanel from '../panels/NavigatorPanel';
import CommandPanel from '../panels/CommandPanel';
import AssetListPanel from '../panels/AssetListPanel';
import AssetMediaPanel from '../panels/AssetMediaPanel';
import FoldingPanel from '../panels/FoldingPanel';
import RpcControlPanel from '../panels/RpcControlPanel';
import AlarmsTablePanel from '../panels/AlarmsTablePanel';

export default function DashboardCanvas({
  layout,
  onLayoutChange,
  onRemovePanel,
  onEditPanel,
  onDuplicatePanel,
  onSelectDashboard,
  timeRange,
  liveTelemetry,
  isEditMode = true,
  onNavigateToDM
}) {
  const [fullscreenPanelId, setFullscreenPanelId] = useState(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const { width, containerRef } = useContainerWidth({ initialWidth: 1200 });

  // Responsive column count based on container width (mobile: 2/4, tablet: 6/10, desktop: 12)
  const responsiveCols = React.useMemo(() => {
    if (!width || width >= 1200) return 12;
    if (width >= 992) return 10;
    if (width >= 768) return 6;
    if (width >= 480) return 4;
    return 2;
  }, [width]);

  // Memoize react-grid-layout items to prevent layout recalculation on every telemetry tick
  // Adapt widget dimensions seamlessly so widgets never get squeezed into unreadable columns on mobile
  const rglLayout = React.useMemo(() => {
    return layout.map(p => {
      const origW = p.w ?? 6;
      const origH = p.h ?? 5;
      let w = origW;
      let x = p.x ?? 0;
      if (responsiveCols <= 4) {
        w = responsiveCols; // full width stacked layout on mobile
        x = 0;
      } else if (responsiveCols <= 6) {
        w = origW >= 6 ? responsiveCols : Math.min(responsiveCols, Math.max(3, origW));
        x = x >= responsiveCols ? 0 : Math.min(x, Math.max(0, responsiveCols - w));
      } else if (responsiveCols <= 10) {
        w = Math.min(responsiveCols, Math.max(2, origW));
        x = Math.min(x, Math.max(0, responsiveCols - w));
      }
      return {
        i: p.id,
        x: Math.max(0, x),
        y: p.y ?? 0,
        w: Math.max(1, w),
        h: Math.max(2, origH),
        minW: 1,
        minH: 2
      };
    });
  }, [layout, responsiveCols]);

  const handleRglLayoutChange = (newLayout) => {
    if (!newLayout || !Array.isArray(newLayout)) return;
    const updated = layout.map(p => {
      const match = newLayout.find(l => l.i === p.id);
      if (match) {
        return { ...p, x: match.x, y: match.y, w: match.w, h: match.h };
      }
      return p;
    });
    if (onLayoutChange) {
      onLayoutChange(updated);
    }
  };

  const renderPanelContent = (panel) => {
    switch (panel.type) {
      case 'timeseries':
      case 'timeseries_v2':
      case 'barchart':
      case 'histogram':
        return <TimeSeriesPanel panel={panel} timeRange={timeRange} liveTelemetry={liveTelemetry} />;
      
      case 'gauge':
        return <GaugePanel panel={panel} liveTelemetry={liveTelemetry} />;
      
      case 'singlestat':
        return <SingleStatPanel panel={panel} timeRange={timeRange} liveTelemetry={liveTelemetry} />;
      
      case 'bullet_graph':
        return <BulletGraphPanel panel={panel} liveTelemetry={liveTelemetry} />;
      
      case 'level_circle':
        return <LevelCirclePanel panel={panel} liveTelemetry={liveTelemetry} />;
      
      case 'dynamic_loader':
        return <DynamicLoaderPanel panel={panel} liveTelemetry={liveTelemetry} />;
      
      case 'sankey':
        return <SankeyPanel panel={panel} liveTelemetry={liveTelemetry} />;
      
      case 'xy_plot':
        return <XYPlotPanel panel={panel} timeRange={timeRange} />;
      
      case 'piechart':
        return <PieDonutPanel panel={panel} liveTelemetry={liveTelemetry} />;
      
      case 'correlation_matrix':
        return <CorrelationMatrixPanel panel={panel} />;
      
      case 'state_timeline':
        return <StateTimelinePanel panel={panel} />;
      
      case 'floor_heatmap':
      case 'heatmap_table':
        return <FloorHeatmapPanel panel={panel} liveTelemetry={liveTelemetry} />;
      
      case 'datatable':
      case 'summary_table':
        return <DatatablePanel panel={panel} timeRange={timeRange} liveTelemetry={liveTelemetry} />;
      
      case 'card':
        return <CardPanel panel={panel} liveTelemetry={liveTelemetry} />;
      
      case 'navigator':
        return <NavigatorPanel panel={panel} onSelectDashboard={onSelectDashboard} />;
      
      case 'command':
        return <CommandPanel panel={panel} liveTelemetry={liveTelemetry} />;
      
      case 'asset_list':
        return <AssetListPanel panel={panel} liveTelemetry={liveTelemetry} />;
      
      case 'map':
      case '3d_model':
      case 'asset_media':
      case 'image_list':
        return <AssetMediaPanel panel={panel} liveTelemetry={liveTelemetry} />;
      
      case 'folding':
        return <FoldingPanel panel={panel} liveTelemetry={liveTelemetry} />;
      
      case 'digital_twin':
      case 'synoptic_pid':
      case 'synoptic':
        return <SynopticPIDPanel panel={panel} liveTelemetry={liveTelemetry} onNavigateToDM={onNavigateToDM} />;
      
      case 'mt_anomaly':
        return <MTAnomalyPanel panel={panel} liveTelemetry={liveTelemetry} />;
      
      case 'echart_script':
        return <CustomEChartsPanel panel={panel} timeRange={timeRange} liveTelemetry={liveTelemetry} />;
      
      case 'alarms':
        return <AlarmBannerPanel />;
      
      case 'alarms_table':
        return <AlarmsTablePanel panel={panel} />;

      case 'rpc_control':
        return <RpcControlPanel panel={panel} liveTelemetry={liveTelemetry} />;
      
      default:
        return <CustomEChartsPanel panel={panel} timeRange={timeRange} liveTelemetry={liveTelemetry} />;
    }
  };

  if (fullscreenPanelId) {
    const fullPanel = layout.find(p => p.id === fullscreenPanelId);
    if (!fullPanel) {
      setFullscreenPanelId(null);
      return null;
    }

    return (
      <div style={{
        position: 'fixed',
        inset: '58px 0 0 0',
        zIndex: 500,
        background: '#0a0d14',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div className="panel-card" style={{ height: '100%' }}>
          <div className="panel-header" style={{ cursor: 'default' }}>
            <div className="panel-title">
              <span>{fullPanel.title}</span>
              {fullPanel.tags && fullPanel.tags.map(t => (
                <span key={t} style={{
                  fontSize: '0.7rem',
                  fontFamily: 'JetBrains Mono, monospace',
                  padding: '1px 6px',
                  borderRadius: '3px',
                  background: 'rgba(56, 189, 248, 0.1)',
                  color: '#38bdf8'
                }}>
                  {t}
                </span>
              ))}
            </div>
            <div className="panel-actions">
              <button
                className="action-icon btn"
                style={{ padding: '2px 4px', border: 'none', background: 'transparent' }}
                onClick={() => onEditPanel(fullPanel)}
                title="Edit Widget"
              >
                <Settings size={14} color="#38bdf8" />
              </button>
              <button 
                className="action-icon btn" 
                onClick={() => setFullscreenPanelId(null)}
                title="Exit Fullscreen"
              >
                <Minimize2 size={15} />
              </button>
            </div>
          </div>
          <div className="panel-body">
            {renderPanelContent(fullPanel)}
          </div>
        </div>
      </div>
    );
  }

  if (!layout || layout.length === 0) {
    return (
      <div 
        ref={containerRef}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          color: '#94a3b8',
          minHeight: '450px'
        }}
      >
        <div style={{
          maxWidth: '520px',
          textAlign: 'center',
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px dashed rgba(56, 189, 248, 0.35)',
          borderRadius: '12px',
          padding: '40px 32px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '12px',
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            color: '#38bdf8'
          }}>
            <LayoutDashboard size={28} />
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
            Clean Canvas Ready
          </h3>
          <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: '0px' }}>
            No widgets configured yet. Click <strong>+ Add Widget</strong> in the top navigation bar to manually design your layout with Gauges, P&ID Synoptics, Timeseries, or Alarms.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-viewport" ref={containerRef}>
      <GridLayout
        className="layout"
        layout={rglLayout}
        cols={responsiveCols}
        rowHeight={responsiveCols <= 4 ? 48 : responsiveCols <= 6 ? 54 : 60}
        width={width || 1200}
        margin={[14, 14]}
        draggableHandle=".panel-header"
        isResizable={isEditMode}
        isDraggable={isEditMode}
        onLayoutChange={(newLayout) => {
          handleRglLayoutChange(newLayout);
        }}
        onDragStart={() => setIsInteracting(true)}
        onDragStop={(newLayout) => {
          setIsInteracting(false);
          handleRglLayoutChange(newLayout);
          window.dispatchEvent(new Event('resize'));
        }}
        onResizeStart={() => setIsInteracting(true)}
        onResize={(currentLayout) => {
          // Trigger immediate fluid resize feedback as user drags resize handle
          window.dispatchEvent(new Event('resize'));
        }}
        onResizeStop={(newLayout) => {
          setIsInteracting(false);
          handleRglLayoutChange(newLayout);
          window.dispatchEvent(new Event('resize'));
          setTimeout(() => window.dispatchEvent(new Event('resize')), 60);
        }}
      >
        {layout.map((panel) => (
          <div key={panel.id} className="panel-card">
            {/* Draggable Header */}
            <div className="panel-header" style={{ cursor: isEditMode ? 'grab' : 'default' }}>
              <div className="panel-title">
                {isEditMode && <GripHorizontal size={14} color="#64748b" />}
                <span>{panel.title}</span>
                {panel.tags && panel.tags.length > 0 && (
                  <span className="panel-tag-badge" style={{
                    fontSize: '0.68rem',
                    fontFamily: 'JetBrains Mono, monospace',
                    padding: '1px 5px',
                    borderRadius: '3px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#94a3b8'
                  }}>
                    {panel.tags.length} {panel.tags.length === 1 ? 'tag' : 'tags'}
                  </span>
                )}
              </div>

              <div className="panel-actions">
                <button
                  className="action-icon btn"
                  style={{ padding: '2px 4px', border: 'none', background: 'transparent' }}
                  onClick={() => onEditPanel(panel)}
                  title="Configure Widget, Change Tags & Script"
                >
                  <Settings size={13} color="#38bdf8" />
                </button>
                {isEditMode && (
                  <button
                    className="action-icon btn btn-duplicate"
                    style={{ padding: '2px 4px', border: 'none', background: 'transparent' }}
                    onClick={() => onDuplicatePanel && onDuplicatePanel(panel)}
                    title="Duplicate / Clone Widget"
                  >
                    <Copy size={13} color="#94a3b8" />
                  </button>
                )}
                <button
                  className="action-icon btn"
                  style={{ padding: '2px 4px', border: 'none', background: 'transparent' }}
                  onClick={() => setFullscreenPanelId(panel.id)}
                  title="Fullscreen"
                >
                  <Maximize2 size={13} />
                </button>
                <button
                  className="action-icon btn"
                  style={{ padding: '2px 4px', border: 'none', background: 'transparent' }}
                  onClick={() => onRemovePanel(panel.id)}
                  title="Remove Panel"
                >
                  <Trash2 size={13} color="#f43f5e" />
                </button>
              </div>
            </div>

            {/* Panel Body */}
            <div className="panel-body">
              {renderPanelContent(panel)}
            </div>
          </div>
        ))}
      </GridLayout>
    </div>
  );
}
