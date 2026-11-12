/**
 * App router. Renders into #app. Each "page" is a function that
 * fetches data and sets #app.innerHTML.
 *
 * URLs are hash-based so the site works on GitHub Pages without
 * server-side routing:
 *   #/                → homepage
 *   #/browse          → browse all
 *   #/browse?cat=x    → browse category
 *   #/ad/123          → ad detail
 *   #/setup           → first-run API URL prompt
 */
(function () {
  'use strict';

  const app = document.getElementById('app');
  const nav = document.getElementById('nav');

  function parseHash() {
    const h = window.location.hash.slice(1) || '/';
    const [path, qs] = h.split('?');
    const params = {};
    if (qs) qs.split('&').forEach(p => {
      const [k, v] = p.split('=');
      params[decodeURIComponent(k)] = decodeURIComponent(v || '');
    });
    return { path, params };
  }

  function navigate(hash) {
    window.location.hash = hash;
  }

  function setActiveNav(path) {
    if (!nav) return;
    nav.querySelectorAll('a').forEach(a => {
      const target = a.dataset.path;
      const isActive = target === '/' ? path === '/' :
        path.startsWith(target);
      a.classList.toggle('active', isActive);
    });
  }

  function loading() {
    app.innerHTML = '<div class="loading">Loading…</div>';
  }

  function error(msg) {
    app.innerHTML = '<div class="panel"><div class="empty">' +
      '<b>Something went wrong</b><br><span class="muted small">' +
      escapeHtml(msg) + '</span></div></div>';
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }
  window.escapeHtml = escapeHtml;

  function route() {
    const { path, params } = parseHash();
    setActiveNav(path);

    if (path === '/' || path === '') {
      window.Views.home(app, { navigate });
    } else if (path === '/browse') {
      window.Views.browse(app, params, { navigate });
    } else if (path.startsWith('/ad/')) {
      const id = Number(path.split('/')[2]);
      window.Views.adDetail(app, id, { navigate });
    } else if (path === '/setup') {
      window.Views.setup(app, { navigate });
    } else {
      app.innerHTML = '<div class="panel"><div class="empty">Page not found</div></div>';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Click handler for [data-href] links
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-href]');
    if (el) {
      e.preventDefault();
      navigate(el.dataset.href);
    }
  });

  window.addEventListener('hashchange', route);

  // Expose for views
  window.App = { navigate };

  // Initial route
  if (!window.API.getBase()) {
    navigate('/setup');
  } else {
    route();
  }
})();
