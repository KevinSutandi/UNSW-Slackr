import {
  fileToDataUrl,
  apiCall,
  apiCallGet,
  apiCallDelete,
} from './helpers.js';

import { globalUserId, showAppropriatePage } from './main.js';

function showErrorModal(errorMessage) {
  const errorModal = document.getElementById('errorModal');
  const errorModalContent = document.getElementById('errorModalContent');
  errorModalContent.textContent = errorMessage;
  const bootstrapModal = new bootstrap.Modal(errorModal);

  // Close the modal after 5 seconds
  setTimeout(() => {
    bootstrapModal.hide();
  }, 5000);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      bootstrapModal.hide();
    }
  });

  bootstrapModal.show();
}

function findMessageDetails(channelId, messageIdToFind, start = 0) {
  const batchSize = 25; // Number of messages to fetch in each API request

  const url = `message/${channelId}?start=${start}`;

  // Make an API request to fetch a batch of messages
  return apiCallGet(url, true).then((response) => {
    const messages = response.messages;

    // Check if the desired message is in the current batch
    const foundMessage = messages.find(
      (message) => message.id === messageIdToFind
    );
    if (foundMessage) {
      return foundMessage; // Found the desired message
    }

    // If the desired message is not found and there are more messages, fetch the next batch
    if (messages.length === batchSize) {
      return findMessageDetails(channelId, messageIdToFind, start + batchSize);
    } else {
      throw new Error('Message not found'); // Desired message not found in the channel
    }
  });
}

function handlePinMessage(channelId, messageId) {
  findMessageDetails(channelId, messageId, 0).then((message) => {
    if (message.pinned) {
      apiCall(`message/unpin/${channelId}/${messageId}`, {}, 'POST', true)
        .then(() => {
          const pinnedContainer = document.getElementById(
            'pinned-message-container'
          );
          const messageDivToRemove = pinnedContainer.querySelector(
            `[data-message-id="${messageId}"]`
          );

          if (messageDivToRemove) {
            pinnedContainer.removeChild(messageDivToRemove);
          }

          if (
            pinnedContainer.querySelectorAll('.channel-message').length === 0
          ) {
            pinnedContainer.classList.add('d-none');
          }

          updatePinButtons(channelId, messageId);
        })
        .catch((error) => {
          showErrorModal(error);
        });
    } else {
      apiCall(`message/pin/${channelId}/${messageId}`, {}, 'POST', true).then(
        () => {
          displayPinnedMessages([message], channelId);
        }
      );
    }
  });
}

function createMessageElement(message, userDetails, channelId, template) {
  const messageId = message.id;
  const timeFormatted = formatTimeDifference(message.sentAt);
  const messageItem = template.cloneNode(true);
  const messageProfilePic = messageItem.querySelector('#messageProfilePic');
  const deleteMessageButton = messageItem.querySelector('#deleteMessageButton');
  const editMessageButton = messageItem.querySelector('#editButton');
  const pinMessageButton = messageItem.querySelector('#pinButton');
  const senderName = messageItem.querySelector('#receipientName');
  const messageBody = messageItem.querySelector('#messageBody');

  if (message.sender === parseInt(globalUserId)) {
    editMessageButton.classList.remove('d-none');
    deleteMessageButton.classList.remove('d-none');
    // Enable the button
    deleteMessageButton.addEventListener('click', function () {
      openDeleteMessageModal(channelId, messageId);
    });
    editMessageButton.addEventListener('click', function () {
      if (message.image) {
        // If the message is an image, open the editImageModal
        openEditImageModal(channelId, messageId);
      } else {
        openEditMessageModal(channelId, messageId);
      }
    });
  } else {
    // Disable the button
    editMessageButton.classList.add('d-none');
    deleteMessageButton.classList.add('d-none');
  }

  pinMessageButton.addEventListener('click', function () {
    handlePinMessage(channelId, messageId);
  });

  // for highlight pin
  const pinIconHollow = messageItem.querySelector('#hollowPin');
  const pinIconFill = messageItem.querySelector('#fillPin');
  if (message.pinned) {
    pinIconFill.classList.remove('d-none');
    pinIconHollow.classList.add('d-none');
  } else {
    pinIconFill.classList.add('d-none');
    pinIconHollow.classList.remove('d-none');
  }

  messageItem.dataset.messageId = messageId; // Add a data attribute
  messageItem.querySelector('#receipientName').textContent = userDetails.name;
  messageItem.querySelector('#timeSent').textContent = `${timeFormatted} ${
    message.edited ? `(edited ${formatTimeDifference(message.editedAt)})` : ''
  }`;

  // Check if the message contains an image
  if (message.image) {
    messageBody.textContent = '';
    const imageElement = document.createElement('img');
    imageElement.src = message.image;
    imageElement.alt = 'Image';
    imageElement.classList.add("max-width-400")
    messageBody.appendChild(imageElement);
  } else {
    messageBody.textContent = message.message;
  }

  // Check if userDetails.image is null or undefined
  if (userDetails.image !== null) {
    messageProfilePic.src = userDetails.image;
  } else {
    // userDetails.image is null, so set the default image
    messageProfilePic.src = 'default.jpg';
  }

  senderName.addEventListener('click', function () {
    openUserProfileModal(userDetails);
  });

  // // Add click event listeners to each reaction button
  const reactionButtons = messageItem.querySelectorAll('.reaction-badge');

  reactionButtons.forEach((button) => {
    button.addEventListener('click', () => {
      // Send the reaction to the server or handle it as needed
      handleReaction(button.id, channelId, messageId);
    });
  });

  displayReaction(channelId, messageId, null);

  messageItem.classList.remove('d-none');
  return messageItem;
}

function findPinnedMessages(channelId) {
  const batchSize = 25; // Number of messages to fetch in each API request
  let start = 0; // Initial message index
  const pinnedMessages = []; // Array to store pinned messages

  function fetchMessages(start) {
    const url = `message/${channelId}?start=${start}`;

    // Make an API request to fetch a batch of messages
    return apiCallGet(url, true).then((response) => {
      const messages = response.messages;

      // Filter and collect pinned messages from the current batch
      const batchPinnedMessages = messages.filter((message) => message.pinned);

      // Append batchPinnedMessages to pinnedMessages array
      pinnedMessages.push(...batchPinnedMessages);

      // If there are more messages, fetch the next batch
      if (messages.length === batchSize) {
        return fetchMessages(start + batchSize);
      }
    });
  }

  // Start fetching messages
  return fetchMessages(start).then(() => {
    // pinnedMessages now contains all pinned messages
    console.log(pinnedMessages);
    if (pinnedMessages.length > 0) {
      displayPinnedMessages(pinnedMessages, channelId);
    }
  });
}

