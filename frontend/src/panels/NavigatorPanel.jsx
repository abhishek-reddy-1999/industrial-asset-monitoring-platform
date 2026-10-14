import React from 'react';
import { ArrowRight, Compass, Flame, ShieldCheck, ExternalLink } from 'lucide-react';

export default function NavigatorPanel({ panel, onSelectDashboard }) {
  // If user configured a single custom button navigator:
  if (panel.targetDashboard || panel.targetUrl) {
    const isExternal = Boolean(panel.targetUrl);
    const label = panel.buttonText || panel.title || 'Navigate to Asset View';
    const accent = panel.accentColor || '#38bdf8';

    const handleClick = () => {
      if (isExternal) {
        window.open(panel.targetUrl, '_blank', 'noopener,noreferrer');
      } else if (onSelectDashboard && panel.targetDashboard) {
        onSelectDashboard(panel.targetDashboard);
      }
    };

    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        textAlign: 'center'
      }}>
        <button
          type="button"
          onClick={handleClick}
          style={{
            padding: '14px 24px',
            borderRadius: `${panel.radius ?? 8}px`,
            background: `linear-gradient(135deg, ${accent}33, ${accent}11)`,
            border: `1px solid ${accent}88`,
            color: '#f8fafc',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.9rem',
            fontWeight: 600,
            boxShadow: `0 4px 16px ${accent}22`,
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.borderColor = accent;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.borderColor = `${accent}88`;
          }}
        >
          <Compass size={18} color={accent} />
          <span>{label}</span>
          {isExternal ? <ExternalLink size={15} color={accent} /> : <ArrowRight size={15} color={accent} />}
        </button>

        <div style={{ marginTop: '10px', fontSize: '0.72rem', color: '#64748b' }}>
          {isExternal ? `External Link: ${panel.targetUrl}` : `Target Dashboard: ${panel.targetDashboard}`}
        </div>
      </div>
    );
  }

  // Multi-shortcut list mode
  const defaultShortcuts = [
    { title: 'Atmospheric Distillation (CDU)', desc: 'Column C-101 Primary Fractionation', slug: 'refinery-cdu-overview', icon: <Flame size={16} color="#38bdf8" /> },
    { title: 'OpreX AHI & Anomaly Diagnostics', desc: 'MT Multivariate Distance & RUL', slug: 'oprex-ahi-asset-health', icon: <ShieldCheck size={16} color="#10b981" /> },
    { title: 'Refinery Fleet Plant-Wide', desc: 'CDU, VDU, and FCCU Multi-Unit View', slug: 'multi-unit-plant-wide', icon: <Compass size={16} color="#f59e0b" /> }
  ];

  const shortcuts = panel.shortcuts && panel.shortcuts.length > 0 ? panel.shortcuts : defaultShortcuts;

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-around',
      gap: '6px',
      padding: '8px'
    }}>
      <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Quick Navigation Shortcuts
      </div>

      {shortcuts.map((link, idx) => (
        <div
          key={idx}
          onClick={() => {
            if (link.url) {
              window.open(link.url, '_blank', 'noopener,noreferrer');
            } else if (onSelectDashboard && link.slug) {
              onSelectDashboard(link.slug);
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            borderRadius: '6px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(56, 189, 248, 0.12)';
            e.currentTarget.style.borderColor = '#38bdf8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {link.icon || <Compass size={16} color="#38bdf8" />}
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f1f5f9' }}>{link.title}</div>
              {link.desc && <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{link.desc}</div>}
            </div>
          </div>
          {link.url ? <ExternalLink size={13} color="#64748b" /> : <ArrowRight size={13} color="#64748b" />}
        </div>
      ))}
    </div>
  );
}
