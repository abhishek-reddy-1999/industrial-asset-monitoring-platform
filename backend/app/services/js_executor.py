"""
Async Python Bridge to Isolated Node.js Sandbox Worker
Executes user-defined JavaScript Function Blocks and Rule Nodes
with strict resource quotas, timeouts, memory limits, and security boundaries.
"""
import asyncio
import json
import os
import shutil
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("ydash.js_executor")

# Locate node binary
NODE_BIN = shutil.which("node") or "node"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WORKER_SCRIPT = os.path.join(BASE_DIR, "js_sandbox_worker.js")

class JSExecutionError(Exception):
    pass

async def execute_js_sandbox(
    script: str,
    contract: str = "FB_CALCULATE",
    ctx: Optional[Dict[str, Any]] = None,
    inputs: Optional[Dict[str, Any]] = None,
    msg: Optional[Dict[str, Any]] = None,
    metadata: Optional[Dict[str, Any]] = None,
    msg_type: str = "POST_TELEMETRY_REQUEST",
    timeout_ms: int = 2000
) -> Dict[str, Any]:
    """
    Executes a JavaScript script within the isolated Node.js sandbox worker.
    Enforces process isolation, strict memory cap, timeout, and strips host APIs.
    """
    payload = {
        "script": script,
        "contract": contract,
        "ctx": ctx or {},
        "inputs": inputs or {},
        "msg": msg or {},
        "metadata": metadata or {},
        "msgType": msg_type,
        "timeout_ms": timeout_ms
    }

    input_json = json.dumps(payload)

    # Launch isolated node process with strict memory ceiling (64MB)
    cmd = [
        NODE_BIN,
        "--max-old-space-size=64",
        "--disallow-code-generation-from-strings",
        WORKER_SCRIPT
    ]

    proc = None
    timeout_sec = (timeout_ms / 1000.0) + 1.5

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )

        stdout_bytes, stderr_bytes = await asyncio.wait_for(
            proc.communicate(input=input_json.encode("utf-8")),
            timeout=timeout_sec
        )

        stdout_str = stdout_bytes.decode("utf-8", errors="replace").strip()
        stderr_str = stderr_bytes.decode("utf-8", errors="replace").strip()

        if not stdout_str:
            return {
                "success": False,
                "error": stderr_str or "No output from JavaScript execution worker",
                "logs": [],
                "duration_ms": 0.0
            }

        try:
            res = json.loads(stdout_str)
            return res
        except json.JSONDecodeError:
            return {
                "success": False,
                "error": f"Failed to parse JS worker output: {stdout_str[:200]}",
                "logs": [stdout_str],
                "duration_ms": 0.0
            }

    except asyncio.TimeoutError:
        if proc:
            try:
                proc.kill()
            except Exception:
                pass
        return {
            "success": False,
            "error": f"JavaScript execution forcibly terminated after {timeout_ms}ms timeout",
            "is_timeout": True,
            "logs": [],
            "duration_ms": float(timeout_ms)
        }
    except Exception as e:
        logger.error(f"Error executing JS sandbox: {e}")
        return {
            "success": False,
            "error": str(e),
            "logs": [],
            "duration_ms": 0.0
        }

async def validate_js_syntax(script: str, contract: str = "FB_CALCULATE") -> Dict[str, Any]:
    """
    Validates script syntax without running active business side effects.
    Uses empty mock inputs.
    """
    test_inputs = {
        "flow": 1.0,
        "power": 1.0,
        "running": True,
        "temperature": 25.0,
        "pressure": 1.0,
        "A": 1.0,
        "B": 1.0
    }
    test_msg = {
        "temperature": 95.0,
        "pressure": 260.0,
        "status": "NORMAL",
        "power": 15.0,
        "flow": 20.0
    }
    test_metadata = {
        "source": "VALIDATION_TEST",
        "quality": "GOOD"
    }

    res = await execute_js_sandbox(
        script=script,
        contract=contract,
        ctx={"executionId": "val-check", "parameters": {}},
        inputs=test_inputs,
        msg=test_msg,
        metadata=test_metadata,
        timeout_ms=1000
    )

    if res.get("success"):
        return {
            "valid": True,
            "message": "Script syntax is valid and executes cleanly",
            "sample_result": res.get("result"),
            "duration_ms": res.get("duration_ms", 0.0)
        }
    else:
        return {
            "valid": False,
            "error": res.get("error", "Syntax or runtime error"),
            "is_timeout": res.get("is_timeout", False),
            "duration_ms": res.get("duration_ms", 0.0)
        }

def execute_js_sandbox_sync(
    script: str,
    contract: str = "FB_CALCULATE",
    ctx: Optional[Dict[str, Any]] = None,
    inputs: Optional[Dict[str, Any]] = None,
    msg: Optional[Dict[str, Any]] = None,
    metadata: Optional[Dict[str, Any]] = None,
    msg_type: str = "POST_TELEMETRY_REQUEST",
    timeout_ms: int = 2000
) -> Dict[str, Any]:
    """
    Synchronous execution of JavaScript sandbox worker using subprocess.run.
    Used by synchronous DAG engines such as fb_block_registry.
    """
    import subprocess
    payload = {
        "script": script,
        "contract": contract,
        "ctx": ctx or {},
        "inputs": inputs or {},
        "msg": msg or {},
        "metadata": metadata or {},
        "msgType": msg_type,
        "timeout_ms": timeout_ms
    }

    input_json = json.dumps(payload)
    cmd = [
        NODE_BIN,
        "--max-old-space-size=64",
        "--disallow-code-generation-from-strings",
        WORKER_SCRIPT
    ]

    timeout_sec = (timeout_ms / 1000.0) + 1.5

    try:
        proc = subprocess.run(
            cmd,
            input=input_json.encode("utf-8"),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=timeout_sec
        )

        stdout_str = proc.stdout.decode("utf-8", errors="replace").strip()
        stderr_str = proc.stderr.decode("utf-8", errors="replace").strip()

        if not stdout_str:
            return {
                "success": False,
                "error": stderr_str or "No output from JavaScript execution worker",
                "logs": [],
                "duration_ms": 0.0
            }

        try:
            return json.loads(stdout_str)
        except json.JSONDecodeError:
            return {
                "success": False,
                "error": f"Failed to parse JS worker output: {stdout_str[:200]}",
                "logs": [stdout_str],
                "duration_ms": 0.0
            }

    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "error": f"JavaScript execution forcibly terminated after {timeout_ms}ms timeout",
            "is_timeout": True,
            "logs": [],
            "duration_ms": float(timeout_ms)
        }
    except Exception as e:
        logger.error(f"Error executing JS sandbox sync: {e}")
        return {
            "success": False,
            "error": str(e),
            "logs": [],
            "duration_ms": 0.0
        }

