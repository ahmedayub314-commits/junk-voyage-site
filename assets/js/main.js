/* Junk Voyage — site behaviour
   ==================================================================
   FORM DELIVERY — CONFIGURED

   Estimate requests POST to Web3Forms and arrive at
   JunkvoyageMn@gmail.com. Free tier covers 250 submissions a month.

   The access key below is PUBLIC by design — it ships in the page
   source, which is how Web3Forms works. It is not a password and it
   gives nobody access to the inbox. The only thing it allows is
   sending to that address, so if the form ever starts attracting
   spam, turn on hCaptcha in the Web3Forms dashboard. There is already
   a hidden honeypot field catching basic bots.

   To change the destination address, generate a new key at
   web3forms.com for the new address and replace it here.
   ================================================================== */
const FORM_ACCESS_KEY = 'a3f81615-6387-4099-ad99-27c9c4668053';

const FORM_ENDPOINT = 'https://api.web3forms.com/submit';
const BUSINESS_EMAIL = 'JunkvoyageMn@gmail.com';

// Web3Forms rejects a request with no key, so treat "endpoint set but key
// missing" as not-configured and use the email fallback. This stops a
// half-finished setup from breaking the form for real customers.
const FORM_READY = Boolean(
  FORM_ENDPOINT && (FORM_ACCESS_KEY || !/web3forms\.com/.test(FORM_ENDPOINT))
);

/* ---------- Mobile navigation ---------- */
(function () {
  const openBtn = document.querySelector('[data-nav-open]');
  const closeBtn = document.querySelector('[data-nav-close]');
  const panel = document.querySelector('.mobile-nav');
  if (!openBtn || !panel) return;

  const open = () => { panel.classList.add('is-open'); document.body.classList.add('nav-open'); };
  const close = () => { panel.classList.remove('is-open'); document.body.classList.remove('nav-open'); };

  openBtn.addEventListener('click', open);
  if (closeBtn) closeBtn.addEventListener('click', close);
  panel.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
})();