function displayPinnedMessages(pinnedMessages, channelId) {
  const pinnedContainer = document.getElementById('pinned-message-container');
  console.log(pinnedContainer);
  const channelItemTemplate = document
    .querySelector('.channel-message')
    .cloneNode(true);
  // Render pinned messages
  pinnedMessages.forEach((message) => {
    apiCallGet(`user/${parseInt(message.sender)}`, true)
      .then((userDetails) => {
        const messageItem = createMessageElement(
          message,
          userDetails,
          channelId,
          channelItemTemplate
        );
        pinnedContainer.appendChild(messageItem);
        updatePinButtons(channelId, message.id);
      })
      .catch((error) => {
        showErrorModal(error);
      });
  });
  pinnedContainer.classList.remove('d-none');
}

function updatePinButtons(channelId, messageId) {
  const messageElements = document.querySelectorAll(
    `[data-message-id="${messageId}"]`
  );
  findMessageDetails(channelId, messageId, 0).then((message) => {
    messageElements.forEach((messageItem) => {
      const pinIconHollow = messageItem.querySelector('#hollowPin');
      const pinIconFill = messageItem.querySelector('#fillPin');
      if (message.pinned) {
        console.log('PINNED');
        console.log(pinIconHollow);
        pinIconFill.classList.remove('d-none');
        pinIconHollow.classList.add('d-none');
      } else {
        pinIconFill.classList.add('d-none');
        pinIconHollow.classList.remove('d-none');
      }
    });
  });
}

function clearPinnedMessages() {
  const pinnedContainer = document.getElementById('pinned-message-container');

  const channelItemDivs = pinnedContainer.querySelectorAll('.channel-message');

  // Loop through and remove each channel item div
  channelItemDivs.forEach((div) => {
    console.log(div);
    pinnedContainer.removeChild(div);
  });

  pinnedContainer.classList.add('d-none');
}

