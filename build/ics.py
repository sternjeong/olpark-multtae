"""§6.7 공연 알림 .ics — site/assets/js/app.js buildIcs()와 같은 규칙의 파이썬 구현(테스트용).
CRLF, 75옥텟 접기, TZID=Asia/Seoul + VTIMEZONE(+0900, 서머타임 없음)."""
import datetime as dt


def fold(line):
    out, cur, n = [], "", 0
    for ch in line:
        b = len(ch.encode("utf-8"))
        if n + b > (74 if out else 75):
            out.append(cur)
            cur, n = "", 0
        cur += ch
        n += b
    out.append(cur)
    return "\r\n ".join(out)


def esc(s):
    return s.replace("\\", "\\\\").replace(";", "\;").replace(",", "\\,").replace("\n", "\\n")


def _dt(day, minute):
    d = day + dt.timedelta(days=minute // 1440)
    m = minute % 1440
    return f"{d.strftime('%Y%m%d')}T{m // 60:02d}{m % 60:02d}00"


def build(day, T, overlay, site_url, host="olpark-multtae", stamp="20261115T000000Z"):
    o = overlay["offsets_min"]
    tag = f"{day.strftime('%Y%m%d')}-{T // 60:02d}{T % 60:02d}"
    tail = f"근거·한계: {site_url}#/method/sari"

    def ev(n, start, length, summary, desc, alarm):
        return ["BEGIN:VEVENT", f"UID:olpark-multtae-{tag}-{n}@{host}", f"DTSTAMP:{stamp}",
                f"DTSTART;TZID=Asia/Seoul:{_dt(day, start)}", f"DTEND;TZID=Asia/Seoul:{_dt(day, start + length)}",
                f"SUMMARY:{esc(summary)}", f"DESCRIPTION:{esc(desc + chr(10) + tail)}",
                "BEGIN:VALARM", "ACTION:DISPLAY", f"DESCRIPTION:{esc(summary)}", f"TRIGGER:-PT{alarm}M",
                "END:VALARM", "END:VEVENT"]

    lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//olpark-multtae//KO", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
             "BEGIN:VTIMEZONE", "TZID:Asia/Seoul", "BEGIN:STANDARD", "DTSTART:19700101T000000", "TZOFFSETFROM:+0900",
             "TZOFFSETTO:+0900", "TZNAME:KST", "END:STANDARD", "END:VTIMEZONE",
             *ev(1, T + o["rush_start"] - 20, 20, "올팍 물때: 입차 몰림 전 도착", "입차 몰림 전 도착 권장", 60),
             *ev(2, T + o["clear"], 10, "올팍 물때: 썰물이 빠지는 시각", "썰물이 평소 수준으로 돌아오는 시각", 15),
             "END:VCALENDAR"]
    return "\r\n".join(fold(x) for x in lines) + "\r\n"
