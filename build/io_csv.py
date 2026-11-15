"""CP949 CSV 읽기와 원천 경로 결정(갱신본 work/raw 우선, 없으면 커밋된 스냅숏)."""
import csv
import hashlib
import io
import json
import os

from . import config


class HeaderMismatch(Exception):
    pass


def raw_path(ds_id):
    work = os.path.join(config.WORK_DIR, "raw", f"{ds_id}.csv")
    if os.path.exists(work):
        return work
    return os.path.join(config.RAW_DIR, ds_id, f"{ds_id}_1.csv")


def read_bytes(ds_id):
    with open(raw_path(ds_id), "rb") as f:
        return f.read()


def decode(b):
    return b.decode("cp949")


def parse_rows(text):
    return list(csv.reader(io.StringIO(text)))


def load(ds_id, check_header=True):
    """(header, rows) — 헤더가 레지스트리와 다르면 HeaderMismatch."""
    rows = parse_rows(decode(read_bytes(ds_id)))
    header, body = rows[0], rows[1:]
    header = [h.strip().lstrip("﻿") for h in header]
    expected = config.DATASETS.get(ds_id, {}).get("header")
    if check_header and expected and header != expected:
        raise HeaderMismatch(f"{ds_id}: 기대 헤더 {expected} / 실제 헤더 {header}")
    return header, body


def sha256(ds_id):
    return hashlib.sha256(read_bytes(ds_id)).hexdigest()


def manifest():
    p = os.path.join(config.RAW_DIR, "manifest.json")
    with open(p, encoding="utf-8") as f:
        return {x["id"]: x for x in json.load(f)["files"]}


def load_static(name):
    with open(os.path.join(config.STATIC_DIR, name), encoding="utf-8") as f:
        return json.load(f)
