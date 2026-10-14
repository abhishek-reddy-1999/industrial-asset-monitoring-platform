import asyncio
import datetime
import json
import logging
import subprocess
import time
from typing import Dict, Any, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import AsyncSessionLocal
from app.db.models import FunctionBlockTemplate, FunctionBlockExecution, HistoricalPoint, ActivityLog, Tag
from app.cache.redis_service import redis_service

logger = logging.getLogger("fb_engine")

def execute_js_block(js_code: str, inputs: Dict[str, Any]) -> Dict[str, Any]:
    """
    Executes a JavaScript Function Block V2 script in Node.js.
    Passes inputs as an object, invokes execute(inputs) or top-level return.
    """
    harness = f"""
const __logs = [];
const console = {{
    log: (...args) => __logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
    warn: (...args) => __logs.push('[WARN] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
    error: (...args) => __logs.push('[ERROR] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
    info: (...args) => __logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '))
}};

const inputs = {json.dumps(inputs)};
{js_code}

try {{
    let res;
    if (typeof execute === 'function') {{
        res = execute(inputs);
    }} else if (typeof calculate === 'function') {{
        res = calculate(inputs);
    }} else {{
        res = (function(inputs) {{ 
            {js_code} 
        }})(inputs);
    }}
    process.stdout.write(JSON.stringify({{ success: true, result: res, logs: __logs }}));
}} catch (err) {{
    process.stdout.write(JSON.stringify({{ success: false, error: err.message, stack: err.stack, logs: __logs }}));
}}
"""
    t0 = time.perf_counter()
    try:
        proc = subprocess.run(
            ["node", "-e", harness],
            capture_output=True,
            text=True,
            timeout=5
        )
        duration_ms = round((time.perf_counter() - t0) * 1000, 2)

        if proc.returncode != 0 and not proc.stdout:
            return {
                "success": False,
                "error": proc.stderr or f"Node exited with code {proc.returncode}",
                "duration_ms": duration_ms
            }

        data = json.loads(proc.stdout)
        data["duration_ms"] = duration_ms
        return data
    except subprocess.TimeoutExpired:
        return {"success": False, "error": "Execution timed out (5s limit)", "duration_ms": 5000}
    except Exception as e:
        return {"success": False, "error": f"JS Runner error: {str(e)}", "duration_ms": 0}


