import { fileToDataUrl, apiCall, apiCallGet } from "./helpers.js";

import { globalUserId, showAppropriatePage } from "./main.js";

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
  const emailInput = document.getElementById("emailInput");
  const passwordInput = document.getElementById("passwordInput");

  if (!emailInput.value || !passwordInput.value) {
    showErrorModal("Please enter your email and password");
    return;
  }

  const body = { email: emailInput.value, password: passwordInput.value };

  apiCall("auth/login", body, "POST", false)
    .then((response) => {
      setTokens(response.token, response.userId);
      showAppropriatePage();
      clearLoginForm();
    })
    .catch((error) => {
      showErrorModal(error);
    });
};

// Event handler for user registration
export const handleRegister = () => {
  const emailRegisterInput = document.getElementById("emailRegisterInput");
  const nameRegisterInput = document.getElementById("nameRegisterInput");
  const passwordRegisterInput = document.getElementById(
    "passwordRegisterInput"
  );
  const confirmPasswordInput = document.getElementById(
    "confirmPasswordRegisterInput"
  );

  if (
    !emailRegisterInput.value ||
    !nameRegisterInput.value ||
    !passwordRegisterInput.value
  ) {
    showErrorModal("Please enter your email, name, and password");
    return;
  }

  const body = {
    email: emailRegisterInput.value,
    password: passwordRegisterInput.value,
    name: nameRegisterInput.value,
  };

  if (passwordRegisterInput !== confirmPasswordInput) {
    showErrorModal("Password does not match");
    return;
  } else {
    apiCall("auth/register", body, "POST", false)
      .then((response) => {
        setTokens(response.token, response.userId);
        showAppropriatePage();
        clearRegisterForm();
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
      showAppropriatePage();
    })
    .catch((error) => {
      showErrorModal(error);
    });
};

export const handleChannelDisplay = async () => {
  try {
    // Fetch user's channels
    const userChannels = await getUserChannels();

    // Separate joined and public channels
    const joinedChannels = userChannels.filter((channel) =>
      channel.members.includes(parseInt(globalUserId))
    );
    const publicChannels = userChannels.filter(
      (channel) =>
        !channel.members.includes(parseInt(globalUserId)) && !channel.private
    );

    // Clear the container elements
    clearChannelContainer("joinedChannelContainer");
    clearChannelContainer("publicChannelContainer");

    // Populate the channel lists
    console.log(publicChannels);
    populateChannelsList(joinedChannels, "joinedChannelContainer");
    populateChannelsList(publicChannels, "publicChannelContainer");
  } catch (error) {
    showErrorModal(error);
  }
};

// Event handler for when a channel is clicked
export function handleChannelClick(channelId) {
  console.log(channelId);
  apiCallGet(`channel/${channelId}`, true)
    .then((response) => {
      changeChannelViewPage(response, channelId);
    })
    .catch((error) => {
      const notMember = "Authorised user is not a member of this channel";
      if (error === notMember) {
        openJoinChannelModal(channelId);
      } else {
        showErrorModal(error);
      }
    });
}

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

async function handleLeaveChannel(channelId) {
  try {
    // Call the API to update the channel data
    const response = await apiCall(
      `channel/${channelId}/leave`,
      {},
      "POST",
      true
    );

    changeChannelViewWelcome();
    handleChannelDisplay();
  } catch (error) {
    showErrorModal(error);
  }
}

async function handleJoinChannel(channelId) {
  try {
    // Call the API to update the channel data
    const response = await apiCall(
      `channel/${channelId}/join`,
      {},
      "POST",
      true
    );

    handleChannelClick(channelId);
    handleChannelDisplay();
  } catch (error) {
    showErrorModal(error);
  }
}

///////////////////////////////////////////////////
/**
 * Helper Functions
 */

// Helper function to clear login page
export function clearLoginForm() {
  const emailInput = document.getElementById("emailInput");
  const passwordInput = document.getElementById("passwordInput");

  emailInput.value = "";
  passwordInput.value = "";
}

export function clearRegisterForm() {
  const emailRegisterInput = document.getElementById("emailRegisterInput");
  const nameRegisterInput = document.getElementById("nameRegisterInput");
  const passwordRegisterInput = document.getElementById(
    "passwordRegisterInput"
  );
  const confirmPasswordInput = document.getElementById(
    "confirmPasswordRegisterInput"
  );

  emailRegisterInput.value = "";
  nameRegisterInput.value = "";
  passwordRegisterInput.value = "";
  confirmPasswordInput.value = "";
}
// Helper function to fetch user's channels
async function getUserChannels() {
  const response = await apiCallGet("channel", true);
  return response.channels.map((channel) => ({
    ...channel,
    isMember: channel.members.includes(parseInt(globalUserId)),
  }));
}

// Function to clear all channel items from a container
function clearChannelContainer(containerId) {
  const container = document.getElementById(containerId);
  const channelItems = container.getElementsByClassName("channel-item");

  while (channelItems.length > 0) {
    container.removeChild(channelItems[0]);
  }

  const channelItemsPrivate = container.getElementsByClassName(
    "channel-item-private"
  );

  while (channelItemsPrivate.length > 0) {
    container.removeChild(channelItemsPrivate[0]);
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
    console.log(channelNameElement.value);
    channelNameElement.textContent = channel.name;

    // Add a click event listener to each channel item
    channelItem.addEventListener("click", () => {
      handleChannelClick(channel.id);
    });

    channelList.appendChild(channelItem);
  });
}

