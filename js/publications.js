// Render the publications page from data/publications.json.
// Source of truth is _bibliography/references.bib -> scripts/bib2json.py.

(function () {
  var ME = 'Damien Scieur';
  var container = document.getElementById('publications');
  if (!container) return;

  function esc(s) {
    return (s || '').replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function highlightMe(authors) { return esc(authors).replace(ME, '<span class="me">' + ME + '</span>'); }
  function shortAuthors(authors) {
    var parts = (authors || '').split(', ');
    return parts.length <= 1 ? esc(authors) : esc(parts[0]) + ' et al.';
  }

  // Copy with clipboard API + a textarea fallback (works on non-secure
  // contexts and old browsers), with feedback on the button.
  function copyText(text, btn) {
    function feedback(ok) {
      if (!btn) return;
      btn.textContent = ok ? 'Copied!' : 'Copy failed';
      setTimeout(function () { btn.textContent = 'Copy'; }, 1300);
    }
    function fallback() {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        feedback(ok);
      } catch (e) { feedback(false); }
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { feedback(true); }, fallback);
    } else {
      fallback();
    }
  }

  // Levenshtein distance <= 1 (for light typo tolerance on longer tokens).
  function within1(a, b) {
    if (a === b) return true;
    var la = a.length, lb = b.length;
    if (Math.abs(la - lb) > 1) return false;
    if (la > lb) { var t = a; a = b; b = t; var tl = la; la = lb; lb = tl; }
    var i = 0, j = 0, diff = 0;
    while (i < la && j < lb) {
      if (a[i] === b[j]) { i++; j++; }
      else { if (++diff > 1) return false; if (la === lb) { i++; j++; } else { j++; } }
    }
    if (j < lb || i < la) diff++;
    return diff <= 1;
  }
  // A token matches if it is a substring of the record, or (only for
  // tokens of length >= 5) within one typo of some word. Not permissive.
  function matchToken(token, hay, words) {
    if (hay.indexOf(token) !== -1) return true;
    if (token.length >= 5) {
      for (var w = 0; w < words.length; w++) if (within1(token, words[w])) return true;
    }
    return false;
  }

  function renderItem(p) {
    var venue = [p.venue, p.year].filter(Boolean).join(', ');
    var hay = (p.title + ' ' + p.authors + ' ' + p.venue + ' ' + p.year).toLowerCase();

    var links = '';
    if (p.url) links += '<a href="' + esc(p.url) + '" target="_blank" rel="noopener">arXiv / link</a>';
    if (p.pdf) links += '<a href="' + esc(p.pdf) + '" target="_blank" rel="noopener">PDF</a>';
    if (!p.url && !p.pdf) links += '<a href="https://scholar.google.com/scholar?q=' + encodeURIComponent(p.title) + '" target="_blank" rel="noopener">Search</a>';
    if (p.abstract) links += '<button type="button" class="abs-toggle">Abstract</button>';
    if (p.bibtex) links += '<button type="button" class="cite-toggle">BibTeX</button>';

    var titleInner = esc(p.title);
    var titleLink = p.url || p.pdf;
    if (titleLink) titleInner = '<a href="' + esc(titleLink) + '" target="_blank" rel="noopener">' + titleInner + '</a>';

    var html = '<li class="pub-item" data-search="' + esc(hay) + '"' + (p.abstract ? ' data-hasabs="1"' : '') + '>';
    html += '<div class="pub-title">' + titleInner + '</div>';
    html += '<span class="pub-authors-short">' + shortAuthors(p.authors) + '</span>';
    html += '<div class="pub-authors">' + highlightMe(p.authors) + '</div>';
    if (venue) html += '<span class="pub-venue">' + esc(venue) + '</span>';
    if (links) html += '<div class="pub-links">' + links + '</div>';
    if (p.abstract) html += '<div class="pub-abstract">' + esc(p.abstract) + '</div>';
    if (p.bibtex) html += '<div class="pub-bibtex"><button type="button" class="bibtex-copy">Copy</button><pre>' + esc(p.bibtex) + '</pre></div>';
    html += '</li>';
    return html;
  }

  fetch('data/publications.json')
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (pubs) {
      var groups = [], byName = {};
      pubs.forEach(function (p) {
        if (!byName[p.group]) { byName[p.group] = { name: p.group, order: p.order, items: [] }; groups.push(byName[p.group]); }
        byName[p.group].items.push(p);
      });
      groups.sort(function (a, b) { return a.order - b.order; });

      var out = '';
      out += '<div class="pub-toolbar">';
      out += '<div class="pub-searchbox"><span class="ic" aria-hidden="true">🔍</span>';
      out += '<input type="search" class="pub-search" placeholder="search title, author, venue…" aria-label="Search publications" autocomplete="off"></div>';
      out += '<button type="button" class="pub-collapse-all">Collapse all</button>';
      out += '<button type="button" class="pub-mode" aria-pressed="false">▤ Compact</button>';
      out += '</div>';
      out += '<p class="pub-controls">' + pubs.length + ' entries · ' +
        groups.map(function (g) { return g.items.length + ' ' + g.name.toLowerCase().replace(/ \(.*\)/, ''); }).join(' · ') + '</p>';
      out += '<div class="pub-results">';
      groups.forEach(function (g) {
        out += '<section class="pub-group"><h2 class="group-toggle" tabindex="0" aria-expanded="true">' + esc(g.name) + '</h2><ul class="pub-list">';
        g.items.forEach(function (p) { out += renderItem(p); });
        out += '</ul></section>';
      });
      out += '</div>';
      out += '<p class="pub-noresults" hidden>No matching publications.</p>';
      container.innerHTML = out;

      function bindToggle(selector, targetSelector) {
        container.querySelectorAll(selector).forEach(function (btn) {
          btn.addEventListener('click', function () {
            var panel = btn.closest('.pub-item').querySelector(targetSelector);
            if (!panel) return;
            var open = panel.classList.toggle('open');
            btn.classList.toggle('active', open);
            btn.setAttribute('aria-pressed', open ? 'true' : 'false');
          });
        });
      }
      bindToggle('.abs-toggle', '.pub-abstract');
      bindToggle('.cite-toggle', '.pub-bibtex');
      container.querySelectorAll('.bibtex-copy').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var pre = btn.parentNode.querySelector('pre');
          if (pre) copyText(pre.textContent, btn);
        });
      });
      // Clicking the BibTeX block selects all of its text.
      container.querySelectorAll('.pub-bibtex pre').forEach(function (pre) {
        pre.addEventListener('click', function () {
          var sel = window.getSelection();
          var range = document.createRange();
          range.selectNodeContents(pre);
          sel.removeAllRanges();
          sel.addRange(range);
        });
      });

      // In compact mode, clicking anywhere on a paper row (except its action
      // buttons/links) expands or collapses the abstract.
      container.addEventListener('click', function (e) {
        if (!container.classList.contains('compact')) return;
        // let the action buttons work, and don't collapse when clicking an
        // already-open abstract/bibtex panel (so its text stays selectable).
        if (e.target.closest('.pub-links, .pub-abstract, .pub-bibtex')) return;
        var item = e.target.closest('.pub-item');
        if (!item || !item.getAttribute('data-hasabs')) return;
        e.preventDefault();
        var abs = item.querySelector('.pub-abstract');
        if (abs) abs.classList.toggle('open');
      });

      // Compact / expand (persisted).
      var modeBtn = container.querySelector('.pub-mode');
      function setCompact(on) {
        container.classList.toggle('compact', on);
        modeBtn.textContent = on ? '▦ Expand' : '▤ Compact';
        modeBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
        try { localStorage.setItem('pubCompact', on ? '1' : '0'); } catch (e) {}
      }
      var saved = '0';
      try { saved = localStorage.getItem('pubCompact') || '0'; } catch (e) {}
      setCompact(saved === '1');
      modeBtn.addEventListener('click', function () { setCompact(!container.classList.contains('compact')); });

      // Collapsible category sections + collapse/expand all.
      function setGroupCollapsed(group, collapsed) {
        group.classList.toggle('collapsed', collapsed);
        var h = group.querySelector('h2.group-toggle');
        if (h) h.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      }
      container.querySelectorAll('.group-toggle').forEach(function (h) {
        function toggle() {
          var g = h.closest('.pub-group');
          setGroupCollapsed(g, !g.classList.contains('collapsed'));
        }
        h.addEventListener('click', toggle);
        h.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
        });
      });
      var collapseAll = container.querySelector('.pub-collapse-all');
      collapseAll.addEventListener('click', function () {
        var groups = container.querySelectorAll('.pub-group');
        var anyOpen = Array.prototype.some.call(groups, function (g) {
          return !g.classList.contains('collapsed');
        });
        groups.forEach(function (g) { setGroupCollapsed(g, anyOpen); });
        collapseAll.textContent = anyOpen ? 'Expand all' : 'Collapse all';
      });

      // Search (substring + light typo tolerance).
      var search = container.querySelector('.pub-search');
      var noResults = container.querySelector('.pub-noresults');
      search.addEventListener('input', function () {
        var tokens = search.value.toLowerCase().split(/\s+/).filter(Boolean);
        if (tokens.length) {
          // expand all groups so matches are visible
          container.querySelectorAll('.pub-group').forEach(function (g) { setGroupCollapsed(g, false); });
          collapseAll.textContent = 'Collapse all';
        }
        var anyVisible = false;
        container.querySelectorAll('.pub-group').forEach(function (sec) {
          var visible = 0;
          sec.querySelectorAll('.pub-item').forEach(function (item) {
            var hay = item.getAttribute('data-search') || '';
            var words = hay.split(/\s+/);
            var ok = tokens.every(function (t) { return matchToken(t, hay, words); });
            item.hidden = !ok;
            if (ok) { visible++; anyVisible = true; }
          });
          sec.hidden = visible === 0;
        });
        noResults.hidden = anyVisible || tokens.length === 0;
      });

      document.dispatchEvent(new CustomEvent('content:updated'));
    })
    .catch(function (err) {
      container.innerHTML = '<p>Could not load publications (' + esc(err.message) +
        '). If you opened this file directly, run a local server (e.g. <code>python -m http.server</code>).</p>';
    });
})();
