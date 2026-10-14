from generate_complete_tb_pool_screen import build_complete_pool_screen

elems, conns = build_complete_pool_screen()
elems_dict = {e['instance_id']: e for e in elems}

def get_port_pos(el, pid):
    w = el.get('width', 80)
    h = el.get('height', 80)
    x = el.get('x', 0)
    y = el.get('y', 0)
    rot = el.get('rotation', 0)

    if rot == 90:
        if pid in ('inlet', 'top'): return (x + w/2, y)
        if pid in ('outlet', 'bottom'): return (x + w/2, y + h)

    if pid in ('suction', 'inlet', 'left'): return (x, y + h/2)
    if pid in ('discharge', 'outlet', 'right'): return (x + w, y + h/2)
    if pid in ('top', 'vent'): return (x + w/2, y)
    if pid in ('bottom', 'drain'): return (x + w/2, y + h)
    if pid == 'skimmer': return (x, y + 100)
    if pid == 'return_jets': return (x + w, y + 100)
    if pid == 'waste': return (x + w * 0.75, y + h)
    if pid == 'water_in': return (x, y + 35)
    if pid == 'water_out': return (x + w, y + 35)
    return (x + w/2, y + h/2)

def compute_path(conn, p1, p2):
    if abs(p1[1] - p2[1]) < 2:
        return f"M {p1[0]} {p1[1]} L {p2[0]} {p2[1]}"
    if abs(p1[0] - p2[0]) < 2:
        return f"M {p1[0]} {p1[1]} L {p2[0]} {p2[1]}"

    from_port = conn.get('from_port', '')
    to_port = conn.get('to_port', '')
    cid = conn.get('id', '')

    if cid == 'conn-ph-valve9':
        return f"M {p1[0]} {p1[1]} L 1265 {p1[1]} L 1265 {p2[1]} L {p2[0]} {p2[1]}"

    is_from_vert = from_port in ('top', 'bottom', 'waste', 'drain', 'vent')
    is_to_vert = to_port in ('top', 'bottom', 'waste', 'drain', 'vent')

    if is_from_vert and not is_to_vert:
        return f"M {p1[0]} {p1[1]} L {p1[0]} {p2[1]} L {p2[0]} {p2[1]}"
    elif not is_from_vert and is_to_vert:
        return f"M {p1[0]} {p1[1]} L {p2[0]} {p1[1]} L {p2[0]} {p2[1]}"
    else:
        mid_x = (p1[0] + p2[0]) / 2
        return f"M {p1[0]} {p1[1]} L {mid_x} {p1[1]} L {mid_x} {p2[1]} L {p2[0]} {p2[1]}"

print("=== COMPLETE POOL CONNECTIONS COORDINATE CHECK ===")
for c in conns:
    fe = elems_dict.get(c['from_id'])
    te = elems_dict.get(c['to_id'])
    p1 = get_port_pos(fe, c['from_port'])
    p2 = get_port_pos(te, c['to_port'])
    path = compute_path(c, p1, p2)
    print(f"{c['id']:24} | {path}")
