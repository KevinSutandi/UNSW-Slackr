import { globalToken } from "./main.js";

/**
 * Given a js file object representing a jpg or png image, such as one taken
 * from a html file input element, return a promise which resolves to the file
 * data as a data url.
 * More info:
 *   https://developer.mozilla.org/en-US/docs/Web/API/File
 *   https://developer.mozilla.org/en-US/docs/Web/API/FileReader
 *   https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs
 *
 * Example Usage:
 *   const file = document.querySelector('input[type="file"]').files[0];
 *   console.log(fileToDataUrl(file));
 * @param {File} file The file to be read.
 * @return {Promise<string>} Promise which resolves to the file as a data url.
 */
export function fileToDataUrl(file) {
  const validFileTypes = ["image/jpeg", "image/png", "image/jpg"];
  const valid = validFileTypes.find((type) => type === file.type);
  // Bad data, let's walk away.
  if (!valid) {
    throw Error("provided file is not a png, jpg or jpeg image.");
  }

  const reader = new FileReader();
  const dataUrlPromise = new Promise((resolve, reject) => {
    reader.onerror = reject;
    reader.onload = () => resolve(reader.result);
  });
  reader.readAsDataURL(file);
  return dataUrlPromise;
}

const backend = "http://localhost:5005/";

export const apiCall = (path, body, method, isAuth = false) => {
  return new Promise((resolve, reject) => {
    fetch(backend + path, {
      method: method,
      headers: {
        "Content-type": "application/json",
        Authorization: isAuth ? `Bearer ${globalToken}` : undefined,
      },
      body: JSON.stringify(body),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          reject(data.error);
        } else {
          resolve(data); // Resolve with the data
        }
      });
  });
};

export const apiCallGet = (path, isAuth = false) => {
  return new Promise((resolve, reject) => {
    fetch(backend + path, {
      method: "GET",
      headers: {
        "Content-type": "application/json",
        Authorization: isAuth ? `Bearer ${globalToken}` : undefined,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          reject(data.error);
        } else {
          resolve(data); // Resolve with the data
        }
      });
  });
};

export function setTokens(token, userId) {
  localStorage.setItem("token", token);
  localStorage.setItem("userId", userId);
  token;
}

export function showPage(pageId) {
  const loginPage = document.getElementById("login-page");
  const registerPage = document.getElementById("register-page");
  const mainPage = document.getElementById("main-page");
  const pages = [loginPage, registerPage, mainPage];

  pages.forEach((page) => {
    if (page.id === pageId) {
      page.classList.remove("d-none");
    } else {
      page.classList.add("d-none");
    }
  });
}

export function populateChannelsList(channels, targetElement) {
  const channelList = document.getElementById(targetElement);

  channels.forEach((channel) => {
    const channelItem = document.querySelector(".channel-item").cloneNode(true);
    channelItem.classList.remove("d-none"); // Remove the 'd-none' class to make it visible
    channelItem.querySelector("#channelName").textContent = channel.name;
    channelList.appendChild(channelItem);
  });
}
