import { GAS_URL, state } from './config.js';
import { calculateDistance } from './geofence.js';

export async function kirimAbsen() {
  const jenis = document.getElementById("absen-jenis").value;
  const status = document.getElementById("absen-status").value;
  const isManual = document.getElementById("absen-is-manual").checked;
  const jamManual = document.getElementById("absen-jam-manual").value;
  const ket = document.getElementById("absen-ket").value;

  if ((status !== "Hadir" || isManual) && !ket) { alert("Keterangan wajib diisi!"); return; }

  const now = new Date();
  const tanggalStr = now.toISOString().split('T')[0];
  const jamStr = isManual && jamManual ? jamManual : now.toTimeString().split(' ')[0].substring(0, 5);

  const processAbsen = (coords) => {
    const record = {
      id_absen: "ABS-" + Date.now(),
      id_guru: state.currentUser.guru.id_guru,
      tanggal: tanggalStr, jam: jamStr, jenis_absen: jenis, status: status, keterangan: ket, koordinat: coords, is_manual: isManual
    };

    let pending = JSON.parse(localStorage.getItem("pending_absen") || "[]");
    pending.push(record);
    localStorage.setItem("pending_absen", JSON.stringify(pending));

    if (navigator.onLine) {
      syncOfflineData();
    } else {
      alert("Presensi Tersimpan dalam Mode Offline HP Anda.");
    }
    loadRiwayat();
  };

  navigator.geolocation.getCurrentPosition((pos) => {
    const userLat = pos.coords.latitude;
    const userLng = pos.coords.longitude;
    const coords = `${userLat},${userLng}`;

    if (state.globalConfig && state.globalConfig.geofence_active && status === "Hadir") {
      const distance = calculateDistance(userLat, userLng, state.globalConfig.lat_sekolah, state.globalConfig.lng_sekolah);
      if (distance > state.globalConfig.radius_meter) {
        alert(`Peringatan Geofence: Anda berada ${Math.round(distance)}m dari lokasi sekolah. Batas radius: ${state.globalConfig.radius_meter}m.`);
        return;
      }
    }
    processAbsen(coords);
  }, () => {
    processAbsen("GPS Offline");
  });
}

export async function syncOfflineData() {
  let pending = JSON.parse(localStorage.getItem("pending_absen") || "[]");
  if (pending.length > 0 && navigator.onLine) {
    try {
      const res = await fetch(`${GAS_URL}?action=syncAbsen&data=${encodeURIComponent(JSON.stringify(pending))}`).then(r => r.json());
      if (res.success) {
        localStorage.removeItem("pending_absen");
        alert("Data presensi offline berhasil disinkronkan ke server Google Sheets!");
        loadRiwayat();
      }
    } catch(e) {
      console.log("Sinkronisasi ditunda, server belum dapat dijangkau.");
    }
  }
}

export async function loadRiwayat() {
  let offlineData = JSON.parse(localStorage.getItem("pending_absen") || "[]");
  
  const renderRiwayatItems = (listData) => {
    const container = document.getElementById("riwayat-list");
    if (!listData || listData.length === 0) {
      container.innerHTML = `<p class="text-xs text-slate-400 italic text-center py-4">Belum ada riwayat presensi.</p>`;
      return;
    }

    container.innerHTML = listData.map(r => `
      <div class="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-1.5 text-xs">
        <span class="font-bold text-slate-800 border-b pb-1 flex justify-between items-center">
          <span>${r.tanggal}</span>
          ${r.hasPending ? '<span class="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">Pending Sync</span>' : ''}
        </span>
        <div class="grid grid-cols-2 gap-2 pt-0.5">
          <div class="bg-slate-50 p-2 rounded-xl">
            <span class="text-[10px] text-slate-500 font-semibold block">🌅 PAGI</span>
            ${r.pagi ? `
              <p class="font-bold text-slate-800">${r.pagi.status} (${r.pagi.jam})</p>
              <p class="text-[10px] text-slate-500">${r.pagi.is_manual === 'YA' ? 'Manual' : 'Otomatis'}${r.pagi.ket ? '• ' + r.pagi.ket : ''}</p>
            ` : `<span class="text-slate-400 italic text-[11px]">- Belum Absen -</span>`}
          </div>
          <div class="bg-slate-50 p-2 rounded-xl">
            <span class="text-[10px] text-slate-500 font-semibold block">☀️ SIANG</span>
            ${r.siang ? `
              <p class="font-bold text-slate-800">${r.siang.status} (${r.siang.jam})</p>
              <p class="text-[10px] text-slate-500">${r.siang.is_manual === 'YA' ? 'Manual' : 'Otomatis'}${r.siang.ket ? '• ' + r.siang.ket : ''}</p>
            ` : `<span class="text-slate-400 italic text-[11px]">- Belum Absen -</span>`}
          </div>
        </div>
      </div>
    `).join('');
  };

  if (!navigator.onLine) {
    let mapOffline = {};
    offlineData.forEach(r => {
      if (String(r.id_guru) === String(state.currentUser.guru.id_guru)) {
        if (!mapOffline[r.tanggal]) mapOffline[r.tanggal] = { tanggal: r.tanggal, pagi: null, siang: null, hasPending: true };
        mapOffline[r.tanggal][r.jenis_absen.toLowerCase()] = { jam: r.jam, status: r.status, ket: r.keterangan, is_manual: r.is_manual ? 'YA' : 'TIDAK' };
      }
    });
    renderRiwayatItems(Object.values(mapOffline));
    return;
  }

  try {
    const res = await fetch(`${GAS_URL}?action=getRiwayatGuru&data=${encodeURIComponent(JSON.stringify({id_guru: state.currentUser.guru.id_guru}))}`).then(r => r.json());
    if (res.success) {
      let serverData = res.data;
      offlineData.forEach(off => {
        if (String(off.id_guru) === String(state.currentUser.guru.id_guru)) {
          let exist = serverData.find(s => s.tanggal === off.tanggal);
          if (!exist) {
            exist = { tanggal: off.tanggal, pagi: null, siang: null, hasPending: true };
            serverData.unshift(exist);
          }
          exist[off.jenis_absen.toLowerCase()] = { jam: off.jam, status: off.status, ket: off.keterangan, is_manual: off.is_manual ? 'YA' : 'TIDAK' };
          exist.hasPending = true;
        }
      });
      renderRiwayatItems(serverData);
    }
  } catch(e) {
    console.log("Gagal memuat riwayat online.");
  }
}
