import glob
import gzip
import json
import os
import re
import unittest

from common import DATA, SITE, ensure_site_data, read
from build import validate

FIRST_SCREEN = ["meta", "profiles", "season", "context", "holidays"]


def gz(path):
    with open(path, "rb") as f:
        return len(gzip.compress(f.read(), 9))


class OutputsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        ensure_site_data()

    def test_schemas(self):
        self.assertEqual(validate.validate_dir(DATA), [])

    def test_built_at(self):
        for p in glob.glob(os.path.join(DATA, "*.json")):
            d = json.loads(read(p))
            self.assertRegex(d["built_at"], r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+09:00$", p)
            self.assertTrue(d["schema"].endswith("/1"))

    def test_budget(self):
        code = [p for p in glob.glob(os.path.join(SITE, "**", "*"), recursive=True)
                if p.endswith((".html", ".css", ".js")) and "/data/" not in p]
        js = sum(gz(p) for p in code if p.endswith(".js"))
        total = sum(gz(p) for p in code)
        self.assertLessEqual(js, 35 * 1024, js)
        self.assertLessEqual(total, 60 * 1024, total)
        first = sum(gz(os.path.join(DATA, f"{n}.json")) for n in FIRST_SCREEN)
        self.assertLessEqual(first, 120 * 1024, first)
        # 지연 로드(시트·사리 패널을 열 때) 데이터도 함께 120KB 안
        lazy = first + gz(os.path.join(DATA, "classes.json")) + gz(os.path.join(DATA, "events.json"))
        self.assertLessEqual(lazy, 160 * 1024, lazy)

    def test_no_secrets(self):
        for name in ("DATA_GO_KR_KEY", "CULTURE_API_KEY"):
            v = os.environ.get(name)
            if not v:
                continue
            for p in glob.glob(os.path.join(SITE, "**", "*"), recursive=True):
                if os.path.isfile(p):
                    self.assertNotIn(v, read(p), p)
        for p in glob.glob(os.path.join(DATA, "*")):
            s = read(p)
            self.assertIsNone(re.search(r"serviceKey=[A-Za-z0-9%]{10,}", s), p)

    def test_no_fake_data_words(self):
        for p in glob.glob(os.path.join(SITE, "**", "*.*"), recursive=True):
            if p.endswith((".js", ".html", ".json")):
                s = read(p)
                for bad in ("정확도", "dummy", "lorem", "simulated", "Math.random", "가상 데이터", "샘플 데이터"):
                    self.assertNotIn(bad, s, (p, bad))


if __name__ == "__main__":
    unittest.main()
