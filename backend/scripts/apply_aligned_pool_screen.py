import json
from generate_aligned_pool_screen import build_aligned_pool_screen

def main():
    state_path = 'backend/scada_store_state.json'
    data = json.load(open(state_path, 'r', encoding='utf-8'))
    
    elems, conns = build_aligned_pool_screen()
    
    # Heat pump adjustment: set x=950, width=171 so water_in is at 950 and water_out is at 1121
    for el in elems:
        if el['instance_id'] == 'inst-heat-pump':
            el['x'] = 950
            el['width'] = 171

    # Find screen-swimming-pool
    screen = None
    for s in data.get('screens', []):
        if s['id'] == 'screen-swimming-pool':
            screen = s
            break
            
    if not screen:
        print("screen-swimming-pool not found!")
        return
        
    screen['elements'] = elems
    screen['connections'] = conns
    
    with open(state_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
        
    print(f"Successfully updated screen-swimming-pool in {state_path}!")
    print(f"Elements: {len(elems)}, Connections: {len(conns)}")

if __name__ == '__main__':
    main()
