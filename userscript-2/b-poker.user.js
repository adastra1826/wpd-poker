// ==UserScript==
// @name         WPD Poker Enhancement
// @author       @UnbelievableBro
// @namespace    http://tampermonkey.net/
// @copyright    CC0
// @version      1.2.9
// @description  https://www.tampermonkey.net/documentation.php
// @icon         https://watchpeopledie.tv/icon.webp
// @grant        none
// @match        https://watchpeopledie.tv/casino/poker/*
// @run-at       document-idle
// @downloadURL  https://raw.githubusercontent.com/adastra1826/wpd-poker/main/userscript/poker.user.js
// @updateURL    https://raw.githubusercontent.com/adastra1826/wpd-poker/main/userscript/poker.user.js
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

  // Establish current user ID
  const currentUserId = document.getElementById("vid").value;
  console.log("Current user ID: " + currentUserId);

  // Get current poker table game state
  function getGameState() {
    return document.getElementById("poker-table").getAttribute("data-state");
  }

  // Parse the game state and update the UI
  function parseGameState() {
    const gameState = getGameState();
    const gameStateObj = JSON.parse(gameState);
    console.log(gameStateObj);
  }

  // Observe the poker table for changes
  const targetElement = document.getElementById("orgy-top-container");

  if (targetElement) {
    const observer = new MutationObserver(function (mutations) {
      parseGameState();
      mirrorDefaultButtons();
    });

    observer.observe(targetElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state"],
    });
  }

  // Add styles for disabled buttons
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
  `;
  document.head.appendChild(style);

  function setInitialGameState() {
    // Delete useless Wikipedia link
    document.getElementById("poker-help-icon").remove();
    console.log("Removed poker help icon/Wikipedia link");
    hideDefaultButtons();
    createCustomButtonsDiv();
    mirrorDefaultButtons();
  }

  // Hide div that contains the default poker buttons
  function hideDefaultButtons() {
    document.getElementById("poker-buttons").setAttribute("hidden", "true");
    console.log("Default buttons hidden");
  }

  // Create new div for custom poker buttons
  function createCustomButtonsDiv() {
    const defaultButtons = document.getElementById("poker-buttons");
    if (!defaultButtons) return;

    const parentDiv = defaultButtons.parentElement;
    const customButtonsDiv = document.createElement("div");
    customButtonsDiv.id = "custom-poker-buttons";

    // Insert in the same position as default buttons (right before it)
    parentDiv.insertBefore(customButtonsDiv, defaultButtons);

    // Style the new div
    customButtonsDiv.style.display = "flex";
    customButtonsDiv.style.flexDirection = "column";
    customButtonsDiv.style.gap = "0.25em";
    customButtonsDiv.style.alignItems = "center";
    customButtonsDiv.style.justifyContent = "center";
    customButtonsDiv.style.width = "100%";
    customButtonsDiv.style.height = "100%";
    customButtonsDiv.style.position = "absolute";
    customButtonsDiv.style.top = "0";
    customButtonsDiv.style.left = "0";
    customButtonsDiv.style.zIndex = "1000";
    customButtonsDiv.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    customButtonsDiv.style.backdropFilter = "blur(10px)";
    customButtonsDiv.style.padding = "1em";
    customButtonsDiv.style.borderRadius = "10px";
    customButtonsDiv.style.boxShadow = "0 0 10px 0 rgba(0, 0, 0, 0.5)";
    customButtonsDiv.style.opacity = "0.5";
    // Button mappings: [displayText, originalButtonId]
    const buttonMappings = [
      ["Check", "poker-CHECK"],
      ["Raise", "poker-RAISE"],
      ["Fold", "poker-FOLD"],
      ["Start Game", "poker-STARTGAME"],
      ["Leave", "poker-LEAVE"],
      ["Unready", "poker-UNREADY"],
      ["Show Hand", "poker-SHOWHAND"],
    ];

    // Create buttons for each mapping
    buttonMappings.forEach(([text, originalId]) => {
      const button = document.createElement("button");
      button.textContent = text;
      button.className = "btn btn-primary poker-btn";
      button.setAttribute("data-original-id", originalId);

      // Click handler: trigger the original button (only if not disabled)
      button.addEventListener("click", function (e) {
        // Prevent action if button is disabled
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

  // Disable buttons that cannot be used in the current game state
  // Use the hidden attribute of the original buttons to disable new buttons
  function mirrorDefaultButtons() {
    const defaultButtons = document.getElementById("poker-buttons");
    if (!defaultButtons) return;

    const customButtons = document.getElementById("custom-poker-buttons");
    if (!customButtons) return;

    // Find the default poker button elements
    const defaultButtonElems = Array.from(
      defaultButtons.querySelectorAll("button")
    );
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
          // Mark as disabled and apply styles
          customBtn.setAttribute("data-disabled", "true");
          customBtn.style.opacity = "0.5";
          customBtn.style.cursor = "not-allowed";
          customBtn.style.pointerEvents = "none";
          // Remove hover effects by overriding any hover styles
          customBtn.style.setProperty("--hover-opacity", "1", "important");
        } else {
          // Enable button
          customBtn.removeAttribute("data-disabled");
          customBtn.style.opacity = "";
          customBtn.style.cursor = "";
          customBtn.style.pointerEvents = "";
          customBtn.style.removeProperty("--hover-opacity");
        }
      }
    });
  }

  setInitialGameState();

  // Observe the default buttons container for changes (after initialization)
  const defaultButtonsContainer = document.getElementById("poker-buttons");
  if (defaultButtonsContainer) {
    const buttonObserver = new MutationObserver(function () {
      mirrorDefaultButtons();
    });

    buttonObserver.observe(defaultButtonsContainer, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["hidden", "disabled", "style"],
    });
  }
})();
