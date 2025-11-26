import LanguageUtils from "../utils/language-utils.js";

export default class Problem {
  constructor() {
    this.slug = "";
    this.difficulty = "";
    this.description = "";
    this.problemUrl = "";
    this.code = "";
    this.language = {};
  }

  loadProblemFromDOM() {
    const url = this.getDescriptionUrl();

    if (url) {
      this.extractProblemInfos(url);
    }
  }

  getDescriptionUrl() {
    const url = window.location.href;

    if (url.includes("leetcode.com/problems/")) {
      const problemName = url
        .replace("https://leetcode.com/problems/", "")
        .split("/")[0];

      this.problemUrl = `/problems/${problemName}/`;
      return `https://leetcode.com/problems/${problemName}/description/`;
    }

    return "";
  }

  /* * FIXED: Updated to support new LeetCode UI selectors
   * purana selector id based tha jo bar bar change hota tha.
   * Ab hum LocalStorage aur generic attributes use kar rahe hain.
   */
  extractLanguageFromDOM() {
    // 1. Sabse pehle Local Storage check karo (Sabse reliable)
    let language = null;
    try {
      language = JSON.parse(window.localStorage.getItem("global_lang"));
    } catch (e) {
      console.error("LeetCode Tracker: Error parsing global_lang", e);
    }

    // 2. Agar Local Storage me nahi mila, toh DOM me dhoondo
    if (!language) {
      // Naya UI: Button jo 'headlessui-popover-button' se start hota hai
      const langButton = document.querySelector('button[id^="headlessui-popover-button"]');
      if (langButton) {
        language = langButton.textContent;
      } else {
        // Fallback: Agar upar wala fail ho jaye, toh 'lang-select' attribute check karo
        const trigger = document.querySelector('[data-cy="lang-select-trigger"]');
        if (trigger) language = trigger.textContent;
      }
    }

    this.language = LanguageUtils.getLanguageInfo(language);
  }

  extractCodeFromDOM() {
    if (!this.language || !this.language.langName) {
      console.warn("LeetCode Tracker: Language not detected, cannot extract code.");
      return;
    }

    const codeElements = document.querySelectorAll(
      `code.language-${this.language.langName}`
    );

    if (codeElements && codeElements.length > 0) {
      this.code = codeElements[codeElements.length - 1].textContent;
    } else {
      // Fallback: Kabhi kabhi code element turant load nahi hota
      console.warn("LeetCode Tracker: Code element not found for language " + this.language.langName);
    }
  }

  extractProblemInfos(url) {
    const iframe = document.createElement("iframe");

    // Invisible iframe
    iframe.style.position = "absolute";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";

    iframe.src = url;

    // Observer to retrieve data from the iframe
    iframe.onload = () => {
      const iframeDocument =
        iframe.contentDocument || iframe.contentWindow.document;

      const observer = new MutationObserver((mutations, obs) => {
        // Extract data from the iframe
        this.extractDifficultyFromDOM(iframeDocument);
        this.extractDescriptionFromDOM(iframeDocument);
        this.extractSlugFromDOM(iframeDocument);

        // If all data is extracted, stop the observer
        if (this.difficulty && this.description && this.slug) {
          obs.disconnect();
          document.body.removeChild(iframe);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      // Stop the observer after 3 seconds and remove the iframe
      setTimeout(() => {
        observer.disconnect();
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 3000);
    };

    document.body.appendChild(iframe);
  }

  async extractSlugFromDOM(iframeContent) {
    const problemNameSelector = iframeContent.querySelector(
      `a[href='${this.problemUrl}']`
    );

    if (problemNameSelector) {
      this.slug = this.formatProblemName(problemNameSelector.textContent);
    }
  }

  async extractDifficultyFromDOM(iframeDocument) {
    const easy = iframeDocument.querySelector("div.text-difficulty-easy");
    const medium = iframeDocument.querySelector("div.text-difficulty-medium");
    const hard = iframeDocument.querySelector("div.text-difficulty-hard");

    if (easy) {
      this.difficulty = "easy";
    } else if (medium) {
      this.difficulty = "medium";
    } else if (hard) {
      this.difficulty = "hard";
    } else {
      this.difficulty = "";
    }
  }

  async extractDescriptionFromDOM(iframeDocument) {
    const problemDescription = iframeDocument.querySelector(
      'div[data-track-load="description_content"]'
    );
    if (problemDescription) {
      this.description = problemDescription.textContent;
    }
  }

  formatProblemName(problemName) {
    if (!problemName) {
      return "";
    }

    let formatted = problemName.toString().trim();

    formatted = formatted.replace(/\./g, "-").replace(/\s+/g, "");

    formatted = formatted.replace(/^[\/\-_]+|[\/\-_]+$/g, '');

    formatted = formatted.replace(/\//g, '-');

    return formatted;
  }
}