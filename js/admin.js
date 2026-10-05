import { GAS_URL, HARI_LIST, state, setAdminData } from './config.js';
import { openModalGuru, openModalEditAbsen } from './ui.js';

export async function loadAdminData() {
  if (!navigator.onLine) return;
  const res = await fetch(`${GAS_URL}?action=getAdminData`).then(r => r.json());
  if (res.success) {
    setAdminData(res);
    renderJadwalWaktu();
    renderHariLibur();
    renderPengaturanUmum();
    renderListGuru();
    renderListAbsenAdmin();
    renderListJadwalAdmin();
    renderListPintasanAdmin();
    lucide.createIcons();
  }
}

export function renderListGuru() {
  const container = document.getElementById("list-guru-admin");
  const list = state.adminData.guru || [];
  container.innerHTML = list.map(g => `
    <div class="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm flex justify-between items-center text-xs">
      <div>
        <h4 class="font-bold text-slate-800">${g.nama}</h4>
        <p class="text-slate-500 text-[11px]">NIP: ${g.nip || '-'} | Mapel: ${g.mapel || '-'}</p>
        <span class="inline-block mt-0.5 bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-medium">${g.jabatan || 'Guru'} (${g.pangkat_golongan || '-'})</span>
      </div>
      <div class="flex space-x-1">
        <button class="btn-edit-guru text-blue-600 p-2" data-guru='${JSON.stringify(g)}'><i data-lucide="edit" class="w-4 h-4"></i></button>
        <button class="btn-hapus-guru text-rose-600 p-2" data-id='${g.id_guru}'><i data-lucide="trash-2" class="w-4 h-4"></i></button>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.btn-edit-guru').forEach(btn => {
    btn.onclick = () => openModalGuru(JSON.parse(btn.dataset.guru));
  });
  document.querySelectorAll('.btn-hapus-guru').forEach(btn => {
    btn.onclick = () => hapusGuru(btn.dataset.id);
  });
}

export async function hapusGuru(id) {
  if (!confirm("Yakin hapus guru ini?")) return;
  const res = await fetch(`${GAS_URL}?action=deleteGuru&data=${encodeURIComponent(JSON.stringify({id_guru: id}))}`).then(r => r.json());
  alert(res.message);
  loadAdminData();
}

export function renderListAbsenAdmin() {
  const container = document.getElementById("list-absen-admin");
  const list = state.adminData.absensi || [];
  container.innerHTML = list.map(a => `
    <div class="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm flex justify-between items-center text-xs">
      <div>
        <h4 class="font-bold text-slate-800">${a.nama_guru}</h4>
        <p class="text-slate-500 text-[11px]">${a.tanggal} • Pagi: ${a.status_pagi} | Siang: ${a.status_siang}</p>
        <span class="inline-block mt-0.5 bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-semibold">Final: ${a.status_akhir}</span>
      </div>
      <button class="btn-edit-absen text-blue-600 p-2" data-absen='${JSON.stringify(a)}'><i data-lucide="edit-3" class="w-4 h-4"></i></button>
    </div>
  `).join('');

  document.querySelectorAll('.btn-edit-absen').forEach(btn => {
    btn.onclick = () => openModalEditAbsen(JSON.parse(btn.dataset.absen));
  });
}

export function renderListJadwalAdmin() {
  const container = document.getElementById("list-jadwal-admin");
  const list = state.adminData.jadwal || [];
  if (list.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-400 italic">Belum ada jadwal mengajar.</p>`;
    return;
  }
  container.innerHTML = list.map(j => `
    <div class="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm flex justify-between items-center text-xs">
      <div>
        <span class="font-bold text-blue-600 text-[11px]">${j.hari} (Jam ke ${j.jam_ke})</span>
        <h4 class="font-bold text-slate-800 mt-0.5">${j.nama_guru}</h4>
        <p class="text-slate-500 text-[11px]">${j.kelas} • ${j.mapel}</p>
      </div>
      <button class="btn-hapus-jadwal text-rose-600 p-2" data-id='${j.id_jadwal}'><i data-lucide="trash-2" class="w-4 h-4"></i></button>
    </div>
  `).join('');

  document.querySelectorAll('.btn-hapus-jadwal').forEach(btn => {
    btn.onclick = () => hapusJadwal(btn.dataset.id);
  });
}

