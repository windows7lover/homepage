# Damien Scieur — homepage

Source for [damienscieur.com](https://damienscieur.com/). A hand-written **static
site** (HTML/CSS/JS) — no framework, no build system, no Jekyll. GitHub Pages
serves the files as-is (`.nojekyll` is present, `CNAME` sets the custom domain).

## Structure

```
index.html  publications.html  projects.html  contact.html  random.html
404.html  robots.txt  sitemap.xml  favicon.svg  CNAME  .nojekyll
css/style.css            single dark "terminal/sidebar" theme
js/main.js               nav section submenu + scrollspy, mailto, footer year
js/publications.js       renders the publications list (search, compact, BibTeX)
data/publications.json   generated — do not edit by hand
_bibliography/references.bib   the source of truth for publications
scripts/bib2json.py      references.bib -> data/publications.json (+ no-JS fallback)
pdf/   pict/   assets/images/
```

## Adding or editing a publication

1. Edit `_bibliography/references.bib` (standard BibTeX). Useful custom fields:
   - `abstract={...}` — shown behind the **Abstract** toggle.
   - `paperurl={...}` — external link (arXiv, proceedings, etc.).
   - `paperpdf={file.pdf}` — a local PDF in `pdf/papers/`.
   - `venuetype={book|journal|conference|workshop|thesis|preprint|skip}` —
     overrides automatic categorization. `skip` drops the entry (used to merge a
     preprint into its published version).
   - Only entries whose `author` contains "Scieur" are included.
2. Regenerate:
   ```sh
   python scripts/bib2json.py
   ```
   This rewrites `data/publications.json`, the per-entry BibTeX used by the
   "Cite" button, and the no-JS `<noscript>` fallback list inside
   `publications.html`.
3. Commit `references.bib`, `data/publications.json`, and `publications.html`.

## Editing projects / pages

Projects, the bio, News, and Contact are plain HTML — edit the relevant
`*.html` file directly.

The **header nav and footer are shared** (single source in `_partials/`).
Edit `_partials/header.html` or `_partials/footer.html`, then re-sync every
page — the active nav item is set automatically:

```sh
python scripts/build_pages.py
```

## Updating CSS / JS (cache busting)

GitHub Pages and browsers cache `style.css` / the JS for ~10 min, so after
changing them, stamp a fresh version query so visitors get the new files
immediately instead of a stale cached copy:

```sh
python scripts/bump_version.py   # rewrites ?v=<timestamp> on css/js links
```

Commit the changed `*.html` along with your CSS/JS edit.

## Run locally

A static server is needed (the publications list is fetched, so `file://`
won't work):

```sh
python -m http.server 8000
# then open http://localhost:8000
```

## Deployment

GitHub Pages, "Deploy from branch" (root). `.nojekyll` disables Jekyll;
`CNAME` points the site at `damienscieur.com`.
