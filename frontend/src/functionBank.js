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
    populateChannelsList(joinedChannels, "joinedChannelContainer");
    populateChannelsList(publicChannels, "publicChannelContainer");
  } catch (error) {
    showErrorModal(error);
  }
};

// Event handler for when a channel is clicked
export function handleChannelClick(channelId) {
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
    await apiCall(`channel/${channelId}/join`, {}, "POST", true);

    handleChannelClick(channelId);
    handleChannelDisplay();
  } catch (error) {
    showErrorModal(error);
  }
}

async function handleSendMessage(channelId, message, textBox) {
  try {
    if (message.trim() === "") {
      throw Error("Message cannot be empty");
    }

    const body = {
      message: message,
    };

    await apiCall(`message/${channelId}`, body, "POST", true);

    textBox.value = "";

    populateChannelMessages(channelId);
    scrollToBottom();
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
    channelNameElement.textContent = channel.name;

    // Add a click event listener to each channel item
    channelItem.addEventListener("click", () => {
      handleChannelClick(channel.id);
    });

    channelList.appendChild(channelItem);
  });
}

function clearChannelMessages() {
  const container = document.getElementById("message-container-list");
  const loadingIndicator = document.getElementById("loading-indicator");

  // Remove all child elements (messages)
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  // Hide the loading indicator if it's visible
  loadingIndicator.style.display = "none";
}

// Function to populate a list of channels in a specified container
async function populateChannelMessages(channelId) {
  const channelItemTemplate = document
    .querySelector(".channel-message")
    .cloneNode(true);
  const container = document.getElementById("message-container-list");
  const loadingIndicator = document.getElementById("loading-indicator"); // Add this line
  let start = 0; // Initial message index
  let initLoad = false;

  // Remove the event listener for the old channel
  if (container.scrollHandler) {
    container.removeEventListener("scroll", container.scrollHandler);
  }
  async function handleScroll(event) {
    // When scroll reaches top
    if (container.scrollTop === 0 && initLoad === true) {
      try {
        // Show the loading indicator while fetching new messages
        loadingIndicator.style.display = "block"; // Show the loading element
        const url = `message/${channelId}?start=${start + 25}`;
        const response = await apiCallGet(url, true);
        const newMessages = response.messages;
        if (newMessages.length > 0) {
          // For Smooth Scrolling
          let newMessagesHeight = 0;
          for (const message of newMessages) {
            console.log(message.id);
            try {
              // Get Sender Data
              const userDetails = await apiCallGet(
                `user/${parseInt(message.sender)}`,
                true
              );
              const timeFormatted = formatTimeDifference(message.sentAt);
              // Clone the template and modify its content
              const messageItem = channelItemTemplate.cloneNode(true);
              messageItem.querySelector("#receipientName").textContent =
                userDetails.name;
              messageItem.querySelector("#timeSent").textContent =
                timeFormatted;
              messageItem.querySelector("#messageBody").textContent =
                message.message;
              messageItem.classList.remove("d-none");
              // Append the message to the container at the top
              container.insertBefore(messageItem, container.firstChild);
              // Calculate the height of the newly added message
              newMessagesHeight += messageItem.clientHeight;
            } catch (userError) {
              // Handle errors when fetching user details
              showErrorModal(userError);
            }
          }
          // Update the start index
          start += newMessages.length;
          // Smoothly scroll to the new position to maintain the user's position
          container.scrollTo({
            top: newMessagesHeight,
            behavior: "instant",
          });
        }
        // Hide the loading indicator after messages are loaded
        loadingIndicator.style.display = "none"; // Hide the loading element
      } catch (error) {
        // Handle any errors that occur during the API call
        showErrorModal(error);
      }
    }
  }
  container.scrollHandler = handleScroll;
  container.addEventListener("scroll", container.scrollHandler);

  await loadMessages(channelId, channelItemTemplate, container);
  initLoad = true;
}

// Function to load messages and append them to the container
async function loadMessages(channelId, template, container) {
  try {
    clearChannelMessages();
    const url = `message/${channelId}?start=0`;
    const response = await apiCallGet(url, true);
    const messages = response.messages.reverse();

    // Process and append messages to the container
    for (const message of messages) {
      console.log(message.id);
      try {
        // Get Sender Data
        const userDetails = await apiCallGet(
          `user/${parseInt(message.sender)}`,
          true
        );
        const timeFormatted = formatTimeDifference(message.sentAt);

        // Clone the template and modify its content
        const messageItem = template.cloneNode(true);
        messageItem.querySelector("#receipientName").textContent =
          userDetails.name;
        messageItem.querySelector("#timeSent").textContent = timeFormatted;
        messageItem.querySelector("#messageBody").textContent = message.message;

        messageItem.classList.remove("d-none");

        // Append the message to the container
        container.appendChild(messageItem);
      } catch (userError) {
        // Handle errors when fetching user details
        console.error("Error fetching user details:", userError);
      }
    }

    scrollToBottom();
  } catch (error) {
    // Handle any errors that occur during the API call
    showErrorModal(error);
  }
}

function scrollToBottom() {
  const container = document.getElementById("message-container-list");
  container.scrollTop = container.scrollHeight;
}

