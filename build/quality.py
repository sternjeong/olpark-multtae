"""§17.2 개방 데이터 점검 12건 + §17.3 운영 인사이트. 매 빌드 원자료에서 다시 계산한다.

각 점검은 결함 여부(defect)를 스스로 판정하고, 결함이 사라지면 status가 resolved로 바뀐다.
문구는 기관에 드리는 '개선 제안'이다: 근거(재계산 숫자·예시) → 고칠 방법 → 기대 효과.
"""
import collections
import datetime as dt
import json
import os
import re
import statistics as st

from . import config, io_csv

WD = "월화수목금토일"
REPRO = "python3 -m build.quality --check {id}"


def _check(id_, dataset, title, severity, defect, metric, example, impact, fix, benefit, finding, detail=None):
    return {"id": id_, "dataset": dataset, "title": title, "severity": severity,
            "status": "open" if defect else "resolved", "metric": metric, "example": example,
            "impact": impact, "fix": fix, "benefit": benefit, "repro": REPRO.format(id=id_),
            "finding": finding, "detail": detail or {}}


def q01():
    _, r = io_csv.load("15164156")
    bug = [x for x in r if x[5][3:5] == x[4][5:7] and x[5][6:8] == x[4][8:10]]
    ex = f"{bug[0][4]} → {bug[0][5]}" if bug else ""
    return _check("Q01", "15164156", "등록시간의 분·초 자리에 등록일의 월·일이 들어가 있어요", "high", len(bug) > 0,
                  {"found": len(bug), "total": len(r), "unit": "행"}, ex,
                  "시각을 '시' 단위로만 쓸 수 있어 시간대별 혼잡 분석이 어려워요.",
                  "등록시간을 HH:mm:ss 형식으로 생성하도록 추출 쿼리의 날짜 형식 문자열을 점검해 주세요.",
                  "분 단위 혼잡 기록이 살아나 실시간·과거 혼잡을 함께 안내할 수 있어요.", "F-32")


def q02():
    _, r = io_csv.load("15164156")
    idmap = collections.defaultdict(set)
    for x in r:
        idmap[x[2]].add(x[1])
    multi = {k: sorted(v, key=int) for k, v in sorted(idmap.items()) if len(v) > 1}
    dup = collections.Counter((x[2], x[4], x[5][:2]) for x in r)
    ndup = sum(v - 1 for v in dup.values() if v > 1)
    ex = ", ".join(f"{k} = 아이디 {{{', '.join(v)}}}" for k, v in multi.items())
    return _check("Q02", "15164156", "한 주차구역에 아이디가 2개이고, 같은 구역·날·시 기록이 겹쳐요", "medium",
                  bool(multi) or ndup > 0, {"found": ndup, "total": len(r), "unit": "중복 행",
                                            "zones_multi_id": len(multi)}, ex,
                  "구역별로 묶을 때 어느 아이디가 맞는지 판단할 수 없어요.",
                  "주차구역과 아이디를 1:1로 맞춘 구역 마스터를 두고, 기록 기준(상태가 바뀔 때 기록 등)을 메타데이터에 적어 주세요.",
                  "구역별 만차 빈도를 그대로 집계해 방문객 안내에 쓸 수 있어요.", "F-33", {"multi_id": multi})


def q03(today):
    _, r = io_csv.load("15149169")
    c = collections.Counter(x[5] for x in r)
    top_d, top_n = c.most_common(1)[0]
    wd = collections.Counter(dt.date.fromisoformat(x[5]).weekday() for x in r)
    wk = (wd[5] + wd[6]) / len(r)
    return _check("Q03", "15149169", "공연일자에 실제 공연일이 아닌 날짜가 섞여 있어요", "high", top_n >= 5,
                  {"found": top_n, "total": len(r), "unit": "건(같은 날짜 최다)", "weekend_share": round(wk, 3)},
                  f"{top_d} 하루에 {top_n}건 · 주말 비중 {wk * 100:.0f}%",
                  "공연 날짜로 혼잡을 미리 알려 드릴 수 없어, 이 서비스는 공연 시작 시각을 직접 입력받아요.",
                  "공연 시작일·종료일·공연장 컬럼을 나누고, 게시일은 별도 컬럼으로 두면 좋겠어요.",
                  "공연일 혼잡 경보를 자동으로 띄울 수 있어요.", "F-31",
                  {"top_dates": c.most_common(4), "weekday_counts": {WD[k]: v for k, v in sorted(wd.items())}})


