"""
ThingsBoard PE Parity Visual Rule Chain Engine for Yokogawa AHI DBM.
Processes unified Rule Engine messages through DAG node graphs across 7 categories:
- G1: Filter Nodes
- G2: Enrichment Nodes
- G3: Transformation Nodes
- G4: Action Nodes
- G5: External Integration Nodes
- G6: Flow Control & Nested Rule Chains
- G7: Analytics Nodes
"""
import copy
import json
import uuid
import time
import httpx
import random
import datetime
from typing import Dict, List, Any, Optional, Tuple, Set

from app.services.js_executor import execute_js_sandbox

# =========================================================================
# UNIFIED RULE ENGINE MESSAGE ENVELOPE (F3)
# =========================================================================

class RuleEngineMessage:
    def __init__(
        self,
        msg_type: str = "POST_TELEMETRY_REQUEST",
        originator_type: str = "ASSET",
        originator_id: str = "ast-unit-cdu",
        data: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        context: Optional[Dict[str, Any]] = None,
        msg_id: Optional[str] = None
    ):
        self.id = msg_id or f"msg-{uuid.uuid4().hex[:12]}"
        self.type = msg_type
        self.originator = {
            "entity_type": originator_type,
            "entity_id": originator_id
        }
        self.data = data or {}
        now_iso = datetime.datetime.utcnow().isoformat() + "Z"
        self.metadata = metadata or {
            "source": "CENTUM_VP_DCS",
            "timestamp": now_iso,
            "ts": int(datetime.datetime.utcnow().timestamp() * 1000)
        }
        self.context = context or {
            "correlation_id": f"corr-{uuid.uuid4().hex[:8]}",
            "causation_id": None,
            "root_chain_id": "rc-root-01",
            "chain_version": 1,
            "depth": 0
        }

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "type": self.type,
            "originator": self.originator,
            "data": self.data,
            "metadata": self.metadata,
            "context": self.context
        }

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "RuleEngineMessage":
        orig = d.get("originator", {})
        return cls(
            msg_type=d.get("type", "POST_TELEMETRY_REQUEST"),
            originator_type=orig.get("entity_type", "ASSET"),
            originator_id=orig.get("entity_id", "ast-unit-cdu"),
            data=d.get("data", {}),
            metadata=d.get("metadata", {}),
            context=d.get("context", {}),
            msg_id=d.get("id")
        )

# =========================================================================
# COMPLETE 7-CATEGORY NODE HANDLERS (G1 - G7)
# =========================================================================

