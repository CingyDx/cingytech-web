(function () {
  const LOCAL_KEY = "streetguess-local-auth";
  let identityModule = null;
  let identityReady = false;

  function isLocalhost() {
    return ["localhost", "127.0.0.1", "::1"].includes(location.hostname);
  }

  async function loadIdentity() {
    if (identityModule) return identityModule;
    identityModule = await import("https://esm.sh/@netlify/identity?bundle");
    return identityModule;
  }

  function localUser() {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_KEY) || "null");
    } catch {
      return null;
    }
  }

  function saveLocalUser(email, name) {
    const id = `local-${btoa(email).replace(/=+$/g, "").slice(0, 18)}`;
    const user = { id, email, name: name || email.split("@")[0], local: true };
    localStorage.setItem(LOCAL_KEY, JSON.stringify(user));
    return user;
  }

  async function init() {
    if (isLocalhost()) {
      identityReady = false;
      return localUser();
    }

    try {
      const identity = await loadIdentity();
      await identity.handleAuthCallback();
      identityReady = true;
      return await identity.getUser();
    } catch (error) {
      console.warn("StreetGuess auth init failed", error);
      return null;
    }
  }

  async function getUser() {
    if (isLocalhost()) return localUser();
    try {
      const identity = await loadIdentity();
      return await identity.getUser();
    } catch {
      return null;
    }
  }

  async function login(email, password, name = "") {
    if (isLocalhost()) return saveLocalUser(email, name);
    const identity = await loadIdentity();
    return await identity.login(email, password);
  }

  async function signup(email, password, name = "") {
    if (isLocalhost()) return saveLocalUser(email, name);
    const identity = await loadIdentity();
    return await identity.signup(email, password, { full_name: name || email.split("@")[0] });
  }

  async function logout() {
    if (isLocalhost()) {
      localStorage.removeItem(LOCAL_KEY);
      return;
    }
    const identity = await loadIdentity();
    await identity.logout();
  }

  async function authHeaders() {
    const user = await getUser();
    if (!user) return {};
    if (user.local) {
      return {
        "x-streetguess-dev-user": user.id,
        "x-streetguess-dev-name": user.name
      };
    }

    const token = user.token?.access_token
      || user.token?.accessToken
      || user.access_token
      || user.jwt
      || user.id_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  function authNote() {
    if (isLocalhost()) {
      return "Local dev login is only for testing room UI. Real accounts use Netlify Identity after deploy.";
    }
    if (!identityReady) {
      return "Netlify Identity must be enabled on the deployed Netlify site.";
    }
    return "";
  }

  window.GameAuth = {
    init,
    getUser,
    login,
    signup,
    logout,
    authHeaders,
    authNote,
    isLocalhost
  };
})();
