// A helper you may want to use when uploading new images to the server.
import { fileToDataUrl, apiCall, setTokens, showPage } from "./helpers.js";

function showErrorModal(errorMessage) {
  const errorModal = document.getElementById("errorModal");
  const errorModalContent = document.getElementById("errorModalContent");

  errorModalContent.textContent = errorMessage;

  const bootstrapModal = new bootstrap.Modal(errorModal);
  bootstrapModal.show();
}

export const handleLogin = () => {
  let emailInput = document.getElementById("emailInput").value;
  let passwordInput = document.getElementById("passwordInput").value;

  // Normal empty checks
  if (!emailInput || !passwordInput) {
    showErrorModal("Please enter your email and password");
    return;
  }

  const body = { email: emailInput, password: passwordInput };

  apiCall("auth/login", body, "POST", false)
    .then((response) => {
      setTokens(response.token, response.userId);
      showPage("main-page");
    })
    .catch((error) => {
      showErrorModal(error);
    });
};

export const handleRegister = () => {
  let emailRegisterInput = document.getElementById("emailRegisterInput").value;
  let nameRegisterInput = document.getElementById("nameRegisterInput").value;
  let passwordRegisterInput = document.getElementById(
    "passwordRegisterInput"
  ).value;
  let confirmPasswordInput = document.getElementById(
    "confirmPasswordRegisterInput"
  ).value;

  // Normal empty checks
  if (!emailRegisterInput || !nameRegisterInput || !passwordRegisterInput) {
    showErrorModal("Please enter your email, name and password");
    return;
  }

  const body = {
    email: emailRegisterInput,
    password: passwordRegisterInput,
    name: nameRegisterInput,
  };

  if (passwordRegisterInput != confirmPasswordInput) {
    showErrorModal("Password does not match");
    return;
  } else {
    apiCall("auth/register", body, "POST", false)
      .then((response) => {
        setTokens(response.token, response.userId);
        showPage("main-page");
      })
      .catch((error) => {
        showErrorModal(error);
      });
  }
};

export const handleLogout = () => {
  apiCall("auth/logout", {}, "POST", true)
    .then((response) => {
      setTokens(response.token, response.userId);
      showPage("login-page");
    })
    .catch((error) => {
      showErrorModal(error);
    });
};
