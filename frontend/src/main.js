import {
  handleChannelDisplay,
  handleLogin,
  handleLogout,
  handleRegister,
  handleCreateChannel,
  changeChannelViewWelcome,
  openCreateChannelModal,
  showPage,
  clearLoginForm,
  clearRegisterForm,
} from "./functionBank.js";

export let globalToken = null;
export let globalUserId = null;

function handleRegisterChange() {
  showPage("register-page");
  clearLoginForm();
}

function handleLoginChange() {
  showPage("login-page");
  clearRegisterForm();
}

export function showAppropriatePage() {
  if (isTokenValid()) {
    showPage("main-page");
    handleChannelDisplay();
  } else {
    showPage("login-page");
  }
}

// Event Listeners
document.getElementById("loginButton").addEventListener("click", handleLogin);
document
  .getElementById("registerButton")
  .addEventListener("click", handleRegister);
document.getElementById("logoutButton").addEventListener("click", handleLogout);

document
  .getElementById("registerChangeButton")
  .addEventListener("click", handleRegisterChange);
document
  .getElementById("loginChangeButton")
  .addEventListener("click", handleLoginChange);

document
  .getElementById("createChannel")
  .addEventListener("click", openCreateChannelModal);

document
  .getElementById("createChannelButton")
  .addEventListener("click", handleCreateChannel);

document
  .getElementById("resetPage")
  .addEventListener("click", changeChannelViewWelcome);

window.addEventListener("DOMContentLoaded", showAppropriatePage);

// Check if a valid token exists
// Function to check token when on the homepage or any page
function isTokenValid() {
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");
  globalToken = token;
  globalUserId = userId;
  if (token === "undefined" || token === null) {
    return false;
  } else {
    return true;
  }
}
