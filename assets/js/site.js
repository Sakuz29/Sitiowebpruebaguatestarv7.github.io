/* GuateStar · sitio v7 · comportamiento común */
(function () {
  'use strict';
  var doc = document.documentElement;
  doc.classList.remove('no-js');
  var LANG = doc.lang && doc.lang.indexOf('es') === 0 ? 'es' : 'en';
  var CFG = window.GS_CONFIG || {};  // definido en assets/js/config.js

  /* ---- Encabezado con sombra al hacer scroll + botón "volver arriba" ---- */
  var header = document.querySelector('.site-header');
  var toTop = document.querySelector('.to-top');
  function onScroll() {
    var y = window.scrollY || 0;
    if (header) header.classList.toggle('scrolled', y > 10);
    if (toTop) toTop.classList.toggle('show', y > 700);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  if (toTop) toTop.addEventListener('click', function () { window.scrollTo({ top: 0 }); });

  /* ---- Submenús accesibles con teclado ---- */
  var tops = document.querySelectorAll('.nav-top[aria-controls]');
  function closeAll(except) {
    tops.forEach(function (b) {
      if (b === except) return;
      b.setAttribute('aria-expanded', 'false');
      var m = document.getElementById(b.getAttribute('aria-controls'));
      if (m) m.classList.remove('open');
    });
  }
  function setOpen(btn, open) {
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    var m = document.getElementById(btn.getAttribute('aria-controls'));
    if (m) m.classList.toggle('open', open);
  }
  var canHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  tops.forEach(function (btn) {
    var li = btn.parentElement, timer = null, openedAt = 0;
    if (canHover) {
      // Abrir al pasar el puntero; cerrar con un pequeño retraso al salir,
      // para que dé tiempo de bajar al panel sin que se cierre.
      li.addEventListener('mouseenter', function () {
        clearTimeout(timer);
        if (btn.getAttribute('aria-expanded') !== 'true') { closeAll(btn); setOpen(btn, true); openedAt = Date.now(); }
      });
      li.addEventListener('mouseleave', function () {
        clearTimeout(timer);
        timer = setTimeout(function () { setOpen(btn, false); }, 250);
      });
    }
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var open = btn.getAttribute('aria-expanded') === 'true';
      // Si se acaba de abrir con el puntero, el clic no lo cierra.
      if (open && canHover && Date.now() - openedAt < 600) return;
      closeAll(btn);
      setOpen(btn, !open);
    });
  });
  document.addEventListener('click', function (e) { if (!e.target.closest('.has-sub, .has-mega')) closeAll(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeAll(); closeDrawer(); } });

  /* ---- Menú móvil ---- */
  var drawer = document.getElementById('drawer');
  var openBtn = document.querySelector('.menu-toggle');
  var closeBtn = document.querySelector('.drawer-close');
  function openDrawer() {
    if (!drawer) return;
    drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false');
    openBtn.setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden';
    if (closeBtn) closeBtn.focus();
  }
  function closeDrawer() {
    if (!drawer || !drawer.classList.contains('open')) return;
    drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true');
    openBtn.setAttribute('aria-expanded', 'false'); document.body.style.overflow = '';
    openBtn.focus();
  }
  if (openBtn) openBtn.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);

  /* ---- Aparición suave al hacer scroll ---- */
  var revs = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revs.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    revs.forEach(function (el) { io.observe(el); });
  } else { revs.forEach(function (el) { el.classList.add('in'); }); }

  /* ---- Copiar número de cuenta ---- */
  document.querySelectorAll('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var txt = b.getAttribute('data-copy');
      var done = function () { var o = b.textContent; b.textContent = LANG === 'es' ? 'Copiado' : 'Copied'; setTimeout(function () { b.textContent = o; }, 1800); };
      if (navigator.clipboard) navigator.clipboard.writeText(txt).then(done, function () {});
      track('copy_account');
    });
  });

  /* ---- Selector de donación ---- */
  var gw = document.querySelector('[data-giving]');
  if (gw) {
    var data = JSON.parse(gw.getAttribute('data-giving'));
    var freq = 'monthly', amt = data.monthly.def;
    var amtWrap = gw.querySelector('.amounts');
    var line = gw.querySelector('.impact-line p');
    var icon = gw.querySelector('.impact-line .il-icon');
    var cta = gw.querySelector('[data-give-cta]');
    function render() {
      var set = data[freq];
      amtWrap.innerHTML = set.items.map(function (it) {
        return '<button type="button" aria-pressed="' + (it.v === amt) + '" data-v="' + it.v + '">$' + it.v + '</button>';
      }).join('');
      var cur = set.items.filter(function (it) { return it.v === amt; })[0] || set.items[0];
      line.innerHTML = cur.t;
      icon.textContent = '$' + cur.v;
      cta.href = set.url;
      cta.textContent = set.cta.replace('{v}', cur.v);
      gw.querySelectorAll('.freq-toggle button').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-f') === freq); });
    }
    gw.querySelectorAll('.freq-toggle button').forEach(function (b) {
      b.addEventListener('click', function () { freq = b.getAttribute('data-f'); amt = data[freq].def; render(); track('donate_frequency', { freq: freq }); });
    });
    amtWrap.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      amt = parseInt(b.getAttribute('data-v'), 10); render(); track('donate_amount_select', { freq: freq, amount: amt });
    });
    cta.addEventListener('click', function () { track(freq === 'monthly' ? 'donate_monthly_click' : 'donate_once_click', { amount: amt }); });
    render();
  }

  /* ---- Historias de la portada: selector + cita que entra desde la izquierda ---- */
  var sf = document.querySelector('.story-feature');
  if (sf) {
    var slides = sf.querySelectorAll('.sf-slide');
    var dots = sf.querySelectorAll('.sf-dot');
    var count = sf.querySelector('.sf-count');
    var cur = 0, seen = false;
    function showQuote(sl) { sl.classList.remove('show-quote'); void sl.offsetWidth; setTimeout(function () { sl.classList.add('show-quote'); }, 120); }
    function goTo(n) {
      n = (n + slides.length) % slides.length;
      slides[cur].classList.remove('is-active', 'show-quote'); slides[cur].hidden = true;
      cur = n; slides[cur].hidden = false; slides[cur].classList.add('is-active');
      dots.forEach(function (d, i) { d.setAttribute('aria-pressed', i === cur ? 'true' : 'false'); });
      if (count) count.textContent = (cur + 1) + ' / ' + slides.length;
      if (seen) showQuote(slides[cur]);
      track('story_carousel', { index: cur });
    }
    sf.querySelectorAll('.sf-arrow').forEach(function (b) { b.addEventListener('click', function () { goTo(cur + parseInt(b.getAttribute('data-dir'), 10)); }); });
    dots.forEach(function (d) { d.addEventListener('click', function () { goTo(parseInt(d.getAttribute('data-go'), 10)); }); });
    sf.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') goTo(cur + 1); if (e.key === 'ArrowLeft') goTo(cur - 1); });
    var sx = null;
    sf.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    sf.addEventListener('touchend', function (e) { if (sx === null) return; var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) goTo(cur + (dx < 0 ? 1 : -1)); sx = null; });
    if ('IntersectionObserver' in window) {
      var so = new IntersectionObserver(function (en) { if (en[0].isIntersecting && !seen) { seen = true; showQuote(slides[cur]); so.disconnect(); } }, { threshold: .35 });
      so.observe(sf);
    } else { seen = true; slides[cur].classList.add('show-quote'); }
  }

  /* ---- Línea de tiempo de la historia ---- */
  var tl = document.querySelector('.timeline-x');
  if (tl) {
    var nodes = tl.querySelectorAll('.tl-node');
    var panels = tl.querySelectorAll('.tl-panel');
    var fill = tl.querySelector('.tl-fill');
    var at = nodes.length - 1;
    function sel(i, focus) {
      at = (i + nodes.length) % nodes.length;
      nodes.forEach(function (n, k) {
        n.setAttribute('aria-selected', k === at ? 'true' : 'false'); n.tabIndex = k === at ? 0 : -1;
        n.classList.toggle('done', k < at); panels[k].hidden = k !== at;
      });
      if (fill) fill.style.setProperty('--p', (nodes.length > 1 ? at / (nodes.length - 1) * 100 : 100) + '%');
      if (focus) nodes[at].focus();
      nodes[at].scrollIntoView({ block: 'nearest', inline: 'center' });
    }
    nodes.forEach(function (n, k) {
      n.addEventListener('click', function () { sel(k); track('timeline_select', { index: k }); });
      n.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { e.preventDefault(); sel(at + 1, true); } if (e.key === 'ArrowLeft') { e.preventDefault(); sel(at - 1, true); } });
    });
    tl.querySelectorAll('[data-tl]').forEach(function (b) { b.addEventListener('click', function () { sel(at + parseInt(b.getAttribute('data-tl'), 10)); }); });
    nodes.forEach(function (n, k) { n.classList.toggle('done', k < at); });
  }

  /* ---- Avisos con fecha de vencimiento (p. ej., Colorado Gives Day) ---- */
  /* ---- Campañas de recaudación (definidas en assets/js/config.js) ---- */
  (function () {
    var list = (window.GS_CONFIG && window.GS_CONFIG.campaigns) || [];
    var slots = document.querySelectorAll('[data-campaign-slot]');
    if (!list.length || !slots.length) return;
    var es = (document.documentElement.lang || 'en').indexOf('es') === 0;
    var now = new Date();
    var html = '';
    list.forEach(function (k) {
      if (!k || !k.inicio || !k.fin) return;
      var a = new Date(k.inicio + 'T00:00:00-06:00'), b = new Date(k.fin + 'T23:59:59-07:00');
      if (now < a || now > b) return;
      var esc = function (s) { return String(s || '').replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; }); };
      var title = es ? k.titulo_es : k.titulo_en, text = es ? k.texto_es : k.texto_en, btn = es ? k.boton_es : k.boton_en;
      html += '<aside class="promo" aria-label="' + esc(title) + '"><div class="wrap"><p><strong>' + esc(title) + '</strong> — ' + esc(text) + '</p>' +
        (k.enlace ? '<a class="btn btn-light btn-sm" href="' + esc(k.enlace) + '" target="_blank" rel="noopener" data-track="campaign_click">' + esc(btn || (es ? 'Donar' : 'Give')) + '</a>' : '') + '</div></aside>';
    });
    slots.forEach(function (s) { s.innerHTML = html; });
  })();

  document.querySelectorAll('[data-until]').forEach(function (el) {
    var until = new Date(el.getAttribute('data-until') + 'T23:59:59-07:00');
    if (new Date() > until) el.hidden = true;
  });

  /* ---- Medición (SEM / Google Ad Grants) ----
     No se carga nada hasta que se escriba un ID de GA4 en GS_CONFIG.ga4.
     Entonces se pide consentimiento antes de activar la analítica. */
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  function track(name, params) {
    try {
      window.dataLayer.push({ event: name, params: params || {} });
      if (window.gtag && window.__gsAnalytics) window.gtag('event', name, params || {});
    } catch (e) {}
  }
  window.gsTrack = track;
  function loadGA(id) {
    var s = document.createElement('script');
    s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.appendChild(s);
    window.gtag = gtag; gtag('js', new Date()); gtag('config', id, { anonymize_ip: true });
    window.__gsAnalytics = true;
  }
  if (CFG.ga4) {
    var choice = null;
    try { choice = localStorage.getItem('gs-consent'); } catch (e) {}
    if (choice === 'yes') loadGA(CFG.ga4);
    else if (choice !== 'no') {
      var bar = document.querySelector('.consent');
      if (bar) {
        bar.classList.add('show');
        bar.querySelector('[data-consent="yes"]').addEventListener('click', function () {
          try { localStorage.setItem('gs-consent', 'yes'); } catch (e) {}
          bar.classList.remove('show'); loadGA(CFG.ga4);
        });
        bar.querySelector('[data-consent="no"]').addEventListener('click', function () {
          try { localStorage.setItem('gs-consent', 'no'); } catch (e) {}
          bar.classList.remove('show');
        });
      }
    }
  }
  // Eventos de conversión: clics en donar, salida a Colorado Gives, correo y redes
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a,button');
    if (!a) return;
    var t = a.getAttribute('data-track');
    if (t) track(t, { label: (a.textContent || '').trim().slice(0, 60), page: location.pathname });
    else if (a.href && a.href.indexOf('coloradogives.org') > -1 && !a.hasAttribute('data-give-cta')) track('donate_outbound', { page: location.pathname });
  });

  /* ---- Formularios (Web3Forms) ---- */
  var MSG = {
    es: { sending: 'Enviando…', err: 'No pudimos enviarlo. Revisa tu conexión e inténtalo otra vez.' },
    en: { sending: 'Sending…', err: "We couldn't send it. Check your connection and try again." }
  }[LANG];
  document.querySelectorAll('form[data-w3f]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var status = form.querySelector('.form-status');
      var btn = form.querySelector('[type="submit"]');
      if (form.querySelector('.hp input') && form.querySelector('.hp input').checked) return;
      if (!CFG.web3formsKey) { if (status) { status.className = 'form-status err'; status.textContent = MSG.err; } return; }
      var data = new FormData(form);
      data.append('access_key', CFG.web3formsKey);
      data.append('subject', form.getAttribute('data-subject') || 'GuateStar · sitio web');
      data.append('from_name', 'Sitio web GuateStar');
      var label = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = MSG.sending; }
      fetch('https://api.web3forms.com/submit', { method: 'POST', body: data, headers: { Accept: 'application/json' } })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (!j.success) throw new Error('fail');
          form.reset();
          if (status) { status.className = 'form-status ok'; status.textContent = form.getAttribute('data-ok'); }
          track(form.getAttribute('data-event') || 'form_submit', { form: form.getAttribute('data-subject') });
        })
        .catch(function () { if (status) { status.className = 'form-status err'; status.textContent = MSG.err; } })
        .then(function () { if (btn) { btn.disabled = false; btn.textContent = label; } });
    });
  });
})();
