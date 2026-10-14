"""
FastAPI Routes for Custom Function Block V3 & JavaScript KPI Engine
Implements Part 3, Part 4, Part 5, Part 8, Part 9 API endpoints:
- CRUD for custom function blocks
- Port & parameter schema validation
- Sandboxed JavaScript testing & execution
- Publishing & version history
- Automatic trigger execution
"""
import uuid
import datetime
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Header, Body, Query

from app.services.custom_fb_service import custom_fb_service
from app.services.js_executor import execute_js_sandbox, validate_js_syntax
from app.api.dm_service import dm_store

router = APIRouter(tags=["Custom Function Blocks V3"])

# =========================================================================
# 1. CUSTOM FUNCTION BLOCK CRUD & RETRIEVAL
# =========================================================================

@router.get("/function-blocks/custom")
async def list_custom_function_blocks():
    """Returns all user-defined and pre-seeded custom function blocks."""
    return custom_fb_service.list_blocks()

@router.get("/function-blocks/custom/{block_id}")
async def get_custom_function_block(block_id: str):
    """Retrieves full definition of a custom function block."""
    b = custom_fb_service.get_block(block_id)
    if not b:
        raise HTTPException(status_code=404, detail=f"Custom function block '{block_id}' not found")
    return b

@router.post("/function-blocks/custom")
async def create_custom_function_block(payload: Dict[str, Any] = Body(...)):
    """Creates a new custom function block with dynamic input/output ports and parameters."""
    return custom_fb_service.save_block(payload)

@router.put("/function-blocks/custom/{block_id}")
async def update_custom_function_block(block_id: str, payload: Dict[str, Any] = Body(...)):
    """Updates an existing custom function block (draft version)."""
    payload["id"] = block_id
    return custom_fb_service.save_block(payload)

@router.delete("/function-blocks/custom/{block_id}")
async def delete_custom_function_block(block_id: str):
    """Deletes a custom function block from the system."""
    existing = custom_fb_service.get_block(block_id)
    if not existing:
        raise HTTPException(status_code=404, detail=f"Custom function block '{block_id}' not found")
    custom_fb_service.custom_blocks = [b for b in custom_fb_service.custom_blocks if b["id"] != block_id]
    custom_fb_service.persist()
    custom_fb_service.sync_to_block_registry()
    return {"success": True, "message": f"Block '{block_id}' deleted"}

# =========================================================================
# 2. VALIDATION & TESTING
# =========================================================================

@router.post("/function-blocks/custom/{block_id}/validate")
async def validate_custom_function_block(block_id: str):
    """Validates port schemas, parameter configurations, and JavaScript syntax."""
    b = custom_fb_service.get_block(block_id)
    if not b:
        raise HTTPException(status_code=404, detail=f"Custom function block '{block_id}' not found")
    
    script = b.get("script_code", "")
    syntax_check = await validate_js_syntax(script, contract="FB_CALCULATE")
    
    # Port name validation
    port_errors = []
    input_names = [inp.get("name") for inp in b.get("inputs", [])]
    if len(input_names) != len(set(input_names)):
        port_errors.append("Duplicate input port names detected")

    output_names = [out.get("name") for out in b.get("outputs", [])]
    if len(output_names) != len(set(output_names)):
        port_errors.append("Duplicate output port names detected")

    valid = syntax_check.get("valid", False) and len(port_errors) == 0

    return {
        "valid": valid,
        "syntax_check": syntax_check,
        "port_errors": port_errors,
        "input_count": len(input_names),
        "output_count": len(output_names)
    }

@router.post("/function-blocks/custom/{block_id}/test")
async def test_custom_function_block(block_id: str, payload: Dict[str, Any] = Body(...)):
    """
    Executes a side-effect-free test run of the custom block
    in the isolated Node.js sandbox using provided test inputs.
    """
    test_inputs = payload.get("inputs", {})
    test_params = payload.get("parameters", None)
    asset_context = payload.get("asset_context", None)

    res = await custom_fb_service.test_block(
        block_id,
        test_inputs=test_inputs,
        test_params=test_params,
        asset_context=asset_context
    )
    return res

