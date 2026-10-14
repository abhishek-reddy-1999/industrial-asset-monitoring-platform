"""
Complete Function Block Registry for Yokogawa Asset Function Block Studio V2.
Implements 7 Functional Categories:
- D1: Asset Input Blocks
- D2: Mathematical Blocks
- D3: Logical Blocks
- D4: Statistical Blocks
- D5: Time & Signal Blocks
- D6: Industrial Calculation Blocks
- D7: Output Blocks
"""
import math
import time
import datetime
from typing import Dict, Any, List, Tuple, Optional

# Registry of Block Definitions
BLOCK_REGISTRY: Dict[str, Dict[str, Any]] = {}

def register_block(block_def: Dict[str, Any]):
    BLOCK_REGISTRY[block_def["type"]] = block_def

# =========================================================================
# D1. ASSET INPUT BLOCKS
# =========================================================================

register_block({
    "type": "input.asset_attribute",
    "version": "1.0.0",
    "category": "Asset Input",
    "display_name": "Read Asset Attribute",
    "description": "Resolves live attribute value, engineering unit, and quality for a configured asset.",
    "inputs": [],
    "outputs": [
        {"name": "value", "type": "number", "description": "Resolved attribute value"},
        {"name": "quality", "type": "string", "description": "GOOD, BAD, UNCERTAIN, STALE, MISSING"},
        {"name": "timestamp", "type": "string", "description": "Source ISO timestamp"},
        {"name": "unit", "type": "string", "description": "Engineering unit"}
    ],
    "config_schema": {
        "asset_id": {"type": "string", "label": "Asset ID", "required": True},
        "attribute_id": {"type": "string", "label": "Attribute ID", "required": True},
        "attribute_name": {"type": "string", "label": "Attribute Name", "required": False},
        "default_value": {"type": "number", "label": "Fallback Default", "default": 0.0}
    },
    "stateful": False
})

register_block({
    "type": "input.multi_attribute",
    "version": "1.0.0",
    "category": "Asset Input",
    "display_name": "Read Multiple Attributes",
    "description": "Reads a batch of attributes from an asset and outputs them as a key-value dictionary.",
    "inputs": [],
    "outputs": [
        {"name": "values", "type": "object", "description": "Dictionary of resolved attribute values"},
        {"name": "all_good", "type": "boolean", "description": "True if all attribute qualities are GOOD"}
    ],
    "config_schema": {
        "asset_id": {"type": "string", "label": "Asset ID", "required": True},
        "attribute_ids": {"type": "array", "label": "Selected Attributes", "items": {"type": "string"}}
    },
    "stateful": False
})

register_block({
    "type": "input.latest_value",
    "version": "1.0.0",
    "category": "Asset Input",
    "display_name": "Read Latest Tag Value",
    "description": "Fetches latest real-time telemetry sample directly from Redis live cache ring buffer.",
    "inputs": [],
    "outputs": [
        {"name": "value", "type": "number"},
        {"name": "quality", "type": "string"}
    ],
    "config_schema": {
        "tag_name": {"type": "string", "label": "DCS Tag Name", "required": True}
    },
    "stateful": False
})

register_block({
    "type": "input.constant",
    "version": "1.0.0",
    "category": "Asset Input",
    "display_name": "Constant Value",
    "description": "Provides an immutable numeric, string, or boolean constant.",
    "inputs": [],
    "outputs": [
        {"name": "value", "type": "any"}
    ],
    "config_schema": {
        "value": {"type": "any", "label": "Constant Value", "default": 1.0},
        "data_type": {"type": "string", "label": "Data Type", "enum": ["number", "string", "boolean"], "default": "number"}
    },
    "stateful": False
})

register_block({
    "type": "input.timestamp",
    "version": "1.0.0",
    "category": "Asset Input",
    "display_name": "Current Timestamp",
    "description": "Emits current execution epoch milliseconds and UTC ISO timestamp.",
    "inputs": [],
    "outputs": [
        {"name": "epoch_ms", "type": "number"},
        {"name": "iso_string", "type": "string"}
    ],
    "config_schema": {},
    "stateful": False
})

# =========================================================================
# D2. MATHEMATICAL BLOCKS
# =========================================================================

register_block({
    "type": "math.add",
    "version": "1.0.0",
    "category": "Math",
    "display_name": "Addition",
    "description": "Adds inputs A and B (Result = A + B).",
    "inputs": [
        {"name": "A", "type": "number", "required": True},
        {"name": "B", "type": "number", "required": True}
    ],
    "outputs": [
        {"name": "Result", "type": "number"}
    ],
    "config_schema": {},
    "stateful": False
})

