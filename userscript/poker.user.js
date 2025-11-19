// ==UserScript==
// @name         WPD Poker Enhancement
// @author       @UnbelievableBro
// @namespace    http://tampermonkey.net/
// @copyright    CC0
// @version      1.0.1
// @description  https://www.tampermonkey.net/documentation.php
// @icon         https://watchpeopledie.tv/icon.webp
// @grant        none
// @require
// @include      *
// @match        https://watchpeopledie.tv/casino/poker/*
// @run-at       document-idle
// @downloadURL  https://raw.githubusercontent.com/adastra1826/wpd-poker/main/userscript/poker.user.js
// @updateURL    https://raw.githubusercontent.com/adastra1826/wpd-poker/main/userscript/poker.user.js
// ==/UserScript==

(function() {
    'use strict';

    function getGameState() {
        return document.getElementById("poker-table").getAttribute("data-state");
    }

    function parseGameState() {
        const gameState = getGameState();
        const gameStateObj = JSON.parse(gameState);
        console.log(gameState);
    }

    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.target.id === "orgy-top-container") {
                parseGameState();
            }
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });
})();