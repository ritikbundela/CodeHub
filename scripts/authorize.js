// scripts/authorize.js

if (window.location.host === "github.com" && window.location.search.includes("code=")) {

  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get("code");

  if (code) {

    chrome.runtime.sendMessage({ type: "authenticate", code: code }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Extension Error:", chrome.runtime.lastError);
        return;
      }

      if (response && response.success) {
        alert("LeetCode Tracker: GitHub Connected Successfully! You can close this tab.");
        // Optional: Tab close kar sakte ho
        // window.close(); 
      } else {
        alert("Authentication Failed. Check console for details.");
      }
    });
  }
}