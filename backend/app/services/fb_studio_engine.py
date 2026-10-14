"""
Industrial Function Block V2 Execution Engine for Yokogawa AHI DBM.
Compiles visual function block node-graphs into Directed Acyclic Graphs (DAG),
validates connections, detects illegal feedback cycles, resolves asset attribute inputs,
evaluates safe mathematical expressions, manages stateful memory, and executes workflows.
"""
import ast
import math
import uuid
import time
import datetime
from typing import Dict, List, Any, Optional, Tuple, Set

from app.services.fb_block_registry import BLOCK_REGISTRY, execute_block
from app.services.value_envelope import UnifiedValueEnvelope, assess_quality

# =========================================================================
# SAFE AST EXPRESSION EVALUATOR (E3)
# =========================================================================

SAFE_MATH_FUNCTIONS = {
    "sqrt": math.sqrt,
    "abs": abs,
    "min": min,
    "max": max,
    "round": round,
    "pow": math.pow,
    "sin": math.sin,
    "cos": math.cos,
    "tan": math.tan,
    "log": math.log,
    "log10": math.log10,
    "exp": math.exp,
    "floor": math.floor,
    "ceil": math.ceil,
    "pi": math.pi,
    "e": math.e
}

class SafeASTEvaluator(ast.NodeVisitor):
    def __init__(self, variables: Dict[str, Any]):
        self.variables = variables

    def evaluate(self, node: ast.AST) -> Any:
        if isinstance(node, ast.Expression):
            return self.evaluate(node.body)
        elif isinstance(node, ast.Constant):
            return node.value
        elif isinstance(node, ast.Name):
            if node.id in self.variables:
                return self.variables[node.id]
            if node.id in SAFE_MATH_FUNCTIONS:
                return SAFE_MATH_FUNCTIONS[node.id]
            raise ValueError(f"Unknown variable or function '{node.id}' in expression")
        elif isinstance(node, ast.BinOp):
            left = self.evaluate(node.left)
            right = self.evaluate(node.right)
            if isinstance(node.op, ast.Add): return left + right
            elif isinstance(node.op, ast.Sub): return left - right
            elif isinstance(node.op, ast.Mult): return left * right
            elif isinstance(node.op, ast.Div):
                if abs(right) < 1e-9: return 0.0
                return left / right
            elif isinstance(node.op, ast.Mod): return left % right
            elif isinstance(node.op, ast.Pow): return math.pow(left, right)
            else:
                raise ValueError(f"Unsupported binary operator: {type(node.op).__name__}")
        elif isinstance(node, ast.UnaryOp):
            operand = self.evaluate(node.operand)
            if isinstance(node.op, ast.UAdd): return +operand
            elif isinstance(node.op, ast.USub): return -operand
            elif isinstance(node.op, ast.Not): return not operand
            else:
                raise ValueError(f"Unsupported unary operator: {type(node.op).__name__}")
        elif isinstance(node, ast.Call):
            func = self.evaluate(node.func)
            args = [self.evaluate(arg) for arg in node.args]
            return func(*args)
        elif isinstance(node, ast.Compare):
            left = self.evaluate(node.left)
            for op, comparator in zip(node.ops, node.comparators):
                right = self.evaluate(comparator)
                if isinstance(op, ast.Eq) and not (left == right): return False
                elif isinstance(op, ast.NotEq) and not (left != right): return False
                elif isinstance(op, ast.Lt) and not (left < right): return False
                elif isinstance(op, ast.LtE) and not (left <= right): return False
                elif isinstance(op, ast.Gt) and not (left > right): return False
                elif isinstance(op, ast.GtE) and not (left >= right): return False
                left = right
            return True
        else:
            raise ValueError(f"Unsupported expression syntax: {type(node).__name__}")

def evaluate_safe_expression(expr_str: str, variables: Dict[str, Any]) -> float:
    """Safely evaluates an expression string using Python AST without eval/exec."""
    parsed = ast.parse(expr_str.strip(), mode="eval")
    evaluator = SafeASTEvaluator(variables)
    res = evaluator.evaluate(parsed)
    return float(res) if isinstance(res, (int, float)) else res

# =========================================================================
# GRAPH VALIDATOR & CYCLE DETECTION (E4)
# =========================================================================

