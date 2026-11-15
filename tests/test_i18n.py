import json
import os
import re
import unittest

from common import SITE, read

JS = os.path.join(SITE, "assets", "js")


def ko_dict():
    m = re.search(r"/\*I18N-KO\*/(.*?)/\*/I18N-KO\*/", read(os.path.join(JS, "app.js")), re.S)
    return json.loads(m.group(1))


class I18nTest(unittest.TestCase):
    def test_same_keys(self):
        ko = ko_dict()
        en = json.loads(read(os.path.join(SITE, "assets", "i18n", "en.json")))
        self.assertEqual(set(ko) - set(en), set(), "en.json에 없는 키")
        self.assertEqual(set(en) - set(ko), set(), "KO 사전에 없는 키")
        for k, v in en.items():
            self.assertTrue(v.strip(), k)
            ph_en = set(re.findall(r"\{(\w+)\}", v))
            ph_ko = set(re.findall(r"\{(\w+)\}", ko[k]))
            self.assertLessEqual(ph_en, ph_ko, k)

    def test_used_keys_exist(self):
        ko = ko_dict()
        src = "".join(read(os.path.join(JS, f)) for f in ("app.js", "views/week.js", "views/livepage.js", "views/extras.js"))
        used = set(re.findall(r"\bt\('([a-z]+\.[A-Za-z0-9]+)'", src))
        self.assertTrue(len(used) > 100)
        self.assertEqual(used - set(ko), set())

    def test_no_hangul_in_en(self):
        en = json.loads(read(os.path.join(SITE, "assets", "i18n", "en.json")))
        for k, v in en.items():
            self.assertIsNone(re.search(r"[가-힣]", v), k)


if __name__ == "__main__":
    unittest.main()