// Event handler for user login
export const handleLogin = () => {
  const emailInput = document.getElementById('emailInput');
  const passwordInput = document.getElementById('passwordInput');

  if (!emailInput.value || !passwordInput.value) {
    showErrorModal('Please enter your email and password');
    return;
  }

  const body = { email: emailInput.value, password: passwordInput.value };

  apiCall('auth/login', body, 'POST', false)
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
  const emailRegisterInput = document.getElementById('emailRegisterInput');
  const nameRegisterInput = document.getElementById('nameRegisterInput');
  const passwordRegisterInput = document.getElementById(
    'passwordRegisterInput'
  );
  const confirmPasswordInput = document.getElementById(
    'confirmPasswordRegisterInput'
  );

  if (
    !emailRegisterInput.value ||
    !nameRegisterInput.value ||
    !passwordRegisterInput.value
  ) {
    showErrorModal('Please enter your email, name, and password');
    return;
  }

  const body = {
    email: emailRegisterInput.value,
    password: passwordRegisterInput.value,
    name: nameRegisterInput.value,
  };

  if (passwordRegisterInput !== confirmPasswordInput) {
    showErrorModal('Password does not match');
    return;
  } else {
    apiCall('auth/register', body, 'POST', false)
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
  apiCall('auth/logout', {}, 'POST', true)
    .then(() => {
      setTokens(undefined, undefined);
      showAppropriatePage();
    })
    .catch((error) => {
      showErrorModal(error);
    });
};

export const handleChannelDisplay = () => {
  getUserChannels()
    .then((userChannels) => {
      // Separate joined and public channels
      const joinedChannels = userChannels.filter((channel) =>
        channel.members.includes(parseInt(globalUserId))
      );
      const publicChannels = userChannels.filter(
        (channel) =>
          !channel.members.includes(parseInt(globalUserId)) && !channel.private
      );

      // Clear the container elements
      clearChannelContainer('joinedChannelContainer');
      clearChannelContainer('publicChannelContainer');

      // Populate the channel lists
      populateChannelsList(joinedChannels, 'joinedChannelContainer');
      populateChannelsList(publicChannels, 'publicChannelContainer');

      apiCallGet(`user/${globalUserId}`, true).then((response) => {
        const userName = response.name;
        const userPic = response.image;
        const dropdownName = document.getElementById('userNameDropdown');
        const dropdownProfilePic = document.getElementById(
          'profilePictureDropdown'
        );
        const showProfile = document.getElementById('showProfile');

        showProfile.addEventListener('click', function () {
          changeChannelViewProfile();
        });

        dropdownName.textContent = userName;
        if (userPic !== null) {
          dropdownProfilePic.src = userPic;
        } else {
          // userDetails.image is null, so set the default image
          dropdownProfilePic.src = 'default.jpg';
        }
      });
    })
    .catch((error) => {
      showErrorModal(error);
    });
};

// Event handler for when a channel is clicked
export function handleChannelClick(channelId) {
  apiCallGet(`channel/${channelId}`, true)
    .then((response) => {
      const channelList = document.querySelectorAll('.channel-item');

      // Remove the "active" class from all channels
      channelList.forEach((channel) => {
        channel.classList.remove('active');
      });

      for (const channel of channelList) {
        const id = parseInt(channel.id);

        if (id === channelId) {
          channel.classList.add('active');
        }
      }
      changeChannelViewPage(response, channelId);
    })
    .catch((error) => {
      const notMember = 'Authorised user is not a member of this channel';
      if (error === notMember) {
        openJoinChannelModal(channelId);
      } else {
        showErrorModal(error);
      }
    });
}

function deleteMessagesLocal(messageId) {
  const messageElements = document.querySelectorAll(
    `[data-message-id="${messageId}"]`
  );

  if (messageElements.length > 0) {
    // Check if any elements with the provided data-message-id exist
    messageElements.forEach((messageElement) => {
      messageElement.remove(); // Remove each matching element from the DOM
    });
  } else {
    console.log('Messages not found:', messageId);
  }
}

function handleDeleteMessage(channelId, messageId) {
  apiCallDelete(`message/${channelId}/${messageId}`, true)
    .then((response) => {
      deleteMessagesLocal(messageId);
    })
    .catch((error) => {
      showErrorModal(error);
    });
}

// Event handler for creating a new channel
export const handleCreateChannel = () => {
  const channelNameInput = document.getElementById('channelNameInput').value;
  const descriptionInput = document.getElementById('descriptionInput').value;
  const isPrivate = document.getElementById('setPrivateChannel').checked;

  const body = {
    name: channelNameInput,
    private: isPrivate,
    description: descriptionInput,
  };

  apiCall('channel', body, 'POST', true)
    .then(() => {
      handleChannelDisplay();
    })
    .catch((error) => {
      showErrorModal(error);
    });
};

function handleLeaveChannel(channelId) {
  return apiCall(`channel/${channelId}/leave`, {}, 'POST', true)
    .then((response) => {
      changeChannelViewWelcome();
      handleChannelDisplay();
    })
    .catch((error) => {
      showErrorModal(error);
    });
}

function handleJoinChannel(channelId) {
  return apiCall(`channel/${channelId}/join`, {}, 'POST', true)
    .then((response) => {
      handleChannelClick(channelId);
      handleChannelDisplay();
    })
    .catch((error) => {
      showErrorModal(error);
    });
}

// Handle Send Message (NOT PHOTOS)
function handleSendMessage(channelId, message, textBox) {
  if (message.trim() === '') {
    return Promise.reject('Message cannot be empty');
  }

  const body = {
    message: message,
  };

  return apiCall(`message/${channelId}`, body, 'POST', true)
    .then(() => {
      textBox.value = '';
      return populateChannelMessages(channelId);
    })
    .then(() => {
      scrollToBottom();
    })
    .catch((error) => {
      showErrorModal(error);
    });
}

function handleSendImage(channelId, image) {
  fileToDataUrl(image).then((imageId) => {
    const body = {
      image: imageId,
    };
    return apiCall(`message/${channelId}`, body, 'POST', true)
      .then(() => {
        return populateChannelMessages(channelId);
      })
      .then(() => {
        scrollToBottom();
      })
      .catch((error) => {
        showErrorModal(error);
      });
  });
}

function handleEditMessage(channelId, messageId) {
  const messages = document.querySelectorAll(
    `[data-message-id="${messageId}"]`
  );

  messages.forEach((message) => {
    const timeSent = message.querySelector('#timeSent');
    const messageBody = message.querySelector('#messageBody');
    const messageContent = messageBody.textContent;
    const editMessageForm = document.querySelector('#newMessageEdit').value;

    if (messageContent === editMessageForm) {
      showErrorModal('New Message cannot be the same as the previous message');
      return;
    }

    if (editMessageForm.trim() === '') {
      showErrorModal('New Message cannot be blank');
      return;
    }

    const body = {
      message: editMessageForm,
    };

    apiCall(`message/${channelId}/${messageId}`, body, 'PUT', true)
      .then((response) => {
        const editedTimestamp = new Date();
        const timeFormatted = formatTimeDifference(editedTimestamp);

        // Extract the previous edited timestamp if it exists
        const previousEdited = timeSent.textContent.match(/\(edited [^\)]+\)/g);

        // Update the message content
        messageBody.textContent = editMessageForm;

        // Create the edited time display
        const editedText = `(edited ${timeFormatted})`;

        // Update the time sent with the edited timestamp
        if (previousEdited) {
          // Remove the previous edited timestamp
          timeSent.textContent = timeSent.textContent.replace(
            previousEdited[0],
            editedText
          );
        } else {
          // Append the edited timestamp
          timeSent.textContent = `${timeSent.textContent} ${editedText}`;
        }
      })
      .catch((error) => {
        showErrorModal(error);
      });
  });
}

function clearReactions(channelId, messageId) {
  // Find the message item using data-message-id
  const messageItemList = document.querySelectorAll(
    `[data-message-id="${messageId}"]`
  );
  messageItemList.forEach((messageItem) => {
    const reactionButtons = messageItem.querySelectorAll('.reaction-badge');
    reactionButtons.forEach((button) => {
      button.classList.remove('btn-primary');
      button.classList.add('btn-secondary');
      const badgeCount = button.querySelector('.badge-count');
      badgeCount.textContent = '0'; // Clear the badge count
    });
  });
}

function displayReaction(channelId, messageId, reactionType) {
  findMessageDetails(channelId, messageId, 0)
    .then((message) => {
      // Call clearReactions to clear all reactions and reset button appearance
      clearReactions(channelId, messageId);

      // Find the message item using data-message-id
      const messageItemList = document.querySelectorAll(
        `[data-message-id="${messageId}"]`
      );
      messageItemList.forEach((messageItem) => {
        if (messageItem) {
          const reactionButtons =
            messageItem.querySelectorAll('.reaction-badge');
          reactionButtons.forEach((button) => {
            const buttonReactionType = button.id;
            const badgeCount = button.querySelector('.badge-count');
            let currentCount = 0;

            for (const reactCheck of message.reacts) {
              if (reactCheck.react === buttonReactionType) {
                currentCount++;
              }
            }

            badgeCount.textContent = currentCount;

            // Check if the current user has reacted with the same type
            const hasReacted = message.reacts.some(
              (reactCheck) =>
                reactCheck.user === parseInt(globalUserId) &&
                reactCheck.react === buttonReactionType
            );

            // Update the button's appearance if the user has reacted
            if (hasReacted) {
              button.classList.add('btn-primary');
              button.classList.remove('btn-secondary');
              badgeCount.classList.remove('text-bg-secondary');
              badgeCount.classList.add('text-bg-primary');
            } else {
              button.classList.remove('btn-primary');
              button.classList.add('btn-secondary');
              badgeCount.classList.add('text-bg-secondary');
              badgeCount.classList.remove('text-bg-primary');
            }
          });
        }
      });
    })
    .catch((error) => {
      console.error('Error:', error);
    });
}

