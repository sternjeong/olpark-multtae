"""§6.6 (상수는 profiles.json의 tide_rules와 같아야 한다 — tests/test_profiles.py가 확인)
 만조·한산한 창·밀물 최고 규칙. site/assets/js/app.js의 tideStats()와 같은 알고리즘(테스트·noscript용)."""
import statistics as st

from .model_profiles import smooth3

HI_RANGE = (36, 138)     # 06:00 ~ 23:00 (끝 포함)
LOW_RANGE = (36, 132)    # 06:00 ~ 22:00 (끝 미포함)
ARR_RANGE = (30, 138)    # 05:00 ~ 23:00 (끝 미포함)
WIN = 9                  # 90분
PROM_FRAC = 0.10
LOW_OCC_FRAC = 0.6
LOW_MIN_BINS = 3


def prominence(sm, k, a, b):
    """지형 돌출도: 양쪽으로 자기보다 높은 지점(없으면 범위 끝)까지의 최소값 중 큰 쪽과의 차."""
    lmin = sm[k]
    j = k - 1
    while j >= a and sm[j] <= sm[k]:
        lmin = min(lmin, sm[j])
        j -= 1
    rmin = sm[k]
    j = k + 1
    while j <= b and sm[j] <= sm[k]:
        rmin = min(rmin, sm[j])
        j += 1
    return sm[k] - max(lmin, rmin)


def high_tides(occ):
    sm = smooth3(occ)
    a, b = HI_RANGE
    dmax = max(sm[a:b + 1])
    cands = []
    for k in range(a, b + 1):
        left = sm[k - 1] if k > a else float("-inf")
        right = sm[k + 1] if k < b else float("-inf")
        if sm[k] >= left and sm[k] > right:
            prom = prominence(sm, k, a, b)
            if prom >= PROM_FRAC * dmax:
                cands.append((sm[k], k))
    chosen = []
    for h, k in sorted(cands, reverse=True):
        if all(abs(k - c) >= WIN for c in chosen):
            chosen.append(k)
        if len(chosen) == 3:
            break
    return sorted(chosen)


def low_windows(occ, arr):
    sm_o, sm_a = smooth3(occ), smooth3(arr)
    a, b = LOW_RANGE
    dmax = max(sm_o[HI_RANGE[0]:HI_RANGE[1] + 1])
    amed = st.median(sm_a[a:b])
    ok = [sm_o[k] <= LOW_OCC_FRAC * dmax and sm_a[k] <= amed for k in range(a, b)]
    runs = []
    k = 0
    while k < len(ok):
        if ok[k]:
            j = k
            while j < len(ok) and ok[j]:
                j += 1
            if j - k >= LOW_MIN_BINS:
                runs.append((a + k, a + j))
            k = j
        else:
            k += 1
    runs = sorted(runs, key=lambda r: -(r[1] - r[0]))[:2]
    return sorted(runs)


def peak_arrival(arr):
    a, b = ARR_RANGE
    return max(range(a, b), key=lambda k: arr[k])
