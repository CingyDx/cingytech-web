(function () {

  function onReady() {
    const page = document.getElementById('page');
    if (page) {
      setTimeout(() => page.classList.add('loaded'), 60);
    }

    highlightNav();
    setupNavToggle();
    setupInternalLinkTransitions();
    setupContactForm();
    syncHeroImageHeight();
  }

  document.addEventListener('DOMContentLoaded', onReady);

  // ✅ fix: správně navázané resize + load
  window.addEventListener('resize', syncHeroImageHeight);
  window.addEventListener('load', syncHeroImageHeight);

  function syncHeroImageHeight() {
    const heroContent = document.querySelector('.hero-content');
    const heroImage = document.querySelector('.hero-image');
    if (!heroContent || !heroImage) return;

    const stacked = window.matchMedia('(max-width: 900px)').matches;
    if (stacked) {
      heroImage.style.height = 'auto';
      return;
    }

    const h = heroContent.offsetHeight;
    if (h && h > 0) heroImage.style.height = h + 'px';
  }

  function highlightNav() {
    const links = document.querySelectorAll('.site-nav a.nav-link');
    const path = window.location.pathname.split('/').pop() || 'index.html';
    links.forEach(a => {
      const href = a.getAttribute('href');
      if (href === path || (href === 'index.html' && path === '')) {
        a.classList.add('active');
      } else {
        if (path.endsWith(href)) a.classList.add('active');
      }
    });
  }

  function setupNavToggle() {
    const btn = document.getElementById('nav-toggle');
    const nav = document.getElementById('site-nav');
    if (!btn || !nav) return;

    btn.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    nav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        if (nav.classList.contains('open')) {
          nav.classList.remove('open');
          btn.setAttribute('aria-expanded', 'false');
        }
      });
    });
  }

  function setupInternalLinkTransitions() {
    const anchors = document.querySelectorAll('a[href]');
    anchors.forEach(a => {
      const href = a.getAttribute('href') || '';

      if (href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      if (href.startsWith('#')) return;

      a.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

        e.preventDefault();
        const page = document.getElementById('page');
        if (page) {
          page.classList.add('fade-out');
          setTimeout(() => {
            window.location.href = href;
          }, 260);
        } else {
          window.location.href = href;
        }
      });
    });
  }

  // ✅ Netlify Forms submit (AJAX) + zůstaneš na stránce
  function setupContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    const status = document.getElementById('form-status');

    function setStatus(text, type) {
      if (!status) return;
      status.textContent = text;
      status.className = 'form-status' + (type ? ` ${type}` : '');
    }

    function isValidEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      const nameVal = (form.querySelector('[name="name"]')?.value || '').trim();
      const emailVal = (form.querySelector('[name="email"]')?.value || '').trim();
      const messageVal = (form.querySelector('[name="message"]')?.value || '').trim();

      if (!nameVal || !emailVal || !messageVal) {
        setStatus('Vyplňte prosím všechna pole.', 'error');
        return;
      }

      if (!isValidEmail(emailVal)) {
        setStatus('Zadejte prosím platný e-mail.', 'error');
        return;
      }

      setStatus('Odesílám...', 'success');

      try {
        // pošli data Netlify stejným způsobem jako klasický form submit
        const formData = new FormData(form);
        const body = new URLSearchParams(formData).toString();

        const res = await fetch('/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body
        });

        if (!res.ok) throw new Error('Submit failed');

        setStatus('Zpráva byla odeslána. Ozvu se co nejdříve.', 'success');
        form.reset();
      } catch (err) {
        setStatus('Nepodařilo se odeslat. Zkuste to prosím znovu.', 'error');
      }
    });
  }

})();