function handleReaction(reactionType, channelId, messageId) {
  const body = {
    react: reactionType,
  };

  let hasReacted = false;

  findMessageDetails(channelId, messageId, 0).then((message) => {
    for (const reactCheck of message.reacts) {
      if (
        reactCheck.user === parseInt(globalUserId) &&
        reactCheck.react === reactionType
      ) {
        hasReacted = true;
      }
    }

    if (hasReacted) {
      return apiCall(
        `message/unreact/${channelId}/${messageId}`,
        body,
        'POST',
        true
      )
        .then(() => {
          return displayReaction(channelId, messageId, reactionType);
        })
        .catch((error) => {
          showErrorModal(error);
        });
    } else {
      return apiCall(
        `message/react/${channelId}/${messageId}`,
        body,
        'POST',
        true
      )
        .then(() => {
          return displayReaction(channelId, messageId, reactionType);
        })
        .catch((error) => {
          showErrorModal(error);
        });
    }
  });
}

function handleInviteUser(channelId, userId) {
  const body = {
    userId: parseInt(userId),
  };
  apiCall(`channel/${channelId}/invite`, body, 'POST', true).catch((error) => {
    showErrorModal(error);
  });
}

///////////////////////////////////////////////////
/**
 * Helper Functions
 */

// Helper function to clear login page
export function clearLoginForm() {
  const emailInput = document.getElementById('emailInput');
  const passwordInput = document.getElementById('passwordInput');

  emailInput.value = '';
  passwordInput.value = '';
}

export function clearRegisterForm() {
  const emailRegisterInput = document.getElementById('emailRegisterInput');
  const nameRegisterInput = document.getElementById('nameRegisterInput');
  const passwordRegisterInput = document.getElementById(
    'passwordRegisterInput'
  );
  const confirmPasswordInput = document.getElementById(
    'confirmPasswordRegisterInput'
  );

  emailRegisterInput.value = '';
  nameRegisterInput.value = '';
  passwordRegisterInput.value = '';
  confirmPasswordInput.value = '';
}
// Helper function to fetch user's channels
function getUserChannels() {
  return apiCallGet('channel', true).then((response) => {
    return response.channels.map((channel) => ({
      ...channel,
      isMember: channel.members.includes(parseInt(globalUserId)),
    }));
  });
}

// Function to clear all channel items from a container
function clearChannelContainer(containerId) {
  const container = document.getElementById(containerId);
  const channelItems = container.getElementsByClassName('channel-item');

  while (channelItems.length > 0) {
    container.removeChild(channelItems[0]);
  }

  const channelItemsPrivate = container.getElementsByClassName(
    'channel-item-private'
  );

  while (channelItemsPrivate.length > 0) {
    container.removeChild(channelItemsPrivate[0]);
  }
}

// Function to populate a list of channels in a specified container
function populateChannelsList(channels, targetElement) {
  const channelList = document.getElementById(targetElement);
  const channelItemTemplate = document
    .querySelector('.channel-item')
    .cloneNode(true);
  const channelItemPrivateTemplate = document
    .querySelector('.channel-item-private')
    .cloneNode(true);

  channels.forEach((channel) => {
    const channelItem = channel.private
      ? channelItemPrivateTemplate.cloneNode(true)
      : channelItemTemplate.cloneNode(true);

    channelItem.classList.remove('d-none');
    const channelNameElement = channelItem.querySelector('#channelName');
    channelNameElement.textContent = channel.name;
    channelItem.id = channel.id;

    // Add a click event listener to each channel item
    channelItem.addEventListener('click', () => {
      handleChannelClick(channel.id);
    });

    channelList.appendChild(channelItem);
  });
}

function clearChannelMessages() {
  const container = document.getElementById('message-container-list');
  const loadingIndicator = document.getElementById('loading-indicator');

  // Remove all child elements (messages)
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  // Hide the loading indicator if it's visible
  loadingIndicator.style.display = 'none';
}

function populateChannelMessages(channelId) {
  const channelItemTemplate = document
    .querySelector('.channel-message')
    .cloneNode(true);
  const container = document.getElementById('message-container-list');
  const loadingIndicator = document.getElementById('loading-indicator');
  let start = 0; // Initial message index
  let initLoad = false;

  return new Promise((resolve, reject) => {
    // Remove the event listener for the old channel
    if (container.scrollHandler) {
      container.removeEventListener('scroll', container.scrollHandler);
    }

    function handleScroll(event) {
      // When scroll reaches the top
      if (container.scrollTop === 0 && initLoad === true) {
        // Show the loading indicator while fetching new messages
        loadingIndicator.style.display = 'block';

        const url = `message/${channelId}?start=${start + 25}`;
        apiCallGet(url, true)
          .then((response) => {
            const newMessages = response.messages;
            if (newMessages.length > 0) {
              // For Smooth Scrolling
              let newMessagesHeight = 0;

              const fetchUserDetailsPromises = newMessages.map((message) =>
                apiCallGet(`user/${parseInt(message.sender)}`, true)
              );

              Promise.all(fetchUserDetailsPromises)
                .then((userDetailsResponses) => {
                  newMessages.forEach((message, index) => {
                    const userDetails = userDetailsResponses[index];
                    const messageItem = createMessageElement(
                      message,
                      userDetails,
                      channelId,
                      channelItemTemplate
                    );
                    container.insertBefore(messageItem, container.firstChild);
                    newMessagesHeight += messageItem.clientHeight;
                  });
                  // Update the start index
                  start += newMessages.length;
                  container.scrollTo({
                    top: newMessagesHeight,
                    behavior: 'instant',
                  });

                  // Hide the loading indicator after messages are loaded
                  loadingIndicator.style.display = 'none';
                  resolve();
                })
                .catch((userError) => {
                  showErrorModal(userError);
                  reject(userError);
                });
            } else {
              loadingIndicator.style.display = 'none';
            }
          })
          .catch((error) => {
            showErrorModal(error);
            reject(error);
          });
      }
    }
    container.scrollHandler = handleScroll;
    container.addEventListener('scroll', container.scrollHandler);

    loadMessages(channelId, channelItemTemplate, container)
      .then(() => {
        initLoad = true;
      })
      .catch((error) => {
        showErrorModal(error);
        reject(error);
      });
  });
}

