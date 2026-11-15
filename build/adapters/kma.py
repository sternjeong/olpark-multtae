"""기상청 단기예보(data.go.kr 15084084, VilageFcstInfoService_2.0 getVilageFcst). DATA_GO_KR_KEY가 있을 때만.

예보 계산에는 넣지 않고 상황 칩("비 예보 60%")에만 쓴다.
"""
import datetime as dt
import json
import math
import urllib.parse

from . import get, key, scrub
from .. import config


def latlon_to_grid(lat, lon):
    """기상청 Open API 활용가이드의 LCC(Lambert Conformal Conic) 격자 변환식."""
    RE, GRID, SLAT1, SLAT2, OLON, OLAT, XO, YO = 6371.00877, 5.0, 30.0, 60.0, 126.0, 38.0, 43, 136
    D = math.pi / 180.0
    re_ = RE / GRID
    s1, s2, ol, oa = SLAT1 * D, SLAT2 * D, OLON * D, OLAT * D
    sn = math.log(math.cos(s1) / math.cos(s2)) / math.log(math.tan(math.pi * .25 + s2 * .5) / math.tan(math.pi * .25 + s1 * .5))
    sf = math.tan(math.pi * .25 + s1 * .5) ** sn * math.cos(s1) / sn
    ro = re_ * sf / math.tan(math.pi * .25 + oa * .5) ** sn
    ra = re_ * sf / math.tan(math.pi * .25 + lat * D * .5) ** sn
    th = lon * D - ol
    if th > math.pi:
        th -= 2 * math.pi
    if th < -math.pi:
        th += 2 * math.pi
    th *= sn
    return int(ra * math.sin(th) + XO + .5), int(ro - ra * math.cos(th) + YO + .5)


def base_time(now):
    hours = [2, 5, 8, 11, 14, 17, 20, 23]
    t = now - dt.timedelta(minutes=15)  # 발표 직후 반영 지연
    cands = [h for h in hours if h <= t.hour]
    if not cands:
        t = t - dt.timedelta(days=1)
        return t.strftime("%Y%m%d"), "2300"
    return t.strftime("%Y%m%d"), f"{cands[-1]:02d}00"


def fetch(now=None):
    k = key("DATA_GO_KR_KEY")
    if not k:
        return None
    now = now or config.now_kst()
    d, t = base_time(now)
    g = config.KMA_GRID
    q = urllib.parse.urlencode({"serviceKey": k, "pageNo": 1, "numOfRows": 1000, "dataType": "JSON",
                                "base_date": d, "base_time": t, "nx": g["nx"], "ny": g["ny"]})
    try:
        data = json.loads(get(f"https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?{q}"))
        items = data["response"]["body"]["items"]["item"]
    except Exception as e:
        raise RuntimeError(f"kma: {scrub(e, k)}") from None
    hours = {}
    for it in items:
        ts = f"{it['fcstDate'][:4]}-{it['fcstDate'][4:6]}-{it['fcstDate'][6:]}T{it['fcstTime'][:2]}:00+09:00"
        if it["category"] in ("POP", "PTY", "TMP"):
            try:
                hours.setdefault(ts, {"t": ts})[it["category"].lower()] = int(float(it["fcstValue"]))
            except ValueError:
                pass
    return {"fetched_at": now.isoformat(), "base": f"{d} {t}", "grid": {"nx": g["nx"], "ny": g["ny"]},
            "hours": [hours[k2] for k2 in sorted(hours)][:48]}
