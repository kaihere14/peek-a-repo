const input = document.getElementById("token");
const saveBtn = document.getElementById("save");
const oauthLoginBtn = document.getElementById("oauthLogin");
const logoutBtn = document.getElementById("logout");
const oauthStatus = document.getElementById("oauthStatus");
const tokenStatus = document.getElementById("tokenStatus");
const loggedInStatus = document.getElementById("loggedInStatus");
const loginSection = document.getElementById("loginSection");

// Check if user is already logged in
async function checkLoginStatus() {
  const { githubToken } = await chrome.storage.sync.get("githubToken");
  if (githubToken) {
    loggedInStatus.style.display = "block";
    loginSection.style.display = "none";
  } else {
    loggedInStatus.style.display = "none";
    loginSection.style.display = "block";
  }
  return githubToken;
}

// Initialize
checkLoginStatus().then((token) => {
  if (token) input.value = token;
});

// OAuth Login
oauthLoginBtn.addEventListener("click", async () => {
  oauthLoginBtn.disabled = true;
  oauthLoginBtn.textContent = "Connecting...";
  oauthStatus.textContent = "";
  oauthStatus.classList.remove("show", "success", "error");

  try {
    // Check if user wants private repo access
    const includePrivateRepos = document.getElementById("includePrivateRepos").checked;
    const scope = includePrivateRepos ? "repo read:user" : "read:user";
    
    // For Chrome extensions, we need to use GitHub's device flow instead
    // because we can't securely store client_secret in the extension
    
    // Step 1: Request device code
    const deviceResponse = await fetch("https://github.com/login/device/code", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: "Ov23li7jLGhcwdkrnVXS",
        scope: scope,
      }),
    });

    const deviceData = await deviceResponse.json();
    
    if (deviceData.error) {
      throw new Error(deviceData.error_description || "Failed to initiate OAuth");
    }

    // Step 2: Open GitHub authorization page
    window.open(deviceData.verification_uri, "_blank");
    
    // Show user code
    oauthStatus.textContent = `Enter this code: ${deviceData.user_code}`;
    oauthStatus.classList.add("show", "success");
    oauthLoginBtn.textContent = "Waiting for authorization...";

    // Step 3: Poll for access token
    const pollInterval = (deviceData.interval || 5) * 1000;
    const expiresAt = Date.now() + deviceData.expires_in * 1000;

    const pollForToken = async () => {
      if (Date.now() > expiresAt) {
        throw new Error("Authorization expired. Please try again.");
      }

      const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: "Ov23li7jLGhcwdkrnVXS",
          device_code: deviceData.device_code,
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        }),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error === "authorization_pending") {
        // Still waiting, poll again
        setTimeout(pollForToken, pollInterval);
        return;
      }

      if (tokenData.error === "slow_down") {
        // Slow down polling
        setTimeout(pollForToken, pollInterval + 5000);
        return;
      }

      if (tokenData.error) {
        throw new Error(tokenData.error_description || tokenData.error);
      }

      if (tokenData.access_token) {
        // Success! Save the token
        await chrome.storage.sync.set({ githubToken: tokenData.access_token });
        
        oauthStatus.textContent = "✓ Successfully connected to GitHub!";
        oauthStatus.classList.remove("error");
        oauthStatus.classList.add("show", "success");
        
        setTimeout(() => {
          checkLoginStatus();
          oauthLoginBtn.disabled = false;
          oauthLoginBtn.textContent = "Sign in with GitHub";
        }, 1500);
      }
    };

    // Start polling
    setTimeout(pollForToken, pollInterval);

  } catch (error) {
    oauthStatus.textContent = `Error: ${error.message}`;
    oauthStatus.classList.remove("success");
    oauthStatus.classList.add("show", "error");
    oauthLoginBtn.disabled = false;
    oauthLoginBtn.textContent = "Sign in with GitHub";
  }
});

// Logout
logoutBtn.addEventListener("click", async () => {
  await chrome.storage.sync.remove("githubToken");
  input.value = "";
  checkLoginStatus();
  tokenStatus.textContent = "";
  tokenStatus.classList.remove("show");
});

// Manual token save
saveBtn.addEventListener("click", async () => {
  const token = input.value.trim();
  
  if (!token) {
    tokenStatus.textContent = "Please enter a token";
    tokenStatus.classList.remove("success");
    tokenStatus.classList.add("show", "error");
    return;
  }

  await chrome.storage.sync.set({ githubToken: token });
  tokenStatus.textContent = "✓ Token saved successfully!";
  tokenStatus.classList.remove("error");
  tokenStatus.classList.add("show", "success");
  
  setTimeout(() => {
    checkLoginStatus();
  }, 1000);
});