# =========================================================================
# 3. PUBLISHING & PERMISSIONS
# =========================================================================

@router.post("/function-blocks/custom/{block_id}/publish")
async def publish_custom_function_block(
    block_id: str,
    payload: Dict[str, Any] = Body(default={}),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
    x_user_email: Optional[str] = Header(None, alias="X-User-Email")
):
    """
    Publishes a custom function block, enforcing permission checks and recording audit log.
    Rejects unauthorized roles (Operator, Viewer) with HTTP 403.
    """
    role = (payload.get("user_role") or x_user_role or "Engineer").strip()
    user_email = payload.get("user_email") or x_user_email or "engineer@yokogawa.com"

    # Permission Guard: Only Administrators and Process Engineers can publish custom code
    if role.lower() in ["viewer", "operator", "guest", "unauthorized"]:
        # Record unauthorized audit trail
        now = datetime.datetime.utcnow().isoformat() + "Z"
        if hasattr(dm_store, "activity_logs"):
            dm_store.activity_logs.insert(0, {
                "id": f"act-{uuid.uuid4().hex[:8]}",
                "timestamp": now,
                "category": "SECURITY",
                "action": f"PUBLISH_REJECTED: Unauthorized role '{role}' ({user_email}) attempted custom script publication",
                "user": user_email,
                "status": "FAILURE"
            })
            dm_store.persist_state()

        raise HTTPException(
            status_code=403,
            detail=f"Permission Denied: User role '{role}' is not authorized to publish custom script blocks"
        )

    try:
        published = custom_fb_service.publish_block(block_id, author=user_email)
        return {
            "success": True,
            "message": f"Block '{published.get('name')}' successfully published as version {published.get('version')}",
            "block": published
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

# =========================================================================
# 4. RAW SCRIPT CONSOLE SERVICES (PART 8)
# =========================================================================

@router.post("/scripts/test")
async def test_raw_script(payload: Dict[str, Any] = Body(...)):
    """
    Executes raw user JavaScript in the isolated Node.js sandbox
    without modifying database or physical assets.
    """
    script = payload.get("script", "")
    contract = payload.get("contract", "FB_CALCULATE")
    inputs = payload.get("inputs", {})
    ctx = payload.get("ctx", {})
    msg = payload.get("msg", {})
    metadata = payload.get("metadata", {})
    msg_type = payload.get("msg_type", "POST_TELEMETRY_REQUEST")
    timeout_ms = int(payload.get("timeout_ms", 2000))

    return await execute_js_sandbox(
        script=script,
        contract=contract,
        ctx=ctx,
        inputs=inputs,
        msg=msg,
        metadata=metadata,
        msg_type=msg_type,
        timeout_ms=timeout_ms
    )

@router.post("/scripts/validate")
async def validate_raw_script(payload: Dict[str, Any] = Body(...)):
    """Validates JavaScript syntax for given script contract."""
    script = payload.get("script", "")
    contract = payload.get("contract", "FB_CALCULATE")
    return await validate_js_syntax(script, contract=contract)

# =========================================================================
# 5. LIVE EXECUTION & KPI PERSISTENCE (PART 5)
# =========================================================================

@router.post("/function-blocks/custom/{block_id}/execute")
async def execute_custom_function_block_live(
    block_id: str,
    payload: Dict[str, Any] = Body(...)
):
    """
    Executes a custom function block live, persists results to configured
    Runtime Asset Attributes, and updates the historian.
    """
    inputs = payload.get("inputs", {})
    asset_id = payload.get("asset_id")
    persist = bool(payload.get("persist", True))
    causation_id = payload.get("causation_id")

    res = await custom_fb_service.execute_block_live(
        block_id=block_id,
        inputs=inputs,
        asset_id=asset_id,
        persist=persist,
        causation_id=causation_id
    )

    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Execution failed"))

    return res
