"""특일정보(data.go.kr 15012690, SpcdeInfoService getRestDeInfo). DATA_GO_KR_KEY가 있을 때만.
정적 파일(build/static/holidays.json, 한국천문연구원 달력자료)과 다르면 경고를 남기고 API 값을 더한다."""
import json
import urllib.parse

from . import get, key, scrub


def fetch(years):
    k = key("DATA_GO_KR_KEY")
    if not k:
        return None
    out = {}
    try:
        for y in years:
            for m in range(1, 13):
                q = urllib.parse.urlencode({"serviceKey": k, "solYear": y, "solMonth": f"{m:02d}", "_type": "json",
                                            "numOfRows": 50})
                data = json.loads(get(f"https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo?{q}"))
                items = data["response"]["body"].get("items") or {}
                items = items.get("item", []) if isinstance(items, dict) else []
                if isinstance(items, dict):
                    items = [items]
                for it in items:
                    if it.get("isHoliday") == "Y":
                        s = str(it["locdate"])
                        out[f"{s[:4]}-{s[4:6]}-{s[6:]}"] = it["dateName"]
    except Exception as e:
        raise RuntimeError(f"holidays: {scrub(e, k)}") from None
    return out