function formatTimeDifference(timestamp) {
  const now = new Date();
  const messageTime = new Date(timestamp);
  const timeDifference = now - messageTime;

  if (timeDifference < 60 * 1000) {
    return "just now";
  } else if (timeDifference < 60 * 60 * 1000) {
    const minutes = Math.floor(timeDifference / (60 * 1000));
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  } else if (timeDifference < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(timeDifference / (60 * 60 * 1000));
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  } else {
    const days = Math.floor(timeDifference / (24 * 60 * 60 * 1000));
    return `${days} day${days > 1 ? "s" : ""} ago`;
  }
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
  const messageSend = document.getElementById("messageTextSend");
  const messageSendInput = document.getElementById("messageTextInput");

  const channelButtonTemplate = document
    .querySelector(".channel-buttons")
    .cloneNode(true);

  channelButtonTemplate.classList.remove("d-none");

  // Access the buttons within the clone
  const editButton = channelButtonTemplate.querySelector("#editChannel");
  const leaveButton = channelButtonTemplate.querySelector("#leaveChannel");

  if (messageSend.handleSend) {
    console.log("removed");
    messageSend.removeEventListener("click", messageSend.handleSend);
  }

  if (messageSendInput.handleEnter) {
    messageSendInput.removeEventListener(
      "keydown",
      messageSendInput.handleEnter
    );
  }

  const handleSend = () => {
    handleSendMessage(channelId, messageSendInput.value, messageSendInput);
  };

  messageSend.handleSend = handleSend;

  messageSendInput.handleEnter = function (event) {
    if (event.key === "Enter") {
      // Prevent the default behavior of the enter key
      event.preventDefault();

      // Trigger the handleSend function here
      handleSend();
    }
  };

  editButton.addEventListener("click", () =>
    openEditChannelModal(channel, channelId)
  );

  leaveButton.addEventListener("click", () =>
    openLeaveChannelModal(channel, channelId)
  );

  messageSend.addEventListener("click", messageSend.handleSend);

  messageSendInput.addEventListener("keydown", messageSendInput.handleEnter);

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

    populateChannelMessages(channelId);
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

async function handleSaveChanges(channelId) {
  try {
    // Construct the request body with the updated channel data
    const body = {
      name: editChannelName.value, // Update with the new name
      description: editDescription.value, // Update with the new description
    };

    // Call the API to update the channel data
    await apiCall(`channel/${channelId}`, body, "PUT", true);

    handleChannelClick(channelId);
    handleChannelDisplay();
  } catch (error) {
    showErrorModal(error);
  }
}

export function openCreateChannelModal() {
  const newChannelModal = new bootstrap.Modal(
    document.getElementById("createChannelModal")
  );

  newChannelModal.show();
}

function openEditChannelModal(channel, channelId) {
  // Create a unique modal element for this channel
  const uniqueEditChannelModal = new bootstrap.Modal(
    document.getElementById("editChannelModal")
  );

  const editChannelSaveChanges = document.querySelector("#editChannelButton");
  const editChannelNameInput = document.querySelector("#editChannelName");
  const editChannelDescInput = document.querySelector("#editDescription");
  const cancelConfirm = document.querySelector(".cancel-edit");

  // Set the input fields with the channel's name and description
  editChannelNameInput.value = channel.name;
  editChannelDescInput.value = channel.description;

  function saveChangesAndClose() {
    handleSaveChanges(channelId);
    // Close the unique modal after editing
    uniqueEditChannelModal.hide();
    // Remove the event listener to avoid double-triggering
    editChannelSaveChanges.removeEventListener("click", saveChangesAndClose);
  }

  function confirmCancelSave() {
    uniqueEditChannelModal.hide();
    editChannelSaveChanges.removeEventListener("click", saveChangesAndClose);
  }

  // Listen for the "keydown" event on the document
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      confirmCancelSave();
    }
  });

  cancelConfirm.addEventListener("click", confirmCancelSave);

  editChannelSaveChanges.addEventListener("click", saveChangesAndClose);

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
  const cancelConfirm = document.querySelectorAll(".cancel-leave");

  leaveChannelName.textContent = `Are you sure you want to leave the channel '${channel.name}'`;

  function confirmAndLeave() {
    handleLeaveChannel(channelId);
    // Close the unique modal after
    uniqueLeaveChannelModal.hide();
    // Remove the event listener to avoid double-triggering
    leaveChannelConfirm.removeEventListener("click", confirmAndLeave);
  }

  function confirmNotLeave() {
    uniqueLeaveChannelModal.hide();
    leaveChannelConfirm.removeEventListener("click", confirmAndLeave);
  }

  cancelConfirm.forEach((button) => {
    button.addEventListener("click", confirmNotLeave);
  });

  // Listen for the "keydown" event on the document
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      confirmNotLeave();
    }
  });

  leaveChannelConfirm.addEventListener("click", confirmAndLeave);

  // Show the unique modal
  uniqueLeaveChannelModal.show();
}

function openJoinChannelModal(channelId) {
  // Create a unique modal element for this channel
  const uniqueJoinChannelModal = new bootstrap.Modal(
    document.getElementById("joinChannelModal")
  );

  const joinChannelConfirm = document.querySelector("#joinChannelConfirm");
  const cancelConfirm = document.querySelectorAll(".cancel-join");

  function confirmAndJoin() {
    handleJoinChannel(channelId);
    uniqueJoinChannelModal.hide();
    joinChannelConfirm.removeEventListener("click", confirmAndJoin);
  }

  function confirmNotJoin() {
    uniqueJoinChannelModal.hide();
    joinChannelConfirm.removeEventListener("click", confirmAndJoin);
  }

  cancelConfirm.forEach((button) => {
    button.addEventListener("click", confirmNotJoin);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      confirmNotJoin();
    }
  });

  joinChannelConfirm.addEventListener("click", confirmAndJoin);

  // Show the unique modal
  uniqueJoinChannelModal.show();
}

///////////////////////////////////////////////////
