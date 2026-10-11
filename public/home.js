(() => {
  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.site-nav');
  const form = document.querySelector('#contact-form');
  const status = document.querySelector('#form-status');
  const submit = form?.querySelector('button[type="submit"]');
  const campaignFields = ['utm_source', 'utm_medium', 'utm_campaign'];
  const campaignKey = 'cingy-campaign-v1';

  function closeMenu() {
    if (!menu || !nav) return;
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', 'Otevřít nabídku');
    nav.classList.remove('open');
    document.body.classList.remove('menu-open');
  }

  menu?.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Zavřít nabídku' : 'Otevřít nabídku');
    nav.classList.toggle('open', open);
    document.body.classList.toggle('menu-open', open);
  });
  nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.querySelector('.header-cta')?.addEventListener('click', closeMenu);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
  window.addEventListener('resize', () => { if (window.innerWidth > 760) closeMenu(); });

  // Keep section navigation on the clean landing URL. Native hrefs remain
  // available for shared deep links, new tabs and visitors without JavaScript.
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href^="#"]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    let target;
    try { target = document.getElementById(decodeURIComponent(link.hash.slice(1))); } catch (_) { return; }
    if (!target) return;
    event.preventDefault();
    const root = document.documentElement;
    const animate = !root.classList.contains('motion-disabled') && (root.classList.contains('motion-enabled') || !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    target.scrollIntoView({ behavior: animate ? 'smooth' : 'instant', block: 'start' });
    if (!target.hasAttribute('tabindex')) {
      target.setAttribute('tabindex', '-1');
      target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
    }
    target.focus({ preventScroll: true });
    if (location.hash) history.replaceState(history.state, '', location.pathname + location.search);
  });

  const query = new URLSearchParams(window.location.search);
  if (query.has('utm_source')) {
    const campaign = {};
    campaignFields.forEach(key => { campaign[key] = (query.get(key) || '').trim().slice(0, 120); });
    try { sessionStorage.setItem(campaignKey, JSON.stringify(campaign)); } catch (_) { /* optional attribution */ }
  }

  function setStatus(message, type = '') {
    if (!status) return;
    status.textContent = message;
    status.className = 'form-status' + (type ? ' ' + type : '');
  }

  form?.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const message = form.elements.message.value.trim();
    if (!form.elements.name.value.trim() || !message) {
      setStatus('Vyplňte prosím jméno a popis projektu.', 'error');
      return;
    }
    if (message.length > 4000) {
      setStatus('Zpráva je příliš dlouhá. Zkraťte ji prosím na 4000 znaků.', 'error');
      return;
    }
    submit.disabled = true;
    submit.textContent = 'Odesílám…';
    setStatus('Odesílám poptávku…');
    try {
      const data = new FormData(form);
      let campaign = {};
      try { campaign = JSON.parse(sessionStorage.getItem(campaignKey) || '{}'); } catch (_) { /* optional attribution */ }
      campaignFields.forEach(key => data.set(key, campaign[key] || ''));
      const response = await fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(data).toString(),
        credentials: 'same-origin'
      });
      if (!response.ok) throw new Error('Form submit failed');
      form.reset();
      setStatus('Poptávka byla odeslána. Ozveme se vám co nejdříve.', 'success');
      try { window.CingyAds?.trackLead(); } catch (_) { /* tracking must not affect delivery */ }
    } catch (_) {
      setStatus('Odeslání se nepovedlo. Zkuste to znovu nebo nám napište přímo na ', 'error');
      if (status) {
        const emailLink = document.createElement('a');
        emailLink.href = 'mailto:contact.cingytech@pm.me';
        emailLink.textContent = 'contact.cingytech@pm.me';
        status.append(emailLink, '.');
      }
    } finally {
      submit.disabled = false;
      submit.innerHTML = 'Odeslat poptávku <span aria-hidden="true">↗</span>';
    }
  });
})();
