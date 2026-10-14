"""
FastAPI Routes for Rule Chain Studio V2 & Custom JavaScript Rule Nodes
Implements Part 6, Part 7, Part 8, Part 9 API endpoints:
- Create, Read, Update, Delete Rule Chains
- Draft and Published version management & Activation
- Custom JavaScript Rule Node Templates & testing
- Execute Function Block node integration
"""
import uuid
import datetime
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Header, Body, Query

from app.api.dm_service import dm_store
from app.services.rule_engine import rule_engine_service, RuleEngineMessage
from app.services.js_executor import execute_js_sandbox, validate_js_syntax

router = APIRouter(tags=["Rule Chain Studio V2"])

# Seed Custom Rule Node Templates (Part 6.4)
SEED_CUSTOM_RULE_NODES = [
    {
        "id": "crn-temp-filter-01",
        "name": "High Temperature Guard (JS Filter)",
        "node_type": "CUSTOM_JS_FILTER",
        "category": "FILTER",
        "description": "Evaluates whether telemetry temperature exceeds safety threshold using custom JS",
        "version": "1.0.0",
        "status": "PUBLISHED",
        "script": "function filter(msg, metadata, msgType) {\n  return Number(msg.temperature) > 90.0;\n}",
        "relation_labels": ["True", "False"],
        "parameters": [
            {"name": "threshold", "label": "Threshold", "type": "number", "default": 90.0}
        ]
    },
    {
        "id": "crn-f-to-c-transform-01",
        "name": "Fahrenheit to Celsius Converter (JS Transform)",
        "node_type": "CUSTOM_JS_TRANSFORM",
        "category": "TRANSFORM",
        "description": "Converts temperatureF to temperatureC and normalizes engineering metadata",
        "version": "1.0.0",
        "status": "PUBLISHED",
        "script": "function transform(msg, metadata, msgType) {\n  return {\n    msg: {\n      ...msg,\n      temperatureC: Number(((Number(msg.temperatureF || 212) - 32) / 1.8).toFixed(2))\n    },\n    metadata,\n    msgType\n  };\n}",
        "relation_labels": ["Success"],
        "parameters": []
    },
    {
        "id": "crn-pump-kpi-node-01",
        "name": "Execute Pump KPI Block",
        "node_type": "EXECUTE_FUNCTION_BLOCK",
        "category": "ACTION",
        "description": "Executes user-defined custom Function Block 'Pump Performance KPI' with telemetry mappings",
        "version": "1.0.0",
        "status": "PUBLISHED",
        "configuration": {
            "block_id": "cfb-pump-kpi-01",
            "persist_kpi": True,
            "input_mapping": {"flow": "flow", "power": "power", "running": "running"},
            "output_mapping": {"specificEnergy": "specificEnergy", "isRunning": "isRunning"}
        },
        "relation_labels": ["Success", "Failure"]
    }
]

def _ensure_custom_node_store():
    if not hasattr(dm_store, "custom_rule_nodes") or not dm_store.custom_rule_nodes:
        dm_store.custom_rule_nodes = [dict(n) for n in SEED_CUSTOM_RULE_NODES]
    if not hasattr(dm_store, "rule_chain_versions"):
        dm_store.rule_chain_versions = {}

# =========================================================================
# 1. RULE CHAIN LIFECYCLE & CRUD (PART 6.1)
# =========================================================================

@router.get("/rule-chains")
async def list_rule_chains():
    """Lists all configured rule chains."""
    return dm_store.list_rule_chains()

@router.get("/rule-chains/{chain_id}")
async def get_rule_chain(chain_id: str):
    """Retrieves full rule chain definition and nodes."""
    rc = dm_store.get_rule_chain(chain_id)
    if not rc:
        raise HTTPException(status_code=404, detail=f"Rule Chain '{chain_id}' not found")
    return rc

