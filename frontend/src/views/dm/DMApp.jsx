import React, { useState } from 'react';
import { 
  DMProvider, 
  useDM 
} from './dmContext';
import AssetEntityView from './AssetEntityView';
import AssetTemplateView from './AssetTemplateView';
import TableListEntityView from './TableListEntityView';
import MediaListEntityView from './MediaListEntityView';
import DeviceEntityView from './DeviceEntityView';
import DeviceTemplateView from './DeviceTemplateView';
import BrokerEntityView from './BrokerEntityView';
import IntegrationEntityView from './IntegrationEntityView';
import UoMEntityView from './UoMEntityView';
import EventForwardingView from './EventForwardingView';
import AlarmManagementView from './AlarmManagementView';
import SecurityView from './SecurityView';
import ActivityLogView from './ActivityLogView';
import FunctionBlockEntityView from './FunctionBlockEntityView';
import FunctionBlockStudioV2 from './FunctionBlockStudioV2';
import RuleChainView from './RuleChainView';
import RuleChainStudioV2 from './RuleChainStudioV2';
import ScadaHmiView from './ScadaHmiView';
import DataConverterView from './DataConverterView';
import WidgetStudioView from './WidgetStudioView';
import {
  DMUserManualModal,
  DMSitemapModal,
  DMTermsModal,
  DMUserProfileModal,
  DMSwitchProjectModal,
  DMAppPortalModal
} from './DMModals';
import { 
  Menu, Bell, Globe, HelpCircle, FileText, Map, User, 
  ExternalLink, Layers, Cpu, Server, Shield, Activity, 
  Settings, FolderTree, Database, Radio, Share2, 
  Scale, AlertTriangle, ChevronRight, CheckCircle2,
  AlertCircle, Info, X, Compass, ChevronDown, Check,
  Gauge, Code2, GitFork, Binary, FileCode, Sparkles,
  RefreshCw
} from 'lucide-react';

