"""§8.5 실시간 수집과 §6.10 아카이브 집계.

  python3 -m build.live collect --archive live      # 15분마다(Actions, archive 브랜치)
  python3 -m build.live build --archive archive/live --out site/data
"""
import argparse
import csv
import datetime as dt
import glob
import json
import os
import statistics as st
import sys
import urllib.request

from . import config

HEADER = ["ts_kst", "parking_sum", "status"]


def classify(body):
    """응답 본문 → (status, value). Content-Type이 text/html이어도 JSON으로 파싱한다."""
    try:
        data = json.loads(body)
    except (ValueError, TypeError):
        return "error", None
    if isinstance(data, dict):
        if "error" in data or str(data.get("code", "")) == "9999" or "9999" in json.dumps(data):
            return "maintenance", None
        return "error", None
    if isinstance(data, list) and data and isinstance(data[0], dict) and "parking_sum" in data[0]:
        v = data[0]["parking_sum"]
        if isinstance(v, (int, float)) and not isinstance(v, bool) and 0 < v < 10000:
            return "ok", int(v)
    return "error", None


def floor15(t):
    return t.replace(minute=t.minute - t.minute % 15, second=0, microsecond=0)


def collect(archive_dir, now=None, opener=None):
    now = now or config.now_kst()
    try:
        req = urllib.request.Request(config.LIVE_API_URL, headers={"User-Agent": config.USER_AGENT})
        with (opener or urllib.request.urlopen)(req, timeout=10) as r:
            body = r.read().decode("utf-8", "replace")
        status, val = classify(body)
    except Exception as e:  # 네트워크 오류도 '기록'한다(결측률 계산용)
        print(f"collect failed: {type(e).__name__}", file=sys.stderr)
        status, val = "error", None
    ts = floor15(now).strftime("%Y-%m-%dT%H:%M+09:00")
    os.makedirs(archive_dir, exist_ok=True)
    path = os.path.join(archive_dir, f"parking_{now.strftime('%Y-%m')}.csv")
    rows = {}
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            for r in csv.DictReader(f):
                rows[r["ts_kst"]] = r
    rows[ts] = {"ts_kst": ts, "parking_sum": "" if val is None else str(val), "status": status}
    with open(path, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=HEADER)
        w.writeheader()
        for k in sorted(rows):
            w.writerow(rows[k])
    print(f"{ts} {status} {'' if val is None else val}")
    return status, val


def read_archive(archive_dir):
    rows = []
    if archive_dir and os.path.isdir(archive_dir):
        for p in sorted(glob.glob(os.path.join(archive_dir, "parking_*.csv"))):
            with open(p, encoding="utf-8") as f:
                for r in csv.DictReader(f):
                    rows.append(r)
    rows.sort(key=lambda r: r["ts_kst"])
    return rows


def slot_key(t):
    return f"{t.weekday()}-{(t.hour * 60 + t.minute) // 15}"


def nowcast_backtest(ok, slots_fn, today):
    """§6.10 지금 보정: 아카이브 21일 이상일 때 최근 7일 검증으로 보정이 10% 이상 나을 때만 켠다."""
    if not ok:
        return {"enabled": False, "reason": "archive<21days", "mae_base": None, "mae_adj": None}
    first = ok[0][0].date()
    if (today - first).days < 21:
        return {"enabled": False, "reason": "archive<21days", "mae_base": None, "mae_adj": None}
    cut = dt.datetime.combine(today - dt.timedelta(days=7), dt.time(), tzinfo=config.KST)
    train = [(t, v) for t, v in ok if t < cut]
    test = [(t, v) for t, v in ok if t >= cut]
    med = slots_fn(train)
    byts = {t: v for t, v in ok}
    eb, ea = [], []
    for t, v in test:
        t60 = t + dt.timedelta(minutes=60)
        if t60 not in byts:
            continue
        m_now, m_fut = med.get(slot_key(t)), med.get(slot_key(t60))
        if not m_now or not m_fut:
            continue
        base = m_fut
        adj = m_fut * min(1.6, max(0.6, v / m_now))
        eb.append(abs(base - byts[t60]))
        ea.append(abs(adj - byts[t60]))
    if not eb:
        return {"enabled": False, "reason": "no_test_pairs", "mae_base": None, "mae_adj": None}
    mb, ma = st.mean(eb), st.mean(ea)
    return {"enabled": ma <= 0.9 * mb, "reason": "backtest", "mae_base": round(mb, 1), "mae_adj": round(ma, 1),
            "n_test": len(eb)}


def build(archive_dir, out_dir, built_at, today=None):
    today = today or config.today_kst()
    rows = read_archive(archive_dir)
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, "live_archive.csv"), "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=HEADER)
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, "") for k in HEADER})
    ok = []
    for r in rows:
        if r["status"] == "ok" and r["parking_sum"]:
            ok.append((dt.datetime.fromisoformat(r["ts_kst"]), int(r["parking_sum"])))
    since = dt.datetime.combine(today - dt.timedelta(days=28), dt.time(), tzinfo=config.KST)
    recent = [(t, v) for t, v in ok if t >= since]

    def slots_of(seq):
        by = {}
        for t, v in seq:
            by.setdefault(slot_key(t), []).append(v)
        return {k: st.median(v) for k, v in by.items()}

    by = {}
    for t, v in recent:
        by.setdefault(slot_key(t), []).append(v)
    slots = {k: {"median": round(st.median(v)), "n": len(v)} for k, v in sorted(by.items())}
    start = rows[0]["ts_kst"][:10] if rows else None
    days = (today - dt.date.fromisoformat(start)).days + 1 if start else 0
    n_all = len(rows)
    n_fail = sum(1 for r in rows if r["status"] != "ok")
    live = {
        "schema": "live/1", "built_at": built_at, "source": config.LIVE_DATASET,
        "archive_start": start, "days": days,
        "readings": [[t.strftime("%Y-%m-%dT%H:%M+09:00"), v] for t, v in recent],
        "slots": slots,
        "missing_rate": round(n_fail / n_all, 3) if n_all else None,
        "n_records": n_all,
        "last_ok": [ok[-1][0].strftime("%Y-%m-%dT%H:%M+09:00"), ok[-1][1]] if ok else None,
        "nowcast": nowcast_backtest(ok, slots_of, today),
    }
    return live


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["collect", "build"])
    ap.add_argument("--archive", default="archive/live")
    ap.add_argument("--out", default="site/data")
    a = ap.parse_args(argv)
    if a.cmd == "collect":
        collect(a.archive)
    else:
        live = build(a.archive, a.out, config.now_kst().isoformat())
        with open(os.path.join(a.out, "live.json"), "w", encoding="utf-8") as f:
            json.dump(live, f, ensure_ascii=False, separators=(",", ":"))


if __name__ == "__main__":
    main()
