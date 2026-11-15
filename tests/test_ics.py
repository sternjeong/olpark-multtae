import datetime as dt
import unittest

from common import profiles
from build import ics


class IcsTest(unittest.TestCase):
    def test_rules(self):
        ov = profiles()[0]["event_overlay"]["sat"]
        s = ics.build(dt.date(2026, 11, 21), 18 * 60, ov, "https://sternjeong.github.io/olpark-multtae/")
        self.assertTrue(s.endswith("\r\n"))
        self.assertNotIn("\n", s.replace("\r\n", ""))
        for line in s.split("\r\n"):
            self.assertLessEqual(len(line.encode("utf-8")), 75, line)
        self.assertIn("BEGIN:VTIMEZONE\r\nTZID:Asia/Seoul", s)
        self.assertIn("TZOFFSETTO:+0900", s)
        # 18:00 공연, 입차 몰림 -1:40 → 16:20, 20분 전 = 16:00 시작
        self.assertIn("DTSTART;TZID=Asia/Seoul:20261121T160000", s)
        # 썰물 +4:00 → 22:00
        self.assertIn("DTSTART;TZID=Asia/Seoul:20261121T220000", s)
        self.assertEqual(s.count("BEGIN:VEVENT"), 2)

    def test_midnight_rollover(self):
        ov = profiles()[0]["event_overlay"]["sat"]
        s = ics.build(dt.date(2026, 11, 21), 21 * 60, ov, "https://x/")
        self.assertIn("DTSTART;TZID=Asia/Seoul:20261122T010000", s)

    def test_fold(self):
        f = ics.fold("DESCRIPTION:" + "가" * 60)
        self.assertTrue(all(len(x.encode()) <= 75 for x in f.split("\r\n")))
        self.assertEqual(f.replace("\r\n ", ""), "DESCRIPTION:" + "가" * 60)


if __name__ == "__main__":
    unittest.main()
