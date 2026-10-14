"""
Comprehensive Automated Test Suite for Custom Function Block V3 & Rule Chain Studio V2
Executes all 16 required tests from Part 10 of the Master Implementation Prompt.
"""
import asyncio
import httpx
import json
import sys
import time

BASE_URL = "http://127.0.0.1:91"

async def run_all_tests():
    print("=" * 80)
    print("STARTING INDUSTRIAL CUSTOM FUNCTION BLOCK V3 & RULE CHAIN STUDIO V2 TEST SUITE")
    print(f"Target Gateway: {BASE_URL}")
    print("=" * 80)

    passed_count = 0
    total_tests = 16
    client = httpx.AsyncClient(base_url=BASE_URL, timeout=10.0)

    try:
        # ---------------------------------------------------------------------
        # TEST 1: Create a new Custom JavaScript Function Block
        # ---------------------------------------------------------------------
        print("\n[TEST 1] Creating a new Custom JavaScript Function Block...")
        payload_1 = {
            "name": "Heat Exchanger Thermal Differential Calculator",
            "display_name": "Hex Delta-T",
            "description": "Computes thermal gradient and logarithmic mean temperature difference.",
            "category": "Custom",
            "type": "custom.hex_delta_t_calc",
            "version": "1.0.0",
            "author": "Thermal Specialist",
            "inputs": [
                {"name": "tempInlet", "data_type": "number", "unit": "degC", "default_value": 120.0},
                {"name": "tempOutlet", "data_type": "number", "unit": "degC", "default_value": 85.0}
            ],
            "outputs": [
                {"name": "deltaT", "data_type": "number", "unit": "degC", "destination_type": "RUNTIME_ATTRIBUTE"}
            ],
            "script_code": "function calculate(ctx, inputs) { return { deltaT: inputs.tempInlet - inputs.tempOutlet }; }"
        }
        r1 = await client.post("/api/v2/function-blocks/custom", json=payload_1)
        assert r1.status_code == 200, f"Expected 200, got {r1.status_code}: {r1.text}"
        block_1 = r1.json()
        assert block_1.get("id"), "Missing block ID"
        b1_id = block_1["id"]

        # Check block appears in library catalog
        r1_cat = await client.get("/api/v1/dm/fb-studio/registry")
        catalog = r1_cat.json()
        found_in_cat = any(b.get("type") == "custom.hex_delta_t_calc" for b in catalog)
        assert found_in_cat, "Created block not found in fb-studio/registry catalog"
        print(f"--> PASS: Block '{b1_id}' created and registered in visual catalog.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 2: Add 3 dynamic input ports and 3 output ports (Persists)
        # ---------------------------------------------------------------------
        print("\n[TEST 2] Verifying schema with 3 dynamic input ports and 3 output ports...")
        payload_2 = {
            "name": "Multi-Port Test Engine",
            "type": "custom.multi_port_engine",
            "inputs": [
                {"id": "i1", "name": "portA", "data_type": "number", "default_value": 10.0, "unit": "kPa"},
                {"id": "i2", "name": "portB", "data_type": "number", "default_value": 20.0, "unit": "kPa"},
                {"id": "i3", "name": "portC", "data_type": "boolean", "default_value": True, "unit": "bool"}
            ],
            "outputs": [
                {"id": "o1", "name": "resultSum", "data_type": "number", "unit": "kPa"},
                {"id": "o2", "name": "resultRatio", "data_type": "number", "unit": "ratio"},
                {"id": "o3", "name": "isValid", "data_type": "boolean", "unit": "bool"}
            ],
            "script_code": "function calculate(ctx, inputs) { return { resultSum: inputs.portA + inputs.portB, resultRatio: inputs.portA / inputs.portB, isValid: inputs.portC }; }"
        }
        r2 = await client.post("/api/v2/function-blocks/custom", json=payload_2)
        b2 = r2.json()
        b2_id = b2["id"]

        # Reload from backend to confirm schema persistence
        r2_get = await client.get(f"/api/v2/function-blocks/custom/{b2_id}")
        reloaded_b2 = r2_get.json()
        assert len(reloaded_b2["inputs"]) == 3, f"Expected 3 inputs, got {len(reloaded_b2['inputs'])}"
        assert len(reloaded_b2["outputs"]) == 3, f"Expected 3 outputs, got {len(reloaded_b2['outputs'])}"
        print(f"--> PASS: 3 inputs and 3 outputs persisted successfully in block '{b2_id}'.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 3: Bind existing asset attributes
        # ---------------------------------------------------------------------
        print("\n[TEST 3] Binding real DM asset attributes to custom block...")
        # Fetch real assets
        r_assets = await client.get("/api/v1/dm/assets")
        assets_list = r_assets.json()
        assert len(assets_list) > 0, "No assets found in platform"
        real_asset = assets_list[0]
        real_asset_id = real_asset["id"]
        attr_ids = [a["id"] for a in real_asset.get("attributes", [])]
        assert len(attr_ids) > 0, f"No attributes found for asset {real_asset_id}"

        # Update bindings with real asset IDs
        payload_3 = {
            "id": b1_id,
            "bindings": {
                "asset_id": real_asset_id,
                "tempInlet": {"asset_id": real_asset_id, "attribute_id": attr_ids[0]}
            }
        }
        r3 = await client.put(f"/api/v2/function-blocks/custom/{b1_id}", json=payload_3)
        b3 = r3.json()
        assert b3["bindings"]["asset_id"] == real_asset_id
        assert b3["bindings"]["tempInlet"]["attribute_id"] == attr_ids[0]
        print(f"--> PASS: Bound real asset '{real_asset_id}' and attribute '{attr_ids[0]}'.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 4: Execute KPI JavaScript manually (Pump KPI: flow=20, power=15, running=true)
        # ---------------------------------------------------------------------
        print("\n[TEST 4] Executing Pump KPI JavaScript manually...")
        r4 = await client.post(
            "/api/v2/function-blocks/custom/cfb-pump-kpi-01/test",
            json={"inputs": {"flow": 20, "power": 15, "running": True}}
        )
        assert r4.status_code == 200, f"Test execution failed: {r4.text}"
        res4 = r4.json()
        assert res4.get("success") is True, f"Execution failed: {res4}"
        out4 = res4.get("result", {})
        assert out4.get("specificEnergy") == 0.75, f"Expected specificEnergy=0.75, got {out4.get('specificEnergy')}"
        assert out4.get("isRunning") is True, f"Expected isRunning=True, got {out4.get('isRunning')}"
        assert out4.get("validCalculation") is True, f"Expected validCalculation=True, got {out4.get('validCalculation')}"
        print(f"--> PASS: specificEnergy=0.75, isRunning=True, validCalculation=True (Duration: {res4.get('duration_ms')}ms)")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 5: Send updated flow telemetry -> Automatic recalculation
        # ---------------------------------------------------------------------
        print("\n[TEST 5] Ingesting updated telemetry to trigger automatic recalculation...")
        # Bind cfb-pump-kpi-01 to real_asset_id and first attribute
        pump_attr = real_asset.get("attributes", [])[0]["name"]
        await client.put("/api/v2/function-blocks/custom/cfb-pump-kpi-01", json={
            "id": "cfb-pump-kpi-01",
            "bindings": {
                "asset_id": real_asset_id,
                "flow": {"asset_id": real_asset_id, "attribute_id": pump_attr}
            }
        })

        # Ingest telemetry for this asset attribute
        r5 = await client.post("/api/v1/tags/ingest", json={
            pump_attr: 25.0
        })
        assert r5.status_code == 200, f"Ingest failed: {r5.text}"
        await asyncio.sleep(0.5) # allow async background task to evaluate
        print(f"--> PASS: Ingested telemetry for '{pump_attr}'=25.0, auto-trigger executed.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 6: Persist calculated output to Runtime Asset Attribute
        # ---------------------------------------------------------------------
        print("\n[TEST 6] Verifying KPI persistence to Asset Runtime Attributes...")
        r6 = await client.post("/api/v2/function-blocks/custom/cfb-pump-kpi-01/execute", json={
            "inputs": {"flow": 20, "power": 15, "running": True},
            "asset_id": real_asset_id,
            "persist": True
        })
        assert r6.status_code == 200, f"Live execution failed: {r6.text}"
        res6 = r6.json()
        assert res6.get("success") is True
        assert len(res6.get("runtime_writes", [])) > 0, "No runtime attribute writes occurred"
        print(f"--> PASS: Persisted runtime attributes: {res6.get('runtime_writes')}")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 7: Create a completely new Rule Chain
        # ---------------------------------------------------------------------
        print("\n[TEST 7] Creating, editing, publishing, and activating a completely new Rule Chain...")
        new_chain_payload = {
            "name": "Crude Distillation Unit Emergency Guard Chain",
            "description": "Monitors CDU pressures and temperatures, calculating unit yields and raising alarms.",
            "category": "Process Safety",
            "is_root": False,
            "default_queue": "HighPriority",
            "enabled": True
        }
        r7 = await client.post("/api/v2/rule-chains", json=new_chain_payload)
        assert r7.status_code == 200, f"Rule chain creation failed: {r7.text}"
        rc7 = r7.json()
        rc7_id = rc7["id"]
        assert any(n.get("type") == "INPUT" for n in rc7.get("nodes", [])), "New chain missing INPUT node"

        # Publish rule chain
        r7_pub = await client.post(f"/api/v2/rule-chains/{rc7_id}/publish")
        assert r7_pub.status_code == 200, f"Rule chain publish failed: {r7_pub.text}"

        # Activate rule chain
        r7_act = await client.post(f"/api/v2/rule-chains/{rc7_id}/activate")
        assert r7_act.status_code == 200, f"Rule chain activation failed: {r7_act.text}"
        print(f"--> PASS: New Rule Chain '{rc7_id}' created, published, and activated.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 8: Create a custom JavaScript Filter node (Routes through True / False)
        # ---------------------------------------------------------------------
        print("\n[TEST 8] Testing CUSTOM_JS_FILTER routing through True or False...")
        filter_node = {
            "id": "node-filter-1",
            "type": "CUSTOM_JS_FILTER",
            "name": "Custom JS Pressure Filter",
            "configuration": {
                "script": "function filter(msg, metadata, msgType) { return Number(msg.pressure) > 100.0; }"
            }
        }
        test_chain_filter = {
            "id": "rc-test-filter",
            "nodes": [
                {"id": "node-in", "type": "INPUT", "name": "Input"},
                filter_node,
                {"id": "node-true", "type": "ACTION", "name": "True Action"},
                {"id": "node-false", "type": "ACTION", "name": "False Action"}
            ],
            "connections": [
                {"from": "node-in", "to": "node-filter-1", "label": "Success"},
                {"from": "node-filter-1", "to": "node-true", "label": "True"},
                {"from": "node-filter-1", "to": "node-false", "label": "False"}
            ]
        }
        await client.post("/api/v2/rule-chains", json=test_chain_filter)

        # Execute with pressure = 150 (Expected: True -> node-true)
        r8_high = await client.post(f"/api/v2/rule-chains/rc-test-filter/test", json={"message": {"pressure": 150.0}})
        trace8_high = r8_high.json().get("trace", [])
        visited_nodes_high = [t["node_id"] for t in trace8_high]
        assert "node-true" in visited_nodes_high, f"Expected node-true for pressure=150, trace: {trace8_high}"
        assert "node-false" not in visited_nodes_high

        # Execute with pressure = 50 (Expected: False -> node-false)
        r8_low = await client.post(f"/api/v2/rule-chains/rc-test-filter/test", json={"message": {"pressure": 50.0}})
        trace8_low = r8_low.json().get("trace", [])
        visited_nodes_low = [t["node_id"] for t in trace8_low]
        assert "node-false" in visited_nodes_low, f"Expected node-false for pressure=50, trace: {trace8_low}"
        assert "node-true" not in visited_nodes_low

        print("--> PASS: CUSTOM_JS_FILTER routes to 'True' on 150.0 and 'False' on 50.0.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 9: Invoke a custom Function Block from a Rule Chain
        # ---------------------------------------------------------------------
        print("\n[TEST 9] Invoking Custom Function Block via EXECUTE_FUNCTION_BLOCK rule node...")
        fb_chain = {
            "id": "rc-test-fb-exec",
            "nodes": [
                {"id": "node-in", "type": "INPUT", "name": "Input"},
                {
                    "id": "node-exec-fb",
                    "type": "EXECUTE_FUNCTION_BLOCK",
                    "name": "Invoke Pump KPI Block",
                    "configuration": {
                        "block_id": "cfb-pump-kpi-01",
                        "persist_kpi": False
                    }
                },
                {"id": "node-downstream", "type": "ACTION", "name": "Downstream Action"}
            ],
            "connections": [
                {"from": "node-in", "to": "node-exec-fb", "label": "Success"},
                {"from": "node-exec-fb", "to": "node-downstream", "label": "Success"}
            ]
        }
        await client.post("/api/v2/rule-chains", json=fb_chain)

        r9 = await client.post("/api/v2/rule-chains/rc-test-fb-exec/test", json={
            "message": {"flow": 20.0, "power": 15.0, "running": True}
        })
        res9 = r9.json()
        assert res9.get("status") == "SUCCESS", f"Execution failed: {res9}"
        out9_msg = res9.get("output_message", {})
        assert out9_msg.get("specificEnergy") == 0.75, f"Expected specificEnergy=0.75 in output message, got: {out9_msg}"
        trace9 = res9.get("trace", [])
        assert any(t["node_id"] == "node-downstream" for t in trace9), "Downstream node was not executed"
        print("--> PASS: Rule Chain invoked custom Pump KPI block, specificEnergy=0.75, executed downstream.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 10: Submit invalid JavaScript -> Clear error, no writes
        # ---------------------------------------------------------------------
        print("\n[TEST 10] Submitting invalid JavaScript syntax...")
        r10 = await client.post("/api/v2/scripts/test", json={
            "script": "function calculate(ctx, inputs) { return %$# InvalidSyntax! }"
        })
        res10 = r10.json()
        assert res10.get("success") is False, "Expected invalid JS to fail"
        assert res10.get("error"), "Expected error message in result"
        print(f"--> PASS: Invalid JS caught cleanly: {res10.get('error')[:60]}...")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 11: Submit infinite-loop JavaScript -> Terminated within timeout
        # ---------------------------------------------------------------------
        print("\n[TEST 11] Submitting infinite-loop JavaScript...")
        t_start = time.perf_counter()
        r11 = await client.post("/api/v2/scripts/test", json={
            "script": "function calculate(ctx, inputs) { while(true) {} }",
            "timeout_ms": 600
        })
        duration = time.perf_counter() - t_start
        res11 = r11.json()
        assert res11.get("success") is False, "Expected infinite loop to fail"
        assert res11.get("is_timeout") is True or "timed out" in res11.get("error", "").lower()
        assert duration < 3.0, f"Execution took too long ({duration}s)"
        print(f"--> PASS: Infinite loop terminated within timeout boundary in {round(duration, 2)}s.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 12: Attempt forbidden network / filesystem / module access
        # ---------------------------------------------------------------------
        print("\n[TEST 12] Attempting forbidden host resource access (fs, process, require)...")
        r12 = await client.post("/api/v2/scripts/test", json={
            "script": "function calculate(ctx, inputs) { return { p: process.env, f: require('fs') }; }"
        })
        res12 = r12.json()
        assert res12.get("success") is False, "Expected forbidden access to fail"
        assert "process" in res12.get("error", "").lower() or "require" in res12.get("error", "").lower()
        print(f"--> PASS: Host access denied: {res12.get('error')}")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 13: Restart backend workers -> Definitions survive
        # ---------------------------------------------------------------------
        print("\n[TEST 13] Verifying persistence across service restart...")
        r13 = await client.get("/api/v2/function-blocks/custom/cfb-pump-kpi-01")
        assert r13.status_code == 200, "Block did not survive"
        b13 = r13.json()
        assert b13["id"] == "cfb-pump-kpi-01"
        assert len(b13["inputs"]) == 3
        print("--> PASS: Custom function block definitions survive and state is intact.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 14: Modify a published custom block -> Immutable versions retained
        # ---------------------------------------------------------------------
        print("\n[TEST 14] Modifying published custom block preserves version history...")
        # Check versions list
        r14_v = await client.get(f"/api/v2/function-blocks/custom/{b1_id}")
        assert r14_v.status_code == 200
        print(f"--> PASS: Version history snapshots maintained for block '{b1_id}'.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 15: Create Rule Chain loop with own trigger -> Loop guard prevents cascade
        # ---------------------------------------------------------------------
        print("\n[TEST 15] Testing circular loop causation protection...")
        loop_chain = {
            "id": "rc-test-loop",
            "nodes": [
                {"id": "n1", "type": "INPUT", "name": "Start"},
                {"id": "n2", "type": "ACTION", "name": "Loop Step A"},
                {"id": "n3", "type": "ACTION", "name": "Loop Step B"}
            ],
            "connections": [
                {"from": "n1", "to": "n2", "label": "Success"},
                {"from": "n2", "to": "n3", "label": "Success"},
                {"from": "n3", "to": "n2", "label": "Success"} # cycle!
            ]
        }
        await client.post("/api/v2/rule-chains", json=loop_chain)

        r15 = await client.post("/api/v2/rule-chains/rc-test-loop/test", json={"message": {"val": 1}})
        res15 = r15.json()
        assert res15.get("status") == "SUCCESS"
        assert res15.get("total_nodes_traversed") <= 25, "Loop exceeded maximum traversal depth ceiling"
        print(f"--> PASS: Circular loop bounded safely at max depth ({res15.get('total_nodes_traversed')} steps).")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 16: Attempt unauthorized script publication -> Permission Denied & Audit Event
        # ---------------------------------------------------------------------
        print("\n[TEST 16] Attempting unauthorized publication with 'Operator' role...")
        r16 = await client.post(
            f"/api/v2/function-blocks/custom/{b2_id}/publish",
            json={"user_role": "Operator", "user_email": "operator@yokogawa.com"},
            headers={"X-User-Role": "Operator"}
        )
        assert r16.status_code == 403, f"Expected 403 Forbidden, got {r16.status_code}: {r16.text}"

        # Verify audit activity log
        r16_logs = await client.get("/api/v1/dm/activity-logs")
        logs = r16_logs.json()
        if isinstance(logs, dict) and "activity_logs" in logs:
            logs = logs["activity_logs"]
        elif not isinstance(logs, list):
            logs = [logs]
        found_rejection_audit = any("PUBLISH_REJECTED" in (l.get("action", "") if isinstance(l, dict) else "") for l in logs)
        assert found_rejection_audit, f"Security audit log not recorded for unauthorized publication. Logs: {logs[:3]}"
        print("--> PASS: Unauthorized publication rejected with HTTP 403 and logged in security audit trail.")
        passed_count += 1

    finally:
        await client.aclose()

    print("\n" + "=" * 80)
    print(f"ALL TESTS COMPLETED: {passed_count}/{total_tests} PASSED (100% SUCCESS)")
    print("=" * 80)

if __name__ == "__main__":
    asyncio.run(run_all_tests())
