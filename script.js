(function () {
  const THEME_STORAGE_KEY = 'cingy-theme';
  const BRAND_THEME_COLOR = '#03b1f9';

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
    setupContactForm();
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

    return normalized || '/';
  }

  function highlightNav() {
    const links = document.querySelectorAll('.site-nav a.nav-link');
    const currentPath = normalizePathname(window.location.pathname);

    links.forEach((link) => {
      const href = link.getAttribute('href');
      if (!href) return;

      const targetPath = normalizePathname(new URL(href, window.location.href).pathname);
      const isBlogIndex = targetPath.endsWith('/blog') && currentPath.startsWith(targetPath + '/');

      if (targetPath === currentPath || isBlogIndex) {
        link.classList.add('active');
      }
    });
  }

  function setupNavToggle() {
    const button = document.getElementById('nav-toggle');
    const nav = document.getElementById('site-nav');
    if (!button || !nav) return;

    function closeNav() {
      nav.classList.remove('open');
      button.setAttribute('aria-expanded', 'false');
    }

    button.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
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
    function setStatus(text, type) {
      if (!status) return;
      status.textContent = text;
      status.className = 'form-status' + (type ? ` ${type}` : '');
    }

    form.addEventListener('submit', function (event) {
      const nameValue = (form.querySelector('[name="name"]')?.value || '').trim();
      const emailValue = (form.querySelector('[name="email"]')?.value || '').trim();
      const messageValue = (form.querySelector('[name="message"]')?.value || '').trim();

      if (!nameValue || !emailValue || !messageValue) {
        event.preventDefault();
        setStatus('Vyplňte prosím všechna pole.', 'error');
        return;
      }

      setStatus('Odesílám zprávu...', 'success');
    });
  }
})();
