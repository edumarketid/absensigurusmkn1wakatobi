import { GAS_URL, state, setCurrentUser, setGlobalConfig } from './config.js';
import { doLogin, logout } from './auth.js';
import { renderCachedConfig, switchTab, openModalGuru, closeModalGuru, openModalGantiPin, closeModalGantiPin, closeModalEditAbsen } from './ui.js';
import { kirimAbsen, loadRiwayat, syncOfflineData } from './absen.js';
import { setLokasiSaatIni } from './geofence.js';
import { loadAdminData, simpanDataGuru, simpanKoreksiAbsen, uploadFileDrive, simpanJadwalWaktu, tambahHariLibur, simpanPengaturanUmum, generateLaporan } from './admin.js';
import { isBiometricSupported, registerBiometric, loginWithBiometric } from './biometric.js';

let deferredPrompt = null;

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}

setInterval(() => {
  const clockEl = document.getElementById("live-clock");
  if (clockEl) clockEl.innerText = new Date().toLocaleTimeString('id-ID');
}, 1000);

window.addEventListener('online', updateStatus);
window.addEventListener('offline', updateStatus);

function updateStatus() {
  const isOnline = navigator.onLine;
  document.getElementById("offline-banner").classList.toggle("hidden", isOnline);
  if (isOnline) syncOfflineData();
}

// Tangkap PWA Install Prompt
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const installBanner = document.getElementById("pwa-install-banner");
  if (installBanner) installBanner.classList.remove("hidden");
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  const installBanner = document.getElementById("pwa-install-banner");
  if (installBanner) installBanner.classList.add("hidden");
  alert("Aplikasi Presensi Guru berhasil terinstal di layar utama HP Anda!");
});

export async function initApp() {
  lucide.createIcons();
  updateStatus();
  if (state.globalConfig) renderCachedConfig(state.globalConfig);
  if (navigator.onLine) loadInitialConfig();

  // Cek Tampilan Tombol Login Sidik Jari
  const btnFinger = document.getElementById("btn-login-fingerprint");
  if (btnFinger) {
    if (localStorage.getItem("biometric_credential")) {
      btnFinger.classList.remove("hidden");
    } else {
      btnFinger.classList.add("hidden");
    }
  }

  if (state.currentUser) {
    if (state.currentUser.role === "guru") showGuruDashboard();
    else if (state.currentUser.role === "admin") showAdminDashboard();
  }
}

async function loadInitialConfig() {
  try {
    const res = await fetch(`${GAS_URL}?action=getInitialConfig`).then(r => r.json());
    if (res.success && res.config) {
      setGlobalConfig(res.config);
      localStorage.setItem("global_config", JSON.stringify(res.config));
      renderCachedConfig(res.config);
    }
  } catch (e) {
    console.log("Menggunakan konfigurasi ter-cache.");
  }
}

function showGuruDashboard() {
  document.getElementById("view-login").classList.add("hidden");
  document.getElementById("view-guru").classList.remove("hidden");
  document.getElementById("admin-bottom-nav").classList.add("hidden");
  document.getElementById("guru-nama").innerText = state.currentUser.guru.nama;
  document.getElementById("guru-nip").innerText = "NIP: " + (state.currentUser.guru.nip || '-');
  document.getElementById("guru-jabatan").innerText = state.currentUser.guru.jabatan || 'Guru';
  document.getElementById("guru-avatar").innerText = state.currentUser.guru.nama.charAt(0).toUpperCase();

  // Tampilkan Card Aktifkan Biometrik di Dashboard jika Belum Terdaftar
  const cardBio = document.getElementById("card-register-fingerprint");
  if (cardBio) {
    if (!localStorage.getItem("biometric_credential")) {
      cardBio.classList.remove("hidden");
    } else {
      cardBio.classList.add("hidden");
    }
  }

  if (state.globalConfig && state.globalConfig.geofence_active) {
    document.getElementById("geofence-status-text").innerText = `Zona Lokasi Aktif (Radius Batas: ${state.globalConfig.radius_meter} Meter)`;
  } else {
    document.getElementById("geofence-status-text").innerText = `Zona Lokasi Non-Aktif (Absen Bebas)`;
  }

  loadRiwayat();
  lucide.createIcons();
}

function showAdminDashboard() {
  document.getElementById("view-login").classList.add("hidden");
  document.getElementById("view-admin").classList.remove("hidden");
  document.getElementById("admin-bottom-nav").classList.remove("hidden");
  loadAdminData();
  lucide.createIcons();
}

