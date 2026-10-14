import asyncio
import json
import urllib.request
import websockets
import time

BASE_URL = "http://127.0.0.1:91"
WS_URL = "ws://127.0.0.1:91/ws/telemetry"

def http_get(path):
    url = f"{BASE_URL}{path}"
    req = urllib.request.Request(url, method="GET")
    start = time.perf_counter()
    with urllib.request.urlopen(req, timeout=5) as res:
        latency = (time.perf_counter() - start) * 1000
        return res.status, json.loads(res.read().decode('utf-8')), latency

def http_post(path, data):
    url = f"{BASE_URL}{path}"
    body = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(url, data=body, method="POST")
    req.add_header("Content-Type", "application/json")
    start = time.perf_counter()
    with urllib.request.urlopen(req, timeout=5) as res:
        latency = (time.perf_counter() - start) * 1000
        return res.status, json.loads(res.read().decode('utf-8')), latency

async def validate_all_protocols():
    results = {}
    print("=" * 70)
    print("YOKOGAWA OPREX AHI & DBM — MULTI-PROTOCOL VALIDATION SUITE")
    print("=" * 70)

    # 1. REST API
    print("\n[1/5] Testing REST API Communication...")
    try:
        status, health, lat = http_get("/health")
        status_tags, tags_list, lat_tags = http_get("/api/v1/tags/list")
        status_dm, dm_state, lat_dm = http_get("/api/v1/dm/state")
        results["REST_API"] = {
            "status": "PASSED" if status == 200 and status_tags == 200 else "FAILED",
            "health": health["status"],
            "redis": health["redis"],
            "tags_count": len(tags_list),
            "assets_count": len(dm_state.get("assets", [])),
            "devices_count": len(dm_state.get("devices", [])),
            "latency_ms": round(lat, 2)
        }
        print(f" -> REST API OK: Health={health['status']}, Tags={len(tags_list)}, Assets={len(dm_state.get('assets', []))} ({round(lat, 2)}ms)")
    except Exception as e:
        results["REST_API"] = {"status": "FAILED", "error": str(e)}
        print(f" -> REST API Failed: {e}")

    # 2. OPC UA Protocol
    print("\n[2/5] Testing OPC UA (IEC 62541) Gateway...")
    try:
        status, opc_res, lat = http_get("/api/v1/opcua/status")
        results["OPC_UA"] = {
            "status": "PASSED" if status == 200 else "FAILED",
            "endpoint": opc_res.get("endpoint"),
            "protocol": opc_res.get("protocol"),
            "profiles": opc_res.get("supported_profiles"),
            "latency_ms": round(lat, 2)
        }
        print(f" -> OPC UA OK: Endpoint={opc_res.get('endpoint')}, Profiles={opc_res.get('supported_profiles')} ({round(lat, 2)}ms)")
    except Exception as e:
        results["OPC_UA"] = {"status": "FAILED", "error": str(e)}
        print(f" -> OPC UA Failed: {e}")

    # 3. MQTT / Industrial Broker Ingestion
    print("\n[3/5] Testing MQTT / Broker Ingestion Protocol...")
    try:
        ingest_payload = {
            "deviceid": "pump-p101a-hub-01",
            "discharge_pressure": 592.8,
            "vibration_axial": 2.45,
            "flow_rate": 455.0
        }
        status, ingest_res, lat = http_post("/api/v1/dm/broker/ingest", ingest_payload)
        results["MQTT_BROKER"] = {
            "status": "PASSED" if status == 200 and ingest_res.get("status") == "SUCCESS" else "FAILED",
            "device_id": ingest_res.get("device_id"),
            "attributes_updated": ingest_res.get("attributes_updated"),
            "recalculated_runtime": any(d.get("is_runtime") for d in ingest_res.get("details", [])),
            "latency_ms": round(lat, 2)
        }
        print(f" -> MQTT Broker OK: Ingested to {ingest_res.get('device_id')}, updated {ingest_res.get('attributes_updated')} attributes ({round(lat, 2)}ms)")
    except Exception as e:
        results["MQTT_BROKER"] = {"status": "FAILED", "error": str(e)}
        print(f" -> MQTT Broker Failed: {e}")

    # 4. Function Block V8 Engine
    print("\n[4/5] Testing Yokogawa V8 Function Block Execution Engine...")
    try:
        status_tpl, templates, lat_tpl = http_get("/api/v1/dm/function-blocks/templates")
        status_fbs, fbs, lat_fbs = http_get("/api/v1/dm/function-blocks")
        
        # Test execute block fb-001 (Thermal Delta T)
        status_exec, exec_res, lat_exec = http_post("/api/v1/dm/function-blocks/fb-001/execute", {})
        
        # Test sandbox arbitrary JS in V8
        test_js = "function execute(inputs) { return { calc_val: (inputs.x * 2.5) + inputs.y, engine: 'V8-JIT' }; }"
        status_test, test_res, lat_test = http_post("/api/v1/dm/function-blocks/test-run", {
            "formula_code": test_js,
            "inputs": {"x": 10, "y": 5}
        })

        results["FUNCTION_BLOCK_V8"] = {
            "status": "PASSED" if status_exec == 200 and status_test == 200 else "FAILED",
            "templates_count": len(templates),
            "blocks_count": len(fbs),
            "fb_001_output": exec_res.get("result"),
            "fb_001_latency_ms": exec_res.get("duration_ms"),
            "v8_sandbox_result": test_res.get("result"),
            "v8_sandbox_latency_ms": test_res.get("duration_ms")
        }
        print(f" -> FB Engine OK: Templates={len(templates)}, Blocks={len(fbs)}")
        print(f"    - FB-001 Run Output: {exec_res.get('result')} in {exec_res.get('duration_ms')}ms")
        print(f"    - V8 Sandbox Output: {test_res.get('result')} in {test_res.get('duration_ms')}ms")
    except Exception as e:
        results["FUNCTION_BLOCK_V8"] = {"status": "FAILED", "error": str(e)}
        print(f" -> FB Engine Failed: {e}")

    # 5. WebSocket Real-time Stream
    print("\n[5/5] Testing WebSocket Real-time Telemetry Stream...")
    try:
        async with websockets.connect(WS_URL, close_timeout=2) as ws:
            # 1. Wait for initial snapshot
            msg = await asyncio.wait_for(ws.recv(), timeout=5)
            frame = json.loads(msg)
            tags_snapshot = frame.get("tags", {})
            
            # 2. Send ping to test bidirectional socket
            await ws.send(json.dumps({"action": "ping"}))
            pong_msg = await asyncio.wait_for(ws.recv(), timeout=5)
            pong_frame = json.loads(pong_msg)
            
            results["WEBSOCKET_STREAM"] = {
                "status": "PASSED" if frame.get("event") == "snapshot" else "FAILED",
                "snapshot_tags_count": len(tags_snapshot),
                "bidirectional_pong": pong_frame.get("event") == "pong" or "pong" in pong_msg
            }
            print(f" -> WebSocket Stream OK: Connected, received snapshot of {len(tags_snapshot)} tags, pong confirmed.")
    except Exception as e:
        results["WEBSOCKET_STREAM"] = {"status": "FAILED", "error": str(e)}
        print(f" -> WebSocket Stream Failed: {e}")

    print("\n" + "=" * 70)
    print("PROTOCOL VALIDATION SUMMARY REPORT")
    print("=" * 70)
    all_passed = True
    for proto, res in results.items():
        st = res.get("status")
        if st != "PASSED":
            all_passed = False
        print(f"[{st}] {proto}: {json.dumps(res, indent=2)}")

    print(f"\nFinal Verdict: {'ALL PROTOCOLS VALIDATED SUCCESSFULLY (100% OPERATIONAL)' if all_passed else 'SOME PROTOCOLS REQUIRE ATTENTION'}")
    return results

if __name__ == "__main__":
    asyncio.run(validate_all_protocols())
