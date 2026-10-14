import sys
import json
sys.path.append('backend')
from register_all_machinery_symbols import NEW_MACHINERY_SYMBOLS

with open('backend/app/services/scada_symbol_catalog.py', 'r', encoding='utf-8') as f:
    text = f.read()

if 'EXTENDED_3D_AND_TB_SYMBOLS' not in text:
    serialized = json.dumps(NEW_MACHINERY_SYMBOLS, indent=2)
    addition = f'''

# =============================================================================
# 11. HIGH-RESOLUTION 3D MACHINERY & THINGSBOARD VECTOR SYMBOLS (EXTENDED)
# =============================================================================
import json as _json

EXTENDED_3D_AND_TB_SYMBOLS = _json.loads("""{serialized.replace('\\', '\\\\').replace('"', '\\"')}""")

# Ensure extended symbols are registered in INDUSTRIAL_SYMBOL_CATALOG
_existing_cat_ids = {{s["id"] for s in INDUSTRIAL_SYMBOL_CATALOG}}
for _sym in EXTENDED_3D_AND_TB_SYMBOLS:
    if _sym["id"] not in _existing_cat_ids:
        INDUSTRIAL_SYMBOL_CATALOG.append(_sym)
        _existing_cat_ids.add(_sym["id"])
'''
    with open('backend/app/services/scada_symbol_catalog.py', 'a', encoding='utf-8') as f:
        f.write(addition)
    print("Appended extended symbols to scada_symbol_catalog.py!")
else:
    print("Already appended!")
