"""Compare native screenshot pairs (Python 3, Pillow 12.3.0).

Usage: python scripts/wp09-glyph-review.py <extracted baseline artifact> <output>
The swap visibility control preserves layout and native input scroll positions.
Count exact painted foreground pixels separately from all changed pixels.
"""

import hashlib
import json
import math
import re
import sys
from pathlib import Path

from PIL import Image, __version__ as pillow_version


def measure(visible, hidden, rect, color, scale_x, scale_y, swap):
    rgb = tuple(int(value) for value in re.findall(r"\d+", color)[:3])
    if len(rgb) != 3:
        raise ValueError(f"Unsupported color: {color}")
    width, height = visible.size
    bounds = (
        max(0, math.floor(rect["left"] * scale_x)),
        max(0, math.floor(rect["top"] * scale_y)),
        min(width, math.ceil(rect["right"] * scale_x)),
        min(height, math.ceil(rect["bottom"] * scale_y)),
    )
    if bounds[0] >= bounds[2] or bounds[1] >= bounds[3]:
        return {"foreground": 0, "repainted_foreground": 0, "repainted_foreground_inside_swap": 0, "max_foreground_channel_delta": 0, "changed": 0}
    before = list(hidden.crop(bounds).get_flattened_data())
    after = list(visible.crop(bounds).get_flattened_data())
    foreground = repainted = changed = inside = max_delta = 0
    crop_width = bounds[2] - bounds[0]
    for index, (pixel, other) in enumerate(zip(before, after, strict=True)):
        changed += pixel != other
        if pixel != rgb:
            continue
        foreground += 1
        if pixel == other:
            continue
        repainted += 1
        max_delta = max(max_delta, max(abs(a - b) for a, b in zip(pixel, other)))
        x = (bounds[0] + index % crop_width + 0.5) / scale_x
        y = (bounds[1] + index // crop_width + 0.5) / scale_y
        inside += swap["left"] <= x < swap["right"] and swap["top"] <= y < swap["bottom"]
    return {
        "foreground": foreground,
        "repainted_foreground": repainted,
        "repainted_foreground_inside_swap": inside,
        "max_foreground_channel_delta": max_delta,
        "changed": changed,
    }



directory = Path(sys.argv[1])
comparisons = directory / "glyph-comparisons.json"
records = json.loads(comparisons.read_text())
results = []
for record in records:
    visible_path = directory / record["visible"]
    hidden_path = directory / record["hidden"]
    with Image.open(visible_path) as source:
        visible = source.convert("RGB")
    with Image.open(hidden_path) as source:
        hidden = source.convert("RGB")
    if visible.size != hidden.size:
        raise ValueError("Control changed screenshot dimensions")
    scale_x = visible.width / record["viewport"]["width"]
    scale_y = visible.height / record["viewport"]["height"]
    if scale_x != scale_y or scale_x != record["viewport"]["dpr"]:
        raise ValueError("Unexpected screenshot / native viewport scale")
    result = {
        "key": record["key"],
        "target": record["target"],
        "sourceCommit": record["sourceCommit"],
        "zoom": record["zoom"],
        "visible_sha256": hashlib.sha256(visible_path.read_bytes()).hexdigest(),
        "hidden_sha256": hashlib.sha256(hidden_path.read_bytes()).hexdigest(),
        "inputs": [],
        "labels": [],
    }
    for node in record["inputs"]:
        result["inputs"].append({
            "value": node["value"],
            "scrollLeft": node["scrollLeft"],
            "content": measure(
                visible, hidden, node["rect"], node["color"], scale_x, scale_y, record["swap"]
            ),
            "paint_box": measure(
                visible, hidden, node["paintRect"], node["color"], scale_x, scale_y, record["swap"]
            ),
        })
    for node in record["labels"]:
        result["labels"].append({
            "text": node["text"],
            **measure(
                visible, hidden, node["rect"], node["color"], scale_x, scale_y, record["swap"]
            ),
        })
    results.append(result)

report = {
    "pillow": pillow_version,
    "comparisons_sha256": hashlib.sha256(comparisons.read_bytes()).hexdigest(),
    "pairs": len(results),
    "results": results,
}
Path(sys.argv[2]).write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
for target in ("before", "after"):
    items = [item for item in results if item["target"] == target]
    print(target, "pairs", len(items))
    for field in ("foreground", "repainted_foreground", "repainted_foreground_inside_swap", "changed"):
        print("input", field, sum(
            node["content"][field] for item in items for node in item["inputs"]
        ))
        print("input paint box", field, sum(
            node["paint_box"][field] for item in items for node in item["inputs"]
        ))
        print("label", field, sum(
            node[field] for item in items for node in item["labels"]
        ))
