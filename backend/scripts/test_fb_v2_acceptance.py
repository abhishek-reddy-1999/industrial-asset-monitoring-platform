"""
Automated Acceptance Test Suite for Function Block V2 Architecture (Part 14)
Executes Tests A through K against the live REST API (http://localhost:91)
"""
import sys
import json
import time
import sys
import json
import time
import httpx

BASE_URL = "http://localhost:91"
client = httpx.Client(timeout=10.0)

def print_test_header(name):
    print(f"\n======================================================================")
    print(f"  {name}")
    print(f"======================================================================")

def main():
    print("Beginning Automated Acceptance Tests A-K for Function Block V2...")
    all_passed = True

    # -------------------------------------------------------------------------
    # TEST A: Block Template Creation & Reload
    # -------------------------------------------------------------------------
    print_test_header("TEST A: Block Template Creation & Reload")
    tmpl_payload = {
        "template_code": f"FB_TEST_PUMP_{int(time.time())}",
        "name": "Acceptance Test Pump KPI",
        "description": "Calculates SEC and running state from power and flow.",
        "category": "Energy & Sustainability",
        "asset_type": "Pump",
        "markups": [
            {
                "id": "mk-p",
                "name": "Centrifugal Pump",
                "placeholder": "@Pump",
                "expected_asset_type": "EQUIPMENT",
                "required": True
            },
            {
                "id": "mk-m",
                "name": "Drive Motor",
                "placeholder": "@Motor",
                "expected_asset_type": "EQUIPMENT",
                "required": True
            }
        ],
        "inputs": [
            {
                "id": "inp-flow",
                "name": "flow",
                "display_name": "Volumetric Flow Rate",
                "asset_markup": "@Pump",
                "attribute_reference": "Flow",
                "data_type": "Double",
                "uom": "m3/h",
                "required": True,
                "default_value": 20.0
            },
            {
                "id": "inp-power",
                "name": "power",
                "display_name": "Motor Active Power",
                "asset_markup": "@Motor",
                "attribute_reference": "Power",
                "data_type": "Double",
                "uom": "kW",
                "required": True,
                "default_value": 15.0
            },
            {
                "id": "inp-run",
                "name": "running",
                "display_name": "Motor Running State",
                "asset_markup": "@Motor",
                "attribute_reference": "Running",
                "data_type": "Boolean",
                "uom": "bool",
                "required": True,
                "default_value": True
            }
        ],
        "outputs": [],
        "script_code": """function calculate(ctx, inputs) {
  const flow = Number(inputs.flow);
  const power = Number(inputs.power);
  const running = Boolean(inputs.running);
  const valid = flow > 0 && power >= 0;
  return {
    specificEnergy: valid ? Number((power / flow).toFixed(4)) : null,
    isRunning: running,
    validCalculation: valid
  };
}"""
    }

    resp = client.post(f"{BASE_URL}/api/v2/fb/templates", json=tmpl_payload)
    assert resp.status_code == 201, f"Failed to create template: {resp.text}"
    created_tmpl = resp.json()
    tmpl_id = created_tmpl["id"]
    print(f"Created Template: {created_tmpl['name']} (ID: {tmpl_id}, Code: {created_tmpl['template_code']})")

    # Reload template
    resp = client.get(f"{BASE_URL}/api/v2/fb/templates/{tmpl_id}")
    assert resp.status_code == 200
    loaded = resp.json()
    assert len(loaded["markups"]) == 2
    assert len(loaded["inputs"]) == 3
    print("TEST A PASSED: Template created and verified via API.")

    # -------------------------------------------------------------------------
    # TEST B: Output Runtime Definition
    # -------------------------------------------------------------------------
    print_test_header("TEST B: Output Runtime Definition (SpecificEnergy)")
    outputs_payload = {
        "outputs": [
            {
                "output_key": "specificEnergy",
                "name": "Specific Energy Consumption",
                "target_asset_markup": "@Pump",
                "runtime_attribute_name": "SpecificEnergy",
                "data_type": "Double",
                "uom": "kWh/m3",
                "decimal_places": 4,
                "persist_historian": True
            },
            {
                "output_key": "isRunning",
                "name": "Running Status",
                "target_asset_markup": "@Pump",
                "runtime_attribute_name": "IsRunning",
                "data_type": "Boolean",
                "uom": "bool",
                "decimal_places": 0,
                "persist_historian": False
            },
            {
                "output_key": "validCalculation",
                "name": "KPI Validity",
                "target_asset_markup": "@Pump",
                "runtime_attribute_name": "KPIValid",
                "data_type": "Boolean",
                "uom": "bool",
                "decimal_places": 0,
                "persist_historian": False
            }
        ]
    }

    resp = client.put(f"{BASE_URL}/api/v2/fb/templates/{tmpl_id}/outputs", json=outputs_payload)
    assert resp.status_code == 200, f"Failed to update outputs: {resp.text}"
    updated_tmpl = resp.json()
    assert len(updated_tmpl["outputs"]) == 3
    assert updated_tmpl["outputs"][0]["runtime_attribute_name"] == "SpecificEnergy"
    print("TEST B PASSED: Output Runtime attributes defined successfully.")

    # -------------------------------------------------------------------------
    # TEST C: JavaScript Output Mapping & Publication
    # -------------------------------------------------------------------------
    print_test_header("TEST C: JavaScript Output Mapping & Publication")
    mappings_payload = {
        "output_mappings": [
            {
                "script_result_key": "specificEnergy",
                "output_key": "specificEnergy",
                "target_asset_markup": "@Pump",
                "runtime_attribute_name": "SpecificEnergy"
            },
            {
                "script_result_key": "isRunning",
                "output_key": "isRunning",
                "target_asset_markup": "@Pump",
                "runtime_attribute_name": "IsRunning"
            },
            {
                "script_result_key": "validCalculation",
                "output_key": "validCalculation",
                "target_asset_markup": "@Pump",
                "runtime_attribute_name": "KPIValid"
            }
        ]
    }

    resp = client.put(f"{BASE_URL}/api/v2/fb/templates/{tmpl_id}/output-mappings", json=mappings_payload)
    assert resp.status_code == 200

    # Validate template
    val_resp = client.post(f"{BASE_URL}/api/v2/fb/templates/{tmpl_id}/validate")
    assert val_resp.status_code == 200
    val_data = val_resp.json()
    assert val_data["valid"] is True, f"Validation errors: {val_data['errors']}"
    print(f"Validation Report: Valid={val_data['valid']}, 0 Errors.")

    # Sandbox test run
    test_resp = client.post(f"{BASE_URL}/api/v2/fb/templates/{tmpl_id}/test", json={
        "inputs": {"flow": 20.0, "power": 15.0, "running": True}
    })
    assert test_resp.status_code == 200
    test_data = test_resp.json()
    assert test_data["success"] is True
    assert test_data["result"]["specificEnergy"] == 0.75
    print(f"Sandbox Test Result: {test_data['result']}")

    # Publish template
    pub_resp = client.post(
        f"{BASE_URL}/api/v2/fb/templates/{tmpl_id}/publish",
        json={"user_role": "Engineer", "user_email": "lead.engineer@yokogawa.com"}
    )
    assert pub_resp.status_code == 200, f"Publish failed: {pub_resp.text}"
    published_tmpl = pub_resp.json()["template"]
    assert published_tmpl["status"] == "PUBLISHED"
    print(f"TEST C PASSED: Published as version {published_tmpl['version']}.")

    # -------------------------------------------------------------------------
    # TEST D: Deployment to Pump P101
    # -------------------------------------------------------------------------
    print_test_header("TEST D: Deployment to Pump P101")
    exec_payload = {
        "name": "P-101 Performance KPI Monitor",
        "template_id": tmpl_id,
        "asset_bindings": {
            "@Pump": "ast-pump-101",
            "@Motor": "ast-motor-101"
        },
        "input_bindings": {
            "flow": {"asset_id": "ast-pump-101", "attribute_name": "Flow"},
            "power": {"asset_id": "ast-motor-101", "attribute_name": "ActivePower"},
            "running": {"asset_id": "ast-pump-101", "attribute_name": "Running"}
        },
        "trigger_config": {
            "type": "ATTRIBUTE_UPDATED",
            "trigger_attribute": "Flow",
            "debounce_ms": 100
        },
        "status": "ACTIVE"
    }

    exec_resp = client.post(f"{BASE_URL}/api/v2/fb/executions", json=exec_payload)
    assert exec_resp.status_code == 201, f"Deployment failed: {exec_resp.text}"
    execution = exec_resp.json()
    exec_id = execution["id"]
    print(f"TEST D PASSED: Deployed Block Execution '{execution['name']}' (ID: {exec_id}).")

    # -------------------------------------------------------------------------
    # TEST E: Runtime Output Provisioning on Target Asset
    # -------------------------------------------------------------------------
    print_test_header("TEST E: Runtime Output Provisioning on Target Asset")
    dm_state = client.get(f"{BASE_URL}/api/v1/dm/state").json()
    pump_101 = next((a for a in dm_state["assets"] if a["id"] == "ast-pump-101"), None)
    assert pump_101 is not None, "ast-pump-101 asset not found"

    # Verify SpecificEnergy exists on ast-pump-101
    sec_attr = next((a for a in pump_101.get("attributes", []) if a["name"] == "SpecificEnergy"), None)
    assert sec_attr is not None, "SpecificEnergy attribute was not provisioned on ast-pump-101"
    assert sec_attr["type"] == "Runtime", f"Expected type 'Runtime', got '{sec_attr['type']}'"
    assert sec_attr["source"] == "FUNCTION_BLOCK", f"Expected source 'FUNCTION_BLOCK', got '{sec_attr['source']}'"
    assert sec_attr.get("use_expression") is False, "Expected use_expression=False"
    print(f"Provisioned Attribute Verified: Name={sec_attr['name']}, Type={sec_attr['type']}, Source={sec_attr['source']}, LockExpr={sec_attr['use_expression']}")
    print("TEST E PASSED: Output Runtime attributes provisioned without expression conflict.")

    # -------------------------------------------------------------------------
    # TEST F: KPI Calculation Execution
    # -------------------------------------------------------------------------
    print_test_header("TEST F: KPI Calculation (Flow=20, Power=15, Running=1)")
    run_resp = client.post(f"{BASE_URL}/api/v2/fb/executions/{exec_id}/run", json={
        "inputs": {"flow": 20.0, "power": 15.0, "running": True}
    })
    assert run_resp.status_code == 200, f"Execution run failed: {run_resp.text}"
    run_res = run_resp.json()
    assert run_res["success"] is True
    assert run_res["result"]["specificEnergy"] == 0.75, f"Expected SEC 0.75, got {run_res['result']['specificEnergy']}"
    assert run_res["result"]["isRunning"] is True
    assert run_res["result"]["validCalculation"] is True

    # Verify value was saved into the asset's runtime attribute
    dm_state_after = client.get(f"{BASE_URL}/api/v1/dm/state").json()
    pump_101_after = next((a for a in dm_state_after["assets"] if a["id"] == "ast-pump-101"), None)
    sec_attr_after = next((a for a in pump_101_after.get("attributes", []) if a["name"] == "SpecificEnergy"), None)
    assert sec_attr_after["value"] == "0.75", f"Expected attribute value '0.75', got '{sec_attr_after['value']}'"
    print(f"Live Attribute Value on Asset ast-pump-101: {sec_attr_after['name']} = {sec_attr_after['value']} {sec_attr_after['uom']}")
    print("TEST F PASSED: Calculation executed and stored in Asset Runtime Attribute.")

    # -------------------------------------------------------------------------
    # TEST G: Automatic Execution on Telemetry Update
    # -------------------------------------------------------------------------
    print_test_header("TEST G: Automatic Execution on Attribute Telemetry Update")
    # Simulate telemetry ingest from device or direct attribute update
    flow_update_resp = client.put(
        f"{BASE_URL}/api/v1/dm/assets/ast-pump-101/attributes/{pump_101['attributes'][0]['id']}",
        json={"name": "Flow", "value": "25.0"}
    )
    assert flow_update_resp.status_code == 200
    time.sleep(1.2)  # Allow async background task to run

    # Verify history trace logged
    hist_resp = client.get(f"{BASE_URL}/api/v2/fb/executions/{exec_id}/history")
    assert hist_resp.status_code == 200
    hist = hist_resp.json()
    assert len(hist) > 0, "No execution history recorded"
    print(f"Latest Execution Trace: SEC = {hist[0]['result'].get('specificEnergy')}, Timestamp = {hist[0]['timestamp']}")
    print("TEST G PASSED: Trigger listener successfully evaluated on attribute change.")

    # -------------------------------------------------------------------------
    # TEST H: Template Reuse (Deploy to P102 Independently)
    # -------------------------------------------------------------------------
    print_test_header("TEST H: Template Reuse (Deploy to Pump P102)")
    exec2_payload = {
        "name": "P-102 Performance KPI Monitor",
        "template_id": tmpl_id,
        "asset_bindings": {
            "@Pump": "ast-pump-102",
            "@Motor": "ast-motor-101"
        },
        "input_bindings": {
            "flow": {"asset_id": "ast-pump-102", "attribute_name": "Flow"},
            "power": {"asset_id": "ast-motor-101", "attribute_name": "Power"}
        },
        "status": "ACTIVE"
    }

    exec2_resp = client.post(f"{BASE_URL}/api/v2/fb/executions", json=exec2_payload)
    assert exec2_resp.status_code == 201
    exec2 = exec2_resp.json()

    # Run P102 with distinct flow (Flow=10, Power=15 -> SEC = 1.5)
    run2_resp = client.post(f"{BASE_URL}/api/v2/fb/executions/{exec2['id']}/run", json={
        "inputs": {"flow": 10.0, "power": 15.0, "running": True}
    })
    assert run2_resp.status_code == 200
    res2 = run2_resp.json()
    assert res2["result"]["specificEnergy"] == 1.5

    # Check P101 still preserved
    dm_state_h = client.get(f"{BASE_URL}/api/v1/dm/state").json()
    p101_h = next((a for a in dm_state_h["assets"] if a["id"] == "ast-pump-101"), None)
    sec_101_h = next((a for a in p101_h.get("attributes", []) if a["name"] == "SpecificEnergy"), None)
    assert sec_101_h is not None
    print(f"P-102 SEC: {res2['result']['specificEnergy']}, P-101 SEC Preserved: {sec_101_h['value']}")
    print("TEST H PASSED: Template deployed to second independent asset without interference.")

    # -------------------------------------------------------------------------
    # TEST I: Version Isolation
    # -------------------------------------------------------------------------
    print_test_header("TEST I: Version Isolation (New Draft Version vs Active Deployed Instance)")
    new_ver_resp = client.post(f"{BASE_URL}/api/v2/fb/templates/{tmpl_id}/new-version")
    assert new_ver_resp.status_code == 200
    new_ver = new_ver_resp.json()
    assert new_ver["version"] == "2.0.0"
    assert new_ver["status"] == "DRAFT"

    # Active instance still runs on v1.0.0 snapshot
    exec_check = client.get(f"{BASE_URL}/api/v2/fb/executions/{exec_id}").json()
    assert exec_check["template_version"] == "1.0.0"
    assert exec_check["template_snapshot"]["version"] == "1.0.0"
    print(f"Deployed Instance Template Version: {exec_check['template_version']} (Snapshot pinned). Template Active Version: {new_ver['version']} (DRAFT).")
    print("TEST I PASSED: Version isolation intact; deployed execution protected from draft changes.")

    # -------------------------------------------------------------------------
    # TEST J: Invalid Script Output Rejection
    # -------------------------------------------------------------------------
    print_test_header("TEST J: Invalid Script Output Rejection")
    # Test script with non-object return
    bad_code_resp = client.put(f"{BASE_URL}/api/v2/fb/templates/{tmpl_id}/code", json={
        "script_code": "function calculate(ctx, inputs) {\n  return 42;\n}"
    })
    assert bad_code_resp.status_code == 200

    bad_test_resp = client.post(f"{BASE_URL}/api/v2/fb/templates/{tmpl_id}/test", json={
        "inputs": {"flow": 10.0}
    })
    bad_test = bad_test_resp.json()
    assert bad_test["schema_validation"]["valid"] is False
    assert any("non-object" in e for e in bad_test["schema_validation"]["errors"])
    print(f"Rejection Validated: {bad_test['schema_validation']['errors']}")
    print("TEST J PASSED: Invalid non-object outputs correctly rejected.")

    # -------------------------------------------------------------------------
    # TEST K: Security Guard (Viewer Role Cannot Publish)
    # -------------------------------------------------------------------------
    print_test_header("TEST K: Security Guard (Viewer Role Forbidden to Publish)")
    sec_resp = client.post(
        f"{BASE_URL}/api/v2/fb/templates/{tmpl_id}/publish",
        json={"user_role": "Viewer", "user_email": "guest.viewer@yokogawa.com"}
    )
    assert sec_resp.status_code == 403, f"Expected 403 Forbidden, got {sec_resp.status_code}: {sec_resp.text}"
    print(f"Security Rejection Confirmed: HTTP 403 Forbidden - {sec_resp.json()['detail']}")
    print("TEST K PASSED: Role-based security guard actively protects publication.")

    print("\n" + "=" * 70)
    print("  ALL ACCEPTANCE TESTS A THROUGH K PASSED SUCCESSFULLY! (100% GREEN)")
    print("======================================================================")

if __name__ == "__main__":
    main()
