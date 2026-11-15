"""원천 CSV → 파이썬 구조 정규화. 파싱 규칙은 tests/test_parsing.py가 고정한다."""
import datetime as dt
import html
import re

from . import io_csv

WD = "월화수목금토일"


# ---------- 공통 파서 ----------
def parse_date(s):
    try:
        return dt.date.fromisoformat(s.strip()[:10])
    except (ValueError, AttributeError):
        return None


def parse_days(s):
    """'월,화,수,목,금,(토)' -> {0,1,2,3,4}. 괄호 안 문자열((토), (방) 등)은 제외."""
    s = re.sub(r"\([^)]*\)", "", s or "")
    return {WD.index(c) for c in s if c in WD}


_TIME = re.compile(r"\s*(\d{1,2}):(\d{2})\s*[~\-]\s*(\d{1,2}):(\d{2})")


def parse_time_range(s):
    """'11:20~12:50' / '18:00-19:30' -> (680, 770) 분. 실패하면 None."""
    m = _TIME.match(s or "")
    if not m:
        return None
    a, b, c, d = map(int, m.groups())
    return a * 60 + b, c * 60 + d


def parse_range_str(s):
    """'2026-01-01~9999-12-31' -> (date, date)"""
    parts = (s or "").split("~")
    a = parse_date(parts[0]) if parts else None
    b = parse_date(parts[1]) if len(parts) > 1 else None
    return a, b


def parse_dt_min(s):
    """'2024-07-01 19:45' -> datetime (빠른 파서)"""
    s = s.strip()
    return dt.datetime(int(s[0:4]), int(s[5:7]), int(s[8:10]), int(s[11:13]), int(s[14:16]))


# 공연 포스터 공연일(자유서식) 정규식 — data_findings.md §7 F-16 명령과 같다.
POSTER_RE = re.compile(r"(\d{4})[-.](\d{1,2})[-.](\d{1,2})\s*\(?([월화수목금토일])?\)?\s*"
                       r"(?:(오후|오전|PM|AM)\s*)?(\d{1,2})[:시](\d{2})?")


def parse_poster_times(s):
    """공연일 문자열 → [(date, 'HH:MM')]. 요일은 날짜로 다시 계산하고, 12시 미만 표기는 오후로 본다."""
    out = []
    for m in POSTER_RE.finditer(s or ""):
        y, mo, d, _w, _ap, h, mi = m.groups()
        try:
            day = dt.date(int(y), int(mo), int(d))
        except ValueError:
            continue
        h = int(h)
        if h < 12:
            h += 12
        if h > 23:
            continue
        out.append((day, f"{h:02d}:{mi or '00'}"))
    return out


_LAWN = re.compile(r"(\d{2})-(\d{2})\s*~\s*(익년)?\s*(\d{2})-(\d{2})")


def parse_lawn(s):
    """'06-01 ~ 10-31' -> ('06-01','10-31',False), '11-01 ~ 익년05-31' -> ('11-01','05-31',True)"""
    m = _LAWN.search(s or "")
    if not m:
        return None
    a, b, wrap, c, d = m.groups()
    return f"{a}-{b}", f"{c}-{d}", bool(wrap)


# ---------- 데이터셋 로더 ----------
def load_parking():
    """15138735 → [(in_dt, out_dt)]"""
    _, rows = io_csv.load("15138735")
    out = []
    for r in rows:
        out.append((parse_dt_min(r[1]), parse_dt_min(r[2])))
    return out


def load_monthly():
    _, rows = io_csv.load("15131671")
    out = []
    for y, m, place, n in rows:
        out.append({"year": int(y), "month": int(m.strip()[:2]), "place": place.strip(), "count": int(n)})
    return out


def _class_row(center, r, ds):
    if ds == "15101610":
        valid = parse_range_str(r[11])
        return {"id": f"S-{r[1].strip()}", "num": r[1].strip(), "center": "올림픽수영장", "month": parse_date(r[3]),
                "sport": r[4].strip(), "name": r[5].strip(), "time": parse_time_range(r[6]), "cap_raw": r[7].strip(),
                "days": parse_days(r[8]), "target": r[9].strip(), "valid": valid,
                "url": r[13].strip() or "https://www.ksponco.or.kr/spm", "ds": ds}
    valid = (parse_date(r[11]), parse_date(r[12]))
    return {"id": f"C-{r[1].strip()}", "num": r[1].strip(), "center": "올림픽스포츠센터", "month": parse_date(r[3]),
            "sport": r[4].strip(), "name": r[5].strip(), "time": parse_time_range(r[6]), "cap_raw": r[7].strip(),
            "days": parse_days(r[8]), "target": r[9].strip(), "valid": valid,
            "url": "https://www.ksponco.or.kr/olympicpark/sportscenter", "ds": ds}


def load_classes():
    out = []
    for ds in ("15101610", "15110953"):
        _, rows = io_csv.load(ds)
        for r in rows:
            out.append(_class_row(None, r, ds))
    return out


def load_posters():
    _, rows = io_csv.load("15099006")
    return [{"title": r[2], "when": r[3], "venue": r[4].strip()} for r in rows]


def load_events_en():
    _, rows = io_csv.load("15149169")
    out = []
    for r in rows:
        out.append({"id": r[0].strip(), "title": html.unescape(r[1]).strip(), "url": r[3].strip(),
                    "image": r[4].strip(), "date": r[5].strip()})
    return out


def load_notices():
    _, rows = io_csv.load("15090715")
    return [{"no": r[1].strip(), "title": html.unescape(r[2]).strip(), "from": r[3].strip(), "to": r[4].strip(),
             "url": r[5].strip()} for r in rows]


def load_lawn():
    _, rows = io_csv.load("15143220")
    return [{"place": r[1].strip(), "label": r[2].strip(), "text": r[3].strip(), "url": r[4].strip()} for r in rows]


def load_faq():
    _, rows = io_csv.load("15089962")
    return {r[1].strip(): {"title": r[3].strip(), "text": r[4]} for r in rows}
