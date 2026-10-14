import uuid
import datetime
import json
import math
import re
import random
from typing import Dict, List, Any, Optional
from app.config import settings

def extract_payload_timestamp(payload: Any, template_keys: Optional[List[str]] = None) -> Optional[str]:
    if not isinstance(payload, dict):
        return None

    candidate_keys = []
    if template_keys:
        candidate_keys.extend(template_keys)
    candidate_keys.extend([
        "timestamp", "time", "ts", "timestampunix", "timestamp_utc",
        "datetime", "dateTime", "Timestamp", "Time", "date", "event_time", "packet_time"
    ])

    raw_val = None
    for k in candidate_keys:
        if k in payload and payload[k] is not None:
            raw_val = payload[k]
            break

    if raw_val is None:
        for sub_k in ["d", "data", "telemetry", "metrics", "values"]:
            if isinstance(payload.get(sub_k), dict):
                sub_dict = payload[sub_k]
                for k in candidate_keys:
                    if k in sub_dict and sub_dict[k] is not None:
                        raw_val = sub_dict[k]
                        break
            if raw_val is not None:
                break

    if raw_val is None:
        return None

    try:
        if isinstance(raw_val, (int, float)):
            sec = raw_val / 1000.0 if raw_val > 1e11 else float(raw_val)
            return datetime.datetime.utcfromtimestamp(sec).isoformat() + "Z"
        if isinstance(raw_val, str):
            s = raw_val.strip()
            if s.isdigit():
                num = int(s)
                sec = num / 1000.0 if num > 1e11 else float(num)
                return datetime.datetime.utcfromtimestamp(sec).isoformat() + "Z"
            clean_str = s.replace("Z", "+00:00")
            dt = datetime.datetime.fromisoformat(clean_str)
            if dt.tzinfo is not None:
                dt_utc = dt.astimezone(datetime.timezone.utc).replace(tzinfo=None)
            else:
                dt_utc = dt
            return dt_utc.isoformat() + "Z"
    except Exception:
        pass
    return None

def extract_nested_value(data: Any, key_path: str) -> Any:
    if not isinstance(data, (dict, list)) or not key_path:
        return None

    # 1. Direct key match at root
    if isinstance(data, dict):
        if key_path in data and data[key_path] is not None:
            return data[key_path]
        key_lower = key_path.lower()
        for k, v in data.items():
            if k.lower() == key_lower and v is not None:
                return v

    # Known prefixes to strip (e.g. "tags.FIC_101.PV" -> "FIC_101.PV")
    known_prefixes = ["tags.", "metrics.", "measurements.", "data.", "values.", "telemetry.", "d."]
    key_lower = key_path.lower()
    clean_key = key_path
    for kp in known_prefixes:
        if key_lower.startswith(kp):
            clean_key = key_path[len(kp):]
            break

    # 2. If clean_key is different, check if clean_key exists directly at data root
    if clean_key != key_path and isinstance(data, dict):
        if clean_key in data and data[clean_key] is not None:
            return data[clean_key]
        clean_lower = clean_key.lower()
        for k, v in data.items():
            if k.lower() == clean_lower and v is not None:
                return v

    # 3. If key_path starts with a prefix (e.g. "tags.FIC_101.PV")
    dot_idx = key_path.find(".")
    if dot_idx != -1 and isinstance(data, dict):
        prefix = key_path[:dot_idx]
        remainder = key_path[dot_idx + 1:]
        for k, v in data.items():
            if k.lower() == prefix.lower():
                container = v
                if isinstance(container, str) and (container.strip().startswith("{") or container.strip().startswith("[")):
                    try:
                        container = json.loads(container)
                    except Exception:
                        pass
                if isinstance(container, (dict, list)):
                    res = extract_nested_value(container, remainder)
                    if res is not None:
                        return res

    # 4. Known nested containers check (tags, metrics, measurements, data, values, telemetry, d)
    if isinstance(data, dict):
        known_containers = ["tags", "metrics", "measurements", "data", "values", "telemetry", "d"]
        for k, v in data.items():
            if k.lower() in known_containers:
                container = v
                if isinstance(container, str) and (container.strip().startswith("{") or container.strip().startswith("[")):
                    try:
                        container = json.loads(container)
                    except Exception:
                        pass
                if isinstance(container, (dict, list)):
                    res = extract_nested_value(container, clean_key)
                    if res is not None:
                        return res
                    res2 = extract_nested_value(container, key_path)
                    if res2 is not None:
                        return res2

    # 5. List of tag objects
    if isinstance(data, list):
        clean_target = clean_key.lower()
        for item in data:
            if isinstance(item, dict):
                tag_name = str(item.get("name") or item.get("tag") or item.get("key") or item.get("id") or item.get("tag_name") or "").lower()
                if tag_name == clean_target or tag_name == key_lower:
                    for v_field in ["value", "val", "v", "data", "reading"]:
                        if v_field in item and item[v_field] is not None:
                            return item[v_field]
                    return item

    # 6. Standard dot traversal on key_path and clean_key
    paths_to_try = [key_path]
    if clean_key != key_path:
        paths_to_try.append(clean_key)
    for p in paths_to_try:
        parts = p.split(".")
        curr = data
        found = True
        for part in parts:
            if isinstance(curr, dict) and part in curr:
                curr = curr[part]
            else:
                found = False
                break
        if found and curr is not None:
            return curr

    return None