register_block({
    "type": "math.subtract",
    "version": "1.0.0",
    "category": "Math",
    "display_name": "Subtraction",
    "description": "Subtracts input B from input A (Result = A - B).",
    "inputs": [
        {"name": "A", "type": "number", "required": True},
        {"name": "B", "type": "number", "required": True}
    ],
    "outputs": [
        {"name": "Result", "type": "number"}
    ],
    "config_schema": {},
    "stateful": False
})

register_block({
    "type": "math.multiply",
    "version": "1.0.0",
    "category": "Math",
    "display_name": "Multiplication",
    "description": "Multiplies inputs A and B (Result = A * B).",
    "inputs": [
        {"name": "A", "type": "number", "required": True},
        {"name": "B", "type": "number", "required": True}
    ],
    "outputs": [
        {"name": "Result", "type": "number"}
    ],
    "config_schema": {},
    "stateful": False
})

register_block({
    "type": "math.divide",
    "version": "1.0.0",
    "category": "Math",
    "display_name": "Division",
    "description": "Divides input A by input B with zero-division protection.",
    "inputs": [
        {"name": "A", "type": "number", "required": True},
        {"name": "B", "type": "number", "required": True}
    ],
    "outputs": [
        {"name": "Result", "type": "number"},
        {"name": "is_zero_div", "type": "boolean"}
    ],
    "config_schema": {
        "fallback_on_zero": {"type": "number", "default": 0.0}
    },
    "stateful": False
})

register_block({
    "type": "math.modulo",
    "version": "1.0.0",
    "category": "Math",
    "display_name": "Modulo",
    "description": "Computes remainder of division A % B.",
    "inputs": [
        {"name": "A", "type": "number", "required": True},
        {"name": "B", "type": "number", "required": True}
    ],
    "outputs": [{"name": "Result", "type": "number"}],
    "config_schema": {},
    "stateful": False
})

register_block({
    "type": "math.power",
    "version": "1.0.0",
    "category": "Math",
    "display_name": "Power",
    "description": "Calculates Base raised to Exponent (Result = Base ^ Exponent).",
    "inputs": [
        {"name": "Base", "type": "number", "required": True},
        {"name": "Exponent", "type": "number", "required": True}
    ],
    "outputs": [{"name": "Result", "type": "number"}],
    "config_schema": {},
    "stateful": False
})

register_block({
    "type": "math.sqrt",
    "version": "1.0.0",
    "category": "Math",
    "display_name": "Square Root",
    "description": "Calculates square root of input. Clamps negative values to zero.",
    "inputs": [{"name": "A", "type": "number", "required": True}],
    "outputs": [{"name": "Result", "type": "number"}],
    "config_schema": {},
    "stateful": False
})

register_block({
    "type": "math.abs",
    "version": "1.0.0",
    "category": "Math",
    "display_name": "Absolute Value",
    "description": "Returns absolute value |A|.",
    "inputs": [{"name": "A", "type": "number", "required": True}],
    "outputs": [{"name": "Result", "type": "number"}],
    "config_schema": {},
    "stateful": False
})

register_block({
    "type": "math.min",
    "version": "1.0.0",
    "category": "Math",
    "display_name": "Minimum",
    "description": "Returns minimum of inputs A and B.",
    "inputs": [
        {"name": "A", "type": "number", "required": True},
        {"name": "B", "type": "number", "required": True}
    ],
    "outputs": [{"name": "Result", "type": "number"}],
    "config_schema": {},
    "stateful": False
})

register_block({
    "type": "math.max",
    "version": "1.0.0",
    "category": "Math",
    "display_name": "Maximum",
    "description": "Returns maximum of inputs A and B.",
    "inputs": [
        {"name": "A", "type": "number", "required": True},
        {"name": "B", "type": "number", "required": True}
    ],
    "outputs": [{"name": "Result", "type": "number"}],
    "config_schema": {},
    "stateful": False
})

register_block({
    "type": "math.round",
    "version": "1.0.0",
    "category": "Math",
    "display_name": "Round",
    "description": "Rounds input A to specified decimal precision.",
    "inputs": [{"name": "A", "type": "number", "required": True}],
    "outputs": [{"name": "Result", "type": "number"}],
    "config_schema": {
        "decimals": {"type": "integer", "default": 2}
    },
    "stateful": False
})

register_block({
    "type": "math.clamp",
    "version": "1.0.0",
    "category": "Math",
    "display_name": "Clamp",
    "description": "Restricts value A between Min and Max limits.",
    "inputs": [
        {"name": "A", "type": "number", "required": True},
        {"name": "Min", "type": "number", "required": False},
        {"name": "Max", "type": "number", "required": False}
    ],
    "outputs": [{"name": "Result", "type": "number"}],
    "config_schema": {
        "default_min": {"type": "number", "default": 0.0},
        "default_max": {"type": "number", "default": 100.0}
    },
    "stateful": False
})

