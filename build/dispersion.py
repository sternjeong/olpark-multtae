"""분산 효과(공익 what-if) 모델. 모든 입력은 15138735 원자료에서 다시 계산한다.

(1) 낮 시간 분산: 요일군 g의 보통날 각각에서 '만조 직전 1시간'(P = [만조−60분, 만조)) 에 들어온 차 중
    비율 f가 같은 날 '덜 붐비는 때'(Q) 시작 시각으로 옮겨 온다고 보고(머문 시간은 그대로), 그날 최고 점유와
    10분 최대 입차가 얼마나 줄어드는지 계산한다. f 비율만큼 무작위로 옮긴다는 기대값 = 원래 + f·(옮긴 곡선 − 원래 곡선).
    Q는 낮 '덜 붐비는 때' 중 가장 낮은 창. 지표: 하루 최고 점유(06~23시) 감소, P 구간 10분 최대 입차 감소.
    결과는 보통날별 값의 중앙값과 최소~최대(범위).
(2) 공연 퇴장 대기: 행사일에 '최대 30분 출차' M대가 관측된 최대 10분 출차(처리량 c)로 빠져나갔다.
    그 30분 동안 출차가 처리량 근처에서 이어졌으므로, M대가 공연 직후 한꺼번에 나가려 했다고 보는
    결정론적 대기열(D/D/1, 1분 단위)로 '대기 차량·분'을 계산한다. 비율 f가 S분에 걸쳐 고르게 나눠 나가면
    대기가 얼마나 줄어드는지 비교한다. 범위 = 행사일 2일(토·일)의 (M, c).
"""
import statistics as st

from . import tide
from .model_profiles import B, START


def _day_delta(pk, d, rows_d, shift_bins, p_bins):
    """하루 기본 곡선과, P 구간 입차 차량을 shift만큼 옮겼을 때의 변화량(f=1 기준)."""
    base = (d - START.date()).days * 1440
    occ0 = [pk.occ[base + k * 10] for k in range(B)]
    arr0 = list(pk.arr[d])
    d_occ = [0.0] * B
    d_arr = [0.0] * B
    p0, p1 = p_bins
    sh = shift_bins * 10

    def add(a, b, w):  # 구간 [a, b) 분에 머문 차가 각 10분 구간 시작 분에 있으면 w
        k0 = max(0, -(-a // 10))
        k1 = min(B, -(-b // 10))
        for kk in range(k0, k1):
            d_occ[kk] += w
    for i, o in rows_d:
        k = (i.hour * 60 + i.minute) // 10
        if not (p0 <= k < p1):
            continue
        a = int((i - START).total_seconds() // 60) - base
        b = int((o - START).total_seconds() // 60) - base
        add(a, b, -1)
        add(a + sh, b + sh, +1)
        d_arr[k] -= 1
        if 0 <= k + shift_bins < B:
            d_arr[k + shift_bins] += 1
    return occ0, arr0, d_occ, d_arr


def day_shift(pk, profiles, event_days):
    first = START.date()
    by_day = {}
    for i, o in pk.rows:
        by_day.setdefault(i.date(), []).append((i, o))
    out = {}
    fs = [0.1, 0.2, 0.3, 0.4, 0.5]
    for g in ("weekday", "sat", "sun"):
        G = profiles["groups"][g]
        his = tide.high_tides(G["occ"])
        if not his:
            continue
        kh = max(his, key=lambda k: G["occ"][k])
        _, _, wins = tide.daytime_quiet(G["occ"])
        if not wins:
            continue
        q0 = min(wins, key=lambda w: w[1])[0]   # 가장 덜 붐비는 창
        p_bins = (kh - 6, kh)
        shift = q0 - p_bins[0]
        days = [d for d in pk.days if model_group(d) == g and d not in event_days and d != first]
        deltas = [_day_delta(pk, d, by_day.get(d, []), shift, p_bins) for d in days]
        lo, hi = tide.HI_RANGE
        rows = []
        for f in fs:
            red_occ, red_occ_p, red_arr, red_arr_p, moved = [], [], [], [], []
            for o0, a0, do, da in deltas:
                o1 = [o0[k] + f * do[k] for k in range(B)]
                a1 = [a0[k] + f * da[k] for k in range(B)]
                m0, m1 = max(o0[lo:hi + 1]), max(o1[lo:hi + 1])
                x0, x1 = max(a0[p_bins[0]:p_bins[1]]), max(a1[p_bins[0]:p_bins[1]])
                red_occ.append(m0 - m1)
                red_occ_p.append((m0 - m1) / m0)
                red_arr.append(x0 - x1)
                red_arr_p.append((x0 - x1) / x0)
                moved.append(-f * sum(x for x in da if x < 0))
            q = lambda v, r=1: [round(min(v), r), round(st.median(v), r), round(max(v), r)]
            rows.append({"f": f, "occ_peak_red": q(red_occ), "occ_peak_red_pct": q(red_occ_p, 3),
                         "arr_peak_red": q(red_arr), "arr_peak_red_pct": q(red_arr_p, 3), "moved_cars": q(moved)})
        out[g] = {"high_tide_k": kh, "p_bins": list(p_bins), "q_start_k": q0, "q_end_k": q0 + tide.DAY_WIN,
                  "shift_min": shift * 10, "n_days": len(days), "days": [d.isoformat() for d in days], "rows": rows}
    return out


def model_group(d):
    w = d.weekday()
    return "weekday" if w < 5 else ("sat" if w == 5 else "sun")


def queue_wait(M, c_per_min, f=0.0, spread_min=60, horizon=400):
    """1분 단위 유체 대기열. (1−f)M대는 0분에 한꺼번에, fM대는 [0, spread)분에 고르게 나가려 한다.
    처리량 c대/분. 반환: (대기 차량·분, 마지막 차가 빠지는 분)."""
    q, wait, t_clear = 0.0, 0.0, 0
    for t in range(horizon):
        a = (1 - f) * M if t == 0 else 0.0
        if spread_min > 0 and t < spread_min:
            a += f * M / spread_min
        q = max(0.0, q + a - c_per_min)
        wait += q
        if q > 1e-9:
            t_clear = t + 1
    return wait, t_clear


def exit_queue(profiles):
    params = []
    for g, ov in profiles["event_overlay"].items():
        params.append({"group": g, "source_day": ov["source_day"], "M": ov["exit_max_30min"],
                       "c10": ov["exit_peak_10min"], "c": round(ov["exit_peak_10min"] / 10, 2)})
    table = []
    for f in [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6]:
        for S in (30, 60):
            w = [queue_wait(p["M"], p["c"], f, S) for p in params]
            table.append({"f": f, "spread_min": S, "wait_car_min": [round(x[0]) for x in w],
                          "clear_min": [x[1] for x in w]})
    return {"params": params, "table": table,
            "assumption": "최대 30분 출차 M대가 공연 직후 한꺼번에 나가려 하고, 관측된 최대 10분 출차를 처리량으로 봄(1분 단위 결정론적 대기열)"}


def build(pk, profiles, event_days):
    return {"day_shift": day_shift(pk, profiles, event_days), "exit_queue": exit_queue(profiles),
            "day_shift_rule": "P = 만조 직전 60분 입차, Q = 낮(10~18시) 가장 덜 붐비는 60분 창 시작. 옮긴 차는 머문 시간 유지. 범위 = 보통날별 최소~최대"}
