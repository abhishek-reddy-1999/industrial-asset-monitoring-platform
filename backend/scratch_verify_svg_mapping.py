import json

with open('backend/thingsboard_pool_reverse_engineered.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

cfg = data['configuration']
widgets = cfg.get('widgets', {})
trad = cfg.get('states', {}).get('traditional_default', {})
grid_widgets = trad.get('layouts', {}).get('main', {}).get('widgets', {})
grid_settings = trad.get('layouts', {}).get('main', {}).get('gridSettings', {})

print("Grid Settings:", grid_settings)

# Let's map each widget type to its SVG asset if it's an image/pipe/device
svg_map = {
    'system.pool': '/assets/scada/thingsboard_svg/pool.svg',
    'system.sand_filter': '/assets/scada/thingsboard_svg/sand-filter.svg',
    'system.right_motor_pump': '/assets/scada/thingsboard_svg/right-motor-pump.svg',
    'system.left_heat_pump': '/assets/scada/thingsboard_svg/left-heat-pump.svg',
    'system.horizontal_inline_flow_meter': '/assets/scada/thingsboard_svg/horizontal-inline-flow-meter.svg',
    'system.left_analog_water_level_meter': '/assets/scada/thingsboard_svg/left-analog-water-level-meter.svg',
    'system.short_bottom_filter': '/assets/scada/thingsboard_svg/short-bottom-filter.svg',
    'system.horizontal_ball_valve': '/assets/scada/thingsboard_svg/horizontal-ball-valve.svg',
    'system.vertical_ball_valve': '/assets/scada/thingsboard_svg/vertical-ball-valve.svg',
    'system.horizontal_wheel_valve': '/assets/scada/thingsboard_svg/horizontal-wheel-valve.svg',
    'system.vertical_wheel_valve': '/assets/scada/thingsboard_svg/vertical-wheel-valve.svg',
    'system.right_elbow_drain_pipe': '/assets/scada/thingsboard_svg/right-elbow-drain-pipe.svg',
    'system.horizontal_pipe': '/assets/scada/thingsboard_svg/horizontal-pipe.svg',
    'system.long_horizontal_pipe': '/assets/scada/thingsboard_svg/long-horizontal-pipe.svg',
    'system.vertical_pipe': '/assets/scada/thingsboard_svg/vertical-pipe.svg',
    'system.long_vertical_pipe': '/assets/scada/thingsboard_svg/long-vertical-pipe.svg',
    'system.bottom_tee_pipe': '/assets/scada/thingsboard_svg/bottom-tee-pipe.svg',
    'system.cross_pipe': '/assets/scada/thingsboard_svg/cross-pipe.svg',
    'system.bottom_right_elbow_pipe': '/assets/scada/thingsboard_svg/bottom-right-elbow-pipe.svg',
    'system.top_right_elbow_pipe': '/assets/scada/thingsboard_svg/top-right-elbow-pipe.svg',
    'system.left_bottom_elbow_pipe': '/assets/scada/thingsboard_svg/left-bottom-elbow-pipe.svg',
    'system.left_top_elbow_pipe': '/assets/scada/thingsboard_svg/left-top-elbow-pipe.svg',
}

# Determine max col and max row
max_col = 0
max_row = 0
elements = []
for wid, l in grid_widgets.items():
    w = widgets.get(wid, {})
    fqn = w.get('typeFullFqn', '')
    col = l.get('col', 0)
    row = l.get('row', 0)
    sx = l.get('sizeX', 0)
    sy = l.get('sizeY', 0)
    max_col = max(max_col, col + sx)
    max_row = max(max_row, row + sy)
    elements.append({
        'wid': wid,
        'type': fqn,
        'col': col,
        'row': row,
        'w': sx,
        'h': sy,
        'svg': svg_map.get(fqn)
    })

print(f"Max col: {max_col}, Max row: {max_row}, Total elements: {len(elements)}")
mapped = sum(1 for e in elements if e['svg'])
print(f"Elements mapped to official SVGs: {mapped} / {len(elements)}")