async def run_fb_execution_by_id(execution_id: int, session: Optional[AsyncSession] = None) -> Dict[str, Any]:
    """
    Runs a single Function Block V2 execution:
    1. Reads bound input tags from Redis live cache / DB
    2. Executes JavaScript code via Node.js
    3. Writes computed value to Target Tag in Redis & HistoricalPoint in PostgreSQL
    """
    own_session = False
    if session is None:
        session = AsyncSessionLocal()
        own_session = True

    try:
        res = await session.execute(
            select(FunctionBlockExecution).where(FunctionBlockExecution.id == execution_id)
        )
        exec_item = res.scalars().first()
        if not exec_item:
            return {"success": False, "error": "Execution not found"}

        tmpl_res = await session.execute(
            select(FunctionBlockTemplate).where(FunctionBlockTemplate.id == exec_item.template_id)
        )
        template = tmpl_res.scalars().first()
        if not template:
            return {"success": False, "error": "Associated Block Template not found"}

        # Resolve inputs
        bindings = json.loads(exec_item.input_bindings) if exec_item.input_bindings else {}
        input_values = {}

        # Fetch latest tag values
        for arg_name, tag_name in bindings.items():
            val = None
            if redis_service and redis_service.redis_client:
                cached = await redis_service.get_tag_value(tag_name)
                if cached and "value" in cached:
                    try:
                        val = float(cached["value"])
                    except (ValueError, TypeError):
                        val = cached["value"]
            if val is None:
                # Fallback to DB latest point
                pt_res = await session.execute(
                    select(HistoricalPoint)
                    .where(HistoricalPoint.tag_name == tag_name)
                    .order_by(HistoricalPoint.timestamp.desc())
                    .limit(1)
                )
                pt = pt_res.scalars().first()
                val = pt.value if pt else 50.0
            input_values[arg_name] = val

        # Execute JavaScript block in Node.js
        exec_result = execute_js_block(template.formula_code, input_values)

        now = datetime.datetime.utcnow()
        exec_item.last_run_at = now
        exec_item.last_execution_ms = exec_result.get("duration_ms", 0.0)

        if exec_result.get("success"):
            result_obj = exec_result.get("result", {})
            # Determine main numerical output
            output_val = None
            if isinstance(result_obj, dict):
                # Pick first numeric field or field matching tag
                for k, v in result_obj.items():
                    if isinstance(v, (int, float)):
                        output_val = float(v)
                        break
            elif isinstance(result_obj, (int, float)):
                output_val = float(result_obj)

            exec_item.last_output_value = output_val
            exec_item.status = "ACTIVE"
            exec_item.execution_log = f"[{now.strftime('%H:%M:%S')}] Success in {exec_item.last_execution_ms}ms. Inputs: {json.dumps(input_values)}. Result: {json.dumps(result_obj)}"

            # If target tag is configured and output is numeric, save to historical DB and publish to Redis
            if exec_item.target_tag and output_val is not None:
                hp = HistoricalPoint(
                    tag_name=exec_item.target_tag,
                    timestamp=now,
                    value=output_val,
                    quality="GOOD"
                )
                session.add(hp)

                if redis_service and redis_service.redis_client:
                    tag_data = {
                        "tag_name": exec_item.target_tag,
                        "timestamp": now.isoformat() + "Z",
                        "value": output_val,
                        "quality": "GOOD",
                        "eng_units": "calc"
                    }
                    await redis_service.set_tag_value(exec_item.target_tag, tag_data)
                    await redis_service.publish_live_frame({exec_item.target_tag: tag_data})

            # Log activity
            act = ActivityLog(
                category="BLOCK",
                action="Block Executed",
                details=f"Execution '{exec_item.execution_name}' produced {output_val} in {exec_item.last_execution_ms}ms",
                status="SUCCESS"
            )
            session.add(act)
            await session.commit()

            return {
                "success": True,
                "execution_id": exec_item.id,
                "execution_name": exec_item.execution_name,
                "output_value": output_val,
                "result": result_obj,
                "duration_ms": exec_item.last_execution_ms,
                "timestamp": now.isoformat()
            }
        else:
            exec_item.status = "ERROR"
            exec_item.execution_log = f"[{now.strftime('%H:%M:%S')}] Error: {exec_result.get('error')}"
            await session.commit()
            return {
                "success": False,
                "error": exec_result.get("error"),
                "duration_ms": exec_item.last_execution_ms
            }

    finally:
        if own_session:
            await session.close()


class FunctionBlockScheduler:
    """
    Background scheduler for Yokogawa AHI Function Block V2.
    Executes ACTIVE blocks according to their configured schedule interval.
    """
    def __init__(self):
        self.running = False
        self._task = None

    def start(self):
        if not self.running:
            self.running = True
            self._task = asyncio.create_task(self._loop())
            logger.info("Function Block V2 Background Scheduler started.")

    async def stop(self):
        self.running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            logger.info("Function Block V2 Background Scheduler stopped.")

    async def _loop(self):
        intervals_map = {
            "1s": 1,
            "5s": 5,
            "10s": 10,
            "30s": 30,
            "1m": 60,
            "5m": 300
        }
        counter = 0

        while self.running:
            try:
                await asyncio.sleep(1.0)
                counter += 1

                async with AsyncSessionLocal() as session:
                    res = await session.execute(
                        select(FunctionBlockExecution).where(FunctionBlockExecution.status == "ACTIVE")
                    )
                    executions = res.scalars().all()

                    for exec_item in executions:
                        sec = intervals_map.get(exec_item.schedule_interval, 5)
                        if counter % sec == 0:
                            # Run this execution
                            asyncio.create_task(run_fb_execution_by_id(exec_item.id))

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in Function Block scheduler loop: {e}")
                await asyncio.sleep(2.0)

fb_scheduler = FunctionBlockScheduler()
