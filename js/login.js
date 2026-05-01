(function () {
  document.addEventListener("DOMContentLoaded", async () => {
    const loginForm = document.getElementById("login-form");
    const signupForm = document.getElementById("signup-form");
    const current = document.getElementById("auth-current");
    const note = document.getElementById("auth-note");
    if (!loginForm || !signupForm || !current || !note) return;

    async function render() {
      const user = await GameAuth.getUser();
      note.textContent = GameAuth.authNote();
      if (!user) {
        current.classList.add("hidden");
        loginForm.classList.remove("hidden");
        signupForm.classList.remove("hidden");
        return;
      }

      current.classList.remove("hidden");
      loginForm.classList.add("hidden");
      signupForm.classList.add("hidden");
      current.innerHTML = `
        <p class="eyebrow">Logged in</p>
        <h2>${user.name || user.email}</h2>
        <p class="muted">${user.email || ""}</p>
        <div class="button-row">
          <a class="btn" href="duel-lobby.html">Online Duel</a>
          <button class="btn secondary" id="logout-btn" type="button">Log Out</button>
        </div>
      `;
      document.getElementById("logout-btn").addEventListener("click", async () => {
        await GameAuth.logout();
        UI.toast("Logged out.");
        render();
      });
    }

    await GameAuth.init();
    render();

    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        await GameAuth.login(loginForm.email.value, loginForm.password.value);
        UI.toast("Logged in.");
        render();
      } catch (error) {
        UI.toast(error.message || "Login failed.");
      }
    });

    signupForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        await GameAuth.signup(signupForm.email.value, signupForm.password.value, signupForm.name.value);
        UI.toast("Account created.");
        render();
      } catch (error) {
        UI.toast(error.message || "Signup failed.");
      }
    });
  });
})();
