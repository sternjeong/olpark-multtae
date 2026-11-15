import unittest

from common import profiles
from build import tide


def hm(k):
    return k * 10


class ProfilesTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.p, cls.pk, cls.ev = profiles()

    def test_conservation(self):
        c = self.p["checks"]
        self.assertEqual(c["arr_in_month"] - c["dep_in_month"], c["end_occ"])
        self.assertEqual(self.pk.occ[-1], c["end_occ"])

    def test_lengths(self):
        for g in ("weekday", "sat", "sun"):
            for k in ("arr", "dep", "occ", "occ_lo", "occ_hi"):
                self.assertEqual(len(self.p["groups"][g][k]), 144)
        for g in ("sat", "sun"):
            for k in ("d_arr", "d_dep", "d_occ"):
                self.assertEqual(len(self.p["event_overlay"][g][k]), 144)

    def test_event_days(self):
        self.assertEqual(self.p["basis"]["event_days"], ["2024-07-12", "2024-07-20", "2024-07-21"])
        r = {d["date"]: d["ratio"] for d in self.p["event_detection"]["days"]}
        self.assertAlmostEqual(r["2024-07-20"], 2.69, places=2)

    def test_group_sizes(self):
        g = self.p["groups"]
        self.assertEqual((g["weekday"]["n_days"], g["weekday"]["n_days_occ"]), (22, 21))
        self.assertEqual((g["sat"]["n_days"], g["sun"]["n_days"]), (3, 3))

    def test_weekday_peak(self):
        occ = self.p["groups"]["weekday"]["occ"]
        k = max(range(144), key=lambda i: occ[i])
        self.assertTrue(640 <= hm(k) <= 660, k)
        self.assertEqual(self.p["groups"]["weekday"]["raw_median_peak"], {"occ": 990.0, "time": "10:50"})
        his = tide.high_tides(occ)
        top = max(his, key=lambda i: occ[i])
        self.assertTrue(640 <= hm(top) <= 660)

    def test_july_profile_identity(self):
        # F01 ⑤: 7월 지수 1.00 → 예보 = 프로파일 원값
        from common import season
        self.assertEqual(season()["index"]["7"], 1.0)

    def test_tref_and_offsets(self):
        ov = self.p["event_overlay"]
        self.assertEqual(ov["sat"]["ref_start"], "18:00")
        self.assertEqual(ov["sun"]["ref_start"], "17:00")
        exp = {"sat": {"rush_start": -100, "rush_end": -10, "exit_peak": 200, "clear": 240},
               "sun": {"rush_start": -80, "rush_end": -10, "exit_peak": 210, "clear": 240}}
        for g, e in exp.items():
            for k, v in e.items():
                self.assertLessEqual(abs(ov[g]["offsets_min"][k] - v), 10, (g, k))
        self.assertEqual(ov["sat"]["exit_max_30min"], 739)
        self.assertEqual(ov["sat"]["exit_peak_10min"], 268)

    def test_short_stop(self):
        s = self.p["short_stop_share"]
        self.assertAlmostEqual(s[21], 0.50, delta=0.01)
        self.assertAlmostEqual(s[8], 0.34, delta=0.01)
        self.assertAlmostEqual(self.p["dwell_hist"]["short_share"], 0.307, delta=0.001)

    def test_tide_rules_match(self):
        r = self.p["tide_rules"]
        self.assertEqual((r["hi"], r["low"], r["arr"]), (list(tide.HI_RANGE), list(tide.LOW_RANGE), list(tide.ARR_RANGE)))
        self.assertEqual((r["win"], r["prom"], r["low_occ"], r["low_min"]),
                         (tide.WIN, tide.PROM_FRAC, tide.LOW_OCC_FRAC, tide.LOW_MIN_BINS))

    def test_low_window_rule(self):
        g = self.p["groups"]["weekday"]
        for a, b in tide.low_windows(g["occ"], g["arr"]):
            self.assertGreaterEqual(b - a, 3)


if __name__ == "__main__":
    unittest.main()
