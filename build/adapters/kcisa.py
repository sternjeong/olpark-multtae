"""문화공공데이터광장(KCISA) 어댑터. CULTURE_API_KEY가 있고 build/static/kcisa_endpoints.json에
엔드포인트가 채워져 있을 때만 동작한다.

엔드포인트·파라미터·응답 필드는 culture.go.kr 접속이 막혀 있어 확인하지 못했다(docs/data_catalog.md).
추측해 채우지 않는다. 키를 받은 사람이 명세 화면을 보고 url·params·field_map을 채우면 켜진다.
"""
import datetime as dt
import os
import urllib.parse
import xml.etree.ElementTree as ET

from . import get, key, scrub
from .. import config, io_csv


def endpoints():
    return io_csv.load_static("kcisa_endpoints.json")


def fetch_events(today):
    k = key("CULTURE_API_KEY")
    ep = endpoints().get("3037877", {})
    if not k or not ep.get("url") or not ep.get("field_map"):
        return None
    params = dict(ep.get("params", {}))
    params[ep.get("key_param", "serviceKey")] = k
    try:
        raw = get(f"{ep['url']}?{urllib.parse.urlencode(params)}", timeout=30)
    except Exception as e:
        raise RuntimeError(f"kcisa 3037877: {scrub(e, k)}") from None
    d = os.path.join(config.WORK_DIR, "kcisa", "3037877")
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, f"{today.isoformat()}.xml"), "wb") as f:
        f.write(raw)
    fm = ep["field_map"]
    items = []
    for it in ET.fromstring(raw).iter(ep.get("item_tag", "item")):
        g = lambda f: (it.findtext(fm.get(f, "")) or "").strip() or None
        date = g("date")
        if not date:
            continue
        items.append({"id": g("id") or date, "title": g("title") or "", "date": date[:10], "url": g("url"),
                      "image": None, "venue": g("venue"), "start_time": g("start_time")})
    return items