// Function to load messages and append them to the container
function loadMessages(channelId, template, container) {
  return new Promise((resolve, reject) => {
    clearChannelMessages();
    const url = `message/${channelId}?start=0`;

    apiCallGet(url, true)
      .then((response) => {
        const messages = response.messages.reverse();
        const fetchUserDetailsPromises = [];

        for (const message of messages) {
          const userDetailsPromise = apiCallGet(
            `user/${parseInt(message.sender)}`,
            true
          );
          fetchUserDetailsPromises.push(userDetailsPromise);
        }

        Promise.all(fetchUserDetailsPromises)
          .then((userDetailsResponses) => {
            for (let i = 0; i < messages.length; i++) {
              const userDetails = userDetailsResponses[i];
              const messageItem = createMessageElement(
                messages[i],
                userDetails,
                channelId,
                template
              );
              container.append(messageItem);
            }

            scrollToBottom();
            resolve();
          })
          .catch((userError) => {
            showErrorModal(userError);
            reject(userError);
          });
      })
      .catch((error) => {
        showErrorModal(error);
        reject(error);
      });
  });
}

function scrollToBottom() {
  const container = document.getElementById('message-container-list');
  container.scrollTop = container.scrollHeight;
}

function formatTimeDifference(timestamp) {
  const now = new Date();
  const messageTime = new Date(timestamp);
  const timeDifference = now - messageTime;

  if (timeDifference < 60 * 1000) {
    return 'just now';
  } else if (timeDifference < 60 * 60 * 1000) {
    const minutes = Math.floor(timeDifference / (60 * 1000));
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (timeDifference < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(timeDifference / (60 * 60 * 1000));
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(timeDifference / (24 * 60 * 60 * 1000));
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
}

export function changeChannelViewWelcome() {
  const channelInfoPage = document.getElementById('channelInfoPage');
  const welcomeScreen = document.getElementById('welcome-screen');
  const profileScreen = document.getElementById('profileScreen');

  const channelList = document.querySelectorAll('.channel-item');

  // Remove the "active" class from all channels
  channelList.forEach((channel) => {
    channel.classList.remove('active');
  });

  // Show the welcome screen
  welcomeScreen.classList.remove('d-none');

  // Hide the channel info page
  channelInfoPage.classList.add('d-none');

  profileScreen.classList.add('d-none');
}

export function changeChannelViewProfile() {
  const channelInfoPage = document.getElementById('channelInfoPage');
  const welcomeScreen = document.getElementById('welcome-screen');
  const profileScreen = document.getElementById('profileScreen');

  const channelList = document.querySelectorAll('.channel-item');

  // Remove the "active" class from all channels
  channelList.forEach((channel) => {
    channel.classList.remove('active');
  });

  // Show the welcome screen
  welcomeScreen.classList.add('d-none');

  // Hide the channel info page
  channelInfoPage.classList.add('d-none');

  // Show the profile page
  profileScreen.classList.remove('d-none');

  //////////////////////////////
  const emailProfile = document.getElementById('emailProfile');
  const nameProfile = document.getElementById('nameProfile');
  const passwordProfile = document.getElementById('passwordProfile');
  const bioProfile = document.getElementById('bioProfile');
  const profilePic = document.querySelector('#profilePicturePage');
  const imageUpload = document.getElementById('imageUploader');
  const editProfileButton = document.getElementById('editProfileButton');
  const whileEditButtons = document.getElementById('whileEditButtons');
  const cancelEditButton = document.getElementById('cancelEditProfile');
  const saveEditButton = document.getElementById('saveEditProfile');
  const passwordToggle = document.getElementById('passwordToggle');

  const dropdownProfilePic = document.getElementById('profilePictureDropdown');

  apiCallGet(`user/${globalUserId}`, true).then((user) => {
    if (user.image !== null) {
      profilePic.src = user.image;
      dropdownProfilePic.src = user.image;
    } else {
      profilePic.src = 'default.jpg';
      dropdownProfilePic.src = 'default.jpg';
    }
    emailProfile.value = user.email;
    nameProfile.value = user.name;
    bioProfile.value = user.bio;
  });

  passwordToggle.addEventListener('click', () => {
    if (passwordProfile.type === 'password') {
      passwordProfile.type = 'text';
    } else {
      passwordProfile.type = 'password';
    }
  });

  editProfileButton.addEventListener('click', function () {
    // Toggle the contenteditable attribute
    emailProfile.disabled = false;
    nameProfile.disabled = false;
    passwordProfile.disabled = false;
    bioProfile.disabled = false;
    imageUpload.disabled = false;
    passwordToggle.disabled = false;
    editProfileButton.classList.add('d-none');
    whileEditButtons.classList.remove('d-none');
  });

  cancelEditButton.addEventListener('click', function () {
    // Toggle the contenteditable attribute
    emailProfile.disabled = true;
    nameProfile.disabled = true;
    passwordProfile.disabled = true;
    bioProfile.disabled = true;
    imageUpload.disabled = true;
    passwordToggle.disabled = true;
    passwordProfile.type = 'password';
    editProfileButton.classList.remove('d-none');
    whileEditButtons.classList.add('d-none');
  });

  const save = function saveChanges() {
    // Toggle the contenteditable attribute
    emailProfile.disabled = true;
    nameProfile.disabled = true;
    passwordProfile.disabled = true;
    bioProfile.disabled = true;
    imageUpload.disabled = true;
    passwordToggle.disabled = true;
    editProfileButton.classList.remove('d-none');
    whileEditButtons.classList.add('d-none');
    updateProfile();
    saveEditButton.removeEventListener('click', save);
  };
  saveEditButton.addEventListener('click', save);
}

function updateProfile() {
  apiCallGet(`user/${globalUserId}`, true)
    .then((user) => {
      const email = document.getElementById('emailProfile').value;
      const name = document.getElementById('nameProfile').value;
      const password = document.getElementById('passwordProfile').value;
      const bio = document.getElementById('bioProfile').value;
      const image = document.querySelector('input[type="file"]').files[0];

      const body = {
        name: name,
        bio: bio,
      };

      if (password !== '') {
        body.password = password;
      }

      if (user.email !== email) {
        body.email = email;
      }

      if (image === undefined) {
        apiCall(`user`, body, 'PUT', true)
          .then(() => {
            changeChannelViewProfile();
          })
          .catch((error) => {
            console.error(error);
          });
      } else {
        fileToDataUrl(image).then((response) => {
          body.image = response;
          apiCall(`user`, body, 'PUT', true)
            .then(() => {
              changeChannelViewProfile();
            })
            .catch((error) => {
              console.error(error);
            });
        });
      }
    })
    .catch((error) => {
      console.error(error);
    });
}

export function changeChannelViewPage(channel, channelId) {
  return new Promise((resolve, reject) => {
    const channelInfoPage = document.getElementById('channelInfoPage');
    const welcomeScreen = document.getElementById('welcome-screen');
    const profileScreen = document.getElementById('profileScreen');
    const channelName = document.getElementById('channelViewName');
    const channelDescription = document.getElementById(
      'channelViewDescription'
    );
    const channelCreationDetails = document.getElementById('channelCreator');
    const privateIcon = document.getElementById('privateIcon');
    const publicIcon = document.getElementById('publicIcon');
    const imageUpload = document.getElementById('uploadAttachment')
    const messageSend = document.getElementById('messageTextSend');
    const messageSendInput = document.getElementById('messageTextInput');
    const channelButtonTemplate = document
      .querySelector('.channel-buttons')
      .cloneNode(true);

    channelButtonTemplate.classList.remove('d-none');

    // Access the buttons within the clone
    const editButton = channelButtonTemplate.querySelector('#editChannel');
    const leaveButton = channelButtonTemplate.querySelector('#leaveChannel');
    const inviteButton = channelButtonTemplate.querySelector('#inviteUsers');

    if (messageSend.handleSend) {
      messageSend.removeEventListener('click', messageSend.handleSend);
    }

    if (messageSendInput.handleEnter) {
      messageSendInput.removeEventListener(
        'keydown',
        messageSendInput.handleEnter
      );
    }

    const handleSend = () => {
      handleSendMessage(channelId, messageSendInput.value, messageSendInput);
    };

    messageSend.handleSend = handleSend;

    messageSendInput.handleEnter = function (event) {
      if (event.key === 'Enter') {
        // Prevent the default behavior of the enter key
        event.preventDefault();

        // Trigger the handleSend function here
        handleSend();
      }
    };

    editButton.addEventListener('click', () => {
      openEditChannelModal(channel, channelId);
    });

    leaveButton.addEventListener('click', () => {
      openLeaveChannelModal(channel, channelId);
    });

    inviteButton.addEventListener('click', () => {
      openInviteUsersModal(channelId);
    });

    imageUpload.addEventListener('click', () => {
      openUploadImageModal(channelId);
    })

    messageSend.addEventListener('click', messageSend.handleSend);

    messageSendInput.addEventListener('keydown', messageSendInput.handleEnter);

    welcomeScreen.classList.add('d-none');
    profileScreen.classList.add('d-none');
    channelInfoPage.classList.remove('d-none');

    const formattedDate = new Date(channel.createdAt).toLocaleDateString(
      'en-US',
      {
        year: 'numeric',
        month: 'long',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }
    );

    const container = document.querySelector('.channel-buttons-container');

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(channelButtonTemplate);

    apiCallGet(`user/${parseInt(channel.creator)}`, true)
      .then((userDetails) => {
        channelName.textContent = channel.name;
        channelDescription.textContent = channel.description;
        channelCreationDetails.textContent = `Channel created by: ${userDetails.name} | ${formattedDate}`;

        privateIcon.style.display = channel.private ? 'inline-block' : 'none';
        publicIcon.style.display = channel.private ? 'none' : 'inline-block';
        clearPinnedMessages();
        findPinnedMessages(channelId);
        populateChannelMessages(channelId)
          .then(() => resolve())
          .catch((reject) => {
            showErrorModal(reject);
          });
      })
      .catch((reject) => {
        showErrorModal(reject);
      });
  });
}

export function setTokens(token, userId) {
  localStorage.setItem('token', token);
  localStorage.setItem('userId', userId);
  token;
}

export function showPage(pageId) {
  const loginPage = document.getElementById('login-page');
  const registerPage = document.getElementById('register-page');
  const mainPage = document.getElementById('main-page');
  const pages = [loginPage, registerPage, mainPage];

  pages.forEach((page) => {
    if (page.id === pageId) {
      page.classList.remove('d-none');
    } else {
      page.classList.add('d-none');
    }
  });
}

export function handleSaveChanges(channelId) {
  return new Promise((resolve, reject) => {
    // Construct the request body with the updated channel data
    const body = {
      name: editChannelName.value,
      description: editDescription.value,
    };

    // Call the API to update the channel data
    apiCall(`channel/${channelId}`, body, 'PUT', true)
      .then(() => {
        handleChannelClick(channelId);
      })
      .catch((reject) => {
        showErrorModal(reject + 'hellooo');
      });
  });
}

export function openCreateChannelModal() {
  const newChannelModal = new bootstrap.Modal(
    document.getElementById('createChannelModal')
  );

  newChannelModal.show();
}

function openEditChannelModal(channel, channelId) {
  // Create a unique modal element for this channel
  const uniqueEditChannelModal = new bootstrap.Modal(
    document.getElementById('editChannelModal')
  );

  const editChannelSaveChanges = document.querySelector('#editChannelButton');
  const editChannelNameInput = document.querySelector('#editChannelName');
  const editChannelDescInput = document.querySelector('#editDescription');
  const cancelConfirm = document.querySelector('.cancel-edit');

  // Set the input fields with the channel's name and description
  editChannelNameInput.value = channel.name;
  editChannelDescInput.value = channel.description;

  function saveChangesAndClose() {
    handleSaveChanges(channelId);
    // Close the unique modal after editing
    uniqueEditChannelModal.hide();
    // Remove the event listener to avoid double-triggering
    editChannelSaveChanges.removeEventListener('click', saveChangesAndClose);
  }

  function confirmCancelSave() {
    uniqueEditChannelModal.hide();
    editChannelSaveChanges.removeEventListener('click', saveChangesAndClose);
  }

  // Listen for the "keydown" event on the document
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      confirmCancelSave();
    }
  });

  cancelConfirm.addEventListener('click', confirmCancelSave);

  editChannelSaveChanges.addEventListener('click', saveChangesAndClose);

  // Show the unique modal
  uniqueEditChannelModal.show();
}

