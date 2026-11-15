import unittest

from common import ROOT  # noqa: F401
from build import io_csv, normalize as n


class ParsingTest(unittest.TestCase):
    def test_cp949_read(self):
        h, rows = io_csv.load("15138735")
        self.assertEqual(h, ["입차일", "입차일시", "출차일시"])
        self.assertEqual(len(rows), 215528)

    def test_days(self):
        self.assertEqual(n.parse_days("월,화,수,목,금,(토)"), {0, 1, 2, 3, 4})
        self.assertEqual(n.parse_days("화,목"), {1, 3})
        self.assertEqual(n.parse_days("토,일(방)"), {5, 6})
        self.assertEqual(n.parse_days(""), set())

    def test_time(self):
        self.assertEqual(n.parse_time_range("11:20~12:50"), (680, 770))
        self.assertEqual(n.parse_time_range("18:00-19:30"), (1080, 1170))
        self.assertIsNone(n.parse_time_range("미정"))

    def test_range(self):
        a, b = n.parse_range_str("2026-01-01~9999-12-31")
        self.assertEqual((a.isoformat(), b.year), ("2026-01-01", 9999))

    def test_poster_times(self):
        cases = {
            "2008-12-13(토) 7:00 / 2008-12-14(일) 6:00": [("2008-12-13", "19:00"), ("2008-12-14", "18:00")],
            "2016-03-13(금) 오후 6시": [("2016-03-13", "18:00")],
            "2012.05.26 PM 7:30": [("2012-05-26", "19:30")],
            "2015-10-24 (토) 18:00": [("2015-10-24", "18:00")],
            "2011-10-27(금) 20:00": [("2011-10-27", "20:00")],
            "2010-02-30(화) 7:00": [],   # 없는 날짜는 버린다
        }
        for s, exp in cases.items():
            got = [(d.isoformat(), t) for d, t in n.parse_poster_times(s)]
            self.assertEqual(got, exp, s)

    def test_lawn(self):
        self.assertEqual(n.parse_lawn("06-01 ~ 10-31"), ("06-01", "10-31", False))
        self.assertEqual(n.parse_lawn("11-01 ~ 익년05-31"), ("11-01", "05-31", True))
        self.assertIsNone(n.parse_lawn("연중 상시개방"))


if __name__ == "__main__":
    unittest.main()
