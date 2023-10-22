import {
  fileToDataUrl,
  apiCall,
  setTokens,
  showPage,
  apiCallGet,
} from "./helpers.js";

import { globalUserId } from "./main.js";

// Helper function to display an error modal
function showErrorModal(errorMessage) {
  const errorModal = document.getElementById("errorModal");
  const errorModalContent = document.getElementById("errorModalContent");
  errorModalContent.textContent = errorMessage;
  const bootstrapModal = new bootstrap.Modal(errorModal);
  bootstrapModal.show();
}

// Event handler for user login
export const handleLogin = () => {
  const emailInput = document.getElementById("emailInput").value;
  const passwordInput = document.getElementById("passwordInput").value;

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

// Event handler for user registration
export const handleRegister = () => {
  const emailRegisterInput =
    document.getElementById("emailRegisterInput").value;
  const nameRegisterInput = document.getElementById("nameRegisterInput").value;
  const passwordRegisterInput = document.getElementById(
    "passwordRegisterInput"
  ).value;
  const confirmPasswordInput = document.getElementById(
    "confirmPasswordRegisterInput"
  ).value;

  if (!emailRegisterInput || !nameRegisterInput || !passwordRegisterInput) {
    showErrorModal("Please enter your email, name, and password");
    return;
  }

  const body = {
    email: emailRegisterInput,
    password: passwordRegisterInput,
    name: nameRegisterInput,
  };

  if (passwordRegisterInput !== confirmPasswordInput) {
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

// Event handler for user logout
export const handleLogout = () => {
  apiCall("auth/logout", {}, "POST", true)
    .then(() => {
      setTokens(undefined, undefined);
      showPage("login-page");
    })
    .catch((error) => {
      showErrorModal(error);
    });
};

// Event handler for displaying user's channels
export const handleChannelDisplay = () => {
  // Clear the container elements before repopulating
  clearChannelContainer("joinedChannelContainer");
  clearChannelContainer("publicChannelContainer");

  apiCallGet("channel", true)
    .then((response) => {
      const joinedChannel = [];
      const otherChannels = [];
      response.channels.forEach((channel) => {
        if (
          channel.members &&
          channel.members.includes(parseInt(globalUserId))
        ) {
          joinedChannel.push(channel);
        } else {
          if (!channel.private) {
            otherChannels.push(channel);
          }
        }
      });

      populateChannelsList(joinedChannel, "joinedChannelContainer");
      populateChannelsList(otherChannels, "publicChannelContainer");
    })
    .catch((error) => {
      showErrorModal(error);
    });
};

// Event handler for creating a new channel
export const handleCreateChannel = () => {
  const channelNameInput = document.getElementById("channelNameInput").value;
  const descriptionInput = document.getElementById("descriptionInput").value;
  const isPrivate = document.getElementById("setPrivateChannel").checked;

  const body = {
    name: channelNameInput,
    private: isPrivate,
    description: descriptionInput,
  };

  apiCall("channel", body, "POST", true)
    .then(() => {
      handleChannelDisplay();
    })
    .catch((error) => {
      showErrorModal(error);
    });
};

// Function to clear all channel items from a container
function clearChannelContainer(containerId) {
  const container = document.getElementById(containerId);
  const channelItems = container.getElementsByClassName("channel-item");

  while (channelItems.length > 0) {
    container.removeChild(channelItems[0]);
  }
}

// Function to populate a list of channels in a specified container
function populateChannelsList(channels, targetElement) {
  const channelList = document.getElementById(targetElement);
  const channelItemTemplate = document
    .querySelector(".channel-item")
    .cloneNode(true);
  const channelItemPrivateTemplate = document
    .querySelector(".channel-item-private")
    .cloneNode(true);

  channels.forEach((channel) => {
    const channelItem = channel.private
      ? channelItemPrivateTemplate.cloneNode(true)
      : channelItemTemplate.cloneNode(true);

    channelItem.classList.remove("d-none");
    const channelNameElement = channelItem.querySelector("#channelName");
    channelNameElement.textContent = channel.name;

    // Add a click event listener to each channel item
    channelItem.addEventListener("click", () => {
      handleChannelClick(channel);
    });

    channelList.appendChild(channelItem);
  });
}

// Event handler for when a channel is clicked
function handleChannelClick(channel) {
  apiCallGet(`channel/${channel.id}`, true)
    .then((response) => {
      const channel = response;
      changeChannelViewPage(channel);
    })
    .catch((error) => {
      showErrorModal(error);
    });
}

export function changeChannelViewPage(channel) {
  const channelInfoPage = document.getElementById("channelInfoPage");
  const welcomeScreen = document.getElementById("welcome-screen");

  // Hide the welcome screen
  welcomeScreen.classList.add("d-none");

  // Show the channel info page
  channelInfoPage.classList.remove("d-none");

  const channelName = document.getElementById("channelViewName");
  const channelDescription = document.getElementById("channelViewDescription");
  const channelCreationDate = document.getElementById("channelCreationDate");

  const dateString = channel.createdAt;
  const date = new Date(dateString);
  const options = {
    year: "numeric",
    month: "long",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  };

  const formattedDate = date.toLocaleDateString("en-US", options);
  channelName.textContent = channel.name;
  channelDescription.textContent = channel.description;
  channelCreationDate.textContent = `Created on: ${formattedDate}`;
}