register_block({
    "type": "math.scale",
    "version": "1.0.0",
    "category": "Math",
    "display_name": "Linear Scale",
    "description": "Maps input from [InMin, InMax] to [OutMin, OutMax].",
    "inputs": [{"name": "A", "type": "number", "required": True}],
    "outputs": [{"name": "Result", "type": "number"}],
    "config_schema": {
        "in_min": {"type": "number", "default": 0.0},
        "in_max": {"type": "number", "default": 100.0},
        "out_min": {"type": "number", "default": 0.0},
        "out_max": {"type": "number", "default": 1.0}
    },
    "stateful": False
})

register_block({
    "type": "math.linear_interpolation",
    "version": "1.0.0",
    "category": "Math",
    "display_name": "Linear Interpolation (LERP)",
    "description": "Interpolates between X0, Y0 and X1, Y1 for given X.",
    "inputs": [{"name": "X", "type": "number", "required": True}],
    "outputs": [{"name": "Y", "type": "number"}],
    "config_schema": {
        "x0": {"type": "number", "default": 0.0},
        "y0": {"type": "number", "default": 0.0},
        "x1": {"type": "number", "default": 100.0},
        "y1": {"type": "number", "default": 100.0}
    },
    "stateful": False
})

register_block({
    "type": "math.custom_formula",
    "version": "1.0.0",
    "category": "Math",
    "display_name": "Custom Math Expression",
    "description": "Evaluates safe mathematical expression with named variables (e.g. sqrt(P_dis - P_suc) / density).",
    "inputs": [
        {"name": "in1", "type": "number", "required": False},
        {"name": "in2", "type": "number", "required": False},
        {"name": "in3", "type": "number", "required": False},
        {"name": "in4", "type": "number", "required": False}
    ],
    "outputs": [{"name": "Result", "type": "number"}],
    "config_schema": {
        "expression": {"type": "string", "label": "Expression", "default": "in1 + in2 * in3"}
    },
    "stateful": False
})

# =========================================================================
# D3. LOGICAL BLOCKS
# =========================================================================

register_block({
    "type": "logic.and",
    "version": "1.0.0",
    "category": "Logic",
    "display_name": "AND Gate",
    "description": "Logical AND of inputs A and B.",
    "inputs": [
        {"name": "A", "type": "boolean", "required": True},
        {"name": "B", "type": "boolean", "required": True}
    ],
    "outputs": [{"name": "Result", "type": "boolean"}],
    "config_schema": {},
    "stateful": False
})

register_block({
    "type": "logic.or",
    "version": "1.0.0",
    "category": "Logic",
    "display_name": "OR Gate",
    "description": "Logical OR of inputs A and B.",
    "inputs": [
        {"name": "A", "type": "boolean", "required": True},
        {"name": "B", "type": "boolean", "required": True}
    ],
    "outputs": [{"name": "Result", "type": "boolean"}],
    "config_schema": {},
    "stateful": False
})

register_block({
    "type": "logic.not",
    "version": "1.0.0",
    "category": "Logic",
    "display_name": "NOT Inverter",
    "description": "Inverts input boolean (Result = !A).",
    "inputs": [{"name": "A", "type": "boolean", "required": True}],
    "outputs": [{"name": "Result", "type": "boolean"}],
    "config_schema": {},
    "stateful": False
})

register_block({
    "type": "logic.greater_than",
    "version": "1.0.0",
    "category": "Logic",
    "display_name": "Greater Than (>)",
    "description": "Checks if A > B.",
    "inputs": [
        {"name": "A", "type": "number", "required": True},
        {"name": "B", "type": "number", "required": True}
    ],
    "outputs": [{"name": "Result", "type": "boolean"}],
    "config_schema": {},
    "stateful": False
})

register_block({
    "type": "logic.less_than",
    "version": "1.0.0",
    "category": "Logic",
    "display_name": "Less Than (<)",
    "description": "Checks if A < B.",
    "inputs": [
        {"name": "A", "type": "number", "required": True},
        {"name": "B", "type": "number", "required": True}
    ],
    "outputs": [{"name": "Result", "type": "boolean"}],
    "config_schema": {},
    "stateful": False
})

register_block({
    "type": "logic.between",
    "version": "1.0.0",
    "category": "Logic",
    "display_name": "Between Range",
    "description": "Checks if A is between Low and High thresholds (inclusive).",
    "inputs": [
        {"name": "A", "type": "number", "required": True},
        {"name": "Low", "type": "number", "required": True},
        {"name": "High", "type": "number", "required": True}
    ],
    "outputs": [{"name": "Result", "type": "boolean"}],
    "config_schema": {},
    "stateful": False
})

