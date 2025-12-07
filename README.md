# CodeHub - LeetCode to GitHub Sync

![LeetCode Tracker](https://github.com/ritikbundela/CodeHub/blob/main/assets/codehub%20screenshot.png)

> **Auto-sync your LeetCode submissions to GitHub.** > Keep your coding profile active and showcase your problem-solving skills automatically.

## Introduction

**CodeHub** (LeetCode Tracker) is a Chrome Extension built to automatically synchronize your "Accepted" LeetCode solutions to a GitHub repository. It eliminates the manual work of copy-pasting code, helping developers maintain a comprehensive history of their problem-solving journey.

Built with **Manifest V3**, this extension leverages modern web APIs to detect successful submissions and upload them instantly to GitHub with proper metadata.

##  Key Features

- ** Automatic Sync:** Instantly pushes code to GitHub upon a successful "Accepted" submission.
- ** Dashboard & Stats:** Tracks the number of Easy, Medium, and Hard problems solved directly in the extension popup.
- ** Smart Organization:** Creates files with problem names (e.g., `1-two-sum.cpp`) and supports folder structures.
- ** Bulk Sync:** A dedicated feature to sync all your previously solved problems in one go.
- ** Metadata & Comments:** Automatically adds difficulty level, time complexity, and problem links as comments in the code file.
- ** Secure Authentication:** Uses GitHub OAuth 2.0 for secure and seamless integration.

## Tech Stack

- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **Browser API:** Chrome Extension Manifest V3 (Storage, Identity, Scripting)
- **APIs:** GitHub REST API, LeetCode Internal API
- **Key Concepts:** DOM Manipulation (`MutationObserver`), Asynchronous Programming, OAuth Authentication.

## Installation & Setup

Since this extension is in developer mode (or if you are running it locally), follow these steps:

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/ritikbundela/CodeHub
    ```

2.  **Load into Chrome**
    - Open Chrome and navigate to `chrome://extensions/`.
    - Toggle **Developer mode** (top right).
    - Click **Load unpacked**.
    - Select the folder where you cloned this repository.

3.  **Configuration**
    - Click on the extension icon in your browser toolbar.
    - Click on **"Authenticate with GitHub"**.
    - Grant the necessary permissions to allow repository access.
    - Select an existing repository or create a new one (e.g., `my-leetcode-solutions`) to store your codes.

##  How It Works

1.  **Detection:** The extension injects a content script (`leetcode.js`) into LeetCode pages. It uses a `MutationObserver` to watch for the "Accepted" status on the submission result.
2.  **Extraction:** Once accepted, it scrapes the solution code, programming language, and problem details from the DOM.
3.  **Upload:** The background service worker (`background.js`) receives this data and uses the GitHub API to create or update the file in your linked repository.

## 📂 Project Structure

```bash
├── assets/              # Icons and static images
├── css/                 # Styles for the popup
├── scripts/             # Core logic
│   ├── services/        # GitHub & LeetCode API services
│   ├── utils/           # Helper functions
│   ├── background.js    # Service worker (Event handling)
│   ├── leetcode.js      # Content script (DOM Observer)
├── manifest.json        # Extension configuration (Manifest V3)
└── popup.html           # Extension UI