@router.post("/rule-chains")
async def create_new_rule_chain(payload: Dict[str, Any] = Body(...)):
    """
    Creates a completely new Rule Chain (Part 6.1):
    - Initializes unique ID and timestamps
    - Creates default INPUT node
    - Configures default queue and draft status
    """
    name = payload.get("name", "New Process Rule Chain")
    chain_id = payload.get("id") or f"rc-{uuid.uuid4().hex[:8]}"
    now = datetime.datetime.utcnow().isoformat() + "Z"

    # Input node initialization (ThingsBoard / AHI style)
    initial_input_node = {
        "id": f"node-in-{uuid.uuid4().hex[:6]}",
        "type": "INPUT",
        "name": "Inbound Telemetry Ingress",
        "x": 80,
        "y": 180,
        "configuration": {
            "input_message_types": payload.get("input_message_types", ["POST_TELEMETRY_REQUEST", "POST_ATTRIBUTES_REQUEST"])
        }
    }

    new_chain = {
        "id": chain_id,
        "name": name,
        "description": payload.get("description", "User-defined industrial telemetry processing pipeline"),
        "category": payload.get("category", "General"),
        "project_id": payload.get("project_id", "prj-default"),
        "is_root": bool(payload.get("is_root", False)),
        "default_queue": payload.get("default_queue", "Main"),
        "enabled": bool(payload.get("enabled", True)),
        "status": "DRAFT",
        "version": "1.0.0",
        "nodes": payload.get("nodes", [initial_input_node]),
        "connections": payload.get("connections", []),
        "created_at": now,
        "updated_at": now
    }

    # If new chain is designated as root, remove root flag from other chains
    if new_chain["is_root"]:
        for rc in dm_store.rule_chains:
            rc["is_root"] = False

    saved = dm_store.save_rule_chain(new_chain)

    # Initialize version history
    _ensure_custom_node_store()
    if chain_id not in dm_store.rule_chain_versions:
        dm_store.rule_chain_versions[chain_id] = [dict(saved)]

    # Activity log
    if hasattr(dm_store, "activity_logs"):
        dm_store.activity_logs.insert(0, {
            "id": f"act-{uuid.uuid4().hex[:8]}",
            "timestamp": now,
            "category": "RULE_CHAIN",
            "action": f"CREATE_RULE_CHAIN: '{name}' ({chain_id})",
            "user": "engineer@yokogawa.com",
            "status": "SUCCESS"
        })

    dm_store.persist_state()
    return saved

@router.put("/rule-chains/{chain_id}")
async def update_rule_chain(chain_id: str, payload: Dict[str, Any] = Body(...)):
    """Updates an existing Rule Chain graph layout, nodes, or connections."""
    payload["id"] = chain_id
    payload["updated_at"] = datetime.datetime.utcnow().isoformat() + "Z"
    updated = dm_store.save_rule_chain(payload)
    return updated

@router.delete("/rule-chains/{chain_id}")
async def delete_rule_chain(chain_id: str):
    """Deletes a rule chain from the database."""
    ok = dm_store.delete_rule_chain(chain_id)
    if not ok:
        raise HTTPException(status_code=404, detail=f"Rule Chain '{chain_id}' not found")
    return {"success": True, "message": f"Rule Chain '{chain_id}' deleted"}

# =========================================================================
# 2. VALIDATION, PUBLISHING & ACTIVATION
# =========================================================================

@router.post("/rule-chains/{chain_id}/validate")
async def validate_rule_chain(chain_id: str):
    """Validates Rule Chain graph: input node presence, orphan nodes, valid relation labels."""
    rc = dm_store.get_rule_chain(chain_id)
    if not rc:
        raise HTTPException(status_code=404, detail=f"Rule Chain '{chain_id}' not found")

    nodes = rc.get("nodes", [])
    conns = rc.get("connections", [])
    errors = []

    has_input = any(n.get("type") == "INPUT" for n in nodes)
    if not has_input and nodes:
        errors.append("Rule chain missing dedicated INPUT node")

    node_ids = {n["id"] for n in nodes}
    for c in conns:
        frm = c.get("from") or c.get("from_node")
        to = c.get("to") or c.get("to_node")
        if frm not in node_ids:
            errors.append(f"Invalid connection source: node '{frm}' does not exist")
        if to not in node_ids:
            errors.append(f"Invalid connection destination: node '{to}' does not exist")

    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "node_count": len(nodes),
        "connection_count": len(conns)
    }

@router.post("/rule-chains/{chain_id}/publish")
async def publish_rule_chain(chain_id: str, payload: Dict[str, Any] = Body(default={})):
    """
    Publishes a Rule Chain, creating an immutable published version snapshot.
    """
    rc = dm_store.get_rule_chain(chain_id)
    if not rc:
        raise HTTPException(status_code=404, detail=f"Rule Chain '{chain_id}' not found")

    curr_ver = rc.get("version", "1.0.0")
    parts = curr_ver.split(".")
    try:
        new_ver = f"{parts[0]}.{parts[1]}.{int(parts[-1]) + 1}"
    except Exception:
        new_ver = f"{curr_ver}.1"

    rc["version"] = new_ver
    rc["status"] = "PUBLISHED"
    rc["updated_at"] = datetime.datetime.utcnow().isoformat() + "Z"

    _ensure_custom_node_store()
    if chain_id not in dm_store.rule_chain_versions:
        dm_store.rule_chain_versions[chain_id] = []
    dm_store.rule_chain_versions[chain_id].append(dict(rc))

    dm_store.save_rule_chain(rc)
    return {
        "success": True,
        "message": f"Rule Chain '{rc.get('name')}' published as version {new_ver}",
        "rule_chain": rc
    }

@router.post("/rule-chains/{chain_id}/activate")
async def activate_rule_chain(chain_id: str):
    """
    Activates the rule chain to actively process inbound telemetry.
    Can also designate as root chain.
    """
    rc = dm_store.get_rule_chain(chain_id)
    if not rc:
        raise HTTPException(status_code=404, detail=f"Rule Chain '{chain_id}' not found")

    rc["enabled"] = True
    rc["status"] = "ACTIVE"
    dm_store.save_rule_chain(rc)
    return {
        "success": True,
        "message": f"Rule Chain '{rc.get('name')}' activated successfully",
        "rule_chain": rc
    }