function openLeaveChannelModal(channel, channelId) {
  // Create a unique modal element for this channel
  const uniqueLeaveChannelModal = new bootstrap.Modal(
    document.getElementById('leaveChannelModal')
  );

  const leaveChannelConfirm = document.querySelector('#leaveChannelConfirm');
  const leaveChannelName = document.getElementById('leaveChannelMessage');
  const cancelConfirm = document.querySelectorAll('.cancel-leave');

  leaveChannelName.textContent = `Are you sure you want to leave the channel '${channel.name}'`;

  function confirmAndLeave() {
    handleLeaveChannel(channelId);
    // Close the unique modal after
    uniqueLeaveChannelModal.hide();
    // Remove the event listener to avoid double-triggering
    leaveChannelConfirm.removeEventListener('click', confirmAndLeave);
  }

  function confirmNotLeave() {
    uniqueLeaveChannelModal.hide();
    leaveChannelConfirm.removeEventListener('click', confirmAndLeave);
  }

  cancelConfirm.forEach((button) => {
    button.addEventListener('click', confirmNotLeave);
  });

  // Listen for the "keydown" event on the document
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      confirmNotLeave();
    }
  });

  leaveChannelConfirm.addEventListener('click', confirmAndLeave);

  // Show the unique modal
  uniqueLeaveChannelModal.show();
}

