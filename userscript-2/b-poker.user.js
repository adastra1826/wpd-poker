// ==UserScript==
// @name         [B POKER]
// @author       You
// @namespace    http://tampermonkey.net/
// @copyright    CC0
// @version      1.4.0
// @description  https://www.tampermonkey.net/documentation.php
// @icon         https://watchpeopledie.tv/icon.webp
// @grant        none
// @match        https://watchpeopledie.tv/casino/poker/*
// @run-at       document-idle
// @downloadURL  https://raw.githubusercontent.com/adastra1826/wpd-poker/main/userscript-2/a-poker.user.js
// @updateURL    https://raw.githubusercontent.com/adastra1826/wpd-poker/main/userscript-2/a-poker.user.js
// ==/UserScript==

(function () {
  "use strict";

  // ==========================================================================
  // CONFIGURATION & CONSTANTS
  // ==========================================================================

  const BUTTON_WIDTH = "140px"; // Fixed width for consistent button sizing

  // Button rows configuration
  const BUTTON_ROWS = [
    // Row 1: Game management
    [
      ["Start Game", "poker-STARTGAME", { type: "standard" }],
      ["Cancel", "poker-CANCEL", { type: "standard" }],
      ["Ready", "poker-READY", { type: "toggle", toggleIds: ["poker-READY", "poker-UNREADY"], toggleLabels: ["Ready", "Unready"] }],
      ["Leave", "poker-LEAVE", { type: "standard" }],
    ],
    // Row 2: Core actions (with auto-action swapping)
    [
      ["Check", "poker-CHECK", { type: "swappable", swapTo: "autoCheckFold", label: "Check", autoLabel: "Auto Check/Fold" }],
      ["Call", "poker-CALL", { type: "swappable", swapTo: "autoCall", label: "Call", autoLabel: "Auto Call" }],
      ["Raise", "poker-RAISE", { type: "swappable", swapTo: "autoBet", label: "Raise", autoLabel: "Auto Bet" }],
      ["Fold", "poker-FOLD", { type: "swappable", swapTo: "autoMuck", label: "Fold", autoLabel: "Auto Muck", showHandOverride: true }],
    ],
  ];

  const STYLES = `
    .poker-btn {
      min-width: ${BUTTON_WIDTH} !important;
      width: ${BUTTON_WIDTH} !important;
      text-align: center !important;
      box-sizing: border-box !important;
    }
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
    .poker-btn[data-toggled="true"] {
      border: 2px solid #17a2b8 !important;
      box-shadow: 0 0 8px rgba(23, 162, 184, 0.6) !important;
    }
    .poker-btn:hover:not([data-disabled="true"]) {
      border: 2px solid #17a2b8 !important;
      box-shadow: 0 0 8px rgba(23, 162, 184, 0.6) !important;
    }
    .poker-player-stats {
      font-size: 0.85em;
      line-height: 1.4;
      margin-top: 2px;
    }
    .poker-player-stats .stat-label {
      color: #aaa;
    }
    .poker-player-stats .stat-positive {
      color: #4caf50;
    }
    .poker-player-stats .stat-negative {
      color: #f44336;
    }
    .poker-player-stats .stat-neutral {
      color: #fff;
    }
  `;

  // ==========================================================================
  // STATE
  // ==========================================================================

  const state = {
    currentUserId: null,
    gameState: null,
    previousGameState: null,
    isInitialized: false,
    playerStats: {},
    wasInGame: false,
    lastProcessedHandTime: null,
    // Player turn tracking
    isMyTurn: false,
    hasFolded: false,
    isActiveInHand: false,
    // Pre-action toggles (only one can be active at a time)
    preActions: {
      autoCheckFold: false,
      autoCall: false,
      autoBet: false,
      autoMuck: false,
    },
    // Track if we've already scheduled a pre-action execution
    preActionTimeout: null,
    // Track previous turn state to detect turn changes
    wasMyTurn: false,
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
    get helpIcon() {
      return document.getElementById("poker-help-icon");
    },
    get playersContainer() {
      return document.getElementById("poker-players");
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
      return JSON.parse(gameStateRaw);
    } catch (e) {
      console.error("Failed to parse game state:", e);
      return null;
    }
  }

  function updateTurnTracking() {
    const gameState = state.gameState;
    if (!gameState) {
      state.isMyTurn = false;
      state.hasFolded = false;
      state.isActiveInHand = false;
      return;
    }

    const userId = parseInt(state.currentUserId);
    const isInGame = gameState.in_game === true;

    // Check if it's our turn
    state.isMyTurn = gameState.moving_player === userId;

    // Find our player data
    let myPlayer = null;
    for (const [seat, player] of Object.entries(gameState.players || {})) {
      if (player.user_id === userId) {
        myPlayer = player;
        break;
      }
    }

    if (myPlayer && isInGame) {
      // Check if we've folded
      state.hasFolded = myPlayer.action?.type === "fold" || myPlayer.result === "LOST";
      // We're active if in game and haven't folded
      state.isActiveInHand = !state.hasFolded;
    } else {
      state.hasFolded = false;
      state.isActiveInHand = false;
    }

    // Detect when it BECOMES our turn (transition from not our turn to our turn)
    const turnJustStarted = state.isMyTurn && !state.wasMyTurn;
    
    if (turnJustStarted && hasActivePreAction()) {
      console.log("Turn just started with active pre-action, scheduling execution in 0.5s");
      
      // Clear any existing timeout
      if (state.preActionTimeout) {
        clearTimeout(state.preActionTimeout);
      }
      
      // Schedule pre-action execution with 0.5s delay
      state.preActionTimeout = setTimeout(() => {
        executePreActions();
        state.preActionTimeout = null;
      }, 500);
    }
    
    // Update previous turn state
    state.wasMyTurn = state.isMyTurn;

    console.log(`Turn tracking - isMyTurn: ${state.isMyTurn}, hasFolded: ${state.hasFolded}, isActiveInHand: ${state.isActiveInHand}`);
  }
  
  function hasActivePreAction() {
    return state.preActions.autoCheckFold || 
           state.preActions.autoCall || 
           state.preActions.autoBet || 
           state.preActions.autoMuck;
  }

  function executePreActions() {
    console.log("Executing pre-actions...");
    let actionTaken = false;
    
    // Auto Check/Fold: Check if possible, otherwise fold
    if (state.preActions.autoCheckFold) {
      const checkBtn = document.getElementById("poker-CHECK");
      const foldBtn = document.getElementById("poker-FOLD");
      
      if (isOriginalButtonActive("poker-CHECK")) {
        console.log("Auto Check/Fold: Checking");
        checkBtn.click();
        actionTaken = true;
      } else if (isOriginalButtonActive("poker-FOLD")) {
        console.log("Auto Check/Fold: Folding (check not available)");
        foldBtn.click();
        actionTaken = true;
      }
      state.preActions.autoCheckFold = false;
    }
    
    // Auto Call: Only call if there's something to call (don't auto-check)
    if (state.preActions.autoCall) {
      if (isOriginalButtonActive("poker-CALL")) {
        console.log("Auto Call: Calling");
        document.getElementById("poker-CALL").click();
        actionTaken = true;
      } else {
        // Nothing to call - return control to player (don't auto-check)
        console.log("Auto Call: Nothing to call, returning control to player");
      }
      state.preActions.autoCall = false;
    }
    
    // Auto Bet: Toggle only (placeholder - no action implementation)
    if (state.preActions.autoBet) {
      console.log("Auto Bet: No implementation yet, returning control to player");
      state.preActions.autoBet = false;
    }
    
    // Auto Muck: Fold no matter what
    if (state.preActions.autoMuck) {
      if (isOriginalButtonActive("poker-FOLD")) {
        console.log("Auto Muck: Folding");
        document.getElementById("poker-FOLD").click();
        actionTaken = true;
      }
      state.preActions.autoMuck = false;
    }
    
    // Update button states after executing
    syncButtonStates();
    
    return actionTaken;
  }

  // ==========================================================================
  // PLAYER STATS TRACKING
  // ==========================================================================

  function initializePlayerStats(playerId) {
    if (!state.playerStats[playerId]) {
      state.playerStats[playerId] = {
        sessionOffset: 0,
        handInvestment: 0,
        lastKnownChips: null,
      };
    }
  }

  function updatePlayerStats() {
    const gameState = state.gameState;
    if (!gameState || !gameState.players) return;

    const isInGame = gameState.in_game === true;
    const wasInGame = state.wasInGame;
    const newHandStarted = isInGame && !wasInGame;
    const handResultsPresent = !isInGame && Object.values(gameState.players).some(p => p.result);
    const currentHandIdentifier = gameState.next_hand_time || gameState.move_timer;

    if (handResultsPresent && currentHandIdentifier && currentHandIdentifier !== state.lastProcessedHandTime) {
      console.log("Processing hand results for hand:", currentHandIdentifier);
      for (const [seat, player] of Object.entries(gameState.players)) {
        const playerId = player.user_id;
        initializePlayerStats(playerId);
        const stats = state.playerStats[playerId];
        if (player.payoff !== undefined && player.payoff !== 0) {
          console.log(`Player ${player.username} (${playerId}) - Result: ${player.result}, Payoff: ${player.payoff}`);
          stats.sessionOffset += player.payoff;
          stats.handInvestment = 0;
        }
      }
      state.lastProcessedHandTime = currentHandIdentifier;
      
      // Reset pre-actions at hand end
      resetPreActions();
    }

    for (const [seat, player] of Object.entries(gameState.players)) {
      const playerId = player.user_id;
      initializePlayerStats(playerId);
      const stats = state.playerStats[playerId];

      if (newHandStarted) {
        stats.handInvestment = 0;
        stats.lastKnownChips = player.chips;
        // Reset pre-actions at hand start
        resetPreActions();
      }

      if (isInGame && player.payoff !== undefined && !player.result) {
        stats.handInvestment = Math.abs(Math.min(0, player.payoff));
      }

      if (stats.lastKnownChips === null) {
        stats.lastKnownChips = player.chips;
      }
    }

    state.wasInGame = isInGame;
  }

  function resetPreActions() {
    state.preActions.autoCheckFold = false;
    state.preActions.autoCall = false;
    state.preActions.autoBet = false;
    state.preActions.autoMuck = false;
  }

  function formatStatValue(value) {
    if (value > 0) return { text: `+${value}`, className: "stat-positive" };
    if (value < 0) return { text: `${value}`, className: "stat-negative" };
    return { text: "0", className: "stat-neutral" };
  }

  function updatePlayerStatsUI() {
    const gameState = state.gameState;
    if (!gameState || !gameState.players) return;

    const playersContainer = DOM.playersContainer;
    if (!playersContainer) return;

    for (const [seat, player] of Object.entries(gameState.players)) {
      const playerId = player.user_id;
      const stats = state.playerStats[playerId];
      if (!stats) continue;

      const seatElement = playersContainer.querySelector(`.poker-player.seat-${seat}`);
      if (!seatElement) continue;

      const playerInfoDiv = seatElement.querySelector(".poker-player-info");
      if (!playerInfoDiv) continue;

      let statsContainer = seatElement.querySelector(".poker-player-stats-container");
      if (!statsContainer) {
        statsContainer = document.createElement("div");
        statsContainer.className = "poker-player-stats-container";
        statsContainer.style.cssText = `
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 2px;
          margin-top: 4px;
          padding: 6px 8px 8px 8px;
        `;
        playerInfoDiv.insertAdjacentElement("afterend", statsContainer);
      }

      const handInvestment = stats.handInvestment;
      const sessionStat = formatStatValue(stats.sessionOffset);
      
      const newContent = `
        <div class="poker-player-money" style="text-align: right;">
          <span class="stat-label" style="color: #aaa; margin-right: 4px;">Hand:</span>
          <span class="chips">${handInvestment}</span>
        </div>
        <div class="poker-player-money" style="text-align: right;">
          <span class="stat-label" style="color: #aaa; margin-right: 4px;">Game:</span>
          <span class="chips ${sessionStat.className}">${sessionStat.text}</span>
        </div>
      `;
      
      if (statsContainer.innerHTML !== newContent) {
        statsContainer.innerHTML = newContent;
      }
    }
  }

  // ==========================================================================
  // UI FUNCTIONS
  // ==========================================================================

  function injectStyles() {
    const style = document.createElement("style");
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  function removeHelpIcon() {
    const helpIcon = DOM.helpIcon;
    if (helpIcon) helpIcon.remove();
  }

  function hideDefaultButtons() {
    const defaultButtons = DOM.defaultButtonsContainer;
    if (defaultButtons) defaultButtons.style.display = "none";
  }

  function isOriginalButtonActive(buttonId) {
    const btn = document.getElementById(buttonId);
    if (!btn) return false;
    return !btn.hasAttribute("hidden") && !btn.disabled && btn.style.display !== "none";
  }

  function createCustomButtonsDiv() {
    if (DOM.customButtonsContainer) return;

    const defaultButtons = DOM.defaultButtonsContainer;
    if (!defaultButtons) return;

    const parentDiv = defaultButtons.parentElement;
    const customButtonsDiv = document.createElement("div");
    customButtonsDiv.id = "custom-poker-buttons";

    parentDiv.insertBefore(customButtonsDiv, defaultButtons);

    Object.assign(customButtonsDiv.style, {
      display: "flex",
      flexDirection: "column",
      gap: "0.5em",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      padding: "0.5em",
    });

    BUTTON_ROWS.forEach((row) => {
      const rowDiv = document.createElement("div");
      rowDiv.className = "poker-btn-row";
      Object.assign(rowDiv.style, {
        display: "flex",
        flexDirection: "row",
        gap: "0.25em",
        alignItems: "center",
        justifyContent: "center",
        flexWrap: "wrap",
      });

      row.forEach(([text, originalId, options]) => {
        const button = document.createElement("button");
        button.textContent = text;
        button.className = "btn btn-primary poker-btn";
        button.setAttribute("data-button-type", options.type);
        button.setAttribute("data-default-label", text);

        if (options.type === "standard") {
          button.setAttribute("data-original-id", originalId);
        } else if (options.type === "toggle") {
          button.setAttribute("data-toggle-ids", JSON.stringify(options.toggleIds));
          button.setAttribute("data-toggle-labels", JSON.stringify(options.toggleLabels));
          button.setAttribute("data-original-id", options.toggleIds[0]);
        } else if (options.type === "swappable") {
          button.setAttribute("data-original-id", originalId);
          button.setAttribute("data-swap-to", options.swapTo);
          button.setAttribute("data-label", options.label);
          button.setAttribute("data-auto-label", options.autoLabel);
          if (options.showHandOverride) {
            button.setAttribute("data-showhand-override", "true");
          }
        }

        // Hover logging
        button.addEventListener("mouseenter", function (e) {
          console.log("Button hover:", button.textContent, "Type:", button.getAttribute("data-button-type"), "Mode:", button.getAttribute("data-mode"), "Disabled:", button.hasAttribute("data-disabled"), "Toggled:", button.hasAttribute("data-toggled"));
        });

        button.addEventListener("click", function (e) {
          console.log("Button clicked:", button.textContent, "Type:", button.getAttribute("data-button-type"), "Mode:", button.getAttribute("data-mode"));
          
          if (button.hasAttribute("data-disabled")) {
            console.log("Button is disabled, ignoring click");
            e.preventDefault();
            e.stopPropagation();
            return false;
          }

          const btnType = button.getAttribute("data-button-type");
          const currentMode = button.getAttribute("data-mode");

          if (btnType === "swappable" && currentMode === "auto") {
            // Toggle the pre-action (only one can be active at a time)
            const swapTo = button.getAttribute("data-swap-to");
            const wasActive = state.preActions[swapTo];
            
            console.log("Toggling pre-action:", swapTo, "Was active:", wasActive);
            
            // Clear all pre-actions first
            resetPreActions();
            
            // Toggle: if it was active, it's now off; if it was off, turn it on
            if (!wasActive) {
              state.preActions[swapTo] = true;
              console.log("Pre-action enabled:", swapTo);
            } else {
              console.log("Pre-action disabled:", swapTo);
            }
            
            console.log("Current preActions state:", JSON.stringify(state.preActions));
            syncButtonStates();
            return;
          }

          const currentOriginalId = button.getAttribute("data-original-id");
          if (currentOriginalId) {
            console.log("Clicking original button:", currentOriginalId);
            const originalButton = document.getElementById(currentOriginalId);
            if (originalButton) originalButton.click();
          }
        });

        rowDiv.appendChild(button);
      });

      customButtonsDiv.appendChild(rowDiv);
    });

    console.log("Custom buttons div created");
  }

  function syncButtonStates() {
    const customButtons = DOM.customButtonsContainer;
    if (!customButtons) return;

    const customBtns = customButtons.querySelectorAll("button[data-button-type]");

    customBtns.forEach((customBtn) => {
      const buttonType = customBtn.getAttribute("data-button-type");

      if (buttonType === "toggle") {
        syncToggleButton(customBtn);
      } else if (buttonType === "standard") {
        syncStandardButton(customBtn);
      } else if (buttonType === "swappable") {
        syncSwappableButton(customBtn);
      }
    });
  }

  function syncToggleButton(customBtn) {
    const toggleIds = JSON.parse(customBtn.getAttribute("data-toggle-ids") || "[]");
    const toggleLabels = JSON.parse(customBtn.getAttribute("data-toggle-labels") || "[]");

    let activeId = null;
    let activeLabel = null;

    for (let i = 0; i < toggleIds.length; i++) {
      if (isOriginalButtonActive(toggleIds[i])) {
        activeId = toggleIds[i];
        activeLabel = toggleLabels[i];
        break;
      }
    }

    if (activeId) {
      customBtn.setAttribute("data-original-id", activeId);
      customBtn.textContent = activeLabel;
      enableButton(customBtn);
    } else {
      disableButton(customBtn);
    }
  }

  function syncStandardButton(customBtn) {
    const originalId = customBtn.getAttribute("data-original-id");
    if (isOriginalButtonActive(originalId)) {
      enableButton(customBtn);
    } else {
      disableButton(customBtn);
    }
  }

  function syncSwappableButton(customBtn) {
    const originalId = customBtn.getAttribute("data-original-id");
    const swapTo = customBtn.getAttribute("data-swap-to");
    const label = customBtn.getAttribute("data-label");
    const autoLabel = customBtn.getAttribute("data-auto-label");
    const hasShowHandOverride = customBtn.hasAttribute("data-showhand-override");

    // Check for Show Hand override (for the Fold slot)
    if (hasShowHandOverride && isOriginalButtonActive("poker-SHOWHAND")) {
      customBtn.textContent = "Show Hand";
      customBtn.setAttribute("data-original-id", "poker-SHOWHAND");
      customBtn.setAttribute("data-mode", "standard");
      customBtn.removeAttribute("data-toggled");
      enableButton(customBtn);
      return;
    }

    // If original button is active (it's our turn for this action)
    if (isOriginalButtonActive(originalId)) {
      customBtn.textContent = label;
      customBtn.setAttribute("data-original-id", originalId);
      customBtn.setAttribute("data-mode", "standard");
      customBtn.removeAttribute("data-toggled");
      enableButton(customBtn);
      return;
    }

    // If we're active in hand but not our turn, show auto option
    if (state.isActiveInHand && !state.isMyTurn && state.gameState?.in_game) {
      customBtn.textContent = autoLabel;
      customBtn.setAttribute("data-mode", "auto");
      
      // Show toggle state
      if (state.preActions[swapTo]) {
        customBtn.setAttribute("data-toggled", "true");
      } else {
        customBtn.removeAttribute("data-toggled");
      }
      
      enableButton(customBtn);
      return;
    }

    // Otherwise disable
    customBtn.textContent = label;
    customBtn.setAttribute("data-mode", "standard");
    customBtn.removeAttribute("data-toggled");
    disableButton(customBtn);
  }

  function enableButton(btn) {
    btn.removeAttribute("data-disabled");
    // Only remove style if not toggled
    if (!btn.hasAttribute("data-toggled")) {
      btn.removeAttribute("style");
    }
    btn.className = "btn btn-primary poker-btn";
  }

  function disableButton(btn) {
    btn.setAttribute("data-disabled", "true");
    btn.removeAttribute("data-toggled");
    Object.assign(btn.style, {
      opacity: "0.5",
      cursor: "not-allowed",
      pointerEvents: "none",
    });
  }

  // ==========================================================================
  // CORE UPDATE FUNCTION
  // ==========================================================================

  function onStateChange() {
    state.previousGameState = state.gameState;
    state.gameState = parseGameState();

    updateTurnTracking();
    updatePlayerStats();
    syncButtonStates();
    updatePlayerStatsUI();
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  function initialize() {
    if (state.isInitialized) return;

    console.log("Initializing poker userscript...");

    state.currentUserId = DOM.currentUserId;
    console.log("Current user ID:", state.currentUserId);

    injectStyles();
    removeHelpIcon();
    hideDefaultButtons();
    createCustomButtonsDiv();
    onStateChange();

    state.isInitialized = true;
    console.log("Initialization complete");
  }

  // ==========================================================================
  // OBSERVERS
  // ==========================================================================

  function setupObservers() {
    const pokerTable = DOM.pokerTable;
    if (pokerTable) {
      const mainObserver = new MutationObserver(function (mutations) {
        const hasDataStateChange = mutations.some(m => 
          m.type === 'attributes' && m.attributeName === 'data-state'
        );
        if (!hasDataStateChange) return;
        if (!state.isInitialized) initialize();
        onStateChange();
      });

      mainObserver.observe(pokerTable, {
        attributes: true,
        attributeFilter: ["data-state"],
      });
    }

    const defaultButtonsContainer = DOM.defaultButtonsContainer;
    if (defaultButtonsContainer) {
      const buttonObserver = new MutationObserver(() => syncButtonStates());
      buttonObserver.observe(defaultButtonsContainer, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["hidden", "disabled", "style"],
      });
    }
  }

  // ==========================================================================
  // ENTRY POINT
  // ==========================================================================

  function main() {
    setupObservers();
    initialize();
  }

  main();
})();