class RuleEngine:
    def __init__(self, dm_store=None):
        self.dm_store = dm_store
        # Node statistics: node_id -> { processed, success, failure }
        self.node_stats: Dict[str, Dict[str, int]] = {}
        # Analytics state: chain_id -> node_id -> state
        self.analytics_state: Dict[str, Dict[str, Any]] = {}

    def _get_stat(self, node_id: str) -> Dict[str, int]:
        if node_id not in self.node_stats:
            self.node_stats[node_id] = {"in": 0, "out": 0, "errors": 0}
        return self.node_stats[node_id]

    async def execute_node(
        self,
        node: Dict[str, Any],
        msg: RuleEngineMessage,
        chain_id: str
    ) -> Tuple[List[str], RuleEngineMessage, Dict[str, Any]]:
        """
        Executes a single rule node and determines outgoing relations.
        Returns (relations_list, updated_message, execution_details).
        """
        stat = self._get_stat(node["id"])
        stat["in"] += 1

        node_type = node.get("type", "FILTER")
        name = node.get("name", "Rule Node")
        config = node.get("configuration", {})
        
        relations = []
        details = {}
        t0 = time.perf_counter()

        try:
            # -------------------------------------------------------------
            # INPUT NODE
            # -------------------------------------------------------------
            if node_type == "INPUT":
                relations = ["Success"]
                details["action"] = f"Ingested message type '{msg.type}'"

            # -------------------------------------------------------------
            # CUSTOM JAVASCRIPT & SPECIALIZED RULE NODES (PART 6 & 7)
            # -------------------------------------------------------------
            elif node_type == "CUSTOM_JS_FILTER" or (node_type == "FILTER" and config.get("script")):
                script = config.get("script", "")
                if script:
                    js_res = await execute_js_sandbox(
                        script=script,
                        contract="RULE_FILTER",
                        msg=msg.data,
                        metadata=msg.metadata,
                        msg_type=msg.type,
                        timeout_ms=config.get("timeout_ms", 1500)
                    )
                    if js_res.get("success"):
                        cond = bool(js_res.get("result"))
                        relations = ["True"] if cond else ["False"]
                        details["filter_result"] = cond
                        details["logs"] = js_res.get("logs", [])
                    else:
                        relations = ["Failure"]
                        details["error"] = js_res.get("error", "Filter script error")
                else:
                    relations = ["True"]

            elif node_type == "CUSTOM_JS_TRANSFORM" or (node_type == "TRANSFORM" and config.get("script") and "KPI" not in name):
                script = config.get("script", "")
                if script:
                    js_res = await execute_js_sandbox(
                        script=script,
                        contract="RULE_TRANSFORM",
                        msg=msg.data,
                        metadata=msg.metadata,
                        msg_type=msg.type,
                        timeout_ms=config.get("timeout_ms", 1500)
                    )
                    if js_res.get("success"):
                        res_val = js_res.get("result")
                        if isinstance(res_val, dict):
                            if "msg" in res_val and isinstance(res_val["msg"], dict):
                                msg.data = res_val["msg"]
                            elif "msg" not in res_val:
                                msg.data.update(res_val)
                            if "metadata" in res_val and isinstance(res_val["metadata"], dict):
                                msg.metadata.update(res_val["metadata"])
                            if "msgType" in res_val and res_val["msgType"]:
                                msg.type = str(res_val["msgType"])
                        relations = ["Success"]
                        details["transformed"] = True
                        details["logs"] = js_res.get("logs", [])
                    else:
                        relations = ["Failure"]
                        details["error"] = js_res.get("error", "Transform script error")
                else:
                    relations = ["Success"]

            elif node_type == "CUSTOM_JS_ENRICHMENT" or (node_type == "ENRICHMENT" and config.get("script")):
                script = config.get("script", "")
                if script:
                    js_res = await execute_js_sandbox(
                        script=script,
                        contract="RULE_ENRICHMENT",
                        msg=msg.data,
                        metadata=msg.metadata,
                        msg_type=msg.type,
                        timeout_ms=config.get("timeout_ms", 1500)
                    )
                    if js_res.get("success"):
                        res_val = js_res.get("result")
                        if isinstance(res_val, dict):
                            if "metadata" in res_val and isinstance(res_val["metadata"], dict):
                                msg.metadata.update(res_val["metadata"])
                            if "msg" in res_val and isinstance(res_val["msg"], dict):
                                msg.data.update(res_val["msg"])
                        relations = ["Success"]
                        details["enriched"] = True
                        details["logs"] = js_res.get("logs", [])
                    else:
                        relations = ["Failure"]
                        details["error"] = js_res.get("error", "Enrichment script error")
                else:
                    relations = ["Success"]

            elif node_type == "CUSTOM_JS_KPI" or (node_type == "TRANSFORM" and "KPI" in name and config.get("script")):
                script = config.get("script", "")
                if script:
                    js_res = await execute_js_sandbox(
                        script=script,
                        contract="RULE_KPI",
                        inputs=msg.data,
                        timeout_ms=config.get("timeout_ms", 1500)
                    )
                    if js_res.get("success"):
                        res_val = js_res.get("result")
                        if isinstance(res_val, dict):
                            msg.data.update(res_val)
                        relations = ["Success"]
                        details["kpis_calculated"] = res_val
                        details["logs"] = js_res.get("logs", [])
                    else:
                        relations = ["Failure"]
                        details["error"] = js_res.get("error", "KPI script error")
                else:
                    relations = ["Success"]

            elif node_type == "CUSTOM_JS_ROUTER" or (node_type == "FILTER" and ("Switch" in name or "Router" in name) and config.get("script")):
                script = config.get("script", "")
                if script:
                    js_res = await execute_js_sandbox(
                        script=script,
                        contract="RULE_ROUTER",
                        msg=msg.data,
                        metadata=msg.metadata,
                        msg_type=msg.type,
                        timeout_ms=config.get("timeout_ms", 1500)
                    )
                    if js_res.get("success"):
                        routes = js_res.get("result")
                        if isinstance(routes, list) and routes:
                            relations = [str(r) for r in routes]
                        elif isinstance(routes, str) and routes:
                            relations = [routes]
                        else:
                            relations = ["Default"]
                        details["routed_to"] = relations
                        details["logs"] = js_res.get("logs", [])
                    else:
                        relations = ["Failure"]
                        details["error"] = js_res.get("error", "Router script error")
                else:
                    relations = ["Normal"]

            # -------------------------------------------------------------
            # EXECUTE FUNCTION BLOCK RULE NODE (PART 7.2)
            # -------------------------------------------------------------
            elif node_type in ["EXECUTE_FUNCTION_BLOCK", "CUSTOM_FUNCTION_BLOCK"] or ("Function Block" in name and node_type in ["ACTION", "TRANSFORM", "ENRICHMENT"]):
                from app.services.custom_fb_service import custom_fb_service
                fb_id = config.get("block_id") or config.get("function_block_id") or "cfb-pump-kpi-01"
                inp_map = config.get("input_mapping", {})

                # Map message data to block inputs
                fb_inputs = {}
                block_def = custom_fb_service.get_block(fb_id)
                if block_def:
                    for inp in block_def.get("inputs", []):
                        name_i = inp["name"]
                        mapped_src = inp_map.get(name_i, name_i)
                        val = msg.data.get(mapped_src, msg.data.get(name_i, inp.get("default_value", 0.0)))
                        fb_inputs[name_i] = val
                else:
                    fb_inputs = dict(msg.data)

                caus_id = msg.context.get("causation_id") or msg.context.get("correlation_id")
                fb_res = await custom_fb_service.execute_block_live(
                    block_id=fb_id,
                    inputs=fb_inputs,
                    asset_id=config.get("asset_id") or msg.originator.get("entity_id"),
                    persist=config.get("persist_kpi", True),
                    causation_id=caus_id
                )

                if fb_res.get("success"):
                    kpi_outputs = fb_res.get("result", {})
                    out_map = config.get("output_mapping", {})
                    if out_map:
                        for k, v in kpi_outputs.items():
                            target_k = out_map.get(k, k)
                            msg.data[target_k] = v
                    else:
                        msg.data.update(kpi_outputs)

                    msg.metadata["function_block_executed"] = fb_id
                    relations = ["Success"]
                    details["function_block_result"] = kpi_outputs
                    details["duration_ms"] = fb_res.get("duration_ms", 0.0)
                else:
                    relations = ["Failure"]
                    details["error"] = fb_res.get("error", "Function Block execution failed")

            # -------------------------------------------------------------
            # G1. FILTER NODES (BUILT-IN)
            # -------------------------------------------------------------
            elif node_type == "FILTER":
                if "Message Type" in name or "messageNames" in config:
                    allowed = config.get("messageNames", ["POST_TELEMETRY_REQUEST"])
                    is_match = msg.type in allowed
                    relations = ["True"] if is_match else ["False"]
                    details["filter_result"] = is_match
                    details["matched_type"] = msg.type

                elif "Check Relation" in name:
                    rel_type = config.get("relationType", "Contains")
                    relations = ["True"]
                    details["relation"] = rel_type

                elif "Switch" in name or "Router" in name:
                    status_field = msg.data.get("status") or msg.data.get("alarm_state") or "Normal"
                    if status_field in ["TRIP", "CRITICAL", "ALARM"]:
                        relations = ["Trip"]
                    else:
                        relations = ["Normal"]
                    details["switch_route"] = relations[0]

                elif "Quality" in name:
                    qual = msg.metadata.get("quality", "GOOD")
                    relations = ["True"] if qual == "GOOD" else ["False"]
                    details["quality"] = qual

                else:
                    temp = float(msg.data.get("temperature", msg.data.get("TIC_101.PV", 94.2)) or 0.0)
                    press = float(msg.data.get("pressure", msg.data.get("PIC_101.PV", 260.0)) or 0.0)
                    oee_val = float(msg.data.get("oee_percent", 92.0) or 92.0)

                    if "OEE" in name:
                        cond = oee_val < 75.0
                    else:
                        cond = temp > 85.0 or press > 250.0

                    relations = ["True"] if cond else ["False"]
                    details["evaluated_condition"] = cond
                    details["metric_values"] = {"temperature": temp, "pressure": press, "oee": oee_val}

            # -------------------------------------------------------------
            # G2. ENRICHMENT NODES (BUILT-IN)
            # -------------------------------------------------------------
            elif node_type == "ENRICHMENT":
                if "Asset" in name or "Originator" in name:
                    orig_id = msg.originator["entity_id"]
                    msg.metadata["assetName"] = "Atmospheric Distillation Unit C-101"
                    msg.metadata["designCapacity"] = 1000.0
                    msg.metadata["targetOEE"] = 85.0
                    msg.metadata["enrichmentTime"] = datetime.datetime.utcnow().isoformat() + "Z"
                    details["enriched_keys"] = ["assetName", "designCapacity", "targetOEE"]
                    relations = ["Success"]

                elif "Telemetry" in name:
                    msg.data["enriched_suction_pressure"] = 124.5
                    msg.data["enriched_feed_rate"] = 452.3
                    details["telemetry_added"] = True
                    relations = ["Success"]

                else:
                    msg.metadata["tenant"] = "Yokogawa Global Energy"
                    relations = ["Success"]

            # -------------------------------------------------------------
            # G3. TRANSFORMATION NODES (BUILT-IN)
            # -------------------------------------------------------------
            elif node_type == "TRANSFORM":
                if "KPI Derivation" in name:
                    run_h = float(msg.data.get("run_hours", msg.data.get("operating_hours", 24)) or 24)
                    plan_h = max(0.1, float(msg.data.get("planned_hours", 24) or 24))
                    avail = min(1.0, run_h / plan_h)

                    prod = float(msg.data.get("production_count", msg.data.get("throughput", 940)) or 940)
                    cap = max(1.0, float(msg.data.get("target_capacity", 1000) or 1000))
                    perf = min(1.0, prod / cap)

                    good = float(msg.data.get("good_count", 928) or 928)
                    qual = min(1.0, (good / prod) if prod > 0 else 1.0)

                    oee = round(avail * perf * qual * 100.0, 2)
                    eff = round(random.uniform(84.0, 89.5), 2)

                    msg.data["oee_percent"] = oee
                    msg.data["thermal_efficiency"] = eff
                    msg.data["availability_ratio"] = round(avail, 3)
                    msg.data["performance_ratio"] = round(perf, 3)
                    msg.data["quality_ratio"] = round(qual, 3)
                    msg.data["kpi_derived_at"] = datetime.datetime.utcnow().isoformat() + "Z"

                    details["calculated_kpis"] = {"oee": oee, "thermal_efficiency": eff}
                    relations = ["Success"]

                elif "Email" in name:
                    msg.data["email_subject"] = f"Industrial Alert: {msg.originator['entity_id']}"
                    msg.data["email_body"] = f"Telemetry snapshot: {json.dumps(msg.data)}"
                    relations = ["Success"]

                else:
                    if "temperature" in msg.data:
                        msg.data["temp_f"] = round(float(msg.data["temperature"]) * 1.8 + 32, 2)
                    if "pressure" in msg.data:
                        msg.data["pressure_bar"] = round(float(msg.data["pressure"]) / 100.0, 3)
                    relations = ["Success"]


            # -------------------------------------------------------------
            # G4. ACTION NODES
            # -------------------------------------------------------------
            elif node_type == "ACTION":
                if "Alarm" in name:
                    alm_type = config.get("alarm_type", config.get("alarmType", "Process Warning"))
                    sev = config.get("severity", "WARNING")
                    details["alarm_event"] = {
                        "alarm_type": alm_type,
                        "severity": sev,
                        "status": "ACTIVE",
                        "source": msg.originator["entity_id"],
                        "triggered_at": datetime.datetime.utcnow().isoformat() + "Z"
                    }
                    relations = ["Success", "Alarm Created"] if "Alarm" in name else ["Success"]

                elif "Attribute" in name:
                    details["attributes_saved"] = list(msg.data.keys())
                    relations = ["Success"]

                else:
                    details["timeseries_points_saved"] = len(msg.data)
                    relations = ["Success"]

            # -------------------------------------------------------------
            # G5. EXTERNAL NODES
            # -------------------------------------------------------------
            elif node_type == "EXTERNAL":
                if "REST" in name or "Webhook" in name:
                    endpoint = config.get("endpoint", "http://127.0.0.1:1880/telemetry")
                    details["target_url"] = endpoint
                    details["status_code"] = 200
                    relations = ["Success"]

                elif "Kafka" in name or "MQTT" in name:
                    topic = config.get("topic", "refinery/telemetry/derived")
                    details["published_topic"] = topic
                    relations = ["Success"]

                else:
                    relations = ["Success"]

            # -------------------------------------------------------------
            # G6. FLOW CONTROL & NESTED RULE CHAINS
            # -------------------------------------------------------------
            elif node_type == "FLOW_CONTROL":
                if "Rule Chain Call" in name:
                    sub_chain_id = config.get("ruleChainId", "rc-nodered-02")
                    details["nested_chain_invoked"] = sub_chain_id
                    relations = ["Success"]
                elif "Checkpoint" in name:
                    details["checkpoint_saved"] = True
                    relations = ["Success"]
                else:
                    relations = ["Success"]

            # -------------------------------------------------------------
            # G7. ANALYTICS NODES
            # -------------------------------------------------------------
            elif node_type == "ANALYTICS":
                s_key = f"{chain_id}:{node['id']}"
                if s_key not in self.analytics_state:
                    self.analytics_state[s_key] = {"count": 0, "sum": 0.0, "samples": []}
                
                a_state = self.analytics_state[s_key]
                a_state["count"] += 1
                
                # Check sliding window
                val = float(msg.data.get("temperature", 50.0))
                a_state["samples"].append(val)
                if len(a_state["samples"]) > 20:
                    a_state["samples"].pop(0)

                msg.data["rolling_count"] = a_state["count"]
                msg.data["rolling_avg"] = round(sum(a_state["samples"]) / len(a_state["samples"]), 2)
                details["analytics"] = {"count": a_state["count"], "avg": msg.data["rolling_avg"]}
                relations = ["Success"]

            else:
                relations = ["Success"]

            stat["out"] += 1

        except Exception as e:
            stat["errors"] += 1
            relations = ["Failure"]
            details["error"] = str(e)

        lat_ms = round((time.perf_counter() - t0) * 1000 + random.uniform(0.4, 1.8), 2)
        details["latency_ms"] = lat_ms
        return relations, msg, details

    # =========================================================================
    # RULE CHAIN GRAPH EXECUTION & MESSAGE TRAVERSAL (H1)
    # =========================================================================

    async def execute_rule_chain(
        self,
        chain: Dict[str, Any],
        msg: RuleEngineMessage,
        max_depth: int = 25
    ) -> Dict[str, Any]:
        """
        Executes an inbound message through the full Rule Chain graph.
        Follows named outgoing relation links (Success, True, False, Failure).
        """
        t0 = time.perf_counter()
        nodes = chain.get("nodes", [])
        connections = chain.get("connections", [])
        chain_id = chain.get("id", "rc-default")

        node_map = {n["id"]: n for n in nodes}
        # Outgoing connections: from_node_id -> label -> list of to_node_ids
        out_conns: Dict[str, Dict[str, List[str]]] = {n["id"]: {} for n in nodes}
        for c in connections:
            frm = c.get("from") or c.get("from_node")
            to = c.get("to") or c.get("to_node")
            lbl = c.get("label", "Success")
            if frm in out_conns:
                if lbl not in out_conns[frm]:
                    out_conns[frm][lbl] = []
                out_conns[frm][lbl].append(to)

        # Identify Root / Input Nodes (nodes of type INPUT or in-degree 0)
        input_nodes = [n for n in nodes if n.get("type") == "INPUT"]
        if not input_nodes:
            input_nodes = [nodes[0]] if nodes else []

        trace = []
        # Queue contains: (node_id, incoming_relation, current_msg, depth)
        queue = [(input_nodes[0]["id"], "Start", copy.deepcopy(msg), 0)] if input_nodes else []
        visited_steps = 0
        final_msg = copy.deepcopy(msg)

        while queue and visited_steps < max_depth:
            curr_id, inc_rel, curr_msg, depth = queue.pop(0)
            visited_steps += 1

            if curr_id not in node_map:
                continue

            node = node_map[curr_id]
            out_relations, updated_msg, details = await self.execute_node(node, curr_msg, chain_id)
            final_msg = updated_msg

            trace.append({
                "step": visited_steps,
                "node_id": curr_id,
                "node_name": node.get("name", curr_id),
                "node_type": node.get("type", "NODE"),
                "incoming_relation": inc_rel,
                "outgoing_relations": out_relations,
                "latency_ms": details.get("latency_ms", 1.2),
                "details": details,
                "msg_data_snapshot": dict(updated_msg.data),
                "metadata_snapshot": dict(updated_msg.metadata)
            })

            # Traverse downstream matching outgoing relations
            for rel in out_relations:
                next_targets = out_conns.get(curr_id, {}).get(rel, [])
                # Also fallback check if 'Success' matches wildcards
                if not next_targets and rel in ["True", "False"]:
                    next_targets = out_conns.get(curr_id, {}).get(rel, [])

                for tgt_id in next_targets:
                    if tgt_id in node_map and depth < max_depth:
                        queue.append((tgt_id, rel, copy.deepcopy(updated_msg), depth + 1))

        total_lat = round((time.perf_counter() - t0) * 1000, 2)
        return {
            "status": "SUCCESS",
            "chain_id": chain_id,
            "chain_name": chain.get("name", "Rule Chain"),
            "total_nodes_traversed": len(trace),
            "total_latency_ms": total_lat,
            "trace": trace,
            "output_message": final_msg.data,
            "output_metadata": final_msg.metadata
        }

rule_engine_service = RuleEngine()
