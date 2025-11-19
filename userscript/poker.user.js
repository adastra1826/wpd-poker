// ==UserScript==
// @name         WPD Poker Enhancement
// @author       @UnbelievableBro
// @namespace    http://tampermonkey.net/
// @copyright    CC0
// @version      1.1.3
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

    // test
    unsafeWindow._wpd_auto.check();
    console.log("Checked");
  }

  // Inject unsafeWindow script
  window.addEventListener("DOMContentLoaded", () => {
    const s = document.createElement("script");
    // v1
    /*
    s.textContent = `
        window._wpd_auto = {
            test: () => console.log("Test OK"),
            check: () => check(),
            call: () => call(),
            fold: () => fold(),
            raiseTo: (amt) => {
                document.querySelector("#raise-amount").value = amt;
                raise();
            },
            start: () => startGame(),
            ready: () => ready(true)
        };

        console.log("Injected non-sandboxed script for proxy function calling");
    `;
    */
    // v2
    s.textContent = `
        Object.defineProperty(window, "_wpd_auto", {
            value: {
                test: () => console.log("Test OK"),
                check: () => check(),
                call: () => call(),
                fold: () => fold(),
                raiseTo: (amt) => {
                    document.querySelector("#raise-amount").value = amt;
                    raise();
                },
                start: () => startGame(),
                ready: () => ready(true)
            },
            writable: false,
            configurable: false,
            enumerable: false
        });

        console.log("Injected non-sandboxed script for proxy function calling");
    `;

    document.documentElement.appendChild(s);
  })();

  setInitialGameState();
})();
