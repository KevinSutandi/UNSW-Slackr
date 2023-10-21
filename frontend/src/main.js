import {
  handleChannelDisplay,
  handleLogin,
  handleLogout,
  handleRegister,
} from "./apiCalls.js";

import { showPage } from "./helpers.js";

export let globalToken = undefined;
export let globalUserId = undefined;

function handleRegisterChange() {
  showPage("register-page");
}

function handleLoginChange() {
  showPage("login-page");
}

function showAppropriatePage() {
  if (isTokenValid()) {
    showPage("main-page");
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

window.addEventListener("DOMContentLoaded", showAppropriatePage);
window.addEventListener("load", handleChannelDisplay);

// // For channel Creation
// document.getElementById("");

// Check if a valid token exists
// Function to check token when on the homepage or any page
function isTokenValid() {
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");
  globalToken = token;
  globalUserId = userId;
  return token !== "undefined";
}
