(function () {
  const THEME_STORAGE_KEY = 'cingy-theme';
  const CAMPAIGN_STORAGE_KEY = 'cingy-campaign-v1';
  const CAMPAIGN_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign'];
  const BRAND_THEME_COLOR = '#0b0b12';

  applyInitialTheme();
  document.documentElement.classList.add('js');

  function onReady() {
    const page = document.getElementById('page');
    if (page) {
      window.setTimeout(() => page.classList.add('loaded'), 40);
    }

    setupThemeToggle();
    highlightNav();
    setupNavToggle();
    setupInternalLinkTransitions();
    setupRevealAnimations();
    captureCampaign();
    setupContactForm();
  }

  function captureCampaign() {
    const query = new URLSearchParams(window.location.search || '');
    if (!query.has('utm_source')) return;
    const campaign = {};
    for (const key of CAMPAIGN_FIELDS) {
      campaign[key] = (query.get(key) || '').trim().slice(0, 120);
    }
    try {
      window.sessionStorage.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify(campaign));
    } catch (error) {
      // Attribution is optional; it must never block the form.
    }
  }

  function readCampaign() {
    try {
      const data = JSON.parse(window.sessionStorage.getItem(CAMPAIGN_STORAGE_KEY) || '{}');
      return data && typeof data === 'object' ? data : {};
    } catch (error) {
      return {};
    }
  }

  document.addEventListener('DOMContentLoaded', onReady);

  function applyInitialTheme() {
    const storedTheme = readStoredTheme();
    const initialTheme = storedTheme === 'light' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', initialTheme);
    updateThemeColorMeta(initialTheme);
  }

  function readStoredTheme() {
    try {
      return window.localStorage.getItem(THEME_STORAGE_KEY);
    } catch (error) {
      return null;
    }
  }

  function storeTheme(theme) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      // Ignore storage errors and keep the in-memory theme.
    }
  }

  function getActiveTheme() {
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  function updateThemeColorMeta() {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;

    meta.setAttribute('content', BRAND_THEME_COLOR);
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    storeTheme(theme);
    updateThemeColorMeta();
    updateThemeToggle(document.querySelector('.theme-toggle'), theme);
  }

  function updateThemeToggle(toggle, theme) {
    if (!toggle) return;

    const label = toggle.querySelector('.theme-toggle-label');
    const isLight = theme === 'light';

    toggle.setAttribute('aria-pressed', isLight ? 'true' : 'false');
    toggle.setAttribute('title', isLight ? 'Přepnout na tmavý režim' : 'Přepnout na světlý režim');

    if (label) {
      label.textContent = isLight ? 'Světlý' : 'Tmavý';
    }
  }

  function setupThemeToggle() {
    if (document.body.classList.contains('subpage')) return;
    const headerInner = document.querySelector('.header-inner');
    const nav = headerInner?.querySelector('.site-nav');
    const navToggle = headerInner?.querySelector('.nav-toggle');
    if (!headerInner || !nav || !navToggle) return;

    let controls = headerInner.querySelector('.header-controls');
    if (!controls) {
      controls = document.createElement('div');
      controls.className = 'header-controls';
      headerInner.appendChild(controls);
      controls.appendChild(nav);

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'theme-toggle';
      toggle.setAttribute('aria-label', 'Přepnout barevný režim');

      const track = document.createElement('span');
      track.className = 'theme-toggle-track';
      track.setAttribute('aria-hidden', 'true');

      const thumb = document.createElement('span');
      thumb.className = 'theme-toggle-thumb';
      track.appendChild(thumb);

      const label = document.createElement('span');
      label.className = 'theme-toggle-label';

      toggle.appendChild(track);
      toggle.appendChild(label);

      controls.appendChild(toggle);
      controls.appendChild(navToggle);
    }

    const toggle = controls.querySelector('.theme-toggle');
    if (!toggle || toggle.dataset.ready === 'true') {
      updateThemeToggle(toggle, getActiveTheme());
      return;
    }

    updateThemeToggle(toggle, getActiveTheme());
    toggle.dataset.ready = 'true';

    toggle.addEventListener('click', () => {
      const nextTheme = getActiveTheme() === 'light' ? 'dark' : 'light';
      setTheme(nextTheme);
    });
  }

  function normalizePathname(pathname) {
    if (!pathname) return '/';

    let normalized = pathname.replace(/\/+/g, '/');

    if (normalized.endsWith('/index.html')) {
      normalized = normalized.slice(0, -'/index.html'.length) || '/';
    }

    if (normalized.length > 1 && normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }

    return normalized.replace(/\.html$/, '') || '/';
  }

  function highlightNav() {
    const links = document.querySelectorAll('.site-nav a.nav-link');
    const currentPath = normalizePathname(window.location.pathname);

    links.forEach((link) => {
      const href = link.getAttribute('href');
      if (!href) return;

      const targetUrl = new URL(href, window.location.href);
      const targetPath = normalizePathname(targetUrl.pathname);
      const isBlogIndex = targetPath.endsWith('/blog') && currentPath.startsWith(targetPath + '/');
      const pointsToSection = Boolean(targetUrl.hash);

      if (pointsToSection && targetUrl.hash !== window.location.hash) {
        link.classList.remove('active');
        return;
      }

      if (window.location.hash && !pointsToSection && targetPath === currentPath) {
        link.classList.remove('active');
        return;
      }

      if (targetPath === currentPath || isBlogIndex) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    });
  }

  function setupNavToggle() {
    const button = document.getElementById('nav-toggle');
    const nav = document.getElementById('site-nav');
    if (!button || !nav) return;
    const label = button.querySelector('.sr-only');

    function setNavOpen(isOpen) {
      nav.classList.toggle('open', isOpen);
      document.documentElement.classList.toggle('nav-open', isOpen);
      button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');

      if (label) {
        label.textContent = isOpen ? 'Zavřít navigaci' : 'Otevřít navigaci';
      }
    }

    function closeNav() {
      setNavOpen(false);
    }

    closeNav();

    button.addEventListener('click', () => {
      setNavOpen(!nav.classList.contains('open'));
    });

    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', closeNav);
    });

    document.addEventListener('click', (event) => {
      if (!nav.classList.contains('open')) return;
      if (nav.contains(event.target) || button.contains(event.target)) return;
      closeNav();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeNav();
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 720) {
        closeNav();
      }
    });
  }

  function setupInternalLinkTransitions() {
    // Native navigation keeps Back/Forward reliable; entrance motion belongs
    // to the arriving page and never delays a customer's click.
    if (document.body.classList.contains('subpage')) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const anchors = document.querySelectorAll('a[href]');

    anchors.forEach((anchor) => {
      const href = anchor.getAttribute('href');
      if (!href) return;
      if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      if (anchor.hasAttribute('download') || anchor.target === '_blank') return;

      const targetUrl = new URL(href, window.location.href);
      if (targetUrl.origin !== window.location.origin) return;

      if (targetUrl.pathname === window.location.pathname && targetUrl.hash) return;

      anchor.addEventListener('click', (event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

        const page = document.getElementById('page');
        if (!page) return;

        event.preventDefault();
        page.classList.add('fade-out');

        window.setTimeout(() => {
          window.location.assign(targetUrl.href);
        }, 240);
      });
    });
  }

  function setupRevealAnimations() {
    if (document.body.classList.contains('subpage')) return;
    const items = document.querySelectorAll('.reveal');
    if (!items.length) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      items.forEach((item) => item.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, {
      rootMargin: '0px 0px -10% 0px',
      threshold: 0.12
    });

    items.forEach((item) => observer.observe(item));
  }

  function setupContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    const status = document.getElementById('form-status');
    const submitButton = form.querySelector('button[type="submit"]');
    const defaultLabel = submitButton ? submitButton.textContent : '';

    function setStatus(text, type) {
      if (!status) return;
      status.textContent = text;
      status.className = 'form-status' + (type ? ` ${type}` : '');
    }

    function setSubmitError() {
      if (!status) return;
      status.className = 'form-status error';
      status.textContent = 'Odeslání se nepovedlo. Napište mi prosím na ';
      const emailLink = document.createElement('a');
      emailLink.href = 'mailto:contact.cingytech@proton.me';
      emailLink.textContent = 'contact.cingytech@proton.me';
      status.append(emailLink, '.');
    }

    function setSubmitting(isSubmitting) {
      if (!submitButton) return;
      submitButton.disabled = isSubmitting;
      submitButton.textContent = isSubmitting ? 'Odesílám...' : defaultLabel;
    }

    form.addEventListener('submit', async function (event) {
      const nameValue = (form.querySelector('[name="name"]')?.value || '').trim();
      const emailValue = (form.querySelector('[name="email"]')?.value || '').trim();
      const messageValue = (form.querySelector('[name="message"]')?.value || '').trim();

      if (!nameValue || !emailValue || !messageValue) {
        event.preventDefault();
        setStatus('Vyplňte prosím všechna pole.', 'error');
        return;
      }

      if (messageValue.length > 4000) {
        event.preventDefault();
        setStatus('Zpráva je moc dlouhá. Zkraťte ji prosím na 4000 znaků.', 'error');
        return;
      }

      event.preventDefault();
      setSubmitting(true);
      setStatus('Odesílám zprávu...', 'success');

      try {
        const formData = new FormData(form);
        for (const key of CAMPAIGN_FIELDS) {
          if (typeof formData.set === 'function') formData.set(key, readCampaign()[key] || '');
        }
        const body = new URLSearchParams(formData).toString();
        const target = form.getAttribute('action') || '/';

        const response = await fetch(target, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
          credentials: 'same-origin'
        });

        if (!response.ok) {
          throw new Error('Submit failed');
        }

        form.reset();
        setStatus('Zpráva byla odeslána. Ozvu se co nejdříve.', 'success');
        try {
          window.CingyAds?.trackLead();
        } catch (trackingError) {
          // Measurement must not turn a delivered message into a form error.
        }
      } catch (error) {
        setSubmitError();
      } finally {
        setSubmitting(false);
      }
    });
  }
})();
