"""
Function Block V2 Template-First Architecture Service
Implements Yokogawa OpreX AHI-inspired Block Template Manager, Asset Markup Designer,
Input/Output Attribute Definition, Monaco JS Isolation, Output Mapping,
Publication Workflow, and Block Execution Engine.
"""
import uuid
import datetime
import json
import logging
import re
from typing import Dict, List, Any, Optional

from app.services.js_executor import execute_js_sandbox, validate_js_syntax
from app.services.fb_block_registry import register_block, BLOCK_REGISTRY
from app.api.dm_service import dm_store

logger = logging.getLogger("ydash.fb_template_service")

# =========================================================================
# SEED DEFAULT INDUSTRIAL TEMPLATES
# =========================================================================

DEFAULT_PUMP_KPI_SCRIPT = """function calculate(ctx, inputs) {
  const flow = inputs.flow;
  const power = inputs.power;
  const running = inputs.running;

  const valid =
    Number.isFinite(flow) &&
    flow > 0 &&
    Number.isFinite(power) &&
    power >= 0;

  return {
    specificEnergy: valid ? Number((power / flow).toFixed(4)) : null,
    isRunning: running === true || running === 1,
    validCalculation: valid
  };
}"""

DEFAULT_DISTILLATION_SCRIPT = """function calculate(ctx, inputs) {
  const top = Number(inputs.t_overhead != null ? inputs.t_overhead : 118.0);
  const bot = Number(inputs.t_reboiler != null ? inputs.t_reboiler : 235.0);
  const dt = Number((bot - top).toFixed(2));
  
  let status = "NORMAL";
  if (dt > 140.0) status = "OVERHEATED_REBOILER";
  else if (dt < 90.0) status = "FLOODING_SUSPECTED";

  return {
    deltaT: dt,
    gradientStatus: status
  };
}"""

DEFAULT_PUMP_HEAD_SCRIPT = """function calculate(ctx, inputs) {
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
    differentialHeadM: Number(head.toFixed(2)),
    hydraulicPowerKW: Number(hyd_kw.toFixed(2)),
    operatingPoint: head > 60 ? "OPTIMAL" : "BELOW_BEP"
  };
}"""

SEED_TEMPLATES = [
    {
        "id": "fbt-pump-kpi-01",
        "template_code": "FB_PUMP_KPI",
        "name": "Pump Performance KPI Calculator",
        "description": "Calculates Specific Energy Consumption (kWh/m3), pump running state, and KPI validity from flow and active power.",
        "category": "Energy & Sustainability",
        "asset_type": "Pump",
        "execution_language": "JavaScript",
        "version": "1.0.0",
        "status": "PUBLISHED",
        "author": "Chief Automation Architect",
        "created_at": "2026-10-10T08:00:00Z",
        "updated_at": "2026-10-10T08:00:00Z",
        "published_at": "2026-10-10T08:00:00Z",
        "published_by": "engineer@yokogawa.com",
        "markups": [
            {
                "id": "mk-pump",
                "name": "Pump",
                "placeholder": "@Pump",
                "expected_asset_type": "EQUIPMENT",
                "description": "Main centrifugal pump equipment asset",
                "required": True,
                "selection_scope": "EQUIPMENT",
                "device_markup": "@PumpDevice"
            },
            {
                "id": "mk-motor",
                "name": "Motor",
                "placeholder": "@Motor",
                "expected_asset_type": "EQUIPMENT",
                "description": "Electric motor driving the pump",
                "required": True,
                "selection_scope": "EQUIPMENT",
                "device_markup": ""
            }
        ],
        "inputs": [
            {
                "id": "inp-flow",
                "name": "flow",
                "display_name": "Volumetric Flow Rate",
                "description": "Discharge volumetric flow rate",
                "asset_markup": "@Pump",
                "attribute_reference": "FlowRate",
                "attribute_type": "Dynamic",
                "data_type": "Double",
                "uom": "m³/h",
                "required": True,
                "default_value": 20.0,
                "quality_policy": "STRICT",
                "max_data_age_sec": 60,
                "missing_data_policy": "USE_DEFAULT"
            },
            {
                "id": "inp-power",
                "name": "power",
                "display_name": "Active Electric Power",
                "description": "Measured active power from motor drive",
                "asset_markup": "@Motor",
                "attribute_reference": "Power",
                "attribute_type": "Dynamic",
                "data_type": "Double",
                "uom": "kW",
                "required": True,
                "default_value": 15.0,
                "quality_policy": "STRICT",
                "max_data_age_sec": 60,
                "missing_data_policy": "USE_DEFAULT"
            },
            {
                "id": "inp-running",
                "name": "running",
                "display_name": "Pump Running Status",
                "description": "Digital run permissive or running status feedback",
                "asset_markup": "@Pump",
                "attribute_reference": "RunningStatus",
                "attribute_type": "Dynamic",
                "data_type": "Boolean",
                "uom": "bool",
                "required": True,
                "default_value": True,
                "quality_policy": "ALLOW_UNCERTAIN",
                "max_data_age_sec": 120,
                "missing_data_policy": "USE_DEFAULT"
            }
        ],
        "outputs": [
            {
                "id": "out-sec",
                "name": "SpecificEnergy",
                "output_key": "specificEnergy",
                "description": "Specific Energy Consumption per Unit Volume",
                "target_asset_markup": "@Pump",
                "runtime_attribute_name": "SpecificEnergy",
                "data_type": "Double",
                "uom": "kWh/m³",
                "decimal_places": 4,
                "nullable": True,
                "default_value": 0.0,
                "script_result_key": "specificEnergy",
                "persist_historian": True,
                "publish_event": True,
                "quality_propagation_policy": "PROPAGATE_WORST"
            },
            {
                "id": "out-running",
                "name": "IsRunning",
                "output_key": "isRunning",
                "description": "Verified pump operational running status",
                "target_asset_markup": "@Pump",
                "runtime_attribute_name": "IsRunning",
                "data_type": "Boolean",
                "uom": "bool",
                "decimal_places": 0,
                "nullable": False,
                "default_value": False,
                "script_result_key": "isRunning",
                "persist_historian": True,
                "publish_event": False,
                "quality_propagation_policy": "ALWAYS_GOOD"
            },
            {
                "id": "out-valid",
                "name": "KPIValid",
                "output_key": "validCalculation",
                "description": "Flag indicating calculation inputs were valid and positive",
                "target_asset_markup": "@Pump",
                "runtime_attribute_name": "KPIValid",
                "data_type": "Boolean",
                "uom": "bool",
                "decimal_places": 0,
                "nullable": False,
                "default_value": False,
                "script_result_key": "validCalculation",
                "persist_historian": False,
                "publish_event": False,
                "quality_propagation_policy": "ALWAYS_GOOD"
            }
        ],
        "script_code": DEFAULT_PUMP_KPI_SCRIPT,
        "output_mappings": [
            {
                "script_result_key": "specificEnergy",
                "output_key": "specificEnergy",
                "target_asset_markup": "@Pump",
                "runtime_attribute_name": "SpecificEnergy",
                "data_type": "Double",
                "uom": "kWh/m³"
            },
            {
                "script_result_key": "isRunning",
                "output_key": "isRunning",
                "target_asset_markup": "@Pump",
                "runtime_attribute_name": "IsRunning",
                "data_type": "Boolean",
                "uom": "bool"
            },
            {
                "script_result_key": "validCalculation",
                "output_key": "validCalculation",
                "target_asset_markup": "@Pump",
                "runtime_attribute_name": "KPIValid",
                "data_type": "Boolean",
                "uom": "bool"
            }
        ],
        "parameters": [
            {"name": "ratedHead", "label": "Rated Head", "data_type": "Double", "default_value": 45.0, "uom": "m"},
            {"name": "fluidDensity", "label": "Fluid Density", "data_type": "Double", "default_value": 1000.0, "uom": "kg/m³"}
        ]
    },
    {
        "id": "fbt-distillation-dt-01",
        "template_code": "FB_DISTILLATION_DELTA_T",
        "name": "Distillation Column Thermal Delta",
        "description": "Computes vertical temperature gradient across fractionation trays for vapor-liquid separation control.",
        "category": "Calculation",
        "asset_type": "Column",
        "execution_language": "JavaScript",
        "version": "1.0.0",
        "status": "PUBLISHED",
        "author": "Process Control Lead",
        "created_at": "2026-10-10T08:00:00Z",
        "updated_at": "2026-10-10T08:00:00Z",
        "published_at": "2026-10-10T08:00:00Z",
        "published_by": "engineer@yokogawa.com",
        "markups": [
            {
                "id": "mk-col",
                "name": "Column",
                "placeholder": "@Column",
                "expected_asset_type": "UNIT",
                "description": "Atmospheric distillation column unit",
                "required": True,
                "selection_scope": "UNIT",
                "device_markup": ""
            }
        ],
        "inputs": [
            {
                "id": "inp-t-overhead",
                "name": "t_overhead",
                "display_name": "Overhead Vapor Temperature",
                "description": "Top tray vapor thermocouple reading",
                "asset_markup": "@Column",
                "attribute_reference": "OverheadTemp",
                "attribute_type": "Dynamic",
                "data_type": "Double",
                "uom": "°C",
                "required": True,
                "default_value": 118.0,
                "quality_policy": "STRICT",
                "max_data_age_sec": 60,
                "missing_data_policy": "USE_DEFAULT"
            },
            {
                "id": "inp-t-reboiler",
                "name": "t_reboiler",
                "display_name": "Reboiler Bottom Temperature",
                "description": "Bottom reboiler liquid thermocouple reading",
                "asset_markup": "@Column",
                "attribute_reference": "ReboilerTemp",
                "attribute_type": "Dynamic",
                "data_type": "Double",
                "uom": "°C",
                "required": True,
                "default_value": 235.0,
                "quality_policy": "STRICT",
                "max_data_age_sec": 60,
                "missing_data_policy": "USE_DEFAULT"
            }
        ],
        "outputs": [
            {
                "id": "out-dt",
                "name": "DeltaT",
                "output_key": "deltaT",
                "description": "Column temperature gradient",
                "target_asset_markup": "@Column",
                "runtime_attribute_name": "DeltaT",
                "data_type": "Double",
                "uom": "°C",
                "decimal_places": 2,
                "nullable": False,
                "default_value": 117.0,
                "script_result_key": "deltaT",
                "persist_historian": True,
                "publish_event": True,
                "quality_propagation_policy": "PROPAGATE_WORST"
            },
            {
                "id": "out-status",
                "name": "GradientStatus",
                "output_key": "gradientStatus",
                "description": "Status condition: NORMAL, OVERHEATED_REBOILER, or FLOODING_SUSPECTED",
                "target_asset_markup": "@Column",
                "runtime_attribute_name": "GradientStatus",
                "data_type": "String",
                "uom": "",
                "decimal_places": 0,
                "nullable": False,
                "default_value": "NORMAL",
                "script_result_key": "gradientStatus",
                "persist_historian": False,
                "publish_event": True,
                "quality_propagation_policy": "ALWAYS_GOOD"
            }
        ],
        "script_code": DEFAULT_DISTILLATION_SCRIPT,
        "output_mappings": [
            {
                "script_result_key": "deltaT",
                "output_key": "deltaT",
                "target_asset_markup": "@Column",
                "runtime_attribute_name": "DeltaT",
                "data_type": "Double",
                "uom": "°C"
            },
            {
                "script_result_key": "gradientStatus",
                "output_key": "gradientStatus",
                "target_asset_markup": "@Column",
                "runtime_attribute_name": "GradientStatus",
                "data_type": "String",
                "uom": ""
            }
        ],
        "parameters": []
    }
]