def q04(today):
    _, r = io_csv.load("15149169")
    latest = max(x[5] for x in r)
    upcoming = sum(1 for x in r if x[5] >= today.isoformat())
    return _check("Q04", "15149169", "앞으로 열릴 공연 일정이 비어 있어요", "high", upcoming == 0,
                  {"found": upcoming, "total": len(r), "unit": f"건({today.isoformat()} 이후)", "latest": latest},
                  f"가장 늦은 공연일자 {latest}",
                  "다가오는 공연을 기준으로 한 혼잡 안내를 할 수 없어요.",
                  "공연이 확정될 때마다 수시로 갱신하거나 파일 갱신 주기를 줄여 주세요.",
                  "공연 관객에게 출발·퇴장 시각을 미리 안내할 수 있어요.", "F-31")


def q05():
    _, m = io_csv.load("15131671")
    mon = {(x[0], x[1], x[2]): int(x[3]) for x in m}
    a = mon.get(("2024", "07월", "올림픽공원"))
    _, raw = io_csv.load("15138735")
    n = len(raw)
    ratio = n / a if a else None
    return _check("Q05", "15131671 · 15138735", "같은 달 주차 대수가 두 데이터에서 3배 넘게 달라요", "medium",
                  ratio is not None and not (0.9 <= ratio <= 1.1),
                  {"found": n, "total": a, "unit": "대(원자료 / 월별주차)", "ratio": round(ratio, 2) if ratio else None},
                  f"2024-07 월별주차현황 {a:,}대 vs 입출차 원자료 {n:,}행 (×{ratio:.2f})",
                  "두 숫자를 섞어 쓸 수 없어, 이 서비스는 월별주차현황을 '비율(계절 지수)'로만 써요.",
                  "월별주차현황의 집계 정의(유료·회차·정기권 포함 여부)를 메타데이터에 적어 주세요.",
                  "이용자가 두 데이터를 안심하고 함께 쓸 수 있어요.", "F-35")


def q06():
    _, r = io_csv.load("15099006")
    mis, tot, ex = 0, 0, []
    for x in r:
        for m in re.finditer(r"(\d{4})\s*-\s*(\d{1,2})\s*-\s*(\d{1,2})\s*\(([월화수목금토일])", x[3]):
            y, mo, d, w = m.groups()
            try:
                D = dt.date(int(y), int(mo), int(d))
            except ValueError:
                continue
            tot += 1
            if WD[D.weekday()] != w:
                mis += 1
                ex.append(f"{m.group(0)}) → 실제 {WD[D.weekday()]}요일")
    venues = collections.Counter(x[4].strip() for x in r)
    dome = {k: v for k, v in venues.items() if re.search(r"kspo|체조", k, re.I)}
    years = [int(y) for y in re.findall(r"(\d{4})-\d{1,2}-\d{1,2}", " ".join(x[3] for x in r))]
    latest = max(years) if years else None
    return _check("Q06", "15099006", "요일 표기가 실제와 다르고, 공연장 이름이 여러 가지로 적혀 있어요", "low",
                  mis > 0 or len(dome) > 1,
                  {"found": mis, "total": tot, "unit": "건(요일 표기)", "venue_variants": len(dome), "latest_year": latest},
                  ex[0] if ex else "",
                  "날짜·시각을 정규식으로 다시 풀어야 하고, 같은 공연장을 하나로 묶기 어려워요.",
                  "날짜·시각을 ISO 형식의 별도 컬럼으로 두고, 공연장은 코드로 관리해 주세요.",
                  "공연 시작 시각 통계를 바로 낼 수 있어요.", "F-36",
                  {"dome_variants": dict(sorted(dome.items(), key=lambda kv: -kv[1])), "examples": ex[:5]})


def q07():
    _, r = io_csv.load("15110953")
    z = [x for x in r if x[12].startswith("9999") and x[11] < "2023-01-01"]
    sports = collections.Counter(x[4] for x in z).most_common(3)
    return _check("Q07", "15110953", "끝난 것으로 보이는 옛 강좌가 '진행 중'으로 남아 있어요", "medium", len(z) > 0,
                  {"found": len(z), "total": len(r), "unit": "행"},
                  f"2023년 이전 시작 · 종료일 9999-12-31 · {sports[0][0]} {sports[0][1]}행" if sports else "",
                  "현재 운영 강좌를 셀 때 이 행들을 빼야 해요(이 서비스는 규칙으로 제외).",
                  "폐강하거나 개편된 강좌에는 종료일을 넣어 주세요.",
                  "현재 시간표를 그대로 믿고 쓸 수 있어요.", "F-37", {"by_sport": sports})


