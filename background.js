// background.js
import { ENV } from "./environment.js";
import LeetCodeService from "./scripts/services/leetcode-service.js";
import SyncService from "./scripts/services/sync-service.js";

/**
 * Manages LeetCode problem statistics and synchronization state.
 */
class LeetCodeStateManager {
  constructor() {
    this.state = {
      counter: { easy: 0, medium: 0, hard: 0 },
      isCountingComplete: false,
      lastUpdate: null,
      loading: true,
    };
  }

  incrementCounter(difficulty) {
    if (!difficulty) return;
    const normalizedDifficulty = difficulty.toLowerCase();
    if (normalizedDifficulty in this.state.counter) {
      this.state.counter[normalizedDifficulty] += 1;
      this.state.lastUpdate = new Date();
      this.broadcastState();
      return true;
    }
    return false;
  }

  updateStats(difficulties) {
    this.state.counter = { easy: 0, medium: 0, hard: 0 };
    difficulties.forEach((difficulty) => {
      if (difficulty) {
        const normalizedDifficulty = difficulty.toLowerCase();
        if (normalizedDifficulty in this.state.counter) {
          this.state.counter[normalizedDifficulty] += 1;
        }
      }
    });
    this.state.lastUpdate = new Date();
    this.state.loading = false;
    this.state.isCountingComplete = true;
    this.broadcastState();
  }

  getStats() {
    return {
      ...this.state.counter,
      isCountingComplete: this.state.isCountingComplete,
      lastUpdate: this.state.lastUpdate,
      loading: this.state.loading,
    };
  }

  reset() {
    this.state.counter = { easy: 0, medium: 0, hard: 0 };
    this.state.isCountingComplete = false;
    this.state.lastUpdate = null;
    this.state.loading = true;
  }

  broadcastState() {
    chrome.runtime.sendMessage({ type: "statsUpdate", data: this.getStats() }).catch(() => {});
  }
}

/**
 * Service for interacting with GitHub repositories.
 */
class GitHubService {
  constructor(env) {
    this.env = env;
  }

  async buildBasicGithubUrl() {
    const result = await chrome.storage.local.get(["leetcode_tracker_username", "leetcode_tracker_repo"]);
    return `${this.env.REPOSITORY_URL}${result.leetcode_tracker_username}/${result.leetcode_tracker_repo}/contents/`;
  }

  async getAllLeetCodeProblems() {
    try {
      const url = await this.buildBasicGithubUrl();
      const response = await fetch(url);
      const data = await response.json();
      return data
        .filter((problem) => /^\d+-[A-Z]/.test(problem.name))
        .map((problem) => ({
          originalName: problem.name,
          questionId: this.convertGithubToLeetCodeSlug(problem.name),
        }));
    } catch (error) {
      return [];
    }
  }

  convertGithubToLeetCodeSlug(githubFileName) {
    const [number] = githubFileName.split("-");
    return number;
  }
}

/**
 * Main Controller
 */
class LeetCodeTrackerController {
  constructor() {
    this.stateManager = new LeetCodeStateManager();
    this.githubService = new GitHubService(ENV);
    this.leetCodeService = new LeetCodeService();
    this.syncService = new SyncService();

    // Store config
    chrome.storage.local.set({ leetcode_tracker_data_config: ENV });

    // Init sync status
    chrome.storage.local.set({
      leetcode_tracker_last_sync_status: "",
      leetcode_tracker_sync_in_progress: false,
      leetcode_tracker_last_sync_message: "No synchronization performed yet",
      leetcode_tracker_last_sync_date: null,
    });

    this.initializeMessageListeners();
  }

  initializeMessageListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      const handlers = {
        updateDifficultyStats: () => {
          const success = this.stateManager.incrementCounter(request.difficulty);
          sendResponse({ success });
        },
        getDataConfig: () => {
          sendResponse(ENV);
        },
        getStorageConfig: async () => {
          const result = await chrome.storage.local.get(request.properties);
          sendResponse(result);
        },
        saveUserInfos: () => {
          this.saveUserInfos(request);
          sendResponse({ success: true });
        },
        syncSolvedProblems: () => {
          this.startSync();
          sendResponse({ status: "started" });
        },
        requestInitialStats: () => {
          this.initCounter();
          sendResponse(null);
        },
        // NEW AUTHENTICATION HANDLER
        authenticate: async () => {
          try {
            await this.authenticateUser(request.code);
            sendResponse({ success: true });
          } catch (error) {
            console.error("Auth Error:", error);
            sendResponse({ success: false, error: error.message });
          }
        }
      };

