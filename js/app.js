import { GAS_URL, state, setCurrentUser, setGlobalConfig } from './config.js';
import { doLogin, logout } from './auth.js';
import { renderCachedConfig, switchGuruTab, switchTab, openModalGuru, closeModalGuru, openModalGantiPin, closeModalGantiPin, closeModalEditAbsen } from './ui.js';
import { kirimAbsen, loadRiwayat, syncOfflineData } from './absen.js';
import { setLokasiSaatIni } from './geofence.js';
import { loadAdminData, simpanDataGuru, simpanKoreksiAbsen, uploadFileDrive, simpanJadwalWaktu, tambahHariLibur, simpanPengaturanUmum, generateLaporan, openModalJadwal, simpanJadwal, simpanPintasanLink } from './admin.js';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(err => console.log('SW reg error:', err));
}

setInterval(() => {
  const clockEl = document.getElementById("live-clock");
  if (clockEl) clockEl.innerText = new Date().toLocaleTimeString('id-ID');
}, 1000);

window.addEventListener('online', updateStatus);
window.addEventListener('offline', updateStatus);

function updateStatus() {
  const isOnline = navigator.onLine;
  const banner = document.getElementById("offline-banner");
  if (banner) banner.classList.toggle("hidden", isOnline);
  if (isOnline) syncOfflineData();
}

export async function initApp() {
  if (window.lucide) window.lucide.createIcons();
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
  const loginView = document.getElementById("view-login");
  const guruView = document.getElementById("view-guru");
  const guruNav = document.getElementById("guru-bottom-nav");
  const adminNav = document.getElementById("admin-bottom-nav");

  if (loginView) loginView.classList.add("hidden");
  if (guruView) guruView.classList.remove("hidden");
  if (guruNav) guruNav.classList.remove("hidden");
  if (adminNav) adminNav.classList.add("hidden");

  const g = state.currentUser.guru;
  if (g) {
    const elNama = document.getElementById("guru-nama");
    const elNip = document.getElementById("guru-nip");
    const elJabatan = document.getElementById("guru-jabatan");
    const elAvatar = document.getElementById("guru-avatar");

    if (elNama) elNama.innerText = g.nama || "Guru";
    if (elNip) elNip.innerText = "NIP: " + (g.nip || '-');
    if (elJabatan) elJabatan.innerText = g.jabatan || 'Guru';
    if (elAvatar) elAvatar.innerText = (g.nama || 'G').charAt(0).toUpperCase();
  }

  loadProfilGuruAkun();
  loadRiwayat();
  if (window.lucide) window.lucide.createIcons();
}

function showAdminDashboard() {
  const loginView = document.getElementById("view-login");
  const adminView = document.getElementById("view-admin");
  const adminNav = document.getElementById("admin-bottom-nav");
  const guruNav = document.getElementById("guru-bottom-nav");

  if (loginView) loginView.classList.add("hidden");
  if (adminView) adminView.classList.remove("hidden");
  if (adminNav) adminNav.classList.remove("hidden");
  if (guruNav) guruNav.classList.add("hidden");
  
  loadAdminData();
  if (window.lucide) window.lucide.createIcons();
}

function loadProfilGuruAkun() {
  const container = document.getElementById("container-profil-guru");
  if (!container || !state.currentUser || !state.currentUser.guru) return;
  const g = state.currentUser.guru;
  
  container.innerHTML = `
    <div class="grid grid-cols-2 gap-2 text-[11px]">
      <div class="bg-slate-50 p-2.5 rounded-2xl border border-slate-100"><span class="text-slate-400 font-semibold block text-[10px]">NAMA LENGKAP</span><span class="font-bold text-slate-800">${g.nama || '-'}</span></div>
      <div class="bg-slate-50 p-2.5 rounded-2xl border border-slate-100"><span class="text-slate-400 font-semibold block text-[10px]">NIP / NUPTK</span><span class="font-bold text-slate-800">${g.nip || '-'}</span></div>
      <div class="bg-slate-50 p-2.5 rounded-2xl border border-slate-100"><span class="text-slate-400 font-semibold block text-[10px]">STATUS KEPEGAWAIAN</span><span class="font-bold text-blue-600">${g.status_kepegawaian || '-'}</span></div>
      <div class="bg-slate-50 p-2.5 rounded-2xl border border-slate-100"><span class="text-slate-400 font-semibold block text-[10px]">PANGKAT / GOLONGAN</span><span class="font-bold text-slate-800">${g.pangkat_golongan || '-'}</span></div>
      <div class="bg-slate-50 p-2.5 rounded-2xl border border-slate-100"><span class="text-slate-400 font-semibold block text-[10px]">JABATAN</span><span class="font-bold text-slate-800">${g.jabatan || 'Guru'}</span></div>
      <div class="bg-slate-50 p-2.5 rounded-2xl border border-slate-100"><span class="text-slate-400 font-semibold block text-[10px]">MATA PELAJARAN</span><span class="font-bold text-slate-800">${g.mapel || '-'}</span></div>
    </div>
  `;
}

