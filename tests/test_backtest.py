import unittest

from common import BUILT, classes, profiles
from build import backtest


class BacktestTest(unittest.TestCase):
    def test_order(self):
        _, pk, ev = profiles()
        _, checks, _ = classes()
        bt = backtest.build(pk, ev, checks, BUILT)
        m = bt["methods"]
        self.assertLess(m["group"]["mae60"], m["single"]["mae60"])
        self.assertLess(m["single"]["mae60"], m["flat"]["mae60"])
        self.assertLessEqual(m["group"]["mae60"], 40)
        self.assertEqual(m["group"]["peak_hour_match"], [8, 10])


if __name__ == "__main__":
    unittest.main()