def q08():
    files = {"15101610": "올림픽수영장", "15110953": "올림픽스포츠센터", "15114776": "일산스포츠센터", "15118652": "분당스포츠센터"}
    heads, seps, brackets = {}, collections.Counter(), 0
    concepts = {"수업 시간": (6, 6, 5, 6), "요일": (8, 8, 7, 8), "금액": (10, 10, 9, 10), "시작 월": (3, 3, 2, 3),
                "대상": (9, 9, 8, 9), "기간 시작": (11, 11, 10, 11)}
    rows_by = {}
    for ds in files:
        h, r = io_csv.load(ds)
        heads[ds] = h
        rows_by[ds] = r
    differ = {}
    for name, idx in concepts.items():
        names = [heads[ds][i] for ds, i in zip(files, idx)]
        if len(set(names)) > 1:
            differ[name] = names
    for ds, i in zip(files, concepts["수업 시간"]):
        for x in rows_by[ds]:
            m = re.match(r"\s*\d{1,2}:\d{2}\s*([~\-])", x[i])
            if m:
                seps[m.group(1)] += 1
    for ds, i in zip(files, concepts["요일"]):
        brackets += sum(1 for x in rows_by[ds] if "(" in x[i])
    return _check("Q08", "강좌 4종", "같은 뜻의 컬럼이 센터마다 다른 이름·형식이에요", "medium", len(differ) > 0,
                  {"found": len(differ), "total": len(concepts), "unit": "개 항목", "time_separators": len(seps)},
                  " / ".join(differ.get("금액", [])),
                  "센터를 하나 더할 때마다 별도 변환 코드가 필요해요.",
                  "4개 센터 강좌 파일에 같은 컬럼명·시간 형식(예: HH:mm~HH:mm)을 쓰는 공통 스키마를 두면 좋겠어요.",
                  "모든 센터의 강좌를 한 번에 다룰 수 있어요.", "F-38",
                  {"differ": differ, "separators": dict(seps), "bracket_day_rows": brackets,
                   "files": files})


def q09():
    _, r = io_csv.load("15143220")
    vals = collections.Counter(x[2] for x in r)
    dup = [k for k, v in collections.Counter(x[1] for x in r).items() if v > 1]
    label_as_value = sum(v for k, v in vals.items() if k in ("개방시간", "출입금지기간"))
    return _check("Q09", "15143220", "컬럼 값에 컬럼 이름이 들어가 있고, 같은 장소가 두 번 있어요", "low",
                  label_as_value > 0 or bool(dup),
                  {"found": label_as_value, "total": len(r), "unit": "행", "duplicates": len(dup)},
                  f"'개방시간' 컬럼 값: {dict(vals)} · 중복 장소: {', '.join(dup) or '없음'}",
                  "어느 컬럼이 기간인지 사람이 읽어 판단해야 해요.",
                  "컬럼 이름을 '구분'으로 바꾸고 중복 행을 정리해 주세요. 좌표가 있으면 더 좋아요.",
                  "잔디 개방 상태를 자동으로 안내할 수 있어요.", "F-39", {"values": dict(vals), "duplicates": dup})


def q10(today):
    _, r = io_csv.load("15090715")
    t = today.isoformat()
    active = [x for x in r if x[3] <= t <= x[4]]
    bulk = collections.Counter(x[3] for x in active).most_common(1)
    covid = [x[2] for x in active if "코로나" in x[2]]
    bulk_d, bulk_n = bulk[0] if bulk else ("", 0)
    return _check("Q10", "15090715", "오래된 공지의 게시 종료일이 먼 미래로 남아 있어요", "low",
                  bulk_n >= 3 and bulk_d < "2023-01-01" or bool(covid),
                  {"found": bulk_n, "total": len(active), "unit": f"건(게시 중, {bulk_d} 일괄 등록)"},
                  (f"'{covid[0]}' 게시 중" if covid else f"{bulk_d} 등록 공지 {bulk_n}건 게시 중"),
                  "지금 유효한 안내를 골라내려면 별도 규칙이 필요해요.",
                  "게시 종료일을 정리하고, 상시 안내는 '상시' 구분으로 따로 두면 좋겠어요.",
                  "공원 소식을 방문객에게 정확히 전할 수 있어요.", "F-40",
                  {"active_titles": [x[2] for x in active]})


