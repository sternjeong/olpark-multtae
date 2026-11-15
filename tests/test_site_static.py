import glob
import os
import re
import unittest

from common import SITE, read

ALLOWED_FETCH_HOSTS = {"www.ksponco.or.kr"}


def files(ext):
    return [p for p in glob.glob(os.path.join(SITE, "**", f"*.{ext}"), recursive=True) if "/data/" not in p]


class SiteStaticTest(unittest.TestCase):
    def test_relative_paths(self):
        bad = re.compile(r"""(src="/|href="/|url\(/|fetch\(['"`]/|import\(['"`]/|from ['"]/)""")
        for p in files("html") + files("js") + files("css"):
            self.assertIsNone(bad.search(read(p)), p)

    def test_no_external_runtime(self):
        for p in files("html") + files("css"):
            s = read(p)
            self.assertNotRegex(s, r'<script[^>]+src="https?://', p)
            self.assertNotRegex(s, r'<link[^>]+href="https?://', p)
            self.assertNotRegex(s, r"@import|url\(https?:", p)
        for p in files("js"):
            s = read(p)
            self.assertNotRegex(s, r"""import\s*\(?\s*['"]https?://""", p)
            self.assertNotRegex(s, r"""fetch\(\s*['"`]https?://""", p)  # 실시간 API는 meta.live_api 값으로만 호출
        meta = read(os.path.join(SITE, "data", "meta.json"))
        m = re.search(r'"live_api":"https://([^/"]+)/', meta)
        self.assertIn(m.group(1), ALLOWED_FETCH_HOSTS)

    def test_html_basics(self):
        for p in files("html"):
            s = read(p)
            self.assertIn('<html lang="ko">', s, p)
            self.assertRegex(s, r"<title>[^<]+</title>", p)
            self.assertIn('name="viewport"', s, p)

    def test_404(self):
        s = read(os.path.join(SITE, "404.html"))
        self.assertIn('href="./#/"', s)
        self.assertIn("location.replace", s)


if __name__ == "__main__":
    unittest.main()
