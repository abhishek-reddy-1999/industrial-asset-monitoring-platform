import React, { useState, useEffect, useMemo } from 'react';
import { Download, Search, RefreshCw, FileSpreadsheet, Columns, Rows, Radio, ArrowUpDown } from 'lucide-react';
import { queryTimeSeries } from '../api/client';

export default function DatatablePanel({ panel, timeRange, liveTelemetry }) {
  const [columnarRows, setColumnarRows] = useState([]);
  const [tagMetaMap, setTagMetaMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState(panel?.displayMode || 'columns'); // 'columns' or 'rows'
  const [sortAsc, setSortAsc] = useState(false);

  const tags = useMemo(() => {
    return panel.tags && panel.tags.length > 0 
      ? panel.tags 
      : ['TIC_101.PV', 'TIC_102.PV', 'PIC_101.PV', 'FIC_101.PV', 'LIC_101.PV', 'VIB_101.RMS'];
  }, [panel.tags]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await queryTimeSeries(tags, timeRange, 'now');
      const seriesList = res.series || [];

      // Build metadata map for each tag (units, display name)
      const meta = {};
      seriesList.forEach(s => {
        meta[s.tag_name] = {
          name: s.tag_name,
          displayName: s.display_name || s.tag_name,
          units: s.eng_units || '',
        };
      });
      setTagMetaMap(meta);

      // Pivot data by timestamp into Columnar Rows
      // Map: timestamp -> { timestamp, rawTimestamp, values: { [tagName]: { value, quality } } }
      const timePivot = new Map();

      seriesList.forEach(s => {
        (s.datapoints || []).forEach(p => {
          // Normalize timestamp to nearest second for multi-tag alignment
          const tsKey = new Date(p.timestamp).toISOString();
          if (!timePivot.has(tsKey)) {
            timePivot.set(tsKey, {
              timestamp: new Date(p.timestamp).toLocaleTimeString(),
              isoTime: tsKey,
              rawTimestamp: new Date(p.timestamp).getTime(),
              values: {},
              quality: 'GOOD'
            });
          }
          const rowItem = timePivot.get(tsKey);
          rowItem.values[s.tag_name] = {
            value: p.value,
            quality: p.quality || 'GOOD'
          };
          if (p.quality && p.quality !== 'GOOD') {
            rowItem.quality = p.quality;
          }
        });
      });

      // Convert to array and sort
      let pivotArr = Array.from(timePivot.values());
      pivotArr.sort((a, b) => b.rawTimestamp - a.rawTimestamp);
      setColumnarRows(pivotArr.slice(0, 60));
    } catch (err) {
      console.warn('Datatable load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tags, timeRange]);

  const handleDownloadCSV = () => {
    if (viewMode === 'columns') {
      // Export pivoted CSV with tags as columns
      const headers = ['Timestamp', ...tags];
      const csvLines = [headers.join(',')];
      columnarRows.forEach(r => {
        const rowVals = [r.isoTime];
        tags.forEach(t => {
          const v = r.values[t]?.value;
          rowVals.push(v !== undefined && v !== null ? v : '');
        });
        csvLines.push(rowVals.join(','));
      });
      const blob = new Blob([csvLines.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `telemetry-columns-${Date.now()}.csv`;
      a.click();
    } else {
      const url = `/api/v1/query/export?tags=${tags.join(',')}&time_from=${timeRange}&time_to=now`;
      window.open(url, '_blank');
    }
  };

  // Build instantaneous LIVE row from liveTelemetry
  const liveRow = useMemo(() => {
    if (!liveTelemetry || Object.keys(liveTelemetry).length === 0) return null;
    const values = {};
    let hasLive = false;
    tags.forEach(t => {
      if (liveTelemetry[t] !== undefined) {
        hasLive = true;
        const valObj = liveTelemetry[t];
        values[t] = {
          value: typeof valObj === 'object' ? valObj.value : valObj,
          quality: typeof valObj === 'object' ? (valObj.quality || 'GOOD') : 'GOOD'
        };
      }
    });
    if (!hasLive) return null;
    return {
      timestamp: 'LIVE NOW',
      rawTimestamp: Date.now(),
      isLive: true,
      values,
      quality: 'GOOD'
    };
  }, [liveTelemetry, tags]);

  // Filter rows by search term
  const displayedRows = useMemo(() => {
    let list = [...columnarRows];
    if (sortAsc) {
      list.sort((a, b) => a.rawTimestamp - b.rawTimestamp);
    } else {
      list.sort((a, b) => b.rawTimestamp - a.rawTimestamp);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r => {
        if (r.timestamp.toLowerCase().includes(q)) return true;
        return Object.entries(r.values).some(([tag, v]) => 
          tag.toLowerCase().includes(q) || String(v.value).includes(q)
        );
      });
    }
    return list;
  }, [columnarRows, search, sortAsc]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#0b0f17' }}>
      {/* Table Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 10px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(255,255,255,0.015)',
        gap: '8px',
        flexWrap: 'wrap'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, maxWidth: '220px' }}>
          <Search size={12} color="#64748b" style={{ position: 'absolute', left: '8px', top: '7px' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search values..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '26px', height: '26px', fontSize: '0.72rem', width: '100%' }}
          />
        </div>

        {/* View Mode & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Mode Toggle */}
          <div style={{
            display: 'inline-flex',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '4px',
            padding: '2px',
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
            <button
              onClick={() => setViewMode('columns')}
              title="Tags as Columns (Matrix View)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                fontSize: '0.68rem',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                background: viewMode === 'columns' ? '#0284c7' : 'transparent',
                color: viewMode === 'columns' ? '#fff' : '#94a3b8',
                fontWeight: viewMode === 'columns' ? 600 : 400
              }}
            >
              <Columns size={11} />
              <span>Tags in Columns</span>
            </button>
            <button
              onClick={() => setViewMode('rows')}
              title="Tags as Individual Rows"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                fontSize: '0.68rem',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                background: viewMode === 'rows' ? '#0284c7' : 'transparent',
                color: viewMode === 'rows' ? '#fff' : '#94a3b8',
                fontWeight: viewMode === 'rows' ? 600 : 400
              }}
            >
              <Rows size={11} />
              <span>Rows</span>
            </button>
          </div>

          {/* Sort Order */}
          <button 
            className="btn" 
            onClick={() => setSortAsc(!sortAsc)} 
            title={sortAsc ? "Sort Newest First" : "Sort Oldest First"}
            style={{ padding: '3px 8px', fontSize: '0.72rem' }}
          >
            <ArrowUpDown size={11} />
          </button>

          {/* Refresh */}
          <button className="btn" onClick={loadData} title="Refresh Table" style={{ padding: '3px 8px', fontSize: '0.72rem' }}>
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
          </button>

          {/* Export */}
          <button className="btn btn-primary" onClick={handleDownloadCSV} title="Export CSV" style={{ padding: '3px 8px', fontSize: '0.72rem' }}>
            <FileSpreadsheet size={11} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        {viewMode === 'columns' ? (
          /* ========================================================
             PRIMARY MODE: TAGS AS COLUMNS (PIVOTED WIDE TABLE)
             ======================================================== */
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.73rem', textAlign: 'left', minWidth: `${tags.length * 120 + 160}px` }}>
            <thead>
              <tr style={{ background: '#111827', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.1)', position: 'sticky', top: 0, zIndex: 10 }}>
                {/* Timestamp Column */}
                <th style={{ padding: '8px 10px', width: '110px', fontWeight: 600, color: '#38bdf8' }}>
                  Timestamp
                </th>

                {/* Each Tag as a Column */}
                {tags.map(t => {
                  const m = tagMetaMap[t] || { name: t, units: '' };
                  return (
                    <th key={t} style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ color: '#f1f5f9', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem' }}>
                        {t}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 400, marginTop: '1px' }}>
                        {m.units ? `[${m.units}]` : m.displayName}
                      </div>
                    </th>
                  );
                })}

                {/* Overall Quality */}
                <th style={{ padding: '8px 10px', width: '80px', textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
                  Quality
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Highlighted Real-Time LIVE Row */}
              {liveRow && (
                <tr style={{
                  background: 'rgba(2, 132, 199, 0.12)',
                  borderBottom: '2px solid rgba(56, 189, 248, 0.4)',
                  position: 'sticky',
                  top: '41px',
                  zIndex: 9
                }}>
                  <td style={{ padding: '6px 10px', color: '#38bdf8', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#38bdf8', animation: 'pulse 1.5s infinite' }} />
                      LIVE
                    </span>
                  </td>
                  {tags.map(t => {
                    const item = liveRow.values[t];
                    const num = item?.value !== undefined && item?.value !== null ? Number(item.value).toFixed(2) : '--';
                    return (
                      <td key={t} style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, color: '#38bdf8', fontFamily: 'JetBrains Mono, monospace', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
                        {num}
                      </td>
                    );
                  })}
                  <td style={{ padding: '6px 10px', textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ padding: '1px 5px', borderRadius: '3px', fontSize: '0.62rem', fontWeight: 700, background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>
                      GOOD
                    </span>
                  </td>
                </tr>
              )}

              {/* Historical Columnar Rows */}
              {displayedRows.length === 0 ? (
                <tr>
                  <td colSpan={tags.length + 2} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                    {loading ? 'Streaming process telemetry...' : 'No telemetry data found for the selected time range.'}
                  </td>
                </tr>
              ) : (
                displayedRows.map((r, i) => (
                  <tr 
                    key={r.rawTimestamp + '_' + i} 
                    style={{ 
                      borderBottom: '1px solid rgba(255,255,255,0.03)', 
                      background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.012)'
                    }}
                  >
                    {/* Timestamp */}
                    <td style={{ padding: '5px 10px', color: '#64748b', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.71rem' }}>
                      {r.timestamp}
                    </td>

                    {/* Tag Values in Columns */}
                    {tags.map(t => {
                      const item = r.values[t];
                      const val = item?.value !== undefined && item?.value !== null ? Number(item.value).toFixed(2) : '--';
                      const isGood = !item || item.quality === 'GOOD';
                      return (
                        <td 
                          key={t} 
                          style={{ 
                            padding: '5px 10px', 
                            textAlign: 'right', 
                            fontWeight: 500, 
                            fontFamily: 'JetBrains Mono, monospace', 
                            color: isGood ? '#f1f5f9' : '#f59e0b',
                            borderLeft: '1px solid rgba(255,255,255,0.03)'
                          }}
                        >
                          {val}
                        </td>
                      );
                    })}

                    {/* Quality */}
                    <td style={{ padding: '5px 10px', textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.03)' }}>
                      <span style={{
                        padding: '1px 5px',
                        borderRadius: '3px',
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        background: r.quality === 'GOOD' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.15)',
                        color: r.quality === 'GOOD' ? '#10b981' : '#f59e0b'
                      }}>
                        {r.quality}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          /* ========================================================
             SECONDARY MODE: NARROW ROWS BY TAG
             ======================================================== */
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.73rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#111827', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '6px 8px' }}>Timestamp</th>
                <th style={{ padding: '6px 8px' }}>Tag Name</th>
                <th style={{ padding: '6px 8px' }}>Measurement</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Process Value</th>
                <th style={{ padding: '6px 8px', textAlign: 'center' }}>Quality</th>
              </tr>
            </thead>
            <tbody>
              {displayedRows.flatMap((r, i) => 
                tags.map(t => {
                  const m = tagMetaMap[t] || { name: t, units: '' };
                  const item = r.values[t];
                  if (!item) return null;
                  return (
                    <tr key={r.rawTimestamp + '_' + t} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '5px 8px', color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>{r.timestamp}</td>
                      <td style={{ padding: '5px 8px', color: '#38bdf8', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>{t}</td>
                      <td style={{ padding: '5px 8px', color: '#cbd5e1' }}>{m.displayName}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: '#f1f5f9' }}>
                        {item.value !== null ? Number(item.value).toFixed(2) : '--'} <span style={{ color: '#94a3b8', fontSize: '0.68rem' }}>{m.units}</span>
                      </td>
                      <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                        <span style={{ padding: '1px 5px', borderRadius: '3px', fontSize: '0.62rem', fontWeight: 700, background: item.quality === 'GOOD' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: item.quality === 'GOOD' ? '#10b981' : '#f59e0b' }}>
                          {item.quality}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