class FBTemplateService:
    def __init__(self):
        self.templates: List[Dict[str, Any]] = []
        self.template_versions: Dict[str, List[Dict[str, Any]]] = {}
        self.executions: List[Dict[str, Any]] = []
        self.execution_history: List[Dict[str, Any]] = []
        self.causation_tracker: Dict[str, int] = {}
        self._load_state()
        self._ensure_seed_assets()

    def _ensure_seed_assets(self):
        """Ensures physical assets P101, M101, and P102 exist with initial test telemetry."""
        now_iso = datetime.datetime.utcnow().isoformat() + "Z"
        existing_ids = {a["id"] for a in getattr(dm_store, "assets", [])}

        sample_assets = [
            {
                "id": "ast-pump-101",
                "name": "Crude Feed Charge Pump P-101",
                "level": "EQUIPMENT",
                "parent_id": None,
                "path": "Yokogawa Global Energy / Area 01 / Pump P-101",
                "description": "Multi-stage API 610 crude charge pump P101",
                "attributes": [
                    {
                        "id": "attr-p101-flow",
                        "name": "FlowRate",
                        "display_name": "Discharge Flow Rate",
                        "type": "Dynamic",
                        "data_type": "Double",
                        "uom": "m³/h",
                        "value": "20.0",
                        "quality": "Good",
                        "timestamp": now_iso
                    },
                    {
                        "id": "attr-p101-run",
                        "name": "RunningStatus",
                        "display_name": "Pump Running Status",
                        "type": "Dynamic",
                        "data_type": "Boolean",
                        "uom": "bool",
                        "value": "true",
                        "quality": "Good",
                        "timestamp": now_iso
                    }
                ]
            },
            {
                "id": "ast-motor-101",
                "name": "Drive Motor M-101",
                "level": "EQUIPMENT",
                "parent_id": None,
                "path": "Yokogawa Global Energy / Area 01 / Motor M-101",
                "description": "Induction motor for Pump P101 (150kW)",
                "attributes": [
                    {
                        "id": "attr-m101-power",
                        "name": "Power",
                        "display_name": "Active Electric Power",
                        "type": "Dynamic",
                        "data_type": "Double",
                        "uom": "kW",
                        "value": "15.0",
                        "quality": "Good",
                        "timestamp": now_iso
                    }
                ]
            },
            {
                "id": "ast-pump-102",
                "name": "Crude Feed Charge Pump P-102",
                "level": "EQUIPMENT",
                "parent_id": None,
                "path": "Yokogawa Global Energy / Area 01 / Pump P-102",
                "description": "Standby API 610 crude charge pump P102",
                "attributes": [
                    {
                        "id": "attr-p102-flow",
                        "name": "FlowRate",
                        "display_name": "Discharge Flow Rate",
                        "type": "Dynamic",
                        "data_type": "Double",
                        "uom": "m³/h",
                        "value": "35.0",
                        "quality": "Good",
                        "timestamp": now_iso
                    },
                    {
                        "id": "attr-p102-run",
                        "name": "RunningStatus",
                        "display_name": "Pump Running Status",
                        "type": "Dynamic",
                        "data_type": "Boolean",
                        "uom": "bool",
                        "value": "true",
                        "quality": "Good",
                        "timestamp": now_iso
                    }
                ]
            }
        ]

        added = False
        for sa in sample_assets:
            if sa["id"] not in existing_ids:
                dm_store.assets.append(sa)
                existing_ids.add(sa["id"])
                added = True
            else:
                # Ensure attributes exist on existing asset
                target = next((a for a in dm_store.assets if a["id"] == sa["id"]), None)
                if target:
                    target_attr_names = {a.get("name") for a in target.get("attributes", [])}
                    for attr in sa["attributes"]:
                        if attr["name"] not in target_attr_names:
                            target.setdefault("attributes", []).append(attr)
                            added = True

        if added:
            dm_store.persist_state()

    def _ensure_seed_executions(self):
        """Ensures the standard Yokogawa AHI P-101 KPI Execution instance is pre-deployed and linked."""
        now_iso = datetime.datetime.utcnow().isoformat() + "Z"
        has_pump_exec = any(e.get("template_code") == "FB_PUMP_KPI" for e in self.executions)
        if not has_pump_exec:
            tmpl = self.get_template("fbt-pump-kpi-01") or self.get_template("FB_PUMP_KPI")
            if tmpl:
                snapshot = json.loads(json.dumps(tmpl))
                exec_id = "fbe-pump-kpi-101"
                exec_name = "P-101 Pump Performance KPI"
                asset_bindings = {
                    "@Pump": "ast-pump-101",
                    "@Motor": "ast-motor-101"
                }
                input_bindings = {
                    "flow": {
                        "asset_id": "ast-pump-101",
                        "attribute_name": "FlowRate",
                        "attribute_id": "attr-p101-flow"
                    },
                    "power": {
                        "asset_id": "ast-motor-101",
                        "attribute_name": "Power",
                        "attribute_id": "attr-m101-power"
                    },
                    "running": {
                        "asset_id": "ast-pump-101",
                        "attribute_name": "RunningStatus",
                        "attribute_id": "attr-p101-run"
                    }
                }
                output_bindings = [
                    {
                        "output_key": "specificEnergy",
                        "script_result_key": "specificEnergy",
                        "asset_markup": "@Pump",
                        "asset_id": "ast-pump-101",
                        "asset_name": "Crude Feed Charge Pump P-101",
                        "runtime_attribute_name": "SpecificEnergy",
                        "runtime_attribute_id": "attr-p101-sec",
                        "data_type": "Double",
                        "uom": "kWh/m³",
                        "persist_historian": True,
                        "publish_event": True
                    },
                    {
                        "output_key": "isRunning",
                        "script_result_key": "isRunning",
                        "asset_markup": "@Pump",
                        "asset_id": "ast-pump-101",
                        "asset_name": "Crude Feed Charge Pump P-101",
                        "runtime_attribute_name": "IsRunning",
                        "runtime_attribute_id": "attr-p101-isrun",
                        "data_type": "Boolean",
                        "uom": "bool",
                        "persist_historian": True,
                        "publish_event": False
                    },
                    {
                        "output_key": "validCalculation",
                        "script_result_key": "validCalculation",
                        "asset_markup": "@Pump",
                        "asset_id": "ast-pump-101",
                        "asset_name": "Crude Feed Charge Pump P-101",
                        "runtime_attribute_name": "KPIValid",
                        "runtime_attribute_id": "attr-p101-valid",
                        "data_type": "Boolean",
                        "uom": "bool",
                        "persist_historian": False,
                        "publish_event": False
                    }
                ]
                new_exec = {
                    "id": exec_id,
                    "name": exec_name,
                    "template_id": tmpl["id"],
                    "template_code": tmpl.get("template_code"),
                    "template_version": tmpl.get("version", "1.0.0"),
                    "template_snapshot": snapshot,
                    "status": "ACTIVE",
                    "asset_bindings": asset_bindings,
                    "device_bindings": {},
                    "input_bindings": input_bindings,
                    "output_bindings": output_bindings,
                    "trigger_config": {
                        "type": "ATTRIBUTE_UPDATED",
                        "trigger_attribute": "flow",
                        "debounce_ms": 200,
                        "freshness_sec": 30
                    },
                    "last_run_at": now_iso,
                    "last_execution_ms": 1.25,
                    "last_output_data": {
                        "specificEnergy": 0.75,
                        "isRunning": True,
                        "validCalculation": True
                    },
                    "last_status": "SUCCESS",
                    "execution_count": 1,
                    "error_count": 0,
                    "created_at": now_iso,
                    "updated_at": now_iso
                }
                self.executions.append(new_exec)

                # Provision attributes on ast-pump-101
                p101 = next((a for a in getattr(dm_store, "assets", []) if a["id"] == "ast-pump-101"), None)
                if p101:
                    existing_names = {a.get("name") for a in p101.get("attributes", [])}
                    attrs_to_add = [
                        {
                            "id": "attr-p101-sec",
                            "name": "SpecificEnergy",
                            "display_name": "Specific Energy Consumption per Unit Volume",
                            "type": "Runtime",
                            "data_type": "Double",
                            "uom": "kWh/m³",
                            "value": "0.75",
                            "quality": "Good",
                            "timestamp": now_iso,
                            "source": "FUNCTION_BLOCK",
                            "function_block_id": exec_id,
                            "function_block_output": "specificEnergy",
                            "use_expression": False,
                            "expression": ""
                        },
                        {
                            "id": "attr-p101-isrun",
                            "name": "IsRunning",
                            "display_name": "Pump Validated Running Status",
                            "type": "Runtime",
                            "data_type": "Boolean",
                            "uom": "bool",
                            "value": "true",
                            "quality": "Good",
                            "timestamp": now_iso,
                            "source": "FUNCTION_BLOCK",
                            "function_block_id": exec_id,
                            "function_block_output": "isRunning",
                            "use_expression": False,
                            "expression": ""
                        },
                        {
                            "id": "attr-p101-valid",
                            "name": "KPIValid",
                            "display_name": "Calculation Inputs Valid & Positive",
                            "type": "Runtime",
                            "data_type": "Boolean",
                            "uom": "bool",
                            "value": "true",
                            "quality": "Good",
                            "timestamp": now_iso,
                            "source": "FUNCTION_BLOCK",
                            "function_block_id": exec_id,
                            "function_block_output": "validCalculation",
                            "use_expression": False,
                            "expression": ""
                        }
                    ]
                    for a_item in attrs_to_add:
                        if a_item["name"] not in existing_names:
                            p101.setdefault("attributes", []).append(a_item)
                        else:
                            match = next((x for x in p101["attributes"] if x.get("name") == a_item["name"]), None)
                            if match:
                                match["type"] = "Runtime"
                                match["source"] = "FUNCTION_BLOCK"
                                match["function_block_id"] = exec_id
                                match["function_block_output"] = a_item["function_block_output"]
                                match["use_expression"] = False
                                match["expression"] = ""
                                match["value"] = a_item["value"]
                                match["quality"] = "Good"

                # Seed initial trace history
                self.execution_history.insert(0, {
                    "execution_id": f"exec-trace-{uuid.uuid4().hex[:8]}",
                    "instance_id": exec_id,
                    "instance_name": exec_name,
                    "template_code": "FB_PUMP_KPI",
                    "timestamp": now_iso,
                    "inputs": {"flow": 20.0, "power": 15.0, "running": True},
                    "result": {"specificEnergy": 0.75, "isRunning": True, "validCalculation": True},
                    "status": "SUCCESS",
                    "duration_ms": 1.25,
                    "logs": ["AHI Calculation Engine: inputs validated (flow=20.0, power=15.0)", "Result: specificEnergy=0.75 kWh/m3, isRunning=true"]
                })
                self.persist()

    def _load_state(self):
        """Loads state from dm_store or initializes defaults."""
        templates_data = getattr(dm_store, "block_templates_v2", None)
        if not templates_data:
            self.templates = [dict(t) for t in SEED_TEMPLATES]
            dm_store.block_templates_v2 = self.templates
        else:
            self.templates = templates_data

        versions_data = getattr(dm_store, "block_template_versions_v2", None)
        if not versions_data:
            self.template_versions = {}
            for t in self.templates:
                self.template_versions[t["id"]] = [dict(t)]
            dm_store.block_template_versions_v2 = self.template_versions
        else:
            self.template_versions = versions_data

        executions_data = getattr(dm_store, "block_executions_v2", None)
        if not executions_data:
            self.executions = []
            dm_store.block_executions_v2 = self.executions
        else:
            self.executions = executions_data

        history_data = getattr(dm_store, "block_execution_history_v2", None)
        if not history_data:
            self.execution_history = []
            dm_store.block_execution_history_v2 = self.execution_history
        else:
            self.execution_history = history_data

        self._ensure_seed_executions()
        self.sync_to_block_registry()

    def persist(self):
        """Saves current state to dm_store and disk."""
        dm_store.block_templates_v2 = self.templates
        dm_store.block_template_versions_v2 = self.template_versions
        dm_store.block_executions_v2 = self.executions
        dm_store.block_execution_history_v2 = self.execution_history[:300]
        dm_store.persist_state()

    def sync_to_block_registry(self):
        """Registers published templates into BLOCK_REGISTRY for universal node availability."""
        for t in self.templates:
            if t.get("status") == "PUBLISHED":
                b_type = f"template.{t.get('template_code', t['id']).lower()}"
                reg_def = {
                    "type": b_type,
                    "version": t.get("version", "1.0.0"),
                    "category": t.get("category", "Custom"),
                    "status": "PUBLISHED",
                    "display_name": t.get("name"),
                    "description": t.get("description", ""),
                    "inputs": [
                        {"name": inp["name"], "type": inp["data_type"], "description": inp.get("description", "")}
                        for inp in t.get("inputs", [])
                    ],
                    "outputs": [
                        {"name": out["output_key"], "type": out["data_type"], "description": out.get("description", "")}
                        for out in t.get("outputs", [])
                    ],
                    "config_schema": {
                        p["name"]: {
                            "type": p.get("data_type", "Double").lower(),
                            "label": p.get("label", p["name"]),
                            "default": p.get("default_value")
                        }
                        for p in t.get("parameters", [])
                    },
                    "is_template": True,
                    "template_id": t["id"],
                    "script_code": t.get("script_code", "")
                }
                register_block(reg_def)

    # =========================================================================
    # PART 3 — BLOCK TEMPLATE MANAGER OPERATIONS
    # =========================================================================

    def list_templates(self, status: Optional[str] = None, category: Optional[str] = None) -> List[Dict[str, Any]]:
        results = self.templates
        if status:
            results = [t for t in results if t.get("status", "").upper() == status.upper()]
        if category and category != "ALL":
            results = [t for t in results if t.get("category", "").upper() == category.upper()]
        return results

    def get_template(self, template_id: str) -> Optional[Dict[str, Any]]:
        return next((t for t in self.templates if t["id"] == template_id or t.get("template_code") == template_id), None)

    def create_template(self, data: Dict[str, Any], author: str = "engineer@yokogawa.com") -> Dict[str, Any]:
        """Creates a new Block Template in DRAFT status."""
        code = (data.get("template_code") or f"FB_{uuid.uuid4().hex[:6].upper()}").strip().upper()
        # Verify code uniqueness
        if any(t.get("template_code") == code for t in self.templates):
            raise ValueError(f"Template code '{code}' already exists. Choose a unique code.")

        tid = data.get("id") or f"fbt-{uuid.uuid4().hex[:8]}"
        now = datetime.datetime.utcnow().isoformat() + "Z"

        new_template = {
            "id": tid,
            "template_code": code,
            "name": data.get("name", "New Block Template"),
            "description": data.get("description", ""),
            "category": data.get("category", "Analytics"),
            "asset_type": data.get("asset_type", "General"),
            "execution_language": "JavaScript",
            "version": data.get("version", "1.0.0"),
            "status": "DRAFT",
            "author": author,
            "created_at": now,
            "updated_at": now,
            "published_at": None,
            "published_by": None,
            "markups": data.get("markups", []),
            "inputs": data.get("inputs", []),
            "outputs": data.get("outputs", []),
            "script_code": data.get("script_code", "function calculate(ctx, inputs) {\n  return {};\n}"),
            "output_mappings": data.get("output_mappings", []),
            "parameters": data.get("parameters", [])
        }

        self.templates.append(new_template)
        self.template_versions[tid] = [dict(new_template)]
        self.persist()
        return new_template

    def update_template(self, template_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Updates a DRAFT Block Template. Rejects editing PUBLISHED templates."""
        tmpl = self.get_template(template_id)
        if not tmpl:
            raise ValueError(f"Block Template '{template_id}' not found")

        if tmpl.get("status") == "PUBLISHED" and data.get("status") != "DRAFT":
            # If changing fields other than switching to draft or new version
            raise ValueError("Published Block Templates are immutable. Create a new draft version to modify.")

        # Update allowed fields
        for field in ["name", "description", "category", "asset_type", "markups", "inputs", "outputs", "script_code", "output_mappings", "parameters"]:
            if field in data:
                tmpl[field] = data[field]

        if "template_code" in data:
            new_code = data["template_code"].strip().upper()
            if new_code != tmpl["template_code"]:
                if any(t.get("template_code") == new_code and t["id"] != tmpl["id"] for t in self.templates):
                    raise ValueError(f"Template code '{new_code}' already in use.")
                tmpl["template_code"] = new_code

        tmpl["updated_at"] = datetime.datetime.utcnow().isoformat() + "Z"
        self.persist()
        return tmpl

    def clone_template(self, template_id: str, new_code: Optional[str] = None, new_name: Optional[str] = None) -> Dict[str, Any]:
        """Clones an existing template into a new independent DRAFT template."""
        src = self.get_template(template_id)
        if not src:
            raise ValueError(f"Source template '{template_id}' not found")

        clone_data = json.loads(json.dumps(src))
        new_id = f"fbt-{uuid.uuid4().hex[:8]}"
        clone_code = (new_code or f"{src['template_code']}_COPY_{uuid.uuid4().hex[:4].upper()}").strip().upper()
        clone_data["id"] = new_id
        clone_data["template_code"] = clone_code
        clone_data["name"] = new_name or f"{src['name']} (Clone)"
        clone_data["version"] = "1.0.0"
        clone_data["status"] = "DRAFT"
        clone_data["created_at"] = datetime.datetime.utcnow().isoformat() + "Z"
        clone_data["updated_at"] = clone_data["created_at"]
        clone_data["published_at"] = None
        clone_data["published_by"] = None

        self.templates.append(clone_data)
        self.template_versions[new_id] = [dict(clone_data)]
        self.persist()
        return clone_data

    def create_new_version(self, template_id: str) -> Dict[str, Any]:
        """Creates a new minor/patch DRAFT version of a PUBLISHED template."""
        curr = self.get_template(template_id)
        if not curr:
            raise ValueError(f"Template '{template_id}' not found")

        curr_ver = curr.get("version", "1.0.0")
        parts = curr_ver.split(".")
        try:
            minor = int(parts[1]) + 1
            new_ver = f"{parts[0]}.{minor}.0"
        except Exception:
            new_ver = f"{curr_ver}.1"

        curr["version"] = new_ver
        curr["status"] = "DRAFT"
        curr["updated_at"] = datetime.datetime.utcnow().isoformat() + "Z"
        self.persist()
        return curr

    def delete_template(self, template_id: str) -> Dict[str, Any]:
        """Deletes a DRAFT template or retires a published one."""
        tmpl = self.get_template(template_id)
        if not tmpl:
            raise ValueError(f"Template '{template_id}' not found")

        # Check if active executions are bound to this template
        active_execs = [e for e in self.executions if e.get("template_id") == tmpl["id"] and e.get("status") == "ACTIVE"]
        if active_execs:
            raise ValueError(f"Cannot delete template with {len(active_execs)} active execution instance(s). Pause or delete executions first.")

        if tmpl.get("status") == "PUBLISHED":
            # Soft retire published templates
            tmpl["status"] = "RETIRED"
            tmpl["updated_at"] = datetime.datetime.utcnow().isoformat() + "Z"
            msg = f"Published template '{tmpl['name']}' has been retired."
        else:
            self.templates = [t for t in self.templates if t["id"] != tmpl["id"]]
            msg = f"Draft template '{tmpl['name']}' deleted."

        self.persist()
        return {"success": True, "message": msg}

    def get_template_versions(self, template_id: str) -> List[Dict[str, Any]]:
        tmpl = self.get_template(template_id)
        if not tmpl:
            raise ValueError(f"Template '{template_id}' not found")
        return self.template_versions.get(tmpl["id"], [dict(tmpl)])

    def export_template(self, template_id: str) -> Dict[str, Any]:
        tmpl = self.get_template(template_id)
        if not tmpl:
            raise ValueError(f"Template '{template_id}' not found")
        clean = json.loads(json.dumps(tmpl))
        clean.pop("published_by", None)
        return clean

    def import_template(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        code = payload.get("template_code", f"FB_IMP_{uuid.uuid4().hex[:4].upper()}").strip().upper()
        if any(t.get("template_code") == code for t in self.templates):
            code = f"{code}_{uuid.uuid4().hex[:4].upper()}"
        payload["template_code"] = code
        payload["id"] = f"fbt-{uuid.uuid4().hex[:8]}"
        payload["status"] = "DRAFT"
        return self.create_template(payload)

    # =========================================================================
    # PART 4, 5, 6, 7, 8 — SUB-ENTITY UPDATERS
    # =========================================================================

    def update_markups(self, template_id: str, markups: List[Dict[str, Any]]) -> Dict[str, Any]:
        tmpl = self.get_template(template_id)
        if not tmpl:
            raise ValueError(f"Template '{template_id}' not found")
        # Validate markup format
        formatted = []
        names_seen = set()
        for m in markups:
            ph = m.get("placeholder", "").strip()
            if not ph.startswith("@"):
                ph = f"@{ph}"
            name = m.get("name", ph.lstrip("@")).strip()
            if not name:
                continue
            if name in names_seen:
                raise ValueError(f"Duplicate Asset Markup name '{name}'")
            names_seen.add(name)
            formatted.append({
                "id": m.get("id") or f"mk-{uuid.uuid4().hex[:6]}",
                "name": name,
                "placeholder": ph,
                "expected_asset_type": m.get("expected_asset_type", "EQUIPMENT"),
                "description": m.get("description", ""),
                "required": bool(m.get("required", True)),
                "selection_scope": m.get("selection_scope", "EQUIPMENT"),
                "relationship": m.get("relationship", ""),
                "device_markup": m.get("device_markup", "")
            })
        tmpl["markups"] = formatted
        tmpl["updated_at"] = datetime.datetime.utcnow().isoformat() + "Z"
        self.persist()
        return tmpl

    def update_inputs(self, template_id: str, inputs: List[Dict[str, Any]]) -> Dict[str, Any]:
        tmpl = self.get_template(template_id)
        if not tmpl:
            raise ValueError(f"Template '{template_id}' not found")
        
        valid_ident = re.compile(r"^[a-zA-Z_$][a-zA-Z0-9_$]*$")
        names_seen = set()
        formatted = []
        for inp in inputs:
            var_name = inp.get("name", "").strip()
            if not valid_ident.match(var_name):
                raise ValueError(f"Input variable name '{var_name}' is not a valid JavaScript identifier.")
            if var_name in names_seen:
                raise ValueError(f"Duplicate input variable name '{var_name}'")
            names_seen.add(var_name)

            formatted.append({
                "id": inp.get("id") or f"inp-{uuid.uuid4().hex[:6]}",
                "name": var_name,
                "display_name": inp.get("display_name") or var_name,
                "description": inp.get("description", ""),
                "asset_markup": inp.get("asset_markup", "@Pump"),
                "attribute_reference": inp.get("attribute_reference", ""),
                "attribute_type": inp.get("attribute_type", "Dynamic"),
                "data_type": inp.get("data_type", "Double"),
                "uom": inp.get("uom", ""),
                "required": bool(inp.get("required", True)),
                "default_value": inp.get("default_value", 0.0),
                "quality_policy": inp.get("quality_policy", "STRICT"),
                "max_data_age_sec": int(inp.get("max_data_age_sec", 60)),
                "missing_data_policy": inp.get("missing_data_policy", "USE_DEFAULT"),
                "historical_window": inp.get("historical_window", None)
            })
        tmpl["inputs"] = formatted
        tmpl["updated_at"] = datetime.datetime.utcnow().isoformat() + "Z"
        self.persist()
        return tmpl

    def update_outputs(self, template_id: str, outputs: List[Dict[str, Any]]) -> Dict[str, Any]:
        tmpl = self.get_template(template_id)
        if not tmpl:
            raise ValueError(f"Template '{template_id}' not found")

        valid_ident = re.compile(r"^[a-zA-Z_$][a-zA-Z0-9_$]*$")
        keys_seen = set()
        formatted = []
        for out in outputs:
            k = out.get("output_key") or out.get("name", "")
            k = k.strip()
            if not valid_ident.match(k):
                raise ValueError(f"Output key '{k}' is not a valid JavaScript identifier.")
            if k in keys_seen:
                raise ValueError(f"Duplicate output key '{k}'")
            keys_seen.add(k)

            formatted.append({
                "id": out.get("id") or f"out-{uuid.uuid4().hex[:6]}",
                "name": out.get("name") or k,
                "output_key": k,
                "description": out.get("description", ""),
                "target_asset_markup": out.get("target_asset_markup", "@Pump"),
                "runtime_attribute_name": out.get("runtime_attribute_name") or out.get("name") or k,
                "data_type": out.get("data_type", "Double"),
                "uom": out.get("uom", ""),
                "decimal_places": int(out.get("decimal_places", 2)),
                "nullable": bool(out.get("nullable", True)),
                "default_value": out.get("default_value", 0.0),
                "script_result_key": out.get("script_result_key") or k,
                "persist_historian": bool(out.get("persist_historian", True)),
                "publish_event": bool(out.get("publish_event", True)),
                "quality_propagation_policy": out.get("quality_propagation_policy", "PROPAGATE_WORST")
            })
        tmpl["outputs"] = formatted
        tmpl["updated_at"] = datetime.datetime.utcnow().isoformat() + "Z"
        self.persist()
        return tmpl

    def update_code(self, template_id: str, script_code: str) -> Dict[str, Any]:
        tmpl = self.get_template(template_id)
        if not tmpl:
            raise ValueError(f"Template '{template_id}' not found")
        tmpl["script_code"] = script_code
        tmpl["updated_at"] = datetime.datetime.utcnow().isoformat() + "Z"
        self.persist()
        return tmpl

    def update_output_mappings(self, template_id: str, mappings: List[Dict[str, Any]]) -> Dict[str, Any]:
        tmpl = self.get_template(template_id)
        if not tmpl:
            raise ValueError(f"Template '{template_id}' not found")
        tmpl["output_mappings"] = mappings
        tmpl["updated_at"] = datetime.datetime.utcnow().isoformat() + "Z"
        self.persist()
        return tmpl

    # =========================================================================
    # PART 9 — VALIDATION AND PUBLICATION
    # =========================================================================

    async def validate_template(self, template_id: str) -> Dict[str, Any]:
        """
        Validates template metadata, markups, inputs, outputs, script syntax,
        and structured output mappings. Returns comprehensive error and warning report.
        """
        tmpl = self.get_template(template_id)
        if not tmpl:
            raise ValueError(f"Template '{template_id}' not found")

        errors = []
        warnings = []

        # 1. Template Metadata
        if not tmpl.get("name"):
            errors.append("Template Name is required.")
        if not tmpl.get("template_code"):
            errors.append("Template Code is required.")

        # 2. Asset Markups
        markups = tmpl.get("markups", [])
        markup_phs = set()
        for m in markups:
            ph = m.get("placeholder", "")
            if not ph:
                errors.append("Asset Markup placeholder cannot be empty.")
            elif ph in markup_phs:
                errors.append(f"Duplicate Asset Markup placeholder '{ph}'.")
            markup_phs.add(ph)

        # 3. Input Interface
        inputs = tmpl.get("inputs", [])
        input_names = set()
        valid_ident = re.compile(r"^[a-zA-Z_$][a-zA-Z0-9_$]*$")
        for inp in inputs:
            name = inp.get("name", "")
            if not valid_ident.match(name):
                errors.append(f"Input variable name '{name}' is not a valid identifier.")
            if name in input_names:
                errors.append(f"Duplicate input variable name '{name}'.")
            input_names.add(name)

            # Check markup ref
            if markups and inp.get("asset_markup") not in markup_phs:
                errors.append(f"Input '{name}' references unknown Asset Markup '{inp.get('asset_markup')}'.")

        # 4. Output Interface
        outputs = tmpl.get("outputs", [])
        output_keys = set()
        target_attr_pairs = set()
        for out in outputs:
            key = out.get("output_key", "")
            if not valid_ident.match(key):
                errors.append(f"Output key '{key}' is not a valid identifier.")
            if key in output_keys:
                errors.append(f"Duplicate output key '{key}'.")
            output_keys.add(key)

            target_mk = out.get("target_asset_markup", "")
            attr_name = out.get("runtime_attribute_name", "")
            if markups and target_mk not in markup_phs:
                errors.append(f"Output '{key}' references unknown Target Asset Markup '{target_mk}'.")

            # Check duplicate target on same asset
            pair = f"{target_mk}:{attr_name}"
            if pair in target_attr_pairs:
                errors.append(f"Duplicate output target: Multiple outputs write to Runtime Attribute '{attr_name}' on '{target_mk}'.")
            target_attr_pairs.add(pair)

            # Circular dependency check: input attribute == output attribute on same markup
            for inp in inputs:
                if inp.get("asset_markup") == target_mk and inp.get("attribute_reference") == attr_name:
                    errors.append(f"Circular attribute dependency: Input '{inp['name']}' reads from '{attr_name}' which is overwritten by output '{key}'.")

        # 5. JavaScript Syntax
        script = tmpl.get("script_code", "")
        if not script or not script.strip():
            errors.append("JavaScript formula code is required.")
        else:
            syntax_res = await validate_js_syntax(script, contract="FB_CALCULATE")
            if not syntax_res.get("valid"):
                errors.append(f"JavaScript Syntax Error: {syntax_res.get('error', 'Invalid JS')}")

        # 6. Output Mappings Completeness
        mappings = tmpl.get("output_mappings", [])
        mapped_keys = {m.get("script_result_key") or m.get("output_key") for m in mappings}
        for out in outputs:
            k = out.get("output_key")
            if k not in mapped_keys:
                warnings.append(f"Declared output '{k}' has no explicit Output Mapping record.")

        is_valid = len(errors) == 0
        return {
            "valid": is_valid,
            "errors": errors,
            "warnings": warnings,
            "summary": {
                "markup_count": len(markups),
                "input_count": len(inputs),
                "output_count": len(outputs),
                "mapping_count": len(mappings)
            }
        }

    async def test_template(
        self,
        template_id: str,
        test_inputs: Dict[str, Any],
        test_params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Executes the template JavaScript in the isolated sandbox using mock inputs."""
        tmpl = self.get_template(template_id)
        if not tmpl:
            raise ValueError(f"Template '{template_id}' not found")

        script = tmpl.get("script_code", "")
        params = test_params or {p["name"]: p.get("default_value") for p in tmpl.get("parameters", [])}

        ctx = {
            "asset": {"id": "mock-asset-01", "name": "Simulation Test Rig"},
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "parameters": params,
            "inputMetadata": {inp["name"]: inp for inp in tmpl.get("inputs", [])},
            "executionId": f"test-run-{uuid.uuid4().hex[:8]}"
        }

        # Build formatted inputs, filling defaults
        formatted_inputs = {}
        for inp in tmpl.get("inputs", []):
            name = inp["name"]
            if name in test_inputs:
                formatted_inputs[name] = test_inputs[name]
            else:
                formatted_inputs[name] = inp.get("default_value", 0.0)

        # Execute in Node.js isolated sandbox
        exec_res = await execute_js_sandbox(
            script=script,
            contract="FB_CALCULATE",
            ctx=ctx,
            inputs=formatted_inputs,
            timeout_ms=2000
        )

        # Validate schema of returned fields
        schema_validation = {"valid": False, "errors": [], "matched_outputs": []}
        if exec_res.get("success"):
            calc_result = exec_res.get("result", {})
            if isinstance(calc_result, dict):
                declared_keys = {out["output_key"]: out for out in tmpl.get("outputs", [])}
                matched = []
                schema_errors = []
                for k, v in calc_result.items():
                    if k in declared_keys:
                        matched.append({"key": k, "value": v, "schema": declared_keys[k]})
                    else:
                        schema_errors.append(f"Script returned undeclared key '{k}' which is not in template Output definitions.")
                schema_validation = {
                    "valid": len(schema_errors) == 0,
                    "errors": schema_errors,
                    "matched_outputs": matched
                }
            else:
                schema_validation["errors"].append("Script returned a non-object value (must return an object).")

        exec_res["schema_validation"] = schema_validation
        return exec_res

    async def publish_template(
        self,
        template_id: str,
        user_email: str = "engineer@yokogawa.com",
        user_role: str = "Engineer"
    ) -> Dict[str, Any]:
        """
        Validates and publishes a Block Template.
        Enforces permission guard and creates an immutable version snapshot.
        """
        tmpl = self.get_template(template_id)
        if not tmpl:
            raise ValueError(f"Template '{template_id}' not found")

        # Security check: Viewer or Operator cannot publish custom templates
        if user_role.lower() in ["viewer", "operator", "guest", "unauthorized"]:
            now_iso = datetime.datetime.utcnow().isoformat() + "Z"
            if hasattr(dm_store, "activity_logs"):
                dm_store.activity_logs.insert(0, {
                    "id": f"act-{uuid.uuid4().hex[:8]}",
                    "timestamp": now_iso,
                    "category": "SECURITY",
                    "action": f"PUBLISH_REJECTED: Unauthorized role '{user_role}' ({user_email}) attempted publication of template {tmpl.get('template_code')}",
                    "user": user_email,
                    "status": "FAILURE"
                })
                dm_store.persist_state()
            raise PermissionError(f"User role '{user_role}' is not authorized to publish Block Templates.")

        # Full validation
        val_res = await self.validate_template(template_id)
        if not val_res["valid"]:
            raise ValueError(f"Cannot publish template with validation errors: {'; '.join(val_res['errors'])}")

        now_iso = datetime.datetime.utcnow().isoformat() + "Z"
        tmpl["status"] = "PUBLISHED"
        tmpl["published_at"] = now_iso
        tmpl["published_by"] = user_email
        tmpl["updated_at"] = now_iso

        # Create immutable version snapshot
        snapshot = json.loads(json.dumps(tmpl))
        if tmpl["id"] not in self.template_versions:
            self.template_versions[tmpl["id"]] = []
        self.template_versions[tmpl["id"]].append(snapshot)

        # Audit log
        if hasattr(dm_store, "activity_logs"):
            dm_store.activity_logs.insert(0, {
                "id": f"act-{uuid.uuid4().hex[:8]}",
                "timestamp": now_iso,
                "category": "BLOCK",
                "action": f"PUBLISH_TEMPLATE: {tmpl['name']} ({tmpl['template_code']} v{tmpl['version']})",
                "user": user_email,
                "status": "SUCCESS"
            })

        self.persist()
        self.sync_to_block_registry()
        return tmpl

    def create_new_version(self, template_id: str) -> Dict[str, Any]:
        """
        Creates a new editable DRAFT version from a published template.
        Increments the major version (e.g. 1.0.0 -> 2.0.0).
        """
        tmpl = self.get_template(template_id)
        if not tmpl:
            raise ValueError(f"Template '{template_id}' not found")

        # Save snapshot of previous version if not already saved
        snapshot = json.loads(json.dumps(tmpl))
        if tmpl["id"] not in self.template_versions:
            self.template_versions[tmpl["id"]] = []
        if not any(v.get("version") == tmpl.get("version") for v in self.template_versions[tmpl["id"]]):
            self.template_versions[tmpl["id"]].append(snapshot)

        # Parse current version and increment major version
        current_ver = tmpl.get("version", "1.0.0")
        parts = current_ver.split(".")
        try:
            major = int(parts[0]) + 1
            new_version = f"{major}.0.0"
        except (ValueError, IndexError):
            new_version = "2.0.0"

        now_iso = datetime.datetime.utcnow().isoformat() + "Z"
        tmpl["version"] = new_version
        tmpl["status"] = "DRAFT"
        tmpl["updated_at"] = now_iso
        self.persist()
        return tmpl

    def get_template_versions(self, template_id: str) -> List[Dict[str, Any]]:
        """Returns immutable version snapshots of the template."""
        tmpl = self.get_template(template_id)
        if not tmpl:
            raise ValueError(f"Template '{template_id}' not found")
        return self.template_versions.get(tmpl["id"], [])

    # =========================================================================
    # PART 10 & 11 — BLOCK EXECUTION INSTANCES & EXECUTION ENGINE
    # =========================================================================

    def list_executions(self, status: Optional[str] = None, template_id: Optional[str] = None) -> List[Dict[str, Any]]:
        results = self.executions
        if status:
            results = [e for e in results if e.get("status", "").upper() == status.upper()]
        if template_id:
            results = [e for e in results if e.get("template_id") == template_id]
        return results

    def get_execution(self, execution_id: str) -> Optional[Dict[str, Any]]:
        return next((e for e in self.executions if e["id"] == execution_id), None)

    def create_execution(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Creates and provisions a new Block Execution instance from a published template version.
        Step 8: Create execution instance.
        Step 9: Map actual assets and attributes.
        Step 10: Configure trigger and execution settings.
        Step 12: Provisions Output Runtime Attributes on target physical assets.
        """
        template_ref = payload.get("template_id") or payload.get("template_code")
        tmpl = self.get_template(template_ref)
        if not tmpl:
            raise ValueError(f"Block Template '{template_ref}' not found")

        if tmpl.get("status") != "PUBLISHED":
            raise ValueError(f"Template '{tmpl['name']}' is currently in {tmpl.get('status')} status. Only PUBLISHED templates can be deployed.")

        # Immutable template snapshot pinned to this execution instance
        snapshot = json.loads(json.dumps(tmpl))
        exec_id = payload.get("id") or f"fbe-{uuid.uuid4().hex[:8]}"
        exec_name = payload.get("name") or f"{tmpl['name']} Execution"

        asset_bindings = payload.get("asset_bindings", {})
        device_bindings = payload.get("device_bindings", {})
        input_bindings = payload.get("input_bindings", {})
        trigger_config = payload.get("trigger_config", {
            "type": "ATTRIBUTE_UPDATED",
            "trigger_attribute": tmpl.get("inputs", [{}])[0].get("name", "flow"),
            "debounce_ms": 200,
            "freshness_sec": 30
        })

        # Validate required Asset Markups are mapped to existing assets
        for mk in tmpl.get("markups", []):
            ph = mk.get("placeholder")
            if mk.get("required", True) and ph not in asset_bindings:
                raise ValueError(f"Required Asset Markup placeholder '{ph}' ({mk.get('name')}) is not mapped to an asset.")
            
            # Verify bound asset exists in dm_store
            bound_aid = asset_bindings.get(ph)
            if bound_aid:
                real_asset = next((a for a in getattr(dm_store, "assets", []) if a["id"] == bound_aid), None)
                if not real_asset:
                    raise ValueError(f"Bound asset ID '{bound_aid}' for markup '{ph}' does not exist in plant hierarchy.")

        # Provision Output Runtime Attributes on actual target assets (Step 12 & Part 6)
        output_bindings = self._provision_runtime_attributes(
            instance_id=exec_id,
            template=snapshot,
            asset_bindings=asset_bindings,
            explicit_mappings=payload.get("output_bindings", [])
        )

        now_iso = datetime.datetime.utcnow().isoformat() + "Z"
        new_execution = {
            "id": exec_id,
            "name": exec_name,
            "template_id": tmpl["id"],
            "template_code": tmpl.get("template_code"),
            "template_version": tmpl.get("version", "1.0.0"),
            "template_snapshot": snapshot,
            "status": payload.get("status", "ACTIVE"),
            "asset_bindings": asset_bindings,
            "device_bindings": device_bindings,
            "input_bindings": input_bindings,
            "output_bindings": output_bindings,
            "trigger_config": trigger_config,
            "last_run_at": None,
            "last_execution_ms": 0.0,
            "last_output_data": {},
            "last_status": "NEVER_RUN",
            "execution_count": 0,
            "error_count": 0,
            "created_at": now_iso,
            "updated_at": now_iso
        }

        self.executions.append(new_execution)
        self.persist()

        # Audit log
        if hasattr(dm_store, "activity_logs"):
            dm_store.activity_logs.insert(0, {
                "id": f"act-{uuid.uuid4().hex[:8]}",
                "timestamp": now_iso,
                "category": "BLOCK",
                "action": f"DEPLOY_EXECUTION: Created '{exec_name}' bound to assets {list(asset_bindings.values())}",
                "user": "engineer@yokogawa.com",
                "status": "SUCCESS"
            })
            dm_store.persist_state()

        return new_execution

    def _provision_runtime_attributes(
        self,
        instance_id: str,
        template: Dict[str, Any],
        asset_bindings: Dict[str, str],
        explicit_mappings: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Resolves or creates Runtime Attributes on actual physical assets for each template output.
        Enforces Part 6:
        - Output attributes must be registered as 'Runtime'
        - source registered as 'FUNCTION_BLOCK'
        - expression disabled ('', use_expression=False) to prevent overwrite by expression engine
        - Does NOT create duplicate attributes if a matching definition already exists.
        """
        output_bindings = []
        now_iso = datetime.datetime.utcnow().isoformat() + "Z"

        for out in template.get("outputs", []):
            target_markup = out.get("target_asset_markup", "@Pump")
            target_asset_id = asset_bindings.get(target_markup)
            if not target_asset_id:
                continue

            target_asset = next((a for a in getattr(dm_store, "assets", []) if a["id"] == target_asset_id), None)
            if not target_asset:
                continue

            runtime_attr_name = out.get("runtime_attribute_name") or out.get("name")
            data_type = out.get("data_type", "Double")
            uom = out.get("uom", "")
            out_key = out.get("output_key")

            # Check if explicit mapping was provided for this output
            explicit = next((em for em in explicit_mappings if em.get("output_key") == out_key), None)
            if explicit and explicit.get("attribute_id"):
                found_attr = next((a for a in target_asset.get("attributes", []) if a["id"] == explicit["attribute_id"]), None)
            else:
                # Look for matching attribute by name
                found_attr = next((a for a in target_asset.get("attributes", []) if a.get("name") == runtime_attr_name), None)

            if found_attr:
                # Reuse and secure existing attribute: disable conflicting expression and bind source
                found_attr["type"] = "Runtime"
                found_attr["source"] = "FUNCTION_BLOCK"
                found_attr["function_block_id"] = instance_id
                found_attr["function_block_output"] = out_key
                found_attr["use_expression"] = False
                found_attr["expression"] = ""
                attr_id = found_attr["id"]
            else:
                # Create brand new Runtime Attribute
                attr_id = f"attr-{uuid.uuid4().hex[:8]}"
                new_attr = {
                    "id": attr_id,
                    "name": runtime_attr_name,
                    "display_name": out.get("description") or runtime_attr_name,
                    "type": "Runtime",
                    "data_type": data_type,
                    "uom": uom,
                    "value": str(out.get("default_value", 0.0)),
                    "quality": "Good",
                    "timestamp": now_iso,
                    "source": "FUNCTION_BLOCK",
                    "function_block_id": instance_id,
                    "function_block_output": out_key,
                    "use_expression": False,
                    "expression": ""
                }
                target_asset.setdefault("attributes", []).append(new_attr)

            output_bindings.append({
                "output_key": out_key,
                "script_result_key": out.get("script_result_key", out_key),
                "asset_markup": target_markup,
                "asset_id": target_asset_id,
                "asset_name": target_asset.get("name"),
                "runtime_attribute_name": runtime_attr_name,
                "runtime_attribute_id": attr_id,
                "data_type": data_type,
                "uom": uom,
                "persist_historian": out.get("persist_historian", True),
                "publish_event": out.get("publish_event", True)
            })

        dm_store.persist_state()
        return output_bindings

    def update_execution(self, execution_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Updates an existing Block Execution instance and re-provisions output bindings."""
        ex = self.get_execution(execution_id)
        if not ex:
            raise ValueError(f"Block Execution '{execution_id}' not found")

        if "name" in payload:
            ex["name"] = payload["name"]
        if "status" in payload:
            ex["status"] = payload["status"]
        if "asset_bindings" in payload:
            ex["asset_bindings"] = payload["asset_bindings"]
        if "device_bindings" in payload:
            ex["device_bindings"] = payload["device_bindings"]
        if "input_bindings" in payload:
            ex["input_bindings"] = payload["input_bindings"]
        if "trigger_config" in payload:
            ex["trigger_config"] = payload["trigger_config"]

        if "output_bindings" in payload or "asset_bindings" in payload:
            snapshot = ex.get("template_snapshot") or {}
            re_provisioned = self._provision_runtime_attributes(
                instance_id=execution_id,
                template=snapshot,
                asset_bindings=ex.get("asset_bindings", {}),
                explicit_mappings=payload.get("output_bindings", ex.get("output_bindings", []))
            )
            ex["output_bindings"] = re_provisioned

        ex["updated_at"] = datetime.datetime.utcnow().isoformat() + "Z"
        self.persist()
        return ex

    def link_attribute_to_execution(
        self,
        asset_id: str,
        attr_id: str,
        attr_name: str,
        execution_id: str,
        output_key: str
    ):
        """Bidirectionally links an asset attribute created/edited in Asset View to an execution output."""
        ex = self.get_execution(execution_id)
        if not ex:
            return

        existing_binding = next((ob for ob in ex.get("output_bindings", []) if ob.get("output_key") == output_key), None)
        if existing_binding:
            existing_binding["asset_id"] = asset_id
            existing_binding["runtime_attribute_id"] = attr_id
            existing_binding["runtime_attribute_name"] = attr_name
        else:
            snapshot = ex.get("template_snapshot", {})
            out_def = next((o for o in snapshot.get("outputs", []) if o.get("output_key") == output_key), {})
            ex.setdefault("output_bindings", []).append({
                "output_key": output_key,
                "script_result_key": out_def.get("script_result_key", output_key),
                "asset_markup": out_def.get("target_asset_markup", "@Asset"),
                "asset_id": asset_id,
                "runtime_attribute_id": attr_id,
                "runtime_attribute_name": attr_name,
                "data_type": out_def.get("data_type", "Double"),
                "uom": out_def.get("uom", ""),
                "persist_historian": out_def.get("persist_historian", True),
                "publish_event": out_def.get("publish_event", True)
            })
        self.persist()

    def activate_execution(self, execution_id: str) -> Dict[str, Any]:
        ex = self.get_execution(execution_id)
        if not ex:
            raise ValueError(f"Execution '{execution_id}' not found")
        ex["status"] = "ACTIVE"
        ex["updated_at"] = datetime.datetime.utcnow().isoformat() + "Z"
        self.persist()
        return ex

    def pause_execution(self, execution_id: str) -> Dict[str, Any]:
        ex = self.get_execution(execution_id)
        if not ex:
            raise ValueError(f"Execution '{execution_id}' not found")
        ex["status"] = "PAUSED"
        ex["updated_at"] = datetime.datetime.utcnow().isoformat() + "Z"
        self.persist()
        return ex

    def delete_execution(self, execution_id: str) -> Dict[str, Any]:
        ex = self.get_execution(execution_id)
        if not ex:
            raise ValueError(f"Execution '{execution_id}' not found")
        self.executions = [e for e in self.executions if e["id"] != execution_id]
        self.persist()
        return {"success": True, "message": f"Execution '{execution_id}' removed."}

    # =========================================================================
    # PART 11 — FUNCTION BLOCK EXECUTION RUNNER
    # =========================================================================

    async def run_execution(
        self,
        execution_id: str,
        manual_inputs: Optional[Dict[str, Any]] = None,
        causation_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes a deployed Block Execution instance:
        1. Resolves immutable template snapshot and bound assets.
        2. Resolves input attributes and validates freshness/quality.
        3. Executes JavaScript in isolated Node.js sandbox.
        4. Validates returned results.
        5. Writes outputs into mapped Runtime Attributes.
        6. Persists to historian and records execution history trace.
        """
        ex = self.get_execution(execution_id)
        if not ex:
            return {"success": False, "error": f"Execution instance '{execution_id}' not found"}

        # Loop protection
        c_id = causation_id or f"caus-{uuid.uuid4().hex[:8]}"
        self.causation_tracker[c_id] = self.causation_tracker.get(c_id, 0) + 1
        if self.causation_tracker[c_id] > 5:
            return {
                "success": False,
                "error": "Execution aborted: Circular trigger cascade depth exceeded (>5)",
                "loop_detected": True
            }

        snapshot = ex.get("template_snapshot") or {}
        inputs_schema = snapshot.get("inputs", [])
        asset_bindings = ex.get("asset_bindings", {})
        input_bindings = ex.get("input_bindings", {})

        # Step 4 & 5: Resolve input values and validate quality
        resolved_inputs = {}
        input_qualities = {}
        for inp in inputs_schema:
            var_name = inp["name"]
            
            # Manual override takes precedence for testing
            if manual_inputs and var_name in manual_inputs:
                resolved_inputs[var_name] = manual_inputs[var_name]
                input_qualities[var_name] = "Good"
                continue

            # Read from asset attribute
            binding = input_bindings.get(var_name)
            val = None
            quality = "Good"
            
            if binding:
                b_aid = binding.get("asset_id") or asset_bindings.get(inp.get("asset_markup"))
                target_asset = next((a for a in getattr(dm_store, "assets", []) if a["id"] == b_aid), None)
                if target_asset:
                    attr_ref = binding.get("attribute_name") or binding.get("attribute_id") or inp.get("attribute_reference")
                    attr = next((
                        a for a in target_asset.get("attributes", [])
                        if a.get("id") == attr_ref or a.get("name") == attr_ref
                    ), None)
                    if attr:
                        raw_v = attr.get("value")
                        quality = attr.get("quality", "Good")
                        try:
                            dt = inp.get("data_type", "Double")
                            if dt in ["Double", "Float"]:
                                val = float(raw_v)
                            elif dt in ["Int", "Integer"]:
                                val = int(float(raw_v))
                            elif dt in ["Boolean", "Bool"]:
                                val = str(raw_v).strip().lower() in ["true", "1", "yes"]
                            else:
                                val = str(raw_v)
                        except (ValueError, TypeError):
                            val = None

            # Handle quality and missing data policy
            if quality.lower() != "good" and inp.get("quality_policy") == "STRICT":
                val = None  # Force missing value policy

            if val is None:
                policy = inp.get("missing_data_policy", "USE_DEFAULT")
                if policy == "FAIL":
                    ex["last_status"] = "ERROR"
                    ex["error_count"] = ex.get("error_count", 0) + 1
                    self.persist()
                    return {"success": False, "error": f"Input '{var_name}' data is missing or bad quality (Policy: FAIL)"}
                val = inp.get("default_value", 0.0)

            resolved_inputs[var_name] = val
            input_qualities[var_name] = quality

        # Step 6 & 7: Execute JavaScript in sandbox
        script = snapshot.get("script_code", "")
        ctx = {
            "executionId": ex["id"],
            "template": {"id": snapshot.get("id"), "code": snapshot.get("template_code")},
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "parameters": {p["name"]: p.get("default_value") for p in snapshot.get("parameters", [])}
        }

        exec_res = await execute_js_sandbox(
            script=script,
            contract="FB_CALCULATE",
            ctx=ctx,
            inputs=resolved_inputs,
            timeout_ms=2500
        )

        now_iso = datetime.datetime.utcnow().isoformat() + "Z"
        ex["last_run_at"] = now_iso
        ex["execution_count"] = ex.get("execution_count", 0) + 1

        if not exec_res.get("success"):
            ex["last_status"] = "ERROR"
            ex["error_count"] = ex.get("error_count", 0) + 1
            self.persist()
            return {
                "success": False,
                "error": exec_res.get("error", "JS execution failed"),
                "logs": exec_res.get("logs", []),
                "duration_ms": exec_res.get("duration_ms", 0.0)
            }

        calc_result = exec_res.get("result", {})
        if not isinstance(calc_result, dict):
            ex["last_status"] = "ERROR"
            self.persist()
            return {"success": False, "error": "Calculation script returned non-object result"}

        # Step 8, 9, 10, 11: Validate fields and write to Output Runtime Attributes
        runtime_writes = []
        output_bindings = ex.get("output_bindings", [])
        declared_outputs = {out["output_key"]: out for out in snapshot.get("outputs", [])}

        for ob in output_bindings:
            out_key = ob["output_key"]
            script_key = ob.get("script_result_key", out_key)

            if script_key in calc_result:
                val = calc_result[script_key]
                target_aid = ob["asset_id"]
                attr_id = ob["runtime_attribute_id"]

                target_asset = next((a for a in getattr(dm_store, "assets", []) if a["id"] == target_aid), None)
                if target_asset:
                    attr = next((a for a in target_asset.get("attributes", []) if a.get("id") == attr_id), None)
                    if not attr and ob.get("runtime_attribute_name"):
                        attr = next((a for a in target_asset.get("attributes", []) if a.get("name") == ob.get("runtime_attribute_name")), None)
                    if attr:
                        # Update Runtime Attribute
                        attr["value"] = str(val) if val is not None else ""
                        attr["timestamp"] = now_iso
                        attr["quality"] = "Good"

                        runtime_writes.append({
                            "asset_id": target_aid,
                            "asset_name": target_asset.get("name"),
                            "attribute_id": attr_id,
                            "attribute_name": attr.get("name"),
                            "value": val,
                            "uom": ob.get("uom", "")
                        })

                        # Step 12: Persist historian if configured
                        if ob.get("persist_historian") and val is not None:
                            try:
                                num_val = float(val) if isinstance(val, (int, float, bool)) else None
                                if num_val is not None:
                                    pt = {
                                        "tag_name": f"{target_asset.get('name')}.{attr.get('name')}",
                                        "timestamp": now_iso,
                                        "value": num_val,
                                        "quality": "GOOD"
                                    }
                                    if hasattr(dm_store, "historical_points"):
                                        dm_store.historical_points.append(pt)
                            except Exception:
                                pass

        # Record trace and update execution status
        ex["last_status"] = "SUCCESS"
        ex["last_execution_ms"] = exec_res.get("duration_ms", 0.0)
        ex["last_output_data"] = calc_result
        self.persist()

        trace = {
            "execution_id": f"exec-{uuid.uuid4().hex[:8]}",
            "instance_id": ex["id"],
            "instance_name": ex["name"],
            "template_code": snapshot.get("template_code"),
            "timestamp": now_iso,
            "inputs": resolved_inputs,
            "result": calc_result,
            "runtime_writes": runtime_writes,
            "duration_ms": ex["last_execution_ms"],
            "status": "SUCCESS"
        }
        self.execution_history.insert(0, trace)
        if len(self.execution_history) > 300:
            self.execution_history = self.execution_history[:300]
        self.persist()

        return {
            "success": True,
            "result": calc_result,
            "runtime_writes": runtime_writes,
            "duration_ms": ex["last_execution_ms"],
            "timestamp": now_iso,
            "logs": exec_res.get("logs", [])
        }

    # =========================================================================
    # PART 11 — ATTRIBUTE-TRIGGERED EXECUTION
    # =========================================================================

    async def notify_attribute_updated(self, asset_id: str, attribute_name: str, new_value: Any):
        """
        Triggered when an Asset Attribute receives new telemetry or is updated.
        Finds active executions waiting on this trigger and evaluates them.
        """
        for ex in self.executions:
            if ex.get("status") != "ACTIVE":
                continue

            trig = ex.get("trigger_config", {})
            trig_type = trig.get("type", "ATTRIBUTE_UPDATED")
            if trig_type not in ["ATTRIBUTE_UPDATED", "TRIGGER_ATTRIBUTE_UPDATED"]:
                continue

            # Check if this asset and attribute match one of the inputs
            snapshot = ex.get("template_snapshot", {})
            input_bindings = ex.get("input_bindings", {})
            asset_bindings = ex.get("asset_bindings", {})

            matched = False
            for inp in snapshot.get("inputs", []):
                var_name = inp["name"]
                binding = input_bindings.get(var_name, {})
                b_aid = binding.get("asset_id") or asset_bindings.get(inp.get("asset_markup"))
                b_aname = binding.get("attribute_name") or inp.get("attribute_reference")

                if b_aid == asset_id and (b_aname == attribute_name or attribute_name.endswith(b_aname)):
                    if trig_type == "TRIGGER_ATTRIBUTE_UPDATED":
                        # Only trigger if this is the designated trigger attribute
                        designated = trig.get("trigger_attribute")
                        if designated in [var_name, b_aname, attribute_name]:
                            matched = True
                            break
                    else:
                        matched = True
                        break

            if matched:
                try:
                    await self.run_execution(ex["id"])
                except Exception as e:
                    logger.error(f"Error auto-executing FB '{ex['id']}': {e}")


fb_template_service = FBTemplateService()
