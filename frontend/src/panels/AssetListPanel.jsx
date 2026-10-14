import React, { useState, useEffect } from 'react';
import { ListTree, ShieldCheck, AlertTriangle, Search, Filter, Activity, RefreshCw } from 'lucide-react';

export default function AssetListPanel({ panel, liveTelemetry }) {
  const [filterText, setFilterText] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'HEALTHY' | 'WARNING' | 'CRITICAL'
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/dm/assets');
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map(item => {
          const healthScore = item.health_index ?? item.health ?? 100.0;
          return {
            id: item.asset_id || item.id || `AST-${item.id}`,
            name: item.name || item.asset_name,
            type: item.level || item.asset_type || 'Equipment',
            health: Number(healthScore),
            alarms: item.active_alarms || item.alarms_count || 0,
            tag: item.primary_tag || item.tag_name || (item.bindings && item.bindings[0]?.source_tag) || ''
          };
        });
        setAssets(mapped);
      }
    } catch (e) {
      console.error('Failed to load assets', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const filtered = assets.filter(asset => {
    const matchesSearch = !filterText || 
      asset.name.toLowerCase().includes(filterText.toLowerCase()) || 
      String(asset.id).toLowerCase().includes(filterText.toLowerCase());

    const isHealthy = asset.health >= 85;
    const isWarning = asset.health >= 70 && asset.health < 85;
    const isCrit = asset.health < 70;

    if (!matchesSearch) return false;
    if (statusFilter === 'HEALTHY') return isHealthy;
    if (statusFilter === 'WARNING') return isWarning;
    if (statusFilter === 'CRITICAL') return isCrit;
    return true;
  });

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: '10px',
      gap: '8px'
    }}>
      {/* Top Filter Bar */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '4px',
          padding: '4px 8px'
        }}>
          <Search size={13} color="#64748b" />
          <input
            type="text"
            placeholder="Search real asset tag or name..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#f1f5f9',
              fontSize: '0.75rem',
              width: '100%'
            }}
          />
        </div>

        <button
          onClick={fetchAssets}
          title="Refresh Assets"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px 6px',
            borderRadius: '4px',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(0,0,0,0.2)',
            color: '#94a3b8',
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>

        <div style={{ display: 'flex', gap: '4px' }}>
          {['ALL', 'HEALTHY', 'WARNING', 'CRITICAL'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              style={{
                padding: '3px 6px',
                borderRadius: '4px',
                fontSize: '0.65rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: statusFilter === status ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.06)',
                background: statusFilter === status ? 'rgba(56,189,248,0.15)' : 'transparent',
                color: statusFilter === status ? '#38bdf8' : '#94a3b8'
              }}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Asset List Content */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {filtered.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#64748b',
            fontSize: '0.75rem',
            gap: '6px'
          }}>
            <ListTree size={24} style={{ opacity: 0.4 }} />
            <span>{loading ? 'Loading real assets...' : 'No assets found'}</span>
          </div>
        ) : (
          filtered.map(asset => {
            const liveVal = asset.tag ? liveTelemetry?.[asset.tag]?.value : null;
            const isHealthy = asset.health >= 85;
            const isWarning = asset.health >= 70 && asset.health < 85;
            const healthColor = isHealthy ? '#10b981' : isWarning ? '#f59e0b' : '#f43f5e';

            return (
              <div
                key={asset.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isHealthy ? (
                    <ShieldCheck size={16} color="#10b981" />
                  ) : (
                    <AlertTriangle size={16} color={healthColor} />
                  )}
                  <div>
                    <div style={{ fontWeight: 600, color: '#f1f5f9' }}>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#38bdf8', marginRight: '6px' }}>
                        {asset.id}
                      </span>
                      {asset.name}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                      {asset.type} {asset.tag ? `• Tag: ${asset.tag}` : ''} {liveVal !== null && liveVal !== undefined ? `• Live: ${liveVal}` : ''}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {asset.alarms > 0 && (
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: 'rgba(244, 63, 94, 0.15)',
                      color: '#f87171',
                      fontSize: '0.68rem',
                      fontWeight: 600
                    }}>
                      {asset.alarms} ALARMS
                    </span>
                  )}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: healthColor, fontSize: '0.85rem' }}>
                      {asset.health.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b' }}>AHI Score</div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
