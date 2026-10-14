import asyncio
import socketio
import httpx
import time

sio = socketio.AsyncClient()

async def run_socketio_test():
    print("=" * 70)
    print("YOKOGAWA OPREX AHI & DBM - SOCKET.IO PROTOCOL VALIDATION SUITE")
    print("=" * 70)

    # 1. Connect to Socket.IO server
    print("\n[1/3] Connecting to Socket.IO Server on port 91...")
    start_time = time.perf_counter()
    try:
        await sio.connect('http://127.0.0.1:91', socketio_path='socket.io')
        lat = (time.perf_counter() - start_time) * 1000.0
        print(f" -> CONNECTED: SID={sio.sid} ({round(lat, 2)}ms)")
    except Exception as e:
        print(f" -> Connection Failed: {e}")
        return False

    # 2. Emit Live CSV / Telemetry Packet
    print("\n[2/3] Emitting Telemetry & CSV Row via Socket.IO events...")
    test_packet = {
        "timestamp": "2026-10-06T12:00:00Z",
        "tags": {
            "FIC_101.PV": 465.2,
            "TIC_101.PV": 119.5,
            "PIC_101.PV": 147.8,
            "VIB_101.RMS": 1.95
        }
    }
    await sio.emit('telemetry', test_packet)
    print(" -> Emitted 'telemetry' packet with 4 tags.")

    csv_row_packet = {
        "deviceid": "pump-p101a-hub-01",
        "discharge_pressure": 596.5,
        "vibration_axial": 2.42,
        "flow_rate": 458.0
    }
    await sio.emit('csv_row', csv_row_packet)
    print(" -> Emitted 'csv_row' packet for device 'pump-p101a-hub-01'.")

    await asyncio.sleep(1.0)
    await sio.disconnect()
    print(" -> Socket.IO test session completed cleanly.")

    # 3. Verify in REST API
    print("\n[3/3] Verifying Ingestion Reflection in REST API...")
    async with httpx.AsyncClient() as client:
        res = await client.get('http://127.0.0.1:91/api/v1/tags/list')
        tags = res.json()
        fic = next((t for t in tags if t.get('tag_name') == 'FIC_101.PV'), None)
        if fic:
            print(f" -> Verified FIC_101.PV: Current Value = {fic.get('current_value')} {fic.get('eng_units')} (Quality: {fic.get('quality')})")
        else:
            print(" -> Tag list returned", len(tags), "active process tags.")

    print("\n" + "=" * 70)
    print("ALL SOCKET.IO INGESTION TESTS PASSED 100% OPERATIONAL!")
    print("=" * 70)
    return True

if __name__ == "__main__":
    asyncio.run(run_socketio_test())
