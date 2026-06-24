#!/usr/bin/env python3
"""Inject the shared header/footer into every page from a single source, so
the nav and footer aren't hand-duplicated across the HTML files.

Edit _partials/header.html or _partials/footer.html, then re-sync:
    python scripts/build_pages.py

The active nav item is set automatically per page. The header/footer regions
in each page (the <header>...</header> and <footer>...</footer> blocks) are
replaced in place.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PARTIALS = ROOT / "_partials"
PAGES = ["index.html", "publications.html", "projects.html", "contact.html", "random.html"]


def main():
    header = PARTIALS.joinpath("header.html").read_text(encoding="utf-8").rstrip("\n")
    footer = PARTIALS.joinpath("footer.html").read_text(encoding="utf-8").rstrip("\n")
    for name in PAGES:
        page = ROOT / name
        s = page.read_text(encoding="utf-8")
        h = header.replace('class="navlink" href="%s"' % name,
                            'class="navlink active" href="%s"' % name)
        s, nh = re.subn(r"[ \t]*<header>.*?</header>", lambda m: h, s, count=1, flags=re.S)
        s, nf = re.subn(r"[ \t]*<footer>.*?</footer>", lambda m: footer, s, count=1, flags=re.S)
        page.write_text(s, encoding="utf-8")
        print(f"{name}: header={'ok' if nh else 'MISSING'} footer={'ok' if nf else 'MISSING'}")


if __name__ == "__main__":
    main()
