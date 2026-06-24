#!/usr/bin/env python3
"""Cache-busting: stamp a fresh ?v=<timestamp> on every local CSS/JS asset
reference in the HTML pages, so browsers fetch the new file after a deploy
instead of serving a stale cached copy.

Run after changing css/ or js/, before committing:
    python scripts/bump_version.py
"""
import glob
import re
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VERSION = time.strftime("%Y%m%d%H%M")

# href="css/..." / src="js/..." with an optional existing ?v=...
PATTERN = re.compile(r'((?:href|src)="(?:css|js)/[^"?]+\.(?:css|js))(?:\?v=[^"]*)?"')


def main():
    changed = 0
    for path in glob.glob(str(ROOT / "*.html")):
        s = Path(path).read_text(encoding="utf-8")
        new = PATTERN.sub(lambda m: m.group(1) + "?v=" + VERSION + '"', s)
        if new != s:
            Path(path).write_text(new, encoding="utf-8")
            changed += 1
            print("versioned", Path(path).name)
    print(f"asset version = {VERSION} ({changed} files)")


if __name__ == "__main__":
    main()
