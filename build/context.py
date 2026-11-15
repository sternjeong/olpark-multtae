"""§6.9 상황 칩(context.json)과 공연 기록(events.json)."""
import collections
import datetime as dt
import re

from .normalize import parse_lawn

KW = re.compile(r"주차|차량|회차|대중교통|통제|공사|잔디|자전거|충전|출입")
KW_STRONG = re.compile(r"주차|회차|차량|출입|대중교통")
ROSE_FAQ_ID = "18974"


def build_context(notices, lawn, faq, today, built_at, weather=None, warnings=None):
    lo = (today - dt.timedelta(days=7)).isoformat()
    hi = (today + dt.timedelta(days=60)).isoformat()
    sel = []
    for n in notices:
        if not KW.search(n["title"]):
            continue
        if not (n["from"] >= "2023-01-01" or KW_STRONG.search(n["title"])):
            continue
        if n["to"] < lo or n["from"] > hi:
            continue
        sel.append({"title": n["title"], "from": n["from"], "to": n["to"], "url": n["url"], "dataset": "15090715",
                    "priority": 1 if KW_STRONG.search(n["title"]) else 0})
    lawn_out = []
    open_places = collections.defaultdict(list)
    for r in lawn:
        p = parse_lawn(r["text"])
        if not p:
            continue
        a, b, wrap = p
        if r["label"] == "출입금지기간" or wrap:
            lawn_out.append({"place": r["place"], "closed": [a, b], "wrap_year": wrap, "dataset": "15143220",
                             "url": r["url"]})
        else:
            open_places[(a, b)].append(r["place"])
    for (a, b), places in open_places.items():
        lawn_out.append({"places": places, "open": [a, b], "wrap_year": False, "dataset": "15143220",
                         "url": lawn[0]["url"] if lawn else None})
    rose = None
    f = faq.get(ROSE_FAQ_ID)
    if f and "5월말 6월초" in f["text"] and "9월말" in f["text"] and "10월초" in f["text"]:
        rose = {"periods": [["05-20", "06-10"], ["09-20", "10-10"]],
                "source": f"15089962#{ROSE_FAQ_ID}",
                "note": "FAQ 문구 '5월말 6월초', '9월말~10월초'를 날짜 범위로 옮김(수작업 매핑)",
                "url": "https://www.ksponco.or.kr/olympicpark/"}
    elif warnings is not None:
        warnings.append("rose_faq_text_changed")
    return {"schema": "context/1", "built_at": built_at,
            "notice_rule": {"keywords": KW.pattern, "strong": KW_STRONG.pattern, "max": 2,
                            "window": [lo, hi]},
            "notices": sorted(sel, key=lambda x: (-x["priority"], x["from"])),
            "lawn": lawn_out, "rose": rose, "weather": weather}


def build_events(events, today, built_at):
    by_date = collections.Counter(e["date"] for e in events)
    latest = max(e["date"] for e in events)
    items = [{"id": e["id"], "title": e["title"], "date": e["date"], "url": e["url"], "image": e["image"],
              "venue": None, "start_time": None} for e in sorted(events, key=lambda e: e["date"], reverse=True)]
    top_date, top_n = by_date.most_common(1)[0]
    return {"schema": "events/1", "built_at": built_at, "source": "15149169",
            "date_semantics": "uncertain",
            "date_semantics_note": f"같은 날짜에 {top_n}건이 몰린 사례({top_date})가 있어 공연일이 아닌 게시일이 섞여 있음",
            "latest_date": latest,
            "upcoming_count": sum(1 for e in events if e["date"] >= today.isoformat()),
            "items": items}
