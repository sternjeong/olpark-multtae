import unittest

from common import classes, profiles
from build import model_classes


class WhyStripTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        p = profiles()[0]
        c = classes()[0]
        cls.w = model_classes.why(p, c)
        cls.p, cls.c = p, c

    def test_weekday(self):
        wd = self.w["weekday"]
        self.assertTrue(wd["classes_matter"])
        self.assertEqual(wd["high_k"], 65)          # 10:50
        self.assertEqual(wd["peak_k"], 52)          # 08:40
        self.assertEqual(wd["peak_start"], 540)     # 09:00 시작 강좌
        self.assertAlmostEqual(wd["p_share"], 0.20, delta=0.02)
        self.assertAlmostEqual(wd["peak_share"], 0.21, delta=0.02)
        # 08:40 강좌 기여 ≈ β × 정원/3 (요일 평균), 시트·e04의 36대와 비슷
        self.assertAlmostEqual(wd["peak_class_cars"], self.c["beta"]["value"] * wd["peak_seats"] / 3, delta=1.0)
        self.assertAlmostEqual(wd["peak_class_cars"], 35, delta=3)

    def test_weekend_honest(self):
        for g in ("sat", "sun"):
            x = self.w[g]
            self.assertFalse(x["classes_matter"], g)
            self.assertLess(x["p_share"], model_classes.WHY_MIN_SHARE)
            self.assertAlmostEqual(x["short_share_high_hour"], self.p["short_stop_share"][x["high_k"] * 10 // 60])

    def test_shares_bounded(self):
        for g in ("weekday", "sat", "sun"):
            for k in ("p_share", "peak_share", "top_share"):
                self.assertTrue(0 <= self.w[g][k] <= 1)


if __name__ == "__main__":
    unittest.main()