export function openModalJadwal() {
  document.getElementById("modal-jadwal").classList.remove("hidden");
  const selectGuru = document.getElementById("jadwal-edit-guru");
  const guruList = state.adminData.guru || [];
  selectGuru.innerHTML = guruList.map(g => `<option value="${g.id_guru}">${g.nama}</option>`).join('');
}

export async function simpanJadwal() {
  const payload = {
    id_jadwal: document.getElementById("jadwal-edit-id").value,
    id_guru: document.getElementById("jadwal-edit-guru").value,
    hari: document.getElementById("jadwal-edit-hari").value,
    jam_ke: document.getElementById("jadwal-edit-jam").value,
    kelas: document.getElementById("jadwal-edit-kelas").value,
    mapel: document.getElementById("jadwal-edit-mapel").value
  };
  const res = await fetch(`${GAS_URL}?action=saveJadwal&data=${encodeURIComponent(JSON.stringify(payload))}`).then(r => r.json());
  alert(res.message);
  if (res.success) {
    document.getElementById("modal-jadwal").classList.add("hidden");
    loadAdminData();
  }
}

export async function hapusJadwal(id) {
  if (!confirm("Hapus jadwal ini?")) return;
  const res = await fetch(`${GAS_URL}?action=deleteJadwal&data=${encodeURIComponent(JSON.stringify({id_jadwal: id}))}`).then(r => r.json());
  alert(res.message);
  loadAdminData();
}

export function renderListPintasanAdmin() {
  const container = document.getElementById("list-pintasan-admin");
  fetch(`${GAS_URL}?action=getPintasanLink`).then(r => r.json()).then(res => {
    if (res.success) {
      container.innerHTML = res.data.map(l => `
        <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-xs">
          <div>
            <h5 class="font-bold text-slate-800">${l.judul}</h5>
            <p class="text-[10px] text-blue-600 truncate max-w-[200px]">${l.url}</p>
          </div>
          <button class="btn-hapus-link text-rose-600 p-1.5" data-id='${l.id_link}'><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </div>
      `).join('');

      document.querySelectorAll('.btn-hapus-link').forEach(btn => {
        btn.onclick = async () => {
          if (!confirm("Hapus pintasan link ini?")) return;
          const r = await fetch(`${GAS_URL}?action=deletePintasanLink&data=${encodeURIComponent(JSON.stringify({id_link: btn.dataset.id}))}`).then(x => x.json());
          alert(r.message);
          renderListPintasanAdmin();
        };
      });
      lucide.createIcons();
    }
  });
}

export async function simpanPintasanLink() {
  const payload = {
    id_link: document.getElementById("link-edit-id").value,
    judul: document.getElementById("link-edit-judul").value,
    url: document.getElementById("link-edit-url").value,
    icon: "external-link"
  };
  const res = await fetch(`${GAS_URL}?action=savePintasanLink&data=${encodeURIComponent(JSON.stringify(payload))}`).then(r => r.json());
  alert(res.message);
  if (res.success) {
    document.getElementById("modal-pintasan-link").classList.add("hidden");
    renderListPintasanAdmin();
  }
}

export async function simpanDataGuru() {
  const guru = {
    id_guru: document.getElementById("guru-edit-id").value,
    nama: document.getElementById("guru-edit-nama").value,
    nip: document.getElementById("guru-edit-nip").value,
    pangkat_golongan: document.getElementById("guru-edit-pangkat-gol").value,
    jabatan: document.getElementById("guru-edit-jabatan").value,
    mapel: document.getElementById("guru-edit-mapel").value,
    hp: document.getElementById("guru-edit-hp").value,
    pin: document.getElementById("guru-edit-pin").value,
    aktif: true
  };
  const res = await fetch(`${GAS_URL}?action=saveGuru&data=${encodeURIComponent(JSON.stringify(guru))}`).then(r => r.json());
  alert(res.message);
  if (res.success) { document.getElementById("modal-guru").classList.add("hidden"); loadAdminData(); }
}

