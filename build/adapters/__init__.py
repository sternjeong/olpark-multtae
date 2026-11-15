"""선택 키 어댑터. 키가 없으면 아무것도 하지 않는다. 키 값은 로그·산출물에 남기지 않는다."""
import os
import re
import urllib.request

from .. import config


def key(name):
    v = os.environ.get(name, "").strip()
    return v or None


def scrub(msg, *secrets):
    """예외 메시지에서 URL 쿼리와 키 값을 지운다."""
    s = str(msg)
    s = re.sub(r"(serviceKey|apiKey|key)=[^&\s'\"]+", r"\1=***", s, flags=re.I)
    for sec in secrets:
        if sec:
            s = s.replace(sec, "***")
    return s


def get(url, timeout=20):
    req = urllib.request.Request(url, headers={"User-Agent": config.USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()
