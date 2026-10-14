import numpy as np
from PIL import Image
import os

os.makedirs('frontend/public/assets/scada/symbols_3d', exist_ok=True)

# 1. WATER PUMP from water-pump-state.webp
wp_img = Image.open('frontend/public/assets/scada/thingsboard/water-pump-state.webp')
# Crop the water pump card graphic:
# Dimensions of water-pump-state.webp: (2238, 1212)
# Card top-left: x=20, y=85, w=525, h=430
crop_wp = wp_img.crop((24, 100, 520, 480)).convert('RGBA')

# Convert white/near-white card background to transparent
data_wp = np.array(crop_wp)
r, g, b, a = data_wp[:, :, 0], data_wp[:, :, 1], data_wp[:, :, 2], data_wp[:, :, 3]
# The card background is white (#ffffff or > 248)
mask_bg = (r > 245) & (g > 245) & (b > 245)
# Also title area text "Water pump" in top left
mask_title = np.zeros_like(mask_bg)
mask_title[:45, :] = True
data_wp[mask_bg | mask_title, 3] = 0

img_wp_trans = Image.fromarray(data_wp)
bbox_wp = img_wp_trans.getbbox()
if bbox_wp:
    img_wp_trans = img_wp_trans.crop(bbox_wp)
img_wp_trans.save('frontend/public/assets/scada/symbols_3d/water_pump_3d.png')
print('Water pump 3D saved:', img_wp_trans.size)


# 2. SAND FILTER from sand-filter-state.webp
sf_img = Image.open('frontend/public/assets/scada/thingsboard/sand-filter-state.webp')
crop_sf = sf_img.crop((24, 100, 520, 560)).convert('RGBA')
data_sf = np.array(crop_sf)
r, g, b, a = data_sf[:, :, 0], data_sf[:, :, 1], data_sf[:, :, 2], data_sf[:, :, 3]
mask_bg = (r > 246) & (g > 246) & (b > 246)
mask_title = np.zeros_like(mask_bg)
mask_title[:45, :] = True
data_sf[mask_bg | mask_title, 3] = 0

img_sf_trans = Image.fromarray(data_sf)
bbox_sf = img_sf_trans.getbbox()
if bbox_sf:
    img_sf_trans = img_sf_trans.crop(bbox_sf)
img_sf_trans.save('frontend/public/assets/scada/symbols_3d/sand_filter_3d.png')
print('Sand filter 3D saved:', img_sf_trans.size)


# 3. HEAT PUMP from heat-pump-state.webp
hp_img = Image.open('frontend/public/assets/scada/thingsboard/heat-pump-state.webp')
crop_hp = hp_img.crop((24, 100, 520, 560)).convert('RGBA')
data_hp = np.array(crop_hp)
r, g, b, a = data_hp[:, :, 0], data_hp[:, :, 1], data_hp[:, :, 2], data_hp[:, :, 3]
mask_bg = (r > 246) & (g > 246) & (b > 246)
mask_title = np.zeros_like(mask_bg)
mask_title[:45, :] = True
data_hp[mask_bg | mask_title, 3] = 0

img_hp_trans = Image.fromarray(data_hp)
bbox_hp = img_hp_trans.getbbox()
if bbox_hp:
    img_hp_trans = img_hp_trans.crop(bbox_hp)
img_hp_trans.save('frontend/public/assets/scada/symbols_3d/heat_pump_3d.png')
print('Heat pump 3D saved:', img_hp_trans.size)


# 4. SWIMMING POOL BASIN from traditional.webp
trad_img = Image.open('frontend/public/assets/scada/thingsboard/traditional.webp')
# Basin in traditional.webp:
# x: 575..1505, y: 110..425
crop_basin = trad_img.crop((570, 105, 1510, 430)).convert('RGBA')
data_basin = np.array(crop_basin)
r, g, b, a = data_basin[:, :, 0], data_basin[:, :, 1], data_basin[:, :, 2], data_basin[:, :, 3]
# surrounding background in traditional.webp is #ececec ~ #efefef
mask_bg = (r > 230) & (g > 230) & (b > 230) & (abs(r.astype(int) - g.astype(int)) < 8) & (abs(g.astype(int) - b.astype(int)) < 8)
data_basin[mask_bg, 3] = 0

img_basin_trans = Image.fromarray(data_basin)
bbox_basin = img_basin_trans.getbbox()
if bbox_basin:
    img_basin_trans = img_basin_trans.crop(bbox_basin)
img_basin_trans.save('frontend/public/assets/scada/symbols_3d/pool_basin_3d.png')
print('Pool basin 3D saved:', img_basin_trans.size)


# 5. SPOKE HANDWHEEL GATE VALVE from traditional.webp
# x: 1650..1820, y: 180..270
crop_valve = trad_img.crop((1650, 180, 1820, 270)).convert('RGBA')
data_v = np.array(crop_valve)
r, g, b, a = data_v[:, :, 0], data_v[:, :, 1], data_v[:, :, 2], data_v[:, :, 3]
mask_bg = (r > 230) & (g > 230) & (b > 230)
data_v[mask_bg, 3] = 0
img_v_trans = Image.fromarray(data_v)
bbox_v = img_v_trans.getbbox()
if bbox_v:
    img_v_trans = img_v_trans.crop(bbox_v)
img_v_trans.save('frontend/public/assets/scada/symbols_3d/spoke_gate_valve_3d.png')
print('Spoke valve 3D saved:', img_v_trans.size)


# 6. FLOW METER from traditional.webp
# x: 1380..1470, y: 560..660
crop_fm = trad_img.crop((1380, 560, 1475, 660)).convert('RGBA')
data_fm = np.array(crop_fm)
r, g, b, a = data_fm[:, :, 0], data_fm[:, :, 1], data_fm[:, :, 2], data_fm[:, :, 3]
mask_bg = (r > 230) & (g > 230) & (b > 230)
data_fm[mask_bg, 3] = 0
img_fm_trans = Image.fromarray(data_fm)
bbox_fm = img_fm_trans.getbbox()
if bbox_fm:
    img_fm_trans = img_fm_trans.crop(bbox_fm)
img_fm_trans.save('frontend/public/assets/scada/symbols_3d/flow_meter_3d.png')
print('Flow meter 3D saved:', img_fm_trans.size)


# 7. LINT STRAINER POT from traditional.webp
# x: 500..570, y: 710..880
crop_pot = trad_img.crop((500, 715, 575, 875)).convert('RGBA')
data_pot = np.array(crop_pot)
r, g, b, a = data_pot[:, :, 0], data_pot[:, :, 1], data_pot[:, :, 2], data_pot[:, :, 3]
mask_bg = (r > 230) & (g > 230) & (b > 230)
data_pot[mask_bg, 3] = 0
img_pot_trans = Image.fromarray(data_pot)
bbox_pot = img_pot_trans.getbbox()
if bbox_pot:
    img_pot_trans = img_pot_trans.crop(bbox_pot)
img_pot_trans.save('frontend/public/assets/scada/symbols_3d/lint_strainer_3d.png')
print('Lint strainer 3D saved:', img_pot_trans.size)

print('All 3D transparent equipment cutouts extracted successfully!')
