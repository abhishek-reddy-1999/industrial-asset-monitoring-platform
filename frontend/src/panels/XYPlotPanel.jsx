import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { queryTimeSeries } from '../api/client';

export default function XYPlotPanel({ panel, timeRange }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const tagX = panel.tags?.[0] || 'PIC_101.PV';
  const tagY = panel.tags?.[1] || 'FIC_102.PV';

  useEffect(() => {
    let isMounted = true;
    if (!chartRef.current) return;
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    queryTimeSeries([tagX, tagY], timeRange, 'now')
      .then((res) => {
        if (!isMounted) return;
        const seriesX = res.series?.find(s => s.tag_name === tagX)?.datapoints || [];
        const seriesY = res.series?.find(s => s.tag_name === tagY)?.datapoints || [];

        const points = [];
        const len = Math.min(seriesX.length, seriesY.length);
        for (let i = 0; i < len; i++) {
          if (seriesX[i].value !== null && seriesY[i].value !== null) {
            points.push([seriesX[i].value, seriesY[i].value]);
          }
        }

        const option = {
          backgroundColor: 'transparent',
          tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(22, 29, 43, 0.95)',
            textStyle: { color: '#f1f5f9' },
            formatter: (params) => {
              return `<b>Operating Point</b><br/>${tagX}: ${params.value[0]}<br/>${tagY}: ${params.value[1]}`;
            }
          },
          grid: { left: '8%', right: '8%', top: '15%', bottom: '15%', containLabel: true },
          xAxis: {
            name: tagX,
            nameTextStyle: { color: '#94a3b8', fontSize: 10 },
            splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
            axisLabel: { color: '#64748b', fontSize: 10 }
          },
          yAxis: {
            name: tagY,
            nameTextStyle: { color: '#94a3b8', fontSize: 10 },
            splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
            axisLabel: { color: '#64748b', fontSize: 10 }
          },
          series: [
            {
              type: 'scatter',
              symbolSize: 8,
              data: points,
              itemStyle: {
                color: '#38bdf8',
                shadowBlur: 8,
                shadowColor: 'rgba(56, 189, 248, 0.5)'
              }
            }
          ]
        };

        chartInstance.current.setOption(option);
      })
      .catch(err => console.warn('XYPlot error:', err));

    const handleResize = () => chartInstance.current?.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      isMounted = false;
      window.removeEventListener('resize', handleResize);
    };
  }, [tagX, tagY, timeRange]);

  useEffect(() => {
    const timer = setTimeout(() => chartInstance.current?.resize(), 100);
    return () => clearTimeout(timer);
  }, [panel.w, panel.h]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
