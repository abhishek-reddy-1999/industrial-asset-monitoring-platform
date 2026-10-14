import requests
import os
import json

PUBLIC_ID = "7aa99e80-8acd-11ef-a59e-a9c993dbec14"
BASE_URL = "https://thingsboard.cloud"

# 1. Login public
login_url = f"{BASE_URL}/api/auth/login/public"
resp = requests.post(login_url, json={"publicId": PUBLIC_ID})
token = None
if resp.status_code == 200:
    token = resp.json().get("token")
    print(f"Logged in successfully, token length: {len(token) if token else 0}")
else:
    print(f"Public login response: {resp.status_code}")

# Target directory for SVGs
out_dir = "frontend/public/assets/scada/thingsboard_svg"
os.makedirs(out_dir, exist_ok=True)

svg_list = [
    "/api/images/system/bottom-right-elbow-connector-hp.svg",
    "/api/images/system/bottom-right-elbow-pipe.svg",
    "/api/images/system/bottom-tee-connector-hp.svg",
    "/api/images/system/bottom-tee-pipe.svg",
    "/api/images/system/control-panel-hp.svg",
    "/api/images/system/cross-connector-hp.svg",
    "/api/images/system/cross-pipe.svg",
    "/api/images/system/filter-hp.svg",
    "/api/images/system/heat-pump-hp.svg",
    "/api/images/system/horizontal-ball-valve.svg",
    "/api/images/system/horizontal-connector-hp.svg",
    "/api/images/system/horizontal-inline-flow-meter.svg",
    "/api/images/system/horizontal-pipe.svg",
    "/api/images/system/horizontal-valve-hp.svg",
    "/api/images/system/horizontal-wheel-valve.svg",
    "/api/images/system/left-analog-water-level-meter.svg",
    "/api/images/system/left-bottom-elbow-connector-hp.svg",
    "/api/images/system/left-bottom-elbow-pipe.svg",
    "/api/images/system/left-heat-pump.svg",
    "/api/images/system/left-top-elbow-connector-hp.svg",
    "/api/images/system/left-top-elbow-pipe.svg",
    "/api/images/system/long-horizontal-connector-hp.svg",
    "/api/images/system/long-horizontal-pipe.svg",
    "/api/images/system/long-vertical-connector-hp.svg",
    "/api/images/system/long-vertical-pipe.svg",
    "/api/images/system/pool-hp.svg",
    "/api/images/system/pool.svg",
    "/api/images/system/pump-hp.svg",
    "/api/images/system/right-elbow-drain-pipe.svg",
    "/api/images/system/right-motor-pump.svg",
    "/api/images/system/sand-filter-hp.svg",
    "/api/images/system/sand-filter.svg",
    "/api/images/system/short-bottom-filter.svg",
    "/api/images/system/simple-horizontal-scale-hp.svg",
    "/api/images/system/simple-vertical-scale-hp.svg",
    "/api/images/system/top-right-elbow-connector-hp.svg",
    "/api/images/system/top-right-elbow-pipe.svg",
    "/api/images/system/vertical-ball-valve.svg",
    "/api/images/system/vertical-connector-hp.svg",
    "/api/images/system/vertical-pipe.svg",
    "/api/images/system/vertical-valve-hp.svg",
    "/api/images/system/vertical-wheel-valve.svg",
]

headers = {}
if token:
    headers["X-Authorization"] = f"Bearer {token}"

downloaded = 0
for svg_path in svg_list:
    filename = os.path.basename(svg_path)
    url = f"{BASE_URL}{svg_path}"
    try:
        r = requests.get(url, headers=headers)
        if r.status_code == 200:
            target_path = os.path.join(out_dir, filename)
            with open(target_path, "wb") as f:
                f.write(r.content)
            downloaded += 1
            print(f"Downloaded {filename} ({len(r.content)} bytes)")
        else:
            print(f"Failed {filename}: HTTP {r.status_code}")
    except Exception as e:
        print(f"Error {filename}: {e}")

print(f"\nTotal downloaded: {downloaded} / {len(svg_list)}")