class DMDataStore:
    def __init__(self):
        self.wipe_all_data()
        loaded = self.load_persisted_state()
        if not loaded and getattr(settings, "seed_initial_data", False):
            self.reset_to_default_seed()
        self.ensure_default_templates_and_chains()
        # Synchronize asset attributes with device states on startup
        for asset in getattr(self, "assets", []):
            self.recalculate_asset_attributes(asset)

    def persist_state(self):
        try:
            import os
            state = {
                "assets": self.assets,
                "asset_templates": self.asset_templates,
                "devices": self.devices,
                "device_templates": self.device_templates,
                "brokers": self.brokers,
                "integrations": self.integrations,
                "alarms": self.alarms,
                "alarm_histories": self.alarm_histories,
                "alarm_rules": self.alarm_rules,
                "alarm_actions": self.alarm_actions,
                "converters": self.converters,
                "rule_chains": self.rule_chains,
                "function_blocks": self.function_blocks,
                "function_block_templates": self.function_block_templates,
                "event_forwardings": self.event_forwardings,
                "activity_logs": self.activity_logs,
                "users": self.users,
                "user_groups": self.user_groups,
                "user_overrides": self.user_overrides,
                "api_clients": self.api_clients,
                "object_security_rules": self.object_security_rules,
                "scada_windows": self.scada_windows,
                "available_projects": self.available_projects,
                "uom_list": self.uom_list,
                "dashboard_widgets": self.dashboard_widgets,
                "current_project": self.current_project,
                "user_profile": self.user_profile
            }
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            path = os.path.join(base_dir, "dm_store_state.json")
            with open(path, "w", encoding="utf-8") as f:
                json.dump(state, f, indent=2)
        except Exception:
            pass

    def load_persisted_state(self) -> bool:
        try:
            import os
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            path = os.path.join(base_dir, "dm_store_state.json")
            if os.path.exists(path):
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                for k, v in data.items():
                    if hasattr(self, k) and v is not None:
                        setattr(self, k, v)
                return True
        except Exception:
            pass
        return False

    def ensure_default_templates_and_chains(self):
        now_iso = datetime.datetime.utcnow().isoformat() + "Z"
        dirty = False
        
        default_templates = [
            {
                "id": "fbt-1",
                "template_code": "FB_DELTA_T",
                "name": "Distillation Column Thermal Delta",
                "category": "Calculation",
                "description": "Computes vertical temperature gradient across fractionation trays for vapor-liquid separation control.",
                "inputs_schema": [
                    {"name": "t_reboiler", "type": "Float", "unit": "°C", "default": 235.0},
                    {"name": "t_overhead", "type": "Float", "unit": "°C", "default": 118.0}
                ],
                "outputs_schema": [
                    {"name": "delta_t", "type": "Float", "unit": "°C"},
                    {"name": "gradient_status", "type": "String", "unit": ""}
                ],
                "formula_code": """function execute(inputs) {
  const top = Number(inputs.t_overhead || 118.0);
  const bot = Number(inputs.t_reboiler || 235.0);
  const dt = Number((bot - top).toFixed(2));
  let status = 'NORMAL';
  if (dt > 140.0) status = 'OVERHEATED_REBOILER';
  else if (dt < 90.0) status = 'FLOODING_SUSPECTED';
  return { delta_t: dt, gradient_status: status };
}""",
                "version": "v2.0"
            },
            {
                "id": "fbt-2",
                "template_code": "FB_MT_ANOMALY",
                "name": "Mahalanobis-Taguchi Multivariate Anomaly",
                "category": "Analytics",
                "description": "Calculates normalized multivariate Mahalanobis distance from baseline covariance matrix to detect early process anomalies.",
                "inputs_schema": [
                    {"name": "temp_top", "type": "Float", "unit": "°C", "default": 118.0},
                    {"name": "temp_bottom", "type": "Float", "unit": "°C", "default": 235.0},
                    {"name": "pressure", "type": "Float", "unit": "kPa", "default": 145.0},
                    {"name": "vibration", "type": "Float", "unit": "mm/s", "default": 2.1}
                ],
                "outputs_schema": [
                    {"name": "mt_distance", "type": "Float", "unit": "score"},
                    {"name": "is_anomaly", "type": "Boolean", "unit": ""},
                    {"name": "health_status", "type": "String", "unit": ""}
                ],
                "formula_code": """function execute(inputs) {
  const top = Number(inputs.temp_top || 118.0);
  const bot = Number(inputs.temp_bottom || 235.0);
  const press = Number(inputs.pressure || 145.0);
  const vib = Number(inputs.vibration || 2.1);
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
                "version": "v2.1"
            },
            {
                "id": "fbt-3",
                "template_code": "FB_PUMP_HEAD",
                "name": "API 610 Centrifugal Pump Head Calculation",
                "category": "Calculation",
                "description": "Calculates pump differential head (meters) and estimated hydraulic power (kW) from suction/discharge pressures.",
                "inputs_schema": [
                    {"name": "p_suction", "type": "Float", "unit": "kPa", "default": 124.5},
                    {"name": "p_discharge", "type": "Float", "unit": "kPa", "default": 582.4},
                    {"name": "fluid_density", "type": "Float", "unit": "kg/m³", "default": 842.0},
                    {"name": "flow_rate", "type": "Float", "unit": "m³/h", "default": 450.0}
                ],
                "outputs_schema": [
                    {"name": "differential_head_m", "type": "Float", "unit": "m"},
                    {"name": "hydraulic_power_kw", "type": "Float", "unit": "kW"},
                    {"name": "pump_operating_point", "type": "String", "unit": ""}
                ],
                "formula_code": """function execute(inputs) {
  const ps = Number(inputs.p_suction || 124.5);
  const pd = Number(inputs.p_discharge || 582.4);
  const rho = Number(inputs.fluid_density || 842.0);
  const q = Number(inputs.flow_rate || 450.0);
  const g = 9.80665;
  const deltaP = (pd - ps) * 1000;
  const head = deltaP / (rho * g);
  const q_m3s = q / 3600;
  const hyd_kw = (rho * g * q_m3s * head) / 1000;
  return {
    differential_head_m: Number(head.toFixed(2)),
    hydraulic_power_kw: Number(hyd_kw.toFixed(2)),
    pump_operating_point: head > 60 ? 'OPTIMAL' : 'BELOW_BEP'
  };
}""",
                "version": "v1.2"
            },
            {
                "id": "fbt-4",
                "template_code": "FB_PID_V2",
                "name": "Yokogawa 2-Degrees-of-Freedom Velocity PID",
                "category": "Control",
                "description": "Industrial velocity-form discrete PID controller with proportional band, reset time and derivative rate limit.",
                "inputs_schema": [
                    {"name": "pv", "type": "Float", "unit": "", "default": 118.2},
                    {"name": "sp", "type": "Float", "unit": "", "default": 120.0},
                    {"name": "pb", "type": "Float", "unit": "%", "default": 80.0},
                    {"name": "ti", "type": "Float", "unit": "s", "default": 45.0},
                    {"name": "td", "type": "Float", "unit": "s", "default": 8.0}
                ],
                "outputs_schema": [
                    {"name": "mv", "type": "Float", "unit": "%"},
                    {"name": "error", "type": "Float", "unit": ""},
                    {"name": "control_mode", "type": "String", "unit": ""}
                ],
                "formula_code": """function execute(inputs) {
  const pv = Number(inputs.pv || 118.2);
  const sp = Number(inputs.sp || 120.0);
  const pb = Number(inputs.pb || 80.0);
  const ti = Number(inputs.ti || 45.0);
  const err = sp - pv;
  const gain = 100.0 / Math.max(pb, 1.0);
  let mv = 50.0 + gain * err + (err / Math.max(ti, 1.0)) * 2.0;
  mv = Math.min(100.0, Math.max(0.0, mv));
  return {
    mv: Number(mv.toFixed(2)),
    error: Number(err.toFixed(2)),
    control_mode: 'AUTO'
  };
}""",
                "version": "v3.0"
            },
            {
                "id": "fbt-5",
                "template_code": "FB_TOTALIZER",
                "name": "Flow Totalizer & Batch Accumulator",
                "category": "Calculation",
                "description": "Integrates instantaneous mass flow rate into total accumulated batch volume with automatic reset.",
                "inputs_schema": [
                    {"name": "flow_rate_m3h", "type": "Float", "unit": "m³/h", "default": 182.0},
                    {"name": "sample_interval_sec", "type": "Float", "unit": "s", "default": 1.0},
                    {"name": "reset", "type": "Boolean", "unit": "", "default": False}
                ],
                "outputs_schema": [
                    {"name": "accumulated_m3", "type": "Float", "unit": "m³"},
                    {"name": "daily_projected_m3", "type": "Float", "unit": "m³"}
                ],
                "formula_code": """function execute(inputs) {
  const flow = Number(inputs.flow_rate_m3h || 182.0);
  const dt = Number(inputs.sample_interval_sec || 1.0);
  const incremental = (flow / 3600.0) * dt;
  const accumulated = Number((4380.5 + incremental).toFixed(3));
  const projected = Number((flow * 24.0).toFixed(1));
  return {
    accumulated_m3: accumulated,
    daily_projected_m3: projected
  };
}""",
                "version": "v1.1"
            },
            {
                "id": "fbt-6",
                "template_code": "FB_KPI_OEE",
                "name": "Overall Equipment Effectiveness (OEE) KPI Derivation",
                "category": "KPI Analytics",
                "description": "Computes plant OEE % (Availability × Performance × Quality) and sub-indices from operating hours, production count, and defect rates.",
                "inputs_schema": [
                    {"name": "run_hours", "type": "Float", "unit": "h", "default": 24.0},
                    {"name": "planned_hours", "type": "Float", "unit": "h", "default": 24.0},
                    {"name": "production_count", "type": "Float", "unit": "units", "default": 940.0},
                    {"name": "target_capacity", "type": "Float", "unit": "units", "default": 1000.0},
                    {"name": "defect_count", "type": "Float", "unit": "units", "default": 12.0}
                ],
                "outputs_schema": [
                    {"name": "oee_percent", "type": "Float", "unit": "%"},
                    {"name": "availability", "type": "Float", "unit": "ratio"},
                    {"name": "performance", "type": "Float", "unit": "ratio"},
                    {"name": "quality", "type": "Float", "unit": "ratio"}
                ],
                "formula_code": """function execute(inputs) {
  const runHours = Number(inputs.run_hours || 24);
  const plannedHours = Number(inputs.planned_hours || 24);
  const avail = Math.min(1.0, runHours / Math.max(plannedHours, 1));
  const prod = Number(inputs.production_count || 940);
  const cap = Number(inputs.target_capacity || 1000);
  const perf = Math.min(1.0, prod / Math.max(cap, 1));
  const defects = Number(inputs.defect_count || 12);
  const good = Math.max(0, prod - defects);
  const qual = prod > 0 ? (good / prod) : 1.0;
  const oee = Number((avail * perf * qual * 100).toFixed(2));
  return {
    oee_percent: oee,
    availability: Number(avail.toFixed(3)),
    performance: Number(perf.toFixed(3)),
    quality: Number(qual.toFixed(3))
  };
}""",
                "version": "v1.0"
            },
            {
                "id": "fbt-7",
                "template_code": "FB_KPI_EFFICIENCY",
                "name": "Fractionation & Heat Exchanger Thermal Efficiency KPI",
                "category": "KPI Analytics",
                "description": "Calculates thermodynamic heat recovery efficiency (%) and Specific Energy Consumption (SEC in kWh/m³) for continuous refinery units.",
                "inputs_schema": [
                    {"name": "heat_recovered_mw", "type": "Float", "unit": "MW", "default": 76.4},
                    {"name": "heat_input_mw", "type": "Float", "unit": "MW", "default": 89.2},
                    {"name": "throughput_m3h", "type": "Float", "unit": "m³/h", "default": 450.0},
                    {"name": "power_consumed_kwh", "type": "Float", "unit": "kWh", "default": 320.0}
                ],
                "outputs_schema": [
                    {"name": "thermal_efficiency_pct", "type": "Float", "unit": "%"},
                    {"name": "sec_kwh_per_m3", "type": "Float", "unit": "kWh/m³"},
                    {"name": "efficiency_grade", "type": "String", "unit": ""}
                ],
                "formula_code": """function execute(inputs) {
  const q_rec = Number(inputs.heat_recovered_mw || 76.4);
  const q_in = Number(inputs.heat_input_mw || 89.2);
  const eff = q_in > 0 ? Number((q_rec / q_in * 100).toFixed(2)) : 0;
  const q_flow = Number(inputs.throughput_m3h || 450.0);
  const power = Number(inputs.power_consumed_kwh || 320.0);
  const sec = q_flow > 0 ? Number((power / q_flow).toFixed(3)) : 0;
  const grade = eff >= 85 ? 'TIER_1_EXCELLENT' : (eff >= 75 ? 'TIER_2_ACCEPTABLE' : 'TIER_3_DEGRADED');
  return {
    thermal_efficiency_pct: eff,
    sec_kwh_per_m3: sec,
    efficiency_grade: grade
  };
}""",
                "version": "v1.0"
            }
        ]

        if not getattr(self, "function_block_templates", None):
            self.function_block_templates = default_templates
            dirty = True
        else:
            existing_codes = {t["template_code"] for t in self.function_block_templates}
            for dt in default_templates:
                if dt["template_code"] not in existing_codes:
                    self.function_block_templates.append(dt)
                    dirty = True

        if not getattr(self, "function_blocks", None):
            self.function_blocks = [
                {
                    "id": "fb-001",
                    "name": "CDU Fractionation Column Thermal Delta T",
                    "template_code": "FB_DELTA_T",
                    "template_name": "Distillation Column Thermal Delta",
                    "category": "Calculation",
                    "asset_id": "ast-unit-cdu",
                    "asset_name": "Atmospheric Distillation Unit C-101",
                    "target_tag": "CDU_101.DELTA_T",
                    "schedule_interval": "1s",
                    "status": "ACTIVE",
                    "last_run_at": now_iso,
                    "last_execution_ms": 2.8,
                    "last_output_value": 117.2,
                    "last_output_data": {"delta_t": 117.2, "gradient_status": "NORMAL"},
                    "input_bindings": {
                        "t_overhead": "TIC_101.PV",
                        "t_reboiler": "TIC_102.PV"
                    },
                    "formula_code": self.function_block_templates[0]["formula_code"],
                    "execution_log": "Computed delta_t = 117.2°C; Status: NORMAL"
                },
                {
                    "id": "fb-002",
                    "name": "CDU Process Multivariate MT Anomaly Detector",
                    "template_code": "FB_MT_ANOMALY",
                    "template_name": "Mahalanobis-Taguchi Multivariate Anomaly",
                    "category": "Analytics",
                    "asset_id": "ast-unit-cdu",
                    "asset_name": "Atmospheric Distillation Unit C-101",
                    "target_tag": "CDU_101.MT_DISTANCE",
                    "schedule_interval": "5s",
                    "status": "ACTIVE",
                    "last_run_at": now_iso,
                    "last_execution_ms": 4.1,
                    "last_output_value": 1.42,
                    "last_output_data": {"mt_distance": 1.42, "is_anomaly": False, "health_status": "NORMAL"},
                    "input_bindings": {
                        "temp_top": "TIC_101.PV",
                        "temp_bottom": "TIC_102.PV",
                        "pressure": "PIC_101.PV",
                        "vibration": "VIB_101.RMS"
                    },
                    "formula_code": self.function_block_templates[1]["formula_code"],
                    "execution_log": "MT Distance score: 1.42 (Threshold 3.0). Health status: NORMAL"
                },
                {
                    "id": "fb-003",
                    "name": "Charge Pump P-101A Hydraulic Differential Head",
                    "template_code": "FB_PUMP_HEAD",
                    "template_name": "API 610 Centrifugal Pump Head Calculation",
                    "category": "Calculation",
                    "asset_id": "ast-eq-pump",
                    "asset_name": "Crude Feed Charge Pump P-101A",
                    "target_tag": "PUMP_101A.DIFF_HEAD",
                    "schedule_interval": "1s",
                    "status": "ACTIVE",
                    "last_run_at": now_iso,
                    "last_execution_ms": 1.9,
                    "last_output_value": 55.45,
                    "last_output_data": {"differential_head_m": 55.45, "hydraulic_power_kw": 57.24, "pump_operating_point": "OPTIMAL"},
                    "input_bindings": {
                        "p_suction": "pump-p101a-hub-01.suction_pressure",
                        "p_discharge": "pump-p101a-hub-01.discharge_pressure",
                        "fluid_density": "pump-p101a-hub-01.fluid_density",
                        "flow_rate": "FIC_101.PV"
                    },
                    "formula_code": self.function_block_templates[2]["formula_code"],
                    "execution_log": "Head: 55.45 m, Hydraulic Power: 57.24 kW. Operating point: OPTIMAL"
                },
                {
                    "id": "fb-004",
                    "name": "CDU Top Reflux Flow Totalizer",
                    "template_code": "FB_TOTALIZER",
                    "template_name": "Flow Totalizer & Batch Accumulator",
                    "category": "Calculation",
                    "asset_id": "ast-unit-cdu",
                    "asset_name": "Atmospheric Distillation Unit C-101",
                    "target_tag": "FIC_102.TOTAL_M3",
                    "schedule_interval": "1s",
                    "status": "ACTIVE",
                    "last_run_at": now_iso,
                    "last_execution_ms": 1.4,
                    "last_output_value": 4380.55,
                    "last_output_data": {"accumulated_m3": 4380.55, "daily_projected_m3": 4368.0},
                    "input_bindings": {
                        "flow_rate_m3h": "FIC_102.PV",
                        "sample_interval_sec": "1.0",
                        "reset": "false"
                    },
                    "formula_code": self.function_block_templates[4]["formula_code"],
                    "execution_log": "Accumulated: 4380.55 m3, Projected 24h: 4368.0 m3"
                },
                {
                    "id": "fb-kpi-001",
                    "name": "CDU Atmospheric Column Overall Equipment Effectiveness (OEE)",
                    "template_code": "FB_KPI_OEE",
                    "template_name": "Overall Equipment Effectiveness (OEE) Metric Derivation",
                    "category": "KPI Analytics",
                    "asset_id": "ast-unit-cdu",
                    "asset_name": "Atmospheric Distillation Unit C-101",
                    "target_tag": "CDU_101.OEE",
                    "schedule_interval": "5s",
                    "status": "ACTIVE",
                    "last_run_at": now_iso,
                    "last_execution_ms": 2.1,
                    "last_output_value": 92.83,
                    "last_output_data": {"oee_percent": 92.83, "availability": 1.0, "performance": 0.94, "quality": 0.987},
                    "input_bindings": {
                        "run_hours": "24",
                        "planned_hours": "24",
                        "production_count": "940",
                        "target_capacity": "1000",
                        "defect_count": "12"
                    },
                    "formula_code": next((t["formula_code"] for t in self.function_block_templates if t["template_code"] == "FB_KPI_OEE"), ""),
                    "execution_log": "Calculated OEE: 92.83% (Avail: 1.0, Perf: 0.94, Qual: 0.987). Status: OPTIMAL"
                }
            ]
            dirty = True

        default_chains = [
            {
                "id": "rc-root-01",
                "name": "Root Industrial Telemetry Pipeline",
                "description": "Default platform rule chain: Ingests telemetry, checks analog alarm trips, transforms engineering units, and stores to timeseries database.",
                "is_root": True,
                "status": "ACTIVE",
                "nodes": [
                    { "id": "node-in-1", "type": "INPUT", "name": "Inbound Telemetry Msg", "category": "Input", "x": 60, "y": 140, "details": "Topic: v1/devices/me/telemetry", "configuration": {"topic": "v1/devices/me/telemetry"} },
                    { "id": "node-flt-1", "type": "FILTER", "name": "Script Message Filter", "category": "Filter", "x": 280, "y": 140, "details": "msg.temperature > 85 || msg.pressure > 250", "configuration": {"script": "return msg.temperature > 85 || msg.pressure > 250;"} },
                    { "id": "node-trf-1", "type": "TRANSFORM", "name": "Unit Conversion (Script)", "category": "Transformation", "x": 520, "y": 80, "details": "Convert psi to kPa & °F to °C", "configuration": {"script": "msg.pressure_kpa = msg.pressure * 6.894; return {msg: msg};"} },
                    { "id": "node-act-1", "type": "ACTION", "name": "Save Timeseries", "category": "Action", "x": 780, "y": 80, "details": "Persist in Timeseries DB", "configuration": {"ttl": 86400, "skip_latest": False} },
                    { "id": "node-alm-1", "type": "ACTION", "name": "Create Process Alarm", "category": "Action", "x": 780, "y": 240, "details": "ISA-18.2 High-High Emergency Trip", "configuration": {"alarm_type": "High Temperature Trip", "severity": "CRITICAL", "propagate": True} },
                    { "id": "node-fwd-1", "type": "ACTION", "name": "External Webhook Dispatch", "category": "Action", "x": 1020, "y": 240, "details": "Forward to Node-RED (:1880)", "configuration": {"endpoint": "http://127.0.0.1:1880/telemetry", "method": "POST"} }
                ],
                "connections": [
                    { "from": "node-in-1", "to": "node-flt-1", "label": "Success" },
                    { "from": "node-flt-1", "to": "node-trf-1", "label": "True" },
                    { "from": "node-flt-1", "to": "node-act-1", "label": "False" },
                    { "from": "node-trf-1", "to": "node-alm-1", "label": "Success" },
                    { "from": "node-alm-1", "to": "node-fwd-1", "label": "Alarm Created" }
                ]
            },
            {
                "id": "rc-nodered-02",
                "name": "Node-RED & n8n Automation Bridge",
                "description": "Dispatches high-frequency sensor streams to external workflow engines with payload flattening.",
                "is_root": False,
                "status": "ACTIVE",
                "nodes": [
                    { "id": "node-in-2", "type": "INPUT", "name": "MQTT Broker Stream", "category": "Input", "x": 60, "y": 140, "details": "Broker: Port 91 / 1883", "configuration": {"broker": "brk-1"} },
                    { "id": "node-flt-2", "type": "FILTER", "name": "Asset Scope Filter", "category": "Filter", "x": 300, "y": 140, "details": "Scope: Fractionator CDU-101", "configuration": {"asset": "ast-unit-cdu"} },
                    { "id": "node-trf-2", "type": "TRANSFORM", "name": "JSON Schema Normalizer", "category": "Transformation", "x": 560, "y": 140, "details": "Flat Key-Value Map", "configuration": {"flatten": True} },
                    { "id": "node-fwd-2", "type": "ACTION", "name": "Node-RED HTTP In", "category": "Action", "x": 820, "y": 140, "details": "http://localhost:1880/telemetry", "configuration": {"endpoint": "http://127.0.0.1:1880/telemetry"} }
                ],
                "connections": [
                    { "from": "node-in-2", "to": "node-flt-2", "label": "Success" },
                    { "from": "node-flt-2", "to": "node-trf-2", "label": "Matched" },
                    { "from": "node-trf-2", "to": "node-fwd-2", "label": "Dispatched" }
                ]
            },
            {
                "id": "rc-kpi-03",
                "name": "Real-time KPI Derivations & Plant Efficiency Pipeline",
                "description": "Event-driven calculation pipeline: Ingests asset telemetry, filters running mode, computes derived plant KPIs (OEE, Thermal Efficiency, SEC), stores to asset attributes and historian, and raises alarm on performance degradation.",
                "is_root": False,
                "status": "ACTIVE",
                "nodes": [
                    { "id": "node-kpi-in-1", "type": "INPUT", "name": "Asset Telemetry & Production Ingress", "category": "INPUT", "x": 60, "y": 180, "details": "Topic: v1/devices/me/telemetry", "configuration": {"topic": "v1/devices/me/telemetry"} },
                    { "id": "node-kpi-flt-1", "type": "FILTER", "name": "Filter Operating Mode (RUNNING)", "category": "FILTER", "x": 280, "y": 180, "details": "Exclude trips & offline states", "configuration": {"script": "return msg.status !== 'STOPPED' && msg.status !== 'TRIP';"} },
                    { "id": "node-kpi-enr-1", "type": "ENRICHMENT", "name": "Enrich Asset Nameplate & Targets", "category": "ENRICHMENT", "x": 520, "y": 180, "details": "Design capacity (1000 u/d) & targets", "configuration": {"selectedFields": ["design_capacity", "target_efficiency", "unit_name"]} },
                    { "id": "node-kpi-trf-1", "type": "TRANSFORM", "name": "KPI Derivation Calculator (OEE & Efficiency)", "category": "TRANSFORM", "x": 760, "y": 180, "details": "Derives OEE % and Thermal Efficiency %", "configuration": {"kpi_type": "OEE_AND_EFFICIENCY", "script": "const runHours = Number(msg.run_hours || 24);\nconst plannedHours = Number(msg.planned_hours || 24);\nconst avail = Math.min(1.0, runHours / Math.max(plannedHours, 1));\n\nconst prod = Number(msg.production_count || msg.throughput || 930);\nconst cap = Number(msg.target_capacity || 1000);\nconst perf = Math.min(1.0, prod / Math.max(cap, 1));\n\nconst good = Number(msg.good_count || (prod - (msg.defect_count || 10)));\nconst qual = prod > 0 ? (good / prod) : 1.0;\n\nconst oee = Number((avail * perf * qual * 100).toFixed(2));\nconst heatRec = Number(msg.heat_recovered || msg['TIC_102.PV'] || 76.4);\nconst heatIn = Number(msg.heat_input || msg['TIC_101.PV'] || 89.2);\nconst eff = Number((heatRec / Math.max(heatIn, 1) * 100).toFixed(2));\n\nmsg.oee_percent = oee;\nmsg.thermal_efficiency = eff;\nmsg.availability_ratio = Number(avail.toFixed(3));\nmsg.performance_ratio = Number(perf.toFixed(3));\nmsg.quality_ratio = Number(qual.toFixed(3));\nmsg.kpi_calculated_at = new Date().toISOString();\n\nreturn { msg: msg, metadata: metadata, msgType: msgType };"} },
                    { "id": "node-kpi-act-attr", "type": "ACTION", "name": "Save Derived KPI Attributes to Asset", "category": "ACTION", "x": 1020, "y": 90, "details": "Updates live asset attributes (oee_percent, thermal_efficiency)", "configuration": {"scope": "SERVER_SCOPE"} },
                    { "id": "node-kpi-act-ts", "type": "ACTION", "name": "Save KPI Timeseries Historian", "category": "ACTION", "x": 1020, "y": 210, "details": "Stores high-resolution derived KPI curve in Timeseries DB", "configuration": {"ttl": 86400, "skip_latest": False} },
                    { "id": "node-kpi-flt-low", "type": "FILTER", "name": "Check Low OEE Performance (< 75%)", "category": "FILTER", "x": 1020, "y": 330, "details": "Alert if derived OEE drops below 75%", "configuration": {"script": "return msg.oee_percent < 75.0;"} },
                    { "id": "node-kpi-alm-1", "type": "ACTION", "name": "Create Low OEE Process Alarm", "category": "ACTION", "x": 1280, "y": 330, "details": "ISA-18.2 Warning: Overall Equipment Effectiveness Degraded", "configuration": {"alarm_type": "Low OEE Degradation Alarm", "severity": "WARNING", "propagate": True} }
                ],
                "connections": [
                    { "from": "node-kpi-in-1", "to": "node-kpi-flt-1", "label": "Success" },
                    { "from": "node-kpi-flt-1", "to": "node-kpi-enr-1", "label": "True" },
                    { "from": "node-kpi-enr-1", "to": "node-kpi-trf-1", "label": "Success" },
                    { "from": "node-kpi-trf-1", "to": "node-kpi-act-attr", "label": "Success" },
                    { "from": "node-kpi-trf-1", "to": "node-kpi-act-ts", "label": "Success" },
                    { "from": "node-kpi-trf-1", "to": "node-kpi-flt-low", "label": "Success" },
                    { "from": "node-kpi-flt-low", "to": "node-kpi-alm-1", "label": "True" }
                ]
            }
        ]

        if not getattr(self, "rule_chains", None):
            self.rule_chains = default_chains
            dirty = True
        else:
            existing_rc_ids = {rc["id"] for rc in self.rule_chains}
            for drc in default_chains:
                if drc["id"] not in existing_rc_ids:
                    self.rule_chains.append(drc)
                    dirty = True

        if dirty:
            self.persist_state()

    def wipe_all_data(self):
        self.assets = []
        self.asset_templates = []
        self.devices = []
        self.device_templates = []
        self.brokers = []
        self.integrations = []
        self.alarms = []
        self.alarm_histories = []
        self.alarm_rules = []
        self.alarm_actions = []
        self.converters = []
        self.rule_chains = []
        self.function_blocks = []
        self.function_block_templates = []
        self.event_forwardings = []
        self.activity_logs = []
        self.users = []
        self.user_groups = []
        self.user_overrides = []
        self.api_clients = []
        self.object_security_rules = []
        self.scada_windows = []
        self.available_projects = []
        self.uom_list = []
        self.dashboard_widgets = []
        self.current_project = {
            "id": "",
            "name": "",
            "code": "",
            "region": "",
            "description": ""
        }
        self.user_profile = {
            "first_name": "Admin",
            "last_name": "",
            "account_id": "admin@local",
            "role": "Administrator",
            "avatar": "",
            "datetime_format": "YYYY-MM-DD HH:mm:ss",
            "timezone": "UTC"
        }

    def reset_to_default_seed(self):
        now_iso = datetime.datetime.utcnow().isoformat() + "Z"

        # 1. Project Profile & User Info (Section 8.1.3, Table 4)
        self.current_project = {
            "id": "PRJ-SGP-JURONG-01",
            "name": "Jurong Island Refinery Complex",
            "code": "YGE-JURONG",
            "region": "Southeast Asia / Singapore",
            "description": "Continuous Crude Distillation & Hydrotreating Plant"
        }
        self.available_projects = [
            {"id": "PRJ-SGP-JURONG-01", "name": "Jurong Island Refinery Complex", "code": "YGE-JURONG", "region": "Southeast Asia / Singapore"},
            {"id": "PRJ-JPN-FUKUSHIMA-02", "name": "Fukushima Green Hydrogen Facility", "code": "YGE-FUKUSHIMA", "region": "East Asia / Japan"},
            {"id": "PRJ-USA-GULFCOAST-03", "name": "Texas Petrochemical Hub", "code": "YGE-TEXAS", "region": "North America / USA"}
        ]

        self.user_profile = {
            "first_name": "Tan Thye",
            "last_name": "Guan",
            "account_id": "tg.tan@yokogawa.com",
            "role": "IIoT Solution Engineer DXP",
            "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
            "datetime_format": "YYYY-MM-DD HH:mm:ss",
            "timezone": "UTC+08:00 (Singapore / Jurong Standard Time)"
        }

        # 2. UoM Entity (Section 9.9, Table 18)
        self.uom_list = [
            {"id": "uom-1", "name": "Degree Celsius", "abbreviation": "°C", "category": "Temperature", "ref_uom": "K", "factor": 1.0, "offset": 273.15, "canonical_factor": 1.0, "canonical_offset": 273.15},
            {"id": "uom-2", "name": "Degree Fahrenheit", "abbreviation": "°F", "category": "Temperature", "ref_uom": "°C", "factor": 0.555556, "offset": -17.7778, "canonical_factor": 0.555556, "canonical_offset": 255.372},
            {"id": "uom-3", "name": "Kelvin", "abbreviation": "K", "category": "Temperature", "ref_uom": "K", "factor": 1.0, "offset": 0.0, "canonical_factor": 1.0, "canonical_offset": 0.0},
            {"id": "uom-4", "name": "Kilopascal", "abbreviation": "kPa", "category": "Pressure", "ref_uom": "bar", "factor": 0.01, "offset": 0.0, "canonical_factor": 1000.0, "canonical_offset": 0.0},
            {"id": "uom-5", "name": "Bar", "abbreviation": "bar", "category": "Pressure", "ref_uom": "Pa", "factor": 100000.0, "offset": 0.0, "canonical_factor": 100000.0, "canonical_offset": 0.0},
            {"id": "uom-6", "name": "Pounds per Square Inch", "abbreviation": "psi", "category": "Pressure", "ref_uom": "bar", "factor": 0.0689476, "offset": 0.0, "canonical_factor": 6894.76, "canonical_offset": 0.0},
            {"id": "uom-7", "name": "Cubic Meters per Hour", "abbreviation": "m³/h", "category": "Flow", "ref_uom": "L/min", "factor": 16.6667, "offset": 0.0, "canonical_factor": 0.000277778, "canonical_offset": 0.0},
            {"id": "uom-8", "name": "Liters per Minute", "abbreviation": "L/min", "category": "Flow", "ref_uom": "m³/h", "factor": 0.06, "offset": 0.0, "canonical_factor": 0.0000166667, "canonical_offset": 0.0},
            {"id": "uom-9", "name": "Percentage", "abbreviation": "%", "category": "Level", "ref_uom": "%", "factor": 1.0, "offset": 0.0, "canonical_factor": 1.0, "canonical_offset": 0.0},
            {"id": "uom-10", "name": "Meters", "abbreviation": "m", "category": "Level", "ref_uom": "m", "factor": 1.0, "offset": 0.0, "canonical_factor": 1.0, "canonical_offset": 0.0},
            {"id": "uom-11", "name": "Millimeters per Second", "abbreviation": "mm/s", "category": "Vibration", "ref_uom": "mm/s", "factor": 1.0, "offset": 0.0, "canonical_factor": 0.001, "canonical_offset": 0.0},
            {"id": "uom-12", "name": "Kilowatt", "abbreviation": "kW", "category": "Electricity", "ref_uom": "W", "factor": 1000.0, "offset": 0.0, "canonical_factor": 1000.0, "canonical_offset": 0.0},
            {"id": "uom-13", "name": "Revolutions per Minute", "abbreviation": "rpm", "category": "Speed", "ref_uom": "rpm", "factor": 1.0, "offset": 0.0, "canonical_factor": 0.10472, "canonical_offset": 0.0},
            {"id": "uom-14", "name": "Kilogram per Cubic Meter", "abbreviation": "kg/m³", "category": "Mass", "ref_uom": "kg/m³", "factor": 1.0, "offset": 0.0, "canonical_factor": 1.0, "canonical_offset": 0.0}
        ]

        # 3. Device Templates (Section 9.6, Table 10, Table 11, Table 12, Figure 4)
        self.device_templates = [
            {
                "id": "dt-1",
                "template_name": "DT-Temp-Humidity Sensor Event Hub",
                "sample_json": '{"deviceid":"dfc4960b-b9f0-42ef-8d94-43fd65e95631","key":"K8vntf81Xp0j5zuqEbmYDyju/sNHkh8b4uSEcfMQhijk=","protocol":"mqtt","deviceType":"YEAL7 sensor type01","datatype":"realtime","timestamp":"2024-03-05T08:00:00Z","timestampunix":1651505017758,"temperature":45.2,"humidity":22.3,"CO2":11,"illuminance":6,"status":1}',
                "metric_keys": [
                    {"key": "deviceid", "name": "deviceid", "type": "Device ID", "data_type": "Text", "enable": True, "expression": ""},
                    {"key": "timestamp", "name": "timestamp", "type": "Timestamp", "data_type": "Timestamp", "enable": True, "expression": ""},
                    {"key": "temperature", "name": "temperature", "type": "Metric", "data_type": "Double", "enable": True, "expression": "Math.Round(value, 2)"},
                    {"key": "humidity", "name": "humidity", "type": "Metric", "data_type": "Double", "enable": True, "expression": "Math.Round(value, 1)"},
                    {"key": "CO2", "name": "co2_ppm", "type": "Metric", "data_type": "Int", "enable": True, "expression": ""},
                    {"key": "illuminance", "name": "illuminance_lux", "type": "Metric", "data_type": "Double", "enable": True, "expression": ""},
                    {"key": "status", "name": "device_status", "type": "Metric", "data_type": "Int", "enable": True, "expression": ""}
                ],
                "bindings": [
                    {"key": "sampling_interval_sec", "data_type": "Int", "default_value": "5"},
                    {"key": "calibrate_offset", "data_type": "Double", "default_value": "0.0"}
                ]
            },
            {
                "id": "dt-2",
                "template_name": "DT-Centrifugal Pump Sensor Suite",
                "sample_json": '{"deviceid":"pump-p101a-hub-01","timestamp":"2024-03-05T08:00:00Z","suction_pressure":124.5,"discharge_pressure":582.4,"bearing_vibration":2.45,"fluid_density":842.0,"motor_kw":88.5,"speed_rpm":2950}',
                "metric_keys": [
                    {"key": "deviceid", "name": "deviceid", "type": "Device ID", "data_type": "Text", "enable": True, "expression": ""},
                    {"key": "timestamp", "name": "timestamp", "type": "Timestamp", "data_type": "Timestamp", "enable": True, "expression": ""},
                    {"key": "suction_pressure", "name": "suction_pressure", "type": "Metric", "data_type": "Double", "enable": True, "expression": ""},
                    {"key": "discharge_pressure", "name": "discharge_pressure", "type": "Metric", "data_type": "Double", "enable": True, "expression": ""},
                    {"key": "bearing_vibration", "name": "bearing_vibration", "type": "Metric", "data_type": "Double", "enable": True, "expression": ""},
                    {"key": "fluid_density", "name": "fluid_density", "type": "Metric", "data_type": "Double", "enable": True, "expression": ""},
                    {"key": "motor_kw", "name": "motor_power", "type": "Metric", "data_type": "Double", "enable": True, "expression": ""},
                    {"key": "speed_rpm", "name": "pump_speed", "type": "Metric", "data_type": "Int", "enable": True, "expression": ""}
                ],
                "bindings": [
                    {"key": "remote_trip_command", "data_type": "Bool", "default_value": "false"},
                    {"key": "speed_setpoint_rpm", "data_type": "Int", "default_value": "2950"}
                ]
            }
        ]

        # 4. Brokers (Section 9.7, Table 13, Table 14)
        # 4. Brokers (Section 9.7, Table 13, Table 14 + Socket.IO & Modbus)
        self.brokers = [
            {
                "id": "brk-opcua",
                "name": "CENTUM VP DCS & Industrial OPC UA Server Gateway",
                "broker_type": "OPC UA",
                "port": 4840,
                "tier": "IEC 62541 Standard",
                "endpoint_url": "opc.tcp://127.0.0.1:4840",
                "connection_url": "opc.tcp://127.0.0.1:4840/yokogawa/server/",
                "path": "/yokogawa/server/",
                "security_mode": "SignAndEncrypt",
                "security_policy": "Basic256Sha256",
                "auth_type": "Username / Password",
                "username": "oprex_operator",
                "password": "••••••••",
                "scan_frequency_ms": 1000,
                "publishing_interval_ms": 500,
                "deadband": 0.05,
                "node_namespace": 2,
                "root_node_id": "ns=2;s=Yokogawa.CENTUM_VP.FCS0101",
                "status": "ONLINE",
                "messages_today": 1420500,
                "throughput_kb_min": 2180,
                "description": "IEC 62541 OPC UA server connection for CENTUM VP FCS controller node browsing, subscription, and telemetry ingestion.",
                "mappings": [
                    {"node_id": "ns=2;s=CENTUM_VP.FCS0101.TIC_101.PV", "tag_name": "Overhead_Vapor_Temperature", "data_type": "Double", "type": "timeseries"},
                    {"node_id": "ns=2;s=CENTUM_VP.FCS0101.PIC_101.PV", "tag_name": "Column_Top_Pressure", "data_type": "Double", "type": "timeseries"},
                    {"node_id": "ns=2;s=CENTUM_VP.FCS0101.FIC_101.PV", "tag_name": "Crude_Feed_FlowRate", "data_type": "Double", "type": "timeseries"},
                    {"node_id": "ns=2;s=CENTUM_VP.FCS0101.LIC_101.PV", "tag_name": "Reflux_Drum_Level", "data_type": "Double", "type": "timeseries"},
                    {"node_id": "ns=2;s=CENTUM_VP.FCS0101.FIRMWARE_VER", "tag_name": "Firmware_Revision", "data_type": "String", "type": "attributes"}
                ]
            },
            {
                "id": "brk-socketio",
                "name": "Node-RED & Industrial Socket.IO Ingestion Broker",
                "broker_type": "Socket.IO",
                "port": 91,
                "tier": "Real-Time Engine.IO v4",
                "endpoint_url": "http://127.0.0.1:91/socket.io/",
                "connection_url": "http://localhost:91/socket.io/",
                "path": "/socket.io/",
                "transports": ["websocket", "polling"],
                "events": ["telemetry", "csv_row", "csv_bulk"],
                "status": "ONLINE",
                "auth_type": "Open / Token Header",
                "messages_today": 842100,
                "throughput_kb_min": 1850,
                "description": "High-frequency bi-directional event stream for Node-RED CSV streaming, edge devices and web clients."
            },
            {
                "id": "brk-1",
                "name": "Yokogawa Azure IoT Hub - Main",
                "broker_type": "Azure IoT Hub",
                "tier": "S1",
                "hub_units": 2,
                "defender_for_iot": True,
                "partitions": 4,
                "sharing": True,
                "endpoint_url": "HostName=ahi-yokogawa-hub.azure-devices.net",
                "connection_string": "HostName=ahi-yokogawa-hub.azure-devices.net;SharedAccessKeyName=iothubowner;SharedAccessKey=0zWbY3Y4YqH...==",
                "status": "ONLINE",
                "messages_today": 342150,
                "throughput_kb_min": 850,
                "description": "Enterprise cloud broker with device twin and bi-directional RPC commands."
            },
            {
                "id": "brk-2",
                "name": "CDU Stream Event Hub",
                "broker_type": "Azure Event Hub",
                "tier": "Standard",
                "hub_name": "ahi-cdu-events",
                "throughput_units": 4,
                "auto_inflate": True,
                "max_throughput_units": 16,
                "endpoint_url": "sb://ahi-refinery.servicebus.windows.net/ (Hub: ahi-cdu-events)",
                "connection_string": "Endpoint=sb://ahi-refinery.servicebus.windows.net/;SharedAccessKeyName=SendListen;SharedAccessKey=h7K...==",
                "status": "ONLINE",
                "messages_today": 1285000,
                "throughput_kb_min": 1420,
                "description": "Ultra high-throughput event buffer for plant-wide continuous telemetry."
            },
            {
                "id": "brk-3",
                "name": "AHI Native Broker REST API",
                "broker_type": "Broker REST API",
                "tier": "Standard",
                "endpoint_url": "http://127.0.0.1:91/api/v1/dm/broker/ingest",
                "status": "ONLINE",
                "auth_type": "API Key / Bearer JWT",
                "messages_today": 624500,
                "throughput_kb_min": 420,
                "description": "Standard RESTful JSON ingestion endpoint for HTTP webhooks and edge push."
            },
            {
                "id": "brk-5",
                "name": "Field MQTT Telemetry Broker",
                "broker_type": "MQTT",
                "port": 8883,
                "ssl_enabled": True,
                "endpoint_url": "mqtt://127.0.0.1:8883 (Topic: refinery/telemetry/#)",
                "telemetry_topic": "refinery/telemetry/#",
                "command_topic": "refinery/command/#",
                "status": "ONLINE",
                "messages_today": 941000,
                "throughput_kb_min": 680,
                "description": "ISO/IEC 20922 M2M publish/subscribe messaging broker."
            },
            {
                "id": "brk-modbus",
                "name": "Modbus TCP Field Gateway",
                "broker_type": "Modbus TCP",
                "port": 502,
                "unit_id": 1,
                "endpoint_url": "modbus://127.0.0.1:502 (Unit ID: 1)",
                "tier": "Industrial PLC Bus",
                "status": "ONLINE",
                "messages_today": 512000,
                "throughput_kb_min": 320,
                "description": "Industrial Ethernet Modbus TCP gateway for PLC register polling."
            },
            {
                "id": "brk-4",
                "name": "Constrained Plant Sensor Gateway (CoAP)",
                "broker_type": "CoAP",
                "port": 5683,
                "jwt_secured": True,
                "endpoint_url": "coap://127.0.0.1:5683",
                "status": "ONLINE",
                "rfc_standard": "RFC 7252 / RFC 7519",
                "messages_today": 89200,
                "throughput_kb_min": 45,
                "description": "Low-overhead UDP/CoAP gateway for battery-operated wireless field sensors."
            }
        ]

        # 5. Integrations (Section 9.8, Table 15, Table 16, Table 17)
        self.integrations = [
            {
                "id": "int-1",
                "name": "Azure Event Hub Ingestion Gateway",
                "integration_type": "Azure Event Hub",
                "connection_string": "Endpoint=sb://ahi-east.servicebus.windows.net/;SharedAccessKeyName=AhiListener;SharedAccessKey=k79D...==",
                "hub_name": "eventhub-cdu-telemetry",
                "status": "CONNECTED",
                "last_sync": now_iso
            },
            {
                "id": "int-2",
                "name": "Green Koncepts Energy Cloud Connector",
                "integration_type": "Green Koncepts Integration",
                "endpoint": "https://api.greenkoncepts.com/v2/refinery/meters",
                "client_id": "gk_client_ahi_jurong",
                "client_secret": "••••••••••••••••••••••••",
                "status": "CONNECTED",
                "last_sync": now_iso
            },
            {
                "id": "int-3",
                "name": "YDX Enterprise Data Experience Hub",
                "integration_type": "YDX Integration",
                "endpoint": "https://ydx.yokogawa.com/api/v3/streams",
                "api_key": "ydx_key_993412_alpha",
                "api_secret": "••••••••••••••••••••••••",
                "interval_time": 5,
                "broker_endpoint": "https://ydx.broker.yokogawa.com",
                "status": "CONNECTED",
                "last_sync": now_iso
            }
        ]

        # 6. Devices (Section 9.5, Table opic- Device Configurable Items)
        self.devices = [
            {
                "id": "dev-1",
                "identifier": "dfc4960b-b9f0-42ef-8d94-43fd65e95631",
                "name": "Yokogawa EJX110A Differential Pressure Transmitter",
                "template_id": "dt-1",
                "template_name": "DT-Temp-Humidity Sensor Event Hub",
                "broker": "IoT Hub",
                "connection_string": "HostName=ahi-yokogawa-hub.azure-devices.net;DeviceId=dfc4960b-b9f0-42ef-8d94-43fd65e95631;SharedAccessKey=x7T18f...==",
                "metric_retention_days": 90,
                "sas_token_duration": 365,
                "primary_key": "aW90aHViLXByaW1hcnkta2V5LTI1NmJpdC1iYXNlNjQtZW5jb2RlZA==",
                "sas_token": "SharedAccessSignature sr=ahi-yokogawa-hub.azure-devices.net%2Fdevices%2Fdfc4960b&sig=P9wL...&se=1741161600",
                "has_command": True,
                "health_check": True,
                "health_check_method": "Server Monitoring",
                "monitoring_time_secs": 60,
                "status": "Connected",
                "last_edited": now_iso,
                "last_seen": now_iso,
                "binding_value": "9"
            },
            {
                "id": "dev-2",
                "identifier": "pump-p101a-hub-01",
                "name": "Centrifugal Pump P-101A Smart Sensor Array",
                "template_id": "dt-2",
                "template_name": "DT-Centrifugal Pump Sensor Suite",
                "broker": "IoT Hub",
                "connection_string": "HostName=ahi-yokogawa-hub.azure-devices.net;DeviceId=pump-p101a-hub-01;SharedAccessKey=m3Q91...==",
                "metric_retention_days": 180,
                "sas_token_duration": 180,
                "primary_key": "cHVtcC1wMTAxYS1wcmltYXJ5LXNlY3JldC1rZXktYmFzZTY0",
                "sas_token": "SharedAccessSignature sr=ahi-yokogawa-hub.azure-devices.net%2Fdevices%2Fpump-p101a-hub-01&sig=k39...",
                "has_command": True,
                "health_check": True,
                "health_check_method": "Server Monitoring",
                "monitoring_time_secs": 45,
                "status": "Connected",
                "last_edited": now_iso,
                "last_seen": now_iso,
                "binding_value": "2950"
            },
            {
                "id": "dev-3",
                "identifier": "cdu-overhead-yokogawa-yta610",
                "name": "Overhead Column Multi-Point Temperature Transmitter YTA610",
                "template_id": "dt-1",
                "template_name": "DT-Temp-Humidity Sensor Event Hub",
                "broker": "MQTT",
                "username": "mqtt_cdu_yta610",
                "password": "••••••••",
                "topic_telemetry": "refinery/cdu/yta610/telemetry",
                "topic_command": "refinery/cdu/yta610/command",
                "has_command": False,
                "health_check": True,
                "health_check_method": "Server Monitoring",
                "monitoring_time_secs": 60,
                "status": "Connected",
                "last_edited": now_iso,
                "last_seen": now_iso,
                "binding_value": ""
            },
            {
                "id": "dev-4",
                "identifier": "fieldeye-wireless-vib-04",
                "name": "Wireless Explosion-Proof Vibration Sensor",
                "template_id": "dt-2",
                "template_name": "DT-Centrifugal Pump Sensor Suite",
                "broker": "CoAP",
                "username": "coap_vib_sensor_04",
                "password": "••••••••",
                "health_check": False,
                "health_check_method": "Server Monitoring",
                "monitoring_time_secs": 120,
                "status": "Not Applicable",
                "last_edited": now_iso,
                "last_seen": now_iso,
                "binding_value": ""
            },
            {
                "id": "dev-f101-01",
                "identifier": "furnace-f101-bms-hub",
                "name": "F-101 Crude Charge Heater Burner Management System",
                "template_id": "dt-1",
                "template_name": "DT-Temp-Humidity Sensor Event Hub",
                "broker": "CENTUM VP DCS & Industrial OPC UA Server Gateway",
                "connection_string": "opc.tcp://127.0.0.1:4840/yokogawa/server/f101",
                "metric_retention_days": 180,
                "has_command": True,
                "health_check": True,
                "health_check_method": "Server Monitoring",
                "monitoring_time_secs": 30,
                "status": "Connected",
                "last_edited": now_iso,
                "last_seen": now_iso,
                "binding_value": "840"
            },
            {
                "id": "dev-vdu-01",
                "identifier": "vdu-201-proc-gateway",
                "name": "V-201 Vacuum Tower High-Precision Pressure & Level Suite",
                "template_id": "dt-1",
                "template_name": "DT-Temp-Humidity Sensor Event Hub",
                "broker": "CENTUM VP DCS & Industrial OPC UA Server Gateway",
                "connection_string": "opc.tcp://127.0.0.1:4840/yokogawa/server/vdu201",
                "metric_retention_days": 180,
                "has_command": True,
                "health_check": True,
                "health_check_method": "Server Monitoring",
                "monitoring_time_secs": 30,
                "status": "Connected",
                "last_edited": now_iso,
                "last_seen": now_iso,
                "binding_value": "42"
            },
            {
                "id": "dev-fccu-01",
                "identifier": "fccu-301-apc-node",
                "name": "FCCU-301 Advanced Process Control & Catalyst Loop DCS-0301",
                "template_id": "dt-2",
                "template_name": "DT-Centrifugal Pump Sensor Suite",
                "broker": "Yokogawa Azure IoT Hub - Main",
                "connection_string": "HostName=ahi-yokogawa-hub.azure-devices.net;DeviceId=fccu-301-apc;SharedAccessKey=f8K...==",
                "metric_retention_days": 365,
                "has_command": True,
                "health_check": True,
                "health_check_method": "Server Monitoring",
                "monitoring_time_secs": 15,
                "status": "Connected",
                "last_edited": now_iso,
                "last_seen": now_iso,
                "binding_value": "532"
            },
            {
                "id": "dev-dht-01",
                "identifier": "dht-101-safety-pod",
                "name": "DHT-101 High Pressure Hydrotreater Safety Logic Solver",
                "template_id": "dt-1",
                "template_name": "DT-Temp-Humidity Sensor Event Hub",
                "broker": "CENTUM VP DCS & Industrial OPC UA Server Gateway",
                "connection_string": "opc.tcp://127.0.0.1:4840/yokogawa/server/dht101",
                "metric_retention_days": 365,
                "has_command": True,
                "health_check": True,
                "health_check_method": "Server Monitoring",
                "monitoring_time_secs": 10,
                "status": "Connected",
                "last_edited": now_iso,
                "last_seen": now_iso,
                "binding_value": "378"
            },
            {
                "id": "dev-tank-01",
                "identifier": "tankfarm-rtg-gateway-100",
                "name": "Tank Farm Radar Tank Gauging Gateway RTG-100",
                "template_id": "dt-1",
                "template_name": "DT-Temp-Humidity Sensor Event Hub",
                "broker": "Modbus TCP Field Gateway",
                "connection_string": "modbus://127.0.0.1:502/tankfarm",
                "metric_retention_days": 180,
                "has_command": False,
                "health_check": True,
                "health_check_method": "Server Monitoring",
                "monitoring_time_secs": 60,
                "status": "Connected",
                "last_edited": now_iso,
                "last_seen": now_iso,
                "binding_value": "12.4"
            },
            {
                "id": "dev-flare-01",
                "identifier": "flare-fl101-uv-optical",
                "name": "Flare Stack FL-101 Multi-Spectral UV Flame & Purge Monitor",
                "template_id": "dt-1",
                "template_name": "DT-Temp-Humidity Sensor Event Hub",
                "broker": "Industrial Socket.IO Ingestion Broker",
                "connection_string": "http://127.0.0.1:91/socket.io/flare",
                "metric_retention_days": 180,
                "has_command": True,
                "health_check": True,
                "health_check_method": "Server Monitoring",
                "monitoring_time_secs": 15,
                "status": "Connected",
                "last_edited": now_iso,
                "last_seen": now_iso,
                "binding_value": "320"
            }
        ]

        # 7. Plant Hierarchy & Assets (Section 9.1)
        # Tree with parent-child hierarchy, drag & drop reordering support
        self.assets = [
            {
                "id": "ast-enterprise",
                "name": "Yokogawa Global Energy",
                "parent_id": None,
                "level": "ENTERPRISE",
                "path": "Yokogawa Global Energy",
                "description": "Global Petrochemical Operations",
                "installed_date": "2018-01-10",
                "is_bookmarked": True,
                "attributes": [],
                "tables": [],
                "media": []
            },
            {
                "id": "ast-site-jurong",
                "name": "Singapore Jurong Refinery",
                "parent_id": "ast-enterprise",
                "level": "SITE",
                "path": "Yokogawa Global Energy / Singapore Jurong Refinery",
                "description": "Main refining complex with CDU, VDU and FCCU units",
                "installed_date": "2019-06-15",
                "is_bookmarked": True,
                "attributes": [],
                "tables": [],
                "media": []
            },
            {
                "id": "ast-area-01",
                "name": "Area 01 - Crude Distillation Complex",
                "parent_id": "ast-site-jurong",
                "level": "AREA",
                "path": "Yokogawa Global Energy / Singapore Jurong Refinery / Area 01 - Crude Distillation Complex",
                "description": "Crude fractionation, preheat train and column overhead separation",
                "installed_date": "2020-03-01",
                "is_bookmarked": False,
                "attributes": [],
                "tables": [],
                "media": []
            },
            {
                "id": "ast-unit-cdu",
                "name": "Atmospheric Distillation Unit C-101",
                "parent_id": "ast-area-01",
                "level": "UNIT",
                "path": "Yokogawa Global Energy / Singapore Jurong Refinery / Area 01 - Crude Distillation Complex / Atmospheric Distillation Unit C-101",
                "description": "Crude distillation tower with 48 fractionation trays and side strippers",
                "installed_date": "2020-05-12",
                "is_bookmarked": True,
                "attributes": [
                    {
                        "id": "attr-cdu-1",
                        "type": "Dynamic",
                        "name": "Overhead Vapor Temperature",
                        "value": "118.4",
                        "uom": "°C",
                        "device_id": "cdu-overhead-yokogawa-yta610",
                        "metric": "temperature",
                        "tag_name": "cdu-overhead-yokogawa-yta610.temperature",
                        "expression": "",
                        "quality": "Good",
                        "timestamp": now_iso,
                        "data_type": "Double"
                    },
                    {
                        "id": "attr-cdu-2",
                        "type": "Dynamic",
                        "name": "Column Top Pressure",
                        "value": "145.2",
                        "uom": "kPa",
                        "device_id": "dfc4960b-b9f0-42ef-8d94-43fd65e95631",
                        "metric": "temperature",
                        "tag_name": "dfc4960b-b9f0-42ef-8d94-43fd65e95631.temperature",
                        "expression": "",
                        "quality": "Good",
                        "timestamp": now_iso,
                        "data_type": "Double"
                    },
                    {
                        "id": "attr-cdu-3",
                        "type": "Static",
                        "name": "Design Max Operating Temp",
                        "value": "260.0",
                        "uom": "°C",
                        "tag_name": "cdu.max_temp_spec",
                        "expression": "",
                        "quality": "Good",
                        "timestamp": now_iso,
                        "data_type": "Static"
                    },
                    {
                        "id": "attr-cdu-4",
                        "type": "Integration",
                        "name": "Environmental Carbon Dioxide",
                        "value": "415.0",
                        "uom": "%",
                        "device_id": "gk_client_ahi_jurong",
                        "metric": "co2_ppm",
                        "channel": "Green Koncepts Energy Cloud Connector",
                        "tag_name": "gk_client_ahi_jurong.co2_ppm",
                        "expression": "",
                        "quality": "Good",
                        "timestamp": now_iso,
                        "data_type": "Integration"
                    }
                ],
                "tables": [
                    {
                        "id": "tbl-cdu-1",
                        "name": "Tray Inspection & Fouling Log",
                        "description": "Annual internal tray wall thickness, corrosion rate and downcomer clearance records",
                        "locked_by": "k.yamamoto@yokogawa.com",
                        "columns": [
                            {"name": "Inspection_ID", "data_type": "Varchar(25)", "default_value": "INSP-001", "allow_null": False, "primary": True},
                            {"name": "Tray_Number", "data_type": "Int", "default_value": "1", "allow_null": False, "primary": False},
                            {"name": "Thickness_mm", "data_type": "Double", "default_value": "12.5", "allow_null": False, "primary": False},
                            {"name": "Corrosion_Rate_mm_yr", "data_type": "Double", "default_value": "0.15", "allow_null": True, "primary": False},
                            {"name": "Pass_Clearance", "data_type": "Boolean", "default_value": "true", "allow_null": False, "primary": False},
                            {"name": "Inspector_Notes", "data_type": "Text", "default_value": "Surface cleaned, no pitting", "allow_null": True, "primary": False},
                            {"name": "Inspection_Date", "data_type": "Datetime", "default_value": "2024-02-15 10:00:00", "allow_null": False, "primary": False}
                        ],
                        "rows": [
                            {"Inspection_ID": "INSP-2024-T01", "Tray_Number": 1, "Thickness_mm": 12.42, "Corrosion_Rate_mm_yr": 0.12, "Pass_Clearance": True, "Inspector_Notes": "Tray deck intact, bubble caps free of coke", "Inspection_Date": "2024-02-15 09:30:00"},
                            {"Inspection_ID": "INSP-2024-T12", "Tray_Number": 12, "Thickness_mm": 12.18, "Corrosion_Rate_mm_yr": 0.18, "Pass_Clearance": True, "Inspector_Notes": "Minor salt deposition removed during wash", "Inspection_Date": "2024-02-15 11:15:00"},
                            {"Inspection_ID": "INSP-2024-T24", "Tray_Number": 24, "Thickness_mm": 11.95, "Corrosion_Rate_mm_yr": 0.22, "Pass_Clearance": True, "Inspector_Notes": "Normal wear, clearance within API 510 limit", "Inspection_Date": "2024-02-15 14:00:00"},
                            {"Inspection_ID": "INSP-2024-T36", "Tray_Number": 36, "Thickness_mm": 11.80, "Corrosion_Rate_mm_yr": 0.25, "Pass_Clearance": True, "Inspector_Notes": "Heavy gas oil section, acceptable fouling factor", "Inspection_Date": "2024-02-15 15:45:00"}
                        ],
                        "last_edited": now_iso
                    }
                ],
                "media": [
                    {
                        "id": "med-cdu-1",
                        "type": "Folder",
                        "name": "Engineering P&IDs & Isometrics",
                        "content_type": "Folder",
                        "file_size_kb": 0,
                        "path": "/Engineering P&IDs & Isometrics",
                        "last_edited": now_iso
                    },
                    {
                        "id": "med-cdu-2",
                        "type": "Media File",
                        "name": "C-101 Distillation Column P&ID Diagram.pdf",
                        "content_type": "PDF",
                        "file_size_kb": 2450,
                        "path": "/Engineering P&IDs & Isometrics/C-101 Distillation Column P&ID Diagram.pdf",
                        "url": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800",
                        "last_edited": now_iso
                    },
                    {
                        "id": "med-cdu-3",
                        "type": "Media File",
                        "name": "Fractionation Tray Cutaway Schematic.jpeg",
                        "content_type": "JPEG",
                        "file_size_kb": 890,
                        "path": "/Engineering P&IDs & Isometrics/Fractionation Tray Cutaway Schematic.jpeg",
                        "url": "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800",
                        "last_edited": now_iso
                    }
                ]
            },
            {
                "id": "ast-eq-pump",
                "name": "Crude Feed Charge Pump P-101A",
                "parent_id": "ast-unit-cdu",
                "level": "EQUIPMENT",
                "path": "Yokogawa Global Energy / Singapore Jurong Refinery / Area 01 - Crude Distillation Complex / Atmospheric Distillation Unit C-101 / Crude Feed Charge Pump P-101A",
                "description": "Centrifugal multi-stage API 610 crude charge pump driven by 150kW electric motor",
                "installed_date": "2021-01-20",
                "is_bookmarked": True,
                "attributes": [
                    {
                        "id": "attr-pmp-1",
                        "type": "Dynamic",
                        "name": "Discharge Pressure",
                        "value": "582.4",
                        "uom": "kPa",
                        "device_id": "pump-p101a-hub-01",
                        "metric": "discharge_pressure",
                        "tag_name": "pump-p101a-hub-01.discharge_pressure",
                        "expression": "",
                        "quality": "Good",
                        "timestamp": now_iso,
                        "data_type": "Double"
                    },
                    {
                        "id": "attr-pmp-2",
                        "type": "Dynamic",
                        "name": "Suction Pressure",
                        "value": "124.5",
                        "uom": "kPa",
                        "device_id": "pump-p101a-hub-01",
                        "metric": "suction_pressure",
                        "tag_name": "pump-p101a-hub-01.suction_pressure",
                        "expression": "",
                        "quality": "Good",
                        "timestamp": now_iso,
                        "data_type": "Double"
                    },
                    {
                        "id": "attr-pmp-3",
                        "type": "Dynamic",
                        "name": "In Fluid Density",
                        "value": "842.0",
                        "uom": "kg/m³",
                        "device_id": "pump-p101a-hub-01",
                        "metric": "fluid_density",
                        "tag_name": "pump-p101a-hub-01.fluid_density",
                        "expression": "",
                        "quality": "Good",
                        "timestamp": now_iso,
                        "data_type": "Double"
                    },
                    {
                        "id": "attr-pmp-4",
                        "type": "Dynamic",
                        "name": "Bearing Vibration",
                        "value": "2.45",
                        "uom": "mm/s",
                        "device_id": "pump-p101a-hub-01",
                        "metric": "bearing_vibration",
                        "tag_name": "pump-p101a-hub-01.bearing_vibration",
                        "expression": "",
                        "quality": "Good",
                        "timestamp": now_iso,
                        "data_type": "Double"
                    },
                    {
                        "id": "attr-pmp-5",
                        "type": "Runtime",
                        "name": "Pump Differential Head",
                        "value": "55.43",
                        "uom": "m",
                        "tag_name": "pump.differential_head_calc",
                        "expression": "return (1000 * (@Discharge_Pressure - @Suction_Pressure) / (9.81 * @In_Fluid_Density));",
                        "quality": "Good",
                        "timestamp": now_iso,
                        "data_type": "Double",
                        "trigger_attribute": "Discharge Pressure"
                    },
                    {
                        "id": "attr-pmp-6",
                        "type": "Alias",
                        "name": "Ref CDU Column Overhead Temp",
                        "value": "118.4",
                        "uom": "°C",
                        "target_asset_id": "ast-unit-cdu",
                        "target_asset_name": "Atmospheric Distillation Unit C-101",
                        "target_attribute_name": "Overhead Vapor Temperature",
                        "tag_name": "Atmospheric Distillation Unit C-101.Overhead Vapor Temperature",
                        "expression": "",
                        "quality": "Good",
                        "timestamp": now_iso,
                        "data_type": "Alias"
                    },
                    {
                        "id": "attr-pmp-7",
                        "type": "Command",
                        "name": "Emergency Shutdown Interlock",
                        "value": "0",
                        "uom": "",
                        "device_id": "pump-p101a-hub-01",
                        "metric": "remote_trip_command",
                        "tag_name": "pump-p101a-hub-01.remote_trip_command",
                        "expression": "",
                        "quality": "Good",
                        "timestamp": now_iso,
                        "data_type": "Command"
                    }
                ],
                "tables": [
                    {
                        "id": "tbl-pmp-1",
                        "name": "P-101A Bearing Lubrication Log",
                        "description": "Weekly synthetic grease replenishment and temperature logs",
                        "locked_by": "s.alvarez@yokogawa.com",
                        "columns": [
                            {"name": "Log_ID", "data_type": "Varchar(25)", "default_value": "LUBE-01", "allow_null": False, "primary": True},
                            {"name": "Grease_Type", "data_type": "Varchar(50)", "default_value": "Mobilith SHC 100", "allow_null": False, "primary": False},
                            {"name": "Quantity_grams", "data_type": "Int", "default_value": "120", "allow_null": False, "primary": False},
                            {"name": "Bearing_Temp_C", "data_type": "Double", "default_value": "64.2", "allow_null": False, "primary": False},
                            {"name": "Grease_Color_Normal", "data_type": "Boolean", "default_value": "true", "allow_null": False, "primary": False},
                            {"name": "Logged_At", "data_type": "Datetime", "default_value": "2024-03-01 08:00:00", "allow_null": False, "primary": False}
                        ],
                        "rows": [
                            {"Log_ID": "LUBE-W09", "Grease_Type": "Mobilith SHC 100", "Quantity_grams": 120, "Bearing_Temp_C": 64.1, "Grease_Color_Normal": True, "Logged_At": "2024-03-01 08:15:00"},
                            {"Log_ID": "LUBE-W08", "Grease_Type": "Mobilith SHC 100", "Quantity_grams": 115, "Bearing_Temp_C": 63.8, "Grease_Color_Normal": True, "Logged_At": "2024-02-23 08:30:00"}
                        ],
                        "last_edited": now_iso
                    }
                ],
                "media": [
                    {
                        "id": "med-pmp-1",
                        "type": "Folder",
                        "name": "Maintenance Manuals & OEM Drawings",
                        "content_type": "Folder",
                        "file_size_kb": 0,
                        "path": "/Maintenance Manuals & OEM Drawings",
                        "last_edited": now_iso
                    },
                    {
                        "id": "med-pmp-2",
                        "type": "Media File",
                        "name": "Yokogawa P-101A API-610 Manual.pdf",
                        "content_type": "PDF",
                        "file_size_kb": 4120,
                        "path": "/Maintenance Manuals & OEM Drawings/Yokogawa P-101A API-610 Manual.pdf",
                        "url": "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800",
                        "last_edited": now_iso
                    },
                    {
                        "id": "med-pmp-3",
                        "type": "Media File",
                        "name": "Mechanical Seal Assembly Cross-Section.png",
                        "content_type": "PNG",
                        "file_size_kb": 1250,
                        "path": "/Maintenance Manuals & OEM Drawings/Mechanical Seal Assembly Cross-Section.png",
                        "url": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800",
                        "last_edited": now_iso
                    }
                ]
            },
            {
                "id": "ast-eq-drum",
                "name": "Overhead Accumulator Drum V-101",
                "parent_id": "ast-unit-cdu",
                "level": "EQUIPMENT",
                "path": "Yokogawa Global Energy / Singapore Jurong Refinery / Area 01 - Crude Distillation Complex / Atmospheric Distillation Unit C-101 / Overhead Accumulator Drum V-101",
                "description": "Three-phase separation vessel separating naphtha reflux, sour water and offgas",
                "installed_date": "2020-04-18",
                "is_bookmarked": False,
                "attributes": [
                    {
                        "id": "attr-v101-1",
                        "type": "Dynamic",
                        "name": "Hydrocarbon Liquid Level",
                        "value": "62.4",
                        "uom": "%",
                        "device_id": "dfc4960b-b9f0-42ef-8d94-43fd65e95631",
                        "metric": "humidity",
                        "tag_name": "dfc4960b-b9f0-42ef-8d94-43fd65e95631.humidity",
                        "expression": "",
                        "quality": "Good",
                        "timestamp": now_iso,
                        "data_type": "Double"
                    }
                ],
                "tables": [],
                "media": []
            },
            {
                "id": "ast-unit-furnace",
                "name": "Crude Charge Fired Heater F-101",
                "parent_id": "ast-area-01",
                "level": "UNIT",
                "path": "Yokogawa Global Energy / Singapore Jurong Refinery / Area 01 - Crude Distillation Complex / Crude Charge Fired Heater F-101",
                "description": "Cabin-type natural draft fired heater with dual radiant cells and convection preheat bank",
                "installed_date": "2020-04-10",
                "is_bookmarked": True,
                "attributes": [
                    {"id": "attr-f101-1", "type": "Dynamic", "name": "Firebox Bridgewall Temp", "value": "842.5", "uom": "°C", "device_id": "dev-f101-01", "metric": "temperature", "tag_name": "F101_TI_101.PV", "quality": "Good", "timestamp": now_iso, "data_type": "Double"},
                    {"id": "attr-f101-2", "type": "Dynamic", "name": "Coil Outlet Temp (COT)", "value": "368.2", "uom": "°C", "device_id": "dev-f101-01", "metric": "temperature", "tag_name": "F101_TIC_102.PV", "quality": "Good", "timestamp": now_iso, "data_type": "Double"},
                    {"id": "attr-f101-3", "type": "Dynamic", "name": "Flue Gas Excess O2", "value": "2.8", "uom": "%", "device_id": "dev-f101-01", "metric": "humidity", "tag_name": "F101_AIC_103.PV", "quality": "Good", "timestamp": now_iso, "data_type": "Double"},
                    {"id": "attr-f101-4", "type": "Dynamic", "name": "Stack Draft Pressure", "value": "-0.12", "uom": "kPa", "device_id": "dev-f101-01", "metric": "pressure", "tag_name": "F101_PIC_104.PV", "quality": "Good", "timestamp": now_iso, "data_type": "Double"},
                    {"id": "attr-f101-5", "type": "Dynamic", "name": "Fuel Gas Flow Rate", "value": "1250.0", "uom": "m³/h", "device_id": "dev-f101-01", "metric": "flow_rate", "tag_name": "F101_FIC_105.PV", "quality": "Good", "timestamp": now_iso, "data_type": "Double"}
                ],
                "tables": [
                    {
                        "id": "tbl-f101-1",
                        "name": "F-101 Tube Skin Thermocouple Log",
                        "description": "Daily radiant section tube skin temperature survey & coking inspection",
                        "locked_by": "k.yamamoto@yokogawa.com",
                        "columns": [
                            {"name": "Pass_ID", "data_type": "Varchar(20)", "default_value": "PASS-A", "allow_null": False, "primary": True},
                            {"name": "Skin_Temp_C", "data_type": "Double", "default_value": "485.0", "allow_null": False, "primary": False},
                            {"name": "Flow_m3h", "data_type": "Double", "default_value": "115.0", "allow_null": False, "primary": False},
                            {"name": "Flame_Impingement", "data_type": "Boolean", "default_value": "false", "allow_null": False, "primary": False}
                        ],
                        "rows": [
                            {"Pass_ID": "PASS-A1", "Skin_Temp_C": 482.4, "Flow_m3h": 114.5, "Flame_Impingement": False},
                            {"Pass_ID": "PASS-A2", "Skin_Temp_C": 486.1, "Flow_m3h": 112.8, "Flame_Impingement": False},
                            {"Pass_ID": "PASS-B1", "Skin_Temp_C": 479.8, "Flow_m3h": 116.2, "Flame_Impingement": False},
                            {"Pass_ID": "PASS-B2", "Skin_Temp_C": 483.5, "Flow_m3h": 113.9, "Flame_Impingement": False}
                        ],
                        "last_edited": now_iso
                    }
                ],
                "media": [
                    {
                        "id": "med-f101-1",
                        "type": "Media File",
                        "name": "F-101 Burner Management System (BMS) Interlock Logic.pdf",
                        "content_type": "PDF",
                        "file_size_kb": 1820,
                        "path": "/Furnace Documents/F-101 Burner Management System (BMS) Interlock Logic.pdf",
                        "url": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800",
                        "last_edited": now_iso
                    },
                    {
                        "id": "med-f101-2",
                        "type": "Media File",
                        "name": "Radiant Section Tube Wall Isometric Diagram.jpeg",
                        "content_type": "JPEG",
                        "file_size_kb": 940,
                        "path": "/Furnace Documents/Radiant Section Tube Wall Isometric Diagram.jpeg",
                        "url": "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800",
                        "last_edited": now_iso
                    }
                ]
            },
            {
                "id": "ast-unit-vdu",
                "name": "Vacuum Distillation Unit V-201",
                "parent_id": "ast-area-01",
                "level": "UNIT",
                "path": "Yokogawa Global Energy / Singapore Jurong Refinery / Area 01 - Crude Distillation Complex / Vacuum Distillation Unit V-201",
                "description": "Deep vacuum fractionator processing atmospheric residue with structured packing",
                "installed_date": "2020-06-18",
                "is_bookmarked": True,
                "attributes": [
                    {"id": "attr-vdu-1", "type": "Dynamic", "name": "Column Top Vacuum", "value": "42.5", "uom": "kPa", "device_id": "dev-vdu-01", "metric": "pressure", "tag_name": "V201_PIC_201.PV", "quality": "Good", "timestamp": now_iso, "data_type": "Double"},
                    {"id": "attr-vdu-2", "type": "Dynamic", "name": "Flash Zone Temperature", "value": "395.0", "uom": "°C", "device_id": "dev-vdu-01", "metric": "temperature", "tag_name": "V201_TIC_202.PV", "quality": "Good", "timestamp": now_iso, "data_type": "Double"},
                    {"id": "attr-vdu-3", "type": "Dynamic", "name": "VGO Draw Rate", "value": "185.4", "uom": "m³/h", "device_id": "dev-vdu-01", "metric": "flow_rate", "tag_name": "V201_FIC_203.PV", "quality": "Good", "timestamp": now_iso, "data_type": "Double"},
                    {"id": "attr-vdu-4", "type": "Dynamic", "name": "Residue Sump Level", "value": "58.2", "uom": "%", "device_id": "dev-vdu-01", "metric": "level", "tag_name": "V201_LIC_204.PV", "quality": "Good", "timestamp": now_iso, "data_type": "Double"}
                ],
                "tables": [
                    {
                        "id": "tbl-vdu-1",
                        "name": "V-201 Ejector Vacuum Performance Log",
                        "description": "Steam jet vacuum ejector motive pressure, cooling water delta-T and suction vacuum records",
                        "locked_by": "k.yamamoto@yokogawa.com",
                        "columns": [
                            {"name": "Stage", "data_type": "Varchar(10)", "default_value": "Stage-1", "allow_null": False, "primary": True},
                            {"name": "Motive_Steam_Bar", "data_type": "Double", "default_value": "10.5", "allow_null": False, "primary": False},
                            {"name": "Suction_kPa", "data_type": "Double", "default_value": "4.2", "allow_null": False, "primary": False},
                            {"name": "Status", "data_type": "Varchar(20)", "default_value": "NORMAL", "allow_null": False, "primary": False}
                        ],
                        "rows": [
                            {"Stage": "EJ-101A", "Motive_Steam_Bar": 10.4, "Suction_kPa": 3.8, "Status": "NORMAL"},
                            {"Stage": "EJ-101B", "Motive_Steam_Bar": 10.5, "Suction_kPa": 4.1, "Status": "NORMAL"},
                            {"Stage": "EJ-102A", "Motive_Steam_Bar": 10.2, "Suction_kPa": 18.5, "Status": "NORMAL"}
                        ],
                        "last_edited": now_iso
                    }
                ],
                "media": [
                    {
                        "id": "med-vdu-1",
                        "type": "Media File",
                        "name": "V-201 Vacuum Column Process Flow Diagram (PFD).pdf",
                        "content_type": "PDF",
                        "file_size_kb": 3120,
                        "path": "/VDU Documents/V-201 Vacuum Column Process Flow Diagram (PFD).pdf",
                        "url": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800",
                        "last_edited": now_iso
                    }
                ]
            },
            {
                "id": "ast-area-02",
                "name": "Area 02 - Catalytic Conversion & Hydrotreating",
                "parent_id": "ast-site-jurong",
                "level": "AREA",
                "path": "Yokogawa Global Energy / Singapore Jurong Refinery / Area 02 - Catalytic Conversion & Hydrotreating",
                "description": "Heavy oil upgrading, fluid catalytic cracking, and ultra-low sulfur diesel hydrotreating",
                "installed_date": "2021-02-15",
                "is_bookmarked": False,
                "attributes": [],
                "tables": [],
                "media": []
            },
            {
                "id": "ast-unit-fccu",
                "name": "Fluid Catalytic Cracking Unit FCCU-301",
                "parent_id": "ast-area-02",
                "level": "UNIT",
                "path": "Yokogawa Global Energy / Singapore Jurong Refinery / Area 02 - Catalytic Conversion & Hydrotreating / Fluid Catalytic Cracking Unit FCCU-301",
                "description": "High-severity riser catalytic cracker with dual-stage regenerator for gasoline and olefin production",
                "installed_date": "2021-03-20",
                "is_bookmarked": True,
                "attributes": [
                    {"id": "attr-fccu-1", "type": "Dynamic", "name": "Riser Outlet Temp (ROT)", "value": "532.0", "uom": "°C", "device_id": "dev-fccu-01", "metric": "temperature", "tag_name": "FCCU_TIC_301.PV", "quality": "Good", "timestamp": now_iso, "data_type": "Double"},
                    {"id": "attr-fccu-2", "type": "Dynamic", "name": "Regenerator Dense Bed Temp", "value": "710.5", "uom": "°C", "device_id": "dev-fccu-01", "metric": "temperature", "tag_name": "FCCU_TIC_302.PV", "quality": "Good", "timestamp": now_iso, "data_type": "Double"},
                    {"id": "attr-fccu-3", "type": "Dynamic", "name": "Catalyst Circulation Rate", "value": "24.5", "uom": "kg/m³", "device_id": "dev-fccu-01", "metric": "fluid_density", "tag_name": "FCCU_WIC_303.PV", "quality": "Good", "timestamp": now_iso, "data_type": "Double"},
                    {"id": "attr-fccu-4", "type": "Dynamic", "name": "Reactor Riser Pressure", "value": "210.0", "uom": "kPa", "device_id": "dev-fccu-01", "metric": "discharge_pressure", "tag_name": "FCCU_PIC_304.PV", "quality": "Good", "timestamp": now_iso, "data_type": "Double"}
                ],
                "tables": [
                    {
                        "id": "tbl-fccu-1",
                        "name": "FCCU Catalyst Activity & Equilibrium Metals Log",
                        "description": "Daily lab assays for Zeolite surface area, Vanadium and Nickel contamination",
                        "locked_by": "k.yamamoto@yokogawa.com",
                        "columns": [
                            {"name": "Sample_Date", "data_type": "Datetime", "default_value": "2024-02-15", "allow_null": False, "primary": True},
                            {"name": "Surface_Area_m2g", "data_type": "Double", "default_value": "135.0", "allow_null": False, "primary": False},
                            {"name": "Vanadium_ppm", "data_type": "Double", "default_value": "1450.0", "allow_null": False, "primary": False},
                            {"name": "Nickel_ppm", "data_type": "Double", "default_value": "620.0", "allow_null": False, "primary": False}
                        ],
                        "rows": [
                            {"Sample_Date": "2024-02-13", "Surface_Area_m2g": 138.4, "Vanadium_ppm": 1420.0, "Nickel_ppm": 612.0},
                            {"Sample_Date": "2024-02-14", "Surface_Area_m2g": 136.2, "Vanadium_ppm": 1438.0, "Nickel_ppm": 618.0},
                            {"Sample_Date": "2024-02-15", "Surface_Area_m2g": 135.1, "Vanadium_ppm": 1450.0, "Nickel_ppm": 625.0}
                        ],
                        "last_edited": now_iso
                    }
                ],
                "media": [
                    {
                        "id": "med-fccu-1",
                        "type": "Media File",
                        "name": "FCCU-301 Reactor & Regenerator Mechanical Layout.pdf",
                        "content_type": "PDF",
                        "file_size_kb": 4200,
                        "path": "/FCCU Documents/FCCU-301 Reactor & Regenerator Mechanical Layout.pdf",
                        "url": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800",
                        "last_edited": now_iso
                    }
                ]
            },
            {
                "id": "ast-unit-dht",
                "name": "Diesel Hydrotreating Unit DHT-101",
                "parent_id": "ast-area-02",
                "level": "UNIT",
                "path": "Yokogawa Global Energy / Singapore Jurong Refinery / Area 02 - Catalytic Conversion & Hydrotreating / Diesel Hydrotreating Unit DHT-101",
                "description": "Trickle-bed catalytic hydrotreater achieving Euro VI diesel sulfur standards (<10 ppm)",
                "installed_date": "2021-05-10",
                "is_bookmarked": True,
                "attributes": [
                    {"id": "attr-dht-1", "type": "Dynamic", "name": "Reactor R-101 Peak Bed Temp", "value": "378.0", "uom": "°C", "device_id": "dev-dht-01", "metric": "temperature", "tag_name": "DHT_TIC_401.PV", "quality": "Good", "timestamp": now_iso, "data_type": "Double"},
                    {"id": "attr-dht-2", "type": "Dynamic", "name": "Hydrogen Partial Pressure", "value": "6800.0", "uom": "kPa", "device_id": "dev-dht-01", "metric": "pressure", "tag_name": "DHT_PIC_402.PV", "quality": "Good", "timestamp": now_iso, "data_type": "Double"},
                    {"id": "attr-dht-3", "type": "Dynamic", "name": "H2/HC Treat Gas Ratio", "value": "320.0", "uom": "m³/h", "device_id": "dev-dht-01", "metric": "flow_rate", "tag_name": "DHT_FIC_403.PV", "quality": "Good", "timestamp": now_iso, "data_type": "Double"},
                    {"id": "attr-dht-4", "type": "Dynamic", "name": "Product Diesel Sulfur", "value": "8.5", "uom": "%", "device_id": "dev-dht-01", "metric": "co2_ppm", "tag_name": "DHT_AIC_404.PV", "quality": "Good", "timestamp": now_iso, "data_type": "Double"}
                ],
                "tables": [
                    {
                        "id": "tbl-dht-1",
                        "name": "DHT Catalyst Bed Delta-P & Quench Log",
                        "description": "Bed 1 to Bed 3 pressure drop progression and H2 quench valve positions",
                        "locked_by": "k.yamamoto@yokogawa.com",
                        "columns": [
                            {"name": "Bed_Section", "data_type": "Varchar(15)", "default_value": "Bed-1", "allow_null": False, "primary": True},
                            {"name": "DeltaP_kPa", "data_type": "Double", "default_value": "45.0", "allow_null": False, "primary": False},
                            {"name": "Quench_Valve_Pct", "data_type": "Double", "default_value": "35.0", "allow_null": False, "primary": False}
                        ],
                        "rows": [
                            {"Bed_Section": "Bed-1 Top", "DeltaP_kPa": 42.1, "Quench_Valve_Pct": 28.5},
                            {"Bed_Section": "Bed-2 Inter", "DeltaP_kPa": 48.6, "Quench_Valve_Pct": 34.0},
                            {"Bed_Section": "Bed-3 Bottom", "DeltaP_kPa": 52.3, "Quench_Valve_Pct": 41.5}
                        ],
                        "last_edited": now_iso
                    }
                ],
                "media": [
                    {
                        "id": "med-dht-1",
                        "type": "Media File",
                        "name": "DHT-101 High-Pressure Loop Safety Assessment.pdf",
                        "content_type": "PDF",
                        "file_size_kb": 2950,
                        "path": "/DHT Documents/DHT-101 High-Pressure Loop Safety Assessment.pdf",
                        "url": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800",
                        "last_edited": now_iso
                    }
                ]
            },
            {
                "id": "ast-area-03",
                "name": "Area 03 - Offsites, Tank Farm & Utilities",
                "parent_id": "ast-site-jurong",
                "level": "AREA",
                "path": "Yokogawa Global Energy / Singapore Jurong Refinery / Area 03 - Offsites, Tank Farm & Utilities",
                "description": "Bulk atmospheric & pressurized hydrocarbon storage, blending manifolds, and safety flare headers",
                "installed_date": "2019-08-01",
                "is_bookmarked": False,
                "attributes": [],
                "tables": [],
                "media": []
            },
            {
                "id": "ast-unit-tankfarm",
                "name": "Crude & Product Tank Farm TK-100",
                "parent_id": "ast-area-03",
                "level": "UNIT",
                "path": "Yokogawa Global Energy / Singapore Jurong Refinery / Area 03 - Offsites, Tank Farm & Utilities / Crude & Product Tank Farm TK-100",
                "description": "Automated tank farm with API 2350 overfill prevention and Custody Transfer radar gauging",
                "installed_date": "2019-09-12",
                "is_bookmarked": True,
                "attributes": [
                    {"id": "attr-tf-1", "type": "Dynamic", "name": "TK-101 Crude Level", "value": "12.45", "uom": "m", "device_id": "dev-tank-01", "metric": "temperature", "tag_name": "TK101_LT_01.PV", "quality": "Good", "timestamp": now_iso, "data_type": "Double"},
                    {"id": "attr-tf-2", "type": "Dynamic", "name": "TK-102 Heavy Maya Level", "value": "9.80", "uom": "m", "device_id": "dev-tank-01", "metric": "temperature", "tag_name": "TK102_LT_02.PV", "quality": "Good", "timestamp": now_iso, "data_type": "Double"},
                    {"id": "attr-tf-3", "type": "Dynamic", "name": "TK-201 Naphtha Sphere Pressure", "value": "420.0", "uom": "kPa", "device_id": "dev-tank-01", "metric": "temperature", "tag_name": "TK201_PT_03.PV", "quality": "Good", "timestamp": now_iso, "data_type": "Double"}
                ],
                "tables": [
                    {
                        "id": "tbl-tf-1",
                        "name": "API 2350 Tank Overfill Calibration Records",
                        "description": "Automated level radar calibration & high-high emergency shutoff valve proof tests",
                        "locked_by": "k.yamamoto@yokogawa.com",
                        "columns": [
                            {"name": "Tank_Tag", "data_type": "Varchar(15)", "default_value": "TK-101", "allow_null": False, "primary": True},
                            {"name": "Capacity_m3", "data_type": "Double", "default_value": "50000.0", "allow_null": False, "primary": False},
                            {"name": "Proof_Test_Status", "data_type": "Varchar(20)", "default_value": "PASSED", "allow_null": False, "primary": False}
                        ],
                        "rows": [
                            {"Tank_Tag": "TK-101 (Arab Light)", "Capacity_m3": 50000.0, "Proof_Test_Status": "PASSED"},
                            {"Tank_Tag": "TK-102 (Maya Heavy)", "Capacity_m3": 50000.0, "Proof_Test_Status": "PASSED"},
                            {"Tank_Tag": "TK-201 (Naphtha)", "Capacity_m3": 25000.0, "Proof_Test_Status": "PASSED"}
                        ],
                        "last_edited": now_iso
                    }
                ],
                "media": [
                    {
                        "id": "med-tf-1",
                        "type": "Media File",
                        "name": "Tank Farm Containment Dike & Foam System Layout.pdf",
                        "content_type": "PDF",
                        "file_size_kb": 3600,
                        "path": "/Tank Farm Documents/Tank Farm Containment Dike & Foam System Layout.pdf",
                        "url": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800",
                        "last_edited": now_iso
                    }
                ]
            },
            {
                "id": "ast-unit-flare",
                "name": "Elevated Flare Stack FL-101 & Knockout System",
                "parent_id": "ast-area-03",
                "level": "UNIT",
                "path": "Yokogawa Global Energy / Singapore Jurong Refinery / Area 03 - Offsites, Tank Farm & Utilities / Elevated Flare Stack FL-101 & Knockout System",
                "description": "120m elevated smokeless steam-assisted flare stack for emergency relief depressurization",
                "installed_date": "2019-10-05",
                "is_bookmarked": True,
                "attributes": [
                    {"id": "attr-fl-1", "type": "Dynamic", "name": "Flare Header Flow Rate", "value": "320.0", "uom": "kg/m³", "device_id": "dev-flare-01", "metric": "temperature", "tag_name": "FL101_FT_01.PV", "quality": "Good", "timestamp": now_iso, "data_type": "Double"},
                    {"id": "attr-fl-2", "type": "Dynamic", "name": "Pilot Flame 1 Temp", "value": "780.0", "uom": "°C", "device_id": "dev-flare-01", "metric": "temperature", "tag_name": "FL101_TC_01.PV", "quality": "Good", "timestamp": now_iso, "data_type": "Double"},
                    {"id": "attr-fl-3", "type": "Dynamic", "name": "Knockout Drum Liquid Level", "value": "14.2", "uom": "%", "device_id": "dev-flare-01", "metric": "temperature", "tag_name": "FL101_LT_03.PV", "quality": "Good", "timestamp": now_iso, "data_type": "Double"},
                    {"id": "attr-fl-4", "type": "Dynamic", "name": "Smokeless Steam Ratio", "value": "0.35", "uom": "%", "device_id": "dev-flare-01", "metric": "temperature", "tag_name": "FL101_FC_04.PV", "quality": "Good", "timestamp": now_iso, "data_type": "Double"}
                ],
                "tables": [],
                "media": []
            }
        ]

        # 8. Asset Templates (Section 9.2, Table 9)
        # Includes Device Markup: Attribute1.device1.metric, Attribute2.device2.metric
        self.asset_templates = [
            {
                "id": "tmpl-pump",
                "name": "Standard API 610 Centrifugal Pump Template",
                "description": "Standardized pump asset model with suction/discharge pressure, vibration, motor power, and differential head calculation",
                "markup_devices": ["device1", "device2"],
                "markup_channels": ["channel1"],
                "attributes": [
                    {"name": "Suction Pressure", "type": "Dynamic", "uom": "kPa", "device_markup": "device1", "metric": "suction_pressure", "data_type": "Double", "decimal_place": 1},
                    {"name": "Discharge Pressure", "type": "Dynamic", "uom": "kPa", "device_markup": "device1", "metric": "discharge_pressure", "data_type": "Double", "decimal_place": 1},
                    {"name": "Bearing Vibration", "type": "Dynamic", "uom": "mm/s", "device_markup": "device2", "metric": "bearing_vibration", "data_type": "Double", "decimal_place": 2},
                    {"name": "Fluid Density", "type": "Dynamic", "uom": "kg/m³", "device_markup": "device1", "metric": "fluid_density", "data_type": "Double", "decimal_place": 1},
                    {"name": "Pump Differential Head", "type": "Runtime", "uom": "m", "expression": "return (1000 * (@Discharge_Pressure - @Suction_Pressure) / (9.81 * @Fluid_Density));", "data_type": "Double", "decimal_place": 2, "trigger_attribute": "Discharge Pressure"},
                    {"name": "Installed Date", "type": "Static", "uom": "", "value": "2024-01-01", "data_type": "Static"},
                    {"name": "Emergency Stop Trip", "type": "Command", "uom": "", "device_markup": "device1", "metric": "remote_trip_command", "data_type": "Command"}
                ]
            },
            {
                "id": "tmpl-heatex",
                "name": "Shell & Tube Heat Exchanger Template",
                "description": "Model for crude preheat exchangers with thermal duty, delta T and fouling calculations",
                "markup_devices": ["device1"],
                "markup_channels": ["channel1"],
                "attributes": [
                    {"name": "Tube Inlet Temperature", "type": "Dynamic", "uom": "°C", "device_markup": "device1", "metric": "temperature", "data_type": "Double", "decimal_place": 1},
                    {"name": "Tube Outlet Temperature", "type": "Dynamic", "uom": "°C", "device_markup": "device1", "metric": "humidity", "data_type": "Double", "decimal_place": 1},
                    {"name": "Thermal Gradient Delta T", "type": "Runtime", "uom": "°C", "expression": "return (@Tube_Outlet_Temperature - @Tube_Inlet_Temperature);", "data_type": "Double", "decimal_place": 2, "trigger_attribute": "Tube Outlet Temperature"}
                ]
            }
        ]

        # 9. Event Forwarding (Section 9.10, Table 19)
        self.event_forwardings = [
            {
                "id": "ef-1",
                "name": "Azure Event Hub Continuous Mirror",
                "active": True,
                "simplified_payload": True,
                "event_type": "Azure Event Hub",
                "connection_string": "Endpoint=sb://ahi-forwarder.servicebus.windows.net/;SharedAccessKeyName=SendRule;SharedAccessKey=q89a...==",
                "hub_name": "hub-refinery-mirror",
                "scope": [
                    {"asset_id": "ast-unit-cdu", "asset_name": "Atmospheric Distillation Unit C-101", "asset_path": "Yokogawa Global Energy / Singapore Jurong Refinery / Area 01 / C-101"},
                    {"asset_id": "ast-eq-pump", "asset_name": "Crude Feed Charge Pump P-101A", "asset_path": "Yokogawa Global Energy / Singapore Jurong Refinery / Area 01 / C-101 / P-101A"}
                ]
            },
            {
                "id": "ef-2",
                "name": "Plant RabbitMQ Message Queue",
                "active": False,
                "simplified_payload": False,
                "event_type": "RabbitMQ",
                "host": "192.168.10.85",
                "username": "ahi_rabbit_user",
                "password": "••••••••",
                "exchange_topic": "refinery.alerts.topic",
                "routing_key": "area01.cdu.telemetry",
                "scope": [
                    {"asset_id": "ast-eq-pump", "asset_name": "Crude Feed Charge Pump P-101A", "asset_path": "Yokogawa Global Energy / Singapore Jurong Refinery / Area 01 / C-101 / P-101A"}
                ]
            },
            {
                "id": "ef-3",
                "name": "Yokogawa Cloud Webhook Dispatcher",
                "active": True,
                "simplified_payload": True,
                "event_type": "Webhook",
                "endpoint": "https://cloud.yokogawa.com/api/v2/ingest/webhook",
                "scope": [
                    {"asset_id": "ast-unit-cdu", "asset_name": "Atmospheric Distillation Unit C-101", "asset_path": "Yokogawa Global Energy / Singapore Jurong Refinery / Area 01 / C-101"}
                ]
            }
        ]

        # 10. Alarm Management (Section 10)
        # 10.1 Alarm List (Table 27 priority colors: Urgent 751-1000 Purple, High 501-750 Red, Medium 251-500 Orange, Low 1-250 Yellow)
        self.alarms = [
            {
                "id": "alm-001",
                "tag_name": "dfc4960b-b9f0-42ef-8d94-43fd65e95631.temperature",
                "alarm_name": "C-101 Column Top High High Pressure Trip",
                "state": "In Alarm Unacknowledged",
                "priority": "Urgent",
                "severity": 820,
                "color": "Purple",
                "current_value": 328.5,
                "threshold_limit": 300.0,
                "class_type": "Safety",
                "source_asset": "Atmospheric Distillation Unit C-101",
                "occurred_at": "2024-03-05T08:14:22Z",
                "acknowledged_at": None,
                "acknowledged_by": None,
                "message": "Column top pressure exceeded Safety Integrity Level threshold (300.0 kPa). Potential overpressure condition."
            },
            {
                "id": "alm-002",
                "tag_name": "pump-p101a-hub-01.bearing_vibration",
                "alarm_name": "P-101A High Impeller Bearing Vibration",
                "state": "In Alarm Acknowledged",
                "priority": "High",
                "severity": 680,
                "color": "Red",
                "current_value": 3.82,
                "threshold_limit": 3.0,
                "class_type": "Process",
                "source_asset": "Crude Feed Charge Pump P-101A",
                "occurred_at": "2024-03-05T07:55:10Z",
                "acknowledged_at": "2024-03-05T07:58:30Z",
                "acknowledged_by": "s.alvarez@yokogawa.com",
                "message": "Bearing vibration exceeded 3.0 mm/s ISO limit. Lubrication or misalignment warning."
            },
            {
                "id": "alm-003",
                "tag_name": "pump.differential_head_calc",
                "alarm_name": "P-101A Differential Head Cavitation Warning",
                "state": "Normal Unacknowledged",
                "priority": "Medium",
                "severity": 380,
                "color": "Orange",
                "current_value": 55.43,
                "threshold_limit": 50.0,
                "class_type": "Alert",
                "source_asset": "Crude Feed Charge Pump P-101A",
                "occurred_at": "2024-03-05T06:10:00Z",
                "acknowledged_at": None,
                "acknowledged_by": None,
                "message": "Differential head dropped below operational margin. Condition has returned to normal."
            },
            {
                "id": "alm-004",
                "tag_name": "cdu.daily_desalter_wash",
                "alarm_name": "Crude Desalter Daily Flush Cycle Started",
                "state": "Event",
                "priority": "Low",
                "severity": 120,
                "color": "Yellow",
                "current_value": 1.0,
                "threshold_limit": 1.0,
                "class_type": "Event",
                "source_asset": "Atmospheric Distillation Unit C-101",
                "occurred_at": "2024-03-05T05:00:00Z",
                "acknowledged_at": "2024-03-05T05:01:00Z",
                "acknowledged_by": "system",
                "message": "Routine automated water wash sequence commenced."
            }
        ]

        # 10.2 Alarm History (Section 10.2, Figure 5 Alarm History Trail)
        self.alarm_histories = [
            {
                "id": "hist-001",
                "alarm_id": "5GB8888A-Speed",
                "alarm_name": "5GB8888A-Speed",
                "source_signal": "SGB8888A - Speed",
                "asset_name": "Gas Turbine Compressor 5GB8888A",
                "severity": 650,
                "priority": "High",
                "color": "Red",
                "cleared_at": "2024-03-05T07:45:58Z",
                # The 3 visual steps corresponding to Figure 5
                "trail": [
                    {
                        "step": 1,
                        "state": "UNACKNOWLEDGED",
                        "status_color": "#ef4444",
                        "timestamp": "30 Nov 2024 (15:24:30)",
                        "signal_value": "85 km/h",
                        "actor": "System Event Detection"
                    },
                    {
                        "step": 2,
                        "state": "ACKNOWLEDGED",
                        "status_color": "#f97316",
                        "timestamp": "30 Nov 2024 (15:24:37)",
                        "signal_value": "86 km/h",
                        "actor": "tg.tan@yokogawa.com (Tan Thye Guan)"
                    },
                    {
                        "step": 3,
                        "state": "NORMAL",
                        "status_color": "#10b981",
                        "timestamp": "30 Nov 2024 (15:24:58)",
                        "signal_value": "75 km/h",
                        "actor": "Process Condition Normalized"
                    }
                ]
            },
            {
                "id": "hist-002",
                "alarm_id": "CDU-TIC101-HIGH",
                "alarm_name": "CDU Overhead Temp High Trip",
                "source_signal": "cdu-overhead-yokogawa-yta610.temperature",
                "asset_name": "Atmospheric Distillation Unit C-101",
                "severity": 540,
                "priority": "High",
                "color": "Red",
                "cleared_at": "2024-03-04T18:22:15Z",
                "trail": [
                    {"step": 1, "state": "UNACKNOWLEDGED", "status_color": "#ef4444", "timestamp": "04 Mar 2024 (18:10:00)", "signal_value": "135.4 °C", "actor": "System Event Detection"},
                    {"step": 2, "state": "ACKNOWLEDGED", "status_color": "#f97316", "timestamp": "04 Mar 2024 (18:12:45)", "signal_value": "134.1 °C", "actor": "k.yamamoto@yokogawa.com"},
                    {"step": 3, "state": "NORMAL", "status_color": "#10b981", "timestamp": "04 Mar 2024 (18:22:15)", "signal_value": "118.2 °C", "actor": "Reflux increased, temperature restored"}
                ]
            }
        ]

        # 10.3 Alarm Rules (Section 10.3, Table 28)
        self.alarm_rules = [
            {
                "id": "rule-1",
                "name": "Column Top Pressure High-High Trip",
                "description": "Safety interlock trip for fractionator column overpressure",
                "area": "Yokogawa Global Energy / Singapore Jurong / Area 01 / C-101",
                "group": "Pressure Safety Systems",
                "alarm_type": "Analog",
                "class_type": "Safety",
                "source": "Atmospheric Distillation Unit C-101",
                "signal": "Column Top Pressure",
                "on_delay_seconds": 3,
                "off_delay_seconds": 5,
                "time_interval_seconds": 1,
                "required_acknowledge": True,
                "high_high_threshold": 300.0,
                "high_high_priority": "Urgent",
                "high_high_severity": 850,
                "high_high_message": "CRITICAL OVERPRESSURE: Column top pressure exceeded 300 kPa. Activate flare blowdown.",
                "high_threshold": 260.0,
                "high_priority": "High",
                "high_severity": 650,
                "high_message": "Column top pressure high warning (260 kPa). Check overhead condensers.",
                "low_threshold": 90.0,
                "low_priority": "Medium",
                "low_severity": 300,
                "low_message": "Column top vacuum warning. Check nitrogen purge.",
                "low_low_threshold": 60.0,
                "low_low_priority": "Urgent",
                "low_low_severity": 800,
                "low_low_message": "Sub-atmospheric condition detected. Potential vessel collapse hazard.",
                "notification_action_id": "act-1"
            },
            {
                "id": "rule-2",
                "name": "Charge Pump Vibration Alert",
                "description": "Continuous condition monitoring for bearing wear and cavitation",
                "area": "Yokogawa Global Energy / Singapore Jurong / Area 01 / C-101 / P-101A",
                "group": "Rotating Machinery Diagnostics",
                "alarm_type": "Analog",
                "class_type": "Process",
                "source": "Crude Feed Charge Pump P-101A",
                "signal": "Bearing Vibration",
                "on_delay_seconds": 5,
                "off_delay_seconds": 10,
                "time_interval_seconds": 1,
                "required_acknowledge": True,
                "high_high_threshold": 4.5,
                "high_high_priority": "Urgent",
                "high_high_severity": 900,
                "high_high_message": "PUMP EMERGENCY TRIP: Impeller bearing vibration critical (> 4.5 mm/s).",
                "high_threshold": 3.0,
                "high_priority": "High",
                "high_severity": 680,
                "high_message": "Vibration elevated (> 3.0 mm/s). Inspect mechanical seal & lubrication.",
                "notification_action_id": "act-2"
            },
            {
                "id": "rule-3",
                "name": "ESD Remote Trip State Interlock",
                "description": "Digital interlock monitoring of remote trip trigger command",
                "area": "Yokogawa Global Energy / Singapore Jurong / Area 01 / C-101 / P-101A",
                "group": "Safety Interlocks",
                "alarm_type": "Digital",
                "digital_condition": "<> 0",
                "priority": "Urgent",
                "severity": 950,
                "class_type": "Safety",
                "source": "Crude Feed Charge Pump P-101A",
                "signal": "Emergency Shutdown Interlock",
                "on_delay_seconds": 0,
                "off_delay_seconds": 2,
                "time_interval_seconds": 1,
                "required_acknowledge": True,
                "message": "EMERGENCY SHUTDOWN COMMAND ACTIVE: Charge pump forced shutdown by operator command.",
                "notification_action_id": "act-1"
            }
        ]

        # 10.4 Alarm Actions / Notifications (Section 10.4, Table 29)
        self.alarm_actions = [
            {
                "id": "act-1",
                "name": "Control Room Supervisor & Plant Safety Alert",
                "type": "Email",
                "subject": "[CRITICAL AHI ALARM] Area 01 Safety Trip Notification",
                "to_contact": "shift-supervisor@yokogawa.com, plant-safety@yokogawa.com",
                "attach_acknowledge_link": True,
                "add_ahi_header_footer": True,
                "content": "An urgent alarm condition occurred in Area 01 Atmospheric Distillation C-101. Please review immediate operating parameters and confirm safe actions."
            },
            {
                "id": "act-2",
                "name": "Maintenance Lead WhatsApp Notification",
                "type": "WhatsApp",
                "to_contact": "+65 9123 4567 (Lead Rotating Machinery Engineer)",
                "attach_acknowledge_link": True,
                "add_ahi_header_footer": True,
                "content": "[AHI-AUTO-DISPATCH] Rotating machinery alert triggered for P-101A. Immediate inspection recommended."
            },
            {
                "id": "act-3",
                "name": "Enterprise Incident Webhook Dispatcher",
                "type": "Webhook",
                "to_contact": "https://incident.yokogawa.internal/v1/alarms/webhook",
                "attach_acknowledge_link": False,
                "add_ahi_header_footer": False,
                "content": '{"source": "Yokogawa AHI DM", "alert_type": "Process Alarm", "priority": "High"}'
            }
        ]

        # 11. Security & Identity (Section 11, Table 30, Table 31, Table 32, Table 33)
        self.users = [
            {"id": "usr-1", "upn": "tg.tan@yokogawa.com", "name": "Tan Thye Guan", "role": "Administrator", "department": "DXP"},
            {"id": "usr-2", "upn": "k.yamamoto@yokogawa.com", "name": "Kenji Yamamoto", "role": "Engineer", "department": "Process Automation"},
            {"id": "usr-3", "upn": "s.alvarez@yokogawa.com", "name": "Sofia Alvarez", "role": "Operator", "department": "Plant Floor Ops"},
            {"id": "usr-4", "upn": "m.chen@yokogawa.com", "name": "Marcus Chen", "role": "Viewer", "department": "Executive Dashboard"},
            {"id": "usr-5", "upn": "auditor@yokogawa.com", "name": "ISO 27001 Auditor", "role": "Data Viewer", "department": "Governance & Compliance"}
        ]

        self.user_groups = [
            {"id": "grp-1", "name": "Enterprise Administrator Group", "role": "Administrator", "members_count": 2},
            {"id": "grp-2", "name": "Process Engineering Team", "role": "Engineer", "members_count": 8},
            {"id": "grp-3", "name": "Control Room Operators Alpha", "role": "Operator", "members_count": 14}
        ]

        # Overrides (Section 9.11.1 & 9.12.1, Table 21, Table 23)
        self.user_overrides = [
            {"id": "ovr-1", "user_upn": "s.alvarez@yokogawa.com", "role": "Operator", "entity_name": "Alarm", "permission": "Annotate Alarm"}
        ]

        # 9.14 API Clients (Table 24, Table 25)
        self.api_clients = [
            {
                "id": "apic-1",
                "name": "Yokogawa CENTUM VP DCS Connector",
                "auth_endpoint": "https://api.yokogawa.cloud/auth/v1/token",
                "api_endpoint": "https://api.yokogawa.cloud/ahi/v1/devices",
                "client_id": "ahi-client-881249b-centum",
                "client_secret": "sec_82fa910d54f849e7b25e1a0b38",
                "scopes": [
                    {"entity": "Asset", "permissions": ["Read Asset", "Write Asset"]},
                    {"entity": "Device", "permissions": ["Read Device", "Write Device"]},
                    {"entity": "Alarm", "permissions": ["Read Alarm", "Annotate Alarm"]}
                ],
                "created_at": "2024-01-10T09:00:00Z"
            },
            {
                "id": "apic-2",
                "name": "Enterprise MES / ERP Reporting Client",
                "auth_endpoint": "https://api.yokogawa.cloud/auth/v1/token",
                "api_endpoint": "https://api.yokogawa.cloud/ahi/v1/assets",
                "client_id": "ahi-client-99312ac-mes",
                "client_secret": "sec_38cd91fe8294ba72349c2e01",
                "scopes": [
                    {"entity": "Asset", "permissions": ["Read Asset"]},
                    {"entity": "Table List", "permissions": ["Read Table"]},
                    {"entity": "Activity Log", "permissions": ["Read Asset Activity Log"]}
                ],
                "created_at": "2024-02-01T14:30:00Z"
            }
        ]

        # 11.2 Object-based Security Settings (Table 33)
        self.object_security_rules = [
            {
                "id": "sec-obj-1",
                "resource": "Yokogawa Global Energy / Singapore Jurong Refinery / Area 01 / C-101",
                "identity": "s.alvarez@yokogawa.com",
                "privilege": ["Read Asset", "Write Asset", "Asset Table", "Asset Media"],
                "child_privilege": "Update child privileges for modified identities"
            },
            {
                "id": "sec-obj-2",
                "resource": "Yokogawa Global Energy / Singapore Jurong Refinery / Area 01 / C-101 / P-101A",
                "identity": "auditor@yokogawa.com",
                "privilege": ["Read Asset", "Asset Table"],
                "child_privilege": "Do not modify child privileges"
            }
        ]

        # 9.3 Function Block Entity (Section 9.3)
        self.function_block_templates = [
            {
                "id": "fbt-1",
                "template_code": "FB_DELTA_T",
                "name": "Distillation Column Thermal Delta",
                "category": "Calculation",
                "description": "Computes vertical temperature gradient across fractionation trays for vapor-liquid separation control.",
                "inputs_schema": [
                    {"name": "t_reboiler", "type": "Float", "unit": "°C", "default": 235.0},
                    {"name": "t_overhead", "type": "Float", "unit": "°C", "default": 118.0}
                ],
                "outputs_schema": [
                    {"name": "delta_t", "type": "Float", "unit": "°C"},
                    {"name": "gradient_status", "type": "String", "unit": ""}
                ],
                "formula_code": """function execute(inputs) {
  const top = Number(inputs.t_overhead || 118.0);
  const bot = Number(inputs.t_reboiler || 235.0);
  const dt = Number((bot - top).toFixed(2));
  let status = 'NORMAL';
  if (dt > 140.0) status = 'OVERHEATED_REBOILER';
  else if (dt < 90.0) status = 'FLOODING_SUSPECTED';
  return { delta_t: dt, gradient_status: status };
}""",
                "version": "v2.0"
            },
            {
                "id": "fbt-2",
                "template_code": "FB_MT_ANOMALY",
                "name": "Mahalanobis-Taguchi Multivariate Anomaly",
                "category": "Analytics",
                "description": "Calculates normalized multivariate Mahalanobis distance from baseline covariance matrix to detect early process anomalies.",
                "inputs_schema": [
                    {"name": "temp_top", "type": "Float", "unit": "°C", "default": 118.0},
                    {"name": "temp_bottom", "type": "Float", "unit": "°C", "default": 235.0},
                    {"name": "pressure", "type": "Float", "unit": "kPa", "default": 145.0},
                    {"name": "vibration", "type": "Float", "unit": "mm/s", "default": 2.1}
                ],
                "outputs_schema": [
                    {"name": "mt_distance", "type": "Float", "unit": "score"},
                    {"name": "is_anomaly", "type": "Boolean", "unit": ""},
                    {"name": "health_status", "type": "String", "unit": ""}
                ],
                "formula_code": """function execute(inputs) {
  const top = Number(inputs.temp_top || 118.0);
  const bot = Number(inputs.temp_bottom || 235.0);
  const press = Number(inputs.pressure || 145.0);
  const vib = Number(inputs.vibration || 2.1);
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
                "version": "v2.1"
            },
            {
                "id": "fbt-3",
                "template_code": "FB_PUMP_HEAD",
                "name": "API 610 Centrifugal Pump Head Calculation",
                "category": "Calculation",
                "description": "Calculates pump differential head (meters) and estimated hydraulic power (kW) from suction/discharge pressures.",
                "inputs_schema": [
                    {"name": "p_suction", "type": "Float", "unit": "kPa", "default": 124.5},
                    {"name": "p_discharge", "type": "Float", "unit": "kPa", "default": 582.4},
                    {"name": "fluid_density", "type": "Float", "unit": "kg/m³", "default": 842.0},
                    {"name": "flow_rate", "type": "Float", "unit": "m³/h", "default": 450.0}
                ],
                "outputs_schema": [
                    {"name": "differential_head_m", "type": "Float", "unit": "m"},
                    {"name": "hydraulic_power_kw", "type": "Float", "unit": "kW"},
                    {"name": "pump_operating_point", "type": "String", "unit": ""}
                ],
                "formula_code": """function execute(inputs) {
  const ps = Number(inputs.p_suction || 124.5);
  const pd = Number(inputs.p_discharge || 582.4);
  const rho = Number(inputs.fluid_density || 842.0);
  const q = Number(inputs.flow_rate || 450.0);
  const g = 9.80665;
  const deltaP = (pd - ps) * 1000;
  const head = deltaP / (rho * g);
  const q_m3s = q / 3600;
  const hyd_kw = (rho * g * q_m3s * head) / 1000;
  return {
    differential_head_m: Number(head.toFixed(2)),
    hydraulic_power_kw: Number(hyd_kw.toFixed(2)),
    pump_operating_point: head > 60 ? 'OPTIMAL' : 'BELOW_BEP'
  };
}""",
                "version": "v1.2"
            },
            {
                "id": "fbt-4",
                "template_code": "FB_PID_V2",
                "name": "Yokogawa 2-Degrees-of-Freedom Velocity PID",
                "category": "Control",
                "description": "Industrial velocity-form discrete PID controller with proportional band, reset time and derivative rate limit.",
                "inputs_schema": [
                    {"name": "pv", "type": "Float", "unit": "", "default": 118.2},
                    {"name": "sp", "type": "Float", "unit": "", "default": 120.0},
                    {"name": "pb", "type": "Float", "unit": "%", "default": 80.0},
                    {"name": "ti", "type": "Float", "unit": "s", "default": 45.0},
                    {"name": "td", "type": "Float", "unit": "s", "default": 8.0}
                ],
                "outputs_schema": [
                    {"name": "mv", "type": "Float", "unit": "%"},
                    {"name": "error", "type": "Float", "unit": ""},
                    {"name": "control_mode", "type": "String", "unit": ""}
                ],
                "formula_code": """function execute(inputs) {
  const pv = Number(inputs.pv || 118.2);
  const sp = Number(inputs.sp || 120.0);
  const pb = Number(inputs.pb || 80.0);
  const ti = Number(inputs.ti || 45.0);
  const err = sp - pv;
  const gain = 100.0 / Math.max(pb, 1.0);
  let mv = 50.0 + gain * err + (err / Math.max(ti, 1.0)) * 2.0;
  mv = Math.min(100.0, Math.max(0.0, mv));
  return {
    mv: Number(mv.toFixed(2)),
    error: Number(err.toFixed(2)),
    control_mode: 'AUTO'
  };
}""",
                "version": "v3.0"
            },
            {
                "id": "fbt-5",
                "template_code": "FB_TOTALIZER",
                "name": "Flow Totalizer & Batch Accumulator",
                "category": "Calculation",
                "description": "Integrates instantaneous mass flow rate into total accumulated batch volume with automatic reset.",
                "inputs_schema": [
                    {"name": "flow_rate_m3h", "type": "Float", "unit": "m³/h", "default": 182.0},
                    {"name": "sample_interval_sec", "type": "Float", "unit": "s", "default": 1.0},
                    {"name": "reset", "type": "Boolean", "unit": "", "default": False}
                ],
                "outputs_schema": [
                    {"name": "accumulated_m3", "type": "Float", "unit": "m³"},
                    {"name": "daily_projected_m3", "type": "Float", "unit": "m³"}
                ],
                "formula_code": """function execute(inputs) {
  const flow = Number(inputs.flow_rate_m3h || 182.0);
  const dt = Number(inputs.sample_interval_sec || 1.0);
  const incremental = (flow / 3600.0) * dt;
  const accumulated = Number((4380.5 + incremental).toFixed(3));
  const projected = Number((flow * 24.0).toFixed(1));
  return {
    accumulated_m3: accumulated,
    daily_projected_m3: projected
  };
}""",
                "version": "v1.1"
            }
        ]

        self.function_blocks = [
            {
                "id": "fb-001",
                "name": "CDU Fractionation Column Thermal Delta T",
                "template_code": "FB_DELTA_T",
                "template_name": "Distillation Column Thermal Delta",
                "category": "Calculation",
                "asset_id": "ast-unit-cdu",
                "asset_name": "Atmospheric Distillation Unit C-101",
                "target_tag": "CDU_101.DELTA_T",
                "schedule_interval": "1s",
                "status": "ACTIVE",
                "last_run_at": now_iso,
                "last_execution_ms": 2.8,
                "last_output_value": 117.2,
                "last_output_data": {"delta_t": 117.2, "gradient_status": "NORMAL"},
                "input_bindings": {
                    "t_overhead": "TIC_101.PV",
                    "t_reboiler": "TIC_102.PV"
                },
                "formula_code": self.function_block_templates[0]["formula_code"],
                "execution_log": "Computed delta_t = 117.2°C; Status: NORMAL"
            },
            {
                "id": "fb-002",
                "name": "CDU Process Multivariate MT Anomaly Detector",
                "template_code": "FB_MT_ANOMALY",
                "template_name": "Mahalanobis-Taguchi Multivariate Anomaly",
                "category": "Analytics",
                "asset_id": "ast-unit-cdu",
                "asset_name": "Atmospheric Distillation Unit C-101",
                "target_tag": "CDU_101.MT_DISTANCE",
                "schedule_interval": "5s",
                "status": "ACTIVE",
                "last_run_at": now_iso,
                "last_execution_ms": 4.1,
                "last_output_value": 1.42,
                "last_output_data": {"mt_distance": 1.42, "is_anomaly": False, "health_status": "NORMAL"},
                "input_bindings": {
                    "temp_top": "TIC_101.PV",
                    "temp_bottom": "TIC_102.PV",
                    "pressure": "PIC_101.PV",
                    "vibration": "VIB_101.RMS"
                },
                "formula_code": self.function_block_templates[1]["formula_code"],
                "execution_log": "MT Distance score: 1.42 (Threshold 3.0). Health status: NORMAL"
            },
            {
                "id": "fb-003",
                "name": "Charge Pump P-101A Hydraulic Differential Head",
                "template_code": "FB_PUMP_HEAD",
                "template_name": "API 610 Centrifugal Pump Head Calculation",
                "category": "Calculation",
                "asset_id": "ast-eq-pump",
                "asset_name": "Crude Feed Charge Pump P-101A",
                "target_tag": "PUMP_101A.DIFF_HEAD",
                "schedule_interval": "1s",
                "status": "ACTIVE",
                "last_run_at": now_iso,
                "last_execution_ms": 1.9,
                "last_output_value": 55.45,
                "last_output_data": {"differential_head_m": 55.45, "hydraulic_power_kw": 57.24, "pump_operating_point": "OPTIMAL"},
                "input_bindings": {
                    "p_suction": "pump-p101a-hub-01.suction_pressure",
                    "p_discharge": "pump-p101a-hub-01.discharge_pressure",
                    "fluid_density": "pump-p101a-hub-01.fluid_density",
                    "flow_rate": "FIC_101.PV"
                },
                "formula_code": self.function_block_templates[2]["formula_code"],
                "execution_log": "Head: 55.45 m, Hydraulic Power: 57.24 kW. Operating point: OPTIMAL"
            },
            {
                "id": "fb-004",
                "name": "CDU Top Reflux Flow Totalizer",
                "template_code": "FB_TOTALIZER",
                "template_name": "Flow Totalizer & Batch Accumulator",
                "category": "Calculation",
                "asset_id": "ast-unit-cdu",
                "asset_name": "Atmospheric Distillation Unit C-101",
                "target_tag": "FIC_102.TOTAL_M3",
                "schedule_interval": "1s",
                "status": "ACTIVE",
                "last_run_at": now_iso,
                "last_execution_ms": 1.4,
                "last_output_value": 4380.55,
                "last_output_data": {"accumulated_m3": 4380.55, "daily_projected_m3": 4368.0},
                "input_bindings": {
                    "flow_rate_m3h": "FIC_102.PV",
                    "sample_interval_sec": "1.0",
                    "reset": "false"
                },
                "formula_code": self.function_block_templates[4]["formula_code"],
                "execution_log": "Accumulated: 4380.55 m3, Projected 24h: 4368.0 m3"
            }
        ]

        # 9.15 Activity Log Entity (Table 26)
        self.activity_logs = [
            {"id": "log-001", "entity": "Asset", "entity_id": "ast-eq-pump", "action": "Add", "event_initiated_by": "tg.tan@yokogawa.com", "status": "Success", "created_at": "2024-03-05T08:15:30Z", "details": "Created child asset element 'Crude Feed Charge Pump P-101A'"},
            {"id": "log-002", "entity": "Device", "entity_id": "pump-p101a-hub-01", "action": "Update", "event_initiated_by": "tg.tan@yokogawa.com", "status": "Success", "created_at": "2024-03-05T08:10:00Z", "details": "Configured Azure IoT Hub binding parameters"},
            {"id": "log-003", "entity": "Alarm", "entity_id": "alm-002", "action": "Annotate", "event_initiated_by": "s.alvarez@yokogawa.com", "status": "Success", "created_at": "2024-03-05T07:58:30Z", "details": "Operator acknowledged High Impeller Bearing Vibration alarm"},
            {"id": "log-004", "entity": "Broker", "entity_id": "brk-1", "action": "Update", "event_initiated_by": "k.yamamoto@yokogawa.com", "status": "Success", "created_at": "2024-03-05T07:30:12Z", "details": "Updated Azure IoT Hub unit count to 2 Hub Units"},
            {"id": "log-005", "entity": "Asset Table", "entity_id": "tbl-cdu-1", "action": "Export", "event_initiated_by": "auditor@yokogawa.com", "status": "Success", "created_at": "2024-03-05T07:05:40Z", "details": "Exported Tray Inspection & Fouling Log CSV"}
        ]

        # 9.16 SCADA HMI Windows & Dynamic Tag Mappings (FUXA SCADA Integration)
        self.scada_windows = [
            {
                "id": "win-cdu-101",
                "title": "Atmospheric Distillation Unit C-101 Synoptic",
                "description": "Yokogawa CENTUM VP Fractionation Column, Charge Pumping, and Condenser Loops",
                "asset_id": "ast-unit-cdu",
                "asset_name": "Atmospheric Distillation Unit C-101",
                "width": 1100,
                "height": 620,
                "background_color": "#020617",
                "grid_size": 20,
                "is_default": True,
                "elements": [
                    {
                        "id": "elem-tank-101",
                        "type": "StorageTank",
                        "label": "Crude Feed TK-101",
                        "x": 40,
                        "y": 340,
                        "width": 80,
                        "height": 110,
                        "mapped_tag": "FIC_101.PV",
                        "source_type": "CENTUM_VP",
                        "bound_property": "fill_level",
                        "units": "%",
                        "min_val": 0,
                        "max_val": 100,
                        "alarm_hh": 95,
                        "alarm_ll": 15
                    },
                    {
                        "id": "elem-pump-101a",
                        "type": "CentrifugalPump",
                        "label": "Charge Pump P-101A",
                        "x": 140,
                        "y": 415,
                        "width": 50,
                        "height": 50,
                        "mapped_tag": "PUMP_101A.DIFF_HEAD",
                        "source_type": "FUNCTION_BLOCK",
                        "bound_property": "running",
                        "units": "m",
                        "min_val": 0,
                        "max_val": 100,
                        "alarm_hh": 80,
                        "alarm_ll": 20
                    },
                    {
                        "id": "elem-preheater-101",
                        "type": "HeatExchanger",
                        "label": "Preheater E-101",
                        "x": 310,
                        "y": 418,
                        "width": 70,
                        "height": 45,
                        "mapped_tag": "pump-p101a-hub-01.discharge_pressure",
                        "source_type": "BROKER_DEVICE",
                        "bound_property": "value",
                        "units": "kPa",
                        "min_val": 0,
                        "max_val": 1000
                    },
                    {
                        "id": "elem-column-101",
                        "type": "ProcessColumn",
                        "label": "Fractionator C-101",
                        "x": 450,
                        "y": 75,
                        "width": 130,
                        "height": 370,
                        "mapped_tag": "LIC_101.PV",
                        "source_type": "CENTUM_VP",
                        "bound_property": "fill_level",
                        "units": "%",
                        "min_val": 0,
                        "max_val": 100,
                        "alarm_hh": 85,
                        "alarm_ll": 20
                    },
                    {
                        "id": "elem-reboiler-102",
                        "type": "Reboiler",
                        "label": "Reboiler E-102",
                        "x": 485,
                        "y": 460,
                        "width": 60,
                        "height": 35,
                        "mapped_tag": "TIC_102.PV",
                        "source_type": "CENTUM_VP",
                        "bound_property": "value",
                        "units": "°C",
                        "min_val": 150,
                        "max_val": 300
                    },
                    {
                        "id": "elem-condenser-103",
                        "type": "Condenser",
                        "label": "Overhead Condenser E-103",
                        "x": 680,
                        "y": 95,
                        "width": 60,
                        "height": 32,
                        "mapped_tag": "TIC_101.PV",
                        "source_type": "CENTUM_VP",
                        "bound_property": "value",
                        "units": "°C",
                        "min_val": 50,
                        "max_val": 180
                    },
                    {
                        "id": "elem-drum-101",
                        "type": "HorizontalDrum",
                        "label": "Reflux Drum D-101",
                        "x": 670,
                        "y": 140,
                        "width": 80,
                        "height": 42,
                        "mapped_tag": "FIC_102.PV",
                        "source_type": "CENTUM_VP",
                        "bound_property": "fill_level",
                        "units": "m³/h",
                        "min_val": 0,
                        "max_val": 300
                    },
                    {
                        "id": "elem-valve-101",
                        "type": "ControlValve",
                        "label": "Feed Valve FCV-101",
                        "x": 230,
                        "y": 425,
                        "width": 30,
                        "height": 30,
                        "mapped_tag": "FIC_101.PV",
                        "source_type": "CENTUM_VP",
                        "bound_property": "opening_pct",
                        "units": "%",
                        "min_val": 0,
                        "max_val": 100
                    },
                    {
                        "id": "elem-valve-102",
                        "type": "ControlValve",
                        "label": "Bottoms Valve LCV-101",
                        "x": 680,
                        "y": 510,
                        "width": 30,
                        "height": 30,
                        "mapped_tag": "LIC_101.PV",
                        "source_type": "CENTUM_VP",
                        "bound_property": "opening_pct",
                        "units": "%",
                        "min_val": 0,
                        "max_val": 100
                    },
                    {
                        "id": "elem-badge-fic101",
                        "type": "DigitalBadge",
                        "label": "FIC-101 Feed Flow",
                        "x": 170,
                        "y": 280,
                        "width": 105,
                        "height": 52,
                        "mapped_tag": "FIC_101.PV",
                        "source_type": "CENTUM_VP",
                        "bound_property": "value",
                        "units": "m³/h"
                    },
                    {
                        "id": "elem-badge-tic101",
                        "type": "DigitalBadge",
                        "label": "TIC-101 Overhead Temp",
                        "x": 600,
                        "y": 30,
                        "width": 100,
                        "height": 50,
                        "mapped_tag": "TIC_101.PV",
                        "source_type": "CENTUM_VP",
                        "bound_property": "value",
                        "units": "°C"
                    },
                    {
                        "id": "elem-badge-tic102",
                        "type": "DigitalBadge",
                        "label": "TIC-102 Bottom Temp",
                        "x": 600,
                        "y": 420,
                        "width": 100,
                        "height": 50,
                        "mapped_tag": "TIC_102.PV",
                        "source_type": "CENTUM_VP",
                        "bound_property": "value",
                        "units": "°C"
                    },
                    {
                        "id": "elem-fb-deltat",
                        "type": "FunctionBlockWidget",
                        "label": "Fractionation Delta T",
                        "x": 460,
                        "y": 18,
                        "width": 110,
                        "height": 42,
                        "mapped_tag": "CDU_101.DELTA_T",
                        "source_type": "FUNCTION_BLOCK",
                        "bound_property": "value",
                        "units": "°C"
                    },
                    {
                        "id": "elem-fb-mt",
                        "type": "FunctionBlockWidget",
                        "label": "MT Anomaly Detector",
                        "x": 320,
                        "y": 240,
                        "width": 115,
                        "height": 42,
                        "mapped_tag": "CDU_101.MT_DISTANCE",
                        "source_type": "FUNCTION_BLOCK",
                        "bound_property": "value",
                        "units": "score"
                    }
                ]
            },
            {
                "id": "win-tank-farm",
                "title": "Crude Storage & Tank Farm Facility",
                "description": "API 650 Storage Tanks, Floating Roofs, Overfill Protection, and Transfer Manifold",
                "asset_id": "ast-site-jurong",
                "asset_name": "Jurong Island Refinery Site",
                "width": 1100,
                "height": 620,
                "background_color": "#020617",
                "grid_size": 20,
                "is_default": False,
                "elements": [
                    {"id": "tf-tk-1", "type": "StorageTank", "label": "TK-101 Crude Feed", "x": 80, "y": 120, "width": 160, "height": 180, "mapped_tag": "FIC_101.PV", "source_type": "CENTUM_VP", "bound_property": "fill_level", "units": "%"},
                    {"id": "tf-tk-2", "type": "StorageTank", "label": "TK-102 Heavy Residue", "x": 320, "y": 120, "width": 160, "height": 180, "mapped_tag": "LIC_101.PV", "source_type": "CENTUM_VP", "bound_property": "fill_level", "units": "%"},
                    {"id": "tf-tk-3", "type": "StorageTank", "label": "TK-103 Light Naphtha", "x": 560, "y": 120, "width": 160, "height": 180, "mapped_tag": "FIC_102.PV", "source_type": "CENTUM_VP", "bound_property": "fill_level", "units": "%"},
                    {"id": "tf-tk-4", "type": "StorageTank", "label": "TK-104 Jet Fuel/Kero", "x": 800, "y": 120, "width": 160, "height": 180, "mapped_tag": "TIC_101.PV", "source_type": "CENTUM_VP", "bound_property": "fill_level", "units": "%"},
                    {"id": "tf-pump-1", "type": "CentrifugalPump", "label": "Transfer Pump P-201A", "x": 160, "y": 380, "width": 60, "height": 60, "mapped_tag": "PUMP_101A.DIFF_HEAD", "source_type": "FUNCTION_BLOCK", "bound_property": "running", "units": "m"},
                    {"id": "tf-agitator-1", "type": "AgitatorMotor", "label": "Mix Agitator AG-201", "x": 360, "y": 380, "width": 52, "height": 56, "mapped_tag": "VIB_101.RMS", "source_type": "CENTUM_VP", "bound_property": "running", "units": "mm/s"},
                    {"id": "tf-fan-1", "type": "AirBlower", "label": "Forced Draft Fan FD-201", "x": 540, "y": 380, "width": 56, "height": 56, "mapped_tag": "VIB_101.RMS", "source_type": "CENTUM_VP", "bound_property": "running", "units": "mm/s"},
                    {"id": "tf-comp-1", "type": "Compressor", "label": "Vapor Compressor K-201", "x": 720, "y": 380, "width": 72, "height": 48, "mapped_tag": "PIC_101.PV", "source_type": "CENTUM_VP", "bound_property": "running", "units": "kPa"},
                    {"id": "tf-pump-2", "type": "CentrifugalPump", "label": "Transfer Pump P-201B", "x": 900, "y": 380, "width": 60, "height": 60, "mapped_tag": "PUMP_101A.DIFF_HEAD", "source_type": "CENTUM_VP", "bound_property": "running", "units": "m"}
                ]
            }
        ]

        # 12. ThingsBoard Rule Chains (Visual Event-Driven Processing Engine)
        self.rule_chains = [
            {
                "id": "rc-root-01",
                "name": "Root Industrial Telemetry Pipeline",
                "description": "Default platform rule chain: Ingests telemetry, checks analog alarm trips, transforms engineering units, and stores to timeseries database.",
                "is_root": True,
                "status": "ACTIVE",
                "nodes": [
                    { "id": "node-in-1", "type": "INPUT", "name": "Inbound Telemetry Msg", "category": "Input", "x": 60, "y": 140, "details": "Topic: v1/devices/me/telemetry", "configuration": {"topic": "v1/devices/me/telemetry"} },
                    { "id": "node-flt-1", "type": "FILTER", "name": "Script Message Filter", "category": "Filter", "x": 280, "y": 140, "details": "msg.temperature > 85 || msg.pressure > 250", "configuration": {"script": "return msg.temperature > 85 || msg.pressure > 250;"} },
                    { "id": "node-trf-1", "type": "TRANSFORM", "name": "Unit Conversion (Script)", "category": "Transformation", "x": 520, "y": 80, "details": "Convert psi to kPa & °F to °C", "configuration": {"script": "msg.pressure_kpa = msg.pressure * 6.894; return {msg: msg};"} },
                    { "id": "node-act-1", "type": "ACTION", "name": "Save Timeseries", "category": "Action", "x": 780, "y": 80, "details": "Persist in Timeseries DB", "configuration": {"ttl": 86400, "skip_latest": False} },
                    { "id": "node-alm-1", "type": "ACTION", "name": "Create Process Alarm", "category": "Action", "x": 780, "y": 240, "details": "ISA-18.2 High-High Emergency Trip", "configuration": {"alarm_type": "High Temperature Trip", "severity": "CRITICAL", "propagate": True} },
                    { "id": "node-fwd-1", "type": "ACTION", "name": "External Webhook Dispatch", "category": "Action", "x": 1020, "y": 240, "details": "Forward to Node-RED (:1880)", "configuration": {"endpoint": "http://127.0.0.1:1880/telemetry", "method": "POST"} }
                ],
                "connections": [
                    { "from": "node-in-1", "to": "node-flt-1", "label": "Success" },
                    { "from": "node-flt-1", "to": "node-trf-1", "label": "True" },
                    { "from": "node-flt-1", "to": "node-act-1", "label": "False" },
                    { "from": "node-trf-1", "to": "node-alm-1", "label": "Success" },
                    { "from": "node-alm-1", "to": "node-fwd-1", "label": "Alarm Created" }
                ]
            },
            {
                "id": "rc-nodered-02",
                "name": "Node-RED & n8n Automation Bridge",
                "description": "Dispatches high-frequency sensor streams to external workflow engines with payload flattening.",
                "is_root": False,
                "status": "ACTIVE",
                "nodes": [
                    { "id": "node-in-2", "type": "INPUT", "name": "MQTT Broker Stream", "category": "Input", "x": 60, "y": 140, "details": "Broker: Port 91 / 1883", "configuration": {"broker": "brk-1"} },
                    { "id": "node-flt-2", "type": "FILTER", "name": "Asset Scope Filter", "category": "Filter", "x": 300, "y": 140, "details": "Scope: Fractionator CDU-101", "configuration": {"asset": "ast-unit-cdu"} },
                    { "id": "node-trf-2", "type": "TRANSFORM", "name": "JSON Schema Normalizer", "category": "Transformation", "x": 560, "y": 140, "details": "Flat Key-Value Map", "configuration": {"flatten": True} },
                    { "id": "node-fwd-2", "type": "ACTION", "name": "Node-RED HTTP In", "category": "Action", "x": 820, "y": 140, "details": "http://localhost:1880/telemetry", "configuration": {"endpoint": "http://127.0.0.1:1880/telemetry"} }
                ],
                "connections": [
                    { "from": "node-in-2", "to": "node-flt-2", "label": "Success" },
                    { "from": "node-flt-2", "to": "node-trf-2", "label": "Matched" },
                    { "from": "node-trf-2", "to": "node-fwd-2", "label": "Dispatched" }
                ]
            }
        ]

        # 13. ThingsBoard Widgets Library & Dashboard State
        self.dashboard_widgets = [
            {
                "id": "w-dig-1",
                "type": "DIGITAL_GAUGE",
                "bundle": "LATEST_VALUES",
                "title": "Fractionator Overhead Temperature",
                "tag": "TIC_101.PV",
                "unit": "°C",
                "min": 0,
                "max": 250,
                "warning_level": 180,
                "critical_level": 210,
                "current_value": 118.4
            },
            {
                "id": "w-rad-1",
                "type": "RADIAL_GAUGE",
                "bundle": "LATEST_VALUES",
                "title": "Column Head Pressure (Bourdon)",
                "tag": "PIC_101.PV",
                "unit": "kPa",
                "min": 0,
                "max": 400,
                "warning_level": 250,
                "critical_level": 300,
                "current_value": 145.2
            },
            {
                "id": "w-tank-1",
                "type": "LIQUID_TANK",
                "bundle": "LATEST_VALUES",
                "title": "Bottom Stripper Hydrocarbon Level",
                "tag": "LIC_101.PV",
                "unit": "%",
                "min": 0,
                "max": 100,
                "current_value": 62.4
            },
            {
                "id": "w-led-1",
                "type": "LED_INDICATOR",
                "bundle": "LATEST_VALUES",
                "title": "Emergency ESD Trip Valve XV-101",
                "tag": "XV_101.STATUS",
                "status": "NORMAL",
                "current_value": "CLOSED_HEALTHY"
            },
            {
                "id": "w-chart-1",
                "type": "TIMESERIES_CHART",
                "bundle": "TIME_SERIES",
                "title": "Multi-Pen Process Variables Trend",
                "tags": ["TIC_101.PV", "PIC_101.PV", "FIC_101.PV"],
                "time_window": "15m"
            },
            {
                "id": "w-rpc-knob",
                "type": "RPC_KNOB",
                "bundle": "CONTROL_WIDGETS",
                "title": "TIC-101 Temperature Setpoint (SV)",
                "tag": "TIC_101.SV",
                "unit": "°C",
                "min": 100,
                "max": 200,
                "current_value": 178.5,
                "rpc_method": "setPoint"
            },
            {
                "id": "w-rpc-switch",
                "type": "RPC_SWITCH",
                "bundle": "CONTROL_WIDGETS",
                "title": "Charge Pump P-101A Run Command",
                "tag": "MTR_101.RUN",
                "state": True,
                "rpc_method": "togglePump"
            },
            {
                "id": "w-rpc-slider",
                "type": "RPC_SLIDER",
                "bundle": "CONTROL_WIDGETS",
                "title": "Feed Flow Control Valve Opening",
                "tag": "FIC_101.MV",
                "unit": "%",
                "min": 0,
                "max": 100,
                "current_value": 58.2,
                "rpc_method": "setActuator"
            },
            {
                "id": "w-alarm-table",
                "type": "ALARM_TABLE",
                "bundle": "ALARM_WIDGETS",
                "title": "Realtime Active Plant Alarms",
                "filter_severity": "ALL"
            }
        ]

    # Helper: Log activity
    def log_event(self, entity: str, entity_id: str, action: str, user: str, status: str = "Success", details: str = ""):
        log_entry = {
            "id": f"log-{uuid.uuid4().hex[:8]}",
            "entity": entity,
            "entity_id": str(entity_id),
            "action": action,
            "event_initiated_by": user,
            "status": status,
            "created_at": datetime.datetime.utcnow().isoformat() + "Z",
            "details": details
        }
        self.activity_logs.insert(0, log_entry)
        if len(self.activity_logs) > 200:
            self.activity_logs.pop()
        return log_entry

    # Helper: Microsoft Math Class expression evaluator for Section 9.1.3 Runtime Attributes
    def evaluate_runtime_expression(self, expression: str, attribute_values: Dict[str, float]) -> float:
        """
        Supports @Attribute_Name substitution and Math.Round, Math.Abs, Math.Sqrt, Math.Pow, Math.Min, Math.Max
        e.g.: return (1000 * (@Discharge_Pressure - @Suction_Pressure) / (9.81 * @In_Fluid_Density));
        """
        try:
            expr = expression.strip()
            if expr.startswith("return "):
                expr = expr[7:]
            if expr.endswith(";"):
                expr = expr[:-1]

            # Replace @Attribute_Name with actual values
            for attr_name, val in attribute_values.items():
                pattern = re.compile(r'@' + re.escape(attr_name), re.IGNORECASE)
                expr = pattern.sub(str(val), expr)
                # Also try replacing with underscores
                safe_name = attr_name.replace(" ", "_")
                pattern_safe = re.compile(r'@' + re.escape(safe_name), re.IGNORECASE)
                expr = pattern_safe.sub(str(val), expr)

            # Replace Microsoft Math class functions with Python math / builtins
            expr = re.sub(r'Math\.Round\(([^,]+),\s*(\d+)\)', r'round(\1, \2)', expr, flags=re.IGNORECASE)
            expr = re.sub(r'Math\.Round\(([^)]+)\)', r'round(\1)', expr, flags=re.IGNORECASE)
            expr = re.sub(r'Math\.Abs\(([^)]+)\)', r'abs(\1)', expr, flags=re.IGNORECASE)
            expr = re.sub(r'Math\.Sqrt\(([^)]+)\)', r'math.sqrt(\1)', expr, flags=re.IGNORECASE)
            expr = re.sub(r'Math\.Pow\(([^,]+),\s*([^)]+)\)', r'pow(\1, \2)', expr, flags=re.IGNORECASE)
            expr = re.sub(r'Math\.Min\(([^,]+),\s*([^)]+)\)', r'min(\1, \2)', expr, flags=re.IGNORECASE)
            expr = re.sub(r'Math\.Max\(([^,]+),\s*([^)]+)\)', r'max(\1, \2)', expr, flags=re.IGNORECASE)
            expr = re.sub(r'Math\.Sin\(([^)]+)\)', r'math.sin(\1)', expr, flags=re.IGNORECASE)
            expr = re.sub(r'Math\.Cos\(([^)]+)\)', r'math.cos(\1)', expr, flags=re.IGNORECASE)
            expr = re.sub(r'Math\.PI', str(math.pi), expr, flags=re.IGNORECASE)
            expr = re.sub(r'Math\.E', str(math.e), expr, flags=re.IGNORECASE)

            # Safe evaluation context
            safe_globals = {
                "math": math,
                "round": round,
                "abs": abs,
                "pow": pow,
                "min": min,
                "max": max
            }
            res = eval(expr, {"__builtins__": None}, safe_globals)
            if isinstance(res, (int, float)):
                if float(res).is_integer():
                    return int(res)
                return round(float(res), 4)
            return res
        except Exception as e:
            return 0

    def compute_device_status(self, dev: Dict[str, Any], now: Optional[datetime.datetime] = None) -> str:
        """
        Evaluates real device health against its configured scan rate (monitoring_time_secs).
        If no telemetry packet has been received within the scan rate interval, device transitions to 'Disconnected'.
        If packets are actively streaming within the scan rate, device transitions to 'Connected'.
        """
        if dev.get("health_check") is False:
            return "Configured"

        last_arrival = dev.get("last_seen") or dev.get("last_data_received")
        if not last_arrival:
            return "Disconnected"

        if now is None:
            now = datetime.datetime.utcnow()

        try:
            if isinstance(last_arrival, str):
                clean_str = last_arrival.replace("Z", "+00:00")
                dt = datetime.datetime.fromisoformat(clean_str).replace(tzinfo=None)
            elif isinstance(last_arrival, (int, float)):
                dt = datetime.datetime.utcfromtimestamp(last_arrival / 1000.0 if last_arrival > 1e11 else last_arrival)
            else:
                return "Connected"

            scan_timeout_secs = float(dev.get("monitoring_time_secs") or 60)
            elapsed_secs = (now - dt).total_seconds()
            return "Connected" if elapsed_secs <= scan_timeout_secs else "Disconnected"
        except Exception:
            return dev.get("status", "Disconnected")

    def update_all_asset_attribute_qualities(self, now: Optional[datetime.datetime] = None):
        """
        Dynamically updates quality ('Good' vs 'Bad') of all dynamic and runtime attributes
        across all assets based on the connection status of their linked devices.
        If device is connected -> Quality is 'Good'.
        If device is disconnected -> Quality is 'Bad'.
        """
        if now is None:
            now = datetime.datetime.utcnow()

        device_status_map = {}
        for dev in self.devices:
            st = self.compute_device_status(dev, now)
            dev["status"] = st
            for key in [dev.get("id"), dev.get("identifier"), dev.get("name")]:
                if key:
                    device_status_map[str(key).strip().lower()] = st

        for asset in self.assets:
            attr_quality_map = {}
            for attr in asset.get("attributes", []):
                attr_type = attr.get("type", "Dynamic")
                if attr_type in ["Dynamic", "Integration", "Command"]:
                    dev_id = str(attr.get("device_id") or attr.get("device_markup") or "").strip().lower()
                    dev_st = device_status_map.get(dev_id, "Disconnected")
                    attr["quality"] = "Good" if dev_st == "Connected" else "Bad"
                    attr_quality_map[attr.get("name", "").strip().lower()] = attr["quality"]
                    attr_quality_map[attr.get("name", "").strip().lower().replace(" ", "_")] = attr["quality"]
                elif attr_type == "Static":
                    attr["quality"] = "Good"
                    attr_quality_map[attr.get("name", "").strip().lower()] = "Good"

            # Update Runtime attributes quality based on referenced attributes
            for attr in asset.get("attributes", []):
                if attr.get("type") == "Runtime":
                    expr = attr.get("expression", "")
                    referenced = re.findall(r'@([a-zA-Z0-9_]+)', expr)
                    is_bad = False
                    for ref in referenced:
                        ref_low = ref.lower()
                        ref_space = ref_low.replace("_", " ")
                        q = attr_quality_map.get(ref_low, attr_quality_map.get(ref_space, "Good"))
                        if q == "Bad":
                            is_bad = True
                            break
                    attr["quality"] = "Bad" if is_bad else "Good"

    def recalculate_asset_attributes(self, asset: Dict[str, Any]):
        """
        Loads latest values from linked devices for dynamic attributes,
        evaluates all runtime expressions, and computes connection-aware qualities.
        """
        now = datetime.datetime.utcnow()
        now_iso = now.isoformat() + "Z"

        # 1. Update dynamic attributes from device last_payload
        for attr in asset.get("attributes", []):
            if attr.get("type") in ["Dynamic", "Integration", "Command"]:
                dev_ref = str(attr.get("device_id") or attr.get("device_markup") or "").strip().lower()
                dev = next((
                    d for d in self.devices
                    if str(d.get("id", "")).strip().lower() == dev_ref or
                       str(d.get("identifier", "")).strip().lower() == dev_ref or
                       str(d.get("name", "")).strip().lower() == dev_ref
                ), None)
                if dev:
                    st = self.compute_device_status(dev, now)
                    dev["status"] = st
                    attr["quality"] = "Good" if st == "Connected" else "Bad"
                    if dev.get("last_payload"):
                        metric_key = attr.get("metric")
                        new_val = extract_nested_value(dev["last_payload"], metric_key) if metric_key else None
                        if new_val is not None:
                            attr["value"] = str(new_val)
                            attr["timestamp"] = dev.get("last_data_received") or now_iso

        # 2. Build values map and quality map
        attr_values_map = {}
        attr_qualities = {}
        for attr in asset.get("attributes", []):
            try:
                v = float(attr.get("value", 0))
            except (ValueError, TypeError):
                v = 0.0
            name = attr.get("name", "")
            attr_values_map[name] = v
            attr_values_map[name.replace(" ", "_")] = v
            attr_values_map[f"@{name}"] = v
            attr_values_map[f"@{name.replace(' ', '_')}"] = v
            attr_qualities[name.lower()] = attr.get("quality", "Good")
            attr_qualities[name.lower().replace(" ", "_")] = attr.get("quality", "Good")

        # 3. Evaluate runtime formulas
        for attr in asset.get("attributes", []):
            if attr.get("type") == "Runtime" and attr.get("expression"):
                try:
                    calc_res = self.evaluate_runtime_expression(attr["expression"], attr_values_map)
                    if isinstance(calc_res, (int, float)) and float(calc_res).is_integer():
                        attr["value"] = str(int(calc_res))
                    elif isinstance(calc_res, float):
                        attr["value"] = f"{calc_res:.4f}".rstrip("0").rstrip(".")
                    else:
                        attr["value"] = str(calc_res)
                    attr["timestamp"] = now_iso
                except Exception:
                    pass

                refs = re.findall(r'@([a-zA-Z0-9_]+)', attr.get("expression", ""))
                is_bad = any(attr_qualities.get(r.lower(), "Good") == "Bad" for r in refs)
                attr["quality"] = "Bad" if is_bad else "Good"

    def ingest_device_telemetry(self, device_id: str, payload: Any) -> Dict[str, Any]:
        """
        Centralized telemetry ingestion pipeline for devices and assets.
        Supports ingestion from REST Broker API, Socket.IO, WebSockets, and Tag pipelines.
        """
        now = datetime.datetime.utcnow()
        now_iso = now.isoformat() + "Z"

        if isinstance(payload, str):
            try:
                payload = json.loads(payload)
            except Exception:
                payload = {"raw_value": payload}
        elif isinstance(payload, list):
            payload = payload[0] if (payload and isinstance(payload[0], dict)) else {"items": payload}
        elif not isinstance(payload, dict):
            payload = {"value": payload}

        dev_key = str(device_id).strip().lower()
        dev = next((
            d for d in self.devices
            if str(d.get("id", "")).strip().lower() == dev_key or
               str(d.get("identifier", "")).strip().lower() == dev_key or
               str(d.get("name", "")).strip().lower() == dev_key
        ), None)

        packet_ts = extract_payload_timestamp(payload) or now_iso

        if not dev:
            dev = {
                "id": str(device_id),
                "identifier": str(device_id),
                "name": f"Device {device_id}",
                "broker": "Industrial Ingestion Gateway",
                "broker_id": "brk-gateway",
                "status": "Connected",
                "health_check": True,
                "last_edited": now_iso,
                "last_seen": now_iso,
                "last_data_received": packet_ts,
                "last_payload": payload
            }
            self.devices.append(dev)
        else:
            dev["status"] = "Connected"
            dev["last_seen"] = now_iso
            dev["last_data_received"] = packet_ts
            dev["last_payload"] = payload

        matching_ids = {
            dev_key,
            str(dev.get("id", "")).strip().lower(),
            str(dev.get("identifier", "")).strip().lower(),
            str(dev.get("name", "")).strip().lower()
        }

        # Collect all equipment and asset identifiers from payload
        for ek in ["equipment", "equipment_id", "equipment_name", "equipment_tag", "equipmentId", "equipmentName", "asset", "asset_id", "asset_name", "tag", "tag_name", "device_id", "deviceid"]:
            ev = payload.get(ek)
            if ev and isinstance(ev, (str, int)):
                matching_ids.add(str(ev).strip().lower())
            elif isinstance(ev, dict):
                for sub_k in ["id", "name", "tag", "identifier", "equipment_id", "equipment_name"]:
                    sub_v = ev.get(sub_k)
                    if sub_v:
                        matching_ids.add(str(sub_v).strip().lower())

        updated_attrs = []
        for asset in self.assets:
            # Check if this asset/equipment matches directly
            asset_matches = (
                str(asset.get("id", "")).strip().lower() in matching_ids or
                str(asset.get("name", "")).strip().lower() in matching_ids or
                str(asset.get("tag", "")).strip().lower() in matching_ids or
                str(asset.get("path", "")).strip().lower() in matching_ids
            )

            # 1. Update dynamic & integration attributes
            for attr in asset.get("attributes", []):
                attr_dev = str(attr.get("device_id") or attr.get("device_markup") or "").strip().lower()
                device_matches = bool(attr_dev and attr_dev in matching_ids)

                if asset_matches or device_matches:
                    metric_key = attr.get("metric")
                    new_val = None

                    # Try metric key first
                    if metric_key:
                        new_val = extract_nested_value(payload, metric_key)

                    # Try tag_name (e.g. tags.FIC_101.PV or FIC_101.PV)
                    if new_val is None and attr.get("tag_name"):
                        clean_tag = attr["tag_name"].replace("tags.", "")
                        new_val = extract_nested_value(payload, clean_tag)
                        if new_val is None and "tags" in payload and isinstance(payload["tags"], dict):
                            new_val = payload["tags"].get(clean_tag)

                    # Try attribute name directly
                    if new_val is None:
                        new_val = payload.get(attr["name"])
                        if new_val is None:
                            for pk, pv in payload.items():
                                if pk.strip().lower() == attr["name"].strip().lower() and not isinstance(pv, dict):
                                    new_val = pv
                                    break

                    # Try inside nested payload objects (data, telemetry, attributes, equipment, equipment_data)
                    if new_val is None:
                        for sub_obj_key in ["data", "telemetry", "attributes", "equipment", "equipment_data"]:
                            sub_obj = payload.get(sub_obj_key)
                            if isinstance(sub_obj, dict):
                                if metric_key and metric_key in sub_obj:
                                    new_val = sub_obj[metric_key]
                                elif attr["name"] in sub_obj:
                                    new_val = sub_obj[attr["name"]]
                                else:
                                    for sk, sv in sub_obj.items():
                                        if sk.strip().lower() == attr["name"].strip().lower():
                                            new_val = sv
                                            break
                            if new_val is not None:
                                break

                    if new_val is not None:
                        attr["value"] = str(new_val)
                        attr["timestamp"] = packet_ts
                        attr["quality"] = "Good"
                        updated_attrs.append({
                            "asset_id": asset["id"],
                            "asset_name": asset.get("name", ""),
                            "attribute": attr["name"],
                            "value": new_val
                        })

            # 2. Recalculate this asset's runtime attributes and qualities
            self.recalculate_asset_attributes(asset)

        self.persist_state()
        return {
            "status": "SUCCESS",
            "device": dev,
            "device_id": str(device_id),
            "attributes_updated": len(updated_attrs),
            "updated_attrs": updated_attrs
        }

    # ==========================================
    # Function Block Execution & Management Methods
    # ==========================================
    def list_function_blocks(self) -> List[Dict[str, Any]]:
        return self.function_blocks

    def get_function_block(self, fb_id: str) -> Optional[Dict[str, Any]]:
        return next((b for b in self.function_blocks if b["id"] == fb_id), None)

    def create_function_block(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        fb_id = payload.get("id") or f"fb-{uuid.uuid4().hex[:6]}"
        now_iso = datetime.datetime.utcnow().isoformat() + "Z"
        
        tmpl_code = payload.get("template_code", "CUSTOM")
        tmpl = next((t for t in self.function_block_templates if t["template_code"] == tmpl_code), None)
        
        formula = payload.get("formula_code") or (tmpl["formula_code"] if tmpl else "// custom logic\nfunction execute(inputs) { return { value: 0 }; }")
        
        new_block = {
            "id": fb_id,
            "name": payload.get("name", "New Function Block"),
            "template_code": tmpl_code,
            "template_name": tmpl["name"] if tmpl else "Custom Script Block",
            "category": payload.get("category", tmpl["category"] if tmpl else "Calculation"),
            "asset_id": payload.get("asset_id", ""),
            "asset_name": payload.get("asset_name", ""),
            "target_tag": payload.get("target_tag", f"CALC.{fb_id.upper()}"),
            "schedule_interval": payload.get("schedule_interval", "1s"),
            "status": payload.get("status", "ACTIVE"),
            "last_run_at": now_iso,
            "last_execution_ms": 0.0,
            "last_output_value": None,
            "last_output_data": {},
            "input_bindings": payload.get("input_bindings", {}),
            "formula_code": formula,
            "execution_log": "Block initialized successfully."
        }
        self.function_blocks.append(new_block)
        self.persist_state()
        self.log_event("Function Block", fb_id, "Create", self.user_profile["account_id"], "Success", f"Created Function Block '{new_block['name']}' ({tmpl_code})")
        return new_block

    def update_function_block(self, fb_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        block = self.get_function_block(fb_id)
        if not block:
            return None
        block.update(payload)
        self.persist_state()
        self.log_event("Function Block", fb_id, "Update", self.user_profile["account_id"], "Success", f"Updated Function Block configuration '{block['name']}'")
        return block

    def delete_function_block(self, fb_id: str) -> bool:
        idx = next((i for i, b in enumerate(self.function_blocks) if b["id"] == fb_id), None)
        if idx is None:
            return False
        removed = self.function_blocks.pop(idx)
        self.persist_state()
        self.log_event("Function Block", fb_id, "Delete", self.user_profile["account_id"], "Success", f"Deleted Function Block '{removed['name']}'")
        return True

    def execute_function_block(self, fb_id: str, custom_inputs: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Executes a function block using Node.js V2 runner with real bound input values.
        """
        block = self.get_function_block(fb_id)
        if not block:
            return {"success": False, "error": f"Function block {fb_id} not found"}

        from app.services.fb_engine import execute_js_block
        
        # Prepare inputs from bindings or custom inputs
        inputs = {}
        bindings = block.get("input_bindings", {})
        
        # Find template schema defaults if needed
        tmpl = next((t for t in self.function_block_templates if t["template_code"] == block.get("template_code")), None)
        if tmpl:
            for inp in tmpl.get("inputs_schema", []):
                inputs[inp["name"]] = inp.get("default", 0.0)

        # Merge bound tag values from asset attributes or simulation
        for inp_name, tag_or_attr in bindings.items():
            # Check if value is in asset attributes
            found_val = None
            for asset in self.assets:
                for attr in asset.get("attributes", []):
                    if attr.get("name") == tag_or_attr or attr.get("tag_name") == tag_or_attr:
                        try:
                            found_val = float(attr.get("value", 0.0))
                        except (ValueError, TypeError):
                            found_val = attr.get("value")
                        break
                if found_val is not None:
                    break
            
            if found_val is not None:
                inputs[inp_name] = found_val
            elif custom_inputs and inp_name in custom_inputs:
                inputs[inp_name] = custom_inputs[inp_name]

        # Override with explicit custom inputs
        if custom_inputs:
            inputs.update(custom_inputs)

        # Run via Node.js
        exec_res = execute_js_block(block.get("formula_code", ""), inputs)
        
        now_iso = datetime.datetime.utcnow().isoformat() + "Z"
        block["last_run_at"] = now_iso
        block["last_execution_ms"] = exec_res.get("duration_ms", 1.5)
        
        if exec_res.get("success"):
            result_obj = exec_res.get("result", {})
            block["last_output_data"] = result_obj
            # Extract primary numerical output
            if isinstance(result_obj, dict):
                first_num = next((v for v in result_obj.values() if isinstance(v, (int, float))), None)
                block["last_output_value"] = first_num
            elif isinstance(result_obj, (int, float)):
                block["last_output_value"] = result_obj
            
            block["execution_log"] = f"OK: {json.dumps(result_obj)}"
            block["status"] = "ACTIVE"
        else:
            block["execution_log"] = f"ERR: {exec_res.get('error')}"
            block["status"] = "ERROR"

        return {
            "success": exec_res.get("success", False),
            "inputs_used": inputs,
            "result": exec_res.get("result"),
            "logs": exec_res.get("logs", []),
            "duration_ms": exec_res.get("duration_ms", 0),
            "error": exec_res.get("error"),
            "block": block
        }

    def test_run_function_block(self, formula_code: str, test_inputs: Dict[str, Any]) -> Dict[str, Any]:
        from app.services.fb_engine import execute_js_block
        return execute_js_block(formula_code, test_inputs)

    # ==========================================
    # SCADA Windows & Tag Mapping Manager
    # ==========================================
    def list_scada_windows(self) -> List[Dict[str, Any]]:
        return self.scada_windows

    def get_scada_window(self, window_id: str) -> Optional[Dict[str, Any]]:
        return next((w for w in self.scada_windows if w["id"] == window_id), None)

    def create_scada_window(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        win_id = payload.get("id") or f"win-{uuid.uuid4().hex[:6]}"
        new_win = {
            "id": win_id,
            "title": payload.get("title", "New SCADA Process Window"),
            "description": payload.get("description", ""),
            "asset_id": payload.get("asset_id", "ast-unit-cdu"),
            "asset_name": payload.get("asset_name", "Atmospheric Distillation Unit C-101"),
            "width": payload.get("width", 1100),
            "height": payload.get("height", 620),
            "background_color": payload.get("background_color", "#020617"),
            "grid_size": payload.get("grid_size", 20),
            "is_default": payload.get("is_default", False),
            "elements": payload.get("elements", [])
        }
        self.scada_windows.append(new_win)
        self.log_event("SCADA Window", win_id, "Create", self.user_profile["account_id"], "Success", f"Created SCADA Window '{new_win['title']}'")
        return new_win

    def update_scada_window(self, window_id: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        win = self.get_scada_window(window_id)
        if not win:
            return None
        win.update(payload)
        self.log_event("SCADA Window", window_id, "Update", self.user_profile["account_id"], "Success", f"Updated SCADA Window '{win['title']}'")
        return win

    def delete_scada_window(self, window_id: str) -> bool:
        initial = len(self.scada_windows)
        self.scada_windows = [w for w in self.scada_windows if w["id"] != window_id]
        if len(self.scada_windows) < initial:
            self.log_event("SCADA Window", window_id, "Delete", self.user_profile["account_id"], "Success", f"Deleted SCADA Window {window_id}")
            return True
        return False

    def add_scada_element(self, window_id: str, element_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        win = self.get_scada_window(window_id)
        if not win:
            return None
        elem_id = element_data.get("id") or f"elem-{uuid.uuid4().hex[:6]}"
        element_data["id"] = elem_id
        win["elements"].append(element_data)
        return element_data

    def update_scada_element(self, window_id: str, element_id: str, element_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        win = self.get_scada_window(window_id)
        if not win:
            return None
        for i, el in enumerate(win["elements"]):
            if el["id"] == element_id:
                win["elements"][i].update(element_data)
                return win["elements"][i]
        return None

    def delete_scada_element(self, window_id: str, element_id: str) -> bool:
        win = self.get_scada_window(window_id)
        if not win:
            return False
        initial = len(win["elements"])
        win["elements"] = [el for el in win["elements"] if el["id"] != element_id]
        return len(win["elements"]) < initial

    def get_all_mappable_dm_tags(self) -> List[Dict[str, Any]]:
        """
        Gathers all available plant tags across DM Assets, Ingest Devices,
        Yokogawa V8 Function Blocks, CENTUM VP Simulator, and OPC UA.
        """
        tags = []
        seen = set()

        # 1. From DM Assets (Dynamic, Runtime, Integration, Static)
        for asset in self.assets:
            for attr in asset.get("attributes", []):
                t_name = attr.get("tag_name") or f"{asset['name']}.{attr.get('name')}"
                if t_name and t_name not in seen:
                    seen.add(t_name)
                    tags.append({
                        "tag_name": t_name,
                        "display_name": f"{asset['name']} - {attr.get('name')}",
                        "source": f"DM_ASSET_{attr.get('type', 'Dynamic').upper()}",
                        "asset_id": asset.get("id"),
                        "asset_name": asset.get("name"),
                        "eng_units": attr.get("uom", ""),
                        "data_type": "Float" if attr.get("type") in ["Dynamic", "Runtime"] else "String",
                        "current_value": attr.get("value", 0.0),
                        "description": f"Asset Attribute: {attr.get('name')} ({attr.get('type')})"
                    })

        # 2. From Function Blocks
        for fb in self.function_blocks:
            t_name = fb.get("target_tag")
            if t_name and t_name not in seen:
                seen.add(t_name)
                tags.append({
                    "tag_name": t_name,
                    "display_name": fb.get("name"),
                    "source": "FUNCTION_BLOCK_V8",
                    "asset_id": fb.get("asset_id"),
                    "asset_name": fb.get("asset_name"),
                    "eng_units": "°C" if "DELTA" in t_name or "TIC" in t_name else ("score" if "MT" in t_name else "m"),
                    "data_type": "Float",
                    "current_value": fb.get("last_output_value", 0.0),
                    "description": f"V8 Function Block: {fb.get('template_name')}"
                })

        # 3. Known Plant DCS Simulator Tags
        known_dcs = [
            ("FIC_101.PV", "Crude Feed Flow Rate", "m³/h", 452.3, "CENTUM_VP"),
            ("FIC_102.PV", "Naphtha Reflux Flow", "m³/h", 176.4, "CENTUM_VP"),
            ("LIC_101.PV", "Column Sump Level", "%", 62.1, "CENTUM_VP"),
            ("TIC_101.PV", "Overhead Vapor Temperature", "°C", 118.4, "CENTUM_VP"),
            ("TIC_102.PV", "Column Reboiler Temperature", "°C", 235.8, "CENTUM_VP"),
            ("PIC_101.PV", "Column Top Pressure", "kPa", 145.2, "CENTUM_VP"),
            ("VIB_101.RMS", "Charge Pump P-101A Bearing Vibration", "mm/s", 1.84, "CENTUM_VP"),
            ("AHI_C101.HEALTH", "Asset Health Index", "%", 94.8, "OPREX_AHI"),
            ("PUMP_101A.DIFF_HEAD", "Pump P-101A Differential Head", "m", 55.45, "CENTUM_VP")
        ]
        for name, desc, uom, def_val, src in known_dcs:
            if name not in seen:
                seen.add(name)
                tags.append({
                    "tag_name": name,
                    "display_name": desc,
                    "source": src,
                    "asset_id": "ast-unit-cdu",
                    "asset_name": "Atmospheric Distillation Unit C-101",
                    "eng_units": uom,
                    "data_type": "Float",
                    "current_value": def_val,
                    "description": f"DCS Regulatory Controller Loop ({name})"
                })

        return tags

    # =========================================================================
    # Rule Chains (ThingsBoard Rule Engine V3.8)
    # =========================================================================
    def list_rule_chains(self) -> List[Dict[str, Any]]:
        return self.rule_chains

    def get_rule_chain(self, chain_id: str) -> Optional[Dict[str, Any]]:
        return next((rc for rc in self.rule_chains if rc["id"] == chain_id), None)

    def save_rule_chain(self, data: Dict[str, Any]) -> Dict[str, Any]:
        chain_id = data.get("id") or f"rc-{uuid.uuid4().hex[:8]}"
        data["id"] = chain_id
        data["nodes_count"] = len(data.get("nodes", []))
        
        idx = next((i for i, rc in enumerate(self.rule_chains) if rc["id"] == chain_id), -1)
        if idx >= 0:
            self.rule_chains[idx] = data
            self.log_event("RuleChain", chain_id, "Update", self.user_profile["account_id"], "Success", f"Updated rule chain '{data.get('name')}'")
        else:
            self.rule_chains.append(data)
            self.log_event("RuleChain", chain_id, "Create", self.user_profile["account_id"], "Success", f"Created rule chain '{data.get('name')}'")
        self.persist_state()
        return data

    def delete_rule_chain(self, chain_id: str) -> bool:
        initial_len = len(self.rule_chains)
        self.rule_chains = [rc for rc in self.rule_chains if rc["id"] != chain_id]
        if len(self.rule_chains) < initial_len:
            self.persist_state()
            self.log_event("RuleChain", chain_id, "Delete", self.user_profile["account_id"], "Success", f"Deleted rule chain {chain_id}")
            return True
        return False

    def test_run_rule_chain(self, chain_id: str, msg: Dict[str, Any], metadata: Optional[Dict[str, Any]] = None, msg_type: str = "POST_TELEMETRY_REQUEST") -> Dict[str, Any]:
        chain = self.get_rule_chain(chain_id) or self.rule_chains[0]
        nodes = chain.get("nodes", [])
        trace = []
        now = datetime.datetime.utcnow().isoformat() + "Z"
        
        curr_msg = dict(msg)
        curr_metadata = dict(metadata or {"topic": "v1/devices/me/telemetry", "deviceType": "CENTUM_VP_DCS", "ts": int(datetime.datetime.utcnow().timestamp() * 1000)})
        
        total_latency = 0.0
        for i, node in enumerate(nodes):
            node_type = node.get("type", "ACTION")
            node_name = node.get("name", f"Node-{i}")
            lat = round(random.uniform(0.8, 3.5), 2)
            total_latency += lat
            
            status = "PASS"
            relation = "Success"
            details = ""
            
            if node_type == "INPUT":
                relation = "Success"
                details = f"Ingested message type '{msg_type}'"
            elif node_type == "FILTER":
                # Evaluate temperature or pressure
                t_val = curr_msg.get("temperature", curr_msg.get("TIC_101.PV", 94.6))
                p_val = curr_msg.get("pressure", curr_msg.get("PIC_101.PV", 268.4))
                if t_val > 85 or p_val > 250:
                    relation = "True"
                    details = f"Condition evaluated TRUE (T={t_val}°C, P={p_val}kPa exceeded envelope)"
                else:
                    relation = "False"
                    details = f"Condition evaluated FALSE (T={t_val}°C, P={p_val}kPa normal)"
            elif node_type == "TRANSFORM":
                relation = "Success"
                # Add calculated fields
                if "temperature" in curr_msg:
                    curr_msg["temp_f"] = round(curr_msg["temperature"] * 1.8 + 32, 2)
                if "pressure" in curr_msg:
                    curr_msg["pressure_bar"] = round(curr_msg["pressure"] / 100.0, 3)
                details = "Normalized units to English/SI cross-standard"
            elif node_type == "ACTION":
                if "Alarm" in node_name:
                    relation = "Alarm Created"
                    details = "Dispatched ISA-18.2 Urgent Alarm event to Alarm Queue"
                else:
                    relation = "Success"
                    details = "Saved data point to Timeseries partition (PostgreSQL & Redis)"
            
            trace.append({
                "node_id": node.get("id"),
                "node_name": node_name,
                "node_type": node_type,
                "status": status,
                "relation": relation,
                "latency_ms": lat,
                "timestamp": now,
                "details": details,
                "msg_snapshot": dict(curr_msg)
            })

        return {
            "status": "SUCCESS",
            "chain_id": chain.get("id"),
            "chain_name": chain.get("name"),
            "total_nodes_traversed": len(trace),
            "total_latency_ms": round(total_latency, 2),
            "trace": trace,
            "output_message": curr_msg,
            "output_metadata": curr_metadata
        }

    # =========================================================================
    # ThingsBoard Widgets Library & Dashboard State
    # =========================================================================
    def list_widgets(self) -> List[Dict[str, Any]]:
        return self.dashboard_widgets

    def save_widget(self, data: Dict[str, Any]) -> Dict[str, Any]:
        wid = data.get("id") or f"w-{uuid.uuid4().hex[:6]}"
        data["id"] = wid
        idx = next((i for i, w in enumerate(self.dashboard_widgets) if w["id"] == wid), -1)
        if idx >= 0:
            self.dashboard_widgets[idx] = data
        else:
            self.dashboard_widgets.append(data)
        return data

    def delete_widget(self, wid: str) -> bool:
        init_len = len(self.dashboard_widgets)
        self.dashboard_widgets = [w for w in self.dashboard_widgets if w["id"] != wid]
        return len(self.dashboard_widgets) < init_len

dm_store = DMDataStore()
