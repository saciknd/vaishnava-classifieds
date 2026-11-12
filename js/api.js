/**
 * API client. All communication with the Apps Script backend goes through
 * this module. The /exec URL is stored in localStorage on first visit.
 */
(function () {
  'use strict';

  const KEY = 'vc_api_url';

  function getBase() {
    return localStorage.getItem(KEY) || '';
  }

  function setBase(url) {
    if (!url) throw new Error('URL required');
    if (!/\/exec$/.test(url)) throw new Error('URL must end in /exec');
    localStorage.setItem(KEY, url);
  }

  async function call(action, params = {}, method = 'GET') {
    const base = getBase();
    if (!base) throw new Error('API URL not set. Visit /setup first.');

    let url = base + '?action=' + encodeURIComponent(action);
    let opts = { method };

    if (method === 'GET') {
      Object.keys(params).forEach(k => {
        const v = params[k];
        if (v !== undefined && v !== null && v !== '') {
          url += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(v);
        }
      });
    } else {
      // POST: text/plain avoids preflight; Apps Script parses JSON regardless.
      opts.headers = { 'Content-Type': 'text/plain;charset=utf-8' };
      opts.body = JSON.stringify(params);
    }

    const res = await fetch(url, opts);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); }
    catch (e) { throw new Error('Invalid JSON: ' + text.slice(0, 100)); }
    if (!json.body) throw new Error('Unexpected response');
    return json.body;
  }

  window.API = {
    getBase, setBase,
    categories: () => call('categories'),
    subcategories: (category_id) => call('subcategories', { category_id }),
    locations: () => call('locations'),
    ads: (params) => call('ads', params),
    ad: (id) => call('ad', { id }),
    viewAd: (id) => call('viewAd', { id }, 'POST')
  };
})();
