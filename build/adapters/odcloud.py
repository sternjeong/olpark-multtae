"""data.go.kr 파일데이터 자동변환 API(odcloud). DATA_GO_KR_KEY가 있을 때만.

응답 JSON 행을 원본 CSV와 같은 컬럼 순서로 재구성해 CP949 CSV 바이트로 돌려준다.
"""
import csv
import io
import json
import time
import urllib.parse

from . import get, key, scrub
from .. import config, io_csv


def fetch(ds_id, per_page=1000, max_pages=400):
    k = key("DATA_GO_KR_KEY")
    if not k:
        return None
    paths = io_csv.load_static("odcloud_paths.json")
    path = paths.get(ds_id)
    header = config.DATASETS.get(ds_id, {}).get("header")
    if not path or not header:
        return None
    rows = []
    try:
        for page in range(1, max_pages + 1):
            q = urllib.parse.urlencode({"page": page, "perPage": per_page, "returnType": "JSON", "serviceKey": k})
            data = json.loads(get(f"https://api.odcloud.kr/api{path}?{q}", timeout=60))
            batch = data.get("data", [])
            rows.extend(batch)
            if len(rows) >= data.get("totalCount", 0) or not batch:
                break
            time.sleep(0.3)
    except Exception as e:
        raise RuntimeError(f"odcloud {ds_id}: {scrub(e, k)}") from None
    if rows and set(header) - set(rows[0].keys()):
        raise RuntimeError(f"odcloud {ds_id}: 컬럼 불일치 {sorted(rows[0].keys())}")
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator="\r\n")
    w.writerow(header)
    for r in rows:
        w.writerow(["" if r.get(h) is None else r.get(h) for h in header])
    return buf.getvalue().encode("cp949", "replace")
