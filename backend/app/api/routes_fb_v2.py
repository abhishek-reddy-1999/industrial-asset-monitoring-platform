"""
FastAPI Routes for Template-First Function Block V2 Architecture (Part 13)
Provides Block Template CRUD, Asset Markup designer, Input/Output definitions,
JavaScript Monaco validation/test, Output Mappings, Publication gate,
Block Execution instance management, Output provisioning, and Trigger runner.
"""
import uuid
import datetime
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Header, Body, Query, status

from app.services.fb_template_service import fb_template_service
from app.services.js_executor import execute_js_sandbox, validate_js_syntax
from app.api.dm_service import dm_store

router = APIRouter(prefix="/fb", tags=["Function Block V2 (Template-First)"])

# =========================================================================
# 1. BLOCK TEMPLATES (PART 3)
# =========================================================================

@router.get("/templates")
async def list_block_templates(
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None)
):
    """Lists all Block Templates, optionally filtered by status or category."""
    return fb_template_service.list_templates(status=status, category=category)

@router.get("/templates/{template_id}")
async def get_block_template(template_id: str):
    """Retrieves full Block Template definition including markups, ports, and mappings."""
    tmpl = fb_template_service.get_template(template_id)
    if not tmpl:
        raise HTTPException(status_code=404, detail=f"Block Template '{template_id}' not found")
    return tmpl

