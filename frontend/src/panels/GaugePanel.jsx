import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

export default function GaugePanel({ panel, liveTelemetry }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const tag = panel.tags?.[0];
  const live = liveTelemetry?.[tag];
  const value = live ? Number(live.value) : (panel.fallbackValue ?? 145.2);
  const min = Number(panel.min || 0);
  const max = Number(panel.max || 200);
  const unit = panel.unit || live?.eng_units || 'kPa';

  const gaugeAngle = panel.gaugeAngle || 'speedometer'; // 'speedometer' | 'semicircle' | 'round'
  const gaugeStyle = panel.gaugeStyle || 'pointer'; // 'pointer' | 'progress'
  const splitNumber = Number(panel.splitNumber || 5);

  let startAngle = 225;
  let endAngle = -45;
  let centerPos = ['50%', '58%'];
  let radiusSize = '92%';

  if (gaugeAngle === 'semicircle') {
    startAngle = 180;
    endAngle = 0;
    centerPos = ['50%', '72%'];
    radiusSize = '100%';
  } else if (gaugeAngle === 'round') {
    startAngle = 240;
    endAngle = -60;
    centerPos = ['50%', '54%'];
    radiusSize = '90%';
  }

  const isProgress = gaugeStyle === 'progress';

  useEffect(() => {
    if (!chartRef.current) return;
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const option = {
      backgroundColor: 'transparent',
      series: [
        {
          type: 'gauge',
          center: centerPos,
          radius: radiusSize,
          startAngle: startAngle,
          endAngle: endAngle,
          min: min,
          max: max,
          splitNumber: splitNumber,
          progress: isProgress ? {
            show: true,
            overlap: false,
            roundCap: true,
            clip: false,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                { offset: 0, color: '#38bdf8' },
                { offset: 1, color: '#10b981' }
              ])
            }
          } : { show: false },
          axisLine: {
            lineStyle: {
              width: isProgress ? 16 : 14,
              color: isProgress ? [[1, 'rgba(255, 255, 255, 0.08)']] : [
                [0.6, '#10b981'],
                [0.85, '#f59e0b'],
                [1, '#f43f5e']
              ]
            }
          },
          pointer: isProgress ? { show: false } : {
            itemStyle: { color: panel.accentColor || '#38bdf8' },
            length: '65%',
            width: 4
          },
          axisTick: {
            distance: isProgress ? -20 : -14,
            length: 5,
            lineStyle: { color: 'rgba(255, 255, 255, 0.4)', width: 1 }
          },
          splitLine: {
            distance: isProgress ? -24 : -18,
            length: 10,
            lineStyle: { color: '#fff', width: 2 }
          },
          axisLabel: {
            color: '#94a3b8',
            distance: isProgress ? 26 : 22,
            fontSize: 10
          },
          detail: {
            valueAnimation: true,
            formatter: '{value} ' + unit,
            color: '#f1f5f9',
            fontSize: gaugeAngle === 'semicircle' ? 20 : 17,
            fontWeight: 'bold',
            offsetCenter: [0, gaugeAngle === 'semicircle' ? '-20%' : '35%']
          },
          title: {
            offsetCenter: [0, gaugeAngle === 'semicircle' ? '20%' : '60%'],
            color: '#64748b',
            fontSize: 11
          },
          data: [
            {
              value: Number(value.toFixed(1)),
              name: panel.tagAliases?.[tag] || live?.display_name || tag || 'Process Value'
            }
          ]
        }
      ]
    };

    chartInstance.current.setOption(option, false);
  }, [min, max, unit, gaugeAngle, gaugeStyle, splitNumber, panel.accentColor]);

  // Smooth live value update
  useEffect(() => {
    if (chartInstance.current && value !== undefined) {
      chartInstance.current.setOption({
        series: [{
          data: [{
            value: Number(value.toFixed(1)),
            name: panel.tagAliases?.[tag] || live?.display_name || tag || 'Process Value'
          }]
        }]
      }, false);
    }
  }, [value, tag]);

  // Resize handler
  useEffect(() => {
    let timer = setTimeout(() => chartInstance.current?.resize(), 80);
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
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
