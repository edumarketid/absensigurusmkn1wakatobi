// ==========================================
// CONFIG & STATE ENGINE V1.8.3
// ==========================================

export const GAS_URL = "https://script.google.com/macros/s/AKfycby508SQV8wxmHBOFKaR0NR4sKsHO1E4dg7hwQxdYOn112SD7q7O072IUA2CFG-ERucZ/exec; // Pastikan URL Web App valid

export const HARI_LIST = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export const state = {
  currentUser: JSON.parse(localStorage.getItem("user") || "null"),
  globalConfig: JSON.parse(localStorage.getItem("global_config") || "null"),
  adminData: {
    guru: [],
    absensi: [],
    jadwal: [],
    hariLibur: [],
    config: {}
  }
};

export function setCurrentUser(user) {
  state.currentUser = user;
}

export function setGlobalConfig(cfg) {
  state.globalConfig = cfg;
}

export function setAdminData(data) {
  state.adminData = data;
}
