import { GAS_URL, state, setGlobalConfig } from './config.js';
import { doLogin, logout } from './auth.js';
import { renderCachedConfig, switchTab, openModalGuru, closeModalGuru, openModalGantiPin, closeModalGantiPin, closeModalEditAbsen } from './ui.js';
import { kirimAbsen, loadRiwayat, syncOfflineData } from './absen.js';
import { setLokasiSaatIni } from './geofence.js';
import { loadAdminData, simpanDataGuru, simpanKoreksiAbsen, uploadFileDrive, simpanJadwalWaktu, tambahHariLibur, simpanPengaturanUmum, generateLaporan } from './admin.js';

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

export async function initApp() {
  lucide.createIcons();
  updateStatus();
  if (state.globalConfig) renderCachedConfig(state.globalConfig);
  if (navigator.onLine) loadInitialConfig();
  
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

// BIND ALL EVENT LISTENERS
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btn-login").onclick = doLogin;
  document.getElementById("btn-logout-guru").onclick = logout;
  document.getElementById("btn-logout-admin").onclick = logout;
  
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
let deferredPrompt = null;

// Tangkap Event PWA Install Prompt dari Browser
window.addEventListener('beforeinstallprompt', (e) => {
  // Cegah dialog prompt bawaan browser
  e.preventDefault();
  // Simpan event agar bisa dipanggil saat tombol diklik
  deferredPrompt = e;
  
  // Tampilkan banner/tombol instalasi di UI
  const installBanner = document.getElementById("pwa-install-banner");
  if (installBanner) {
    installBanner.classList.remove("hidden");
  }
});

// Logika Klik Tombol Instal
document.addEventListener("DOMContentLoaded", () => {
  const btnInstall = document.getElementById("btn-install-pwa");
  if (btnInstall) {
    btnInstall.addEventListener("click", async () => {
      if (!deferredPrompt) return;
      
      // Tampilkan dialog instalasi PWA native
      deferredPrompt.prompt();
      
      // Tunggu respon pilihan dari pengguna
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('Pengguna menyetujui instalasi PWA');
      }
      
      // Sembunyikan banner setelah direspons
      deferredPrompt = null;
      document.getElementById("pwa-install-banner").classList.add("hidden");
    });
  }
});

// Sembunyikan tombol jika aplikasi sudah berhasil diinstal
window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  const installBanner = document.getElementById("pwa-install-banner");
  if (installBanner) {
    installBanner.classList.add("hidden");
  }
  alert("Aplikasi Presensi Guru berhasil terinstal di layar utama HP Anda!");
});