export async function simpanKoreksiAbsen() {
  const data = {
    id_absen: document.getElementById("edit-absen-id").value,
    jam_pagi: document.getElementById("edit-pagi-jam").value || "-",
    status_pagi: document.getElementById("edit-pagi-status").value,
    ket_pagi: document.getElementById("edit-pagi-ket").value || "-",
    jam_siang: document.getElementById("edit-siang-jam").value || "-",
    status_siang: document.getElementById("edit-siang-status").value,
    ket_siang: document.getElementById("edit-siang-ket").value || "-"
  };
  const res = await fetch(`${GAS_URL}?action=editAbsensi&data=${encodeURIComponent(JSON.stringify(data))}`).then(r => r.json());
  alert(res.message);
  if (res.success) { document.getElementById("modal-edit-absen").classList.add("hidden"); loadAdminData(); }
}

export async function uploadFileDrive(inputId, keyConfig) {
  const input = document.getElementById(inputId);
  if (!input.files || !input.files[0]) { alert("Pilih berkas terlebih dahulu!"); return; }
  const file = input.files[0];
  const reader = new FileReader();
  reader.onload = async function(e) {
    const payload = {
      action: "uploadDriveFile",
      base64: e.target.result,
      fileName: file.name,
      mimeType: file.type,
      keyConfig: keyConfig
    };
    const res = await fetch(GAS_URL, { method: "POST", body: JSON.stringify(payload) }).then(r => r.json());
    alert(res.message);
    if (res.success) loadAdminData();
  };
  reader.readAsDataURL(file);
}

export function renderJadwalWaktu() {
  const container = document.getElementById("container-jadwal-hari");
  const cfg = state.adminData.config || {};
  container.innerHTML = HARI_LIST.map(h => {
    const k = h.toLowerCase();
    return `
      <div class="p-3 border border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
        <span class="font-bold text-xs text-slate-700 block">${h}</span>
        <div class="grid grid-cols-2 gap-2 text-[11px]">
          <div><label class="text-slate-500">Mulai Pagi</label><input type="time" id="${k}_mulai_pagi" value="${cfg[k + '_mulai_pagi'] || '06:30'}" class="w-full bg-white border p-1.5 rounded-lg"></div>
          <div><label class="text-slate-500">Toleransi Pagi</label><input type="time" id="${k}_tol_pagi" value="${cfg[k + '_tol_pagi'] || '07:15'}" class="w-full bg-white border p-1.5 rounded-lg"></div>
          <div><label class="text-slate-500">Mulai Siang</label><input type="time" id="${k}_mulai_siang" value="${cfg[k + '_mulai_siang'] || '12:00'}" class="w-full bg-white border p-1.5 rounded-lg"></div>
          <div><label class="text-slate-500">Batas Siang</label><input type="time" id="${k}_batas_siang" value="${cfg[k + '_batas_siang'] || '14:00'}" class="w-full bg-white border p-1.5 rounded-lg"></div>
        </div>
      </div>
    `;
  }).join('');
}

export async function simpanJadwalWaktu() {
  const config = state.adminData.config || {};
  HARI_LIST.forEach(h => {
    const k = h.toLowerCase();
    config[k + '_mulai_pagi'] = document.getElementById(`${k}_mulai_pagi`).value;
    config[k + '_tol_pagi'] = document.getElementById(`${k}_tol_pagi`).value;
    config[k + '_mulai_siang'] = document.getElementById(`${k}_mulai_siang`).value;
    config[k + '_batas_siang'] = document.getElementById(`${k}_batas_siang`).value;
  });
  const res = await fetch(`${GAS_URL}?action=savePengaturan&data=${encodeURIComponent(JSON.stringify(config))}`).then(r => r.json());
  alert(res.message);
  loadAdminData();
}

