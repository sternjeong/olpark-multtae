import datetime as dt
import os
import tempfile
import unittest

from common import ROOT  # noqa: F401
from build import config, live


class FakeResp:
    def __init__(self, body):
        self.body = body.encode()

    def read(self):
        return self.body

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


class LiveTest(unittest.TestCase):
    def test_classify(self):
        self.assertEqual(live.classify('[{"parking_sum":1855}]'), ("ok", 1855))
        self.assertEqual(live.classify('{"error":"점검"}')[0], "maintenance")
        self.assertEqual(live.classify('[{"parking_sum":0}]')[0], "error")
        self.assertEqual(live.classify('[{"parking_sum":12000}]')[0], "error")
        self.assertEqual(live.classify("<html>")[0], "error")

    def test_collect_and_build(self):
        with tempfile.TemporaryDirectory() as d:
            arc, out = os.path.join(d, "live"), os.path.join(d, "out")
            base = dt.datetime(2026, 11, 1, 10, 7, tzinfo=config.KST)
            for i, v in enumerate([1500, 1600, 1700]):
                t = base + dt.timedelta(days=7 * i)
                live.collect(arc, now=t, opener=lambda req, timeout: FakeResp(f'[{{"parking_sum":{v}}}]'))
            live.collect(arc, now=base + dt.timedelta(days=14, minutes=3),
                         opener=lambda req, timeout: FakeResp('[{"parking_sum":1750}]'))  # 같은 슬롯 덮어쓰기
            live.collect(arc, now=base + dt.timedelta(days=14, minutes=30), opener=lambda req, timeout: (_ for _ in ()).throw(OSError("x")))
            lv = live.build(arc, out, "2026-11-15T10:00:00+09:00", today=dt.date(2026, 11, 15))
            key = f"{base.weekday()}-{(10 * 60) // 15}"
            self.assertEqual(lv["slots"][key], {"median": 1600, "n": 3})
            self.assertEqual(lv["n_records"], 4)
            self.assertAlmostEqual(lv["missing_rate"], 0.25)
            self.assertFalse(lv["nowcast"]["enabled"])
            self.assertTrue(os.path.exists(os.path.join(out, "live_archive.csv")))

    def test_empty(self):
        with tempfile.TemporaryDirectory() as d:
            lv = live.build(os.path.join(d, "none"), d, "2026-11-15T10:00:00+09:00", today=dt.date(2026, 11, 15))
            self.assertEqual((lv["days"], lv["readings"]), (0, []))


if __name__ == "__main__":
    unittest.main()
