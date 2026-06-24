// Shared site behaviour (no dependencies).

function slugify(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

var spyHandler = null;

// Build a sub-menu of the current page's section titles (h2) under the
// active sidebar item, with anchor links that scroll to each section.
function buildSectionSubnav() {
  var active = document.querySelector('nav.topnav a.navlink.active');
  if (!active) return;

  var existing = document.querySelector('nav.topnav .subnav');
  if (existing) existing.remove();

  var headings = document.querySelectorAll('.content h2');
  if (!headings.length) return;

  var ul = document.createElement('ul');
  ul.className = 'subnav';

  headings.forEach(function (h) {
    if (!h.id) {
      var base = slugify(h.textContent) || 'section';
      var id = base, n = 2;
      while (document.getElementById(id)) { id = base + '-' + (n++); }
      h.id = id;
    }
    var li = document.createElement('li');
    var a = document.createElement('a');
    a.href = '#' + h.id;
    a.textContent = h.textContent;
    li.appendChild(a);
    ul.appendChild(li);
  });

  active.insertAdjacentElement('afterend', ul);

  // Scrollspy: always keep exactly one section marked current — the last
  // heading scrolled past — so it stays highlighted mid-section too.
  if (spyHandler) {
    window.removeEventListener('scroll', spyHandler);
    window.removeEventListener('resize', spyHandler);
  }
  spyHandler = function () {
    var offset = 110, current = headings[0];
    headings.forEach(function (h) {
      if (h.getBoundingClientRect().top <= offset) current = h;
    });
    ul.querySelectorAll('a').forEach(function (a) {
      a.classList.toggle('current', a.getAttribute('href') === '#' + current.id);
    });
  };
  window.addEventListener('scroll', spyHandler, { passive: true });
  window.addEventListener('resize', spyHandler);
  spyHandler();
}

// Build mailto links from data attributes (keeps the raw address out of HTML).
function buildEmailLinks() {
  document.querySelectorAll('.email-link').forEach(function (el) {
    var addr = el.getAttribute('data-user') + '@' + el.getAttribute('data-domain');
    el.href = 'mailto:' + addr;
    if (!el.textContent.trim()) el.textContent = addr;
  });
}

// Open external links and files (PDFs) in a new tab; keep internal nav in place.
function externalLinksNewTab() {
  document.querySelectorAll('a[href]').forEach(function (a) {
    var href = a.getAttribute('href');
    if (!href || href.charAt(0) === '#' || /^(mailto|tel):/i.test(href)) return;
    var external = /^https?:\/\//i.test(href) && a.hostname !== location.hostname;
    var isFile = /\.pdf($|[?#])/i.test(href);
    if (external || isFile) { a.target = '_blank'; a.rel = 'noopener'; }
  });
}

document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('code.random').forEach(function (el) {
    el.textContent = '>> ' + Math.floor(Math.random() * 100);
  });
  document.querySelectorAll('.year-now').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
  buildSectionSubnav();
  buildEmailLinks();
  externalLinksNewTab();
});

// Pages that inject content asynchronously (e.g. publications) fire this
// so the submenu can be (re)built once their <h2> sections exist.
document.addEventListener('content:updated', buildSectionSubnav);