function openJoinChannelModal(channelId) {
  // Create a unique modal element for this channel
  const uniqueJoinChannelModal = new bootstrap.Modal(
    document.getElementById('joinChannelModal')
  );

  const joinChannelConfirm = document.querySelector('#joinChannelConfirm');
  const cancelConfirm = document.querySelectorAll('.cancel-join');

  function confirmAndJoin() {
    handleJoinChannel(channelId);
    uniqueJoinChannelModal.hide();
    joinChannelConfirm.removeEventListener('click', confirmAndJoin);
  }

  function confirmNotJoin() {
    uniqueJoinChannelModal.hide();
    joinChannelConfirm.removeEventListener('click', confirmAndJoin);
  }

  cancelConfirm.forEach((button) => {
    button.addEventListener('click', confirmNotJoin);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      confirmNotJoin();
    }
  });

  joinChannelConfirm.addEventListener('click', confirmAndJoin);

  // Show the unique modal
  uniqueJoinChannelModal.show();
}

function openDeleteMessageModal(channelId, messageId) {
  // Create a unique modal element for this channel
  const uniqueDeleteMessageModal = new bootstrap.Modal(
    document.getElementById('deleteMessageModal')
  );

  const deleteMessageConfirm = document.querySelector('#deleteMessageConfirm');
  const cancelConfirm = document.querySelectorAll('.cancel-delete-message');

  function confirmAndDeleteMessage() {
    handleDeleteMessage(channelId, messageId);
    uniqueDeleteMessageModal.hide();
    deleteMessageConfirm.removeEventListener('click', confirmAndDeleteMessage);
  }

  function confirmNotDeleteMessage() {
    uniqueDeleteMessageModal.hide();
    deleteMessageConfirm.removeEventListener('click', confirmAndDeleteMessage);
  }

  cancelConfirm.forEach((button) => {
    button.addEventListener('click', confirmNotDeleteMessage);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      confirmNotDeleteMessage();
    }
  });

  deleteMessageConfirm.addEventListener('click', confirmAndDeleteMessage);

  // Show the unique modal
  uniqueDeleteMessageModal.show();
}

function openEditMessageModal(channelId, messageId) {
  // Create a unique modal element for this channel
  const uniqueEditMessageModal = new bootstrap.Modal(
    document.getElementById('editMessageModal')
  );

  const editMessageConfirm = document.querySelector('#editMessageButton');
  const cancelConfirm = document.querySelectorAll('.cancel-edit-message');
  const editMessageForm = document.querySelector('#newMessageEdit');

  // Select all messages with the same data-message-id
  const messages = document.querySelectorAll(
    `[data-message-id="${messageId}"]`
  );


  messages.forEach((message) => {
    console.log(message);
    const messageBody = message.querySelector('#messageBody');
    const messageContent = messageBody.textContent;

    editMessageForm.value = messageContent;
  });

  function confirmAndEditMessage() {
    handleEditMessage(channelId, messageId);
    uniqueEditMessageModal.hide();
    editMessageConfirm.removeEventListener('click', confirmAndEditMessage);
  }

  function confirmNotEditMessage() {
    uniqueEditMessageModal.hide();
    editMessageConfirm.removeEventListener('click', confirmAndEditMessage);
  }

  cancelConfirm.forEach((button) => {
    button.addEventListener('click', confirmNotEditMessage);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      confirmNotEditMessage();
    }
  });

  editMessageConfirm.addEventListener('click', confirmAndEditMessage);

  // Show the unique modal
  uniqueEditMessageModal.show();
}

function openInviteUsersModal(channelId) {
  // Create a unique modal element for this channel
  const uniqueInviteUserModal = new bootstrap.Modal(
    document.getElementById('inviteUsersModal')
  );

  const inviteUsersConfirm = document.querySelector('#confirmInviteUsers');
  const cancelConfirm = document.querySelector('.cancel-invite');

  function confirmAndInvite() {
    const checkboxes = document.querySelectorAll(
      'input[type="checkbox"]:checked'
    );
    const selectedUserIds = Array.from(checkboxes).map((checkbox) => {
      console.log(checkbox.id);
      return checkbox.id; // Assuming the value of each checkbox is set to the user ID
    });

    // Call the handleInviteUser function with the selectedUserIds
    selectedUserIds.forEach((userId) => {
      handleInviteUser(channelId, userId);
    });

    // Uncheck all checkboxes
    checkboxes.forEach((checkbox) => {
      checkbox.checked = false;
    });

    uniqueInviteUserModal.hide();
    inviteUsersConfirm.removeEventListener('click', confirmAndInvite);
  }

  function confirmNotInvite() {
    // Uncheck all checkboxes
    const checkboxes = document.querySelectorAll(
      'input[type="checkbox"]:checked'
    );
    checkboxes.forEach((checkbox) => {
      checkbox.checked = false;
    });

    uniqueInviteUserModal.hide();
    inviteUsersConfirm.removeEventListener('click', confirmAndInvite);
  }

  cancelConfirm.addEventListener('click', confirmNotInvite);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      confirmNotInvite();
    }
  });

  inviteUsersConfirm.addEventListener('click', confirmAndInvite);

  // Show the unique modal
  uniqueInviteUserModal.show();
}

