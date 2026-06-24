#!/usr/bin/env python3
"""Convert _bibliography/references.bib into data/publications.json.

This is the single source of truth for the Publications page. To add a paper,
edit references.bib and re-run:  python scripts/bib2json.py

No Google Scholar, no Jekyll, no plugins involved -- the abstract and all
metadata live in the .bib file and are rendered client-side by js/publications.js.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BIB = ROOT / "_bibliography" / "references.bib"
OUT = ROOT / "data" / "publications.json"

# Only show papers (co)authored by Damien Scieur.
AUTHOR_FILTER = "scieur"

# LaTeX accent tables, used by a regex pass so all of \'e, {\'e}, {\"\i}, \'i,
# etc. render correctly as plain text.
_ACCENTS = {
    "'": {"a": "á", "e": "é", "i": "í", "o": "ó", "u": "ú", "y": "ý", "c": "ć",
          "n": "ń", "s": "ś", "z": "ź", "A": "Á", "E": "É", "I": "Í", "O": "Ó", "U": "Ú"},
    '"': {"a": "ä", "e": "ë", "i": "ï", "o": "ö", "u": "ü", "y": "ÿ",
          "A": "Ä", "E": "Ë", "I": "Ï", "O": "Ö", "U": "Ü"},
    "^": {"a": "â", "e": "ê", "i": "î", "o": "ô", "u": "û", "A": "Â", "E": "Ê", "O": "Ô"},
    "`": {"a": "à", "e": "è", "i": "ì", "o": "ò", "u": "ù", "A": "À", "E": "È"},
    "~": {"a": "ã", "o": "õ", "n": "ñ", "A": "Ã", "O": "Õ", "N": "Ñ"},
}
# \'e | {\'e} | {\"\i} | \'{e} | \'\i ... -> accented letter (\i/\j become i/j).
_ACCENT_RE = re.compile(r"\{?\\(['\"^`~])\s*\{?(\\[ij]|[A-Za-z])\}?\}?")
_OTHER = {r"\c c": "ç", r"\c{c}": "ç", r"{\ss}": "ß", r"\&": "&",
          r"\'": "'", "’": "'", "–": "-", "—": "-"}


def _accents(m):
    acc, letter = m.group(1), m.group(2)
    if letter in ("\\i", "\\j"):
        letter = letter[1]
    return _ACCENTS.get(acc, {}).get(letter, m.group(0))


def clean(text: str) -> str:
    text = text.strip()
    text = _ACCENT_RE.sub(_accents, text)
    for k, v in _OTHER.items():
        text = text.replace(k, v)
    # strip any leftover single braces, collapse whitespace
    text = text.replace("{", "").replace("}", "")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def parse_entries(raw: str):
    """Yield (entry_type, key, {field: value}) tuples from BibTeX text."""
    i = 0
    n = len(raw)
    while True:
        at = raw.find("@", i)
        if at == -1:
            return
        # entry type
        brace = raw.find("{", at)
        etype = raw[at + 1:brace].strip().lower()
        if etype not in {
            "article", "inproceedings", "book", "phdthesis",
            "mastersthesis", "incollection", "misc", "techreport",
        }:
            i = at + 1
            continue
        # scan brace-balanced body
        depth = 0
        j = brace
        while j < n:
            if raw[j] == "{":
                depth += 1
            elif raw[j] == "}":
                depth -= 1
                if depth == 0:
                    break
            j += 1
        body = raw[brace + 1:j]
        i = j + 1
        # first comma separates key from fields
        comma = body.find(",")
        key = body[:comma].strip()
        fields = parse_fields(body[comma + 1:])
        yield etype, key, fields


def parse_fields(text: str):
    """Parse `name = {value}` / `name = "value"` / `name = value` pairs."""
    fields = {}
    i = 0
    n = len(text)
    while i < n:
        eq = text.find("=", i)
        if eq == -1:
            break
        name = text[i:eq].strip().strip(",").strip().lower()
        # find start of value
        k = eq + 1
        while k < n and text[k] in " \t\r\n":
            k += 1
        if k >= n:
            break
        if text[k] == "{":
            depth = 0
            start = k + 1
            while k < n:
                if text[k] == "{":
                    depth += 1
                elif text[k] == "}":
                    depth -= 1
                    if depth == 0:
                        break
                k += 1
            value = text[start:k]
            i = k + 1
        elif text[k] == '"':
            start = k + 1
            k += 1
            while k < n and text[k] != '"':
                k += 1
            value = text[start:k]
            i = k + 1
        else:
            end = k
            while end < n and text[end] not in ",\n":
                end += 1
            value = text[k:end]
            i = end + 1
        if name:
            fields[name] = value.strip()
    return fields


def format_authors(raw: str) -> str:
    out = []
    for name in raw.split(" and "):
        name = name.strip()
        if name.lower() == "others":
            out.append("et al.")
            continue
        if "," in name:
            last, first = name.split(",", 1)
            name = f"{first.strip()} {last.strip()}"
        out.append(clean(name))
    return ", ".join(out)


VENUE_FIELDS = ["journal", "booktitle", "school", "publisher"]


def venue_of(fields):
    for f in VENUE_FIELDS:
        if fields.get(f):
            return clean(fields[f])
    return ""


# Display grouping. Lower order = shown first.
GROUPS = {
    "book": ("Books & Monographs", 0),
    "journal": ("Journal Articles", 1),
    "conference": ("Conference Papers (peer-reviewed)", 2),
    "workshop": ("Workshop Papers", 3),
    "thesis": ("Theses", 4),
    "preprint": ("Preprints (arXiv)", 5),
}


def categorize(etype, fields):
    """Return a category key, honoring an explicit `venuetype` field first.

    `venuetype=skip` drops the entry entirely (used to merge a preprint into its
    published version). Otherwise we infer from the BibTeX entry type / venue.
    """
    explicit = fields.get("venuetype", "").strip().lower()
    if explicit:
        return explicit  # book|journal|conference|workshop|thesis|preprint|skip
    if etype == "book":
        return "book"
    if etype in ("phdthesis", "mastersthesis"):
        return "thesis"
    if fields.get("journal", "").strip().lower().startswith("arxiv"):
        return "preprint"
    booktitle = fields.get("booktitle", "").lower()
    if "workshop" in booktitle:
        return "workshop"
    if etype == "article":
        return "journal"
    return "conference"


BIBTEX_SKIP = {"abstract", "paperpdf", "venuetype", "paperurl"}
BIBTEX_ORDER = ["author", "title", "booktitle", "journal", "school", "publisher",
                "volume", "number", "pages", "year", "month", "organization"]


def build_bibtex(etype, key, fields):
    """Reconstruct a clean BibTeX entry for the per-paper 'Cite' button."""
    ordered = [k for k in BIBTEX_ORDER if k in fields and k not in BIBTEX_SKIP]
    rest = [k for k in fields if k not in BIBTEX_ORDER and k not in BIBTEX_SKIP]
    body = []
    for k in ordered + rest:
        v = fields.get(k, "").strip()
        if v:
            body.append("  %s = {%s}" % (k, v))
    return "@%s{%s,\n%s\n}" % (etype, key, ",\n".join(body))


def build_noscript(pubs):
    """Static, no-JS HTML list of publications (SEO + graceful fallback)."""
    from html import escape
    groups, seen = [], {}
    for p in pubs:
        g = seen.get(p["group"])
        if g is None:
            g = {"name": p["group"], "items": []}
            seen[p["group"]] = g
            groups.append(g)
        g["items"].append(p)

    parts = ['<p>Full interactive list (search, compact view, abstracts) requires '
             'JavaScript. See also my '
             '<a href="https://scholar.google.com/citations?user=hNscQzgAAAAJ&hl=en">Google Scholar</a>.</p>']
    for g in groups:
        parts.append("<h2>%s</h2>" % escape(g["name"]))
        parts.append("<ul>")
        for p in g["items"]:
            link = p["url"] or p["pdf"]
            title = escape(p["title"])
            if link:
                title = '<a href="%s">%s</a>' % (escape(link), title)
            venue = ", ".join(x for x in [p["venue"], p["year"]] if x)
            tail = (" — " + escape(venue)) if venue else ""
            parts.append("<li>%s — %s%s</li>" % (title, escape(p["authors"]), tail))
        parts.append("</ul>")
    return "\n".join(parts)


def inject_noscript(pubs):
    page_path = ROOT / "publications.html"
    if not page_path.exists():
        return
    page = page_path.read_text(encoding="utf-8")
    start, end = "<!--PUBS_NOSCRIPT_START-->", "<!--PUBS_NOSCRIPT_END-->"
    if start in page and end in page:
        pre = page.split(start)[0]
        post = page.split(end)[1]
        page = pre + start + "\n" + build_noscript(pubs) + "\n" + end + post
        page_path.write_text(page, encoding="utf-8")
        print("Updated publications.html no-JS fallback")


def main():
    raw = BIB.read_text(encoding="utf-8")
    pubs = []
    for etype, key, fields in parse_entries(raw):
        authors_raw = fields.get("author", "")
        if AUTHOR_FILTER not in authors_raw.lower():
            continue
        category = categorize(etype, fields)
        if category == "skip":
            continue
        is_arxiv = category == "preprint"
        group_name, order = GROUPS.get(category, ("Other", 9))

        pdf = fields.get("paperpdf", "").strip()
        pub = {
            "key": key,
            "title": clean(fields.get("title", "")),
            "authors": format_authors(authors_raw),
            "venue": "" if is_arxiv else venue_of(fields),
            "year": clean(fields.get("year", "")),
            "abstract": clean(fields.get("abstract", "")),
            "url": fields.get("paperurl", "").strip(),
            "pdf": f"pdf/papers/{pdf}" if pdf else "",
            "group": group_name,
            "order": order,
            "bibtex": build_bibtex(etype, key, fields),
        }
        pubs.append(pub)

    # Sort: group order, then year descending, then title.
    pubs.sort(key=lambda p: (p["order"], -int(p["year"] or 0), p["title"].lower()))

    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(pubs, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(pubs)} publications to {OUT.relative_to(ROOT)}")
    inject_noscript(pubs)


if __name__ == "__main__":
    main()