register_block({
    "type": "logic.if_else",
    "version": "1.0.0",
    "category": "Logic",
    "display_name": "IF / ELSE Selector",
    "description": "Selects TrueVal if Condition is true, otherwise FalseVal.",
    "inputs": [
        {"name": "Condition", "type": "boolean", "required": True},
        {"name": "TrueVal", "type": "any", "required": True},
        {"name": "FalseVal", "type": "any", "required": True}
    ],
    "outputs": [{"name": "Result", "type": "any"}],
    "config_schema": {},
    "stateful": False
})

# =========================================================================
# D4. STATISTICAL BLOCKS
# =========================================================================

register_block({
    "type": "stats.average",
    "version": "1.0.0",
    "category": "Statistics",
    "display_name": "Arithmetic Mean",
    "description": "Calculates average across multiple inputs.",
    "inputs": [
        {"name": "in1", "type": "number", "required": True},
        {"name": "in2", "type": "number", "required": True},
        {"name": "in3", "type": "number", "required": False},
        {"name": "in4", "type": "number", "required": False}
    ],
    "outputs": [{"name": "Result", "type": "number"}],
    "config_schema": {},
    "stateful": False
})

register_block({
    "type": "stats.moving_average",
    "version": "1.0.0",
    "category": "Statistics",
    "display_name": "Moving Average (Sliding Window)",
    "description": "Maintains a sliding FIFO buffer of N samples and emits running mean.",
    "inputs": [{"name": "A", "type": "number", "required": True}],
    "outputs": [
        {"name": "Average", "type": "number"},
        {"name": "Count", "type": "integer"}
    ],
    "config_schema": {
        "window_size": {"type": "integer", "default": 10, "min": 2, "max": 1000}
    },
    "stateful": True
})

register_block({
    "type": "stats.rolling_min_max",
    "version": "1.0.0",
    "category": "Statistics",
    "display_name": "Rolling Min / Max",
    "description": "Tracks minimum and maximum observed over sliding window.",
    "inputs": [{"name": "A", "type": "number", "required": True}],
    "outputs": [
        {"name": "Min", "type": "number"},
        {"name": "Max", "type": "number"},
        {"name": "Spread", "type": "number"}
    ],
    "config_schema": {
        "window_size": {"type": "integer", "default": 20}
    },
    "stateful": True
})

# =========================================================================
# D5. TIME AND SIGNAL BLOCKS
# =========================================================================

register_block({
    "type": "signal.delta",
    "version": "1.0.0",
    "category": "Time and Signal",
    "display_name": "Delta (Rate of Change)",
    "description": "Computes difference between current sample and previous sample (Delta = A - A_prev).",
    "inputs": [{"name": "A", "type": "number", "required": True}],
    "outputs": [
        {"name": "Delta", "type": "number"},
        {"name": "RatePerSec", "type": "number"}
    ],
    "config_schema": {},
    "stateful": True
})

register_block({
    "type": "signal.accumulator",
    "version": "1.0.0",
    "category": "Time and Signal",
    "display_name": "Flow Totalizer / Accumulator",
    "description": "Integrates instantaneous rate (m3/h, kg/s) over elapsed time to yield cumulative quantity.",
    "inputs": [
        {"name": "Rate", "type": "number", "required": True},
        {"name": "Reset", "type": "boolean", "required": False}
    ],
    "outputs": [
        {"name": "Total", "type": "number"}
    ],
    "config_schema": {
        "time_unit": {"type": "string", "enum": ["second", "minute", "hour"], "default": "hour"}
    },
    "stateful": True
})

register_block({
    "type": "signal.deadband",
    "version": "1.0.0",
    "category": "Time and Signal",
    "display_name": "Deadband Filter",
    "description": "Filters noise by only propagating output when change exceeds threshold band.",
    "inputs": [{"name": "A", "type": "number", "required": True}],
    "outputs": [{"name": "Filtered", "type": "number"}],
    "config_schema": {
        "band": {"type": "number", "default": 0.5}
    },
    "stateful": True
})

register_block({
    "type": "signal.quality_check",
    "version": "1.0.0",
    "category": "Time and Signal",
    "display_name": "Quality & Freshness Guard",
    "description": "Verifies data quality flag is GOOD and timestamp is within freshness envelope.",
    "inputs": [
        {"name": "Value", "type": "any", "required": True},
        {"name": "Quality", "type": "string", "required": True}
    ],
    "outputs": [
        {"name": "ValidValue", "type": "any"},
        {"name": "IsReliable", "type": "boolean"}
    ],
    "config_schema": {
        "allow_uncertain": {"type": "boolean", "default": False}
    },
    "stateful": False
})

