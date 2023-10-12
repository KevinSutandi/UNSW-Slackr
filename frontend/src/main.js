import { BACKEND_PORT } from "./config.js";
// A helper you may want to use when uploading new images to the server.
import { fileToDataUrl, apiCall } from "./helpers.js";

// Function to check token when in homepage or any page
function isTokenValid() {
    const token = localStorage.getItem('token');
    console.log(token);
    return token !== null && token !== undefined;
  }
  
  // Check if a valid token exists
  if (!isTokenValid()) {
    // Redirect to the login page
    window.location.href = 'login.html';
  }