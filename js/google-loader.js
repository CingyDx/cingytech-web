(function () {
  let loadPromise = null;
  let remoteKeyPromise = null;

  function isPlaceholder(value) {
    return !value || value === "PASTE_YOUR_GOOGLE_MAPS_API_KEY_HERE";
  }

  function hasMissingKey() {
    return !window.CONFIG
      || isPlaceholder(CONFIG.GOOGLE_MAPS_API_KEY);
  }

  async function fetchRemoteKey() {
    if (remoteKeyPromise) return remoteKeyPromise;
    remoteKeyPromise = fetch("/api/zabava/config", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => data?.googleMapsApiKey || "")
      .catch(() => "");
    return remoteKeyPromise;
  }

  async function getApiKey() {
    const localKey = window.CONFIG?.GOOGLE_MAPS_API_KEY || "";
    if (!isPlaceholder(localKey)) return localKey;

    const remoteKey = await fetchRemoteKey();
    if (!isPlaceholder(remoteKey)) {
      window.CONFIG = { ...(window.CONFIG || {}), GOOGLE_MAPS_API_KEY: remoteKey };
      return remoteKey;
    }

    return "";
  }

  function showGoogleSetupError(options = {}) {
    if (typeof options === "string") {
      options = { message: options };
    }

    const {
      title = "Missing Google Maps API key",
      eyebrow = "Setup required",
      message = "Google Maps API key is missing. Add GOOGLE_MAPS_API_KEY in Netlify environment variables or add a local key in /js/config.js.",
      details = ""
    } = options;

    document.body.innerHTML = `
      <main class="setup-error">
        <section class="setup-error-card">
          <p class="eyebrow">${eyebrow}</p>
          <h1>${title}</h1>
          <p>${message}</p>
          <p>Enable Google Maps JavaScript API and Geocoding API, then set the browser key here:</p>
          <code>Netlify env: GOOGLE_MAPS_API_KEY<br>Local fallback: js/config.js</code>
          ${details ? `<p class="muted">${details}</p>` : ""}
          <a class="btn" href="../zabava/">Back to game menu</a>
        </section>
      </main>
    `;
  }

  async function loadGoogleMaps() {
    if (window.google?.maps) return Promise.resolve(window.google.maps);
    if (loadPromise) return loadPromise;

    const apiKey = await getApiKey();
    if (isPlaceholder(apiKey)) {
      showGoogleSetupError();
      return Promise.reject(new Error("Missing Google Maps API key"));
    }

    loadPromise = new Promise((resolve, reject) => {
      window.__streetGuessMapsReady = () => resolve(window.google.maps);
      window.gm_authFailure = () => {
        showGoogleSetupError({
          title: "Google Maps key rejected",
          eyebrow: "Google blocked the map",
          message: "The key was loaded from Netlify, but Google rejected it. Check that the copied key is complete, Maps JavaScript API is enabled, billing/trial is active, and website restrictions allow this domain.",
          details: `Current origin: ${location.origin}. Add https://cingy.tech/*, https://www.cingy.tech/* and http://localhost:8888/* in Google Cloud HTTP referrer restrictions.`
        });
        reject(new Error("Google Maps auth failure"));
      };

      const script = document.createElement("script");
      script.async = true;
      script.defer = true;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=marker&callback=__streetGuessMapsReady`;
      script.onerror = () => {
        showGoogleSetupError({
          title: "Google Maps failed to load",
          message: "Google Maps JavaScript API could not be loaded. Check the API key, network connection and Google Cloud API restrictions."
        });
        reject(new Error("Google Maps load error"));
      };
      document.head.appendChild(script);
    });

    return loadPromise;
  }

  window.GoogleLoader = {
    loadGoogleMaps,
    showGoogleSetupError,
    hasMissingKey,
    getApiKey
  };
})();
