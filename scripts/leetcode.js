import Problem from "/scripts/models/problem.js";
import GithubService from "/scripts/services/github-service.js";
import RouteService from "/scripts/services/route-service.js";
import { domElements } from "/scripts/constants/dom-elements.js";

export default class LeetcodeTracker {
  constructor() {
    this.problem = new Problem();
    this.githubService = new GithubService();
    this.route = new RouteService(() => this.init());
    this.observer = null;
    this.lastSyncTime = 0; // Duplicate sync rokne ke liye
    this.init();
  }

  init() {
    console.log("LeetCode Tracker: Initialized on this page.");
    this.problem.loadProblemFromDOM();
    this.startResultObserver();
  }

  startResultObserver() {
    // Agar purana observer chal raha hai toh band karo
    if (this.observer) this.observer.disconnect();

    console.log("LeetCode Tracker: Watching for 'Accepted' status...");

    this.observer = new MutationObserver((mutations) => {
      // Har change par check karo ki kya "Accepted" aaya?
      this.checkSubmissionResult();
    });

    // Poore body par nazar rakho
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  checkSubmissionResult() {
    // Step 1: Check agar humne abhi-abhi sync kiya hai (10 sec cooldown)
    const now = Date.now();
    if (now - this.lastSyncTime < 10000) return;

    // Step 2: Result element dhoondo using multiple selectors
    let successElement = null;
    for (const selector of domElements.submissionResultSelectors) {
      const el = document.querySelector(selector);
      if (el && el.textContent.includes("Accepted")) {
        successElement = el;
        break;
      }
    }

    // Step 3: Agar Accepted mil gaya, toh process shuru karo
    if (successElement) {
      console.log("LeetCode Tracker: 'Accepted' detected! Starting sync...");
      this.lastSyncTime = now; // Timestamp update karo taaki loop na bane
      this.processAcceptedSubmission();
    }
  }

  async processAcceptedSubmission() {
    let isCommentEnabled = false;
    try {
      if (typeof chrome !== "undefined" && chrome.storage?.local) {
        const result = await chrome.storage.local.get("leetcode_tracker_comment_submission");
        isCommentEnabled = !!result?.leetcode_tracker_comment_submission;
      }
    } catch (e) { console.warn("Settings load error", e); }

    // Data extract karo
    this.problem.extractLanguageFromDOM();
    this.problem.extractCodeFromDOM();

    // Validation
    if (!this.problem.code || !this.problem.language.langName) {
      console.error("LeetCode Tracker: Code or Language missing. Retrying in 1s...");
      // Kabhi kabhi DOM update hone me time lagta hai, ek baar retry karo
      setTimeout(() => {
        this.problem.extractCodeFromDOM();
        if (this.problem.code) this.processAcceptedSubmission(); // Retry recursion
      }, 1000);
      return;
    }

    const userComment = isCommentEnabled ? await this.showCommentPopup() : "";

    try {
      await this.githubService.submitToGitHub(this.problem, userComment);
      console.log("LeetCode Tracker: Sync Successful!");
      this.showToast(`Problem ${this.problem.slug || "Solved"} synced successfully`, "success");
    } catch (error) {
      console.error("LeetCode Tracker: Sync Failed", error);
      const message = error.message ? error.message.substring(0, 100) : "Unknown error";
      this.showToast(`Sync failed: ${message}`, "error");
    }
  }

  showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.style.cssText = `
      position: fixed; bottom: 20px; right: 20px; z-index: 10000;
      background: ${type === "error" ? "#ff4d4f" : "#52c41a"};
      color: white; padding: 12px 24px; border-radius: 8px;
      font-family: -apple-system, sans-serif; font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15); animation: fadeIn 0.3s ease;
    `;
    toast.textContent = message;
    
    // Animation keyframes add karo
    const style = document.createElement('style');
    style.innerHTML = `@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`;
    document.head.appendChild(style);

    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.5s';
      setTimeout(() => toast.remove(), 500);
    }, 4000);
  }

  showCommentPopup() {
    // Agar comment popup chahiye toh purana logic yahan daal sakte ho
    // Filhal empty return kar rahe hain taaki crash na ho
    return Promise.resolve("");
  }
}