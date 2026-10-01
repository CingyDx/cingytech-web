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
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
  window.addEventListener('resize', () => { if (window.innerWidth > 760) closeMenu(); });

  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const reveals = document.querySelectorAll('.reveal');
    if (reveals.length) {
      document.documentElement.classList.add('js-reveal');
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.08, rootMargin: '0px 0px 36px 0px' });
      reveals.forEach(element => observer.observe(element));
    }
  }

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
      setStatus('Odeslání se nepovedlo. Zkuste to znovu nebo nám napište přímo na contact.cingytech@proton.me.', 'error');
    } finally {
      submit.disabled = false;
      submit.innerHTML = 'Odeslat poptávku <span aria-hidden="true">↗</span>';
    }
  });
})();
