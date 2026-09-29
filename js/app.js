import { GAS_URL, state, setCurrentUser, setGlobalConfig } from './config.js';
import { doLogin, logout } from './auth.js';
import { renderCachedConfig, switchGuruTab, switchTab, openModalGuru, closeModalGuru, openModalGantiPin, closeModalGantiPin, closeModalEditAbsen } from './ui.js';
import { kirimAbsen, loadRiwayat, syncOfflineData } from './absen.js';
import { setLokasiSaatIni } from './geofence.js';
import { loadAdminData, simpanDataGuru, simpanKoreksiAbsen, uploadFileDrive, simpanJadwalWaktu, tambahHariLibur, simpanPengaturanUmum, generateLaporan, openModalJadwal, simpanJadwal, simpanPintasanLink } from './admin.js';
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

  // Cek Tombol Login Sidik Jari
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
  document.getElementById("guru-bottom-nav").classList.remove("hidden");
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

  loadProfilGuruAkun();
  loadPintasanGuru();
  loadJadwalGuru();
  loadRiwayat();
  lucide.createIcons();
}

function showAdminDashboard() {
  document.getElementById("view-login").classList.add("hidden");
  document.getElementById("view-admin").classList.remove("hidden");
  document.getElementById("admin-bottom-nav").classList.remove("hidden");
  document.getElementById("guru-bottom-nav").classList.add("hidden");
  loadAdminData();
  lucide.createIcons();
}

// RENDER PROFIL DIBAGIAN TAB AKUN
function loadProfilGuruAkun() {
  const container = document.getElementById("container-profil-guru");
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

  const toggleSwitch = document.getElementById("toggle-biometric-switch");
  const labelStatus = document.getElementById("label-status-fingerprint");
  const hasBio = !!localStorage.getItem("biometric_credential");

  if (toggleSwitch && labelStatus) {
    toggleSwitch.checked = hasBio;
    labelStatus.innerText = hasBio ? "Aktif & Siap Digunakan" : "Non-Aktif";

    toggleSwitch.onchange = async (e) => {
      if (e.target.checked) {
        const ok = await registerBiometric(state.currentUser.guru);
        if (ok) {
          labelStatus.innerText = "Aktif & Siap Digunakan";
        } else {
          e.target.checked = false;
          labelStatus.innerText = "Non-Aktif";
        }
      } else {
        localStorage.removeItem("biometric_credential");
        labelStatus.innerText = "Non-Aktif";
        alert("Login Sidik Jari dinonaktifkan.");
      }
    };
  }
}

// RENDER PINTASAN DOKUMEN & LINK (GURU)
function loadPintasanGuru() {
  const container = document.getElementById("container-pintasan-guru");
  fetch(`${GAS_URL}?action=getPintasanLink`).then(r => r.json()).then(res => {
    if (res.success && res.data) {
      container.innerHTML = res.data.map(l => `
        <a href="${l.url}" target="_blank" rel="noopener noreferrer" class="bg-white border border-slate-100 p-3 rounded-2xl shadow-sm flex items-center space-x-2.5 hover:bg-slate-50 transition-all active:scale-95">
          <div class="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <i data-lucide="${l.icon || 'external-link'}" class="w-4 h-4"></i>
          </div>
          <span class="font-bold text-xs text-slate-800 truncate">${l.judul}</span>
        </a>
      `).join('');
      lucide.createIcons();
    }
  });
}

