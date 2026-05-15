(function () {
  const authKeys = [
    "confirmation_token",
    "invite_token",
    "recovery_token",
    "access_token",
    "error",
    "error_description"
  ];

  function hasAuthPayload(value) {
    if (!value) return false;
    return authKeys.some((key) => value.includes(`${key}=`));
  }

  const hash = window.location.hash || "";
  const search = window.location.search || "";
  if (!hasAuthPayload(hash) && !hasAuthPayload(search)) return;

  const loginPath = "/CingyFun/Streetguess/login.html";
  if (window.location.pathname.toLowerCase() === loginPath.toLowerCase()) return;

  const payload = hash || `#${search.slice(1)}`;
  window.location.replace(`${window.location.origin}${loginPath}${payload}`);
})();
