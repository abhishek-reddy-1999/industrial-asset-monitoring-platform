import React, { useState } from 'react';
import {
  Activity, Clock, Plus, Save, Layers,
  ChevronDown, CheckCircle2, ShieldCheck, Database,
  Sliders, Lock, Unlock, Settings,
  Gauge, LayoutDashboard, Cpu, Server, X, RefreshCw,
  Box, Check, Zap, SlidersHorizontal, Eye, Sparkles
} from 'lucide-react';
import { useDM } from '../views/dm/dmContext';

export default function Navbar({
  dashboards = [],
  currentDashboard = null,
  onSelectDashboard,
  onNewDashboard,
  timeRange = 'now-15m',
  onChangeTimeRange,
  onAddPanel,
  onSaveDashboard,
  onOpenSettings,
  toggleSidebar,
  sidebarOpen,
  isLive,
  onToggleLive,
  saveStatus,
  isEditMode,
  onToggleEditMode,
  currentModule = 'DI',
  onSelectModule,
  diSubView = 'dashboards',
  onSelectDiSubView
}) {
  const [dashDropdownOpen, setDashDropdownOpen] = useState(false);
  const [timeDropdownOpen, setTimeDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { userProfile } = useDM();

  const timeOptions = [
    { label: 'Last 1 minutes', value: 'now-1m' },
    { label: 'Last 5 minutes', value: 'now-5m' },
    { label: 'Last 10 minutes', value: 'now-10m' },
    { label: 'Last 15 minutes', value: 'now-15m' },
    { label: 'Last 35 minutes', value: 'now-30m' },
    { label: 'Last 45 minutes', value: 'now-45m' },
    { label: 'Last 1 hour', value: 'now-1h' },
    { label: 'Last 8 hours (Shift)', value: 'now-8h' },
    { label: 'Last 24 hours', value: 'now-24h' }
  ];

  const currentTimeLabel = timeOptions.find(t => t.value === timeRange)?.label || 'Last 15m';

  return (
    <nav
      className="navbar navbar-responsive"
      style={{
        height: '56px',
        background: '#090e1d',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        position: 'relative',
        zIndex: 50,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
      }}
    >
      {/* ===================================================================== */}
      {/* LEFT: SIDEBAR TOGGLE, BRANDING & PRIMARY MODULE SWITCHER (DI vs DM)   */}
      {/* ===================================================================== */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>

        {/* Toggle ISA-95 Tree in DI */}
        {currentModule === 'DI' && diSubView === 'dashboards' && toggleSidebar && (
          <button
            onClick={toggleSidebar}
            className="btn btn-secondary btn-condensed-mobile"
            style={{
              padding: '6px 10px',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: sidebarOpen ? 'rgba(56, 189, 248, 0.12)' : 'rgba(15, 23, 42, 0.6)',
              borderColor: sidebarOpen ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)',
              color: sidebarOpen ? '#38bdf8' : '#94a3b8'
            }}
            title="Toggle ISA-95 Asset Hierarchy Sidebar"
          >
            <Layers size={15} />
            <span style={{ fontWeight: 600 }}>Assets</span>
          </button>
        )}

        {/* Brand Logo & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #0284c7, #4f46e5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)'
          }}>
            <Activity size={18} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.86rem', color: '#f8fafc', letterSpacing: '0.4px', lineHeight: 1.1 }}>
              AHI ThingsBoard IoT
            </div>
            <div className="hide-on-mobile" style={{ fontSize: '0.62rem', color: '#38bdf8', fontWeight: 600, letterSpacing: '0.5px' }}>
              INDUSTRIAL IOT &amp; DCS SUITE
            </div>
          </div>
        </div>

        {/* Primary View Switcher: DI (Data Insight) vs DM (Device Management) */}
        <div style={{
          display: 'flex',
          gap: '3px',
          background: 'rgba(15, 23, 42, 0.8)',
          padding: '3px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <button
            onClick={() => onSelectModule && onSelectModule('DI')}
            className="btn-condensed-mobile"
            style={{
              padding: '5px 12px',
              fontSize: '0.75rem',
              fontWeight: currentModule === 'DI' ? 700 : 500,
              background: currentModule === 'DI' ? 'linear-gradient(135deg, #0284c7, #2563eb)' : 'transparent',
              color: currentModule === 'DI' ? '#ffffff' : '#94a3b8',
              border: 'none',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            <LayoutDashboard size={14} />
            <span><span className="full-label">DI (Data Insight)</span><span className="short-label">DI</span></span>
          </button>

          <button
            onClick={() => onSelectModule && onSelectModule('DM')}
            className="btn-condensed-mobile"
            style={{
              padding: '5px 12px',
              fontSize: '0.75rem',
              fontWeight: currentModule === 'DM' ? 700 : 500,
              background: currentModule === 'DM' ? 'linear-gradient(135deg, #0284c7, #2563eb)' : 'transparent',
              color: currentModule === 'DM' ? '#ffffff' : '#94a3b8',
              border: 'none',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            <Cpu size={14} />
            <span><span className="full-label">DM (Device Manager)</span><span className="short-label">DM</span></span>
          </button>

          <button
            onClick={() => onSelectModule && onSelectModule('TB')}
            className="btn-condensed-mobile"
            style={{
              padding: '5px 12px',
              fontSize: '0.75rem',
              fontWeight: currentModule === 'TB' ? 700 : 500,
              background: currentModule === 'TB' ? 'linear-gradient(135deg, #06b6d4, #2563eb)' : 'transparent',
              color: currentModule === 'TB' ? '#ffffff' : '#94a3b8',
              border: 'none',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            title="ThingsBoard IoT Full Reverse-Engineered Platform"
          >
            <Zap size={14} />
            <span><span className="full-label">ThingsBoard (TB)</span><span className="short-label">TB</span></span>
          </button>

          <button
            onClick={() => onSelectModule && onSelectModule('WS')}
            className="btn-condensed-mobile"
            style={{
              padding: '5px 12px',
              fontSize: '0.75rem',
              fontWeight: currentModule === 'WS' ? 700 : 500,
              background: currentModule === 'WS' ? 'linear-gradient(135deg, #a855f7, #6366f1)' : 'transparent',
              color: currentModule === 'WS' ? '#ffffff' : '#94a3b8',
              border: 'none',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            title="Dedicated Industrial Widget Studio (38+ Built-in & Custom Widgets)"
          >
            <Sparkles size={14} />
            <span><span className="full-label">Widget Studio</span><span className="short-label">WS</span></span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* CENTER: CONTEXTUAL NAVIGATION FOR DI (DASHBOARDS vs SCADA & SELECTOR) */}
      {/* ===================================================================== */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0, justifyContent: 'center' }}>
        {currentModule === 'DI' ? (
          <>
            {/* Sub-view switcher: Data Insight Hierarchy */}
            <div style={{
              display: 'flex',
              gap: '2px',
              background: 'rgba(15, 23, 42, 0.85)',
              padding: '3px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              overflowX: 'auto',
              maxWidth: '100%'
            }}>
              {/* Existing Dashboards */}
              <button
                onClick={() => onSelectDiSubView && onSelectDiSubView('dashboards')}
                style={{
                  padding: '4px 8px',
                  fontSize: '0.72rem',
                  fontWeight: diSubView === 'dashboards' ? 700 : 500,
                  background: diSubView === 'dashboards' ? '#1e293b' : 'transparent',
                  color: diSubView === 'dashboards' ? '#38bdf8' : '#94a3b8',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  whiteSpace: 'nowrap'
                }}
              >
                <LayoutDashboard size={13} />
                <span>Dashboards</span>
              </button>

              {/* SCADA Screens */}
              <button
                onClick={() => onSelectDiSubView && onSelectDiSubView('scada-screens')}
                style={{
                  padding: '4px 8px',
                  fontSize: '0.72rem',
                  fontWeight: diSubView === 'scada-screens' ? 700 : 500,
                  background: diSubView === 'scada-screens' ? '#1e293b' : 'transparent',
                  color: diSubView === 'scada-screens' ? '#38bdf8' : '#94a3b8',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  whiteSpace: 'nowrap'
                }}
                title="Industrial SCADA Process Synoptic Screens"
              >
                <Gauge size={13} />
                <span>SCADA Screens</span>
              </button>

              {/* SCADA Studio */}
              <button
                onClick={() => onSelectDiSubView && onSelectDiSubView('scada-studio')}
                style={{
                  padding: '4px 8px',
                  fontSize: '0.72rem',
                  fontWeight: (diSubView === 'scada-studio' || diSubView === 'scada') ? 700 : 500,
                  background: (diSubView === 'scada-studio' || diSubView === 'scada') ? '#1e293b' : 'transparent',
                  color: (diSubView === 'scada-studio' || diSubView === 'scada') ? '#38bdf8' : '#94a3b8',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  whiteSpace: 'nowrap'
                }}
                title="SCADA Canvas Designer & Process Editor"
              >
                <Layers size={13} />
                <span>SCADA Studio</span>
              </button>

              {/* Symbol Library */}
              <button
                onClick={() => onSelectDiSubView && onSelectDiSubView('scada-symbols')}
                style={{
                  padding: '4px 8px',
                  fontSize: '0.72rem',
                  fontWeight: diSubView === 'scada-symbols' ? 700 : 500,
                  background: diSubView === 'scada-symbols' ? '#1e293b' : 'transparent',
                  color: diSubView === 'scada-symbols' ? '#38bdf8' : '#94a3b8',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  whiteSpace: 'nowrap'
                }}
                title="Industrial SVG Symbol Registry (Pumps, Valves, Vessels, Piping, Instruments)"
              >
                <Box size={13} />
                <span>Symbol Library</span>
              </button>

              {/* SCADA Templates */}
              <button
                onClick={() => onSelectDiSubView && onSelectDiSubView('scada-templates')}
                style={{
                  padding: '4px 8px',
                  fontSize: '0.72rem',
                  fontWeight: diSubView === 'scada-templates' ? 700 : 500,
                  background: diSubView === 'scada-templates' ? '#1e293b' : 'transparent',
                  color: diSubView === 'scada-templates' ? '#38bdf8' : '#94a3b8',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  whiteSpace: 'nowrap'
                }}
                title="Pre-configured Industrial Process System Templates"
              >
                <Sliders size={13} />
                <span>SCADA Templates</span>
              </button>

              {/* Asset Twin */}
              <button
                onClick={() => onSelectDiSubView && onSelectDiSubView('assets')}
                style={{
                  padding: '4px 8px',
                  fontSize: '0.72rem',
                  fontWeight: diSubView === 'assets' ? 700 : 500,
                  background: diSubView === 'assets' ? '#1e293b' : 'transparent',
                  color: diSubView === 'assets' ? '#38bdf8' : '#94a3b8',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  whiteSpace: 'nowrap'
                }}
                title="Operational Asset Digital Twin & Mimic Console"
              >
                <Activity size={13} />
                <span>Asset Twin</span>
              </button>
            </div>

            {/* Dashboard Selector Dropdown (When on Dashboards view) */}
            {diSubView === 'dashboards' && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setDashDropdownOpen(!dashDropdownOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 12px',
                    background: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    maxWidth: '260px'
                  }}
                >
                  <Box size={14} color="#38bdf8" />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {currentDashboard?.title || 'Select Dashboard'}
                  </span>
                  <ChevronDown size={14} color="#94a3b8" />
                </button>

                {dashDropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 0,
                    width: '300px',
                    background: '#0d131f',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '10px',
                    boxShadow: '0 12px 30px rgba(0,0,0,0.6)',
                    padding: '6px',
                    zIndex: 100
                  }}>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, padding: '4px 8px', textTransform: 'uppercase' }}>
                      Operational Dashboards
                    </div>
                    {dashboards.map(d => (
                      <button
                        key={d.slug}
                        onClick={() => {
                          onSelectDashboard(d.slug);
                          setDashDropdownOpen(false);
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '8px 10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: currentDashboard?.slug === d.slug ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                          color: currentDashboard?.slug === d.slug ? '#38bdf8' : '#e2e8f0',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600 }}>{d.title}</div>
                          {d.category && (
                            <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{d.category}</div>
                          )}
                        </div>
                        {currentDashboard?.slug === d.slug && <Check size={14} color="#38bdf8" />}
                      </button>
                    ))}

                    <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', marginTop: '4px', paddingTop: '4px' }}>
                      <button
                        onClick={() => {
                          setDashDropdownOpen(false);
                          if (onNewDashboard) onNewDashboard();
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '6px 10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'transparent',
                          color: '#38bdf8',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                          fontWeight: 600
                        }}
                      >
                        <Plus size={13} />
                        <span>Create New Dashboard</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* [+ Add Widget] Button */}
            {diSubView === 'dashboards' && onAddPanel && (
              <button
                onClick={onAddPanel}
                className="btn btn-primary"
                style={{
                  padding: '5px 12px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#ffffff',
                  boxShadow: '0 2px 8px rgba(2, 132, 199, 0.35)',
                  cursor: 'pointer'
                }}
                title="Add any ThingsBoard / Industrial widget to this dashboard"
              >
                <Plus size={14} />
                <span>Add Widget</span>
              </button>
            )}
          </>
        ) : currentModule === 'TB' ? (
          <div className="hide-on-mobile" style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-primary" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee', border: '1px solid rgba(6, 182, 212, 0.3)', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>
              ThingsBoard IoT Suite
            </span>
            <span className="hide-on-tablet">Enterprise Architecture • Multi-Tenant • Scoped KvEntry • Rule Engine • ISA-18.2 Alarms • RPC</span>
          </div>
        ) : (
          <div className="hide-on-mobile" style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-primary" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
              Yokogawa DM v1.3
            </span>
            <span className="hide-on-tablet">ThingsBoard Edge Device &amp; Rule Engine Manager</span>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* RIGHT: DESKTOP CONTROLS (> 992px)                                     */}
      {/* ===================================================================== */}
      <div className="nav-desktop-controls">
        {/* Time Window Dropdown (for DI) */}
        {currentModule === 'DI' && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setTimeDropdownOpen(!timeDropdownOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 10px',
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: '#cbd5e1',
                fontSize: '0.72rem',
                cursor: 'pointer'
              }}
            >
              <Clock size={13} color="#94a3b8" />
              <span>{currentTimeLabel}</span>
              <ChevronDown size={13} color="#64748b" />
            </button>

            {timeDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                right: 0,
                width: '180px',
                background: '#0d131f',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                padding: '4px',
                zIndex: 100
              }}>
                {timeOptions.map(t => (
                  <button
                    key={t.value}
                    onClick={() => {
                      if (onChangeTimeRange) onChangeTimeRange(t.value);
                      setTimeDropdownOpen(false);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '6px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: timeRange === t.value ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                      color: timeRange === t.value ? '#38bdf8' : '#cbd5e1',
                      border: 'none',
                      borderRadius: '5px',
                      fontSize: '0.72rem',
                      cursor: 'pointer'
                    }}
                  >
                    <span>{t.label}</span>
                    {timeRange === t.value && <Check size={12} color="#38bdf8" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Live Streaming Toggle */}
        {currentModule === 'DI' && onToggleLive && (
          <button
            onClick={onToggleLive}
            style={{
              padding: '5px 10px',
              fontSize: '0.72rem',
              fontWeight: 700,
              borderRadius: '6px',
              border: isLive ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
              background: isLive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
              color: isLive ? '#34d399' : '#fbbf24',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
            title={isLive ? 'Live WebSocket streaming active' : 'Live streaming paused'}
          >
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: isLive ? '#34d399' : '#fbbf24',
              display: 'inline-block'
            }} />
            <span>{isLive ? 'LIVE 1s' : 'PAUSED'}</span>
          </button>
        )}

        {/* Edit Layout Mode Toggle */}
        {currentModule === 'DI' && diSubView === 'dashboards' && onToggleEditMode && (
          <button
            onClick={onToggleEditMode}
            style={{
              padding: '5px 10px',
              fontSize: '0.72rem',
              fontWeight: 600,
              borderRadius: '6px',
              border: isEditMode ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
              background: isEditMode ? 'rgba(245, 158, 11, 0.12)' : 'rgba(15, 23, 42, 0.6)',
              color: isEditMode ? '#fbbf24' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer'
            }}
            title="Toggle Edit / Resize / Drag Mode for Widgets"
          >
            {isEditMode ? <Unlock size={13} /> : <Lock size={13} />}
            <span>{isEditMode ? 'Editing' : 'Locked'}</span>
          </button>
        )}

        {/* Save Dashboard Button */}
        {currentModule === 'DI' && diSubView === 'dashboards' && onSaveDashboard && (
          <button
            onClick={onSaveDashboard}
            disabled={saveStatus === 'saving'}
            style={{
              padding: '5px 10px',
              fontSize: '0.72rem',
              fontWeight: 600,
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: saveStatus === 'saved' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(15, 23, 42, 0.6)',
              color: saveStatus === 'saved' ? '#34d399' : '#cbd5e1',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer'
            }}
            title="Save Dashboard layout to database"
          >
            <Save size={13} />
            <span>{saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Save'}</span>
          </button>
        )}

        {/* Dashboard Settings & JSON Import/Export */}
        {currentModule === 'DI' && diSubView === 'dashboards' && onOpenSettings && (
          <button
            onClick={onOpenSettings}
            style={{
              padding: '5px 8px',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              color: '#94a3b8',
              cursor: 'pointer'
            }}
            title="Dashboard Settings & JSON Export"
          >
            <Settings size={14} />
          </button>
        )}

        {/* User Role Pill */}
        <div className="hide-on-mobile" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 8px',
          background: 'rgba(15, 23, 42, 0.5)',
          borderRadius: '6px',
          border: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          <ShieldCheck size={14} color="#10b981" />
          <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>
            {userProfile?.role || 'Engineer'}
          </span>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* RIGHT: COMPACT MOBILE/TABLET CONTROLS (<= 992px)                      */}
      {/* ===================================================================== */}
      <div className="nav-mobile-controls">
        {currentModule === 'DI' && onToggleLive && (
          <button
            onClick={onToggleLive}
            style={{
              padding: '4px 7px',
              fontSize: '0.68rem',
              fontWeight: 700,
              borderRadius: '5px',
              border: isLive ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)',
              background: isLive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              color: isLive ? '#34d399' : '#fbbf24',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer'
            }}
          >
            <span style={{
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              background: isLive ? '#34d399' : '#fbbf24'
            }} />
            <span>{isLive ? 'LIVE' : 'PAUSE'}</span>
          </button>
        )}

        {currentModule === 'DI' && diSubView === 'dashboards' && onSaveDashboard && (
          <button
            onClick={onSaveDashboard}
            disabled={saveStatus === 'saving'}
            style={{
              padding: '4px 8px',
              fontSize: '0.68rem',
              fontWeight: 600,
              borderRadius: '5px',
              border: 'none',
              background: 'linear-gradient(135deg, #0284c7, #2563eb)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer'
            }}
            title="Save Dashboard"
          >
            <Save size={12} />
            <span>{saveStatus === 'saving' ? '...' : 'Save'}</span>
          </button>
        )}

        {currentModule === 'DI' && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                padding: '5px 7px',
                background: mobileMenuOpen ? 'rgba(56, 189, 248, 0.2)' : 'rgba(15, 23, 42, 0.7)',
                border: mobileMenuOpen ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '5px',
                color: mobileMenuOpen ? '#38bdf8' : '#cbd5e1',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Dashboard Quick Controls"
            >
              <SlidersHorizontal size={14} />
            </button>

            {mobileMenuOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                width: '230px',
                background: '#0d131f',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                boxShadow: '0 12px 30px rgba(0,0,0,0.7)',
                padding: '10px',
                zIndex: 150,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase' }}>
                  Dashboard Tools
                </div>

                <div>
                  <label style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Time Window:</label>
                  <select
                    value={timeRange}
                    onChange={(e) => {
                      if (onChangeTimeRange) onChangeTimeRange(e.target.value);
                      setMobileMenuOpen(false);
                    }}
                    style={{
                      width: '100%',
                      background: '#111827',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#f1f5f9',
                      padding: '4px 6px',
                      borderRadius: '4px',
                      fontSize: '0.72rem'
                    }}
                  >
                    {timeOptions.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                {diSubView === 'dashboards' && onToggleEditMode && (
                  <button
                    onClick={() => {
                      onToggleEditMode();
                      setMobileMenuOpen(false);
                    }}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '5px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: isEditMode ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.05)',
                      color: isEditMode ? '#fbbf24' : '#cbd5e1',
                      fontSize: '0.72rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    {isEditMode ? <Unlock size={13} /> : <Lock size={13} />}
                    <span>{isEditMode ? 'Lock Layout' : 'Unlock & Edit Layout'}</span>
                  </button>
                )}

                {diSubView === 'dashboards' && onOpenSettings && (
                  <button
                    onClick={() => {
                      onOpenSettings();
                      setMobileMenuOpen(false);
                    }}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '5px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(255,255,255,0.05)',
                      color: '#cbd5e1',
                      fontSize: '0.72rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    <Settings size={13} />
                    <span>Dashboard Settings & JSON</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
