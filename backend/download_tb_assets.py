import urllib.request
import os

images = [
    "https://img.thingsboard.io/usecases/scada/traditional.webp",
    "https://img.thingsboard.io/usecases/scada/high-performance.webp",
    "https://img.thingsboard.io/usecases/scada/sand-filter-state.webp",
    "https://img.thingsboard.io/usecases/scada/hp-sand-filter-state.webp",
    "https://img.thingsboard.io/usecases/scada/water-pump-state.webp",
    "https://img.thingsboard.io/usecases/scada/hp-water-pump-state.webp",
    "https://img.thingsboard.io/usecases/scada/heat-pump-state.webp",
    "https://img.thingsboard.io/usecases/scada/hp-heat-pump-state.webp",
    "https://img.thingsboard.io/usecases/scada/swiming-pool-system-state.webp",
    "https://img.thingsboard.io/usecases/scada/hp-swiming-pool-system-state.webp",
    "https://img.thingsboard.io/usecases/scada/gateway.webp",
    "https://img.thingsboard.io/usecases/scada/hp-gateway.webp",
    "https://img.thingsboard.io/usecases/scada/pipe.svg",
    "https://img.thingsboard.io/usecases/scada/fluid.svg",
    "https://img.thingsboard.io/usecases/scada/fluid-filtration.svg",
    "https://img.thingsboard.io/usecases/scada/pump-monitoring-management.svg",
    "https://img.thingsboard.io/usecases/scada/flow-regulation.svg",
    "https://img.thingsboard.io/usecases/scada/connectors.svg",
    "https://img.thingsboard.io/usecases/scada/tank-level-monitoring.svg",
    "https://img.thingsboard.io/usecases/scada/flow.svg",
    "https://img.thingsboard.io/usecases/scada/tank.svg",
    "https://img.thingsboard.io/usecases/scada/pump.svg",
]

dest_dir = "frontend/public/assets/scada/thingsboard"
os.makedirs(dest_dir, exist_ok=True)

for url in images:
    name = url.split('/')[-1]
    dest_path = os.path.join(dest_dir, name)
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as resp:
            data = resp.read()
            with open(dest_path, 'wb') as f:
                f.write(data)
            print(f"Downloaded {name} ({len(data)} bytes)")
    except Exception as e:
        print(f"Failed {name}: {e}")
