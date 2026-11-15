"""§8.3 원천 갱신: odcloud(키 있을 때) → 포털 무키 다운로드 → 커밋된 스냅숏.

받은 파일은 CP949 디코딩·헤더·행 수(이전 스냅숏의 50% 이상)를 검사해 통과할 때만 work/raw/{id}.csv로 쓴다.
포털 경로는 공식 API가 아니어서 바뀔 수 있다. 실패하면 스냅숏으로 계속 동작하고 경고만 남긴다.

  python3 -m build.fetch            # work/raw 갱신 + work/sources.json
  python3 -m build.fetch --promote  # 검사를 통과한 갱신본을 data/raw 스냅숏으로 승격(refresh 워크플로)
"""
import argparse
import csv
import hashlib
import http.cookiejar
import io
import json
import os
import re
import shutil
import sys
import time
import urllib.parse
import urllib.request

from . import config, io_csv
from .adapters import odcloud, scrub

PORTAL = "https://www.data.go.kr"


def _opener():
    cj = http.cookiejar.CookieJar()
    op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    op.addheaders = [("User-Agent", config.USER_AGENT)]
    return op


def portal_ids(ds_id, op):
    """publicDataDetailPk(uddi)는 캐시(portal_ids.json → odcloud_paths.json)에서, 없으면 상세 페이지에서 얻는다."""
    cache = io_csv.load_static("portal_ids.json")
    if ds_id in cache:
        return cache[ds_id]
    paths = io_csv.load_static("odcloud_paths.json")
    m = re.search(r"(uddi:[0-9a-f\-]+)", paths.get(ds_id, ""))
    if m:
        return m.group(1)
    html = op.open(f"{PORTAL}/data/{ds_id}/fileData.do", timeout=30).read().decode("utf-8", "replace")
    m = re.search(r'name="publicDataDetailPk" value="([^"]+)"', html)
    return m.group(1) if m else None


def portal_download(ds_id):
    op = _opener()
    referer = f"{PORTAL}/data/{ds_id}/fileData.do"
    op.open(referer, timeout=30).read()
    pk = portal_ids(ds_id, op)
    if not pk:
        raise RuntimeError("publicDataDetailPk를 찾지 못함")
    time.sleep(1)
    form = urllib.parse.urlencode({"publicDataPk": ds_id, "publicDataDetailPk": pk, "publicDataTyCode": "PR0051",
                                   "atchFileId": "", "fileDetailSn": "1"}).encode()
    req = urllib.request.Request(f"{PORTAL}/tcs/dss/selectFileDataDownload.do", data=form,
                                 headers={"Referer": referer})
    info = json.loads(op.open(req, timeout=30).read())
    if not info.get("atchFileId"):
        raise RuntimeError("atchFileId 없음")
    time.sleep(1)
    q = urllib.parse.urlencode({"atchFileId": info["atchFileId"], "fileDetailSn": info.get("fileDetailSn", "1"),
                                "dataNm": ds_id})
    return op.open(f"{PORTAL}/cmm/cmm/fileDownload.do?{q}", timeout=120).read()


def validate(ds_id, b):
    text = b.decode("cp949")
    rows = list(csv.reader(io.StringIO(text)))
    header = [h.strip().lstrip("﻿") for h in rows[0]]
    exp = config.DATASETS[ds_id]["header"]
    if header != exp:
        raise io_csv.HeaderMismatch(f"{ds_id}: 기대 헤더 {exp} / 실제 헤더 {header}")
    prev = io_csv.manifest().get(ds_id, {}).get("rows", 0)
    if len(rows) - 1 < 0.5 * prev:
        raise RuntimeError(f"{ds_id}: 행 수 {len(rows) - 1} < 이전 스냅숏 {prev}의 50%")
    return len(rows) - 1


def refresh(ids=None):
    os.makedirs(os.path.join(config.WORK_DIR, "raw"), exist_ok=True)
    man = io_csv.manifest()
    sources, warnings = {}, []
    for ds_id in ids or config.DATASETS:
        got, via, err = None, None, []
        for name, fn in (("odcloud", odcloud.fetch), ("portal", portal_download)):
            try:
                b = fn(ds_id)
                if b:
                    validate(ds_id, b)
                    got, via = b, name
                    break
            except Exception as e:
                err.append(f"{name}: {scrub(e)}")
            time.sleep(1)
        if got:
            sha = hashlib.sha256(got).hexdigest()
            with open(os.path.join(config.WORK_DIR, "raw", f"{ds_id}.csv"), "wb") as f:
                f.write(got)
            sources[ds_id] = {"via": via, "sha256": sha, "changed": sha != man.get(ds_id, {}).get("sha256"),
                              "fetched_at": config.now_kst().isoformat()}
        else:
            warnings.append(f"portal_fetch_failed:{ds_id}")
            sources[ds_id] = {"via": "snapshot", "errors": err}
        print(ds_id, sources[ds_id].get("via"), sources[ds_id].get("changed", ""), file=sys.stderr)
    with open(os.path.join(config.WORK_DIR, "sources.json"), "w", encoding="utf-8") as f:
        json.dump({"sources": sources, "warnings": warnings}, f, ensure_ascii=False, indent=1)
    return sources, warnings


def promote():
    """work/raw 갱신본 중 바뀐 것을 data/raw 스냅숏으로 옮기고 manifest를 갱신한다."""
    p = os.path.join(config.WORK_DIR, "sources.json")
    src = json.load(open(p, encoding="utf-8"))["sources"]
    mp = os.path.join(config.RAW_DIR, "manifest.json")
    man = json.load(open(mp, encoding="utf-8"))
    by = {x["id"]: x for x in man["files"]}
    changed = []
    for ds_id, s in src.items():
        if s.get("via") in ("portal", "odcloud") and s.get("changed"):
            w = os.path.join(config.WORK_DIR, "raw", f"{ds_id}.csv")
            dst = os.path.join(config.RAW_DIR, ds_id, f"{ds_id}_1.csv")
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.copyfile(w, dst)
            b = open(dst, "rb").read()
            by[ds_id].update({"sha256": s["sha256"], "bytes": len(b), "rows": validate(ds_id, b),
                              "fetched_at": s["fetched_at"], "via": s["via"]})
            changed.append(ds_id)
    with open(mp, "w", encoding="utf-8") as f:
        json.dump(man, f, ensure_ascii=False, indent=1)
    print(" ".join(changed) if changed else "no-change")
    return changed


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--promote", action="store_true")
    ap.add_argument("ids", nargs="*")
    a = ap.parse_args(argv)
    if a.promote:
        promote()
    else:
        refresh(a.ids or None)


if __name__ == "__main__":
    main()
