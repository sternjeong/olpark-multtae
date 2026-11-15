import unittest

from common import season


class SeasonTest(unittest.TestCase):
    def test_index(self):
        s = season()
        self.assertEqual(s["index"]["7"], 1.0)
        self.assertAlmostEqual(s["index"]["5"], 1.53, delta=0.01)
        self.assertAlmostEqual(s["index"]["10"], 1.56, delta=0.01)
        self.assertEqual(s["years"], [2023, 2024, 2025])

    def test_high_cv(self):
        s = season()
        self.assertIn(10, s["high_cv_months"])
        self.assertIn(11, s["high_cv_months"])


if __name__ == "__main__":
    unittest.main()
