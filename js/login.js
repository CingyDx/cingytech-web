(function () {
  document.addEventListener("DOMContentLoaded", async () => {
    const loginForm = document.getElementById("login-form");
    const signupForm = document.getElementById("signup-form");
    const recoveryForm = document.getElementById("recovery-form");
    const resetForm = document.getElementById("password-reset-form");
    const current = document.getElementById("auth-current");
    const note = document.getElementById("auth-note");
    if (!loginForm || !signupForm || !recoveryForm || !resetForm || !current || !note) return;

    function showForms(mode) {
      loginForm.classList.toggle("hidden", mode !== "login");
      signupForm.classList.toggle("hidden", mode !== "login");
      recoveryForm.classList.toggle("hidden", mode !== "recovery");
      resetForm.classList.toggle("hidden", mode !== "reset");
    }

    async function render() {
      const user = await GameAuth.getUser();
      note.textContent = GameAuth.authNote();

      const callback = GameAuth.getCallback?.();
      if (callback?.type === "recovery") {
        current.classList.add("hidden");
        showForms("reset");
        return;
      }

      if (!user) {
        current.classList.add("hidden");
        showForms("login");
        return;
      }

      current.classList.remove("hidden");
      showForms("none");
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
    if (GameAuth.authNote()) UI.toast(GameAuth.authNote());
    render();

    document.getElementById("show-recovery-btn")?.addEventListener("click", () => {
      recoveryForm.email.value = loginForm.email.value || "";
      showForms("recovery");
    });

    document.getElementById("cancel-recovery-btn")?.addEventListener("click", () => {
      showForms("login");
    });

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
        const user = await GameAuth.signup(signupForm.email.value, signupForm.password.value, signupForm.name.value);
        UI.toast(user?.emailVerified === false ? "Account created. Check your email to confirm it." : "Account created.");
        render();
        if (user?.emailVerified === false) {
          note.textContent = `Verification email sent to ${signupForm.email.value}. Open the newest email, confirm it, then log in here.`;
        }
      } catch (error) {
        UI.toast(error.message || "Signup failed.");
      }
    });

    recoveryForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        await GameAuth.requestPasswordRecovery(recoveryForm.email.value);
        UI.toast("Password reset email sent.");
        showForms("login");
      } catch (error) {
        UI.toast(error.message || "Password recovery failed.");
      }
    });

    resetForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        await GameAuth.updatePassword(resetForm.password.value);
        UI.toast("Password updated.");
        history.replaceState(null, "", location.pathname);
        render();
      } catch (error) {
        UI.toast(error.message || "Password update failed.");
      }
    });
  });
})();
