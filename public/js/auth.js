(function () {
  const LOCAL_KEY = "streetguess-local-auth";
  const ADMIN_EMAIL = "krystofcingalek@gmail.com";
  const ADMIN_NAME = "👑 Cingy";
  let identityModule = null;
  let identityReady = false;
  let identityUnavailable = false;
  let identityStatusPromise = null;
  let lastCallback = null;
  let lastMessage = "";

  function isLocalhost() {
    return ["localhost", "127.0.0.1", "::1"].includes(location.hostname);
  }

  async function loadIdentity() {
    if (identityModule) return identityModule;
    identityModule = await import("/js/vendor/netlify-identity.js");
    return identityModule;
  }

  async function checkIdentityAvailable() {
    if (isLocalhost()) return true;
    if (identityStatusPromise) return identityStatusPromise;

    identityStatusPromise = fetch("/.netlify/identity/settings", { cache: "no-store" })
      .then((response) => {
        identityUnavailable = !response.ok;
        return response.ok;
      })
      .catch(() => {
        identityUnavailable = true;
        return false;
      });

    return identityStatusPromise;
  }

  async function ensureIdentity() {
    const available = await checkIdentityAvailable();
    if (!available) {
      throw new Error("Netlify Identity is not enabled on this site yet.");
    }
    return await loadIdentity();
  }

  function localUser() {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_KEY) || "null");
    } catch {
      return null;
    }
  }

  function isAdminEmail(email) {
    return String(email || "").trim().toLowerCase() === ADMIN_EMAIL;
  }

  function decorateUser(user) {
    if (!user) return user;
    const email = user.email || user.user_metadata?.email || "";
    const fallbackName = user.name
      || user.user_metadata?.full_name
      || user.user_metadata?.name
      || email.split("@")[0]
      || "Player";
    if (!isAdminEmail(email)) {
      return {
        ...user,
        name: fallbackName,
        isAdmin: false
      };
    }
    return {
      ...user,
      name: ADMIN_NAME,
      isAdmin: true
    };
  }

  function saveLocalUser(email, name) {
    const id = `local-${btoa(email).replace(/=+$/g, "").slice(0, 18)}`;
    const user = decorateUser({ id, email, name: name || email.split("@")[0], local: true });
    localStorage.setItem(LOCAL_KEY, JSON.stringify(user));
    return user;
  }

  async function init() {
    if (isLocalhost()) {
      identityReady = false;
      return localUser();
    }

    try {
      const available = await checkIdentityAvailable();
      if (!available) return null;

      const identity = await loadIdentity();
      if (!location.hash && location.search && /confirmation_token=|invite_token=|recovery_token=|access_token=|error=/.test(location.search)) {
        history.replaceState(null, "", `${location.pathname}#${location.search.slice(1)}`);
      }
      const callback = await identity.handleAuthCallback();
      if (callback) {
        lastCallback = callback;
        if (callback.type === "confirmation") lastMessage = "Email confirmed. You can log in now.";
        if (callback.type === "recovery") lastMessage = "Set a new password to finish recovery.";
        if (callback.type === "invite") lastMessage = "Invite accepted. Set your password to finish.";
        if (location.hash) history.replaceState(null, "", location.pathname);
      }
      identityReady = true;
      return decorateUser(await identity.getUser());
    } catch (error) {
      console.warn("StreetGuess auth init failed", error);
      return null;
    }
  }

  async function getUser() {
    if (isLocalhost()) return localUser();
    try {
      const available = await checkIdentityAvailable();
      if (!available) return null;

      const identity = await loadIdentity();
      return decorateUser(await identity.getUser());
    } catch {
      return null;
    }
  }

  async function login(email, password, name = "") {
    if (isLocalhost()) return saveLocalUser(email, name);
    const identity = await ensureIdentity();
    try {
      return decorateUser(await identity.login(email, password));
    } catch (error) {
      const message = String(error?.message || "");
      if (message.includes("Email not confirmed") || message.includes("invalid_grant")) {
        throw new Error("Email is not confirmed yet. Open the newest Netlify verification email and confirm it first.");
      }
      throw error;
    }
  }

  async function signup(email, password, name = "") {
    if (isLocalhost()) return saveLocalUser(email, name);
    const identity = await ensureIdentity();
    return decorateUser(await identity.signup(email, password, { full_name: name || email.split("@")[0] }));
  }

  async function requestPasswordRecovery(email) {
    if (isLocalhost()) throw new Error("Password recovery is available only on the deployed site.");
    const identity = await ensureIdentity();
    return await identity.requestPasswordRecovery(email);
  }

  async function updatePassword(password) {
    if (isLocalhost()) throw new Error("Password recovery is available only on the deployed site.");
    const identity = await ensureIdentity();
    const user = decorateUser(await identity.updateUser({ password }));
    lastCallback = null;
    return user;
  }

  async function logout() {
    if (isLocalhost()) {
      localStorage.removeItem(LOCAL_KEY);
      return;
    }
    const identity = await ensureIdentity();
    await identity.logout();
  }

  async function authHeaders() {
    const user = await getUser();
    if (!user) return {};
    if (user.local) {
      return {
        "x-streetguess-dev-user": user.id,
        "x-streetguess-dev-name": user.name,
        "x-streetguess-dev-email": user.email || ""
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
    if (lastMessage) return lastMessage;
    if (isLocalhost()) {
      return "Local dev login stores only a fake email/name in this browser. Real accounts use Netlify Identity after deploy.";
    }
    if (identityUnavailable) {
      return "Netlify Identity is not enabled on this site yet, so real signups/logins will not work until it is enabled in Netlify.";
    }
    if (!identityReady) {
      return "Checking Netlify Identity status...";
    }
    return "";
  }

  function getCallback() {
    return lastCallback;
  }

  window.GameAuth = {
    init,
    getUser,
    login,
    signup,
    requestPasswordRecovery,
    updatePassword,
    logout,
    authHeaders,
    authNote,
    getCallback,
    isLocalhost
  };
})();