def q11(live, profiles, season):
    """실시간 값 vs 같은 요일·시각 재구성 점유 × 계절 지수. 아카이브가 있으면 아카이브 중앙값을, 없으면
    data/raw/15168686/ 의 기록된 응답(헤더 Date 포함)을 쓴다."""
    obs = []
    if live and live.get("readings"):
        for ts, v in live["readings"]:
            obs.append((dt.datetime.fromisoformat(ts), v))
        basis = "아카이브"
    else:
        hdr = open(os.path.join(config.RAW_DIR, "15168686", "ksponco_parkingorsApi.headers.txt"), encoding="utf-8").read()
        body = json.load(open(os.path.join(config.RAW_DIR, "15168686", "ksponco_parkingorsApi.sample.txt"), encoding="utf-8"))
        m = re.search(r"^Date: (.+)$", hdr, re.M)
        when = dt.datetime.strptime(m.group(1).strip(), "%a, %d %b %Y %H:%M:%S GMT").replace(
            tzinfo=dt.timezone.utc).astimezone(config.KST)
        obs.append((when, body[0]["parking_sum"]))
        basis = "기록된 응답 1건"
    ctype = "text/html" if "text/html" in open(os.path.join(config.RAW_DIR, "15168686",
                                                            "ksponco_parkingorsApi.headers.txt"), encoding="utf-8").read() else "?"
    ratios = []
    for when, v in obs:
        d = when.date()
        g = "weekday" if d.weekday() < 5 else ("sat" if d.weekday() == 5 else "sun")
        k = (when.hour * 60 + when.minute) // 10
        ref = profiles["groups"][g]["occ"][k] * season["index"][str(when.month)]
        if ref > 0:
            ratios.append(v / ref)
    ratio = st.median(ratios) if ratios else None
    w0, v0 = obs[0]
    g0 = "weekday" if w0.weekday() < 5 else ("sat" if w0.weekday() == 5 else "sun")
    k0 = (w0.hour * 60 + w0.minute) // 10
    return _check("Q11", "15168686", "실시간 응답에 값이 하나뿐이고 기준이 적혀 있지 않아요", "medium", True,
                  {"found": 1, "total": None, "unit": "개 값(parking_sum)", "ratio": round(ratio, 2) if ratio else None,
                   "n_obs": len(obs), "basis": basis},
                  f"{w0.strftime('%Y-%m-%d %H:%M')} {v0:,}대 vs 같은 요일·시각 2024-07 재구성 점유 "
                  f"{profiles['groups'][g0]['occ'][k0]:.0f}대 × {w0.month}월 지수 {season['index'][str(w0.month)]:.2f}",
                  "총면수·잔여면수·구역이 없어 '얼마나 찼는지'를 말할 수 없고, 원자료와 기준이 달라 같은 축에 그릴 수 없어요.",
                  "Content-Type을 application/json으로, 구역별 현재 대수·총면수·잔여면수를 함께 주고, 장기주차 포함 여부를 적어 주세요.",
                  "실시간 만차율 안내와 예보 곡선 보정이 가능해져요.", "F-29, F-30",
                  {"content_type": ctype, "observations": [[w.isoformat(), v] for w, v in obs[:5]]})


def q12():
    _, r = io_csv.load("15147873")
    cat = io_csv.load_static("portal_catalog.json")
    portal = len(cat["datasets"])
    latest = max(x[10] for x in r if x[10])
    return _check("Q12", "15147873", "기관 개방목록과 포털 등록 목록의 건수가 달라요", "low", len(r) != portal,
                  {"found": len(r), "total": portal, "unit": "건(기관 목록 / 포털)", "latest_modified": latest},
                  f"기관 목록 {len(r)}건(최종 수정 {latest}) vs 포털 {portal}건({cat['generated']} 조회)",
                  "어떤 데이터가 열려 있는지 한 번에 확인하기 어려워요.",
                  "포털 등록과 기관 개방목록을 같은 주기로 맞춰 주세요.",
                  "이용자가 필요한 데이터를 빠짐없이 찾을 수 있어요.", "F-41")


def zones():
    _, r = io_csv.load("15164156")
    snaps = collections.defaultdict(list)
    for x in r:
        snaps[(x[4], x[5][:2])].append((x[2], x[3]))
    full = collections.Counter(z for v in snaps.values() for z, s in v if s == "만차")
    wd = collections.Counter(dt.date.fromisoformat(x[4]).weekday() for x in r)
    return {"full_counts": dict(full.most_common()), "snapshots": len(snaps),
            "weekend_share": round((wd[5] + wd[6]) / len(r), 3)}