# =========================================================================
# D6. INDUSTRIAL CALCULATION BLOCKS
# =========================================================================

register_block({
    "type": "industrial.diff_pressure",
    "version": "1.0.0",
    "category": "Industrial Calculation",
    "display_name": "Differential Pressure (Delta P)",
    "description": "Computes pressure differential across orifice, filter, or column trays (Delta P = High - Low).",
    "inputs": [
        {"name": "P_High", "type": "number", "required": True},
        {"name": "P_Low", "type": "number", "required": True}
    ],
    "outputs": [
        {"name": "DeltaP", "type": "number"},
        {"name": "FoulingAlarm", "type": "boolean"}
    ],
    "config_schema": {
        "alarm_threshold": {"type": "number", "default": 50.0}
    },
    "stateful": False
})

register_block({
    "type": "industrial.pump_head",
    "version": "1.0.0",
    "category": "Industrial Calculation",
    "display_name": "API 610 Centrifugal Pump Head",
    "description": "Computes differential head in meters and estimated hydraulic power in kW.",
    "inputs": [
        {"name": "P_Suction_kPa", "type": "number", "required": True},
        {"name": "P_Discharge_kPa", "type": "number", "required": True},
        {"name": "Density_kg_m3", "type": "number", "required": True},
        {"name": "Flow_m3_h", "type": "number", "required": True}
    ],
    "outputs": [
        {"name": "Head_m", "type": "number"},
        {"name": "HydraulicPower_kW", "type": "number"}
    ],
    "config_schema": {},
    "stateful": False
})

register_block({
    "type": "industrial.thermal_efficiency",
    "version": "1.0.0",
    "category": "Industrial Calculation",
    "display_name": "Heat Exchanger & Furnace Efficiency",
    "description": "Calculates thermal efficiency percentage from heat recovered versus heat supplied.",
    "inputs": [
        {"name": "Heat_Recovered", "type": "number", "required": True},
        {"name": "Heat_Supplied", "type": "number", "required": True}
    ],
    "outputs": [
        {"name": "Efficiency_Pct", "type": "number"},
        {"name": "Status", "type": "string"}
    ],
    "config_schema": {},
    "stateful": False
})

register_block({
    "type": "industrial.oee",
    "version": "1.0.0",
    "category": "Industrial Calculation",
    "display_name": "Overall Equipment Effectiveness (OEE)",
    "description": "Computes standard OEE = Availability × Performance × Quality.",
    "inputs": [
        {"name": "OperatingHours", "type": "number", "required": True},
        {"name": "PlannedHours", "type": "number", "required": True},
        {"name": "ActualOutput", "type": "number", "required": True},
        {"name": "TargetCapacity", "type": "number", "required": True},
        {"name": "GoodUnits", "type": "number", "required": True}
    ],
    "outputs": [
        {"name": "OEE_Pct", "type": "number"},
        {"name": "Availability", "type": "number"},
        {"name": "Performance", "type": "number"},
        {"name": "Quality", "type": "number"}
    ],
    "config_schema": {},
    "stateful": False
})

register_block({
    "type": "industrial.unit_conversion",
    "version": "1.0.0",
    "category": "Industrial Calculation",
    "display_name": "Unit Converter",
    "description": "Converts between industrial units (°C <-> °F, kPa <-> bar <-> psi, m3/h <-> gpm).",
    "inputs": [{"name": "Value", "type": "number", "required": True}],
    "outputs": [{"name": "Converted", "type": "number"}],
    "config_schema": {
        "conversion_type": {
            "type": "string",
            "enum": ["C_to_F", "F_to_C", "kPa_to_bar", "bar_to_kPa", "kPa_to_psi", "psi_to_kPa", "m3h_to_Lmin"],
            "default": "C_to_F"
        }
    },
    "stateful": False
})

# =========================================================================
# D7. OUTPUT BLOCKS
# =========================================================================

register_block({
    "type": "output.runtime_attribute",
    "version": "1.0.0",
    "category": "Output",
    "display_name": "Write Runtime Asset Attribute",
    "description": "Persists calculated value directly to target Runtime Attribute on an asset.",
    "inputs": [
        {"name": "Value", "type": "any", "required": True}
    ],
    "outputs": [
        {"name": "Success", "type": "boolean"},
        {"name": "WrittenAt", "type": "string"}
    ],
    "config_schema": {
        "asset_id": {"type": "string", "label": "Target Asset ID", "required": True},
        "attribute_id": {"type": "string", "label": "Target Attribute ID", "required": True},
        "attribute_name": {"type": "string", "label": "Target Attribute Name", "required": True}
    },
    "stateful": False
})