@router.post("/templates", status_code=status.HTTP_201_CREATED)
async def create_block_template(
    payload: Dict[str, Any] = Body(...),
    x_user_email: Optional[str] = Header(None, alias="X-User-Email")
):
    """Creates a new reusable Block Template in DRAFT status."""
    try:
        author = payload.get("author") or x_user_email or "engineer@yokogawa.com"
        created = fb_template_service.create_template(payload, author=author)
        return created
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/templates/{template_id}")
async def update_block_template(template_id: str, payload: Dict[str, Any] = Body(...)):
    """Updates an existing DRAFT Block Template. Rejects editing published templates."""
    try:
        updated = fb_template_service.update_template(template_id, payload)
        return updated
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/templates/{template_id}")
async def delete_block_template(template_id: str):
    """Deletes a draft template or retires a published template."""
    try:
        return fb_template_service.delete_template(template_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/templates/{template_id}/clone")
async def clone_block_template(template_id: str, payload: Dict[str, Any] = Body(default={})):
    """Clones an existing Block Template into a new independent DRAFT template."""
    try:
        cloned = fb_template_service.clone_template(
            template_id,
            new_code=payload.get("template_code"),
            new_name=payload.get("name")
        )
        return cloned
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/templates/{template_id}/new-version")
async def create_template_new_version(template_id: str):
    """Increments the version of a published template and creates a new editable DRAFT."""
    try:
        return fb_template_service.create_new_version(template_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/templates/{template_id}/versions")
async def get_template_version_history(template_id: str):
    """Returns immutable version snapshots of the template."""
    try:
        return fb_template_service.get_template_versions(template_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/templates/{template_id}/export")
async def export_block_template(template_id: str):
    """Exports clean JSON template definition without physical asset bindings."""
    try:
        return fb_template_service.export_template(template_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/templates/import")
async def import_block_template(payload: Dict[str, Any] = Body(...)):
    """Imports an exported JSON template definition into a new DRAFT."""
    try:
        return fb_template_service.import_template(payload)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# =========================================================================
# 2. SUB-ENTITY CONFIGURATION ROUTES (PARTS 4, 5, 6, 7, 8)
# =========================================================================

@router.put("/templates/{template_id}/markups")
async def update_template_markups(template_id: str, payload: Dict[str, Any] = Body(...)):
    """Updates the Asset Markup logical placeholders (e.g. @Pump, @Motor)."""
    try:
        markups = payload.get("markups", [])
        return fb_template_service.update_markups(template_id, markups)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/templates/{template_id}/inputs")
async def update_template_inputs(template_id: str, payload: Dict[str, Any] = Body(...)):
    """Updates Input Asset Attribute definitions before writing JavaScript."""
    try:
        inputs = payload.get("inputs", [])
        return fb_template_service.update_inputs(template_id, inputs)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/templates/{template_id}/outputs")
async def update_template_outputs(template_id: str, payload: Dict[str, Any] = Body(...)):
    """Updates Output Runtime Attribute definitions."""
    try:
        outputs = payload.get("outputs", [])
        return fb_template_service.update_outputs(template_id, outputs)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/templates/{template_id}/code")
async def update_template_code(template_id: str, payload: Dict[str, Any] = Body(...)):
    """Updates the template JavaScript formula code."""
    try:
        script_code = payload.get("script_code", "")
        return fb_template_service.update_code(template_id, script_code)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/templates/{template_id}/output-mappings")
async def update_template_output_mappings(template_id: str, payload: Dict[str, Any] = Body(...)):
    """Updates structured JavaScript Result Key -> Output Runtime Attribute mappings."""
    try:
        mappings = payload.get("output_mappings", [])
        return fb_template_service.update_output_mappings(template_id, mappings)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# =========================================================================
# 3. VALIDATION, TESTING & PUBLICATION (PART 9)
# =========================================================================

@router.post("/templates/{template_id}/validate")
async def validate_block_template(template_id: str):
    """
    Validates template metadata, unique markup names, input/output schemas,
    JavaScript syntax, and structured output mappings.
    """
    try:
        return await fb_template_service.validate_template(template_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/templates/{template_id}/test")
async def test_block_template(template_id: str, payload: Dict[str, Any] = Body(...)):
    """Runs a simulated execution in the isolated Node.js sandbox using test inputs."""
    try:
        test_inputs = payload.get("inputs", {})
        test_params = payload.get("parameters", None)
        return await fb_template_service.test_template(template_id, test_inputs, test_params)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/templates/{template_id}/publish")
async def publish_block_template(
    template_id: str,
    payload: Dict[str, Any] = Body(default={}),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
    x_user_email: Optional[str] = Header(None, alias="X-User-Email")
):
    """
    Validates and publishes the Block Template, enforcing role permissions
    and creating an immutable version snapshot.
    """
    role = (payload.get("user_role") or x_user_role or "Engineer").strip()
    user_email = payload.get("user_email") or x_user_email or "engineer@yokogawa.com"

    try:
        published = await fb_template_service.publish_template(template_id, user_email=user_email, user_role=role)
        return {
            "success": True,
            "message": f"Block Template '{published['name']}' published successfully as version {published['version']}",
            "template": published
        }
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# =========================================================================
# 4. BLOCK EXECUTIONS (PARTS 10 & 11)
# =========================================================================

@router.get("/executions")
async def list_block_executions(
    status: Optional[str] = Query(None),
    template_id: Optional[str] = Query(None)
):
    """Lists all deployed Block Execution instances."""
    return fb_template_service.list_executions(status=status, template_id=template_id)

@router.get("/executions/{execution_id}")
async def get_block_execution(execution_id: str):
    """Retrieves execution details, asset bindings, and provisioned output attributes."""
    ex = fb_template_service.get_execution(execution_id)
    if not ex:
        raise HTTPException(status_code=404, detail=f"Block Execution '{execution_id}' not found")
    return ex

@router.post("/executions", status_code=status.HTTP_201_CREATED)
async def create_block_execution(payload: Dict[str, Any] = Body(...)):
    """
    Deploys a new Block Execution instance from a published template:
    maps actual plant assets, provisions missing Runtime Attributes, and sets triggers.
    """
    try:
        created = fb_template_service.create_execution(payload)
        return created
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/executions/{execution_id}")
async def update_block_execution(execution_id: str, payload: Dict[str, Any] = Body(...)):
    """Updates an existing Block Execution instance and re-binds attributes."""
    try:
        updated = fb_template_service.update_execution(execution_id, payload)
        return updated
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/executions/{execution_id}")
async def delete_block_execution(execution_id: str):
    """Removes a Block Execution instance."""
    try:
        return fb_template_service.delete_execution(execution_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/executions/{execution_id}/activate")
async def activate_block_execution(execution_id: str):
    """Activates an execution instance for automatic trigger recalculations."""
    try:
        return fb_template_service.activate_execution(execution_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/executions/{execution_id}/pause")
async def pause_block_execution(execution_id: str):
    """Pauses an execution instance."""
    try:
        return fb_template_service.pause_execution(execution_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/executions/{execution_id}/run")
async def run_block_execution_manually(
    execution_id: str,
    payload: Dict[str, Any] = Body(default={})
):
    """
    Manually triggers execution of a Block Execution instance:
    loads bound attributes, executes in isolated sandbox, and writes to Runtime Attributes.
    """
    manual_inputs = payload.get("inputs")
    res = await fb_template_service.run_execution(execution_id, manual_inputs=manual_inputs)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Execution failed"))
    return res

@router.get("/executions/{execution_id}/history")
async def get_execution_history(execution_id: str):
    """Returns execution history traces for the given instance."""
    history = [h for h in fb_template_service.execution_history if h.get("instance_id") == execution_id]
    return history

@router.get("/history")
async def get_all_execution_history(limit: int = Query(50)):
    """Returns recent execution traces across all block executions."""
    return fb_template_service.execution_history[:limit]