export function renderHariLibur() {
  const container = document.getElementById("list-hari-libur");
  const list = state.adminData.hariLibur || [];
  if (list.length === 0) { container.innerHTML = `<p class="text-xs text-slate-400 italic">Belum ada hari libur.</p>`; return; }
  container.innerHTML = list.map(l => `
    <div class="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
      <div><span class="font-bold text-slate-800">${l.tanggal}</span><p class="text-slate-500 text-[11px]">${l.keterangan}</p></div>
      <button class="btn-hapus-libur text-rose-600 p-1" data-id='${l.id_libur}'><i data-lucide="trash-2" class="w-4 h-4"></i></button>
    </div>
  `).join('');

  document.querySelectorAll('.btn-hapus-libur').forEach(btn => {
    btn.onclick = () => hapusHariLibur(btn.dataset.id);
  });
}

export async function tambahHariLibur() {
  const tgl = document.getElementById("libur-tanggal").value;
  const ket = document.getElementById("libur-ket").value;
  if (!tgl || !ket) { alert("Tanggal & keterangan wajib!"); return; }
  const res = await fetch(`${GAS_URL}?action=addHariLibur&data=${encodeURIComponent(JSON.stringify({tanggal: tgl, keterangan: ket}))}`).then(r => r.json());
  alert(res.message);
  loadAdminData();
}

export async function hapusHariLibur(id) {
  if (!confirm("Hapus hari libur?")) return;
  const res = await fetch(`${GAS_URL}?action=deleteHariLibur&data=${encodeURIComponent(JSON.stringify({id_libur: id}))}`).then(r => r.json());
  alert(res.message);
  loadAdminData();
}

export function renderPengaturanUmum() {
  const cfg = state.adminData.config || {};
  document.getElementById("cfg-sekolah").value = cfg.nama_sekolah || '';
  document.getElementById("cfg-ta").value = cfg.tahun_ajaran || '';
  document.getElementById("cfg-kota").value = cfg.kota || '';
  document.getElementById("cfg-kepsek").value = cfg.nama_kepsek || '';
  document.getElementById("cfg-nip-kepsek").value = cfg.nip_kepsek || '';
  document.getElementById("cfg-geofence-active").checked = cfg.geofence_active === "true";
  document.getElementById("cfg-lat-sekolah").value = cfg.lat_sekolah || '';
  document.getElementById("cfg-lng-sekolah").value = cfg.lng_sekolah || '';
  document.getElementById("cfg-radius-meter").value = cfg.radius_meter || '100';
}

export async function simpanPengaturanUmum() {
  const config = state.adminData.config || {};
  config.nama_sekolah = document.getElementById("cfg-sekolah").value;
  config.tahun_ajaran = document.getElementById("cfg-ta").value;
  config.kota = document.getElementById("cfg-kota").value;
  config.nama_kepsek = document.getElementById("cfg-kepsek").value;
  config.nip_kepsek = document.getElementById("cfg-nip-kepsek").value;
  config.geofence_active = document.getElementById("cfg-geofence-active").checked ? "true" : "false";
  config.lat_sekolah = document.getElementById("cfg-lat-sekolah").value;
  config.lng_sekolah = document.getElementById("cfg-lng-sekolah").value;
  config.radius_meter = document.getElementById("cfg-radius-meter").value;

  const res = await fetch(`${GAS_URL}?action=savePengaturan&data=${encodeURIComponent(JSON.stringify(config))}`).then(r => r.json());
  alert(res.message);
  loadAdminData();
}

