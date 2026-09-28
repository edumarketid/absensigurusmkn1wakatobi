import { state } from './config.js';

export function renderCachedConfig(cfg) {
  if (cfg.nama_sekolah) document.getElementById("login-sekolah-nama").innerText = cfg.nama_sekolah;
  if (cfg.logo_url) {
    document.getElementById("login-logo-img").src = cfg.logo_url;
    document.getElementById("login-logo-img").classList.remove("hidden");
    document.getElementById("login-logo-icon").classList.add("hidden");
  }
}

// NAVIGASI BOTTOM TAB GURU
export function switchGuruTab(tab) {
  ["beranda", "presensi", "jadwal", "riwayat"].forEach(t => {
    document.getElementById(`tab-guru-${t}`).classList.add("hidden");
    const btn = document.getElementById(`btn-guru-nav-${t}`);
    if (btn) btn.classList.remove("text-blue-600", "font-semibold");
    if (btn) btn.classList.add("text-slate-400");
  });
  
  document.getElementById(`tab-guru-${tab}`).classList.remove("hidden");
  const activeBtn = document.getElementById(`btn-guru-nav-${tab}`);
  if (activeBtn) {
    activeBtn.classList.remove("text-slate-400");
    activeBtn.classList.add("text-blue-600", "font-semibold");
  }
  lucide.createIcons();
}

// NAVIGASI BOTTOM TAB ADMIN
export function switchTab(tab) {
  ["laporan", "edit-absen", "guru", "jadwal-admin", "waktu", "pengaturan"].forEach(t => {
    document.getElementById(`tab-${t}`).classList.add("hidden");
    const btn = document.getElementById(`btn-nav-${t}`);
    if (btn) btn.classList.remove("text-blue-600", "font-semibold");
    if (btn) btn.classList.add("text-slate-400");
  });
  
  document.getElementById(`tab-${tab}`).classList.remove("hidden");
  const activeBtn = document.getElementById(`btn-nav-${tab}`);
  if (activeBtn) {
    activeBtn.classList.remove("text-slate-400");
    activeBtn.classList.add("text-blue-600", "font-semibold");
  }
  lucide.createIcons();
}

export function openModalGuru(guru = null) {
  document.getElementById("modal-guru").classList.remove("hidden");
  if (guru) {
    document.getElementById("modal-guru-title").innerText = "Edit Data Guru";
    document.getElementById("guru-edit-id").value = guru.id_guru;
    document.getElementById("guru-edit-nama").value = guru.nama;
    document.getElementById("guru-edit-nip").value = guru.nip;
    document.getElementById("guru-edit-hp").value = guru.hp;
    document.getElementById("guru-edit-pin").value = guru.pin;
    document.getElementById("guru-edit-jabatan").value = guru.jabatan;
  } else {
    document.getElementById("modal-guru-title").innerText = "Tambah Guru Baru";
    document.getElementById("guru-edit-id").value = "";
    document.getElementById("guru-edit-nama").value = "";
    document.getElementById("guru-edit-nip").value = "";
    document.getElementById("guru-edit-hp").value = "";
    document.getElementById("guru-edit-pin").value = "12345";
    document.getElementById("guru-edit-jabatan").value = "";
  }
}

export function closeModalGuru() { document.getElementById("modal-guru").classList.add("hidden"); }
export function openModalGantiPin() { document.getElementById("modal-ganti-pin").classList.remove("hidden"); }
export function closeModalGantiPin() { document.getElementById("modal-ganti-pin").classList.add("hidden"); }

export function openModalEditAbsen(absen) {
  document.getElementById("modal-edit-absen").classList.remove("hidden");
  document.getElementById("edit-absen-id").value = absen.id_absen;
  document.getElementById("edit-pagi-jam").value = absen.jam_pagi !== "-" ? absen.jam_pagi : "";
  document.getElementById("edit-pagi-status").value = absen.status_pagi || "-";
  document.getElementById("edit-pagi-ket").value = absen.ket_pagi !== "-" ? absen.ket_pagi : "";
  
  document.getElementById("edit-siang-jam").value = absen.jam_siang !== "-" ? absen.jam_siang : "";
  document.getElementById("edit-siang-status").value = absen.status_siang || "-";
  document.getElementById("edit-siang-ket").value = absen.ket_siang !== "-" ? absen.ket_siang : "";
}
export function closeModalEditAbsen() { document.getElementById("modal-edit-absen").classList.add("hidden"); }
