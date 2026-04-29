(function () {
  const API_URL = "/api/worldguess";
  const AUTH_KEY = "worldguess-auth-v1";

  function getAuth() {
    try {
      return JSON.parse(localStorage.getItem(AUTH_KEY) || "null");
    } catch {
      return null;
    }
  }

  function setAuth(auth) {
    if (auth) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
    } else {
      localStorage.removeItem(AUTH_KEY);
    }
  }

  async function request(action, payload = {}, options = {}) {
    const auth = getAuth();
    const headers = { "content-type": "application/json" };
    if (!options.public && auth?.token) headers.authorization = `Bearer ${auth.token}`;

    const response = await fetch(API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ action, ...payload })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "WorldGuess API request failed.");
    return data;
  }

  async function login(username, password) {
    const auth = await request("login", { username, password }, { public: true });
    setAuth(auth);
    return auth;
  }

  async function register(username, password) {
    const auth = await request("register", { username, password }, { public: true });
    setAuth(auth);
    return auth;
  }

  async function ensureAuth(displayName) {
    const current = getAuth();
    if (current?.token) return current;

    const base = String(displayName || "player").toLowerCase().replace(/[^a-z0-9_.-]/g, "").slice(0, 14) || "player";

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const suffix = attempt === 0 ? "" : Math.floor(Math.random() * 9999);
      const username = `${base}${suffix}`.slice(0, 20);
      const password = `wg-${crypto.getRandomValues(new Uint32Array(1))[0].toString(16)}`;
      try {
        return await register(username, password);
      } catch (error) {
        if (!String(error.message).includes("exists")) throw error;
      }
    }

    throw new Error("Could not create a temporary online account. Pick another player name.");
  }

  function logout() {
    setAuth(null);
  }

  window.WorldGuessAPI = {
    request,
    login,
    register,
    logout,
    getAuth,
    setAuth,
    ensureAuth
  };
})();