def insights(profiles, classes, season, zone):
    sh = profiles["short_stop_share"]
    dw = profiles["dwell_hist"]["short_share"]
    top3 = list(zone["full_counts"])[:3]
    idx = season["index"]
    big = sorted(idx, key=lambda m: -idx[m])[:2]
    ev = profiles["event_overlay"].get("sat", {})
    return [
        {"id": "I01", "text": f"차 3대 중 1대({dw * 100:.1f}%)는 10분 안에 나가요. 승하차·회차 동선을 살펴볼 근거예요.",
         "value": dw, "finding": "F-04"},
        {"id": "I02", "text": f"21시엔 입차의 {sh[21] * 100:.0f}%가 10분 안에 나가요. 저녁 강좌가 끝나는 시각이라 픽업 대기 공간을 검토해 볼 만해요.",
         "value": sh[21], "finding": "F-09"},
        {"id": "I03", "text": f"평일 05~22시 입차의 약 {classes['beta']['share_weekday'] * 100:.1f}%는 강좌 시작 수요로 설명돼요. 강좌 시간 조정으로 아침 밀물을 낮출 여지가 있어요.",
         "value": classes["beta"]["share_weekday"], "finding": "F-23"},
        {"id": "I04", "text": f"만차 기록이 많은 구역은 {'·'.join(top3)}이고, 기록의 {zone['weekend_share'] * 100:.0f}%가 주말이에요. 구역 위치가 열리면 방문객 안내에 바로 쓸 수 있어요.",
         "value": zone["weekend_share"], "finding": "F-34"},
        {"id": "I05", "text": f"{big[0]}월·{big[1]}월은 7월보다 약 {min(idx[big[0]], idx[big[1]]):.1f}배 붐벼요(월별주차현황 3개년 평균). 성수기 인력 배치에 참고할 수 있어요.",
         "value": [idx[big[0]], idx[big[1]]], "finding": "F-26"},
    ]


def track_status(checks, prev, today):
    """해결됨 자동 감지: 이전 산출물에서 열려 있던 점검이 이번에 결함 0이면 resolved_at = 오늘.
    이미 해결된 점검은 날짜를 유지하고, 다시 결함이 생기면 open으로 돌아가 날짜를 지운다."""
    before = {c["id"]: c for c in (prev or {}).get("checks", [])}
    for c in checks:
        p = before.get(c["id"], {})
        c["open_since"] = p.get("open_since") or (today.isoformat() if c["status"] == "open" else None)
        if c["status"] == "resolved":
            c["resolved_at"] = p.get("resolved_at") if p.get("status") == "resolved" and p.get("resolved_at") else today.isoformat()
        else:
            c["resolved_at"] = None
            if p.get("status") == "resolved":
                c["open_since"] = today.isoformat()
    return checks


def build(today, profiles, classes, season, live, built_at, prev=None):
    checks = [q01(), q02(), q03(today), q04(today), q05(), q06(), q07(), q08(), q09(), q10(today),
              q11(live, profiles, season), q12()]
    track_status(checks, prev, today)
    z = zones()
    return {"schema": "quality/1", "built_at": built_at, "checks": checks,
            "insights": insights(profiles, classes, season, z), "zones": z,
            "note": "이 서비스를 만들며 실제로 부딪힌 문제예요. 숫자는 빌드할 때마다 다시 계산해요."}


def _cli():
    import argparse
    ap = argparse.ArgumentParser(description="개방 데이터 점검 하나를 다시 계산해 출력")
    ap.add_argument("--check", required=True)
    a = ap.parse_args()
    today = config.today_kst()
    fns = {"Q01": q01, "Q02": q02, "Q03": lambda: q03(today), "Q04": lambda: q04(today), "Q05": q05, "Q06": q06,
           "Q07": q07, "Q08": q08, "Q09": q09, "Q10": lambda: q10(today), "Q12": q12}
    if a.check == "Q11":
        prof = json.load(open(os.path.join(config.ROOT, "site", "data", "profiles.json"), encoding="utf-8"))
        sea = json.load(open(os.path.join(config.ROOT, "site", "data", "season.json"), encoding="utf-8"))
        lp = os.path.join(config.ROOT, "site", "data", "live.json")
        live = json.load(open(lp, encoding="utf-8")) if os.path.exists(lp) else None
        res = q11(live, prof, sea)
    else:
        res = fns[a.check]()
    print(json.dumps(res, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    _cli()
