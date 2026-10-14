import math
from typing import List, Dict, Any

def lttb_downsample(data: List[Dict[str, Any]], threshold: int) -> List[Dict[str, Any]]:
    """
    Largest-Triangle-Three-Buckets (LTTB) downsampling algorithm.
    Each point is a dict with 'timestamp' (ISO string or unix ms) and 'value' (float or None).
    """
    if len(data) <= threshold or threshold < 3:
        return data

    sampled: List[Dict[str, Any]] = []
    bucket_size = (len(data) - 2) / (threshold - 2)

    a = 0  # Initially point 0
    sampled.append(data[a])

    for i in range(threshold - 2):
        # Calculate point average for next bucket (bucket C)
        avg_range_start = int(math.floor((i + 1) * bucket_size)) + 1
        avg_range_end = int(math.floor((i + 2) * bucket_size)) + 1
        avg_range_end = min(avg_range_end, len(data))

        avg_x = 0.0
        avg_y = 0.0
        count = 0

        for idx in range(avg_range_start, avg_range_end):
            val = data[idx].get("value")
            if val is not None:
                # Use index as proxy for x if timestamps are uniform, or timestamp ms
                ts = data[idx].get("ts_ms", idx)
                avg_x += ts
                avg_y += float(val)
                count += 1

        if count > 0:
            avg_x /= count
            avg_y /= count
        else:
            avg_x = avg_range_start
            avg_y = 0.0

        # Get range for current bucket (bucket B)
        range_offs = int(math.floor(i * bucket_size)) + 1
        range_to = int(math.floor((i + 1) * bucket_size)) + 1
        range_to = min(range_to, len(data))

        # Point a
        point_a_x = data[a].get("ts_ms", a)
        point_a_y = float(data[a].get("value") or 0.0)

        max_area = -1.0
        max_area_point = data[range_offs]
        next_a = range_offs

        for idx in range(range_offs, range_to):
            curr_val = data[idx].get("value")
            if curr_val is None:
                continue
            curr_x = data[idx].get("ts_ms", idx)
            curr_y = float(curr_val)

            # Calculate triangle area over points a, curr, and avg
            area = abs(
                (point_a_x - avg_x) * (curr_y - point_a_y) -
                (point_a_x - curr_x) * (avg_y - point_a_y)
            ) * 0.5

            if area > max_area:
                max_area = area
                max_area_point = data[idx]
                next_a = idx

        sampled.append(max_area_point)
        a = next_a

    # Always include last point
    sampled.append(data[-1])
    return sampled