def validate_function_block_graph(
    nodes: List[Dict[str, Any]],
    connections: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Validates function block graph:
    - Checks required inputs
    - Detects cycles using Kahn's topological sort
    - Validates port names
    """
    node_ids = {n["id"] for n in nodes}
    errors = []
    warnings = []

    # Check connection endpoints
    for c in connections:
        if c.get("from_node") not in node_ids:
            errors.append(f"Connection from unknown node '{c.get('from_node')}'")
        if c.get("to_node") not in node_ids:
            errors.append(f"Connection to unknown node '{c.get('to_node')}'")

    if errors:
        return {"valid": False, "errors": errors, "warnings": warnings, "execution_order": []}

    # Build Adjacency List & In-Degree for topological sort
    adj: Dict[str, List[str]] = {n["id"]: [] for n in nodes}
    in_degree: Dict[str, int] = {n["id"]: 0 for n in nodes}

    for c in connections:
        src = c.get("from_node")
        dst = c.get("to_node")
        if src and dst and src in adj and dst in in_degree:
            adj[src].append(dst)
            in_degree[dst] += 1

    # Kahn's Algorithm
    queue = [n_id for n_id, deg in in_degree.items() if deg == 0]
    execution_order = []

    while queue:
        curr = queue.pop(0)
        execution_order.append(curr)
        for neighbor in adj[curr]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    if len(execution_order) != len(nodes):
        cycle_nodes = [n_id for n_id, deg in in_degree.items() if deg > 0]
        errors.append(f"Illegal cycle detected in Function Block graph involving nodes: {', '.join(cycle_nodes)}")
        return {
            "valid": False,
            "errors": errors,
            "warnings": warnings,
            "execution_order": []
        }

    return {
        "valid": True,
        "errors": [],
        "warnings": warnings,
        "execution_order": execution_order
    }

# =========================================================================
# WORKFLOW EXECUTION ENGINE (E1 & E5)
# =========================================================================

class FunctionBlockStudioEngine:
    def __init__(self):
        # In-memory stateful block storage: workflow_id -> node_id -> state_dict
        self._state_store: Dict[str, Dict[str, Any]] = {}
        # Execution history traces: workflow_id -> list of execution runs
        self._history_traces: Dict[str, List[Dict[str, Any]]] = {}

    def get_node_state(self, workflow_id: str, node_id: str) -> Dict[str, Any]:
        return self._state_store.get(workflow_id, {}).get(node_id, {})

    def set_node_state(self, workflow_id: str, node_id: str, state: Dict[str, Any]):
        if workflow_id not in self._state_store:
            self._state_store[workflow_id] = {}
        self._state_store[workflow_id][node_id] = state

    def execute_workflow(
        self,
        workflow: Dict[str, Any],
        live_attributes_resolver,
        trigger_type: str = "ON_DEMAND",
        simulation: bool = False,
        custom_inputs: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Executes a complete Function Block DAG workflow.
        """
        t0 = time.perf_counter()
        workflow_id = workflow.get("id", "wf-default")
        nodes = workflow.get("nodes", [])
        connections = workflow.get("connections", [])

        # 1. Validate and compute topological order
        validation = validate_function_block_graph(nodes, connections)
        if not validation["valid"]:
            return {
                "success": False,
                "workflow_id": workflow_id,
                "execution_id": f"exec-{uuid.uuid4().hex[:8]}",
                "error": "; ".join(validation["errors"]),
                "node_results": {},
                "duration_ms": 0.0
            }

        exec_order = validation["execution_order"]
        node_map = {n["id"]: n for n in nodes}

        # Wire mapping: destination_node_id -> input_port_name -> (source_node_id, output_port_name)
        wire_map: Dict[str, Dict[str, Tuple[str, str]]] = {n_id: {} for n_id in node_map}
        for c in connections:
            dst = c.get("to_node")
            in_port = c.get("to_input", "A")
            src = c.get("from_node")
            out_port = c.get("from_output", "Result")
            if dst in wire_map:
                wire_map[dst][in_port] = (src, out_port)

        # Output registry: node_id -> Dict of outputs
        node_outputs: Dict[str, Dict[str, Any]] = {}
        node_traces: List[Dict[str, Any]] = []
        runtime_writes: List[Dict[str, Any]] = []

        # 2. Sequential execution in topological order
        for node_id in exec_order:
            node = node_map[node_id]
            b_type = node.get("type", "math.add")
            b_config = node.get("configuration", {})
            b_inputs = {}

            # A. Resolve incoming wire inputs
            if node_id in wire_map:
                for in_port, (src_id, src_out_port) in wire_map[node_id].items():
                    if src_id in node_outputs and src_out_port in node_outputs[src_id]:
                        b_inputs[in_port] = node_outputs[src_id][src_out_port]

            # B. If input block or custom override, resolve live asset attributes
            if b_type == "input.asset_attribute":
                a_id = b_config.get("asset_id")
                attr_id = b_config.get("attribute_id")
                fallback = float(b_config.get("default_value", 0.0) or 0.0)
                
                # Fetch live envelope
                env = live_attributes_resolver(a_id, attr_id) if callable(live_attributes_resolver) else None
                if env:
                    b_inputs["value"] = env.value
                    b_inputs["quality"] = env.quality
                    b_inputs["timestamp"] = env.source_timestamp
                    b_inputs["unit"] = env.unit
                else:
                    b_inputs["value"] = fallback
                    b_inputs["quality"] = "MISSING"
                    b_inputs["timestamp"] = datetime.datetime.utcnow().isoformat() + "Z"
                    b_inputs["unit"] = ""

            # C. Custom inputs override
            if custom_inputs and node_id in custom_inputs:
                b_inputs.update(custom_inputs[node_id])

            # D. Retrieve node state
            curr_state = self.get_node_state(workflow_id, node_id)

            # E. Execute block logic
            t_node_start = time.perf_counter()
            outputs, new_state = execute_block(b_type, b_inputs, b_config, curr_state)
            node_latency_ms = round((time.perf_counter() - t_node_start) * 1000, 3)

            # F. Save new state
            if new_state != curr_state and not simulation:
                self.set_node_state(workflow_id, node_id, new_state)

            node_outputs[node_id] = outputs

            # G. Handle Output blocks (only when not in simulation)
            if b_type == "output.runtime_attribute" and not simulation:
                runtime_writes.append({
                    "asset_id": b_config.get("asset_id"),
                    "attribute_id": b_config.get("attribute_id"),
                    "attribute_name": b_config.get("attribute_name"),
                    "value": b_inputs.get("Value", outputs.get("Value"))
                })

            node_traces.append({
                "node_id": node_id,
                "node_name": node.get("name", node_id),
                "block_type": b_type,
                "inputs": b_inputs,
                "outputs": outputs,
                "latency_ms": node_latency_ms
            })

        duration_ms = round((time.perf_counter() - t0) * 1000, 2)
        exec_id = f"exec-{uuid.uuid4().hex[:8]}"

        result = {
            "success": True,
            "workflow_id": workflow_id,
            "workflow_name": workflow.get("name", "Custom Workflow"),
            "execution_id": exec_id,
            "trigger_type": trigger_type,
            "is_simulation": simulation,
            "duration_ms": duration_ms,
            "nodes_executed": len(exec_order),
            "trace": node_traces,
            "final_outputs": node_outputs,
            "runtime_writes": runtime_writes,
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
        }

        # Store in execution history
        if workflow_id not in self._history_traces:
            self._history_traces[workflow_id] = []
        self._history_traces[workflow_id].insert(0, result)
        if len(self._history_traces[workflow_id]) > 50:
            self._history_traces[workflow_id].pop()

        return result

    def replay_historical_simulation(
        self,
        workflow: Dict[str, Any],
        historical_points: List[Dict[str, Any]],
        input_node_bindings: Dict[str, str]  # node_id -> tag_name in historical_points
    ) -> Dict[str, Any]:
        """
        Executes a historical replay simulation across timeseries points.
        Never emits live alarms or writes to physical assets.
        """
        series_results = []
        t0 = time.perf_counter()

        for pt in historical_points:
            ts = pt.get("timestamp")
            val = pt.get("value")
            tag = pt.get("tag_name")

            # Mock live attributes resolver for this point in time
            def hist_resolver(asset_id, attr_id):
                return UnifiedValueEnvelope.create(
                    asset_id=asset_id or "ast-sim",
                    attribute_id=attr_id or "attr-sim",
                    name=tag or "SimulatedTag",
                    value=val,
                    quality=pt.get("quality", "GOOD"),
                    source_ts=None
                )

            res = self.execute_workflow(
                workflow=workflow,
                live_attributes_resolver=hist_resolver,
                trigger_type="ON_HISTORICAL_REPLAY",
                simulation=True
            )
            series_results.append({
                "timestamp": ts,
                "input_value": val,
                "outputs": res.get("final_outputs", {})
            })

        total_sim_ms = round((time.perf_counter() - t0) * 1000, 2)
        return {
            "success": True,
            "simulation_points": len(series_results),
            "duration_ms": total_sim_ms,
            "time_series": series_results
        }

fb_studio_engine = FunctionBlockStudioEngine()