export async function generateLaporan() {
  const tipe = document.getElementById("lap-tipe").value;
  const tanggal = document.getElementById("lap-tanggal").value;
  const periodeTeks = document.getElementById("lap-periode-teks").value;

  const res = await fetch(`${GAS_URL}?action=getLaporan&data=${encodeURIComponent(JSON.stringify({tipe, tanggal}))}`).then(r => r.json());
  if (res.success) {
    const area = document.getElementById("area-laporan");
    area.classList.remove("hidden");
    const cfg = res.config;

    let tableHtml = "";
    if (res.tipe === "harian") {
      tableHtml = `
        <div class="text-center mb-4 space-y-1">
          ${cfg.kop_url ? `<img src="${cfg.kop_url}" class="h-20 mx-auto mb-2 object-contain">` : ''}
          <h2 class="font-bold text-sm text-slate-900 uppercase">Daftar Hadir Guru ${cfg.nama_sekolah || ''}</h2>
          <p class="text-xs text-slate-600">Periode: ${tanggal}</p>
          <p class="text-xs text-slate-500">Tahun Ajaran ${cfg.tahun_ajaran || ''}</p>
        </div>
        <table class="w-full border-collapse border border-slate-300 text-[10px]">
          <thead>
            <tr class="bg-slate-100 text-slate-700">
              <th class="border border-slate-300 p-1.5">No.</th>
              <th class="border border-slate-300 p-1.5 text-left">Nama Lengkap</th>
              <th class="border border-slate-300 p-1.5 text-left">NIP</th>
              <th class="border border-slate-300 p-1.5 text-left">Jabatan</th>
              <th class="border border-slate-300 p-1.5 text-left">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            ${res.data.map((d, i) => `
              <tr>
                <td class="border border-slate-300 p-1.5 text-center">${i + 1}</td>
                <td class="border border-slate-300 p-1.5 font-semibold">${d.nama}</td>
                <td class="border border-slate-300 p-1.5">${d.nip || '-'}</td>
                <td class="border border-slate-300 p-1.5">${d.jabatan || 'Guru'}</td>
                <td class="border border-slate-300 p-1.5">${d.keterangan}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else {
      tableHtml = `
        <div class="text-center mb-4 space-y-1">
          ${cfg.kop_url ? `<img src="${cfg.kop_url}" class="h-20 mx-auto mb-2 object-contain">` : ''}
          <h2 class="font-bold text-sm text-slate-900 uppercase">Daftar Hadir Guru ${cfg.nama_sekolah || ''}</h2>
          <p class="text-xs text-slate-600">Periode: ${periodeTeks || 'Ganjil/Genap'}</p>
          <p class="text-xs text-slate-500">Tahun Ajaran ${cfg.tahun_ajaran || ''}</p>
        </div>
        <table class="w-full border-collapse border border-slate-300 text-[10px]">
          <thead>
            <tr class="bg-slate-100 text-slate-700">
              <th class="border border-slate-300 p-1">No.</th>
              <th class="border border-slate-300 p-1 text-left">Nama Lengkap</th>
              <th class="border border-slate-300 p-1 text-left">NIP</th>
              <th class="border border-slate-300 p-1 text-left">Jabatan</th>
              <th class="border border-slate-300 p-1">Hadir</th>
              <th class="border border-slate-300 p-1">Alpa</th>
              <th class="border border-slate-300 p-1">Izin</th>
              <th class="border border-slate-300 p-1">Sakit</th>
              <th class="border border-slate-300 p-1">DL</th>
              <th class="border border-slate-300 p-1">%</th>
            </tr>
          </thead>
          <tbody>
            ${res.data.map((d, i) => `
              <tr>
                <td class="border border-slate-300 p-1 text-center">${i + 1}</td>
                <td class="border border-slate-300 p-1 font-semibold">${d.nama}</td>
                <td class="border border-slate-300 p-1">${d.nip || '-'}</td>
                <td class="border border-slate-300 p-1">${d.jabatan || 'Guru'}</td>
                <td class="border border-slate-300 p-1 text-center">${d.rekap.hadir}</td>
                <td class="border border-slate-300 p-1 text-center">${d.rekap.alpa}</td>
                <td class="border border-slate-300 p-1 text-center">${d.rekap.izin}</td>
                <td class="border border-slate-300 p-1 text-center">${d.rekap.sakit}</td>
                <td class="border border-slate-300 p-1 text-center">${d.rekap.dl}</td>
                <td class="border border-slate-300 p-1 text-center font-bold text-blue-600">${d.persentase}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    tableHtml += `
      <div class="mt-8 flex justify-end text-xs">
        <div class="text-center space-y-1">
          <p>${cfg.kota || 'Kota'}, ${new Date().toLocaleDateString('id-ID')}</p>
          <p class="font-medium">Kepala Sekolah</p>
          <div class="h-16"></div>
          <p class="font-bold underline">${cfg.nama_kepsek || '...................'}</p>
          <p class="text-slate-500">NIP. ${cfg.nip_kepsek || '...................'}</p>
        </div>
      </div>
    `;

    area.innerHTML = tableHtml;
  }
}