register_block({
    "type": "output.calculated_kpi",
    "version": "1.0.0",
    "category": "Output",
    "display_name": "Update Plant KPI Attribute",
    "description": "Updates high-visibility plant KPI metric and pushes real-time WebSocket frame.",
    "inputs": [
        {"name": "KPI_Value", "type": "number", "required": True}
    ],
    "outputs": [{"name": "Success", "type": "boolean"}],
    "config_schema": {
        "kpi_tag": {"type": "string", "label": "KPI Tag Name (e.g. CDU_101.OEE)", "required": True}
    },
    "stateful": False
})

register_block({
    "type": "output.historical_point",
    "version": "1.0.0",
    "category": "Output",
    "display_name": "Store Historical Point",
    "description": "Inserts record into PostgreSQL historical_points partition for historian trending.",
    "inputs": [
        {"name": "Value", "type": "number", "required": True}
    ],
    "outputs": [{"name": "Success", "type": "boolean"}],
    "config_schema": {
        "tag_name": {"type": "string", "label": "Historian Tag Name", "required": True}
    },
    "stateful": False
})

register_block({
    "type": "output.execution_log",
    "version": "1.0.0",
    "category": "Output",
    "display_name": "Write Execution Log",
    "description": "Emits structured audit entry to dm_activity_logs.",
    "inputs": [
        {"name": "Message", "type": "string", "required": True}
    ],
    "outputs": [],
    "config_schema": {
        "category": {"type": "string", "default": "BLOCK"}
    },
    "stateful": False
})

# =========================================================================
# PYTHON NATIVE EXECUTION DISPATCHER
# =========================================================================