export function changeChannelViewWelcome() {
  const channelInfoPage = document.getElementById("channelInfoPage");
  const welcomeScreen = document.getElementById("welcome-screen");

  // Show the welcome screen
  welcomeScreen.classList.remove("d-none");

  // Hide the channel info page
  channelInfoPage.classList.add("d-none");
}

export async function changeChannelViewPage(channel, channelId) {
  const channelInfoPage = document.getElementById("channelInfoPage");
  const welcomeScreen = document.getElementById("welcome-screen");
  const channelName = document.getElementById("channelViewName");
  const channelDescription = document.getElementById("channelViewDescription");
  const channelCreationDetails = document.getElementById("channelCreator");
  const privateIcon = document.getElementById("privateIcon");
  const publicIcon = document.getElementById("publicIcon");

  const channelButtonTemplate = document
    .querySelector(".channel-buttons")
    .cloneNode(true);

  channelButtonTemplate.classList.remove("d-none");

  // Access the buttons within the clone
  const editButton = channelButtonTemplate.querySelector("#editChannel");
  const leaveButton = channelButtonTemplate.querySelector("#leaveChannel");

  editButton.addEventListener("click", () =>
    openEditChannelModal(channel, channelId)
  );

  leaveButton.addEventListener("click", () =>
    openLeaveChannelModal(channel, channelId)
  );

  welcomeScreen.classList.add("d-none");
  channelInfoPage.classList.remove("d-none");

  const formattedDate = new Date(channel.createdAt).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }
  );

  const container = document.querySelector(".channel-buttons-container");

  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
  container.appendChild(channelButtonTemplate);

  try {
    const userDetails = await apiCallGet(
      `user/${parseInt(channel.creator)}`,
      true
    );

    channelName.textContent = channel.name;
    channelDescription.textContent = channel.description;
    channelCreationDetails.textContent = `Channel created by: ${userDetails.name} | ${formattedDate}`;

    privateIcon.style.display = channel.private ? "inline-block" : "none";
    publicIcon.style.display = channel.private ? "none" : "inline-block";
  } catch (error) {
    showErrorModal(error);
  }
}

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

export function openCreateChannelModal() {
  const newChannelModal = new bootstrap.Modal(
    document.getElementById("createChannelModal")
  );

  newChannelModal.show();
}

async function handleSaveChanges(channelId) {
  try {
    // Construct the request body with the updated channel data
    const body = {
      name: editChannelName.value, // Update with the new name
      description: editDescription.value, // Update with the new description
    };

    // Call the API to update the channel data
    const response = await apiCall(`channel/${channelId}`, body, "PUT", true);

    handleChannelClick(channelId);
    handleChannelDisplay();
  } catch (error) {
    showErrorModal(error);
  }
}

function openEditChannelModal(channel, channelId) {
  // Create a unique modal element for this channel
  const uniqueEditChannelModal = new bootstrap.Modal(
    document.getElementById("editChannelModal")
  );

  const editChannelSaveChanges = document.querySelector("#editChannelButton");
  const editChannelNameInput = document.querySelector("#editChannelName");
  const editChannelDescInput = document.querySelector("#editDescription");

  // Set the input field with the channel name
  editChannelNameInput.value = channel.name;
  editChannelDescInput.value = channel.description;

  editChannelSaveChanges.addEventListener("click", () => {
    handleSaveChanges(channelId);
    // Close the unique modal after editing
    uniqueEditChannelModal.hide();
  });

  // Show the unique modal
  uniqueEditChannelModal.show();
}

function openLeaveChannelModal(channel, channelId) {
  // Create a unique modal element for this channel
  const uniqueLeaveChannelModal = new bootstrap.Modal(
    document.getElementById("leaveChannelModal")
  );

  const leaveChannelConfirm = document.querySelector("#leaveChannelConfirm");
  const leaveChannelName = document.getElementById("leaveChannelMessage");

  leaveChannelName.textContent = `Are you sure you want to leave the channel '${channel.name}'`;

  leaveChannelConfirm.addEventListener("click", () => {
    handleLeaveChannel(channelId);
    // Close the unique modal after editing
    uniqueLeaveChannelModal.hide();
  });

  // Show the unique modal
  uniqueLeaveChannelModal.show();
}

function openJoinChannelModal(channelId) {
  // Create a unique modal element for this channel
  const uniqueJoinChannelModal = new bootstrap.Modal(
    document.getElementById("joinChannelModal")
  );

  const joinChannelConfirm = document.querySelector("#joinChannelConfirm");

  joinChannelConfirm.addEventListener("click", () => {
    handleJoinChannel(channelId);
    // Close the unique modal after editing
    uniqueJoinChannelModal.hide();
  });

  // Show the unique modal
  uniqueJoinChannelModal.show();
}
///////////////////////////////////////////////////
