"""
test_widget_studio.py - Automated Unit & Integration Tests for Module 1 Widget Studio
Tests:
1. Widget categories and bundles listing
2. 38+ built-in widget type definitions and schemas
3. Custom widget template creation (CRUD)
4. Custom widget updating and version publishing
5. Widget action execution (RPC command simulation & audit logging)
6. Widget package export and import
7. Live preview telemetry stream endpoint
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from fastapi.testclient import TestClient
from app.main import fastapi_app

client = TestClient(fastapi_app)

def test_widget_categories():
    response = client.get("/api/v1/widgets/categories")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    categories = response.json()
    assert len(categories) >= 7, f"Expected at least 7 categories, got {len(categories)}"
    category_ids = [c["id"] for c in categories]
    assert "trends" in category_ids
    assert "gauges" in category_ids
    assert "controls" in category_ids
    assert "process" in category_ids
    assert "analytics" in category_ids
    print(f"[PASS] Widget Categories: {len(categories)} categories verified")

def test_widget_bundles():
    response = client.get("/api/v1/widgets/bundles")
    assert response.status_code == 200
    bundles = response.json()
    assert len(bundles) >= 6
    bundle_ids = [b["id"] for b in bundles]
    assert "LATEST_VALUES" in bundle_ids
    assert "TIME_SERIES" in bundle_ids
    assert "CONTROL_WIDGETS" in bundle_ids
    assert "ALARM_WIDGETS" in bundle_ids
    assert "ANALYTICS_SPC" in bundle_ids
    print(f"[PASS] Widget Bundles: {len(bundles)} bundles verified")

def test_widget_types():
    response = client.get("/api/v1/widgets/types")
    assert response.status_code == 200
    types = response.json()
    assert len(types) >= 38, f"Expected at least 38 widget types, got {len(types)}"
    type_names = [t["type"] for t in types]
    
    # Verify core requested types from prompt
    required_types = [
        "timeseries", "area_chart", "bar_chart", "pie_chart", "donut_chart",
        "scatter_plot", "heatmap", "histogram", "box_plot", "gauge",
        "radial_gauge", "linear_gauge", "kpi_card", "status_card", "entity_card",
        "alarm_card", "data_table", "entity_table", "alarm_table", "state_timeline",
        "status_history", "map", "image_map", "text", "markdown", "html",
        "button", "switch", "slider", "setpoint", "tank", "pump", "motor", "valve",
        "fft_chart", "vibration_spectrum", "waterfall_chart", "pareto_chart", "control_chart"
    ]
    for req in required_types:
        assert req in type_names, f"Missing required widget type: {req}"
    print(f"[PASS] Widget Types: All {len(types)} industrial widget types verified")

def test_widget_library():
    response = client.get("/api/v1/widgets/library")
    assert response.status_code == 200
    library = response.json()
    assert len(library) >= 38
    print(f"[PASS] Widget Library: {len(library)} active widgets in catalog")

def test_custom_widget_crud_and_publishing():
    # 1. Create custom widget
    new_widget_payload = {
        "title": "Superheater Steam Temperature SPC Monitor",
        "type": "control_chart",
        "category": "analytics",
        "bundle": "ANALYTICS_SPC",
        "tags": ["TIC_102.PV"],
        "properties": {"cl": 235.8, "ucl": 245.0, "lcl": 226.0, "unit": "°C"}
    }
    create_res = client.post("/api/v1/widgets", json=new_widget_payload)
    assert create_res.status_code == 200
    created = create_res.json()
    widget_id = created["id"]
    assert created["status"] == "DRAFT"
    assert created["title"] == "Superheater Steam Temperature SPC Monitor"

    # 2. Update widget
    update_res = client.put(f"/api/v1/widgets/{widget_id}", json={
        "title": "Superheater Steam Temperature SPC Monitor v2",
        "description": "Updated Shewhart control limits"
    })
    assert update_res.status_code == 200
    assert update_res.json()["title"] == "Superheater Steam Temperature SPC Monitor v2"

    # 3. Publish widget
    publish_res = client.post(f"/api/v1/widgets/{widget_id}/publish?version=1.1.0")
    assert publish_res.status_code == 200
    published = publish_res.json()
    assert published["status"] == "PUBLISHED"
    assert published["widget"]["version"] == "1.1.0"

    # 4. Trigger Widget Action
    action_res = client.post(f"/api/v1/widgets/{widget_id}/action", json={
        "type": "RPC_COMMAND",
        "payload": {"method": "setPoint", "value": 236.5}
    })
    assert action_res.status_code == 200
    assert action_res.json()["status"] == "EXECUTED"

    # 5. Export and Import Package
    export_res = client.post("/api/v1/widgets/export", json={"widgetIds": [widget_id]})
    assert export_res.status_code == 200
    package = export_res.json()
    assert package["format"] == "INDUSTRIAL_WIDGET_PACKAGE_V2"
    assert len(package["widgets"]) == 1

    import_res = client.post("/api/v1/widgets/import", json=package)
    assert import_res.status_code == 200
    assert import_res.json()["imported"] >= 1

    # 6. Delete custom widget
    del_res = client.delete(f"/api/v1/widgets/{widget_id}")
    assert del_res.status_code == 200

    print("[PASS] Custom Widget Lifecycle: CRUD, Publish, Action dispatch, Export/Import verified")

def test_preview_telemetry():
    response = client.get("/api/v1/widgets/preview/telemetry")
    assert response.status_code == 200
    data = response.json()
    assert "tags" in data
    assert "TIC_101.PV" in data["tags"]
    assert "PIC_101.PV" in data["tags"]
    assert "vibration_waveform" in data
    assert "fft_spectrum" in data
    print("[PASS] Preview Telemetry: Real-time multi-tag snapshot stream verified")

if __name__ == "__main__":
    print("--- RUNNING MODULE 1 WIDGET STUDIO VERIFICATION SUITE ---")
    test_widget_categories()
    test_widget_bundles()
    test_widget_types()
    test_widget_library()
    test_custom_widget_crud_and_publishing()
    test_preview_telemetry()
    print("--- ALL MODULE 1 WIDGET STUDIO TESTS PASSED CLEANLY ---")
