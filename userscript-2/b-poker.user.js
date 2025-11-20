// ==UserScript==
// @name         [A POKER]
// @author       You
// @namespace    http://tampermonkey.net/
// @copyright    CC0
// @version      1.3.0
// @description  https://www.tampermonkey.net/documentation.php
// @icon         https://watchpeopledie.tv/icon.webp
// @grant        none
// @match        https://watchpeopledie.tv/casino/poker/*
// @run-at       document-idle
// @downloadURL  https://raw.githubusercontent.com/adastra1826/wpd-poker/main/userscript-2/a-poker.user.js
// @updateURL    https://raw.githubusercontent.com/adastra1826/wpd-poker/main/userscript-2/a-poker.user.js
// ==/UserScript==

/*
TODO:
- implement game state tracking
- implement pre-move actions (check, call, raise, fold, allin)
- implement bet vs raise text
- implement custom sound when it is the user's turn
*/

(function () {
  "use strict";

  // ==========================================================================
  // CONFIGURATION & CONSTANTS
  // ==========================================================================

  const BUTTON_MAPPINGS = [
    ["Check", "poker-CHECK"],
    ["Raise", "poker-RAISE"],
    ["Fold", "poker-FOLD"],
    ["Start Game", "poker-STARTGAME"],
    ["Leave", "poker-LEAVE"],
    ["Unready", "poker-UNREADY"],
    ["Show Hand", "poker-SHOWHAND"],
  ];

  const STYLES = `
    .poker-btn[data-disabled="true"] {
      opacity: 0.5 !important;
      cursor: not-allowed !important;
      pointer-events: none !important;
    }
    .poker-btn[data-disabled="true"]:hover {
      opacity: 0.5 !important;
      transform: none !important;
      box-shadow: none !important;
    }
  `;

  // ==========================================================================
  // STATE
  // ==========================================================================

  const state = {
    currentUserId: null,
    gameState: null,
    isInitialized: false,
  };

  // ==========================================================================
  // DOM HELPERS
  // ==========================================================================

  const DOM = {
    get currentUserId() {
      return document.getElementById("vid")?.value;
    },
    get pokerTable() {
      return document.getElementById("poker-table");
    },
    get defaultButtonsContainer() {
      return document.getElementById("poker-buttons");
    },
    get customButtonsContainer() {
      return document.getElementById("custom-poker-buttons");
    },
    get observerTarget() {
      return document.getElementById("orgy-top-container");
    },
    get helpIcon() {
      return document.getElementById("poker-help-icon");
    },
  };

  // ==========================================================================
  // GAME STATE FUNCTIONS
  // ==========================================================================

  function getGameState() {
    const table = DOM.pokerTable;
    if (!table) return null;
    return table.getAttribute("data-state");
  }

  function parseGameState() {
    const gameStateRaw = getGameState();
    if (!gameStateRaw) return null;

    try {
      const gameStateObj = JSON.parse(gameStateRaw);
      console.log("Game state updated:", gameStateObj);
      return gameStateObj;
    } catch (e) {
      console.error("Failed to parse game state:", e);
      return null;
    }
  }

  // ==========================================================================
  // UI FUNCTIONS
  // ==========================================================================

  function injectStyles() {
    const style = document.createElement("style");
    style.textContent = STYLES;
    document.head.appendChild(style);
    console.log("Styles injected");
  }

  function removeHelpIcon() {
    const helpIcon = DOM.helpIcon;
    if (helpIcon) {
      helpIcon.remove();
      console.log("Removed poker help icon/Wikipedia link");
    }
  }

  function hideDefaultButtons() {
    const defaultButtons = DOM.defaultButtonsContainer;
    if (defaultButtons) {
      defaultButtons.setAttribute("hidden", "true");
      console.log("Default buttons hidden");
    }
  }

  function createCustomButtonsDiv() {
    // Don't recreate if already exists
    if (DOM.customButtonsContainer) return;

    const defaultButtons = DOM.defaultButtonsContainer;
    if (!defaultButtons) return;

    const parentDiv = defaultButtons.parentElement;
    const customButtonsDiv = document.createElement("div");
    customButtonsDiv.id = "custom-poker-buttons";

    // Insert in the same position as default buttons
    parentDiv.insertBefore(customButtonsDiv, defaultButtons);

    // Apply styles
    Object.assign(customButtonsDiv.style, {
      display: "flex",
      flexDirection: "column",
      gap: "0.25em",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      height: "100%",
      position: "absolute",
      top: "0",
      left: "0",
      zIndex: "1000",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      backdropFilter: "blur(10px)",
      padding: "1em",
      borderRadius: "10px",
      boxShadow: "0 0 10px 0 rgba(0, 0, 0, 0.5)",
      opacity: "0.5",
    });

    // Create buttons
    BUTTON_MAPPINGS.forEach(([text, originalId]) => {
      const button = document.createElement("button");
      button.textContent = text;
      button.className = "btn btn-primary poker-btn";
      button.setAttribute("data-original-id", originalId);

      button.addEventListener("click", function (e) {
        if (button.hasAttribute("data-disabled")) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
        const originalButton = document.getElementById(originalId);
        if (originalButton) {
          originalButton.click();
        }
      });

      customButtonsDiv.appendChild(button);
    });

    console.log("Custom buttons div created");
  }

  function syncButtonStates() {
    const defaultButtons = DOM.defaultButtonsContainer;
    const customButtons = DOM.customButtonsContainer;
    if (!defaultButtons || !customButtons) return;

    const defaultButtonElems = Array.from(
      defaultButtons.querySelectorAll("button")
    );

    defaultButtonElems.forEach((defaultBtn) => {
      const customBtn = customButtons.querySelector(
        `button[data-original-id="${defaultBtn.id}"]`
      );
      if (!customBtn) return;

      const isDisabled =
        defaultBtn.hasAttribute("hidden") ||
        defaultBtn.disabled ||
        defaultBtn.style.display === "none";

      if (isDisabled) {
        customBtn.setAttribute("data-disabled", "true");
        Object.assign(customBtn.style, {
          opacity: "0.5",
          cursor: "not-allowed",
          pointerEvents: "none",
        });
      } else {
        customBtn.removeAttribute("data-disabled");
        Object.assign(customBtn.style, {
          opacity: "",
          cursor: "",
          pointerEvents: "",
        });
      }
    });
  }

  // ==========================================================================
  // CORE UPDATE FUNCTION (called on every observed change)
  // ==========================================================================

  function onStateChange() {
    // Update game state
    state.gameState = parseGameState();

    // Sync UI with current state
    syncButtonStates();

    // Add any additional state-dependent updates here
    // e.g., updatePlayerInfo(), checkIfMyTurn(), etc.
  }

  // ==========================================================================
  // INITIALIZATION (runs once on page load)
  // ==========================================================================

  function initialize() {
    if (state.isInitialized) return;

    console.log("Initializing poker userscript...");

    // Get current user
    state.currentUserId = DOM.currentUserId;
    console.log("Current user ID:", state.currentUserId);

    // One-time DOM setup
    injectStyles();
    removeHelpIcon();
    hideDefaultButtons();
    createCustomButtonsDiv();

    // Initial state sync
    onStateChange();

    // Mark as initialized
    state.isInitialized = true;
    console.log("Initialization complete");
  }

  // ==========================================================================
  // OBSERVERS
  // ==========================================================================

  function setupObservers() {
    // Main game state observer
    const observerTarget = DOM.observerTarget;
    if (observerTarget) {
      const mainObserver = new MutationObserver(function (mutations) {
        // Ensure we're initialized before processing changes
        if (!state.isInitialized) {
          initialize();
        }
        onStateChange();
      });

      mainObserver.observe(observerTarget, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["data-state"],
      });

      console.log("Main observer attached");
    }

    // Button state observer (backup for button-specific changes)
    const defaultButtonsContainer = DOM.defaultButtonsContainer;
    if (defaultButtonsContainer) {
      const buttonObserver = new MutationObserver(function () {
        syncButtonStates();
      });

      buttonObserver.observe(defaultButtonsContainer, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["hidden", "disabled", "style"],
      });

      console.log("Button observer attached");
    }
  }

  // ==========================================================================
  // ENTRY POINT
  // ==========================================================================

  function main() {
    // Set up observers first (they'll handle all future updates)
    setupObservers();

    // Run initial setup
    initialize();
  }

  // Start the script
  main();
})();