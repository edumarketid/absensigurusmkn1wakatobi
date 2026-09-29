import { GAS_URL, state } from './config.js';
import { checkGeofence } from './geofence.js';

export async function kirimAbsen() {
  if (!state.currentUser || !state.currentUser.guru) {
    alert("Sesi login berakhir atau tidak valid. Silakan logout dan login kembali!");
    return;
  }

  const guruAktif = state.currentUser.guru;
  const jenis = document.getElementById("absen-jenis").value;
  const status = document.getElementById("absen-status").value;
  const isManual = document.getElementById("absen-is-manual").checked;
  const jamManual = document.getElementById("absen-jam-manual").value;
  const ket = document.getElementById("absen-ket").value;

  if ((status !== "Hadir" || isManual) && !ket) {
    alert("Keterangan wajib diisi untuk status Non-Hadir atau Absen Manual!");
    return;
  }

  let jamFinal = new Date().toLocaleTimeString('id-ID', { hour12: false });
  if (isManual) {
    if (!jamManual) { alert("Masukkan jam presensi manual!"); return; }
    jamFinal = jamManual;
  }

  // Geofence Validation
  let coordsText = "Bebas GPS";
  if (state.globalConfig && state.globalConfig.geofence_active) {
    const geo = await checkGeofence();
    if (!geo.allowed && status === "Hadir") {
      alert(`Gagal Presensi: Anda berada di luar radius sekolah (${geo.distance}m dari lokasi sekolah).`);
      return;
    }
    coordsText = `${geo.userLat}, ${geo.userLng}`;
  }

  const record = {
    id_absen: "ABS-" + Date.now(),
    id_guru: guruAktif.id_guru,
    nama_guru: guruAktif.nama,
    jenis_absen: jenis,
    status: status,
    jam: jamFinal,
    keterangan: ket || "-",
    tanggal: new Date().toISOString().split('T')[0],
    koordinat: coordsText
  };

  if (navigator.onLine) {
    try {
      const res = await fetch(`${GAS_URL}?action=syncAbsen&data=${encodeURIComponent(JSON.stringify([record]))}`).then(r => r.json());
      alert(res.message || "Presensi berhasil dikirim!");
      loadRiwayat();
    } catch (e) {
      alert("Terjadi kesalahan jaringan/koneksi saat mengiriim presensi.");
    }
  } else {
    let offlineData = JSON.parse(localStorage.getItem("offline_absen") || "[]");
    offlineData.push(record);
    localStorage.setItem("offline_absen", JSON.stringify(offlineData));
    alert("Presensi disimpan di lokal (offline). Akan otomatis dikirim saat online.");
  }
}

export async function syncOfflineData() {
  const offlineData = JSON.parse(localStorage.getItem("offline_absen") || "[]");
  if (offlineData.length === 0) return;

  try {
    const res = await fetch(`${GAS_URL}?action=syncAbsen&data=${encodeURIComponent(JSON.stringify(offlineData))}`).then(r => r.json());
    if (res.success) {
      localStorage.removeItem("offline_absen");
      console.log("Sinkronisasi data offline berhasil.");
      loadRiwayat();
    }
  } catch (e) {
    console.log("Gagal sinkron data offline.");
  }
}

export async function loadRiwayat() {
  if (!state.currentUser || !state.currentUser.guru) return;
  const container = document.getElementById("riwayat-list");
  if (!container) return;
  
  if (navigator.onLine) {
    try {
      const res = await fetch(`${GAS_URL}?action=getRiwayatGuru&data=${encodeURIComponent(JSON.stringify({id_guru: state.currentUser.guru.id_guru}))}`).then(r => r.json());
      if (res.success && res.data) {
        renderRiwayatList(res.data);
      }
    } catch(e) {
      console.log("Gagal memuat riwayat.");
    }
  } else {
    const offlineData = JSON.parse(localStorage.getItem("offline_absen") || "[]");
    const myOffline = offlineData.filter(o => String(o.id_guru) === String(state.currentUser.guru.id_guru));
    container.innerHTML = myOffline.map(o => `
      <div class="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-1">
        <div class="flex justify-between font-bold text-amber-900">
          <span>${o.tanggal} (${o.jenis_absen})</span>
          <span>Pending Sync</span>
        </div>
        <p class="text-amber-700">Jam: ${o.jam} | Status: ${o.status}</p>
      </div>
    `).join('') || `<p class="text-xs text-slate-400 italic">Belum ada riwayat offline.</p>`;
  }
}

function renderRiwayatList(list) {
  const container = document.getElementById("riwayat-list");
  if (!container) return;

  if (!list || list.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-400 italic">Belum ada riwayat presensi.</p>`;
    return;
  }

  container.innerHTML = list.map(r => `
    <div class="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-xs space-y-2">
      <div class="flex justify-between items-center border-b border-slate-100 pb-1.5">
        <span class="font-bold text-slate-800">${r.tanggal}</span>
        <span class="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold text-[10px]">${r.status_akhir}</span>
      </div>
      <div class="grid grid-cols-2 gap-2 text-[11px]">
        <div class="bg-slate-50 p-2 rounded-xl">
          <span class="text-slate-400 block text-[9px] font-bold">PAGI</span>
          ${r.pagi ? `<span class="font-bold text-slate-700">${r.pagi.jam} (${r.pagi.status})</span>` : '<span class="text-slate-400">-</span>'}
        </div>
        <div class="bg-slate-50 p-2 rounded-xl">
          <span class="text-slate-400 block text-[9px] font-bold">SIANG</span>
          ${r.siang ? `<span class="font-bold text-slate-700">${r.siang.jam} (${r.siang.status})</span>` : '<span class="text-slate-400">-</span>'}
        </div>
      </div>
    </div>
  `).join('');
}
