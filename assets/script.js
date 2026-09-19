/* Personal site — shared behaviour
   Renders publications and news from data/*.json, tracks the active nav
   section, and lazily plays highlight videos. No dependencies. */
(function () {
  'use strict';

  var root = document.documentElement;

  /* ---------------------------------------------------------------- utils */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatAuthors(authors) {
    return escapeHtml(String(authors)).replace(/\*([^*]+)\*/g, '<strong class="me">$1</strong>');
  }

  var ARROW = '<svg class="ext" aria-hidden="true" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg>';

  function linkItem(label, href) {
    if (!href) return '';
    return '<a class="pub-link" href="' + escapeHtml(href) + '" target="_blank" rel="noopener"><span>' + label + '</span>' + ARROW + '</a>';
  }

  /* -------------------------------------------------------- publications */
  function publicationItem(p) {
    var links = p.links || {};
    var thumb = p.image
      ? '<div class="pub-thumb"><img src="' + escapeHtml(p.image) + '" alt="' + escapeHtml(p.title || 'Publication thumbnail') + '" loading="lazy" /></div>'
      : '';
    var linkHtml = linkItem('Site', links.site)
      + linkItem('PDF', links.pdf)
      + linkItem('arXiv', links.arxiv)
      + linkItem('DOI', links.doi)
      + linkItem('Scholar', links.scholar)
      + linkItem('Code', links.code)
      + linkItem('Slides', links.slides)
      + linkItem('Video', links.video);
    var authors = p.authors ? '<p class="pub-authors">' + formatAuthors(p.authors) + '</p>' : '';
    var hasYear = p.year !== undefined && p.year !== null;
    var venue = p.venue ? '<span class="pub-venue">' + escapeHtml(p.venue) + '</span>' : '';
    var year = hasYear ? '<span class="pub-year">' + escapeHtml(String(p.year)) + '</span>' : '';
    var meta = (venue || year) ? '<p class="pub-meta">' + venue + year + '</p>' : '';
    var tags = Array.isArray(p.tags) && p.tags.length
      ? '<ul class="pub-tags">' + p.tags.map(function (t) { return '<li>' + escapeHtml(t) + '</li>'; }).join('') + '</ul>'
      : '';
    return '<article class="pub"' + (hasYear ? ' data-year="' + escapeHtml(String(p.year)) + '"' : '') + '>'
      + thumb
      + '<div class="pub-body">'
      + '<h3 class="pub-title">' + escapeHtml(p.title || '') + '</h3>'
      + authors + meta
      + (linkHtml ? '<div class="pub-links">' + linkHtml + '</div>' : '')
      + tags
      + '</div></article>';
  }

  var pubList = document.getElementById('pub-list');
  if (pubList) {
    fetch('data/publications.json')
      .then(function (r) { return r.json(); })
      .then(function (items) {
        if (!Array.isArray(items)) return;
        var sorted = items.slice().sort(function (a, b) { return (b.year || 0) - (a.year || 0); });
        pubList.innerHTML = sorted.map(publicationItem).join('');
      })
      .catch(function () {
        pubList.innerHTML = '<p class="empty">Add your publications to <code>data/publications.json</code>.</p>';
      });
  }

  /* ---------------------------------------------------- highlighted works */
  function highlightItem(h) {
    var links = h.links || {};
    var v = h.video || {};
    var ratio = (v.width && v.height) ? v.width + ' / ' + v.height : '16 / 9';
    var media = v.src
      ? '<div class="hl-media" style="aspect-ratio:' + ratio + '">'
        + '<video muted loop playsinline controls preload="none" data-autoplay-video'
        + ' data-src="' + escapeHtml(v.src) + '"'
        + (v.poster ? ' poster="' + escapeHtml(v.poster) + '"' : '')
        + ' aria-label="' + escapeHtml(h.title || 'Teaser video') + '"></video>'
        + '</div>'
      : '';
    var linkHtml = linkItem('Site', links.site)
      + linkItem('PDF', links.pdf)
      + linkItem('arXiv', links.arxiv)
      + linkItem('DOI', links.doi)
      + linkItem('Scholar', links.scholar)
      + linkItem('Code', links.code)
      + linkItem('Slides', links.slides)
      + linkItem('Video', links.video);
    var venue = h.venue ? '<span class="pub-venue">' + escapeHtml(h.venue) + '</span>' : '';
    var year = (h.year !== undefined && h.year !== null) ? '<span class="pub-year">' + escapeHtml(String(h.year)) + '</span>' : '';
    var affil = Array.isArray(h.affiliations) && h.affiliations.length
      ? '<div class="hl-affil">' + h.affiliations.map(function (a) {
          return a.logo ? '<img src="' + escapeHtml(a.logo) + '" alt="' + escapeHtml(a.name || '') + '" loading="lazy" />' : '';
        }).join('') + '</div>'
      : '';
    return '<article class="highlight">'
      + media
      + '<div class="hl-body">'
      + ((venue || year || affil) ? '<div class="hl-head">' + ((venue || year) ? '<p class="pub-meta">' + venue + year + '</p>' : '') + affil + '</div>' : '')
      + '<h3 class="hl-title">' + escapeHtml(h.title || '') + '</h3>'
      + (h.authors ? '<p class="pub-authors">' + formatAuthors(h.authors) + '</p>' : '')
      + (h.description ? '<p class="hl-desc">' + escapeHtml(h.description) + '</p>' : '')
      + (linkHtml ? '<div class="pub-links">' + linkHtml + '</div>' : '')
      + '</div></article>';
  }

  /* Videos start loading and playing only while on screen; paused when scrolled away */
  function initLazyVideos(scope) {
    var vids = (scope || document).querySelectorAll('video[data-autoplay-video]');
    if (!vids.length) return;
    function start(v) {
      if (!v.getAttribute('src') && v.dataset.src) { v.setAttribute('src', v.dataset.src); v.load(); }
      if (v.dataset.userPaused) return;
      var p = v.play(); if (p && p.catch) p.catch(function () {});
    }
    Array.prototype.forEach.call(vids, function (v) {
      v.addEventListener('pause', function () { if (!v.dataset.autoPaused && !v.ended) v.dataset.userPaused = '1'; });
      v.addEventListener('play', function () { delete v.dataset.userPaused; });
    });
    if (!('IntersectionObserver' in window)) { Array.prototype.forEach.call(vids, start); return; }
    var vio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) { start(v); }
        else if (!v.paused) { v.dataset.autoPaused = '1'; v.pause(); delete v.dataset.autoPaused; }
      });
    }, { rootMargin: '200px 0px', threshold: 0.01 });
    Array.prototype.forEach.call(vids, function (v) { vio.observe(v); });
  }

  var hlList = document.getElementById('highlight-list');
  if (hlList) {
    fetch('data/highlights.json')
      .then(function (r) { return r.json(); })
      .then(function (items) {
        if (!Array.isArray(items)) return;
        hlList.innerHTML = items.map(highlightItem).join('');
        initLazyVideos(hlList);
      })
      .catch(function () { hlList.innerHTML = ''; });
  }

  /* ---------------------------------------------------------------- news */
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function monthName(v) {
    if (typeof v === 'number') return MONTHS[Math.min(12, Math.max(1, v)) - 1];
    var s = String(v || '').trim().toLowerCase();
    if (!s) return '';
    for (var i = 0; i < MONTHS.length; i++) if (MONTHS[i].toLowerCase().indexOf(s) === 0) return MONTHS[i];
    var n = parseInt(s, 10);
    if (!isNaN(n) && n >= 1 && n <= 12) return MONTHS[n - 1];
    return '';
  }

  function newsDate(it) {
    if (!it) return '';
    if (it.month && it.year) {
      var m = monthName(it.month);
      if (m) return m + ' ' + String(it.year);
    }
    if (it.date) {
      var v = String(it.date);
      var match = v.match(/(\d{4})-(\d{1,2})/);
      if (match) {
        var mn = monthName(parseInt(match[2], 10));
        if (mn) return mn + ' ' + match[1];
      }
      var d = new Date(v);
      if (!isNaN(d)) return MONTHS[d.getMonth()] + ' ' + d.getFullYear();
    }
    return '';
  }

  function newsItem(it) {
    var title = escapeHtml(it.title || '');
    var desc = escapeHtml(it.description || it.caption || '');
    var src = it.src ? escapeHtml(it.src) : '';
    var date = newsDate(it);
    if (!title && !desc && !src && !date) return '';
    var media = src ? '<div class="news-media"><img src="' + src + '" alt="' + (title || desc) + '" loading="lazy" /></div>' : '';
    return '<figure class="news-item">'
      + media
      + '<figcaption>'
      + (title ? '<div class="news-title">' + title + '</div>' : '')
      + (desc ? '<div class="news-desc">' + desc + '</div>' : '')
      + (date ? '<div class="news-date">' + escapeHtml(date) + '</div>' : '')
      + '</figcaption></figure>';
  }

  var newsGrid = document.getElementById('gallery-grid');
  if (newsGrid) {
    fetch('data/news.json')
      .then(function (r) { return r.json(); })
      .then(function (items) {
        if (!Array.isArray(items)) { newsGrid.innerHTML = ''; return; }
        newsGrid.innerHTML = items.map(newsItem).filter(Boolean).join('');
      })
      .catch(function () { newsGrid.innerHTML = ''; });
  }

  /* ---------------------------------------------------------- footer year */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ------------------------------------------------- nav + scroll state */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('[data-nav] a[href^="#"]'));
  var sections = navLinks
    .map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); })
    .filter(Boolean);

  function setActive(id) {
    navLinks.forEach(function (a) {
      var on = a.getAttribute('href') === '#' + id;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  }

  var ticking = false;
  function update() {
    ticking = false;
    var y = window.scrollY || window.pageYOffset || 0;
    var vh = window.innerHeight || 0;
    var docH = Math.max(document.body.scrollHeight, root.scrollHeight);
    var current = '';
    if (sections.length && y + vh >= docH - 2) {
      current = sections[sections.length - 1].id;
    } else {
      var line = y + vh * 0.35;
      for (var i = 0; i < sections.length; i++) {
        var top = sections[i].getBoundingClientRect().top + y;
        if (top <= line) current = sections[i].id;
      }
    }
    setActive(current);
  }
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  window.addEventListener('load', update);
  update();
})();
