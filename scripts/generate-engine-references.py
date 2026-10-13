"""Regenerate independent numeric fixtures with mpmath 1.3.0 (development only)."""
from pathlib import Path
import json
import mpmath as mp

mp.mp.dps = 90
cases = []


def add(src, expected, angle=None):
    case = {"src": src, "expected": mp.nstr(expected, 65)}
    if angle:
        case["ctx"] = {"angleMode": angle}
    cases.append(case)


for text in ["0.125", "2", "10"]:
    x = mp.mpf(text)
    for name, fn in [
        ("sqrt", mp.sqrt), ("cbrt", lambda v: mp.root(v, 3)),
        ("abs", abs), ("exp", mp.exp), ("ln", mp.log), ("log", mp.log10),
        ("log2", lambda v: mp.log(v, 2)), ("sin", mp.sin), ("cos", mp.cos),
        ("tan", mp.tan), ("atan", mp.atan),
    ]:
        add(f"{name}({text})", fn(x))
for text in ["-0.75", "0.125", "0.8"]:
    for name, fn in [("asin", mp.asin), ("acos", mp.acos)]:
        for mode, factor in [("rad", 1), ("deg", 180 / mp.pi), ("grad", 200 / mp.pi)]:
            add(f"{name}({text})", fn(mp.mpf(text)) * factor, mode)
for n, x in [(5, 2), (7, 123), (-5, 2)]:
    add(f"root({n},{x})", mp.root(x, abs(n)) ** (-1 if n < 0 else 1))
for b, x in [("3", "2"), ("2.5", "8"), ("0.25", "10")]:
    add(f"logb({b},{x})", mp.log(mp.mpf(x), mp.mpf(b)))
for y, x in [(2, 3), (-2, 3), (2, -3), (-2, -3)]:
    for mode, factor in [("rad", 1), ("deg", 180 / mp.pi), ("grad", 200 / mp.pi)]:
        add(f"atan2({y},{x})", mp.atan2(y, x) * factor, mode)
for mode, period in [("deg", 360), ("grad", 400)]:
    for text in ["12.345", "89.9", "-123.456"]:
        for name, fn in [("sin", mp.sin), ("cos", mp.cos), ("tan", mp.tan)]:
            add(f"{name}({text})", fn(mp.mpf(text) * 2 * mp.pi / period), mode)

Path("src/engine/referenceCases.ts").write_text(
    "import type { ValueCase } from './engineCases.ts';\n\n"
    "// Independent mpmath 1.3.0, 90-digit computation; 65 reference digits retained.\n"
    "export const referenceCases: readonly ValueCase[] = "
    + json.dumps(cases, ensure_ascii=False, indent=2) + ";\n"
)
print(f"Reference cases: {len(cases)}")