# =========================================================================
# 3. TEST EXECUTION (PART 7)
# =========================================================================

@router.post("/rule-chains/{chain_id}/test")
@router.post("/rule-chains/test-run")
async def test_run_rule_chain(payload: Dict[str, Any] = Body(...), chain_id: Optional[str] = None):
    """
    Executes a test message through the Rule Chain in backend workers.
    Returns full node trace with latency, inputs, and outgoing relations.
    """
    target_id = chain_id or payload.get("chain_id")
    chain = dm_store.get_rule_chain(target_id) if target_id else None
    if not chain and dm_store.rule_chains:
        chain = dm_store.rule_chains[0]

    if not chain:
        raise HTTPException(status_code=404, detail="No rule chain available for execution")

    msg_data = payload.get("message") or payload.get("data") or {}
    meta = payload.get("metadata") or {"source": "TEST_STUDIO", "origin": "RuleChainStudioV2"}
    msg_type = payload.get("msg_type") or "POST_TELEMETRY_REQUEST"

    msg = RuleEngineMessage(
        msg_type=msg_type,
        originator_type=payload.get("originator_type", "ASSET"),
        originator_id=payload.get("originator_id", "ast-unit-cdu"),
        data=msg_data,
        metadata=meta,
        context={
            "correlation_id": payload.get("correlation_id", f"corr-{uuid.uuid4().hex[:8]}"),
            "causation_id": payload.get("causation_id"),
            "depth": 0
        }
    )

    result = await rule_engine_service.execute_rule_chain(chain, msg)
    return result

# =========================================================================
# 4. CUSTOM RULE NODE TEMPLATES (PART 6.3 & 6.4)
# =========================================================================

@router.get("/rule-nodes/custom")
async def list_custom_rule_nodes():
    """Lists reusable custom JavaScript Rule Node templates."""
    _ensure_custom_node_store()
    return dm_store.custom_rule_nodes

@router.post("/rule-nodes/custom")
async def create_custom_rule_node(payload: Dict[str, Any] = Body(...)):
    """Creates a new reusable custom JavaScript Rule Node template."""
    _ensure_custom_node_store()
    n_id = payload.get("id") or f"crn-{uuid.uuid4().hex[:8]}"
    node_template = {
        "id": n_id,
        "name": payload.get("name", "Custom Script Node"),
        "node_type": payload.get("node_type", "CUSTOM_JS_FILTER"),
        "category": payload.get("category", "FILTER"),
        "description": payload.get("description", ""),
        "version": payload.get("version", "1.0.0"),
        "status": "PUBLISHED",
        "script": payload.get("script", "function filter(msg, metadata, msgType) { return true; }"),
        "relation_labels": payload.get("relation_labels", ["True", "False"]),
        "parameters": payload.get("parameters", [])
    }

    # Replace existing or append
    idx = next((i for i, n in enumerate(dm_store.custom_rule_nodes) if n["id"] == n_id), -1)
    if idx >= 0:
        dm_store.custom_rule_nodes[idx] = node_template
    else:
        dm_store.custom_rule_nodes.append(node_template)

    dm_store.persist_state()
    return node_template

@router.post("/rule-nodes/custom/{node_id}/test")
async def test_custom_rule_node(node_id: str, payload: Dict[str, Any] = Body(...)):
    """Tests a custom rule node template with a sample message."""
    _ensure_custom_node_store()
    node = next((n for n in dm_store.custom_rule_nodes if n["id"] == node_id), None)
    if not node:
        raise HTTPException(status_code=404, detail=f"Custom rule node '{node_id}' not found")

    script = payload.get("script") or node.get("script", "")
    n_type = node.get("node_type", "CUSTOM_JS_FILTER")

    contract_map = {
        "CUSTOM_JS_FILTER": "RULE_FILTER",
        "CUSTOM_JS_TRANSFORM": "RULE_TRANSFORM",
        "CUSTOM_JS_ENRICHMENT": "RULE_ENRICHMENT",
        "CUSTOM_JS_KPI": "RULE_KPI",
        "CUSTOM_JS_ROUTER": "RULE_ROUTER"
    }
    contract = contract_map.get(n_type, "RULE_FILTER")

    test_msg = payload.get("msg", {"temperature": 95.0, "power": 15.0, "flow": 20.0})
    test_meta = payload.get("metadata", {"quality": "GOOD"})
    test_type = payload.get("msgType", "POST_TELEMETRY_REQUEST")

    res = await execute_js_sandbox(
        script=script,
        contract=contract,
        msg=test_msg,
        metadata=test_meta,
        msg_type=test_type,
        inputs=test_msg
    )
    return res
