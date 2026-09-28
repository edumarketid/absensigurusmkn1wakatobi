import { GAS_URL, state, setCurrentUser } from './config.js';
import { initApp } from './app.js';

export async function doLogin() {
  const u = document.getElementById("login-user").value.trim();
  const p = document.getElementById("login-pin").value.trim();
  if (!u || !p) { alert("Username & PIN wajib diisi!"); return; }

  const btn = document.getElementById("btn-login");
  const btnText = document.getElementById("btn-login-text");
  btn.disabled = true;
  btnText.innerText = "Memverifikasi...";

  // 1. Fast Cache Authentication
  const cachedAccount = JSON.parse(localStorage.getItem("cached_guru_account"));
  if (cachedAccount && String(cachedAccount.guru.hp) === String(u) && String(cachedAccount.guru.pin) === String(p)) {
    setCurrentUser(cachedAccount);
    localStorage.setItem("user", JSON.stringify(state.currentUser));
    btn.disabled = false;
    btnText.innerText = "Masuk ke Akun";
    initApp();
    return;
  }

  // 2. Local Admin Login
  if (u === "admin" && p === "admin123456") {
    setCurrentUser({ success: true, role: "admin" });
    localStorage.setItem("user", JSON.stringify(state.currentUser));
    btn.disabled = false;
    btnText.innerText = "Masuk ke Akun";
    initApp();
    return;
  }

  // 3. Server Authentication
  if (!navigator.onLine) {
    alert("Login awal akun baru membutuhkan koneksi internet.");
    btn.disabled = false;
    btnText.innerText = "Masuk ke Akun";
    return;
  }

  try {
    const res = await fetch(`${GAS_URL}?action=login&data=${encodeURIComponent(JSON.stringify({username: u, pin: p}))}`).then(r => r.json());
    if (res.success) {
      setCurrentUser(res);
      localStorage.setItem("user", JSON.stringify(res));
      if (res.role === "guru") localStorage.setItem("cached_guru_account", JSON.stringify(res));
      initApp();
    } else {
      alert(res.message);
    }
  } catch(e) {
    alert("Gagal terhubung ke server. Periksa koneksi internet.");
  } finally {
    btn.disabled = false;
    btnText.innerText = "Masuk ke Akun";
  }
}

export function logout() {
  localStorage.removeItem("user");
  setCurrentUser(null);
  location.reload();
}
