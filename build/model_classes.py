"""§6.8 강좌 수요와 β, 실험실 입력, 현재 유효 강좌 목록."""
import collections
import datetime as dt
import statistics as st

from . import config

B = config.BINS
M0, M1 = dt.date(2024, 7, 1), dt.date(2024, 7, 31)


def is_zombie(c):
    a, b = c["valid"]
    return bool(a and b and a < config.ZOMBIE_START_BEFORE and b.year == 9999)


def classes_for_month(all_rows, m0=M0, m1=M1):
    """강좌 파일은 '월별 이력' 구조. 강좌번호별로 시작월 <= m0 인 행 중 가장 최근 행을 그 시점 버전으로 보고,
    그 행의 기간이 [m0, m1]과 겹치면 유효(e02와 같은 규칙)."""
    out = []
    for ds in ("15101610", "15110953"):
        best = {}
        for c in all_rows:
            if c["ds"] != ds or not c["month"] or c["month"] > m0:
                continue
            k = c["num"]
            if k not in best or best[k]["month"] < c["month"]:
                best[k] = c
        for c in best.values():
            a, b = c["valid"]
            if a and b and a <= m1 and b >= m0 and c["time"] and c["days"] and c["cap_raw"].isdigit():
                out.append(c)
    return out


def demand(classes, w):
    s = [0.0] * B
    for c in classes:
        if w in c["days"]:
            k = c["time"][0] // 10
            cap = int(c["cap_raw"]) if "cap" not in c else c["cap"]
            for j in range(1, config.ARRIVAL_LEAD_BINS + 1):
                if k - j >= 0:
                    s[k - j] += cap / 3
    return s


def corr(x, y):
    mx, my = st.mean(x), st.mean(y)
    num = sum((a - mx) * (b - my) for a, b in zip(x, y))
    den = (sum((a - mx) ** 2 for a in x) * sum((b - my) ** 2 for b in y)) ** .5
    return num / den if den else float("nan")


def fit_beta(pk, classes, event_days):
    S = {w: demand(classes, w) for w in range(5)}
    nonev = [d for d in pk.days if d.weekday() < 5 and d not in event_days]
    Aw = {w: [st.mean(pk.arr[d][k] for d in nonev if d.weekday() == w) for k in range(B)] for w in range(5)}
    Abar = [st.mean(Aw[w][k] for w in range(5)) for k in range(B)]
    Sbar = [st.mean(S[w][k] for w in range(5)) for k in range(B)]
    lo, hi = config.BETA_WINDOW
    xs, ys = [], []
    for w in range(5):
        for k in range(lo, hi):
            xs.append(S[w][k] - Sbar[k])
            ys.append(Aw[w][k] - Abar[k])
    sxx = sum(x * x for x in xs)
    beta = sum(x * y for x, y in zip(xs, ys)) / sxx
    resid = [y - beta * x for x, y in zip(xs, ys)]
    se = (sum(e * e for e in resid) / (len(xs) - 1) / sxx) ** .5
    share = beta * sum(Sbar[lo:hi]) / sum(Abar[lo:hi])
    return {"value": round(beta, 4), "se": round(se, 4), "n": len(xs), "share_weekday": round(share, 4),
            "S": S, "Sbar": Sbar, "Abar": Abar, "nonev": nonev}