// Event Bindings
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btn-login").onclick = doLogin;
  document.getElementById("btn-logout-guru").onclick = logout;
  document.getElementById("btn-logout-admin").onclick = logout;

  // Install PWA Button Click
  const btnInstall = document.getElementById("btn-install-pwa");
  if (btnInstall) {
    btnInstall.onclick = async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        document.getElementById("pwa-install-banner").classList.add("hidden");
      }
      deferredPrompt = null;
    };
  }

  // Login Sidik Jari Click
  const btnFinger = document.getElementById("btn-login-fingerprint");
  if (btnFinger) {
    btnFinger.onclick = async () => {
      const guruData = await loginWithBiometric();
      if (guruData) {
        const userSession = { success: true, role: "guru", guru: guruData };
        setCurrentUser(userSession);
        localStorage.setItem("user", JSON.stringify(userSession));
        initApp();
      }
    };
  }

  // Enable Biometric Click
  const btnEnableBio = document.getElementById("btn-enable-biometric");
  if (btnEnableBio) {
    btnEnableBio.onclick = async () => {
      if (state.currentUser && state.currentUser.guru) {
        const ok = await registerBiometric(state.currentUser.guru);
        if (ok) {
          document.getElementById("card-register-fingerprint").classList.add("hidden");
        }
      }
    };
  }

  document.getElementById("btn-open-pin").onclick = openModalGantiPin;
  document.getElementById("btn-close-pin").onclick = closeModalGantiPin;
  document.getElementById("btn-save-pin").onclick = async () => {
    const pinBaru = document.getElementById("pin-baru").value;
    if (!pinBaru) { alert("Masukkan PIN baru!"); return; }
    state.currentUser.guru.pin = pinBaru;
    localStorage.setItem("user", JSON.stringify(state.currentUser));
    localStorage.setItem("cached_guru_account", JSON.stringify(state.currentUser));
    if (navigator.onLine) {
      const res = await fetch(`${GAS_URL}?action=changePinGuru&data=${encodeURIComponent(JSON.stringify({id_guru: state.currentUser.guru.id_guru, pin_baru: pinBaru}))}`).then(r => r.json());
      alert(res.message);
    } else {
      alert("PIN diperbarui secara lokal. Akan disinkronkan saat online.");
    }
    closeModalGantiPin();
  };

  document.getElementById("absen-is-manual").onchange = (e) => {
    document.getElementById("manual-jam-container").classList.toggle("hidden", !e.target.checked);
  };

  document.getElementById("btn-kirim-absen").onclick = kirimAbsen;
  document.getElementById("btn-refresh-riwayat").onclick = loadRiwayat;

  // Navigasi Admin
  document.getElementById("btn-nav-laporan").onclick = () => switchTab('laporan');
  document.getElementById("btn-nav-edit-absen").onclick = () => switchTab('edit-absen');
  document.getElementById("btn-nav-guru").onclick = () => switchTab('guru');
  document.getElementById("btn-nav-waktu").onclick = () => switchTab('waktu');
  document.getElementById("btn-nav-pengaturan").onclick = () => switchTab('pengaturan');

  // Action Admin
  document.getElementById("btn-add-guru").onclick = () => openModalGuru();
  document.getElementById("btn-close-guru").onclick = closeModalGuru;
  document.getElementById("btn-save-guru").onclick = simpanDataGuru;

  document.getElementById("btn-close-edit-absen").onclick = closeModalEditAbsen;
  document.getElementById("btn-save-edit-absen").onclick = simpanKoreksiAbsen;

  document.getElementById("btn-save-waktu").onclick = simpanJadwalWaktu;
  document.getElementById("btn-add-libur").onclick = tambahHariLibur;
  document.getElementById("btn-set-my-location").onclick = setLokasiSaatIni;
  document.getElementById("btn-upload-logo").onclick = () => uploadFileDrive('file-logo', 'logo_url');
  document.getElementById("btn-upload-kop").onclick = () => uploadFileDrive('file-kop', 'kop_url');
  document.getElementById("btn-save-cfg-umum").onclick = simpanPengaturanUmum;
  document.getElementById("btn-gen-laporan").onclick = generateLaporan;

  document.getElementById("btn-clear-cache").onclick = async () => {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (let registration of registrations) { await registration.unregister(); }
    }
    localStorage.clear();
    alert("System Cache berhasil dibersihkan! Aplikasi akan direfresh.");
    location.reload(true);
  };

  initApp();
});
