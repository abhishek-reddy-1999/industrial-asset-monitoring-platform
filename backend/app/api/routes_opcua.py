from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.collector.opcua_client import opcua_manager

router = APIRouter(prefix="/opcua", tags=["OPC UA Integration Gateway"])

class OpcUaConnectRequest(BaseModel):
    endpoint: str
    security_policy: Optional[str] = "None"
    username: Optional[str] = None
    password: Optional[str] = None

@router.get("/status")
async def get_opcua_status():
    return {
        "endpoint": opcua_manager.endpoint,
        "is_connected": opcua_manager.is_connected,
        "monitored_nodes_count": len(opcua_manager.monitored_nodes),
        "protocol": "OPC Unified Architecture (IEC 62541)",
        "supported_profiles": ["DA (Data Access)", "A&C (Alarms & Conditions)", "HA (Historical Access)"]
    }

@router.post("/connect")
async def connect_opcua(req: OpcUaConnectRequest):
    opcua_manager.endpoint = req.endpoint
    await opcua_manager.disconnect()
    # Trigger reconnect
    try:
        from asyncua import Client
        test_client = Client(url=req.endpoint, timeout=5)
        await test_client.connect()
        await test_client.disconnect()
        opcua_manager.is_connected = True
        return {"status": "SUCCESS", "message": f"Successfully validated connection to {req.endpoint}"}
    except Exception as e:
        return {"status": "FAILED", "message": f"Could not connect to {req.endpoint}: {str(e)}"}

@router.get("/browse")
async def browse_opcua(node_id: Optional[str] = None):
    nodes = await opcua_manager.browse_address_space(node_id)
    return {"nodes": nodes}
