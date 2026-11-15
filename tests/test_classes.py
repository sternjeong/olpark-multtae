import unittest

from common import classes
from build import model_classes


class ClassesTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.c, cls.checks, cls.fit = classes()

    def test_beta(self):
        b = self.c["beta"]
        self.assertTrue(0.090 <= b["value"] <= 0.110, b)
        self.assertEqual(b["n"], 510)
        self.assertAlmostEqual(b["se"], 0.028, delta=0.002)

    def test_zombies_and_current(self):
        self.assertEqual(self.c["zombie_excluded"], 659)
        self.assertLessEqual(abs(self.c["count_on_ref"] - 968), 5)

    def test_dawn(self):
        d = self.checks["dawn_check"]
        self.assertTrue(260 <= d["predicted"] <= 285, d)
        self.assertEqual(d["observed"], 263)
        self.assertEqual(d["n_days"], 22)

    def test_lab(self):
        r = model_classes.lab_compute(self.c["lab"], self.c["beta"]["value"], 540, 0.5, 20)
        self.assertEqual(round(r["before"]), 169)
        self.assertEqual(round(r["after"]), 151)
        self.assertAlmostEqual(r["change"], -0.106, delta=0.0025)

    def test_class_ids(self):
        self.assertTrue(all(x["id"][:2] in ("S-", "C-") for x in self.c["classes"]))


if __name__ == "__main__":
    unittest.main()
