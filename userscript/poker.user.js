// ==UserScript==
// @name         WPD Poker Enhancement
// @author       @UnbelievableBro
// @namespace    http://tampermonkey.net/
// @copyright    CC0
// @version      1.2.4
// @description  https://www.tampermonkey.net/documentation.php
// @icon         https://watchpeopledie.tv/icon.webp
// @grant        none
// @match        https://watchpeopledie.tv/casino/poker/*
// @run-at       document-idle
// @downloadURL  https://raw.githubusercontent.com/adastra1826/wpd-poker/main/userscript/poker.user.js
// @updateURL    https://raw.githubusercontent.com/adastra1826/wpd-poker/main/userscript/poker.user.js
// ==/UserScript==

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
    });

    observer.observe(targetElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state"],
    });
  }

  function setInitialGameState() {
    // Delete useless Wikipedia link
    document.getElementById("poker-help-icon").remove();
    console.log("Removed poker help icon/Wikipedia link");
    hideDefaultButtons();
    createCustomButtonsDiv();
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
    parentDiv.style.display = "flex";
    parentDiv.style.flexDirection = "column";
    parentDiv.style.gap = "10px";
    parentDiv.innerHTML = "TEST";

    console.log("Custom buttons div created");
  }

  setInitialGameState();
})();