def execute_block(
    block_type: str,
    inputs: Dict[str, Any],
    config: Dict[str, Any],
    state: Optional[Dict[str, Any]] = None
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Executes a registered Function Block.
    Returns (outputs, new_state).
    """
    state = state or {}
    outputs: Dict[str, Any] = {}
    new_state = dict(state)

    # D1. Input
    if block_type == "input.constant":
        outputs["value"] = config.get("value", 1.0)

    elif block_type == "input.timestamp":
        now = datetime.datetime.utcnow()
        outputs["epoch_ms"] = int(now.timestamp() * 1000)
        outputs["iso_string"] = now.isoformat() + "Z"

    # D2. Math
    elif block_type == "math.add":
        a = float(inputs.get("A", 0.0) or 0.0)
        b = float(inputs.get("B", 0.0) or 0.0)
        outputs["Result"] = round(a + b, 4)

    elif block_type == "math.subtract":
        a = float(inputs.get("A", 0.0) or 0.0)
        b = float(inputs.get("B", 0.0) or 0.0)
        outputs["Result"] = round(a - b, 4)

    elif block_type == "math.multiply":
        a = float(inputs.get("A", 1.0) or 1.0)
        b = float(inputs.get("B", 1.0) or 1.0)
        outputs["Result"] = round(a * b, 4)

    elif block_type == "math.divide":
        a = float(inputs.get("A", 0.0) or 0.0)
        b = float(inputs.get("B", 0.0) or 0.0)
        if abs(b) < 1e-9:
            outputs["Result"] = config.get("fallback_on_zero", 0.0)
            outputs["is_zero_div"] = True
        else:
            outputs["Result"] = round(a / b, 4)
            outputs["is_zero_div"] = False

    elif block_type == "math.power":
        base = float(inputs.get("Base", 0.0) or 0.0)
        exp = float(inputs.get("Exponent", 1.0) or 1.0)
        outputs["Result"] = round(math.pow(base, exp), 4)

    elif block_type == "math.sqrt":
        a = max(0.0, float(inputs.get("A", 0.0) or 0.0))
        outputs["Result"] = round(math.sqrt(a), 4)

    elif block_type == "math.abs":
        a = float(inputs.get("A", 0.0) or 0.0)
        outputs["Result"] = round(abs(a), 4)

    elif block_type == "math.min":
        a = float(inputs.get("A", 0.0) or 0.0)
        b = float(inputs.get("B", 0.0) or 0.0)
        outputs["Result"] = min(a, b)

    elif block_type == "math.max":
        a = float(inputs.get("A", 0.0) or 0.0)
        b = float(inputs.get("B", 0.0) or 0.0)
        outputs["Result"] = max(a, b)

    elif block_type == "math.round":
        a = float(inputs.get("A", 0.0) or 0.0)
        dec = int(config.get("decimals", 2))
        outputs["Result"] = round(a, dec)

    elif block_type == "math.clamp":
        a = float(inputs.get("A", 0.0) or 0.0)
        lo = float(inputs.get("Min", config.get("default_min", 0.0)))
        hi = float(inputs.get("Max", config.get("default_max", 100.0)))
        outputs["Result"] = max(lo, min(a, hi))

    elif block_type == "math.scale":
        a = float(inputs.get("A", 0.0) or 0.0)
        in_min = float(config.get("in_min", 0.0))
        in_max = float(config.get("in_max", 100.0))
        out_min = float(config.get("out_min", 0.0))
        out_max = float(config.get("out_max", 1.0))
        span = in_max - in_min
        if abs(span) < 1e-9:
            outputs["Result"] = out_min
        else:
            outputs["Result"] = round(out_min + ((a - in_min) / span) * (out_max - out_min), 4)

    elif block_type == "math.linear_interpolation":
        x = float(inputs.get("X", 0.0) or 0.0)
        x0, y0 = float(config.get("x0", 0.0)), float(config.get("y0", 0.0))
        x1, y1 = float(config.get("x1", 100.0)), float(config.get("y1", 100.0))
        if abs(x1 - x0) < 1e-9:
            outputs["Y"] = y0
        else:
            outputs["Y"] = round(y0 + (x - x0) * (y1 - y0) / (x1 - x0), 4)

    # D3. Logic
    elif block_type == "logic.and":
        outputs["Result"] = bool(inputs.get("A")) and bool(inputs.get("B"))

    elif block_type == "logic.or":
        outputs["Result"] = bool(inputs.get("A")) or bool(inputs.get("B"))

    elif block_type == "logic.not":
        outputs["Result"] = not bool(inputs.get("A"))

    elif block_type == "logic.greater_than":
        outputs["Result"] = float(inputs.get("A", 0.0)) > float(inputs.get("B", 0.0))

    elif block_type == "logic.less_than":
        outputs["Result"] = float(inputs.get("A", 0.0)) < float(inputs.get("B", 0.0))

    elif block_type == "logic.between":
        a = float(inputs.get("A", 0.0))
        lo = float(inputs.get("Low", 0.0))
        hi = float(inputs.get("High", 100.0))
        outputs["Result"] = lo <= a <= hi

    elif block_type == "logic.if_else":
        cond = bool(inputs.get("Condition"))
        outputs["Result"] = inputs.get("TrueVal") if cond else inputs.get("FalseVal")

    # D4. Stats
    elif block_type == "stats.average":
        nums = [float(v) for k, v in inputs.items() if v is not None and isinstance(v, (int, float))]
        outputs["Result"] = round(sum(nums) / len(nums), 4) if nums else 0.0

    elif block_type == "stats.moving_average":
        w_size = int(config.get("window_size", 10))
        val = float(inputs.get("A", 0.0) or 0.0)
        history = list(state.get("history", []))
        history.append(val)
        if len(history) > w_size:
            history = history[-w_size:]
        new_state["history"] = history
        outputs["Average"] = round(sum(history) / len(history), 4)
        outputs["Count"] = len(history)

    elif block_type == "stats.rolling_min_max":
        w_size = int(config.get("window_size", 20))
        val = float(inputs.get("A", 0.0) or 0.0)
        history = list(state.get("history", []))
        history.append(val)
        if len(history) > w_size:
            history = history[-w_size:]
        new_state["history"] = history
        min_v = min(history)
        max_v = max(history)
        outputs["Min"] = min_v
        outputs["Max"] = max_v
        outputs["Spread"] = round(max_v - min_v, 4)

    # D5. Time & Signal
    elif block_type == "signal.delta":
        val = float(inputs.get("A", 0.0) or 0.0)
        prev_val = state.get("prev_val", val)
        prev_time = state.get("prev_time", time.time())
        now_time = time.time()
        dt = max(0.001, now_time - prev_time)
        delta = val - prev_val
        new_state["prev_val"] = val
        new_state["prev_time"] = now_time
        outputs["Delta"] = round(delta, 4)
        outputs["RatePerSec"] = round(delta / dt, 4)

    elif block_type == "signal.accumulator":
        rate = float(inputs.get("Rate", 0.0) or 0.0)
        reset = bool(inputs.get("Reset", False))
        unit = config.get("time_unit", "hour")
        div = 3600.0 if unit == "hour" else (60.0 if unit == "minute" else 1.0)
        
        now = time.time()
        prev_time = state.get("prev_time", now)
        dt = now - prev_time
        new_state["prev_time"] = now

        curr_total = 0.0 if reset else float(state.get("total", 0.0))
        increment = (rate * dt) / div
        curr_total += increment
        new_state["total"] = curr_total
        outputs["Total"] = round(curr_total, 4)

    elif block_type == "signal.deadband":
        val = float(inputs.get("A", 0.0) or 0.0)
        band = float(config.get("band", 0.5))
        last_out = float(state.get("last_out", val))
        if abs(val - last_out) >= band:
            last_out = val
            new_state["last_out"] = last_out
        outputs["Filtered"] = last_out

    # D6. Industrial Calc
    elif block_type == "industrial.diff_pressure":
        p_hi = float(inputs.get("P_High", 0.0) or 0.0)
        p_lo = float(inputs.get("P_Low", 0.0) or 0.0)
        dp = round(p_hi - p_lo, 2)
        outputs["DeltaP"] = dp
        outputs["FoulingAlarm"] = dp >= float(config.get("alarm_threshold", 50.0))

    elif block_type == "industrial.pump_head":
        ps = float(inputs.get("P_Suction_kPa", 124.5) or 124.5)
        pd = float(inputs.get("P_Discharge_kPa", 582.4) or 582.4)
        rho = float(inputs.get("Density_kg_m3", 842.0) or 842.0)
        q = float(inputs.get("Flow_m3_h", 450.0) or 450.0)
        g = 9.80665
        delta_p = (pd - ps) * 1000.0  # Pa
        head = delta_p / (rho * g) if rho > 0 else 0.0
        q_m3s = q / 3600.0
        kw = (rho * g * q_m3s * head) / 1000.0 if head > 0 else 0.0
        outputs["Head_m"] = round(head, 2)
        outputs["HydraulicPower_kW"] = round(kw, 2)

    elif block_type == "industrial.thermal_efficiency":
        rec = float(inputs.get("Heat_Recovered", 0.0) or 0.0)
        sup = max(1e-6, float(inputs.get("Heat_Supplied", 1.0) or 1.0))
        eff = round((rec / sup) * 100.0, 2)
        outputs["Efficiency_Pct"] = eff
        outputs["Status"] = "OPTIMAL" if eff >= 80.0 else ("ACCEPTABLE" if eff >= 65.0 else "POOR")

    elif block_type == "industrial.oee":
        op_h = float(inputs.get("OperatingHours", 24.0) or 24.0)
        plan_h = max(0.1, float(inputs.get("PlannedHours", 24.0) or 24.0))
        avail = min(1.0, op_h / plan_h)

        act_out = float(inputs.get("ActualOutput", 940.0) or 940.0)
        cap = max(1.0, float(inputs.get("TargetCapacity", 1000.0) or 1000.0))
        perf = min(1.0, act_out / cap)

        good = float(inputs.get("GoodUnits", 928.0) or 928.0)
        qual = min(1.0, (good / act_out) if act_out > 0 else 1.0)

        oee = round(avail * perf * qual * 100.0, 2)
        outputs["OEE_Pct"] = oee
        outputs["Availability"] = round(avail, 3)
        outputs["Performance"] = round(perf, 3)
        outputs["Quality"] = round(qual, 3)

    elif block_type == "industrial.unit_conversion":
        v = float(inputs.get("Value", 0.0) or 0.0)
        ctype = config.get("conversion_type", "C_to_F")
        if ctype == "C_to_F":
            outputs["Converted"] = round(v * 1.8 + 32, 2)
        elif ctype == "F_to_C":
            outputs["Converted"] = round((v - 32) / 1.8, 2)
        elif ctype == "kPa_to_bar":
            outputs["Converted"] = round(v / 100.0, 4)
        elif ctype == "bar_to_kPa":
            outputs["Converted"] = round(v * 100.0, 2)
        elif ctype == "kPa_to_psi":
            outputs["Converted"] = round(v * 0.145038, 3)
        elif ctype == "psi_to_kPa":
            outputs["Converted"] = round(v / 0.145038, 2)
        else:
            outputs["Converted"] = v

    # D7. Output
    elif block_type.startswith("output."):
        outputs["Success"] = True
        outputs["WrittenAt"] = datetime.datetime.utcnow().isoformat() + "Z"

    elif block_type.startswith("custom.") or (block_type in BLOCK_REGISTRY and BLOCK_REGISTRY[block_type].get("is_custom")):
        reg_info = BLOCK_REGISTRY.get(block_type, {})
        script = reg_info.get("script_code", "")
        if script:
            from app.services.js_executor import execute_js_sandbox_sync
            res = execute_js_sandbox_sync(
                script=script,
                contract="FB_CALCULATE",
                ctx={"parameters": config},
                inputs=inputs,
                timeout_ms=2000
            )
            if res.get("success") and isinstance(res.get("result"), dict):
                outputs.update(res["result"])
            else:
                outputs["error"] = res.get("error", "Custom script execution failed")
        else:
            outputs["Value"] = inputs.get("A", 0.0)

    else:
        outputs["Value"] = inputs.get("A", 0.0)

    return outputs, new_state

