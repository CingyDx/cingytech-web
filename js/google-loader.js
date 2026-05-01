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

  function showGoogleSetupError(message = "Google Maps API key is missing. Add GOOGLE_MAPS_API_KEY in Netlify environment variables or add a local key in /js/config.js.") {
    document.body.innerHTML = `
      <main class="setup-error">
        <section class="setup-error-card">
          <p class="eyebrow">Setup required</p>
          <h1>Missing Google Maps API key</h1>
          <p>${message}</p>
          <p>Enable Google Maps JavaScript API and Geocoding API, then set the browser key here:</p>
          <code>Netlify env: GOOGLE_MAPS_API_KEY<br>Local fallback: js/config.js</code>
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
        showGoogleSetupError("Google Maps API key is invalid or this domain is not allowed.");
        reject(new Error("Google Maps auth failure"));
      };

      const script = document.createElement("script");
      script.async = true;
      script.defer = true;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=marker&callback=__streetGuessMapsReady`;
      script.onerror = () => {
        showGoogleSetupError("Google Maps JavaScript API could not be loaded.");
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
