// ==UserScript==
// @name         [A POKER]
// @author       You
// @namespace    http://tampermonkey.net/
// @copyright    CC0
// @version      1.2.9
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

  // ============================================
  // GLOBAL STATE & CONFIGURATION
  // ============================================
  
  const CONFIG = {
    currentUserId: null,
    isInitialized: false,
    observers: [],
    lastGameState: null,
    buttonMappings: [
      ["Check", "poker-CHECK"],
      ["Raise", "poker-RAISE"],
      ["Fold", "poker-FOLD"],
      ["Start Game", "poker-STARTGAME"],
      ["Leave", "poker-LEAVE"],
      ["Unready", "poker-UNREADY"],
      ["Show Hand", "poker-SHOWHAND"],
    ]
  };

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  function log(message, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    if (data) {
      console.log(`[Poker ${timestamp}] ${message}`, data);
    } else {
      console.log(`[Poker ${timestamp}] ${message}`);
    }
  }

  function getGameState() {
    const pokerTable = document.getElementById("poker-table");
    if (!pokerTable) return null;
    
    const stateAttr = pokerTable.getAttribute("data-state");
    if (!stateAttr) return null;
    
    try {
      return JSON.parse(stateAttr);
    } catch (e) {
      log("Failed to parse game state", e);
      return null;
    }
  }

  function hasGameStateChanged(newState) {
    if (!newState || !CONFIG.lastGameState) return true;
    return JSON.stringify(newState) !== JSON.stringify(CONFIG.lastGameState);
  }

  // ============================================
  // UI CREATION FUNCTIONS
  // ============================================

  function injectStyles() {
    const style = document.createElement("style");
    style.textContent = `
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
      #custom-poker-buttons {
        display: flex;
        flex-direction: column;
        gap: 0.25em;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        position: absolute;
        top: 0;
        left: 0;
        z-index: 1000;
        background-color: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(10px);
        padding: 1em;
        border-radius: 10px;
        box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.5);
        opacity: 0.5;
      }
    `;
    document.head.appendChild(style);
    log("Styles injected");
  }

  function createCustomButtonsUI() {
    // Hide default buttons
    const defaultButtons = document.getElementById("poker-buttons");
    if (!defaultButtons) {
      log("Default buttons not found, retrying...");
      return false;
    }
    
    defaultButtons.setAttribute("hidden", "true");
    log("Default buttons hidden");

    // Check if custom buttons already exist
    if (document.getElementById("custom-poker-buttons")) {
      log("Custom buttons already exist");
      return true;
    }

    // Create custom buttons container
    const parentDiv = defaultButtons.parentElement;
    const customButtonsDiv = document.createElement("div");
    customButtonsDiv.id = "custom-poker-buttons";

    // Insert in the same position as default buttons
    parentDiv.insertBefore(customButtonsDiv, defaultButtons);

    // Create buttons for each mapping
    CONFIG.buttonMappings.forEach(([text, originalId]) => {
      const button = document.createElement("button");
      button.textContent = text;
      button.className = "btn btn-primary poker-btn";
      button.setAttribute("data-original-id", originalId);

      // Click handler: trigger the original button
      button.addEventListener("click", function (e) {
        if (button.getAttribute("data-disabled") === "true") {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
        const originalButton = document.getElementById(originalId);
        if (originalButton) {
          log(`Custom button clicked: ${text}`);
          originalButton.click();
        }
      });

      customButtonsDiv.appendChild(button);
    });

    log("Custom buttons created");
    return true;
  }

  function removeHelpIcon() {
    const helpIcon = document.getElementById("poker-help-icon");
    if (helpIcon) {
      helpIcon.remove();
      log("Removed poker help icon");
    }
  }

  // ============================================
  // UPDATE FUNCTIONS
  // ============================================

  function updateButtonStates() {
    const defaultButtons = document.getElementById("poker-buttons");
    const customButtons = document.getElementById("custom-poker-buttons");
    
    if (!defaultButtons || !customButtons) {
      log("Buttons not ready for update");
      return;
    }

    // Mirror the state of default buttons to custom buttons
    const defaultButtonElems = Array.from(defaultButtons.querySelectorAll("button"));
    
    defaultButtonElems.forEach((defaultBtn) => {
      const customBtn = customButtons.querySelector(
        `button[data-original-id="${defaultBtn.id}"]`
      );
      
      if (customBtn) {
        const isDisabled = 
          defaultBtn.hasAttribute("hidden") ||
          defaultBtn.disabled ||
          defaultBtn.style.display === "none";

        if (isDisabled) {
          customBtn.setAttribute("data-disabled", "true");
        } else {
          customBtn.removeAttribute("data-disabled");
        }
      }
    });
    
    log("Button states updated");
  }

  function processGameState(gameState) {
    if (!gameState) return;
    
    // Store the current game state
    CONFIG.lastGameState = gameState;
    
    // Log important game state information
    log("Game state processed", {
      stage: gameState.stage,
      currentPlayer: gameState.current_player,
      pot: gameState.pot,
      players: gameState.players?.length
    });
    
    // TODO: Add game state specific logic here
    // - Check if it's user's turn
    // - Update button text (Bet vs Raise)
    // - Play sound if it's user's turn
    // - Handle pre-move actions
  }

  // ============================================
  // MAIN UPDATE FUNCTION
  // ============================================

  function handleUpdate(source = "unknown") {
    log(`Update triggered from: ${source}`);
    
    // Get current game state
    const gameState = getGameState();
    
    // Process game state if it changed
    if (hasGameStateChanged(gameState)) {
      processGameState(gameState);
    }
    
    // Always update button states (they might change without game state changing)
    updateButtonStates();
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  function setupObservers() {
    // Main observer for game state changes
    const targetElement = document.getElementById("orgy-top-container");
    if (targetElement) {
      const mainObserver = new MutationObserver(() => {
        handleUpdate("main-observer");
      });

      mainObserver.observe(targetElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["data-state"],
      });
      
      CONFIG.observers.push(mainObserver);
      log("Main observer setup complete");
    }

    // Observer for default button changes
    const defaultButtonsContainer = document.getElementById("poker-buttons");
    if (defaultButtonsContainer) {
      const buttonObserver = new MutationObserver(() => {
        handleUpdate("button-observer");
      });

      buttonObserver.observe(defaultButtonsContainer, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["hidden", "disabled", "style"],
      });
      
      CONFIG.observers.push(buttonObserver);
      log("Button observer setup complete");
    }
  }

  function initialize() {
    if (CONFIG.isInitialized) {
      log("Already initialized, skipping...");
      return;
    }

    log("Starting initialization...");
    
    // Get current user ID
    const vidElement = document.getElementById("vid");
    if (vidElement) {
      CONFIG.currentUserId = vidElement.value;
      log(`Current user ID: ${CONFIG.currentUserId}`);
    }
    
    // Inject styles
    injectStyles();
    
    // Remove help icon
    removeHelpIcon();
    
    // Create custom UI
    const uiCreated = createCustomButtonsUI();
    if (!uiCreated) {
      log("Failed to create UI, retrying in 500ms...");
      setTimeout(initialize, 500);
      return;
    }
    
    // Setup observers
    setupObservers();
    
    // Do initial update
    handleUpdate("initialization");
    
    CONFIG.isInitialized = true;
    log("Initialization complete!");
  }

  // ============================================
  // ENTRY POINT
  // ============================================

  // Wait for DOM to be ready if needed
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    // Small delay to ensure everything is loaded
    setTimeout(initialize, 100);
  }

  // Expose config for debugging
  window.pokerScriptConfig = CONFIG;
  
})();