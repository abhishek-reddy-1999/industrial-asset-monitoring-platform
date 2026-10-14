import json
import datetime
import math
import random
from sqlalchemy import select, delete
from app.db.database import AsyncSessionLocal, engine, Base
from app.config import settings
from app.db.models import (
    AssetNode, Tag, Dashboard, AlarmRule, AHIAssetHealth, HistoricalPoint,
    FunctionBlockTemplate, FunctionBlockExecution, Device, BrokerConfig, ActivityLog
)

async def init_and_seed_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    if not settings.seed_initial_data:
        print("Initial database seed disabled by configuration (clean canvas mode).")
        return

    async with AsyncSessionLocal() as session:
        # Check if dashboards already have all new widgets
        d_cdu = (await session.execute(select(Dashboard).where(Dashboard.slug == "refinery-cdu-overview"))).scalars().first()
        dashboards_need_seed = not (d_cdu and "p_script" in d_cdu.layout)

        if dashboards_need_seed:
            print("Seeding/Expanding multi-unit plant assets and dashboards...")
            await session.execute(delete(Dashboard))
        await session.commit()

        # Check existing enterprise root
        root_res = await session.execute(select(AssetNode).where(AssetNode.level == "ENTERPRISE"))
        enterprise = root_res.scalars().first()

        if not enterprise:
            enterprise = AssetNode(name="Yokogawa Global Energy", level="ENTERPRISE", path="YGE", description="Corporate Operations")
            session.add(enterprise)
            await session.flush()

            site = AssetNode(name="Singapore Jurong Refinery", level="SITE", path="YGE/SGP-JURONG", parent_id=enterprise.id, description="Petrochemical & Refining Complex")
            session.add(site)
            await session.flush()

            area = AssetNode(name="Area 01 - Crude & Cracking Complex", level="AREA", path="YGE/SGP-JURONG/AREA-01", parent_id=site.id, description="Fractionation & Heavy Conversion")
            session.add(area)
            await session.flush()

            # Unit 1: Atmospheric Distillation Column C-101 (CDU)
            unit_cdu = AssetNode(name="Unit 100: Atmospheric Distillation C-101", level="UNIT", path="YGE/SGP-JURONG/AREA-01/C-101", parent_id=area.id, description="Main Crude Fractionator")
            # Unit 2: Vacuum Distillation Column C-201 (VDU)
            unit_vdu = AssetNode(name="Unit 200: Vacuum Distillation C-201", level="UNIT", path="YGE/SGP-JURONG/AREA-01/C-201", parent_id=area.id, description="Heavy Gas Oil Separation")
            # Unit 3: Fluid Catalytic Cracker R-301 (FCCU)
            unit_fcc = AssetNode(name="Unit 300: Fluid Catalytic Cracking R-301", level="UNIT", path="YGE/SGP-JURONG/AREA-01/R-301", parent_id=area.id, description="High-Conversion FCC Reactor")

            session.add_all([unit_cdu, unit_vdu, unit_fcc])
            await session.flush()

            # CDU Equipment
            eq_cdu_oh = AssetNode(name="CDU Overhead Drum V-101", level="EQUIPMENT", path="YGE/SGP-JURONG/AREA-01/C-101/V-101", parent_id=unit_cdu.id)
            eq_cdu_pump = AssetNode(name="Crude Feed Pump P-101A", level="EQUIPMENT", path="YGE/SGP-JURONG/AREA-01/C-101/P-101", parent_id=unit_cdu.id)
            # VDU Equipment
            eq_vdu_col = AssetNode(name="VDU Tower C-201", level="EQUIPMENT", path="YGE/SGP-JURONG/AREA-01/C-201/TOWER", parent_id=unit_vdu.id)
            eq_vdu_pump = AssetNode(name="VDU Bottoms Pump P-201", level="EQUIPMENT", path="YGE/SGP-JURONG/AREA-01/C-201/P-201", parent_id=unit_vdu.id)
            # FCCU Equipment
            eq_fcc_riser = AssetNode(name="FCC Riser & Regenerator", level="EQUIPMENT", path="YGE/SGP-JURONG/AREA-01/R-301/RISER", parent_id=unit_fcc.id)

            session.add_all([eq_cdu_oh, eq_cdu_pump, eq_vdu_col, eq_vdu_pump, eq_fcc_riser])
            await session.flush()

            # Extended Tags
            tags = [
                # CDU
                Tag(asset_id=eq_cdu_oh.id, tag_name="TIC_101.PV", display_name="CDU Overhead Temp", eng_units="°C", min_range=0.0, max_range=200.0, source_type="CENTUM_VP"),
                Tag(asset_id=unit_cdu.id, tag_name="TIC_102.PV", display_name="CDU Reboiler Temp", eng_units="°C", min_range=0.0, max_range=400.0, source_type="CENTUM_VP"),
                Tag(asset_id=eq_cdu_oh.id, tag_name="PIC_101.PV", display_name="CDU Overhead Pressure", eng_units="kPa", min_range=0.0, max_range=300.0, source_type="CENTUM_VP"),
                Tag(asset_id=eq_cdu_pump.id, tag_name="FIC_101.PV", display_name="Crude Feed Flow Rate", eng_units="m³/h", min_range=0.0, max_range=800.0, source_type="CENTUM_VP"),
                Tag(asset_id=eq_cdu_oh.id, tag_name="FIC_102.PV", display_name="Naphtha Reflux Flow", eng_units="m³/h", min_range=0.0, max_range=400.0, source_type="CENTUM_VP"),
                Tag(asset_id=unit_cdu.id, tag_name="LIC_101.PV", display_name="CDU Sump Level", eng_units="%", min_range=0.0, max_range=100.0, source_type="CENTUM_VP"),
                Tag(asset_id=eq_cdu_pump.id, tag_name="VIB_101.RMS", display_name="Feed Pump P-101A Vibration", eng_units="mm/s", min_range=0.0, max_range=15.0, source_type="AHI_SENSORS"),
                Tag(asset_id=unit_cdu.id, tag_name="AHI_C101.HEALTH", display_name="CDU Asset Health Index", eng_units="%", min_range=0.0, max_range=100.0, source_type="OPREX_AHI"),
                Tag(asset_id=unit_cdu.id, tag_name="AHI_C101.MT_DIST", display_name="CDU MT Anomaly Distance", eng_units="score", min_range=0.0, max_range=10.0, source_type="OPREX_PDA"),

                # VDU
                Tag(asset_id=eq_vdu_col.id, tag_name="VDU_TIC_201.PV", display_name="VDU Bottom Temp", eng_units="°C", min_range=0.0, max_range=450.0, source_type="CENTUM_VP"),
                Tag(asset_id=eq_vdu_col.id, tag_name="VDU_PIC_201.PV", display_name="VDU Ejector Pressure", eng_units="kPa", min_range=0.0, max_range=50.0, source_type="CENTUM_VP"),
                Tag(asset_id=eq_vdu_col.id, tag_name="VDU_FIC_201.PV", display_name="VDU Residue Flow", eng_units="m³/h", min_range=0.0, max_range=400.0, source_type="CENTUM_VP"),
                Tag(asset_id=eq_vdu_pump.id, tag_name="VDU_VIB_201.RMS", display_name="VDU Pump Vibration", eng_units="mm/s", min_range=0.0, max_range=15.0, source_type="AHI_SENSORS"),
                Tag(asset_id=unit_vdu.id, tag_name="VDU_AHI.HEALTH", display_name="VDU Asset Health Index", eng_units="%", min_range=0.0, max_range=100.0, source_type="OPREX_AHI"),
                Tag(asset_id=unit_vdu.id, tag_name="VDU_AHI.MT_DIST", display_name="VDU MT Anomaly Distance", eng_units="score", min_range=0.0, max_range=10.0, source_type="OPREX_PDA"),

                # FCCU
                Tag(asset_id=eq_fcc_riser.id, tag_name="FCC_TIC_301.PV", display_name="FCC Riser Outlet Temp", eng_units="°C", min_range=300.0, max_range=700.0, source_type="CENTUM_VP"),
                Tag(asset_id=eq_fcc_riser.id, tag_name="FCC_TIC_302.PV", display_name="FCC Regenerator Bed Temp", eng_units="°C", min_range=400.0, max_range=850.0, source_type="CENTUM_VP"),
                Tag(asset_id=eq_fcc_riser.id, tag_name="FCC_PIC_301.PV", display_name="FCC Reactor Pressure", eng_units="kPa", min_range=0.0, max_range=500.0, source_type="CENTUM_VP"),
                Tag(asset_id=unit_fcc.id, tag_name="FCC_AHI.HEALTH", display_name="FCC Asset Health Index", eng_units="%", min_range=0.0, max_range=100.0, source_type="OPREX_AHI"),
                Tag(asset_id=unit_fcc.id, tag_name="FCC_AHI.MT_DIST", display_name="FCC MT Anomaly Distance", eng_units="score", min_range=0.0, max_range=10.0, source_type="OPREX_PDA"),
            ]
            session.add_all(tags)

            # AHI Asset Health records
            session.add_all([
                AHIAssetHealth(equipment_tag="C-101", equipment_name="Atmospheric Distillation C-101", health_index=96.5, rul_days=342, mt_distance=1.18, risk_level="NORMAL"),
                AHIAssetHealth(equipment_tag="C-201", equipment_name="Vacuum Distillation C-201", health_index=94.2, rul_days=285, mt_distance=1.35, risk_level="NORMAL"),
                AHIAssetHealth(equipment_tag="R-301", equipment_name="Catalytic Cracking Reactor R-301", health_index=91.8, rul_days=210, mt_distance=1.85, risk_level="WATCH")
            ])

        # 3 Dashboards
        # Dashboard 1: CDU C-101 Overview
        layout_cdu = [
            {"id": "p1", "type": "timeseries", "title": "Column Thermal Profile (TIC_101 & TIC_102)", "tags": ["TIC_101.PV", "TIC_102.PV"], "x": 0, "y": 0, "w": 8, "h": 5},
            {"id": "p2", "type": "gauge", "title": "Overhead Pressure (PIC_101)", "tags": ["PIC_101.PV"], "min": 0, "max": 200, "unit": "kPa", "x": 8, "y": 0, "w": 4, "h": 5},
            {"id": "p_level", "type": "level_circle", "title": "Column Sump Level Indicator", "tags": ["LIC_101.PV"], "unit": "%", "x": 8, "y": 5, "w": 4, "h": 6},
            {"id": "p3", "type": "synoptic", "title": "Distillation Unit C-101 P&ID Mimic Diagram", "tags": ["TIC_101.PV", "PIC_101.PV", "FIC_101.PV", "LIC_101.PV", "VIB_101.RMS"], "x": 0, "y": 5, "w": 8, "h": 6},
            {"id": "p_sankey", "type": "sankey", "title": "Fractionation Mass & Energy Balance (Sankey Graph)", "tags": ["FIC_101.PV", "FIC_102.PV"], "x": 0, "y": 11, "w": 8, "h": 6},
            {"id": "p_script", "type": "echart_script", "title": "Custom ECharts: Column Thermal ΔT & Covariance Bars", "tags": ["TIC_101.PV", "TIC_102.PV"], "customScript": "const top = Number(context.liveTelemetry['TIC_101.PV']?.value || 118);\nconst bot = Number(context.liveTelemetry['TIC_102.PV']?.value || 235);\nconst deltaT = (bot - top).toFixed(1);\nconst mt = Number(context.liveTelemetry['AHI_C101.MT_DIST']?.value || 1.18);\n\nreturn {\n  backgroundColor: 'transparent',\n  tooltip: { trigger: 'axis' },\n  grid: { left: '8%', right: '8%', top: '20%', bottom: '20%' },\n  xAxis: {\n    type: 'category',\n    data: ['TIC-101 Top', 'TIC-102 Bot', 'Column ΔT', 'MT-Dist x50'],\n    axisLabel: { color: '#94a3b8', fontSize: 10 }\n  },\n  yAxis: {\n    type: 'value',\n    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },\n    axisLabel: { color: '#64748b', fontSize: 10 }\n  },\n  series: [{\n    type: 'bar',\n    barWidth: 28,\n    data: [\n      { value: top, itemStyle: { color: '#38bdf8', borderRadius: [4, 4, 0, 0] } },\n      { value: bot, itemStyle: { color: '#f59e0b', borderRadius: [4, 4, 0, 0] } },\n      { value: Number(deltaT), itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] } },\n      { value: Number((mt * 50).toFixed(1)), itemStyle: { color: '#a855f7', borderRadius: [4, 4, 0, 0] } }\n    ],\n    label: { show: true, position: 'top', color: '#fff', fontWeight: 'bold' }\n  }]\n};", "x": 8, "y": 11, "w": 4, "h": 6},
            {"id": "p_bullet", "type": "bullet_graph", "title": "Overhead Temp Bullet Graph (Target 125°C)", "tags": ["TIC_101.PV"], "target": 125, "max": 180, "x": 0, "y": 17, "w": 6, "h": 5},
            {"id": "p6", "type": "alarms", "title": "Active Industrial Alarms & Event Log", "tags": [], "x": 6, "y": 17, "w": 6, "h": 5}
        ]

        # Dashboard 2: OpreX Asset Health & Anomaly Diagnostics
        layout_ahi = [
            {"id": "p_ahi_1", "type": "mt_anomaly", "title": "CDU C-101 Mahalanobis-Taguchi Multivariate Anomaly", "tags": ["AHI_C101.MT_DIST", "AHI_C101.HEALTH"], "x": 0, "y": 0, "w": 6, "h": 6},
            {"id": "p_correl", "type": "correlation_matrix", "title": "Analytic Correlation Matrix (Covariance Heatmap)", "tags": [], "x": 6, "y": 0, "w": 6, "h": 6},
            {"id": "p_floor", "type": "floor_heatmap", "title": "Furnace Deck Floor Heat Map (°C)", "tags": ["TIC_101.PV", "TIC_102.PV"], "x": 0, "y": 6, "w": 6, "h": 6},
            {"id": "p_states", "type": "state_timeline", "title": "Pump Fleet Discrete State Timeline", "tags": [], "x": 6, "y": 6, "w": 6, "h": 6},
            {"id": "p_card", "type": "card", "title": "Asset Health Insights Card (AHI Index)", "tags": ["AHI_C101.HEALTH"], "unit": "%", "x": 0, "y": 12, "w": 4, "h": 5},
            {"id": "p_ahi_3", "type": "gauge", "title": "Feed Pump DE Vibration", "tags": ["VIB_101.RMS"], "min": 0, "max": 10, "unit": "mm/s", "x": 4, "y": 12, "w": 4, "h": 5},
            {"id": "p_loader", "type": "dynamic_loader", "title": "Crude Booster Dynamic Step Loader", "tags": ["FIC_101.PV"], "max": 800, "unit": "m³/h", "x": 8, "y": 12, "w": 4, "h": 5},
            {"id": "p_ahi_5", "type": "alarms", "title": "Predictive Maintenance & Asset Alerts", "tags": [], "x": 0, "y": 17, "w": 12, "h": 5}
        ]

        # Dashboard 3: Plant-Wide Fleet Monitoring
        layout_plant = [
            {"id": "p_fl_1", "type": "timeseries", "title": "Reactor & Column Peak Temperatures (CDU / VDU / FCC)", "tags": ["TIC_102.PV", "VDU_TIC_201.PV", "FCC_TIC_301.PV"], "x": 0, "y": 0, "w": 8, "h": 5},
            {"id": "p_fl_2", "type": "gauge", "title": "FCC Reactor Pressure", "tags": ["FCC_PIC_301.PV"], "min": 0, "max": 500, "unit": "kPa", "x": 8, "y": 0, "w": 4, "h": 5},
            {"id": "p_dt", "type": "datatable", "title": "Fleet Multi-Tag Timeseries Datatable", "tags": ["TIC_101.PV", "TIC_102.PV", "PIC_101.PV", "FIC_101.PV", "VDU_TIC_201.PV", "FCC_TIC_301.PV"], "x": 0, "y": 5, "w": 8, "h": 6},
            {"id": "p_pie", "type": "piechart", "title": "Refinery Product Yield Distribution (Pie Chart)", "tags": ["FIC_101.PV"], "x": 8, "y": 5, "w": 4, "h": 6},
            {"id": "p_fl_5", "type": "alarms", "title": "Global Alarm Matrix (ISA-18.2)", "tags": [], "x": 0, "y": 11, "w": 12, "h": 5}
        ]

        if dashboards_need_seed:
            layout_master = [
                {"id": "p_kpi_1", "type": "singlestat", "title": "CDU Health Score", "tags": ["AHI_C101.HEALTH"], "unit": "%", "x": 0, "y": 0, "w": 3, "h": 3},
                {"id": "p_kpi_2", "type": "singlestat", "title": "Crude Feed Flow Rate", "tags": ["FIC_101.PV"], "unit": "m³/h", "x": 3, "y": 0, "w": 3, "h": 3},
                {"id": "p_kpi_3", "type": "singlestat", "title": "Fractionator Overhead Pressure", "tags": ["PIC_101.PV"], "unit": "kPa", "x": 6, "y": 0, "w": 3, "h": 3},
                {"id": "p_kpi_4", "type": "singlestat", "title": "Feed Pump Vibration RMS", "tags": ["VIB_101.RMS"], "unit": "mm/s", "x": 9, "y": 0, "w": 3, "h": 3},
                {"id": "p_digital_twin_1", "type": "digital_twin", "title": "ThingsBoard Digital Twin • Distillation Train C-101 Synoptic", "tags": ["TIC_101.PV", "PIC_101.PV", "FIC_101.PV", "LIC_101.PV", "TIC_102.PV", "VIB_101.RMS", "FIC_102.PV"], "x": 0, "y": 3, "w": 8, "h": 6},
                {"id": "p_rpc_1", "type": "rpc_control", "title": "ThingsBoard RPC Edge Actuator & Downlink Control", "tags": ["CRUDE_FEED_PUMP_101.STATE"], "x": 8, "y": 3, "w": 4, "h": 6},
                {"id": "p_gauge_1", "type": "gauge", "title": "Bourdon Tube Overhead Pressure (PIC_101)", "tags": ["PIC_101.PV"], "min": 0, "max": 250, "unit": "kPa", "gaugeAngle": "speedometer", "gaugeStyle": "pointer", "x": 0, "y": 9, "w": 4, "h": 5},
                {"id": "p_gauge_2", "type": "gauge", "title": "Overhead Column Temperature (TIC_101)", "tags": ["TIC_101.PV"], "min": 0, "max": 200, "unit": "°C", "gaugeAngle": "speedometer", "gaugeStyle": "pointer", "x": 4, "y": 9, "w": 4, "h": 5},
                {"id": "p_level_1", "type": "level_circle", "title": "Fractionator Sump Liquid Level (LIC_101)", "tags": ["LIC_101.PV"], "unit": "%", "x": 8, "y": 9, "w": 4, "h": 5},
                {"id": "p_trend_1", "type": "timeseries", "title": "Multi-Pen Plant Historian Trend (Thermal, Pressure & Flow Profile)", "tags": ["TIC_101.PV", "TIC_102.PV", "PIC_101.PV", "FIC_101.PV"], "curveStyle": "smooth", "showArea": True, "x": 0, "y": 14, "w": 8, "h": 6},
                {"id": "p_mt_1", "type": "mt_anomaly", "title": "Mahalanobis-Taguchi Multivariate Anomaly Radar", "tags": ["AHI_C101.MT_DIST", "AHI_C101.HEALTH"], "x": 8, "y": 14, "w": 4, "h": 6},
                {"id": "p_datatable_1", "type": "datatable", "title": "Historical Process Telemetry Matrix (Columnar Wide Data)", "tags": ["TIC_101.PV", "TIC_102.PV", "PIC_101.PV", "FIC_101.PV", "LIC_101.PV", "VIB_101.RMS"], "displayMode": "columns", "x": 0, "y": 20, "w": 7, "h": 6},
                {"id": "p_sankey_1", "type": "sankey", "title": "Crude Fractionation Mass & Energy Balance", "tags": ["FIC_101.PV", "FIC_102.PV"], "x": 7, "y": 20, "w": 5, "h": 6},
                {"id": "p_alarms_1", "type": "alarms_table", "title": "ThingsBoard & Yokogawa ISA-18.2 Active Alarms Console", "tags": [], "x": 0, "y": 26, "w": 12, "h": 5}
            ]

            master = Dashboard(
                slug="master-plant-dashboard",
                title="ThingsBoard & Yokogawa Master Operations & Digital Twin",
                description="Unified single industrial operational dashboard with live ThingsBoard Digital Twin SCADA synoptics, gauges, trends, RPC controls, MT anomaly radar, and ISA-18.2 alarms.",
                category="Plant-Wide Operations & Digital Twin",
                time_range="now-15m",
                refresh_interval="1s",
                layout=json.dumps(layout_master)
            )
            session.add(master)

        # No dummy baseline points generated automatically - relies on real external CSV / Node-RED / MQTT ingestion
        await session.commit()
        print("Successfully verified plant dashboards, assets, and tag metadata!")

    # Seed Yokogawa Data Management (DM) Activities if not yet seeded
    async with AsyncSessionLocal() as session:
        fb_check = (await session.execute(select(FunctionBlockTemplate))).scalars().first()
        if not fb_check:
            print("Seeding Yokogawa Data Management (DM) Activities...")
            # 1. Function Block Templates
            t1 = FunctionBlockTemplate(
                template_code="FB_MT_ANOMALY",
                name="Mahalanobis-Taguchi Multivariate Anomaly",
                category="Analytics",
                description="Calculates normalized multivariate Mahalanobis distance from baseline covariance matrix to detect early process anomalies.",
                inputs_schema=json.dumps([
                    {"name": "temp_top", "type": "Float", "unit": "°C", "default": 118.0},
                    {"name": "temp_bottom", "type": "Float", "unit": "°C", "default": 235.0},
                    {"name": "pressure", "type": "Float", "unit": "kPa", "default": 145.0},
                    {"name": "vibration", "type": "Float", "unit": "mm/s", "default": 2.1}
                ]),
                outputs_schema=json.dumps([
                    {"name": "mt_distance", "type": "Float", "unit": "score"},
                    {"name": "is_anomaly", "type": "Boolean", "unit": ""}
                ]),
                formula_code="""/**
 * Yokogawa OpreX PDA Mahalanobis-Taguchi Multivariate Anomaly
 * @param {Object} inputs - Process sensor inputs: temp_top, temp_bottom, pressure, vibration
 * @returns {Object} Calculated MT distance score and anomaly flag
 */
function execute(inputs) {
  const top = Number(inputs.temp_top || 118.0);
  const bot = Number(inputs.temp_bottom || 235.0);
  const press = Number(inputs.pressure || 145.0);
  const vib = Number(inputs.vibration || 2.1);

  // Normalized Mahalanobis vector calculation against baseline covariance
  const z_top = (top - 118.0) / 4.5;
  const z_bot = (bot - 235.0) / 6.2;
  const z_press = (press - 145.0) / 5.0;
  const z_vib = (vib - 2.1) / 0.4;

  const mt_sq = (z_top*z_top + z_bot*z_bot + z_press*z_press + z_vib*z_vib) / 4.0;
  const mt_distance = Number(Math.sqrt(mt_sq).toFixed(2));
  const is_anomaly = mt_distance > 3.0;

  return {
    mt_distance: mt_distance,
    is_anomaly: is_anomaly,
    health_status: is_anomaly ? 'ANOMALY_DETECTED' : 'NORMAL'
  };
}""",
                version="v2.1"
            )
            t2 = FunctionBlockTemplate(
                template_code="FB_DELTA_T",
                name="Distillation Column Thermal Delta",
                category="Calculation",
                description="Computes vertical temperature gradient across fractionation trays for vapor-liquid separation control.",
                inputs_schema=json.dumps([
                    {"name": "t_reboiler", "type": "Float", "unit": "°C", "default": 235.0},
                    {"name": "t_overhead", "type": "Float", "unit": "°C", "default": 118.0}
                ]),
                outputs_schema=json.dumps([
                    {"name": "delta_t", "type": "Float", "unit": "°C"},
                    {"name": "gradient_status", "type": "String", "unit": ""}
                ]),
                formula_code="""/**
 * Fractionation Column Thermal Gradient Delta
 * @param {Object} inputs - t_reboiler, t_overhead
 * @returns {Object} delta_t and gradient status
 */
function execute(inputs) {
  const top = Number(inputs.t_overhead || 118.0);
  const bot = Number(inputs.t_reboiler || 235.0);
  const dt = Number((bot - top).toFixed(2));
  
  let status = 'NORMAL';
  if (dt > 130.0) status = 'EXCESSIVE_REBOIL';
  if (dt < 95.0) status = 'INSUFFICIENT_SEPARATION';

  return {
    delta_t: dt,
    gradient_status: status
  };
}""",
                version="v2.0"
            )
            t3 = FunctionBlockTemplate(
                template_code="FB_PUMP_CAVITATION",
                name="Centrifugal Pump NPSH & Cavitation Risk",
                category="Anomaly",
                description="Evaluates Net Positive Suction Head (NPSH) margin against vapor pressure to predict impeller cavitation.",
                inputs_schema=json.dumps([
                    {"name": "suction_pressure", "type": "Float", "unit": "kPa", "default": 120.0},
                    {"name": "liquid_temp", "type": "Float", "unit": "°C", "default": 65.0},
                    {"name": "flow_rate", "type": "Float", "unit": "m³/h", "default": 550.0}
                ]),
                outputs_schema=json.dumps([
                    {"name": "npsh_margin", "type": "Float", "unit": "m"},
                    {"name": "cavitation_risk", "type": "String", "unit": ""}
                ]),
                formula_code="""/**
 * Centrifugal Pump NPSH Margin & Impeller Cavitation Risk
 * @param {Object} inputs - suction_pressure, liquid_temp, flow_rate
 * @returns {Object} npsh_margin and cavitation_risk
 */
function execute(inputs) {
  const p_suction = Number(inputs.suction_pressure || 120.0);
  const temp = Number(inputs.liquid_temp || 65.0);
  const flow = Number(inputs.flow_rate || 550.0);

  // Vapor pressure estimate for hydrocarbon mixture
  const p_vap = 0.5 * Math.pow(temp / 50.0, 2.2);
  const head_suction = (p_suction - p_vap) * 0.102;
  const npsh_margin = Number((head_suction - 3.2).toFixed(2));

  let risk = 'LOW';
  if (npsh_margin < 0.8) risk = 'HIGH_CAVITATION_ALERT';
  else if (npsh_margin < 1.5) risk = 'MODERATE';

  return {
    npsh_margin: npsh_margin,
    cavitation_risk: risk
  };
}""",
                version="v2.0"
            )
            t4 = FunctionBlockTemplate(
                template_code="FB_REFLUX_RATIO",
                name="Fractionator Reflux Ratio (R/D)",
                category="Calculation",
                description="Calculates ratio between external reflux return and overhead product draw rate.",
                inputs_schema=json.dumps([
                    {"name": "reflux_flow", "type": "Float", "unit": "m³/h", "default": 185.0},
                    {"name": "distillate_flow", "type": "Float", "unit": "m³/h", "default": 95.0}
                ]),
                outputs_schema=json.dumps([
                    {"name": "reflux_ratio", "type": "Float", "unit": "ratio"}
                ]),
                formula_code="""/**
 * Distillation Reflux Ratio Calculation
 * @param {Object} inputs - reflux_flow, distillate_flow
 * @returns {Object} reflux_ratio
 */
function execute(inputs) {
  const reflux = Number(inputs.reflux_flow || 185.0);
  const distillate = Math.max(Number(inputs.distillate_flow || 95.0), 1.0);
  const ratio = Number((reflux / distillate).toFixed(2));

  return {
    reflux_ratio: ratio,
    reflux_status: (ratio >= 1.5 && ratio <= 2.8) ? 'OPTIMAL' : 'OFF_SPEC'
  };
}""",
                version="v2.0"
            )
            session.add_all([t1, t2, t3, t4])
            await session.flush()

            # 2. Function Block Executions (V2)
            e1 = FunctionBlockExecution(
                execution_name="CDU C-101 Mahalanobis Distance Engine",
                template_id=t1.id,
                target_tag="AHI_C101.MT_DIST",
                schedule_interval="1s",
                status="ACTIVE",
                last_execution_ms=8.5,
                last_output_value=1.18,
                input_bindings=json.dumps({
                    "temp_top": "TIC_101.PV",
                    "temp_bottom": "TIC_102.PV",
                    "pressure": "PIC_101.PV",
                    "vibration": "VIB_101.RMS"
                }),
                execution_log="Normal cyclic execution. MT Distance 1.18 within 3.0 baseline limit."
            )
            e2 = FunctionBlockExecution(
                execution_name="Column C-101 Thermal Gradient Delta",
                template_id=t2.id,
                target_tag="CDU_DELTA_T.CALC",
                schedule_interval="1s",
                status="ACTIVE",
                last_execution_ms=2.1,
                last_output_value=116.8,
                input_bindings=json.dumps({
                    "t_reboiler": "TIC_102.PV",
                    "t_overhead": "TIC_101.PV"
                }),
                execution_log="Tray separation thermal gradient steady at 116.8 °C."
            )
            e3 = FunctionBlockExecution(
                execution_name="Crude Feed Pump P-101A Cavitation Monitor",
                template_id=t3.id,
                target_tag="P101A_NPSH.CALC",
                schedule_interval="5s",
                status="ACTIVE",
                last_execution_ms=4.3,
                last_output_value=2.45,
                input_bindings=json.dumps({
                    "suction_pressure": "PIC_101.PV",
                    "liquid_temp": "TIC_101.PV",
                    "flow_rate": "FIC_101.PV"
                }),
                execution_log="NPSH margin 2.45m - low cavitation risk."
            )
            session.add_all([e1, e2, e3])

            # 3. Devices
            d1 = Device(
                device_id="DEV-EJX110A-01",
                name="CDU Overhead Differential Pressure",
                model="Yokogawa DPharp EJX110A",
                device_type="Transmitter",
                protocol="HART 7",
                ip_address="10.20.1.101",
                status="ONLINE",
                firmware_version="FW-4.5.2",
                battery_level=100
            )
            d2 = Device(
                device_id="DEV-YTA610-01",
                name="CDU Reboiler Multi-Point RTD",
                model="Yokogawa YTA610 Dual Sensor",
                device_type="Transmitter",
                protocol="Foundation Fieldbus H1",
                ip_address="10.20.1.102",
                status="ONLINE",
                firmware_version="FW-3.1.8",
                battery_level=100
            )
            d3 = Device(
                device_id="DEV-AXF050-01",
                name="Crude Feed Magnetic Flowmeter",
                model="Yokogawa ADMAG Total Insight AXF",
                device_type="Flowmeter",
                protocol="Modbus TCP",
                ip_address="10.20.1.103",
                status="ONLINE",
                firmware_version="FW-2.8.0",
                battery_level=100
            )
            d4 = Device(
                device_id="DEV-GW-PRM-01",
                name="Yokogawa Plant Resource Manager Gateway",
                model="Yokogawa PRM Edge Gateway 3000",
                device_type="Gateway",
                protocol="OPC UA / Ethernet",
                ip_address="10.20.1.10",
                status="ONLINE",
                firmware_version="FW-6.0.1",
                battery_level=100
            )
            d5 = Device(
                device_id="DEV-YTA610-02",
                name="VDU Tower Bottom Wireless Temp",
                model="Yokogawa YTA510 ISA100 Wireless",
                device_type="Transmitter",
                protocol="WirelessHART / ISA100.11a",
                ip_address="10.20.2.105",
                status="ONLINE",
                firmware_version="FW-2.0.4",
                battery_level=94
            )
            session.add_all([d1, d2, d3, d4, d5])

            # 4. Brokers
            b1 = BrokerConfig(
                name="Yokogawa Data Model Broker (DBM)",
                broker_type="DBM_ONTOLOGY",
                endpoint_url="opc.tcp://127.0.0.1:4840",
                port=4840,
                topic_or_path="ns=2;s=Yokogawa.DBM.PlantHierarchy",
                status="CONNECTED",
                messages_per_sec=245.0,
                total_messages=1849200
            )
            b2 = BrokerConfig(
                name="CENTUM VP DCS OPC UA Gateway",
                broker_type="OPC_UA",
                endpoint_url="opc.tcp://10.20.1.15:4840",
                port=4840,
                topic_or_path="ns=2;s=CENTUM_VP.FCS0101",
                status="CONNECTED",
                messages_per_sec=192.5,
                total_messages=1432000
            )
            b3 = BrokerConfig(
                name="Industrial Redis Telemetry Stream",
                broker_type="REDIS_STREAM",
                endpoint_url="redis://127.0.0.1:6379/0",
                port=6379,
                topic_or_path="ydash:stream",
                status="CONNECTED",
                messages_per_sec=350.0,
                total_messages=3890120
            )
            b4 = BrokerConfig(
                name="Yokogawa Cloud AHI REST Pipeline",
                broker_type="REST_INGEST",
                endpoint_url="https://api.cloud.yokogawa.com/ahi/v2",
                port=443,
                topic_or_path="/v2/assets/telemetry",
                status="CONNECTED",
                messages_per_sec=52.0,
                total_messages=412000
            )
            session.add_all([b1, b2, b3, b4])

            # 5. Activity Log
            session.add_all([
                ActivityLog(category="ASSET", action="Asset Synchronized", user="oprex_admin", details="Refreshed ISA-95 asset tree from Data Model Broker", status="SUCCESS"),
                ActivityLog(category="BLOCK", action="Block Execution Started", user="system_scheduler", details="Started execution 'CDU C-101 Mahalanobis Distance Engine' (1s)", status="SUCCESS"),
                ActivityLog(category="DEVICE", action="Device Calibrated", user="j.tan@yokogawa.com", details="Yokogawa EJX110A differential pressure zero-point trim confirmed", status="SUCCESS"),
                ActivityLog(category="BROKER", action="Broker Connected", user="system", details="OPC UA connection established with CENTUM VP FCS0101 at 10.20.1.15", status="SUCCESS"),
                ActivityLog(category="ALARM", action="Alarm Limit Modified", user="lead_operator", details="Adjusted TIC_101.PV High alarm threshold from 135°C to 138°C", status="SUCCESS"),
                ActivityLog(category="SECURITY", action="User Role Assigned", user="security_admin", details="Assigned 'Plant Reliability Engineer' role to m.ross@yokogawa.com", status="SUCCESS")
            ])

            await session.commit()
            print("Successfully seeded all Yokogawa Data Management (DM) activities!")

