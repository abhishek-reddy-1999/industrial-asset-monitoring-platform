import numpy as np
from PIL import Image

# 1. Clean Water Pump
wp_full = Image.open('frontend/public/assets/scada/thingsboard/water-pump-state.webp').convert('RGBA')
crop_wp = wp_full.crop((35, 150, 465, 455))
arr_wp = np.array(crop_wp)
r, g, b = arr_wp[:,:,0], arr_wp[:,:,1], arr_wp[:,:,2]
bg = (r > 235) & (g > 235) & (b > 235)
arr_wp[bg, 3] = 0
# mask out any stray letters in top
arr_wp[:10, :100, 3] = 0
im_wp = Image.fromarray(arr_wp)
bbox = im_wp.getbbox()
if bbox:
    im_wp = im_wp.crop(bbox)
im_wp.save('frontend/public/assets/scada/symbols_3d/water_pump_3d.png')
print('Water pump cleaned:', im_wp.size)

# 2. Clean Sand Filter
sf_full = Image.open('frontend/public/assets/scada/thingsboard/sand-filter-state.webp').convert('RGBA')
# The sand filter is centered in x: 130..430, y: 140..555
crop_sf = sf_full.crop((125, 140, 435, 555))
arr_sf = np.array(crop_sf)
r, g, b = arr_sf[:,:,0], arr_sf[:,:,1], arr_sf[:,:,2]
bg = (r > 238) & (g > 238) & (b > 238)
arr_sf[bg, 3] = 0
im_sf = Image.fromarray(arr_sf)
bbox = im_sf.getbbox()
if bbox:
    im_sf = im_sf.crop(bbox)
im_sf.save('frontend/public/assets/scada/symbols_3d/sand_filter_3d.png')
print('Sand filter cleaned:', im_sf.size)

# 3. Clean Heat Pump
hp_full = Image.open('frontend/public/assets/scada/thingsboard/heat-pump-state.webp').convert('RGBA')
# Heat pump unit is x: 35..480, y: 130..485
crop_hp = hp_full.crop((35, 130, 485, 485))
arr_hp = np.array(crop_hp)
r, g, b = arr_hp[:,:,0], arr_hp[:,:,1], arr_hp[:,:,2]
bg = (r > 238) & (g > 238) & (b > 238)
arr_hp[bg, 3] = 0
im_hp = Image.fromarray(arr_hp)
bbox = im_hp.getbbox()
if bbox:
    im_hp = im_hp.crop(bbox)
im_hp.save('frontend/public/assets/scada/symbols_3d/heat_pump_3d.png')
print('Heat pump cleaned:', im_hp.size)

# 4. Clean Swimming Pool Basin
trad_full = Image.open('frontend/public/assets/scada/thingsboard/traditional.webp').convert('RGBA')
# Pool basin is x: 575..1505, y: 110..420
crop_pool = trad_full.crop((575, 110, 1505, 420))
arr_pool = np.array(crop_pool)
r, g, b = arr_pool[:,:,0], arr_pool[:,:,1], arr_pool[:,:,2]
# Background is gray: #ececec
bg = (r > 230) & (g > 230) & (b > 230) & (abs(r.astype(int) - g.astype(int)) < 8) & (abs(g.astype(int) - b.astype(int)) < 8)
arr_pool[bg, 3] = 0
im_pool = Image.fromarray(arr_pool)
bbox = im_pool.getbbox()
if bbox:
    im_pool = im_pool.crop(bbox)
im_pool.save('frontend/public/assets/scada/symbols_3d/pool_basin_3d.png')
print('Pool basin cleaned:', im_pool.size)

# 5. Clean Spoke Handwheel Valve
crop_v = trad_full.crop((1655, 185, 1815, 265))
arr_v = np.array(crop_v)
r, g, b = arr_v[:,:,0], arr_v[:,:,1], arr_v[:,:,2]
bg = (r > 230) & (g > 230) & (b > 230)
arr_v[bg, 3] = 0
im_v = Image.fromarray(arr_v)
bbox = im_v.getbbox()
if bbox:
    im_v = im_v.crop(bbox)
im_v.save('frontend/public/assets/scada/symbols_3d/spoke_gate_valve_3d.png')
print('Spoke valve cleaned:', im_v.size)

# 6. Clean Flow Meter
crop_fm = trad_full.crop((1380, 565, 1465, 650))
arr_fm = np.array(crop_fm)
r, g, b = arr_fm[:,:,0], arr_fm[:,:,1], arr_fm[:,:,2]
bg = (r > 230) & (g > 230) & (b > 230)
arr_fm[bg, 3] = 0
im_fm = Image.fromarray(arr_fm)
bbox = im_fm.getbbox()
if bbox:
    im_fm = im_fm.crop(bbox)
im_fm.save('frontend/public/assets/scada/symbols_3d/flow_meter_3d.png')
print('Flow meter cleaned:', im_fm.size)

# 7. Clean Lint Strainer
crop_pot = trad_full.crop((505, 720, 570, 868))
arr_pot = np.array(crop_pot)
r, g, b = arr_pot[:,:,0], arr_pot[:,:,1], arr_pot[:,:,2]
bg = (r > 230) & (g > 230) & (b > 230)
arr_pot[bg, 3] = 0
im_pot = Image.fromarray(arr_pot)
bbox = im_pot.getbbox()
if bbox:
    im_pot = im_pot.crop(bbox)
im_pot.save('frontend/public/assets/scada/symbols_3d/lint_strainer_3d.png')
print('Lint strainer cleaned:', im_pot.size)