/* ---------- Quote forms ---------- */
(function () {
  const forms = document.querySelectorAll('form[data-quote-form]');
  if (!forms.length) return;

  forms.forEach(form => {
    const msg = form.querySelector('.form-msg');
    const btn = form.querySelector('button[type="submit"]');

    const say = (text, kind) => {
      if (!msg) return;
      msg.textContent = text;
      msg.className = 'form-msg is-' + kind;
    };

    /* ---- optional photo attachments ---- */
    const fileInput = form.querySelector('[data-file-input]');
    const fileList = form.querySelector('[data-filelist]');
    const fileNote = form.querySelector('[data-filenote]');
    const drop = form.querySelector('[data-filedrop]');

    const kb = n => (n < 1024 * 1024
      ? Math.max(1, Math.round(n / 1024)) + ' KB'
      : (n / 1024 / 1024).toFixed(1) + ' MB');

    const note = (text, kind) => {
      if (!fileNote) return;
      fileNote.textContent = text || '';
      fileNote.hidden = !text;
      fileNote.className = 'file-note' + (kind === 'err' ? ' is-err' : '');
    };

    const renderFiles = () => {
      if (!fileList) return;
      fileList.innerHTML = '';
      const files = [...fileInput.files];
      files.forEach((f, i) => {
        const li = document.createElement('li');
        li.innerHTML =
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
          'stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/>' +
          '<circle cx="8.5" cy="10" r="1.6"/><path d="m21 15-4.5-4.5L7 20"/></svg>' +
          '<span></span><em>' + kb(f.size) + '</em>' +
          '<button type="button" aria-label="Remove ' + f.name + '">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" ' +
          'stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>';
        li.querySelector('span').textContent = f.name;
        li.querySelector('button').addEventListener('click', () => {
          const keep = [...fileInput.files].filter((_, j) => j !== i);
          commit(keep, true);
        });
        fileList.appendChild(li);
      });
      if (files.length) {
        const total = files.reduce((n, f) => n + f.size, 0);
        note(files.length + (files.length === 1 ? ' photo' : ' photos') + ' attached · ' + kb(total));
      } else {
        note('');
      }
    };

    // Assign a chosen set back onto the input, enforcing the limits.
    const MAX_FILES = 5;
    const MAX_TOTAL = 15 * 1024 * 1024;

    const commit = (incoming, silent) => {
      let files = incoming.filter(f => f.size > 0);
      let problem = '';

      const bad = files.filter(f => !/^image\//.test(f.type) && !/\.(heic|heif|pdf)$/i.test(f.name));
      if (bad.length) {
        problem = 'Only photos or PDFs, please — ' + bad[0].name + ' was skipped.';
        files = files.filter(f => !bad.includes(f));
      }
      if (files.length > MAX_FILES) {
        problem = 'Up to ' + MAX_FILES + ' photos. The extras were left off — text the rest to 612-465-9587.';
        files = files.slice(0, MAX_FILES);
      }
      let total = files.reduce((n, f) => n + f.size, 0);
      while (files.length && total > MAX_TOTAL) {
        files.pop();
        total = files.reduce((n, f) => n + f.size, 0);
        problem = 'That is over 15 MB, so the last photo was left off. Text the rest to 612-465-9587.';
      }

      const dt = new DataTransfer();
      files.forEach(f => dt.items.add(f));
      fileInput.files = dt.files;

      renderFiles();
      if (problem) note(problem, 'err');
      else if (silent && !files.length) note('');
    };

    if (fileInput) {
      fileInput.addEventListener('change', () => commit([...fileInput.files]));

      if (drop) {
        ['dragenter', 'dragover'].forEach(ev =>
          drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('is-over'); }));
        ['dragleave', 'drop'].forEach(ev =>
          drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('is-over'); }));
        drop.addEventListener('drop', e => {
          if (e.dataTransfer && e.dataTransfer.files.length) {
            commit([...fileInput.files, ...e.dataTransfer.files]);
          }
        });
      }
    }

    form.addEventListener('submit', async e => {
      e.preventDefault();

      const data = Object.fromEntries(new FormData(form).entries());

      // The booking form collects an address and a time window, so it gets its own
      // subject line — a booking needs acting on faster than a price question.
      const isBooking = form.hasAttribute('data-booking');

      if (!data.name || !data.phone) {
        say('Please add your name and a phone number so we can reach you.', 'err');
        return;
      }
      // A booking with no address is not a booking.
      if (isBooking && !data.address) {
        say('We need the pickup address to book a time. Add the street address and try again.', 'err');
        form.querySelector('[name=address]').focus();
        return;
      }
      // Honeypot — bots fill hidden fields, people do not.
      if (data.company) return;

      const photos = fileInput ? [...fileInput.files] : [];

      const where = [data.address, data.city, data.zip].filter(Boolean).join(', ');

      const lines = (isBooking ? [
        '*** BOOKING REQUEST ***',
        '',
        'Name: ' + data.name,
        'Phone: ' + data.phone,
        'Email: ' + (data.email || '—'),
        '',
        'Address: ' + (where || '—'),
        'Access notes: ' + (data.access || '—'),
        '',
        'When: ' + (data.when || '—'),
        'Preferred date: ' + (data.date || 'not specified'),
        'Time window: ' + (data.window || '—'),
        '',
        'Service: ' + (data.service || '—'),
        'Rough size: ' + (data.size || '—')
      ] : [
        'Name: ' + data.name,
        'Phone: ' + data.phone,
        'Email: ' + (data.email || '—'),
        'Address / City: ' + (where || '—'),
        'Service needed: ' + (data.service || '—'),
        'When: ' + (data.when || '—')
      ]).concat([
        'Photos: ' + (photos.length
          ? photos.length + ' (' + photos.map(f => f.name).join(', ') + ') — please attach before sending'
          : 'none'),
        '',
        'Details:',
        data.details || '—'
      ]).join('\n');

      if (FORM_READY) {
        const original = btn ? btn.textContent : '';
        if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
        try {
          const payload = new FormData(form);
          // An untouched file input still submits one empty entry, which would
          // reach the inbox as a 0-byte attachment. Drop it when nothing was picked.
          if (!photos.length) payload.delete('photos');
          payload.delete('company');                    // honeypot, no need to send it
          if (FORM_ACCESS_KEY) payload.append('access_key', FORM_ACCESS_KEY);
          payload.append('subject', (isBooking ? 'BOOKING REQUEST — ' : 'Free estimate request — ') + data.name
            + (isBooking && data.when ? ' (' + data.when + ')' : ''));
          // So hitting Reply in the inbox goes straight back to the customer.
          if (data.email) payload.append('replyto', data.email);
          const res = await fetch(FORM_ENDPOINT, {
            method: 'POST',
            headers: { Accept: 'application/json' },
            body: payload
          });
          if (!res.ok) throw new Error('Request failed: ' + res.status);
          form.reset();
          if (fileInput) { fileInput.value = ''; renderFiles(); }
          say(isBooking
            ? 'Booking request received — thank you. We will confirm your time by text or call, usually within the hour. Need it sooner? Call 612-465-9587 any time, day or night.'
            : 'Got it — thank you' + (photos.length ? ', photos and all' : '') +
              '. We will call you back shortly. Need it gone right now? Call 612-465-9587 any time, day or night.', 'ok');
        } catch (err) {
          say('That did not go through (' + err.message + '). Please call or text 612-465-9587 and we will take care of it.', 'err');
        } finally {
          if (btn) { btn.disabled = false; btn.textContent = original; }
        }
        return;
      }

      // No endpoint configured — hand off to the visitor's email app.
      const subject = (isBooking ? 'Booking request — ' : 'Free estimate request — ') + data.name;
      window.location.href =
        'mailto:' + BUSINESS_EMAIL +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(lines);
      // A mailto: link physically cannot carry attachments, so say so plainly
      // rather than letting someone think their photos went with it.
      say(photos.length
        ? 'Opening your email app with the details filled in. Your ' +
          (photos.length === 1 ? 'photo' : photos.length + ' photos') +
          ' could not be attached automatically — add them to that email before you send it, ' +
          'or just text them to 612-465-9587, which is faster.'
        : 'Opening your email app with the details filled in — just press send. If nothing opened, email ' +
          BUSINESS_EMAIL + ' or call 612-465-9587 and we will take care of it.', 'ok');
    });
  });
})();

