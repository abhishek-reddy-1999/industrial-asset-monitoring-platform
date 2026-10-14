import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

const PALETTE = [
  '#38bdf8', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#a855f7', // Purple
  '#f43f5e', // Rose
  '#06b6d4', // Teal
  '#ec4899', // Pink
  '#6366f1', // Indigo
  '#84cc16'  // Lime
];

export default function PieDonutPanel({ panel, liveTelemetry }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const tags = Array.isArray(panel.tags) ? panel.tags.filter(Boolean) : [];
  const hasTags = tags.length > 0;
  const isSingleTag = tags.length === 1;

  // Visual style variants: 'donut' | 'pie' | 'ring' | 'half_donut' | 'rose'
  const chartStyle = panel.chartStyle || 'donut';
  const isPie = chartStyle === 'pie';
  const isRose = chartStyle === 'rose';
  const isRing = chartStyle === 'ring';
  const isHalfDonut = chartStyle === 'half_donut';
  const isDonut = !isPie;

  // Extract live values & determine data series
  let chartData = [];
  let centerMainText = '';
  let centerSubText = '';
  let unit = panel.unit || '';
  let tooltipFormatter = null;

  if (isSingleTag) {
    // -------------------------------------------------------------
    // CASE 1: EXACTLY ONE TAG MAPPED BY THE USER
    // Industrial Capacity / Ratio Donut
    // -------------------------------------------------------------
    const tag = tags[0];
    const live = liveTelemetry?.[tag];
    const rawVal = live?.value !== undefined ? Number(live.value) : (panel.fallbackValue ?? 75.0);
    
    // Auto-detect percentage units and ranges
    const isPercent = live?.eng_units === '%' || tag.includes('.HEALTH') || tag.startsWith('LIC_');
    const tagUnit = isPercent ? '%' : (live?.eng_units || panel.unit || '');
    unit = tagUnit;

    const min = isPercent ? 0 : Number(panel.min ?? (live?.min_range ?? 0));
    let max = isPercent ? 100 : (panel.max && panel.max > min && panel.unit === live?.eng_units ? panel.max : (live?.max_range || (panel.target ? panel.target * 1.35 : (rawVal > 100 ? Math.ceil(rawVal * 1.3) : 100))));
    if (isPercent) max = 100;

    const activeVal = Math.max(0, rawVal);
    const headroom = Math.max(0, max - activeVal);
    const pct = max > min ? Math.min(100, Math.round(((activeVal - min) / (max - min)) * 100)) : 100;
    
    const tagLabel = panel.tagAliases?.[tag] || live?.display_name || tag;
    const accentColor = panel.accentColor || '#38bdf8';

    const centerFormat = panel.centerFormat || 'value_pct';
    if (centerFormat === 'pct_only') {
      centerMainText = `${pct}%`;
      centerSubText = tagLabel;
    } else if (centerFormat === 'value_only') {
      centerMainText = `${activeVal.toFixed(1)}${unit ? ' ' + unit : ''}`;
      centerSubText = tagLabel;
    } else if (centerFormat === 'none') {
      centerMainText = '';
      centerSubText = '';
    } else {
      // Default: value + pct
      centerMainText = `${activeVal.toFixed(1)}${unit ? ' ' + unit : ''}`;
      centerSubText = `${pct}% Capacity`;
    }

    chartData = [
      {
        value: Number(activeVal.toFixed(2)),
        name: tagLabel,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [
            { offset: 0, color: accentColor },
            { offset: 1, color: '#0284c7' }
          ])
        }
      },
      {
        value: Number(headroom.toFixed(2)),
        name: 'Headroom / Unused',
        itemStyle: {
          color: 'rgba(255, 255, 255, 0.08)',
          borderColor: 'rgba(255, 255, 255, 0.15)',
          borderWidth: 1
        }
      }
    ];

    tooltipFormatter = (params) => {
      if (params.dataIndex === 0) {
        return `
          <div style="font-size:11px; font-weight:bold; color:#38bdf8; margin-bottom:4px;">${tagLabel}</div>
          <div>Process Tag: <span style="font-family:monospace; color:#fff;">${tag}</span></div>
          <div>Current Value: <b>${activeVal.toFixed(2)} ${unit}</b> (${pct}%)</div>
          <div>Operating Scale: <b>${min} - ${max} ${unit}</b></div>
        `;
      } else {
        return `
          <div style="font-size:11px; font-weight:bold; color:#94a3b8; margin-bottom:4px;">Remaining Headroom</div>
          <div>Available Capacity: <b>${headroom.toFixed(2)} ${unit}</b> (${100 - pct}%)</div>
          <div>Upper Scale Limit: <b>${max} ${unit}</b></div>
        `;
      }
    };
  } else if (tags.length > 1) {
    // -------------------------------------------------------------
    // CASE 2: MULTIPLE TAGS MAPPED BY THE USER
    // Proportional Slices
    // -------------------------------------------------------------
    let totalVal = 0;
    chartData = tags.map((t, idx) => {
      const live = liveTelemetry?.[t];
      const val = live?.value !== undefined ? Math.max(0, Number(live.value)) : 50;
      totalVal += val;
      const tagLabel = panel.tagAliases?.[t] || live?.display_name || t;
      const tUnit = live?.eng_units || unit;
      const color = PALETTE[idx % PALETTE.length];

      return {
        value: Number(val.toFixed(2)),
        name: tagLabel,
        tag: t,
        unit: tUnit,
        itemStyle: { color }
      };
    });

    const centerFormat = panel.centerFormat || 'value_pct';
    if (centerFormat === 'none') {
      centerMainText = '';
      centerSubText = '';
    } else {
      centerMainText = `${totalVal.toFixed(1)}${unit ? ' ' + unit : ''}`;
      centerSubText = `Total (${tags.length} Tags)`;
    }

    tooltipFormatter = (params) => {
      const d = params.data;
      return `
        <div style="font-size:11px; font-weight:bold; color:#38bdf8; margin-bottom:4px;">${d.name}</div>
        <div>Tag: <span style="font-family:monospace; color:#fff;">${d.tag || ''}</span></div>
        <div>Value: <b>${d.value} ${d.unit || unit}</b></div>
        <div>Proportion: <b>${params.percent}%</b></div>
      `;
    };
  } else {
    // -------------------------------------------------------------
    // CASE 3: NO TAGS CONFIGURED YET
    // Fallback to CDU Fractionation Yield cuts
    // -------------------------------------------------------------
    const feed = Number(liveTelemetry?.['FIC_101.PV']?.value || 450.0);
    centerMainText = `${feed.toFixed(0)} m³/h`;
    centerSubText = 'Crude Yield';

    chartData = [
      { value: Math.round(feed * 0.28), name: 'Overhead Naphtha', itemStyle: { color: '#38bdf8' } },
      { value: Math.round(feed * 0.18), name: 'Aviation Kerosene', itemStyle: { color: '#10b981' } },
      { value: Math.round(feed * 0.32), name: 'Diesel / Gas Oil', itemStyle: { color: '#6366f1' } },
      { value: Math.round(feed * 0.22), name: 'Heavy Residue', itemStyle: { color: '#f59e0b' } }
    ];

    tooltipFormatter = '{b}: <b>{c} m³/h ({d}%)</b>';
  }

  // Radius, Arc, and Layout calculations
  const innerR = panel.innerRadius !== undefined 
    ? `${panel.innerRadius}%` 
    : (isPie ? '0%' : isRing ? '72%' : isRose ? '30%' : isHalfDonut ? '56%' : '48%');

  const outerR = panel.outerRadius !== undefined 
    ? `${panel.outerRadius}%` 
    : (isHalfDonut ? '90%' : isRing ? '84%' : '74%');

  const startAngle = isHalfDonut ? 180 : (panel.startAngle ?? 90);
  const endAngle = isHalfDonut ? 0 : (panel.endAngle ?? -270);
  const centerPos = isHalfDonut ? ['50%', '75%'] : ['50%', '44%'];
  const padAngle = Number(panel.padAngle ?? (isDonut ? 2 : 0));
  const borderRadius = Number(panel.borderRadius ?? (isPie ? 0 : 5));

  const legendPos = panel.legendPosition || 'bottom';
  const showLegend = panel.showLegend !== false && legendPos !== 'hidden';

  // Smooth, non-blocking chart rendering
  useEffect(() => {
    if (!chartRef.current) return;
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: 'rgba(56, 189, 248, 0.3)',
        borderWidth: 1,
        textStyle: { color: '#f1f5f9', fontSize: 11 },
        padding: [8, 12],
        formatter: tooltipFormatter
      },
      legend: showLegend ? {
        ...(legendPos === 'right' 
          ? { orient: 'vertical', right: 8, top: 'middle' } 
          : { bottom: 2, left: 'center', orient: 'horizontal' }),
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { color: '#94a3b8', fontSize: 10 },
        formatter: (name) => name.length > 20 ? name.slice(0, 18) + '…' : name
      } : { show: false },
      series: [
        {
          name: panel.title || 'Ratio Breakdown',
          type: 'pie',
          radius: [innerR, outerR],
          center: centerPos,
          startAngle: startAngle,
          endAngle: endAngle,
          roseType: isRose ? 'radius' : false,
          padAngle: padAngle,
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: borderRadius,
            borderColor: '#0d131f',
            borderWidth: 2
          },
          label: {
            show: isDonut && Boolean(centerMainText),
            position: 'center',
            formatter: () => `{val|${centerMainText}}\n{sub|${centerSubText}}`,
            rich: {
              val: {
                fontSize: isSingleTag ? (isHalfDonut ? 18 : 15) : 13,
                fontWeight: 'bold',
                color: '#ffffff',
                lineHeight: isHalfDonut ? 22 : 20
              },
              sub: {
                fontSize: 9,
                color: '#94a3b8',
                lineHeight: 14
              }
            }
          },
          emphasis: {
            scale: true,
            scaleSize: 5,
            label: {
              show: isDonut && Boolean(centerMainText),
              formatter: () => `{val|${centerMainText}}\n{sub|${centerSubText}}`
            }
          },
          labelLine: { show: false },
          data: chartData
        }
      ]
    };

    // Use smooth merge update (false) to eliminate canvas thrashing and lag
    chartInstance.current.setOption(option, false);
  }, [
    chartStyle,
    innerR,
    outerR,
    startAngle,
    endAngle,
    padAngle,
    borderRadius,
    legendPos,
    showLegend,
    panel.accentColor,
    panel.title,
    centerMainText,
    centerSubText,
    JSON.stringify(chartData)
  ]);

  // Debounced resize handler on layout or window resize
  useEffect(() => {
    let timer = setTimeout(() => {
      chartInstance.current?.resize();
    }, 80);

    const handleResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => chartInstance.current?.resize(), 80);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [panel.w, panel.h]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* Mapped tag indicator badge */}
      {hasTags && (
        <div style={{
          position: 'absolute',
          top: '4px',
          right: '6px',
          zIndex: 10,
          fontSize: '0.65rem',
          padding: '2px 6px',
          borderRadius: '4px',
          background: 'rgba(56, 189, 248, 0.12)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          color: '#38bdf8',
          fontFamily: 'JetBrains Mono, monospace'
        }}>
          {isSingleTag ? tags[0] : `${tags.length} Tags`}
        </div>
      )}
      <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
