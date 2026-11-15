"""빌드 진입점.

  python3 -m build.main --out site/data [--archive archive/live] [--offline]

--offline: 원천 갱신(네트워크)을 건너뛴다. 키 어댑터는 키가 있을 때만 실행된다(--offline이어도).
같은 입력이면 같은 출력(built_at·build_id만 다름).
"""
import argparse
import datetime as dt
import json
import os
import re
import sys

from . import (backtest, config, context, dispersion, fetch, io_csv, live, model_classes, model_profiles, model_season,
               normalize, quality, tide, validate)
from .adapters import holidays as hol_adapter
from .adapters import kcisa, kma, key, scrub


def dump(out, name, obj):
    path = os.path.join(out, f"{name}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    return path


def sources_meta(man, refreshed):
    out = []
    for ds_id, info in config.DATASETS.items():
        m = man.get(ds_id, {})
        r = refreshed.get(ds_id, {})
        via = r.get("via") if r.get("via") in ("portal", "odcloud") else "snapshot"
        out.append({"id": ds_id, "name": info["name"], "role": info["role"], "rows": m.get("rows"),
                    "via": via, "fetched_at": r.get("fetched_at") or m.get("fetched_at"),
                    "sha256": io_csv.sha256(ds_id), "license": config.LICENSE_FREE,
                    "url": f"https://www.data.go.kr/data/{ds_id}/fileData.do"})
    out.append({"id": config.LIVE_DATASET, "name": "실시간 주차현황(API)", "role": "core", "rows": None,
                "via": "api", "fetched_at": None, "sha256": None, "license": config.LICENSE_FREE,
                "url": f"https://www.data.go.kr/data/{config.LIVE_DATASET}/openapi.do"})
    return out


def fmt_hm(k):
    return f"{k * 10 // 60:02d}:{k * 10 % 60:02d}"


def noscript_summary(profiles, season, today):
    """JS 없이도 보이는 정적 요약(§11). 7월 기준 요일군 프로파일로 만조를 계산한다."""
    parts = []
    for g, label in (("weekday", "평일"), ("sat", "토요일"), ("sun", "일요일")):
        his = tide.high_tides(profiles["groups"][g]["occ"])
        if his:
            parts.append(f"{label} 만조 {', '.join(fmt_hm(k) for k in his)}")
    return ("이 서비스는 자바스크립트가 필요해요. 2024년 7월 입출차 기록 기준으로 " + " · ".join(parts) +
            "이에요. 계산 방법은 저장소 README에서 볼 수 있어요.")


def inject_noscript(site_dir, text):
    p = os.path.join(site_dir, "index.html")
    if not os.path.exists(p):
        return
    s = open(p, encoding="utf-8").read()
    s2 = re.sub(r"<!--NOSCRIPT-->.*?<!--/NOSCRIPT-->", f"<!--NOSCRIPT-->{text}<!--/NOSCRIPT-->", s, flags=re.S)
    if s2 != s:
        with open(p, "w", encoding="utf-8") as f:
            f.write(s2)


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="site/data")
    ap.add_argument("--archive", default=None)
    ap.add_argument("--offline", action="store_true")
    a = ap.parse_args(argv)
    out = a.out
    os.makedirs(out, exist_ok=True)
    now = config.now_kst()
    built_at = now.isoformat()
    today = config.today_kst()
    warnings = []
    secrets = [key("DATA_GO_KR_KEY"), key("CULTURE_API_KEY")]

    refreshed = {}
    if not a.offline:
        try:
            refreshed, w = fetch.refresh()
            warnings += w
        except Exception as e:
            warnings.append(f"fetch_failed:{type(e).__name__}")
            print("fetch failed:", scrub(e, *secrets), file=sys.stderr)

    print("1/9 normalize", file=sys.stderr)
    rows = normalize.load_parking()
    class_rows = normalize.load_classes()
    posters = normalize.load_posters()

    # 공휴일: 정적 파일(+키 있으면 API로 보강)
    hol = io_csv.load_static("holidays.json")
    hol_out = {"schema": "holidays/1", "built_at": built_at, "source": hol["source"],
               "source_urls": hol["source_urls"], "status": hol["status"], "note": hol["note"],
               "via": "static", "dates": dict(hol["dates"])}
    try:
        api = hol_adapter.fetch([today.year, today.year + 1])
        if api is not None:
            diff = sorted(set(api) ^ {d for d in hol["dates"] if d[:4] in (str(today.year), str(today.year + 1))})
            if diff:
                warnings.append(f"holidays_diff:{len(diff)}")
            hol_out["dates"].update(api)
            hol_out["via"] = "api"
    except Exception as e:
        warnings.append("holidays_adapter_failed")
        print(scrub(e, *secrets), file=sys.stderr)
    hol_out["dates"] = dict(sorted(hol_out["dates"].items()))

    print("2/9 profiles", file=sys.stderr)
    profiles, pk, event_days = model_profiles.build(rows, posters, built_at)
    profiles["dispersion"] = dispersion.build(pk, profiles, event_days)
    profiles["daytime"] = {}
    for g, G in profiles["groups"].items():
        pk_k, peak, wins = tide.daytime_quiet(G["occ"])
        profiles["daytime"][g] = {"peak_k": pk_k, "peak": round(peak, 1),
                                  "windows": [{"start_k": k, "mean": round(m, 1), "reduction": round(r, 3)} for k, m, r in wins]}
    print("3/9 season", file=sys.stderr)
    season = model_season.build(normalize.load_monthly(), built_at)
    print("4/9 classes", file=sys.stderr)
    classes, checks, _fit = model_classes.build(class_rows, pk, event_days, today, built_at)
    print("5/9 backtest", file=sys.stderr)
    bt = backtest.build(pk, event_days, checks, built_at)
    g = bt["methods"]
    if not (g["group"]["mae60"] < g["single"]["mae60"] and g["group"]["mae60"] < g["flat"]["mae60"]):
        warnings.append("backtest_regression")

    print("6/9 context", file=sys.stderr)
    weather = None
    try:
        weather = kma.fetch()
    except Exception as e:
        warnings.append("kma_adapter_failed")
        print(scrub(e, *secrets), file=sys.stderr)
    ctx = context.build_context(normalize.load_notices(), normalize.load_lawn(), normalize.load_faq(), today,
                                built_at, weather, warnings)
    ctx["visit"] = io_csv.load_static("visit_info.json")
    ev = context.build_events(normalize.load_events_en(), today, built_at)
    try:
        k_items = kcisa.fetch_events(today)
        if k_items:
            ev.update({"source": "kcisa-3037877", "date_semantics": "event_start",
                       "date_semantics_note": "문화공공데이터광장 공연정보의 공연 시작일", "items": k_items,
                       "latest_date": max(x["date"] for x in k_items),
                       "upcoming_count": sum(1 for x in k_items if x["date"] >= today.isoformat())})
    except Exception as e:
        warnings.append("kcisa_adapter_failed")
        print(scrub(e, *secrets), file=sys.stderr)

    print("7/9 live", file=sys.stderr)
    lv = live.build(a.archive, out, built_at, today)
    print("8/9 quality", file=sys.stderr)
    prev_q = None
    try:
        with open(os.path.join(out, "quality.json"), encoding="utf-8") as f:
            prev_q = json.load(f)
    except (OSError, ValueError):
        pass
    q = quality.build(today, profiles, classes, season, lv, built_at, prev=prev_q)

    man = io_csv.manifest()
    meta = {
        "schema": "meta/1", "built_at": built_at,
        "build_id": os.environ.get("GITHUB_RUN_ID", "local") + "-" + os.environ.get("GITHUB_SHA", "")[:7],
        "model_version": config.MODEL_VERSION, "today": today.isoformat(),
        "site_url": config.SITE_URL, "repo_url": config.REPO_URL,
        "keys": {"data_go_kr": bool(secrets[0]), "culture": bool(secrets[1])},
        "adapters": {"weather": weather is not None, "events_kcisa": ev["source"] == "kcisa-3037877",
                     "holidays_api": hol_out["via"] == "api"},
        "sources": sources_meta(man, refreshed),
        "periods": {"15138735": ["2024-07-01", "2024-07-31"],
                    "15131671": [f"{min(season['years'])}-01", f"{max(season['years'])}-12"],
                    "15149169": [min(x["date"] for x in ev["items"]), ev["latest_date"]]},
        "live_api": config.LIVE_API_URL,
        "warnings": warnings,
    }
    print("9/9 write + validate", file=sys.stderr)
    for name, obj in (("profiles", profiles), ("season", season), ("classes", classes), ("backtest", bt),
                      ("context", ctx), ("events", ev), ("live", lv), ("quality", q), ("holidays", hol_out),
                      ("meta", meta)):
        dump(out, name, obj)
    props = io_csv.load_static("proposals.json")
    dump(out, "proposals", {"schema": "proposals/1", "built_at": built_at, **props})
    errors = validate.validate_dir(out)
    # 키 문자열이 산출물에 없는지 검사
    for sec in secrets:
        if not sec:
            continue
        for fn in os.listdir(out):
            if sec in open(os.path.join(out, fn), encoding="utf-8", errors="ignore").read():
                errors.append(f"secret leaked into {fn}")
    site_dir = os.path.dirname(os.path.abspath(out))
    inject_noscript(site_dir, noscript_summary(profiles, season, today))
    if errors:
        for e in errors:
            print("SCHEMA:", e, file=sys.stderr)
        sys.exit(1)
    print(f"ok · {len(os.listdir(out))} files · warnings={warnings}", file=sys.stderr)


if __name__ == "__main__":
    main()
