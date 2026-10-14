"""
Custom Function Block V3 Management & Execution Service
Supports user-defined Function Blocks with dynamic inputs/outputs,
versioning, sandboxed JavaScript execution, and KPI persistence.
"""
import uuid
import datetime
import json
import logging
from typing import Dict, List, Any, Optional

from app.services.js_executor import execute_js_sandbox, validate_js_syntax
from app.services.fb_block_registry import register_block, BLOCK_REGISTRY
from app.api.dm_service import dm_store

logger = logging.getLogger("ydash.custom_fb")

# Seed custom block: Pump Performance KPI
DEFAULT_PUMP_KPI_SCRIPT = """function calculate(ctx, inputs) {
  const { flow, power, running } = inputs;
  const flowValid = Number.isFinite(flow) && flow > 0;
  const powerValid = Number.isFinite(power) && power >= 0;
  const isRunning = running === true || running === 1;
  const validCalculation = flowValid && powerValid;
  const specificEnergy = validCalculation ? Number((power / flow).toFixed(4)) : null;

  return {
    specificEnergy,
    isRunning,
    validCalculation
  };
}"""

SEED_CUSTOM_BLOCKS = [
  {
    "id": "cfb-pump-kpi-01",
    "name": "Pump Performance KPI Calculator",
    "display_name": "Pump Performance KPI",
    "description": "Calculates Specific Energy Consumption (kWh/m3), operational running state, and valid calculation flags.",
    "category": "Custom",
    "type": "custom.pump_performance_kpi",
    "icon": "Zap",
    "color": "#10b981",
    "version": "1.0.0",
    "author": "Chief Automation Architect",
    "tags": ["PUMP", "KPI", "SPECIFIC_ENERGY", "SUSTAINABILITY"],
    "execution_type": "JavaScript",
    "stateful": False,
    "status": "PUBLISHED",
    "inputs": [
      {
        "id": "inp-1",
        "name": "flow",
        "data_type": "number",
        "description": "Volumetric Flow Rate",
        "required": True,
        "default_value": 20.0,
        "unit": "m3/h",
        "source_mapping": "ASSET_ATTRIBUTE",
        "quality_policy": "STRICT",
        "missing_value_policy": "USE_DEFAULT"
      },
      {
        "id": "inp-2",
        "name": "power",
        "data_type": "number",
        "description": "Electric Active Power",
        "required": True,
        "default_value": 15.0,
        "unit": "kW",
        "source_mapping": "ASSET_ATTRIBUTE",
        "quality_policy": "STRICT",
        "missing_value_policy": "USE_DEFAULT"
      },
      {
        "id": "inp-3",
        "name": "running",
        "data_type": "boolean",
        "description": "Pump Run Permissive Signal",
        "required": True,
        "default_value": True,
        "unit": "bool",
        "source_mapping": "ASSET_ATTRIBUTE",
        "quality_policy": "ALLOW_UNCERTAIN",
        "missing_value_policy": "USE_DEFAULT"
      }
    ],
    "outputs": [
      {
        "id": "out-1",
        "name": "specificEnergy",
        "data_type": "number",
        "unit": "kWh/m3",
        "description": "Specific Energy Consumption per Unit Volume",
        "required": True,
        "destination_type": "RUNTIME_ATTRIBUTE",
        "destination_attribute": "attr-pump-sec",
        "persist_historian": True,
        "publish_event": True
      },
      {
        "id": "out-2",
        "name": "isRunning",
        "data_type": "boolean",
        "unit": "bool",
        "description": "Validated Running State",
        "required": True,
        "destination_type": "CALCULATED_KPI",
        "destination_attribute": "attr-pump-state",
        "persist_historian": True,
        "publish_event": False
      },
      {
        "id": "out-3",
        "name": "validCalculation",
        "data_type": "boolean",
        "unit": "bool",
        "description": "True if both Flow and Power are valid and positive",
        "required": True,
        "destination_type": "CALCULATED_KPI",
        "destination_attribute": "",
        "persist_historian": False,
        "publish_event": False
      }
    ],
    "parameters": [
      {
        "name": "ratedHead",
        "label": "Rated Head",
        "control_type": "number",
        "default_value": 45.0,
        "unit": "m"
      },
      {
        "name": "fluidDensity",
        "label": "Fluid Density",
        "control_type": "number",
        "default_value": 1000.0,
        "unit": "kg/m3"
      }
    ],
    "script_code": DEFAULT_PUMP_KPI_SCRIPT,
    "bindings": {
      "asset_id": "ast-equip-pump101",
      "flow": {"asset_id": "ast-equip-pump101", "attribute_id": "attr-pump-flow"},
      "power": {"asset_id": "ast-equip-pump101", "attribute_id": "attr-pump-power"},
      "running": {"asset_id": "ast-equip-pump101", "attribute_id": "attr-pump-running"}
    },
    "trigger_config": {
      "type": "ATTRIBUTE_UPDATED",
      "trigger_attribute": "flow",
      "debounce_ms": 200,
      "freshness_sec": 30
    },
    "created_at": "2026-10-10T08:00:00Z",
    "updated_at": "2026-10-10T08:00:00Z"
  }
]