/* ---------- Service-area map ----------
   Clicking a city in the list highlights its pin, and clicking a pin
   highlights the list entry. Click the same one again to clear it.      */
(function () {
  document.querySelectorAll('[data-map]').forEach(wrap => {
    const pins = [...wrap.querySelectorAll('.map-pin')];
    const buttons = [...wrap.querySelectorAll('.area-list button')];
    const caption = wrap.querySelector('[data-map-caption]');
    if (!pins.length || !buttons.length) return;

    const DEFAULT = caption ? caption.innerHTML : '';
    let current = null;

    const select = slug => {
      current = slug === current ? null : slug;
      pins.forEach(p => p.classList.toggle('is-active', p.dataset.city === current));
      buttons.forEach(b => b.classList.toggle('is-active', b.dataset.city === current));

      if (!caption) return;
      if (!current) { caption.innerHTML = DEFAULT; return; }
      const name = buttons.find(b => b.dataset.city === current).textContent.trim();
      caption.innerHTML = 'Yes &mdash; we cover <b>' + name + '</b>. Same-day and 24/7 pickups, ' +
        'free estimate before we start. Call <a href="tel:+16124659587" ' +
        'style="color:var(--blue-600);font-weight:600;">612-465-9587</a>.';
    };

    buttons.forEach(b => b.addEventListener('click', () => select(b.dataset.city)));
    pins.forEach(p => {
      p.addEventListener('click', () => select(p.dataset.city));
      p.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(p.dataset.city); }
      });
    });
  });
})();

/* ---------- Header shadow on scroll ---------- */
(function () {
  const header = document.querySelector('.site-header');
  if (!header) return;
  const onScroll = () => {
    header.style.boxShadow = window.scrollY > 8 ? '0 6px 20px -12px rgba(10,34,64,.45)' : 'none';
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
})();

/* ---------- Current year ---------- */
document.querySelectorAll('[data-year]').forEach(el => {
  el.textContent = new Date().getFullYear();
});