      if (handlers[request.type]) {
        handlers[request.type]();
      }

      return true; // Keep channel open for async
    });
  }

  // --- NEW AUTHENTICATION LOGIC ---
  async authenticateUser(code) {
    // 1. Exchange Code for Access Token
    const tokenResponse = await fetch(ENV.ACCESS_TOKEN_URL, {
      method: "POST",
      headers: ENV.HEADER,
      body: JSON.stringify({
        client_id: ENV.CLIENT_ID,
        client_secret: ENV.CLIENT_SECRET,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.error) {
      throw new Error(tokenData.error_description || "Failed to get access token");
    }

    const accessToken = tokenData.access_token;

    // 2. Fetch User Info
    const userResponse = await fetch(ENV.USER_INFO_URL, {
      method: "GET",
      headers: {
        ...ENV.HEADER,
        Authorization: `token ${accessToken}`,
      },
    });

    if (!userResponse.ok) throw new Error("Failed to fetch user info");
    
    const userData = await userResponse.json();

    // 3. Save to Storage
    await this.saveUserInfos({
      username: userData.login,
      token: accessToken
    });

    // 4. Send message to UI (Popup) if needed or Init Counter
    this.initCounter();
  }

  saveUserInfos(request) {
    chrome.storage.local.set({
      leetcode_tracker_username: request.username,
      leetcode_tracker_token: request.token,
    });
  }

  async startSync() {
    try {
      const result = await this.syncService.startSync();
      await chrome.storage.local.set({
        leetcode_tracker_last_sync_status: result.success ? "success" : "failed",
        leetcode_tracker_sync_in_progress: false,
        leetcode_tracker_last_sync_message: result.message,
        leetcode_tracker_last_sync_date: new Date().toISOString(),
      });
      if (result.success) this.initCounter();
      return result;
    } catch (error) {
      await chrome.storage.local.set({
        leetcode_tracker_last_sync_status: "failed",
        leetcode_tracker_sync_in_progress: false,
        leetcode_tracker_last_sync_message: error.message,
        leetcode_tracker_last_sync_date: new Date().toISOString(),
      });
      return { success: false, message: "Error during synchronization: " + error.message };
    }
  }

  async initCounter() {
    try {
      const { leetcode_tracker_token, leetcode_tracker_username, leetcode_tracker_repo } = 
        await chrome.storage.local.get(["leetcode_tracker_token", "leetcode_tracker_username", "leetcode_tracker_repo"]);

      if (!leetcode_tracker_token || !leetcode_tracker_username || !leetcode_tracker_repo) {
        this.stateManager.state.loading = false;
        this.stateManager.state.isCountingComplete = true;
        this.stateManager.broadcastState();
        return;
      }

      this.stateManager.reset();

      const [problems, allQuestions] = await Promise.all([
        this.githubService.getAllLeetCodeProblems(),
        this.leetCodeService.fetchAllQuestionsDifficulty(),
      ]);

      const difficultyMap = new Map(allQuestions.map((q) => [q.questionId, q.difficulty]));
      const difficulties = problems.map((problem) => difficultyMap.get(problem.questionId));

      this.stateManager.updateStats(difficulties);
    } catch (error) {
      this.stateManager.state.loading = false;
      this.stateManager.state.isCountingComplete = true;
      this.stateManager.broadcastState();
    }
  }
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install" || details.reason === "update") {
    const defaults = {
      leetcode_tracker_code_submit: true,
      leetcode_tracker_sync_multiple_submission: false,
      leetcode_tracker_comment_submission: false,
      leetcode_tracker_auto_sync: true,
    };
    chrome.storage.local.get(Object.keys(defaults), (result) => {
      for (const [key, value] of Object.entries(defaults)) {
        if (result[key] === undefined) chrome.storage.local.set({ [key]: value });
      }
    });
  }
});

const controller = new LeetCodeTrackerController();

chrome.runtime.onStartup.addListener(async () => {
  try {
    const data = await chrome.storage.local.get([
      "leetcode_tracker_token", "leetcode_tracker_username", "leetcode_tracker_repo", "leetcode_tracker_mode"
    ]);
    if (data.leetcode_tracker_token && data.leetcode_tracker_username && data.leetcode_tracker_repo && data.leetcode_tracker_mode) {
      controller.initCounter();
    }
  } catch (error) {}
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && (changes.leetcode_tracker_repo || changes.leetcode_tracker_mode)) {
    controller.initCounter();
  }
});