// Bind Event Listener Aman
function setupEventListener(id, event, fn) {
  const el = document.getElementById(id);
  if (el) el[event] = fn;
}

document.addEventListener("DOMContentLoaded", () => {
  setupEventListener("btn-login", "onclick", doLogin);
  setupEventListener("btn-logout-guru", "onclick", logout);
  setupEventListener("btn-logout-admin", "onclick", logout);
  setupEventListener("btn-akun-logout", "onclick", logout);

  // Bottom Nav Guru
  setupEventListener("btn-guru-nav-beranda", "onclick", () => switchGuruTab('beranda'));
  setupEventListener("btn-guru-nav-presensi", "onclick", () => switchGuruTab('presensi'));
  setupEventListener("btn-guru-nav-jadwal", "onclick", () => switchGuruTab('jadwal'));
  setupEventListener("btn-guru-nav-riwayat", "onclick", () => switchGuruTab('riwayat'));
  setupEventListener("btn-guru-nav-akun", "onclick", () => switchGuruTab('akun'));

  // PIN
  setupEventListener("btn-open-pin", "onclick", openModalGantiPin);
  setupEventListener("btn-akun-ganti-pin", "onclick", openModalGantiPin);
  setupEventListener("btn-close-pin", "onclick", closeModalGantiPin);

  // Absen
  setupEventListener("btn-kirim-absen", "onclick", kirimAbsen);
  setupEventListener("btn-refresh-riwayat", "onclick", loadRiwayat);

  // Bottom Nav Admin
  setupEventListener("btn-nav-laporan", "onclick", () => switchTab('laporan'));
  setupEventListener("btn-nav-edit-absen", "onclick", () => switchTab('edit-absen'));
  setupEventListener("btn-nav-guru", "onclick", () => switchTab('guru'));
  setupEventListener("btn-nav-jadwal-admin", "onclick", () => switchTab('jadwal-admin'));
  setupEventListener("btn-nav-waktu", "onclick", () => switchTab('waktu'));
  setupEventListener("btn-nav-pengaturan", "onclick", () => switchTab('pengaturan'));

  // Admin Actions
  setupEventListener("btn-add-guru", "onclick", () => openModalGuru());
  setupEventListener("btn-close-guru", "onclick", closeModalGuru);
  setupEventListener("btn-save-guru", "onclick", simpanDataGuru);

  setupEventListener("btn-add-jadwal", "onclick", openModalJadwal);
  setupEventListener("btn-save-jadwal", "onclick", simpanJadwal);

  setupEventListener("btn-close-edit-absen", "onclick", closeModalEditAbsen);
  setupEventListener("btn-save-edit-absen", "onclick", simpanKoreksiAbsen);

  setupEventListener("btn-save-waktu", "onclick", simpanJadwalWaktu);
  setupEventListener("btn-add-libur", "onclick", tambahHariLibur);
  setupEventListener("btn-set-my-location", "onclick", setLokasiSaatIni);
  setupEventListener("btn-save-cfg-umum", "onclick", simpanPengaturanUmum);
  setupEventListener("btn-gen-laporan", "onclick", generateLaporan);

  setupEventListener("btn-clear-cache", "onclick", async () => {
    localStorage.clear();
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
    alert("Cache dibersihkan!");
    location.reload(true);
  });

  initApp();
});
