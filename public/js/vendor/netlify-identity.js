const IDENTITY_PATH = "/.netlify/identity";
const GOTRUE_SCRIPT = "/js/vendor/gotrue.js";
let clientPromise = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      if (window.GoTrue) resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

async function getClient() {
  if (clientPromise) return clientPromise;
  clientPromise = (async () => {
    if (!window.GoTrue) await loadScript(GOTRUE_SCRIPT);
    return new window.GoTrue({
      APIUrl: `${window.location.origin}${IDENTITY_PATH}`,
      audience: "",
      setCookie: false
    });
  })();
  return clientPromise;
}

function setJwtCookie(jwt) {
  if (!jwt) return;
  document.cookie = `nf_jwt=${encodeURIComponent(jwt)}; path=/; secure; samesite=lax`;
}

function clearJwtCookie() {
  document.cookie = "nf_jwt=; path=/; secure; samesite=lax; expires=Thu, 01 Jan 1970 00:00:00 GMT";
}

async function toUser(gotrueUser) {
  if (!gotrueUser) return null;
  const userMetadata = gotrueUser.user_metadata || {};
  const appMetadata = gotrueUser.app_metadata || {};
  const token = gotrueUser.tokenDetails?.() || gotrueUser.token || null;
  const jwt = await gotrueUser.jwt?.().catch(() => null);
  if (jwt) setJwtCookie(jwt);
  return {
    id: gotrueUser.id,
    email: gotrueUser.email,
    name: userMetadata.full_name || userMetadata.name || gotrueUser.email,
    user_metadata: userMetadata,
    app_metadata: appMetadata,
    token,
    jwt
  };
}

function readCallbackParams() {
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  return hash ? new URLSearchParams(hash) : null;
}

function clearHash() {
  if (window.location.hash) {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }
}

export async function handleAuthCallback() {
  const params = readCallbackParams();
  if (!params) return null;
  const client = await getClient();

  const confirmationToken = params.get("confirmation_token");
  if (confirmationToken) {
    const user = await client.confirm(confirmationToken, true);
    clearHash();
    return { type: "confirmation", user: await toUser(user) };
  }

  const recoveryToken = params.get("recovery_token");
  if (recoveryToken) {
    const user = await client.recover(recoveryToken, true);
    clearHash();
    return { type: "recovery", user: await toUser(user) };
  }

  const inviteToken = params.get("invite_token");
  if (inviteToken) {
    clearHash();
    return { type: "invite", user: null, token: inviteToken };
  }

  return null;
}

export async function getUser() {
  const client = await getClient();
  return await toUser(client.currentUser());
}

export async function login(email, password) {
  const client = await getClient();
  return await toUser(await client.login(email, password, true));
}

export async function signup(email, password, data = {}) {
  const client = await getClient();
  return await toUser(await client.signup(email, password, data));
}

export async function requestPasswordRecovery(email) {
  const client = await getClient();
  return await client.requestPasswordRecovery(email);
}

export async function updateUser(updates) {
  const client = await getClient();
  const user = client.currentUser();
  if (!user) throw new Error("No user is currently logged in");
  return await toUser(await user.update(updates));
}

export async function logout() {
  const client = await getClient();
  const user = client.currentUser();
  if (user) await user.logout();
  clearJwtCookie();
}
