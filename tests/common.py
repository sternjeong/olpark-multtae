"""테스트 공용: 무거운 계산은 한 번만 한다(같은 프로세스에서 캐시)."""
import datetime as dt
import functools
import os
import subprocess
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from build import model_classes, model_profiles, model_season, normalize  # noqa: E402

REF = dt.date(2026, 11, 15)   # 스냅숏 기준일
BUILT = "2026-11-15T00:00:00+09:00"
SITE = os.path.join(ROOT, "site")
DATA = os.path.join(SITE, "data")


@functools.lru_cache(None)
def profiles():
    rows = normalize.load_parking()
    return model_profiles.build(rows, normalize.load_posters(), BUILT)


@functools.lru_cache(None)
def season():
    return model_season.build(normalize.load_monthly(), BUILT)


@functools.lru_cache(None)
def classes():
    prof, pk, ev = profiles()
    return model_classes.build(normalize.load_classes(), pk, ev, REF, BUILT)


def ensure_site_data():
    if not os.path.exists(os.path.join(DATA, "meta.json")):
        env = dict(os.environ, OLPARK_TODAY=REF.isoformat())
        subprocess.check_call([sys.executable, "-m", "build.main", "--out", DATA, "--offline"], cwd=ROOT, env=env)


def read(p):
    with open(p, encoding="utf-8", errors="ignore") as f:
        return f.read()
