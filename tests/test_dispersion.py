import unittest

from common import BUILT, profiles
from build import dispersion, quality, tide


class DaytimeTest(unittest.TestCase):
    def test_weekday_windows(self):
        p = profiles()[0]
        pk_k, peak, wins = tide.daytime_quiet(p["groups"]["weekday"]["occ"])
        self.assertEqual(pk_k, 65)  # 10:50
        self.assertEqual([k for k, _, _ in wins], [76, 102])  # 12:40, 17:00
        self.assertAlmostEqual(wins[1][2], 0.44, delta=0.01)
        for g in ("weekday", "sat", "sun"):
            _, _, w = tide.daytime_quiet(p["groups"][g]["occ"])
            self.assertTrue(1 <= len(w) <= 2)
            for k, m, r in w:
                self.assertTrue(60 <= k <= 102)
                self.assertTrue(r > 0)
            if len(w) == 2:
                self.assertGreaterEqual(abs(w[0][0] - w[1][0]), tide.DAY_WIN)
                self.assertGreaterEqual(min(r for _, _, r in w), tide.DAY_MIN_RED)


class DispersionTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        p, pk, ev = profiles()
        cls.d = dispersion.build(pk, p, ev)

    def test_day_shift(self):
        w = self.d["day_shift"]["weekday"]
        self.assertEqual(w["p_bins"], [59, 65])
        self.assertEqual(w["q_start_k"], 102)
        self.assertEqual(w["n_days"], 21)
        rows = w["rows"]
        self.assertEqual([r["f"] for r in rows], [0.1, 0.2, 0.3, 0.4, 0.5])
        for r in rows:
            lo, med, hi = r["occ_peak_red_pct"]
            self.assertTrue(lo <= med <= hi)
            self.assertAlmostEqual(r["arr_peak_red_pct"][1], r["f"], delta=0.02)  # P 구간 최대 입차는 f만큼 준다
        meds = [r["moved_cars"][1] for r in rows]
        self.assertEqual(meds, sorted(meds))

    def test_queue_analytic(self):
        M, c = 739, 26.8
        w, clear = dispersion.queue_wait(M, c, 0.0)
        self.assertAlmostEqual(w, M * M / (2 * c), delta=0.05 * M * M / (2 * c))
        self.assertIn(clear, (27, 28))  # 739 / 26.8 = 27.6분
        prev = w
        for f in (0.1, 0.3, 0.5):
            w2, _ = dispersion.queue_wait(M, c, f, 60)
            self.assertLess(w2, prev)
            prev = w2
        self.assertAlmostEqual(dispersion.queue_wait(100, 200, 0.0)[0], 0.0)

    def test_queue_params_from_data(self):
        q = self.d["exit_queue"]
        self.assertEqual([(p["M"], p["c10"]) for p in q["params"]], [(739, 268), (744, 262)])


class ResolvedTrackingTest(unittest.TestCase):
    def test_flip(self):
        import datetime as dt
        prev = {"checks": [{"id": "Q01", "status": "open", "open_since": "2026-11-15", "resolved_at": None},
                           {"id": "Q02", "status": "resolved", "resolved_at": "2026-12-01", "open_since": "2026-11-15"}]}
        now = [{"id": "Q01", "status": "resolved"}, {"id": "Q02", "status": "resolved"}, {"id": "Q03", "status": "open"}]
        quality.track_status(now, prev, dt.date(2027, 1, 5))
        self.assertEqual(now[0]["resolved_at"], "2027-01-05")
        self.assertEqual(now[1]["resolved_at"], "2026-12-01")
        self.assertIsNone(now[2]["resolved_at"])
        self.assertEqual(now[2]["open_since"], "2027-01-05")


if __name__ == "__main__":
    unittest.main()
