import re
import json
from app.services.scada_service import scada_store

# 1. Clean existing symbols
cleaned_syms = 0
for s in scada_store.symbols:
    svg = s.get("svg_content", "")
    if "ns0:" in svg or "ns" in svg:
        clean = re.sub(r"</?ns\d+:", lambda m: "</" if m.group(0).startswith("</") else "<", svg)
        clean = re.sub(r'\sxmlns:ns\d+="[^"]*"', '', clean)
        if "xmlns=" not in clean:
            clean = re.sub(r"<svg", '<svg xmlns="http://www.w3.org/2000/svg"', clean, count=1)
        s["svg_content"] = clean
        cleaned_syms += 1

# 2. Update screen-water-transfer to balanced contiguous layout
screen = scada_store.get_screen("screen-water-transfer")
if screen:
    screen["elements"] = [
        {
            "instance_id": "inst-tank-101",
            "symbol_id": "sym-tank-vertical",
            "name": "Feed Storage Tank T-101",
            "label": "Feed Storage Tank T-101",
            "x": 80,
            "y": 240,
            "width": 170,
            "height": 260,
            "rotation": 0,
            "flipH": False,
            "flipV": False,
            "layer": 1
        },
        {
            "instance_id": "inst-pipe-suction",
            "symbol_id": "sym-pipe-flow",
            "name": "P-101 Suction Header",
            "label": "P-101 Suction Header",
            "x": 250,
            "y": 440,
            "width": 180,
            "height": 24,
            "rotation": 0,
            "flipH": False,
            "flipV": False,
            "layer": 2
        },
        {
            "instance_id": "inst-pump-101a",
            "symbol_id": "sym-pump-centrifugal",
            "name": "Water Transfer Pump P-101A",
            "label": "Water Transfer Pump P-101A",
            "x": 430,
            "y": 390,
            "width": 130,
            "height": 130,
            "rotation": 0,
            "flipH": False,
            "flipV": False,
            "layer": 3
        },
        {
            "instance_id": "inst-pipe-discharge",
            "symbol_id": "sym-pipe-flow",
            "name": "Discharge Header",
            "label": "Discharge Header",
            "x": 560,
            "y": 440,
            "width": 180,
            "height": 24,
            "rotation": 0,
            "flipH": False,
            "flipV": False,
            "layer": 4
        },
        {
            "instance_id": "inst-valve-xv101",
            "symbol_id": "sym-valve-control",
            "name": "Transfer Block Valve XV-101",
            "label": "Transfer Block Valve XV-101",
            "x": 740,
            "y": 395,
            "width": 80,
            "height": 110,
            "rotation": 0,
            "flipH": False,
            "flipV": False,
            "layer": 5
        },
        {
            "instance_id": "inst-pipe-feed",
            "symbol_id": "sym-pipe-flow",
            "name": "T-102 Feed Run",
            "label": "T-102 Feed Run",
            "x": 820,
            "y": 440,
            "width": 180,
            "height": 24,
            "rotation": 0,
            "flipH": False,
            "flipV": False,
            "layer": 6
        },
        {
            "instance_id": "inst-tank-102",
            "symbol_id": "sym-tank-vertical",
            "name": "Product Receiving Tank T-102",
            "label": "Product Receiving Tank T-102",
            "x": 1000,
            "y": 240,
            "width": 170,
            "height": 260,
            "rotation": 0,
            "flipH": False,
            "flipV": False,
            "layer": 7
        },
        {
            "instance_id": "inst-pt-101",
            "symbol_id": "sym-instrument-badge",
            "name": "PT-101 Discharge Pressure",
            "label": "PT-101 Discharge Pressure",
            "x": 575,
            "y": 345,
            "width": 135,
            "height": 65,
            "rotation": 0,
            "flipH": False,
            "flipV": False,
            "layer": 8
        },
        {
            "instance_id": "inst-ft-101",
            "symbol_id": "sym-instrument-badge",
            "name": "FT-101 Transfer Flowrate",
            "label": "FT-101 Transfer Flowrate",
            "x": 840,
            "y": 345,
            "width": 135,
            "height": 65,
            "rotation": 0,
            "flipH": False,
            "flipV": False,
            "layer": 9
        }
    ]

scada_store.persist_state()
print(f"Successfully cleaned {cleaned_syms} symbols and repositioned screen-water-transfer")
