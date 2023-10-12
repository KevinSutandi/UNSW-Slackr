import { BACKEND_PORT } from "./config.js";
// A helper you may want to use when uploading new images to the server.
import { fileToDataUrl, apiCall, setTokens } from "./helpers.js";

const backend = "http://localhost:5005/";
const frontend = "http://localhost:";
const loginPage = document.getElementById("login-page");
const registerPage = document.getElementById("register-page");

const handleLogin = () => {
  let emailInput = document.getElementById("emailInput").value;
  let passwordInput = document.getElementById("passwordInput").value;

  apiCall("auth/login", { email: emailInput, password: passwordInput })
    .then((response) => {
      console.log(response.token);
        setTokens(response.token, response.userId);
        console.log('ok')
        window.location.href = "index.html";
    })
    .catch((error) => {
      console.error(error);
    });
};

const handleRegister = () => {
  let emailRegisterInput = document.getElementById("emailInput").value;
  let nameRegisterInput  = document.getElementById("nameRegisterInput").value;
  let passwordRegisterInput = document.getElementById("passwordInput").value;
  let confirmPasswordInput = document.getElementById("confirmPasswordRegisterInput").value;

  if (passwordRegisterInput != confirmPasswordInput) {
    alert("Password does not match");
    return;
  }

  apiCall("auth/register", { email: emailRegisterInput, password: passwordRegisterInput, name: nameRegisterInput })
    .then((response) => {
      console.log(response.token);
        setTokens(response.token, response.userId);
        console.log('ok')
        window.location.href = "index.html";
    })
    .catch((error) => {
      console.error(error);
    });
};


const loginButton = document.getElementById("loginButton");
const registerButton = document.getElementById("registerSubmitButton");
loginButton.addEventListener("click", handleLogin);
registerButton.addEventListener("click", handleRegister);


// Changing between login and register page javascript
const loginChangeButton = document.getElementById("loginChangeButton");
const registerChangeButton = document.getElementById("registerChangeButton");

registerChangeButton.addEventListener("click", function () {
  loginPage.classList.add("hide-page");

  registerPage.classList.remove("hide-page");
});

loginChangeButton.addEventListener("click", function () {
  registerPage.classList.add("hide-page");

  loginPage.classList.remove("hide-page");
});
