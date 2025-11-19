// ==UserScript==
// @name         WPD Poker Enhancement
// @author       @UnbelievableBro
// @namespace    http://tampermonkey.net/
// @copyright    CC0
// @version      1.2.0
// @description  https://www.tampermonkey.net/documentation.php
// @icon         https://watchpeopledie.tv/icon.webp
// @grant        unsafeWindow
// @match        https://watchpeopledie.tv/casino/poker/*
// @run-at       document-idle
// @downloadURL  https://raw.githubusercontent.com/adastra1826/wpd-poker/main/userscript/poker.user.js
// @updateURL    https://raw.githubusercontent.com/adastra1826/wpd-poker/main/userscript/poker.user.js
// ==/UserScript==

(function () {
  "use strict";

  function getGameState() {
    return document.getElementById("poker-table").getAttribute("data-state");
  }

  function parseGameState() {
    const gameState = getGameState();
    const gameStateObj = JSON.parse(gameState);
    console.log(gameStateObj);
  }

  const observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (mutation.target.id === "orgy-top-container") {
        parseGameState();
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  function setInitialGameState() {
    // Delete useless Wikipedia link
    document.getElementById("poker-help-icon").remove();
    console.log("Removed poker help icon/Wikipedia link");
    unhideButtons();

  }

  function unhideButtons() {
    document.getElementById("poker-buttons").removeAttribute("hidden");
    console.log("Unhidden poker buttons");
  }

  setInitialGameState();
})();
