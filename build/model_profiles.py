"""§6.1 점유 재구성, §6.2 요일군 프로파일, §6.5 행사일(사리) 탐지·Δ·오프셋, §6.9 짧은 정차."""
import collections
import datetime as dt
import statistics as st

from . import config
from .normalize import parse_poster_times

B = config.BINS
START = dt.datetime(2024, 7, 1)
NDAYS = 31
N = NDAYS * 1440
WD = "월화수목금토일"


def group_of(d, holidays=()):
    if d.isoformat() in holidays:
        return "sun"
    w = d.weekday()
    return "weekday" if w < 5 else ("sat" if w == 5 else "sun")


def r3(x):
    return round(float(x), 3)


def r1(x):
    return round(float(x), 1)


class Parking:
    """입출차 원자료에서 만든 기본 집계(분 단위 점유, 날짜별 10분 입·출차)."""

    def __init__(self, rows):
        self.rows = rows
        self.days = [START.date() + dt.timedelta(days=i) for i in range(NDAYS)]
        delta = [0] * (N + 1)
        self.arr = collections.defaultdict(lambda: [0] * B)
        self.dep = collections.defaultdict(lambda: [0] * B)
        self.dep_in_month = 0
        for i, o in rows:
            a = int((i - START).total_seconds() // 60)
            b = int((o - START).total_seconds() // 60)
            if 0 <= a < N:
                delta[a] += 1
            if 0 <= b < N:
                delta[b] -= 1
                self.dep_in_month += 1
            self.arr[i.date()][(i.hour * 60 + i.minute) // 10] += 1
            self.dep[o.date()][(o.hour * 60 + o.minute) // 10] += 1
        occ = [0] * N
        s = 0
        for k in range(N):
            s += delta[k]
            occ[k] = s
        self.occ = occ
        self.end_occ = s + delta[N]  # 7/31 24:00 점유(출차가 정확히 24:00인 경우 반영)
        self.arr_in_month = sum(1 for i, _ in rows if 0 <= (i - START).total_seconds() // 60 < N)

    def occ_bins(self, d):
        base = (d - START.date()).days * 1440
        return [self.occ[base + k * 10] for k in range(B)]


# ---------- 행사일 탐지 ----------
def detect_events(pk):
    ev = collections.Counter()
    lo, hi = config.EVENT_WINDOW
    for i, o in pk.rows:
        m = i.hour * 60 + i.minute
        if lo <= m < hi and (o - i).total_seconds() >= config.EVENT_MIN_DWELL * 60:
            ev[i.date()] += 1
    days = sorted({i.date() for i, _ in pk.rows if i.month == 7 and i.year == 2024})
    med = {g: st.median(ev[d] for d in days if group_of(d) == g) for g in ("weekday", "sat", "sun")}
    out = []
    for d in days:
        ratio = ev[d] / med[group_of(d)]
        out.append({"date": d.isoformat(), "group": group_of(d), "count": ev[d], "ratio": round(ratio, 2),
                    "flag": ratio >= config.EVENT_RATIO})
    return out, med


# ---------- 프로파일 ----------
def smooth3(a):
    n = len(a)
    out = []
    for k in range(n):
        seg = a[max(0, k - 1):min(n, k + 2)]
        out.append(sum(seg) / len(seg))
    return out


def quantile(vals, q):
    """선형 보간 백분위(numpy 기본값과 같은 방식)."""
    v = sorted(vals)
    if len(v) == 1:
        return v[0]
    pos = (len(v) - 1) * q
    lo = int(pos)
    hi = min(lo + 1, len(v) - 1)
    return v[lo] + (v[hi] - v[lo]) * (pos - lo)


def build_group(pk, g, event_days):
    first = START.date()
    ds = [d for d in pk.days if group_of(d) == g and d not in event_days]
    ds_occ = [d for d in ds if d != first]
    arr = [st.mean(pk.arr[d][k] for d in ds) for k in range(B)]
    dep = [st.mean(pk.dep[d][k] for d in ds) for k in range(B)]
    occ_days = [pk.occ_bins(d) for d in ds_occ]
    occ = [st.median(o[k] for o in occ_days) for k in range(B)]
    if g == "weekday":
        lo = [quantile([o[k] for o in occ_days], 0.25) for k in range(B)]
        hi = [quantile([o[k] for o in occ_days], 0.75) for k in range(B)]
        band, smoothed = "p25-p75", False
    else:
        lo = [min(o[k] for o in occ_days) for k in range(B)]
        hi = [max(o[k] for o in occ_days) for k in range(B)]
        band, smoothed = "min-max", True
    raw_peak_k = max(range(B), key=lambda k: occ[k])
    raw_peak = occ[raw_peak_k]
    if smoothed:
        arr, dep, occ, lo, hi = (smooth3(x) for x in (arr, dep, occ, lo, hi))
    return {
        "n_days": len(ds), "n_days_occ": len(ds_occ),
        "days": [d.isoformat() for d in ds],
        "arr": [r1(x) for x in arr], "dep": [r1(x) for x in dep], "occ": [r1(x) for x in occ],
        "occ_lo": [r1(x) for x in lo], "occ_hi": [r1(x) for x in hi],
        "band": band, "smoothed": smoothed,
        "raw_median_peak": {"occ": r1(raw_peak), "time": hhmm(raw_peak_k * 10)},
    }


def hhmm(m):
    m = int(m)
    return f"{m // 60:02d}:{m % 60:02d}"


def fmt_offset(m):
    return f"{'+' if m >= 0 else '-'}{abs(m) // 60}:{abs(m) % 60:02d}"


# ---------- 공연 시작 기준값 T_ref ----------
def poster_start_stats(posters):
    stats = collections.defaultdict(collections.Counter)
    n = 0
    for p in posters:
        for day, t in parse_poster_times(p["when"]):
            stats[day.weekday()][t] += 1
            n += 1
    return stats, n


def to_min(t):
    h, m = t.split(":")
    return int(h) * 60 + int(m)


def choose_ref(cands, peak_min):
    """후보 중 행사일 점유 최대 시각 이후 30분 안에 오는 값. 없으면 최대 시각 뒤에서 가장 가까운 값."""
    within = [c for c in cands if 0 <= to_min(c) - peak_min <= 30]
    if within:
        return within[0], "within30"
    after = sorted((c for c in cands if to_min(c) >= peak_min), key=lambda c: to_min(c) - peak_min)
    if after:
        return after[0], "nearest_after"
    return cands[0], "fallback_top"


# ---------- 사리 오프셋 (e10과 같은 규칙) ----------
def event_offsets(pk, d, tref_min, event_days):
    normal = [x for x in pk.days if x.weekday() == d.weekday() and x not in event_days]
    ni = [st.mean(pk.arr[x][k] for x in normal) for k in range(B)]
    no = [st.mean(pk.dep[x][k] for x in normal) for k in range(B)]
    ai, ao = pk.arr[d], pk.dep[d]
    kr = tref_min // 10
    flags = [ai[k] >= 1.5 * max(ni[k], 1) for k in range(B)]
    best = (0, None, None)
    k = kr - 24
    while k < kr:
        if flags[k]:
            j = k
            while j < kr and flags[j]:
                j += 1
            if j - k > best[0]:
                best = (j - k, k, j)
            k = j
        else:
            k += 1
    pk_bin = max(range(kr, B), key=lambda k: ao[k])
    clr = next((k for k in range(pk_bin, B) if ao[k] < 1.5 * max(no[k], 1)), B - 1)
    max30_k = max(range(102, B - 2), key=lambda k: sum(ao[k:k + 3]))
    normal_max30 = st.mean(max(sum(pk.dep[x][k:k + 3]) for k in range(102, B - 2)) for x in normal)
    return {
        "rush_start": (best[1] * 10 - tref_min) if best[1] is not None else None,
        "rush_end": (best[2] * 10 - tref_min) if best[2] is not None else None,
        "exit_peak": pk_bin * 10 - tref_min,
        "clear": clr * 10 - tref_min,
    }, {
        "exit_peak_10min": ao[pk_bin],
        "exit_max_30min": sum(ao[max30_k:max30_k + 3]),
        "exit_max_30min_at": hhmm(max30_k * 10),
        "normal_exit_max_30min": round(normal_max30),
        "n_normal_days": len(normal),
    }


def build(rows, posters, built_at):
    pk = Parking(rows)
    det, med = detect_events(pk)
    event_days = {dt.date.fromisoformat(x["date"]) for x in det if x["flag"]}
    groups = {g: build_group(pk, g, event_days) for g in ("weekday", "sat", "sun")}

    # 짧은 정차·체류 분포
    short, tot = [0] * 24, [0] * 24
    edges = [0, 10, 30, 60, 120, 240, 480, 1440]
    hist = [0] * len(edges)
    for i, o in pk.rows:
        dwell = (o - i).total_seconds() / 60
        tot[i.hour] += 1
        if dwell < 10:
            short[i.hour] += 1
        idx = max(j for j, e in enumerate(edges) if dwell >= e)
        hist[idx] += 1
    n_rows = len(pk.rows)
    short_share = [r3(short[h] / tot[h]) if tot[h] else 0 for h in range(24)]

    # T_ref 후보
    pstats, n_parsed = poster_start_stats(posters)
    overlay = {}
    for g, wd in (("sat", 5), ("sun", 6)):
        evs = sorted((x for x in det if x["flag"] and x["group"] == g), key=lambda x: -x["ratio"])
        if not evs:
            continue
        d = dt.date.fromisoformat(evs[0]["date"])
        ev_occ = pk.occ_bins(d)
        peak_k = max(range(B), key=lambda k: ev_occ[k])
        cands = [t for t, _ in pstats[wd].most_common(2)]
        tref, how = choose_ref(cands, peak_k * 10)
        tref_min = to_min(tref)
        P = groups[g]
        d_arr = [r1(pk.arr[d][k] - P["arr"][k]) for k in range(B)]
        d_dep = [r1(pk.dep[d][k] - P["dep"][k]) for k in range(B)]
        d_occ = [r1(ev_occ[k] - P["occ"][k]) for k in range(B)]
        offs, exits = event_offsets(pk, d, tref_min, event_days)
        overlay[g] = {
            "source_day": d.isoformat(), "ref_start": tref,
            "ref_start_candidates": cands,
            "ref_start_counts": {t: c for t, c in pstats[wd].most_common(2)},
            "ref_rule": "15099006 요일별 시작 시각 상위 2개 중 행사일 점유 최대 시각 이후 30분 안의 값",
            "ref_rule_result": how,
            "event_peak_time": hhmm(peak_k * 10),
            "d_arr": d_arr, "d_dep": d_dep, "d_occ": d_occ,
            "peak_occ": ev_occ[peak_k],
            "normal_peak_occ": P["raw_median_peak"]["occ"],
            "normal_peak_basis": "보통날 점유 중앙값(평활 전) 최대",
            "offsets_min": offs,
            **exits,
        }

    profiles = {
        "schema": "profiles/1", "built_at": built_at,
        "basis": {"dataset": "15138735", "period": ["2024-07-01", "2024-07-31"], "rows": n_rows,
                  "event_days": sorted(d.isoformat() for d in event_days),
                  "occupancy_excluded": ["2024-07-01"], "bin_minutes": 10,
                  "holiday_rule": "공휴일은 일요일 프로파일로 봄(가정)"},
        "groups": groups,
        "short_stop_share": short_share,
        "dwell_hist": {"edges_min": edges, "share": [r3(h / n_rows) for h in hist],
                       "short_share": r3(sum(1 for i, o in pk.rows if (o - i).total_seconds() < 600) / n_rows)},
        "event_detection": {"rule": "evening_long_ratio>=1.5", "window": ["14:00", "19:00"],
                            "min_dwell_min": config.EVENT_MIN_DWELL, "group_median": med,
                            "days": [{"date": x["date"], "ratio": x["ratio"], "count": x["count"]} for x in det if x["flag"]],
                            "all_days": [{"date": x["date"], "ratio": x["ratio"]} for x in det]},
        "event_overlay": overlay,
        "poster_times": {"dataset": "15099006", "n_parsed": n_parsed,
                         "top": {WD[w]: pstats[w].most_common(3) for w in (4, 5, 6)}},
        "tide_rules": {"hi": [36, 138], "low": [36, 132], "arr": [30, 138], "win": 9, "prom": 0.1,
                       "low_occ": 0.6, "low_min": 3, "smooth": 3,
                       "note": "만조: 3구간 이동평균 곡선의 국소 최대 중 지형 돌출도 ≥ 그날 최대×prom, 서로 win구간 이상 떨어진 것(높이 순 최대 3개)"},
        "weekday_scenario": {"enabled": False, "reason": "근거 1일(2024-07-12), 패턴 불명확"},
        "checks": {"arr_in_month": pk.arr_in_month, "dep_in_month": pk.dep_in_month, "end_occ": pk.end_occ},
    }
    return profiles, pk, event_days
