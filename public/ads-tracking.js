(function () {
  const TAG_ID = 'AW-18484089030';
  const CONVERSION_ID = 'AW-18484089030/rctDCOyXt4sdEMah8-1E';
  const STORAGE_KEY = 'cingy-ads-consent-v1';
  const CHOICE_LIFETIME_MS = 180 * 24 * 60 * 60 * 1000;
  let consent = null;
  let tagLoaded = false;

  function readChoice() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
      if (saved && (saved.choice === 'granted' || saved.choice === 'denied') &&
          Number.isFinite(saved.time) && Date.now() - saved.time < CHOICE_LIFETIME_MS) {
        return saved.choice;
      }
    } catch (error) {
      // A browser may block local storage; show the choice again next visit.
    }
    return null;
  }

  function saveChoice(choice) {
    consent = choice;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ choice, time: Date.now() }));
    } catch (error) {
      // Keep the choice for this page even when storage is unavailable.
    }
  }

  function enableTag() {
    if (tagLoaded) return;
    tagLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied'
    });
    window.gtag('consent', 'update', {
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'denied',
      analytics_storage: 'denied'
    });
    window.gtag('js', new Date());
    window.gtag('config', TAG_ID, { allow_ad_personalization_signals: false });

    const tag = document.createElement('script');
    tag.async = true;
    tag.src = `https://www.googletagmanager.com/gtag/js?id=${TAG_ID}`;
    document.head.appendChild(tag);
  }

  function trackLead() {
    if (consent !== 'granted' || !tagLoaded) return;
    window.gtag('event', 'conversion', {
      send_to: CONVERSION_ID,
      value: 1,
      currency: 'CZK'
    });
  }

  function setupConsent() {
    consent = readChoice();
    if (consent === 'granted') enableTag();

    const banner = document.createElement('aside');
    banner.className = 'ads-consent-banner';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Volba reklamního měření');

    const message = document.createElement('p');
    message.textContent = 'S vaším souhlasem používáme Google Ads k měření odeslaných poptávek. Google může ukládat reklamní cookies. Odmítnutí neomezí web ani formulář. ';
    const privacy = document.createElement('a');
    privacy.href = '/pages/privacy.html';
    privacy.textContent = 'Více o soukromí';
    message.appendChild(privacy);
    banner.appendChild(message);

    const actions = document.createElement('div');
    actions.className = 'ads-consent-actions';
    const reject = document.createElement('button');
    reject.type = 'button';
    reject.className = 'btn ghost';
    reject.textContent = 'Odmítnout';
    const accept = document.createElement('button');
    accept.type = 'button';
    accept.className = 'btn';
    accept.textContent = 'Povolit měření';
    actions.append(reject, accept);
    banner.appendChild(actions);
    document.body.appendChild(banner);

    function showBanner() { banner.hidden = false; }
    function hideBanner() { banner.hidden = true; }
    reject.addEventListener('click', function () {
      const wasGranted = consent === 'granted';
      saveChoice('denied');
      hideBanner();
      if (wasGranted) {
        window.gtag('consent', 'update', {
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
          analytics_storage: 'denied'
        });
        window.location.reload();
      }
    });
    accept.addEventListener('click', function () {
      saveChoice('granted');
      enableTag();
      hideBanner();
    });

    const footer = document.querySelector('.footer-inner');
    if (footer) {
      const settings = document.createElement('button');
      settings.type = 'button';
      settings.className = 'ads-consent-settings';
      settings.textContent = 'Nastavení reklamního měření';
      settings.addEventListener('click', showBanner);
      footer.appendChild(settings);
    }

    if (consent) hideBanner();
  }

  window.CingyAds = { trackLead };
  document.addEventListener('DOMContentLoaded', setupConsent);
})();