class CustomFunctionBlockService:
    def __init__(self):
        self.custom_blocks: List[Dict[str, Any]] = []
        self.block_versions: Dict[str, List[Dict[str, Any]]] = {}
        self.execution_history: List[Dict[str, Any]] = []
        self.causation_tracker: Dict[str, int] = {}
        self._load_state()

    def _load_state(self):
        # Load from dm_store if available
        custom_data = getattr(dm_store, "custom_function_blocks", None)
        if not custom_data:
            self.custom_blocks = [dict(b) for b in SEED_CUSTOM_BLOCKS]
            dm_store.custom_function_blocks = self.custom_blocks
        else:
            self.custom_blocks = custom_data

        versions_data = getattr(dm_store, "custom_function_block_versions", None)
        if not versions_data:
            self.block_versions = {}
            for b in self.custom_blocks:
                self.block_versions[b["id"]] = [dict(b)]
            dm_store.custom_function_block_versions = self.block_versions
        else:
            self.block_versions = versions_data

        # Sync published blocks into BLOCK_REGISTRY
        self.sync_to_block_registry()

    def persist(self):
        dm_store.custom_function_blocks = self.custom_blocks
        dm_store.custom_function_block_versions = self.block_versions
        dm_store.persist_state()

    def sync_to_block_registry(self):
        """Registers all custom function blocks into BLOCK_REGISTRY."""
        for b in self.custom_blocks:
            b_type = b.get("type") or f"custom.{b['id']}"
            reg_def = {
                "type": b_type,
                "version": b.get("version", "1.0.0"),
                "category": b.get("category", "Custom"),
                "status": b.get("status", "DRAFT"),
                "display_name": b.get("display_name") or b.get("name"),
                "description": b.get("description", ""),
                "inputs": [
                    {"name": inp["name"], "type": inp["data_type"], "description": inp.get("description", "")}
                    for inp in b.get("inputs", [])
                ],
                "outputs": [
                    {"name": out["name"], "type": out["data_type"], "description": out.get("description", "")}
                    for out in b.get("outputs", [])
                ],
                "config_schema": {
                    p["name"]: {
                        "type": p.get("control_type", "number"),
                        "label": p.get("label", p["name"]),
                        "default": p.get("default_value")
                    }
                    for p in b.get("parameters", [])
                },
                "stateful": b.get("stateful", False),
                "is_custom": True,
                "custom_id": b["id"],
                "script_code": b.get("script_code", "")
            }
            register_block(reg_def)

    def list_blocks(self) -> List[Dict[str, Any]]:
        return self.custom_blocks

    def get_block(self, block_id: str) -> Optional[Dict[str, Any]]:
        return next((b for b in self.custom_blocks if b["id"] == block_id), None)

    def save_block(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Creates or updates a custom function block definition."""
        b_id = data.get("id") or f"cfb-{uuid.uuid4().hex[:8]}"
        now = datetime.datetime.utcnow().isoformat() + "Z"

        existing = next((b for b in self.custom_blocks if b["id"] == b_id), None)
        if existing:
            # Updating existing block
            existing.update(data)
            existing["updated_at"] = now
            saved = existing
        else:
            # Creating new block
            new_block = {
                "id": b_id,
                "name": data.get("name", "New Custom Block"),
                "display_name": data.get("display_name", data.get("name", "New Custom Block")),
                "description": data.get("description", ""),
                "category": data.get("category", "Custom"),
                "type": data.get("type", f"custom.{data.get('name', 'block').lower().replace(' ', '_')}"),
                "icon": data.get("icon", "Cpu"),
                "color": data.get("color", "#06b6d4"),
                "version": data.get("version", "1.0.0"),
                "author": data.get("author", "Engineer"),
                "tags": data.get("tags", []),
                "execution_type": "JavaScript",
                "stateful": data.get("stateful", False),
                "status": data.get("status", "DRAFT"),
                "inputs": data.get("inputs", []),
                "outputs": data.get("outputs", []),
                "parameters": data.get("parameters", []),
                "script_code": data.get("script_code", "function calculate(ctx, inputs) {\n  return {};\n}"),
                "bindings": data.get("bindings", {}),
                "trigger_config": data.get("trigger_config", {"type": "ATTRIBUTE_UPDATED"}),
                "created_at": now,
                "updated_at": now
            }
            self.custom_blocks.append(new_block)
            saved = new_block

        self.persist()
        self.sync_to_block_registry()
        return saved

    def publish_block(self, block_id: str, author: str = "engineer@yokogawa.com") -> Dict[str, Any]:
        """Publishes a custom function block, creating an immutable version snapshot."""
        block = self.get_block(block_id)
        if not block:
            raise ValueError(f"Custom function block '{block_id}' not found")

        # Semantic version increment if not already at new draft version
        curr_ver = block.get("version", "1.0.0")
        parts = curr_ver.split(".")
        try:
            patch = int(parts[-1]) + 1
            new_ver = f"{parts[0]}.{parts[1]}.{patch}"
        except Exception:
            new_ver = f"{curr_ver}.1"

        block["version"] = new_ver
        block["status"] = "PUBLISHED"
        block["updated_at"] = datetime.datetime.utcnow().isoformat() + "Z"
        block["published_by"] = author

        # Record version snapshot
        snapshot = dict(block)
        if block_id not in self.block_versions:
            self.block_versions[block_id] = []
        self.block_versions[block_id].append(snapshot)

        # Log audit entry
        if hasattr(dm_store, "activity_logs"):
            dm_store.activity_logs.insert(0, {
                "id": f"act-{uuid.uuid4().hex[:8]}",
                "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
                "category": "BLOCK",
                "action": f"PUBLISH_CUSTOM_BLOCK: {block.get('name')} (v{new_ver})",
                "user": author,
                "status": "SUCCESS"
            })

        self.persist()
        self.sync_to_block_registry()
        return block

    async def test_block(
        self,
        block_or_id: Any,
        test_inputs: Dict[str, Any],
        test_params: Optional[Dict[str, Any]] = None,
        asset_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Simulates block execution using the isolated Node.js sandbox."""
        if isinstance(block_or_id, str):
            block = self.get_block(block_or_id)
            if not block:
                return {"success": False, "error": f"Block '{block_or_id}' not found"}
        else:
            block = block_or_id

        script = block.get("script_code", "")
        params = test_params if test_params is not None else {
            p["name"]: p.get("default_value") for p in block.get("parameters", [])
        }

        ctx = {
            "asset": asset_context or {"id": "ast-test-01", "name": "Simulation Asset"},
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "parameters": params,
            "inputMetadata": {inp["name"]: inp for inp in block.get("inputs", [])},
            "executionId": f"test-exec-{uuid.uuid4().hex[:8]}"
        }

        # Format inputs, enforcing default values for missing fields
        formatted_inputs = {}
        for inp in block.get("inputs", []):
            name = inp["name"]
            if name in test_inputs:
                formatted_inputs[name] = test_inputs[name]
            else:
                formatted_inputs[name] = inp.get("default_value", 0.0)

        # Execute in sandbox
        result = await execute_js_sandbox(
            script=script,
            contract="FB_CALCULATE",
            ctx=ctx,
            inputs=formatted_inputs,
            timeout_ms=2000
        )

        # Validate against output schema
        if result.get("success"):
            schema_validation = self._validate_outputs(result.get("result", {}), block.get("outputs", []))
            result["schema_validation"] = schema_validation
            result["output_schema_valid"] = schema_validation["valid"]

        return result

    def _validate_outputs(self, result_obj: Any, outputs_schema: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Validates calculation results against configured output schema."""
        if not isinstance(result_obj, dict):
            return {"valid": False, "errors": ["Result returned from calculate() is not an object"]}

        errors = []
        valid_fields = {}
        for out in outputs_schema:
            name = out["name"]
            req = out.get("required", False)
            dt = out.get("data_type", "number")

            if name not in result_obj:
                if req:
                    errors.append(f"Required output port '{name}' missing in calculation result")
            else:
                val = result_obj[name]
                valid_fields[name] = {"value": val, "unit": out.get("unit", ""), "data_type": dt}

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "fields": valid_fields
        }

    async def execute_block_live(
        self,
        block_id: str,
        inputs: Dict[str, Any],
        asset_id: Optional[str] = None,
        persist: bool = True,
        causation_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes an active published Custom Function Block, validates outputs,
        and optionally persists results to target Asset Runtime Attributes.
        """
        block = self.get_block(block_id)
        if not block:
            return {"success": False, "error": f"Block '{block_id}' not found"}

        # Prevent recursive loops
        c_id = causation_id or f"caus-{uuid.uuid4().hex[:8]}"
        self.causation_tracker[c_id] = self.causation_tracker.get(c_id, 0) + 1
        if self.causation_tracker[c_id] > 5:
            logger.warning(f"Loop detected for causation_id '{c_id}'. Aborting recursive execution.")
            return {
                "success": False,
                "error": "Execution aborted: circular dependency or cascade depth exceeded (>5)",
                "loop_detected": True
            }

        # Resolve asset context
        target_asset = None
        target_asset_id = asset_id or block.get("bindings", {}).get("asset_id")
        if target_asset_id:
            target_asset = next((a for a in dm_store.assets if a["id"] == target_asset_id), None)

        test_res = await self.test_block(
            block,
            test_inputs=inputs,
            asset_context=target_asset
        )

        if not test_res.get("success"):
            return test_res

        calc_result = test_res.get("result", {})
        runtime_writes = []

        # Persist to asset runtime attributes if enabled
        if persist and isinstance(calc_result, dict):
            for out in block.get("outputs", []):
                name = out["name"]
                if name in calc_result:
                    val = calc_result[name]
                    dest_attr_id = out.get("destination_attribute")
                    dest_type = out.get("destination_type", "RUNTIME_ATTRIBUTE")

                    if dest_type in ["RUNTIME_ATTRIBUTE", "CALCULATED_KPI"] and target_asset:
                        # Find matching attribute in asset or register new attribute
                        found_attr = None
                        for attr in target_asset.get("attributes", []):
                            if attr.get("id") == dest_attr_id or attr.get("name") == name or attr.get("name") == dest_attr_id:
                                found_attr = attr
                                break
                        
                        if not found_attr:
                            new_attr_id = dest_attr_id if (dest_attr_id and dest_attr_id.startswith("attr-")) else f"attr-{uuid.uuid4().hex[:8]}"
                            found_attr = {
                                "id": new_attr_id,
                                "name": name,
                                "display_name": out.get("description") or name,
                                "data_type": out.get("data_type", "Float"),
                                "uom": out.get("unit", ""),
                                "category": "CALCULATED" if dest_type == "CALCULATED_KPI" else "RUNTIME",
                                "value": str(val) if val is not None else "0.0",
                                "quality": "GOOD",
                                "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
                            }
                            if "attributes" not in target_asset:
                                target_asset["attributes"] = []
                            target_asset["attributes"].append(found_attr)
                        else:
                            found_attr["value"] = str(val) if val is not None else "0.0"
                            found_attr["timestamp"] = datetime.datetime.utcnow().isoformat() + "Z"
                            found_attr["quality"] = "GOOD"

                        runtime_writes.append({
                            "asset_id": target_asset["id"],
                            "attribute_id": found_attr["id"],
                            "attribute_name": found_attr.get("name"),
                            "value": val,
                            "unit": out.get("unit", "")
                        })

                        # Add to historical points if configured
                        if out.get("persist_historian", False) and val is not None:
                            try:
                                num_val = float(val) if isinstance(val, (int, float, bool)) else 0.0
                                pt = {
                                    "tag_name": f"{target_asset.get('name', 'Asset')}.{found_attr.get('name', name)}",
                                    "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
                                    "value": num_val,
                                    "quality": "GOOD"
                                }
                                if hasattr(dm_store, "historical_points"):
                                    dm_store.historical_points.append(pt)
                            except Exception:
                                pass

            if runtime_writes:
                dm_store.persist_state()

        # Record execution trace
        trace_record = {
            "execution_id": f"exec-{uuid.uuid4().hex[:8]}",
            "block_id": block_id,
            "block_name": block.get("name"),
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "inputs": inputs,
            "result": calc_result,
            "runtime_writes": runtime_writes,
            "duration_ms": test_res.get("duration_ms", 0.0),
            "causation_id": c_id
        }
        self.execution_history.insert(0, trace_record)
        if len(self.execution_history) > 200:
            self.execution_history.pop()

        return {
            "success": True,
            "result": calc_result,
            "runtime_writes": runtime_writes,
            "duration_ms": test_res.get("duration_ms", 0.0),
            "execution_id": trace_record["execution_id"],
            "logs": test_res.get("logs", [])
        }

    async def execute_on_attribute_change(self, asset_id: str, attr_name: str, new_value: Any, causation_id: Optional[str] = None):
        """
        Scans all active custom blocks. If a block is bound to this asset/attribute,
        re-evaluates automatically!
        """
        for b in self.custom_blocks:
            if b.get("status") != "PUBLISHED":
                continue

            bindings = b.get("bindings", {})
            b_asset_id = bindings.get("asset_id")
            if b_asset_id != asset_id:
                continue

            # Check if this attribute is mapped to any input
            inputs_payload = {}
            target_asset = next((a for a in dm_store.assets if a["id"] == asset_id), None)
            if not target_asset:
                continue

            for inp in b.get("inputs", []):
                inp_name = inp["name"]
                mapping = bindings.get(inp_name, {})
                mapped_attr = mapping.get("attribute_id") if isinstance(mapping, dict) else mapping

                if mapped_attr == attr_name:
                    inputs_payload[inp_name] = new_value
                else:
                    # Resolve other inputs from asset attributes
                    found_val = inp.get("default_value", 0.0)
                    for a_attr in target_asset.get("attributes", []):
                        if a_attr.get("id") == mapped_attr or a_attr.get("name") == inp_name:
                            try:
                                found_val = float(a_attr.get("value", 0.0))
                            except Exception:
                                found_val = a_attr.get("value")
                            break
                    inputs_payload[inp_name] = found_val

            if inputs_payload:
                logger.info(f"Triggering auto-execution of block '{b.get('name')}' for asset '{asset_id}' on change of '{attr_name}'")
                await self.execute_block_live(
                    block_id=b["id"],
                    inputs=inputs_payload,
                    asset_id=asset_id,
                    persist=True,
                    causation_id=causation_id
                )

custom_fb_service = CustomFunctionBlockService()