function DMAppContent({ onNavigateToDI }) {
  const { 
    activeEntity: currentEntity, 
    setActiveEntity: setCurrentEntity, 
    lang: language, 
    changeLanguage: setLanguage, 
    t, 
    userProfile, 
    project: currentProject,
    activityLogs: activityLog,
    toasts,
    assets,
    assetTemplates,
    devices,
    brokers,
    functionBlocks
  } = useDM();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 1024 : false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Modals state
  const [modalUserManual, setModalUserManual] = useState(false);
  const [modalSitemap, setModalSitemap] = useState(false);
  const [modalTerms, setModalTerms] = useState(false);
  const [modalProfile, setModalProfile] = useState(false);
  const [modalSwitchProject, setModalSwitchProject] = useState(false);
  const [modalAppPortal, setModalAppPortal] = useState(false);

  // Navigation Items
  const navSections = [
    {
      title: 'Asset Management',
      items: [
        { id: 'asset', label: t('asset_entity'), icon: FolderTree, badge: assets?.length || null },
        { id: 'asset_template', label: t('asset_template_entity'), icon: Layers, badge: assetTemplates?.length || null },
        { id: 'table_list', label: t('table_list_entity'), icon: Database, badge: null },
        { id: 'media_list', label: t('media_list_entity'), icon: FileText, badge: null }
      ]
    },
    {
      title: 'Function Block V2',
      items: [
        { id: 'fb_template', label: 'Block Template', icon: Layers, badge: 'V2', badgeColor: 'bg-cyan-950 text-cyan-300 border border-cyan-800' },
        { id: 'fb_execution', label: 'Block Execution', icon: RefreshCw, badge: 'Live', badgeColor: 'bg-emerald-950 text-emerald-300 border border-emerald-800' }
      ]
    },
    {
      title: 'Device & Ingestion',
      items: [
        { id: 'device', label: t('device_entity'), icon: Cpu, badge: devices?.length || null },
        { id: 'device_template', label: 'Device Profiles (TB PE)', icon: Radio, badge: null },
        { id: 'data_converter', label: 'Data Converters (TB PE)', icon: FileCode, badge: 'PE' },
        { id: 'rule_chain', label: 'Rule Chains (ThingsBoard)', icon: GitFork, badge: 'Active' },
        { id: 'broker', label: t('broker_entity'), icon: Server, badge: brokers?.length || null },
        { id: 'integration', label: t('integration_entity'), icon: ExternalLink, badge: null },
        { id: 'event_forwarding', label: t('event_forwarding_entity'), icon: Share2, badge: null }
      ]
    },
    {
      title: 'Master Data',
      items: [
        { id: 'uom', label: t('uom_entity'), icon: Scale, badge: null }
      ]
    },
    {
      title: 'Monitoring & Safety',
      items: [
        { id: 'scada_hmi', label: 'SCADA P&ID Synoptic (FUXA)', icon: Gauge, badge: 'HMI' },
        { id: 'widget_studio', label: 'ThingsBoard Widget Studio', icon: Sparkles, badge: 'Studio' },
        { id: 'alarm', label: t('alarm_management'), icon: AlertTriangle, badge: null, badgeColor: 'bg-red-500' }
      ]
    },
    {
      title: 'Security & Audit',
      items: [
        { id: 'security', label: t('security_entity'), icon: Shield, badge: null },
        { id: 'activity_log', label: t('activity_log_entity'), icon: Activity, badge: null }
      ]
    }
  ];

  const languagesList = [
    { code: 'en', label: 'English (English)', flag: '🇺🇸' },
    { code: 'ja', label: '日本語 (Japanese)', flag: '🇯🇵' },
    { code: 'ko', label: '한국어 (Korean)', flag: '🇰🇷' },
    { code: 'zh', label: '中文 (Chinese)', flag: '🇨🇳' }
  ];

  // Render view component
  const renderCurrentView = () => {
    switch (currentEntity) {
      case 'asset':
        return <AssetEntityView />;
      case 'asset_template':
        return <AssetTemplateView />;
      case 'table_list':
        return <TableListEntityView />;
      case 'media_list':
        return <MediaListEntityView />;
      case 'device':
        return <DeviceEntityView />;
      case 'device_template':
        return <DeviceTemplateView />;
      case 'data_converter':
        return <DataConverterView />;
      case 'rule_chain':
        return <RuleChainStudioV2 />;
      case 'fb_template':
        return <FunctionBlockStudioV2 initialTab="templates" />;
      case 'fb_execution':
        return <FunctionBlockStudioV2 initialTab="executions" />;
      case 'function_block':
        return <FunctionBlockStudioV2 initialTab="templates" />;
      case 'scada_hmi':
        return <ScadaHmiView />;
      case 'widget_studio':
        return <WidgetStudioView />;
      case 'broker':
        return <BrokerEntityView />;
      case 'integration':
        return <IntegrationEntityView />;
      case 'uom':
        return <UoMEntityView />;
      case 'event_forwarding':
        return <EventForwardingView />;
      case 'alarm':
        return <AlarmManagementView />;
      case 'security':
        return <SecurityView />;
      case 'activity_log':
        return <ActivityLogView />;
      default:
        return <AssetEntityView />;
    }
  };

  const getEntityTitle = () => {
    for (const sec of navSections) {
      const match = sec.items.find(i => i.id === currentEntity);
      if (match) return match.label;
    }
    return t('asset_entity');
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#0b1120] text-slate-100 overflow-hidden font-sans select-none">
      {/* ========================================================================= */}
      {/* DM UTILITY & BREADCRUMB BAR                                              */}
      {/* ========================================================================= */}
      <header className="h-10 bg-[#090e1d] border-b border-slate-800/80 flex items-center justify-between px-3 z-30 shrink-0">
        {/* Left: Sidebar Toggle, Current Entity Breadcrumb & Project Selector */}
        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={t('expand_collapse')}
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* Breadcrumb Indicator */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 hidden sm:inline">Yokogawa DM</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600 hidden sm:inline" />
            <span className="font-semibold text-cyan-400">{getEntityTitle()}</span>
          </div>

          <div className="h-3.5 w-px bg-slate-800 mx-1 hidden sm:block"></div>

          {/* Project quick selector */}
          <button 
            onClick={() => setModalSwitchProject(true)}
            className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 text-[11px] text-slate-300 transition-all hover:bg-slate-800/80 group"
          >
            <Compass className="w-3 h-3 text-cyan-400 group-hover:rotate-45 transition-transform" />
            <span className="text-slate-400">Project:</span>
            <span className="font-medium text-cyan-300">{currentProject?.name || 'Project Unconfigured'}</span>
            <ChevronDown className="w-2.5 h-2.5 text-slate-500" />
          </button>
        </div>

        {/* Right: Manual, Sitemap, Terms, Notifications, Lang, Profile */}
        <div className="flex items-center gap-1">

          {/* App Portal Modal Button */}
          <button
            onClick={() => setModalAppPortal(true)}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={t('app_portal')}
          >
            <div className="grid grid-cols-2 gap-0.5 w-4 h-4 p-0.5">
              <div className="bg-slate-400 rounded-sm"></div>
              <div className="bg-slate-400 rounded-sm"></div>
              <div className="bg-slate-400 rounded-sm"></div>
              <div className="bg-slate-400 rounded-sm"></div>
            </div>
          </button>

          {/* Online User Manual */}
          <button
            onClick={() => setModalUserManual(true)}
            className="p-1.5 rounded text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
            title={t('online_user_manual')}
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Sitemap */}
          <button
            onClick={() => setModalSitemap(true)}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={t('sitemap')}
          >
            <Map className="w-4 h-4" />
          </button>

          {/* Terms & Conditions */}
          <button
            onClick={() => setModalTerms(true)}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={t('term_conditions')}
          >
            <FileText className="w-4 h-4" />
          </button>

          {/* Language Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setLangDropdownOpen(!langDropdownOpen);
                setNotifDropdownOpen(false);
                setProfileDropdownOpen(false);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/60 transition-colors"
              title={t('language')}
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span className="uppercase font-mono text-[11px]">{language}</span>
            </button>

            {langDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-1.5 z-50">
                <div className="px-3 py-1 border-b border-slate-800 text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  Select Language
                </div>
                {languagesList.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      setLangDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-slate-800 transition-colors ${
                      language === lang.code ? 'text-cyan-400 font-semibold bg-cyan-950/40' : 'text-slate-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{lang.flag}</span>
                      <span>{lang.label}</span>
                    </span>
                    {language === lang.code && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notification Bell Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setNotifDropdownOpen(!notifDropdownOpen);
                setLangDropdownOpen(false);
                setProfileDropdownOpen(false);
              }}
              className="relative p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={t('notification')}
            >
              <Bell className="w-4 h-4" />
              {activityLog?.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              )}
            </button>

            {notifDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 overflow-hidden">
                <div className="px-3 py-2.5 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                    <Bell className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Recent System Notifications</span>
                  </div>
                  <span className="text-[10px] bg-cyan-950 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-800">
                    {activityLog?.length || 0}
                  </span>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-800 text-xs">
                  {activityLog?.slice(0, 5).map((log, i) => (
                    <div key={i} className="p-3 hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                        <span className="font-semibold text-slate-300">{log.entity}</span>
                        <span>{new Date(log.created_at).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-slate-300 text-xs font-mono">{log.action}: {log.entity_id}</p>
                      <span className={`inline-block mt-1 text-[10px] px-1.5 py-0.2 rounded ${
                        log.status === 'SUCCESS' ? 'text-emerald-400 bg-emerald-950/40' : 'text-rose-400 bg-rose-950/40'
                      }`}>
                        {log.status}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setCurrentEntity('activity_log');
                    setNotifDropdownOpen(false);
                  }}
                  className="w-full py-2 bg-slate-800 text-center text-xs text-cyan-400 hover:text-cyan-300 hover:bg-slate-750 font-medium transition-colors border-t border-slate-700"
                >
                  View All Notifications in Activity Log &rarr;
                </button>
              </div>
            )}
          </div>

          {/* User Profile Avatar Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setProfileDropdownOpen(!profileDropdownOpen);
                setLangDropdownOpen(false);
                setNotifDropdownOpen(false);
              }}
              className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-cyan-500/40 transition-all"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-xs font-bold text-white shadow">
                {userProfile?.first_name?.[0] || 'T'}{userProfile?.last_name?.[0] || 'T'}
              </div>
              <span className="hidden xl:inline text-xs text-slate-300 font-medium max-w-[120px] truncate">
                {userProfile?.first_name} {userProfile?.last_name}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-2 z-50">
                <div className="px-4 py-2 border-b border-slate-800">
                  <div className="font-semibold text-xs text-white">
                    {userProfile?.first_name} {userProfile?.last_name}
                  </div>
                  <div className="text-[11px] text-cyan-400 font-mono truncate">{userProfile?.upn}</div>
                  <div className="text-[10px] text-slate-400 mt-1">Role: <span className="text-amber-400 font-semibold">{userProfile?.role}</span></div>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setModalAppPortal(true);
                      setProfileDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 text-left"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t('app_portal')}</span>
                  </button>

                  <button
                    onClick={() => {
                      setModalSwitchProject(true);
                      setProfileDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 text-left"
                  >
                    <Compass className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t('switch_project')}</span>
                  </button>

                  <button
                    onClick={() => {
                      setModalProfile(true);
                      setProfileDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 text-left"
                  >
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t('profile')}</span>
                  </button>

                  <button
                    onClick={() => {
                      localStorage.setItem('ahi_dm_default_page', currentEntity);
                      setProfileDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 text-left"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t('set_as_default_page')}</span>
                  </button>
                </div>

                <div className="border-t border-slate-800 pt-1">
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      if (onNavigateToDI) onNavigateToDI();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-400 hover:bg-rose-950/20 text-left"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>{t('logout')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MAIN CONTAINER: Collapsible Sidebar + Entity Workspace Canvas */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Backdrop Overlay when sidebar is open on small screens */}
        {!sidebarCollapsed && (
          <div 
            className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-25 transition-opacity"
            onClick={() => setSidebarCollapsed(true)}
          />
        )}
        {/* SIDEBAR NAVIGATION: Table 1 Entity Navigation Control */}
        <aside 
          className={`${
            sidebarCollapsed 
              ? '-translate-x-full md:translate-x-0 md:w-14' 
              : 'translate-x-0 w-64 fixed md:relative h-[calc(100vh-56px)] md:h-auto'
          } bg-[#0e1628] border-r border-slate-800 flex flex-col transition-all duration-200 shrink-0 z-30 md:z-20 overflow-y-auto overflow-x-hidden shadow-2xl md:shadow-none`}
        >
          {/* Workspace Title / Category */}
          <div className="px-3.5 py-3 border-b border-slate-800/80 flex items-center justify-between">
            {!sidebarCollapsed ? (
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 tracking-wider uppercase">
                <FolderTree className="w-3.5 h-3.5 text-cyan-400" />
                <span>DM Entities</span>
              </div>
            ) : (
              <FolderTree className="w-4 h-4 text-cyan-400 mx-auto" />
            )}
          </div>

          {/* Navigation Sections */}
          <div className="flex-1 py-2 space-y-4">
            {navSections.map((section, sIdx) => (
              <div key={sIdx} className="space-y-0.5">
                {!sidebarCollapsed && (
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                    {section.title}
                  </div>
                )}
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentEntity === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setCurrentEntity(item.id)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2 text-xs font-medium transition-colors relative group ${
                        isActive 
                          ? 'bg-cyan-950/70 text-cyan-300 border-l-2 border-cyan-400 shadow-inner' 
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      }`}
                      title={sidebarCollapsed ? item.label : undefined}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-300'}`} />
                      {!sidebarCollapsed && (
                        <span className="truncate flex-1 text-left">{item.label}</span>
                      )}
                      {!sidebarCollapsed && item.badge !== null && item.badge !== undefined && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                          item.badgeColor || 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Sidebar Footer: Yokogawa AHI Environment Info */}
          {!sidebarCollapsed && (
            <div className="p-3 border-t border-slate-800 text-[10px] text-slate-300 bg-slate-950/40 space-y-1">
              <div className="flex justify-between">
                <span>Refinery Cluster:</span>
                <span className="text-emerald-400 font-mono">ONLINE</span>
              </div>
              <div className="flex justify-between">
                <span>Broker Stream:</span>
                <span className="text-cyan-400 font-mono">IoT Hub S1</span>
              </div>
              <div className="flex justify-between text-[9px] text-slate-300 pt-1">
                <span>All Rights Reserved</span>
                <span>© 2024 Yokogawa</span>
              </div>
            </div>
          )}
        </aside>

        {/* WORKSPACE CONTENT AREA */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#090d16]">
          {/* Breadcrumb / Action Topstrip */}
          <div className="h-9 bg-[#0b1120] border-b border-slate-800/80 px-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="text-slate-300">Data Management</span>
              <ChevronRight className="w-3 h-3 text-slate-600" />
              <span className="text-cyan-400 font-semibold">{getEntityTitle()}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
              <span className="hidden sm:inline">UTC: {new Date().toISOString().replace('T', ' ').substring(0, 19)}</span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>LIVE SYNC</span>
              </span>
            </div>
          </div>

          {/* Dynamic Entity View */}
          <div className="flex-1 overflow-auto p-3 sm:p-4">
            {renderCurrentView()}
          </div>
        </main>
      </div>

      {/* ========================================================================= */}
      {/* TOAST NOTIFICATION CONTAINER                                              */}
      {/* ========================================================================= */}
      {toasts && toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50 max-w-md">
          {toasts.slice(0, 3).map((toast) => (
            <div key={toast.id} className="bg-slate-900 border border-cyan-500/60 shadow-2xl rounded-lg p-3 flex items-start gap-3 animate-in fade-in slide-in-from-bottom duration-200">
              <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs">
                <div className="font-semibold text-slate-200">System Notification</div>
                <div className="text-slate-300 mt-0.5">{toast.message}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* GLOBAL MODALS (Manual Chapter 8)                                          */}
      {/* ========================================================================= */}
      <DMUserManualModal isOpen={modalUserManual} onClose={() => setModalUserManual(false)} />
      <DMSitemapModal isOpen={modalSitemap} onClose={() => setModalSitemap(false)} />
      <DMTermsModal isOpen={modalTerms} onClose={() => setModalTerms(false)} />
      <DMUserProfileModal isOpen={modalProfile} onClose={() => setModalProfile(false)} />
      <DMSwitchProjectModal isOpen={modalSwitchProject} onClose={() => setModalSwitchProject(false)} />
      <DMAppPortalModal 
        isOpen={modalAppPortal} 
        onClose={() => setModalAppPortal(false)} 
        onNavigateToDI={() => {
          setModalAppPortal(false);
          if (onNavigateToDI) onNavigateToDI();
        }}
      />
    </div>
  );
}

export default function DMApp({ onNavigateToDI }) {
  return <DMAppContent onNavigateToDI={onNavigateToDI} />;
}
