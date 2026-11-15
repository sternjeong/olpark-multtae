"""§6.4 계절 지수(15131671 월별주차현황)."""
import collections
import statistics as st

from . import config

PLACE = "올림픽공원"


def build(monthly, built_at):
    v = collections.defaultdict(dict)
    for r in monthly:
        if r["place"] == PLACE:
            v[r["month"]][r["year"]] = r["count"]
    years = sorted({y for m in v.values() for y in m})
    # 모든 달에 같은 연도 집합을 쓴다(빠진 달이 있으면 그 연도는 그 달 평균에서 빠짐을 기록)
    jul = st.mean(v[7].values())
    index, cv, raw = {}, {}, {}
    for m in range(1, 13):
        vals = list(v[m].values())
        index[str(m)] = round(st.mean(vals) / jul, 3)
        cv[str(m)] = round(st.pstdev(vals) / st.mean(vals), 3)
        raw[str(m)] = {str(y): v[m][y] for y in sorted(v[m])}
    return {
        "schema": "season/1", "built_at": built_at, "dataset": "15131671", "place": PLACE,
        "years": years, "reference_month": 7,
        "index": index, "cv": cv, "high_cv_threshold": config.HIGH_CV,
        "high_cv_months": [int(m) for m in cv if cv[m] >= config.HIGH_CV],
        "raw": raw,
        "note": "월별주차현황과 입출차 원자료는 집계 정의가 달라 비율로만 사용",
    }
