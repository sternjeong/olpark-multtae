import unittest

from common import REF, classes, profiles, season
from build import quality


class QualityTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        p, _, _ = profiles()
        c, _, _ = classes()
        cls.q = quality.build(REF, p, c, season(), None, "2026-11-15T00:00:00+09:00")
        cls.by = {x["id"]: x for x in cls.q["checks"]}

    def test_twelve(self):
        self.assertEqual([x["id"] for x in self.q["checks"]], [f"Q{i:02d}" for i in range(1, 13)])
        for x in self.q["checks"]:
            for k in ("example", "impact", "fix", "benefit", "repro"):
                self.assertTrue(x[k], (x["id"], k))

    def test_numbers(self):
        self.assertEqual((self.by["Q01"]["metric"]["found"], self.by["Q01"]["metric"]["total"]), (699, 699))
        self.assertEqual(self.by["Q02"]["metric"]["found"], 20)
        self.assertEqual(self.by["Q03"]["metric"]["found"], 16)
        self.assertEqual(self.by["Q04"]["metric"]["latest"], "2026-10-17")
        self.assertAlmostEqual(self.by["Q05"]["metric"]["ratio"], 3.60, delta=0.01)
        self.assertEqual((self.by["Q06"]["metric"]["found"], self.by["Q06"]["metric"]["total"]), (12, 255))
        self.assertEqual(self.by["Q07"]["metric"]["found"], 659)
        self.assertGreaterEqual(self.by["Q08"]["metric"]["found"], 4)
        self.assertEqual(self.by["Q09"]["metric"]["duplicates"], 1)
        self.assertEqual((self.by["Q10"]["metric"]["found"], self.by["Q10"]["metric"]["total"]), (9, 13))
        self.assertEqual((self.by["Q12"]["metric"]["found"], self.by["Q12"]["metric"]["total"]), (42, 58))

    def test_status_logic(self):
        self.assertTrue(all(x["status"] == "open" for x in self.q["checks"]))

    def test_insights(self):
        self.assertEqual(len(self.q["insights"]), 5)
        self.assertEqual(list(self.q["zones"]["full_counts"])[:3], ["P6", "P5", "P4"])

    def test_tone(self):
        # 존중하는 어조: 비난성 낱말을 쓰지 않는다
        import json
        s = json.dumps(self.q, ensure_ascii=False)
        for bad in ("엉망", "황당", "최악", "형편없", "무능", "어이없"):
            self.assertNotIn(bad, s)


if __name__ == "__main__":
    unittest.main()