def class_checks(pk, classes, beta, event_days):
    """e02의 검증 지표(요일 평균은 그 요일 모든 날 — e02와 같음)와 새벽 수준 검증(e09)."""
    lo, hi = config.BETA_WINDOW
    rng = range(lo, hi)
    mean_w = {w: [st.mean(pk.arr[d][k] for d in pk.days if d.weekday() == w) for k in range(B)] for w in range(7)}
    dem = {w: demand(classes, w) for w in range(7)}
    r_hourly = [round(corr([dem[w][k] for k in rng], [mean_w[w][k] for k in rng]), 2) for w in range(5)]
    r_weekend = [round(corr([dem[w][k] for k in rng], [mean_w[w][k] for k in rng]), 2) for w in (5, 6)]
    mwf = [st.mean(mean_w[w][k] for w in (0, 2, 4)) for k in range(B)]
    tt = [st.mean(mean_w[w][k] for w in (1, 3)) for k in range(B)]
    smwf = [st.mean(dem[w][k] for w in (0, 2, 4)) for k in range(B)]
    stt = [st.mean(dem[w][k] for w in (1, 3)) for k in range(B)]
    r_diff = corr([smwf[k] - stt[k] for k in rng], [mwf[k] - tt[k] for k in rng])
    pre = [sum(mean_w[w][k] for k in rng if k % 6 in (3, 4, 5)) for w in range(5)]
    post = [sum(mean_w[w][k] for k in rng if k % 6 in (0, 1, 2)) for w in range(5)]
    # 새벽: 06시대 시작 강좌의 평일 평균 정원 × β vs 평일(행사일 제외) 05:30~05:59 평균 입차
    cap6 = sum(int(c["cap_raw"]) * len([w for w in c["days"] if w < 5]) / 5 for c in classes if c["time"][0] // 60 == 6)
    obs = collections.Counter()
    for i, _ in pk.rows:
        if i.weekday() < 5 and i.date() not in event_days and 330 <= i.hour * 60 + i.minute < 360:
            obs[i.date()] += 1
    return {
        "r_hourly": r_hourly, "r_weekend": r_weekend, "r_weekday_diff": round(r_diff, 2),
        "pre_hour_ratio": [round(a / b, 2) for a, b in zip(pre, post)],
        "dawn_check": {"capacity_06": round(cap6), "beta": round(beta, 3), "predicted": round(cap6 * beta),
                       "observed": round(st.mean(obs.values())), "n_days": len(obs),
                       "window": ["05:30", "05:59"]},
    }


def current_classes(all_rows, ref, horizon=config.CLASS_HORIZON_DAYS):
    """기준일에 유효한 강좌 행 + 기준일~+60일 안에 유효해지는 행. 좀비 행 제외(e08과 같은 규칙)."""
    end = ref + dt.timedelta(days=horizon)
    on_ref, upcoming, zombies = [], [], 0
    for c in all_rows:
        a, b = c["valid"]
        if not a or not b:
            continue
        if a <= ref <= b:
            if is_zombie(c):
                zombies += 1
                continue
            on_ref.append(c)
        elif ref < a <= end and not is_zombie(c):
            upcoming.append(c)
    return on_ref, upcoming, zombies


def lab_inputs(fit, classes, pk):
    cap_by_start = collections.Counter()
    for c in classes:
        wd = len([w for w in c["days"] if w < 5])
        if wd:
            cap_by_start[c["time"][0]] += int(c["cap_raw"]) * wd / 5
    return {
        "basis": "2024-07 유효 강좌, 평일 평균(행사일 7/12 제외 22일), 7월 규모(s=1.00)",
        # Ā: 행사일을 뺀 평일 전체 날의 평균(e11과 같음. β 적합에 쓴 '요일 평균의 평균'과 가중이 조금 다르다)
        "abar": [round(st.mean(pk.arr[d][k] for d in fit["nonev"]), 2) for k in range(B)],
        "sbar": [round(x, 2) for x in fit["Sbar"]],
        "cap_by_start": {str(k): round(v, 2) for k, v in sorted(cap_by_start.items())},
        "default": {"H": 540, "f": 0.5, "delta": 20},
    }


def lab_compute(lab, beta, H, f, delta):
    """F13 계산(테스트용 파이썬 구현. JS와 같은 식)."""
    abar, sbar = lab["abar"], lab["sbar"]
    cap = lab["cap_by_start"].get(str(H), 0)
    s2 = list(sbar)
    for start, w in ((H, -f * cap), (H + delta, f * cap)):
        k = start // 10
        for j in (1, 2, 3):
            if 0 <= k - j < B:
                s2[k - j] += w / 3
    a2 = [abar[k] + beta * (s2[k] - sbar[k]) for k in range(B)]
    win = range((H - 30) // 10, (H + delta) // 10)
    b = max(win, key=lambda k: abar[k])
    a = max(win, key=lambda k: a2[k])
    return {"before": abar[b], "before_at": b, "after": a2[a], "after_at": a, "change": (a2[a] - abar[b]) / abar[b]}


def build(all_rows, pk, event_days, ref, built_at):
    jul = classes_for_month(all_rows)
    fit = fit_beta(pk, jul, event_days)
    checks = class_checks(pk, jul, fit["value"], event_days)
    on_ref, upcoming, zombies = current_classes(all_rows, ref)
    latest = {}
    for ds in ("15101610", "15110953"):
        ms = [c["month"] for c in all_rows if c["ds"] == ds and c["month"]]
        latest[ds] = max(ms).strftime("%Y-%m")
    zombie_total = sum(1 for c in all_rows if c["ds"] == "15110953" and is_zombie(c))
    items = []
    for c, flag in [(c, True) for c in on_ref] + [(c, False) for c in upcoming]:
        if not c["time"] or not c["days"] or not c["cap_raw"].isdigit():
            continue
        items.append({"id": c["id"], "center": c["center"], "sport": c["sport"], "name": c["name"],
                      "start": c["time"][0], "end": c["time"][1], "days": sorted(c["days"]),
                      "cap": int(c["cap_raw"]), "target": c["target"],
                      "valid": [c["valid"][0].isoformat(), c["valid"][1].isoformat()],
                      "on_ref": flag, "url": c["url"]})
    jul_caps = {"swim": sum(int(c["cap_raw"]) for c in jul if c["ds"] == "15101610"),
                "center": sum(int(c["cap_raw"]) for c in jul if c["ds"] == "15110953")}
    out = {
        "schema": "classes/1", "built_at": built_at,
        "datasets": ["15101610", "15110953"],
        "ref_date": ref.isoformat(),
        "latest_month": latest,
        "zombie_rule": "start<2023-01-01 and end=9999-12-31", "zombie_excluded": zombie_total,
        "zombie_excluded_on_ref": zombies,
        "count_on_ref": len(on_ref), "count_upcoming": len(upcoming),
        "beta": {"value": fit["value"], "se": fit["se"], "n": fit["n"], "window": ["05:00", "22:00"],
                 "arrival_lead_min": 30, "method": "weekday-deviation OLS through origin",
                 "fit_period": "2024-07", "share_weekday": fit["share_weekday"],
                 "n_classes_2024_07": len(jul), "capacity_2024_07": jul_caps},
        "lab": lab_inputs(fit, jul, pk),
        "classes": sorted(items, key=lambda x: (x["start"], -x["cap"])),
    }
    return out, checks, fit


WHY_DAYS = {"weekday": [0, 1, 2, 3, 4], "sat": [5], "sun": [6]}
WHY_MIN_SHARE = 0.10   # 만조 직전 1시간 강좌 몫이 이보다 작으면 '강좌 영향이 작다'고 쓴다


def why(profiles, classes):
    """홈 '왜 이 시각에 차오를까?' 줄의 숫자. 기준일 시간표(on_ref) 강좌의 요일군 평균 시작 수요 S_g(k)와
    2024-07 요일군 입차 프로파일 A_g(k)로 강좌 몫 = Σ min(β·S, A) / Σ A 를 계산한다(계절 지수는 양쪽에 같아 비율에 영향 없음)."""
    from . import tide
    beta = classes["beta"]["value"]
    on = [c for c in classes["classes"] if c["on_ref"]]
    out = {"beta": beta, "se": classes["beta"]["se"], "ref_date": classes["ref_date"], "min_share": WHY_MIN_SHARE,
           "rule": "강좌 몫 = Σ min(β·S_g, A_g) / Σ A_g. S_g = 기준일 유효 강좌의 시작 전 30분 수요(요일군 평균), A_g = 2024-07 요일군 입차"}
    for g, days in WHY_DAYS.items():
        S = [0.0] * B
        starts = [collections.Counter() for _ in range(B)]
        for w in days:
            for c in on:
                if w in c["days"]:
                    b = c["start"] // 10
                    for j in range(1, config.ARRIVAL_LEAD_BINS + 1):
                        if b - j >= 0:
                            S[b - j] += c["cap"] / 3 / len(days)
                            starts[b - j][c["start"]] += c["cap"] / len(days)
        G = profiles["groups"][g]
        A = G["arr"]
        his = tide.high_tides(G["occ"])
        kh = max(his, key=lambda k: G["occ"][k])
        P = range(kh - 6, kh)
        contrib = [min(beta * S[k], A[k]) for k in range(B)]
        p_share = sum(contrib[k] for k in P) / sum(A[k] for k in P)
        pa = tide.peak_arrival(A)
        # 강좌 몫이 가장 큰 '물결': 입차가 하루 최고의 50% 이상인 05~23시 구간 중 강좌 기여(대)가 가장 큰 곳(새벽 제외는 하지 않음)
        amax = max(A[30:138])
        cand = [k for k in range(36, 138) if A[k] >= 0.5 * amax]
        top = max(cand, key=lambda k: contrib[k])
        mode = lambda k: (starts[k].most_common(1)[0][0] if starts[k] else None)
        seats = lambda k: round(sum(starts[k].values()))  # 시작 시각이 k+1..k+3 구간인 강좌 정원(요일 평균)
        hh = kh * 10 // 60
        out[g] = {
            "high_k": kh, "p_bins": [kh - 6, kh], "p_share": round(p_share, 3),
            "p_class_cars": round(sum(contrib[k] for k in P), 1), "p_arr_cars": round(sum(A[k] for k in P), 1),
            "short_share_high_hour": profiles["short_stop_share"][hh],
            "peak_k": pa, "peak_share": round(contrib[pa] / A[pa], 3), "peak_class_cars": round(contrib[pa], 1),
            "peak_arr": round(A[pa], 1), "peak_start": mode(pa), "peak_seats": seats(pa),
            "top_k": top, "top_share": round(contrib[top] / A[top], 3), "top_class_cars": round(contrib[top], 1),
            "top_start": mode(top),
            "classes_matter": p_share >= WHY_MIN_SHARE,
        }
    return out
