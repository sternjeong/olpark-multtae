"""JSON Schema draft-07 부분집합 검사기(type, required, properties, items, enum, minItems, maxItems,
minimum, maximum, pattern). 표준 라이브러리만 쓴다."""
import json
import os
import re
import sys

from . import config

TYPES = {"object": dict, "array": list, "string": str, "boolean": bool, "null": type(None)}


def _type_ok(v, t):
    if isinstance(t, list):
        return any(_type_ok(v, x) for x in t)
    if t == "number":
        return isinstance(v, (int, float)) and not isinstance(v, bool)
    if t == "integer":
        return isinstance(v, int) and not isinstance(v, bool)
    return isinstance(v, TYPES[t])


def check(v, s, path="$"):
    errs = []
    if "type" in s and not _type_ok(v, s["type"]):
        return [f"{path}: type {type(v).__name__} != {s['type']}"]
    if "enum" in s and v not in s["enum"]:
        errs.append(f"{path}: {v!r} not in {s['enum']}")
    if "pattern" in s and isinstance(v, str) and not re.search(s["pattern"], v):
        errs.append(f"{path}: {v!r} !~ {s['pattern']}")
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        if "minimum" in s and v < s["minimum"]:
            errs.append(f"{path}: {v} < {s['minimum']}")
        if "maximum" in s and v > s["maximum"]:
            errs.append(f"{path}: {v} > {s['maximum']}")
    if isinstance(v, dict):
        for k in s.get("required", []):
            if k not in v:
                errs.append(f"{path}: missing {k}")
        for k, sub in s.get("properties", {}).items():
            if k in v:
                errs += check(v[k], sub, f"{path}.{k}")
        if "additionalProperties" in s and isinstance(s["additionalProperties"], dict):
            for k, val in v.items():
                if k not in s.get("properties", {}):
                    errs += check(val, s["additionalProperties"], f"{path}.{k}")
    if isinstance(v, list):
        if "minItems" in s and len(v) < s["minItems"]:
            errs.append(f"{path}: {len(v)} items < {s['minItems']}")
        if "maxItems" in s and len(v) > s["maxItems"]:
            errs.append(f"{path}: {len(v)} items > {s['maxItems']}")
        if "items" in s:
            for i, x in enumerate(v):
                errs += check(x, s["items"], f"{path}[{i}]")
                if len(errs) > 20:
                    break
    return errs


def validate_dir(out):
    errs = []
    for fn in sorted(os.listdir(config.SCHEMA_DIR)):
        if not fn.endswith(".json"):
            continue
        name = fn[:-5]
        p = os.path.join(out, fn)
        if not os.path.exists(p):
            errs.append(f"{fn}: 산출물 없음")
            continue
        with open(os.path.join(config.SCHEMA_DIR, fn), encoding="utf-8") as f:
            schema = json.load(f)
        with open(p, encoding="utf-8") as f:
            data = json.load(f)
        errs += [f"{name}: {e}" for e in check(data, schema)]
    return errs


if __name__ == "__main__":
    e = validate_dir(sys.argv[1] if len(sys.argv) > 1 else "site/data")
    print("\n".join(e) or "ok")
    sys.exit(1 if e else 0)
