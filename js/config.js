export const GAS_URL = "https://script.google.com/macros/s/AKfycby508SQV8wxmHBOFKaR0NR4sKsHO1E4dg7hwQxdYOn112SD7q7O072IUA2CFG-ERucZ/exec";
export const HARI_LIST = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export let state = {
  currentUser: JSON.parse(localStorage.getItem("user")) || null,
  adminData: null,
  globalConfig: JSON.parse(localStorage.getItem("global_config")) || null
};

export function setCurrentUser(user) {
  state.currentUser = user;
}

export function setAdminData(data) {
  state.adminData = data;
}

export function setGlobalConfig(cfg) {
  state.globalConfig = cfg;
}
