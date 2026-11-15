"""§6.11 백테스트: 학습 7/1~7/21, 검증 7/22~7/31, 행사 의심일 제외 (e04와 같은 규칙)."""
import collections
import statistics as st

from .model_profiles import group_of

B = 144


def hourly(c):
    return [sum(c[h * 6:(h + 1) * 6]) for h in range(24)]


def mae(p, a):
    return st.mean(abs(x - y) for x, y in zip(p, a))


def build(pk, event_days, class_checks, built_at):
    days = pk.days
    train = [d for d in days if d.day <= 21 and d not in event_days]
    test = [d for d in days if d.day > 21 and d not in event_days]

    def prof(ds):
        return [st.mean(pk.arr[d][k] for d in ds) for k in range(B)]

    P = {g: prof([d for d in train if group_of(d) == g]) for g in ("weekday", "sat", "sun")}
    P_all = prof(train)
    flat = st.mean(sum(pk.arr[d]) for d in train) / B
    res = collections.defaultdict(list)
    peak_match = 0
    per_day = []
    for d in test:
        act = pk.arr[d]
        pg = P[group_of(d)]
        res["flat10"].append(mae([flat] * B, act))
        res["single10"].append(mae(P_all, act))
        res["group10"].append(mae(pg, act))
        res["flat60"].append(mae([flat * 6] * 24, hourly(act)))
        res["single60"].append(mae(hourly(P_all), hourly(act)))
        res["group60"].append(mae(hourly(pg), hourly(act)))
        ha, hp = hourly(act), hourly(pg)
        pa = max(range(24), key=lambda h: ha[h])
        pp = max(range(24), key=lambda h: hp[h])
        peak_match += pa == pp
        ape = abs(sum(pg) - sum(act)) / sum(act) * 100
        res["ape"].append(ape)
        per_day.append({"date": d.isoformat(), "group": group_of(d), "mae60": round(mae(hp, ha), 1),
                        "ape_day": round(ape, 1), "peak_hour_actual": pa, "peak_hour_pred": pp})
    mean_hourly = st.mean(st.mean(hourly(pk.arr[d])) for d in test)
    g60 = st.mean(res["group60"])
    return {
        "schema": "backtest/1", "built_at": built_at,
        "split": {"train": ["2024-07-01", "2024-07-21"], "test": ["2024-07-22", "2024-07-31"],
                  "excluded": sorted(d.isoformat() for d in event_days),
                  "n_train": len(train), "n_test": len(test)},
        "methods": {
            "flat": {"mae10": round(st.mean(res["flat10"]), 1), "mae60": round(st.mean(res["flat60"]), 1)},
            "single": {"mae10": round(st.mean(res["single10"]), 1), "mae60": round(st.mean(res["single60"]), 1)},
            "group": {"mae10": round(st.mean(res["group10"]), 1), "mae60": round(g60, 1),
                      "ape_day": round(st.mean(res["ape"]), 1), "peak_hour_match": [peak_match, len(test)]},
        },
        "mean_hourly_arrivals_test": round(mean_hourly),
        "group_mae60_share": round(g60 / mean_hourly, 3),
        "per_day": per_day,
        "class_checks": class_checks,
        "limits": "같은 2024년 7월 안의 검증이에요. 다른 달·다른 해에 대한 검증은 원자료가 없어 하지 못했어요.",
    }
