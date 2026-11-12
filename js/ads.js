/**
 * Page views: home, browse, ad detail, setup.
 * Each is a function (el, params, ctx) that renders into el.
 * All user-supplied text goes through escapeHtml().
 */
(function () {
  'use strict';

  const esc = window.escapeHtml;
  const NAV = window.App.navigate;

  const CATEGORY_EMOJI = {
    'property': '🏡', 'products': '📚', 'services': '🛠️',
    'employment': '💼', 'community': '🪷', 'other': '＋'
  };

  async function renderCats() {
    try {
      const data = await window.API.categories();
      const cats = data.categories || [];
      return cats.map(c => `
        <a class="cat" data-href="#/browse?cat=${encodeURIComponent(c.slug)}">
          <span class="emoji">${CATEGORY_EMOJI[c.slug] || '•'}</span>
          <b>${esc(c.name)}</b>
        </a>`).join('');
    } catch (e) {
      return '<div class="muted small">Could not load categories.</div>';
    }
  }

  function adCard(ad) {
    const img = ad.primary_image_id
      ? `<img src="https://drive.google.com/thumbnail?id=${encodeURIComponent(ad.primary_image_id)}&sz=w400" alt="">`
      : (CATEGORY_EMOJI[ad.category_slug] || '📷');
    return `
      <a class="card" data-href="#/ad/${ad.id}">
        <div class="photo">${img}</div>
        <div class="meta">${esc(ad.category_slug || '')} · ${esc(ad.location_town || '')}</div>
        <h3>${esc(ad.title)}</h3>
        ${ad.price ? `<div class="price">${esc(formatPrice(ad.price, ad.price_note))}</div>` : ''}
      </a>`;
  }

  function formatPrice(price, note) {
    const p = String(price);
    if (/^\d+(\.\d{1,2})?$/.test(p)) {
      return '£' + p + (note ? ' ' + note : '');
    }
    return p + (note ? ' ' + note : '');
  }

  // ==========================================================================
  // HOME
  // ==========================================================================
  async function home(el) {
    el.innerHTML = `
      <section class="hero">
        <div class="eyebrow">THE COMMUNITY MARKETPLACE</div>
        <h1>A place to find,<br>share and connect.</h1>
        <p>Discover accommodation, products, services, work opportunities and community events from across the UK.</p>
        <div class="actions">
          <a class="btn primary" data-href="#/browse">Explore advertisements →</a>
        </div>
      </section>
      <div class="cats" id="cats">Loading categories…</div>
      <div class="sectionhead">
        <div><h2>Recently added</h2><p>A selection of community advertisements</p></div>
        <a class="btn" data-href="#/browse">View all →</a>
      </div>
      <div id="recent" class="grid"><div class="loading">Loading…</div></div>
    `;

    document.getElementById('cats').innerHTML = await renderCats();

    try {
      const data = await window.API.ads({ sort: 'newest', per: 6 });
      const ads = data.ads || [];
      document.getElementById('recent').innerHTML = ads.length
        ? ads.map(adCard).join('')
        : '<div class="empty">No advertisements yet.</div>';
    } catch (e) {
      document.getElementById('recent').innerHTML =
        '<div class="empty">Could not load advertisements: ' + esc(e.message) + '</div>';
    }
  }

  // ==========================================================================
  // BROWSE
  // ==========================================================================
  async function browse(el, params) {
    const q      = params.q || '';
    const cat    = params.cat || '';
    const subcat = params.subcat || '';
    const loc    = params.loc || '';
    const min    = params.min || '';
    const max    = params.max || '';
    const sort   = params.sort || 'newest';
    const page   = Number(params.page) || 1;

    el.innerHTML = `
      <div class="pagehead">
        <h1>Browse advertisements</h1>
        <p>Find something useful or share what you have to offer.</p>
      </div>
      <form class="panel searchbar" id="searchform">
        <input class="field" name="q" placeholder="Search advertisements…" value="${esc(q)}">
        <select class="field" name="cat" id="catselect"></select>
        <select class="field" name="loc" id="locselect"><option value="">All locations</option></select>
        <select class="field" name="sort">
          <option value="newest" ${sort === 'newest' ? 'selected' : ''}>Newest first</option>
          <option value="price_asc" ${sort === 'price_asc' ? 'selected' : ''}>Price: low to high</option>
          <option value="price_desc" ${sort === 'price_desc' ? 'selected' : ''}>Price: high to low</option>
        </select>
        <button class="btn primary" type="submit">Search</button>
      </form>
      <div id="filters" class="filters"></div>
      <div id="results"><div class="loading">Loading…</div></div>
    `;

    try {
      const cats = await window.API.categories();
      document.getElementById('catselect').innerHTML =
        '<option value="">All categories</option>' +
        (cats.categories || []).map(c =>
          `<option value="${esc(c.slug)}" ${c.slug === cat ? 'selected' : ''}>${esc(c.name)}</option>`
        ).join('');
    } catch (e) { /* leave empty */ }

    try {
      const locs = await window.API.locations();
      document.getElementById('locselect').innerHTML =
        '<option value="">All locations</option>' +
        (locs.locations || []).map(l =>
          `<option value="${l.id}" ${String(l.id) === loc ? 'selected' : ''}>${esc(l.town)}, ${esc(l.region)}</option>`
        ).join('');
    } catch (e) { /* leave empty */ }

    const filterChips = [];
    if (q) filterChips.push({ label: `"${q}"`, remove: () => navigateWithout('q') });
    if (cat) filterChips.push({ label: `Category: ${cat}`, remove: () => navigateWithout('cat') });
    if (loc) filterChips.push({ label: 'Location', remove: () => navigateWithout('loc') });
    document.getElementById('filters').innerHTML = filterChips.map((c, i) =>
      `<span class="filter-chip">${esc(c.label)} <button data-chip="${i}">×</button></span>`
    ).join('');
    document.querySelectorAll('[data-chip]').forEach((b, i) => {
      b.addEventListener('click', filterChips[i].remove);
    });

    document.getElementById('searchform').addEventListener('submit', (e) => {
      e.preventDefault();
      const form = e.target;
      const newParams = new URLSearchParams();
      ['q', 'cat', 'loc', 'sort'].forEach(name => {
        const v = form.elements[name].value;
        if (v && !(name === 'sort' && v === 'newest')) newParams.set(name, v);
      });
      window.location.hash = '#/browse' + (newParams.toString() ? '?' + newParams.toString() : '');
    });

    try {
      const data = await window.API.ads({
        q, cat, subcat, loc, min, max, sort, page, per: 12
      });
      renderResults(data);
    } catch (e) {
      document.getElementById('results').innerHTML =
        '<div class="empty">Could not load advertisements: ' + esc(e.message) + '</div>';
    }

    function navigateWithout(key) {
      const p = new URLSearchParams(window.location.hash.split('?')[1] || '');
      p.delete(key);
      const s = p.toString();
      window.location.hash = '#/browse' + (s ? '?' + s : '');
    }

    function renderResults(data) {
      const ads = data.ads || [];
      if (!ads.length) {
        document.getElementById('results').innerHTML =
          '<div class="panel"><div class="empty">No matching advertisements. Try another search.</div></div>';
        return;
      }
      document.getElementById('results').innerHTML = `
        <div class="sectionhead">
          <div><h2>${data.total} advertisement${data.total === 1 ? '' : 's'}</h2>
          <p class="muted small">Page ${data.page} of ${data.pages}</p></div>
        </div>
        <div class="grid">${ads.map(adCard).join('')}</div>
        ${renderPagination(data)}
      `;
      document.querySelectorAll('[data-page]').forEach(b => {
        b.addEventListener('click', () => {
          const p = new URLSearchParams(window.location.hash.split('?')[1] || '');
          p.set('page', b.dataset.page);
          window.location.hash = '#/browse?' + p.toString();
        });
      });
    }

    function renderPagination(data) {
      if (data.pages <= 1) return '';
      let html = '<div class="pagination">';
      html += `<button data-page="${data.page - 1}" ${data.page === 1 ? 'disabled' : ''}>← Previous</button>`;
      for (let i = 1; i <= data.pages; i++) {
        if (i === 1 || i === data.pages || Math.abs(i - data.page) <= 2) {
          html += `<button data-page="${i}" class="${i === data.page ? 'active' : ''}">${i}</button>`;
        } else if (i === data.page - 3 || i === data.page + 3) {
          html += '<span style="padding:8px">…</span>';
        }
      }
      html += `<button data-page="${data.page + 1}" ${data.page === data.pages ? 'disabled' : ''}>Next →</button>`;
      html += '</div>';
      return html;
    }
  }

  // ==========================================================================
  // AD DETAIL
  // ==========================================================================
  async function adDetail(el, id) {
    el.innerHTML = '<div class="loading">Loading…</div>';
    let data;
    try {
      data = await window.API.ad(id);
    } catch (e) {
      el.innerHTML = `<div class="panel"><div class="empty">Could not load advertisement: ${esc(e.message)}</div></div>`;
      return;
    }
    if (!data.ok) {
      el.innerHTML = `<div class="panel"><div class="empty">${esc(data.error || 'Advertisement not found')}</div></div>`;
      return;
    }
    const a = data.ad;
    const images = a.images || [];
    const mainImg = images.length
      ? `<img src="https://drive.google.com/thumbnail?id=${encodeURIComponent(images[0].drive_file_id)}&sz=w800" alt="" id="mainimg">`
      : (CATEGORY_EMOJI[a.category_slug] || '📷');

    el.innerHTML = `
      <a class="btn" data-href="#/browse" style="margin-bottom:15px;display:inline-block">← Back to advertisements</a>
      <div class="detailgrid">
        <section class="panel">
          <div class="detailphoto" id="mainphoto">${mainImg}</div>
          ${images.length > 1 ? `<div class="detailgallery" id="gallery">${
            images.map((im, i) => `<img src="https://drive.google.com/thumbnail?id=${encodeURIComponent(im.drive_file_id)}&sz=w200"
              data-full="${encodeURIComponent(im.drive_file_id)}"
              class="${i === 0 ? 'active' : ''}" alt="">`).join('')
          }</div>` : ''}
          <div class="small muted" style="margin-top:14px">${esc(a.category_name)} · ${esc(a.location_town)}, ${esc(a.location_region)}</div>
          <h1 style="font: bold 27px Georgia, serif; margin: 8px 0">${esc(a.title)}</h1>
          ${a.price ? `<div class="price" style="font-size:20px">${esc(formatPrice(a.price, a.price_note))}</div>` : ''}
          <h3 style="margin:22px 0 5px">Description</h3>
          <p class="muted" style="white-space:pre-wrap">${esc(a.description)}</p>
          <div class="actions">
            <button class="btn primary" data-action="message">✉ Message advertiser</button>
            <button class="btn" data-action="save">♡ Save advert</button>
          </div>
        </section>
        <aside class="panel">
          <b>About the advertiser</b>
          <div class="rowline">
            <span>👤 &nbsp; ${esc(a.advertiser_display_name)}</span>
          </div>
          <hr style="border:0;border-top:1px solid var(--line)">
          <div class="small muted">LOCATION</div>
          <p>${esc(a.location_town)}, ${esc(a.location_region)}</p>
          <div class="notice">Use your judgement, ask questions and arrange transactions safely.</div>
          <button class="btn" style="width:100%;margin-top:12px" data-action="report">Report advertisement</button>
        </aside>
      </div>
    `;

    const gallery = document.getElementById('gallery');
    if (gallery) {
      gallery.querySelectorAll('img').forEach(img => {
        img.addEventListener('click', () => {
          document.querySelectorAll('#gallery img').forEach(g => g.classList.remove('active'));
          img.classList.add('active');
          document.getElementById('mainphoto').innerHTML =
            `<img src="https://drive.google.com/thumbnail?id=${img.dataset.full}&sz=w800" alt="">`;
        });
      });
    }

    window.API.viewAd(a.id).catch(() => {});

    document.querySelectorAll('[data-action]').forEach(b => {
      b.addEventListener('click', () => {
        const action = b.dataset.action;
        if (action === 'message') alert('Messaging will be added in a later stage.');
        else if (action === 'save') alert('Saved adverts will be added in a later stage.');
        else if (action === 'report') alert('Reporting will be added in a later stage.');
      });
    });
  }

  // ==========================================================================
  // SETUP (first-run configuration)
  // ==========================================================================
  function setup(el) {
    el.innerHTML = `
      <div class="panel" style="max-width:560px;margin:40px auto">
        <h1 style="font: bold 24px Georgia, serif; margin: 0 0 10px">First-time setup</h1>
        <p class="muted">Enter your Apps Script Web App URL (the one that ends in <code>/exec</code>).
        It will be stored in this browser only.</p>
        <input class="field" id="url" type="url" placeholder="https://script.google.com/macros/s/.../exec" style="margin:10px 0">
        <button class="btn primary" id="save">Save and continue</button>
        <div class="notice">If you don't have this URL, ask the site owner.</div>
      </div>
    `;
    document.getElementById('save').addEventListener('click', () => {
      const url = document.getElementById('url').value.trim();
      try {
        window.API.setBase(url);
        window.location.hash = '#/';
        window.location.reload();
      } catch (e) {
        alert(e.message);
      }
    });
  }

  window.Views = { home, browse, adDetail, setup };
})();