function openUserProfileModal(userDetails) {
  // Create a unique modal element for this channel
  const uniqueDeleteMessageModal = new bootstrap.Modal(
    document.getElementById('userProfileModal')
  );

  const profilePic = document.querySelector('#profilePictureModal');
  const name = document.querySelector('#nameProfileModal');
  const email = document.querySelector('#emailProfileModal');
  const bio = document.querySelector('#bioProfileModal');
  const title = document.querySelector('#titleProfileModal');

  if (userDetails.image !== null) {
    profilePic.src = userDetails.image;
  } else {
    profilePic.src = 'default.jpg';
  }
  email.value = userDetails.email;
  name.value = userDetails.name;
  bio.value = userDetails.bio;

  title.textContent = `${userDetails.name} User Details`;

  const deleteMessageConfirm = document.querySelector('#deleteMessageConfirm');
  const cancelConfirm = document.querySelectorAll('.cancel-delete-message');

  function confirmAndDeleteMessage() {
    handleDeleteMessage(channelId, messageId);
    uniqueDeleteMessageModal.hide();
    deleteMessageConfirm.removeEventListener('click', confirmAndDeleteMessage);
  }

  function confirmNotDeleteMessage() {
    uniqueDeleteMessageModal.hide();
    deleteMessageConfirm.removeEventListener('click', confirmAndDeleteMessage);
  }

  cancelConfirm.forEach((button) => {
    button.addEventListener('click', confirmNotDeleteMessage);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      confirmNotDeleteMessage();
    }
  });

  deleteMessageConfirm.addEventListener('click', confirmAndDeleteMessage);

  // Show the unique modal
  uniqueDeleteMessageModal.show();
}

function openUploadImageModal(channelId) {
  // Create a unique modal element for this channel
  const uniqueUploadImageModal = new bootstrap.Modal(
    document.getElementById('uploadImageMessage')
  );

  const uploadImageConfirm = document.querySelector('#uploadImageButton');
  const cancelConfirm = document.querySelectorAll('.cancel-upload');
  const imageInput = document.querySelector('#uploadImage');

  function confirmAndUploadMessage() {
    handleSendImage(channelId, imageInput.files[0])
    uniqueUploadImageModal.hide();
    uploadImageConfirm.removeEventListener('click', confirmAndUploadMessage);
  }

  function confirmNotUpload() {
    uniqueUploadImageModal.hide();
    uploadImageConfirm.removeEventListener('click', confirmAndUploadMessage);
  }

  function enableConfirmButton() {
    uploadImageConfirm.removeAttribute('disabled');
  }

  // Add an event listener to the file input for changes
  imageInput.addEventListener('change', enableConfirmButton);

  cancelConfirm.forEach((button) => {
    button.addEventListener('click', confirmNotUpload);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      confirmNotUpload();
    }
  });

  uploadImageConfirm.addEventListener('click', confirmAndUploadMessage);

  // Show the unique modal
  uniqueUploadImageModal.show();
}

function openEditImageModal(channelId, messageId) {
    // Create a unique modal element for this channel
    const uniqueEditMessageModal = new bootstrap.Modal(
      document.getElementById('editMessageModal')
    );
  
    const editMessageConfirm = document.querySelector('#editMessageButton');
    const cancelConfirm = document.querySelectorAll('.cancel-edit-message');
    const editMessageForm = document.querySelector('#newMessageEdit');
  
    // Select all messages with the same data-message-id
    const messages = document.querySelectorAll(
      `[data-message-id="${messageId}"]`
    );
  
  
    messages.forEach((message) => {
      console.log(message);
      const messageBody = message.querySelector('#messageBody');
      const messageContent = messageBody.textContent;
  
      editMessageForm.value = messageContent;
    });
  
    function confirmAndEditMessage() {
      handleEditMessage(channelId, messageId);
      uniqueEditMessageModal.hide();
      editMessageConfirm.removeEventListener('click', confirmAndEditMessage);
    }
  
    function confirmNotEditMessage() {
      uniqueEditMessageModal.hide();
      editMessageConfirm.removeEventListener('click', confirmAndEditMessage);
    }
  
    cancelConfirm.forEach((button) => {
      button.addEventListener('click', confirmNotEditMessage);
    });
  
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        confirmNotEditMessage();
      }
    });
  
    editMessageConfirm.addEventListener('click', confirmAndEditMessage);
  
    // Show the unique modal
    uniqueEditMessageModal.show();
}

export function populateCheckboxesWithUserNames() {
  apiCallGet(`user`, true)
    .then((response) => {
      const userIds = response.users;

      userIds.forEach((userId) => {
        apiCallGet(`user/${userId.id}`, true)
          .then((user) => {
            const container = document.getElementById('userCheckboxList');
            // Create a list item element
            const listItem = document.createElement('li');

            // Create a div with a class of "checkbox"
            const checkboxDiv = document.createElement('div');
            checkboxDiv.classList.add('checkbox');

            // Create a label element
            const label = document.createElement('label');

            // Create an input element of type "checkbox"
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';

            checkbox.id = userId.id;

            // Set the label text to the user name
            label.textContent = user.name;

            // Append the checkbox to the label, and the label to the checkbox div
            label.prepend(checkbox);
            checkboxDiv.appendChild(label);

            // Append the checkbox div to the list item
            listItem.appendChild(checkboxDiv);

            // Append the list item to the container
            container.appendChild(listItem);
          })
          .catch((error) => {
            console.error(error);
          });
      });
    })
    .catch((error) => {
      console.error(error);
    });
}

///////////////////////////////////////////////////