// RENDER JADWAL GURU
function loadJadwalGuru() {
  const hariArr = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const hariIni = hariArr[new Date().getDay()];
  const labelHari = document.getElementById("label-hari-ini");
  if (labelHari) labelHari.innerText = hariIni;

  fetch(`${GAS_URL}?action=getJadwalGuru&data=${encodeURIComponent(JSON.stringify({id_guru: state.currentUser.guru.id_guru}))}`).then(r => r.json()).then(res => {
    if (res.success && res.data) {
      const listJadwal = res.data;
      
      const ringkasan = document.getElementById("ringkasan-jadwal-hari-ini");
      const jadwalToday = listJadwal.filter(j => j.hari === hariIni);
      if (jadwalToday.length === 0) {
        ringkasan.innerHTML = `<p class="text-slate-400 italic text-[11px]">Tidak ada jadwal mengajar hari ini.</p>`;
      } else {
        ringkasan.innerHTML = jadwalToday.map(j => `
          <div class="p-2.5 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
            <div>
              <span class="font-bold text-indigo-600 text-[11px]">Jam ke ${j.jam_ke}</span>
              <h5 class="font-bold text-slate-800">${j.mapel}</h5>
            </div>
            <span class="bg-white px-2.5 py-1 rounded-xl text-[11px] font-bold text-slate-700 shadow-sm border border-slate-100">${j.kelas}</span>
          </div>
        `).join('');
      }

      const containerLengkap = document.getElementById("container-jadwal-lengkap-guru");
      const hariKerja = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
      
      containerLengkap.innerHTML = hariKerja.map(h => {
        const itemHari = listJadwal.filter(j => j.hari === h);
        return `
          <div class="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm space-y-2">
            <span class="font-bold text-xs text-slate-800 border-b border-slate-100 pb-1 block flex justify-between items-center">
              <span>${h}</span>
              ${h === hariIni ? '<span class="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold">Hari Ini</span>' : ''}
            </span>
            ${itemHari.length === 0 ? '<p class="text-[11px] text-slate-400 italic">Tidak ada jam mengajar</p>' : itemHari.map(j => `
              <div class="p-2 bg-slate-50 rounded-xl flex justify-between items-center text-xs">
                <div>
                  <span class="font-semibold text-blue-600 text-[10px]">Jam ke ${j.jam_ke}</span>
                  <p class="font-bold text-slate-800">${j.mapel}</p>
                </div>
                <span class="font-bold text-slate-700 bg-white px-2 py-0.5 rounded-lg border">${j.kelas}</span>
              </div>
            `).join('')}
          </div>
        `;
      }).join('');

      lucide.createIcons();
    }
  });
}

// Event Bindings
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btn-login").onclick = doLogin;
  document.getElementById("btn-logout-guru").onclick = logout;
  document.getElementById("btn-logout-admin").onclick = logout;
  document.getElementById("btn-akun-logout").onclick = logout;

  // Navigasi Bottom Guru
  document.getElementById("btn-guru-nav-beranda").onclick = () => switchGuruTab('beranda');
  document.getElementById("btn-guru-nav-presensi").onclick = () => switchGuruTab('presensi');
  document.getElementById("btn-guru-nav-jadwal").onclick = () => switchGuruTab('jadwal');
  document.getElementById("btn-guru-nav-riwayat").onclick = () => switchGuruTab('riwayat');
  document.getElementById("btn-guru-nav-akun").onclick = () => switchGuruTab('akun');

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

  document.getElementById("btn-open-pin").onclick = openModalGantiPin;
  document.getElementById("btn-akun-ganti-pin").onclick = openModalGantiPin;
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
  document.getElementById("btn-nav-jadwal-admin").onclick = () => switchTab('jadwal-admin');
  document.getElementById("btn-nav-waktu").onclick = () => switchTab('waktu');
  document.getElementById("btn-nav-pengaturan").onclick = () => switchTab('pengaturan');

  // Action Admin
  document.getElementById("btn-add-guru").onclick = () => openModalGuru();
  document.getElementById("btn-close-guru").onclick = closeModalGuru;
  document.getElementById("btn-save-guru").onclick = simpanDataGuru;

  document.getElementById("btn-add-jadwal").onclick = openModalJadwal;
  document.getElementById("btn-close-jadwal").onclick = () => document.getElementById("modal-jadwal").classList.add("hidden");
  document.getElementById("btn-save-jadwal").onclick = simpanJadwal;

  document.getElementById("btn-add-pintasan-link").onclick = () => {
    document.getElementById("modal-pintasan-link").classList.remove("hidden");
    document.getElementById("link-edit-id").value = "";
    document.getElementById("link-edit-judul").value = "";
    document.getElementById("link-edit-url").value = "";
  };
  document.getElementById("btn-close-link").onclick = () => document.getElementById("modal-pintasan-link").classList.add("hidden");
  document.getElementById("btn-save-link").onclick = simpanPintasanLink;

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
