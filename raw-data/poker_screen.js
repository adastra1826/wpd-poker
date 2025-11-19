const h = maquette.h;
const projector = maquette.createProjector();

function chips(amount) {
	return h("span.chips", [commas(amount)]);
}

let muted_poker_music = localStorage.getItem("muted_poker_music")
let muted_poker_sfx = localStorage.getItem("muted_poker_sfx")
if (muted_poker_music == 'True') {
	toggle_music_btn.children[0].className = 'fas fa-music-slash text-danger'
}
if (muted_poker_sfx == 'True') {
	toggle_sfx_btn.children[0].className = 'fas fa-volume-slash text-danger'
}

function toggle_music(t) {
	if (muted_poker_music == 'True') {
		muted_poker_music = 'False' /* has to be above play_poker_music() */
		play_poker_music()
		t.children[0].className = 'fas fa-music text-muted'
	}
	else {
		muted_poker_music = 'True' 
		poker_music.pause()
		t.children[0].className = 'fas fa-music-slash text-danger'
	}
	localStorage.setItem("muted_poker_music", muted_poker_music)
}
toggle_music_btn.onclick = () => {toggle_music(toggle_music_btn)}

function toggle_sfx(t) {
	if (muted_poker_sfx == 'True') {
		t.children[0].className = 'fas fa-volume text-muted'
		muted_poker_sfx = 'False' 
	}
	else {
		t.children[0].className = 'fas fa-volume-slash text-danger'
		muted_poker_sfx = 'True' 
	}
	localStorage.setItem("muted_poker_sfx", muted_poker_sfx)
}
toggle_sfx_btn.onclick = () => {toggle_sfx(toggle_sfx_btn)}

function playPokerSound(soundName, volume=1) {
	if (muted_poker_sfx != 'True') {
		const audio = new Audio(`/assets/sound_effects/poker/${soundName}.mp3`);
		audio.volume = volume;
		audio.play();
	}
}

class MoveTimer {
	constructor() {
		this._endTime = 0;

		let interval = null;
		this.resetInterval = () => {
			clearInterval(interval);
			interval = setInterval(() => {
				if (this.secondsLeft >= 0) {
					projector.scheduleRender();
				}
			}, 1000);
		};
	}
	get secondsLeft() {
		return Math.floor(this.endTime - (Date.now()/1000));
	}
	get endTime() {
		return this._endTime;
	}
	set endTime(value) {
		this._endTime = value;
		this.resetInterval();
	}
	render() {
		return h("span", [Math.max(0, this.secondsLeft).toString()]);
	}
};
function setRaiseAmount(e, amount) {
	$('#raise-preset-buttons > button.selected').removeClass('selected');

	if (e.target) //fix raise bar
		e.target.classList.add('selected')

	amount = (amount instanceof HTMLInputElement) ? amount.valueAsNumber : amount;
	$("#raise-slider").val(amount);
	$("#raise-amount").val(amount);
}
function createRaiseMenu() {
	let hidden = true;
	return {
		setHidden: (value) => {
			hidden = value;
			projector.scheduleRender();
		},
		render: (getUniqueKey) => {
			const cannotRaise = gameState.actions.indexOf("raise") === -1;
			if (cannotRaise) {
				hidden = true;
			}
			return h("div#raise-menu", {"hidden": hidden}, [
				h("input#raise-slider", {type: "range", min: gameState.min_raise, max: gameState.max_raise, value: gameState.min_raise, on: {input: (event) => setRaiseAmount(event, event.target)}}, []),
				h("div#raise-preset-buttons",
					[
						{name: "Min", amount: gameState.min_raise},
						{name: "1/4 Pot", amount: Math.floor(gameState.pot_raise / 4)},
						{name: "1/2 Pot", amount: Math.floor(gameState.pot_raise / 2)},
						{name: "3/4 Pot", amount: Math.floor(gameState.pot_raise * 3 / 4)},
						{name: "Pot", amount: gameState.pot_raise},
						{name: gameState.max_raise_is_all_in ? "All In" : "Max", amount: gameState.max_raise}
					].map(preset => h("button.btn.btn-primary", {key: getUniqueKey(), disabled: gameState.min_raise > preset.amount || preset.amount > gameState.max_raise, on: {click: (e) => setRaiseAmount(e, preset.amount)}}, [
						`${preset.name} (`, chips(preset.amount), ")"
					]))
				),
				h("input#raise-amount.form-control.d-inline", {type: "number", min: gameState.min_raise, max: gameState.max_raise, value: gameState.min_raise, step: 1, autocomplete: "off", placeholder: "Chips", "data-default": gameState.min_raise, required: true}, []),
				h("button#raise-button.btn.btn-primary", {on: {click: disableAndRun(raise)}}, ["Raise"])
			]);
		}
	}
}
function visible(value) {
	return value ? ".visible" : ".invisible";
}
function isHost(player_id = gameState.id) {
	return player_id === gameState.host;
}

function onStateUpdate(oldState, newState) {
	if (!oldState.in_game && newState.in_game) {
		playPokerSound("startofhand");
	} else if (oldState.in_game && !newState.in_game) {
		playPokerSound("endofhand");
	} else if (oldState.moving_player !== newState.moving_player
			&& newState.moving_player !== null
			&& newState.moving_player === newState.id) {
		playPokerSound("yourturn", 0.4);
	}
}
function renderAction(action) {
	switch (action.type) {
	case "fold": return ["Fold"];
	case "post": return ["Post bring-in"];
	case "check": return ["Check"];
	case "call": return ["Call"];
	case "raise": return ["Raise to ", chips(action.amount)];
	case "allin": return ["All-in"];
	default: return ["[unknown move]"];
	}
}

var gameState = null;
const moveTimer = new MoveTimer();
const raiseMenu = createRaiseMenu();

const pokerSocketManager = new io.Manager(window.location.origin, {
	query: {id: $("#poker_id").val()},
	path: '/socket.io_poker',
});
const pokerSocket = pokerSocketManager.socket("/casino/poker");
addEventListener("DOMContentLoaded", () => {
	pokerSocket.connect();
});
const saveSettingsButton = document.getElementById("saveSettings");
saveSettingsButton.onclick = () => {
	saveSettingsButton.disabled = true;
	saveSettingsButton.classList.add("disabled");
	const settings = roomSettingsMenu.settings;
	postToast(saveSettingsButton, `/casino/poker/${$("#poker_id").val()}/settings`, {"settings": JSON.stringify(settings)}, (xhr) => {
		// Save settings to localStorage for next time
		localStorage.setItem("pokerRoomLastSettings", JSON.stringify(settings));
	});
};
pokerSocket.on("settings_changed", (value) => { roomSettingsMenu.settings = value; });
$("#wagerCoins, #wagerMarseybux").on("click", (event) => {
	event.preventDefault();
	pokerSocket.once("currency_changed", () => {
		gameState.currency = event.target.value;
		event.target.checked = true;
		localStorage.setItem("savedRoomCurrency", event.target.value);
	});
	pokerSocket.emit("currency", event.target.value);
});


function disableAndRun(func, ...args) {
	return (event) => {
		event.target.disabled = true;
		func(...args, event);
		setTimeout(() => {
			event.target.disabled = false;
		}, 500);
	}
}
function sit(event) {
	pokerSocket.emit("sit", event.target.dataset.seat);
};
function startGame() {
	pokerSocket.emit("move", {
		type: "startgame"
	});
};
function cancelStart() {
	pokerSocket.emit("move", {
		type: "cancelstart"
	});
}
function ready(value) {
	pokerSocket.emit("move", {
		type: value ? "ready" : "unready"
	});
}
function post() {
	pokerSocket.emit("move", {
		type: "post"
	});
}
function check() {
	raiseMenu.setHidden(true);
	pokerSocket.emit("move", {
		type: "check"
	});
};
function call() {
	raiseMenu.setHidden(true);
	pokerSocket.emit("move", {
		type: "call"
	});
};
function raise() {
	raiseMenu.setHidden(true);
	pokerSocket.emit("move", {
		type: "raise",
		amount: $("#raise-amount")[0].valueAsNumber
	});
}
function showRaiseMenu() {
	raiseMenu.setHidden(false);
	$('#raise-preset-buttons > button.selected').removeClass('selected');
	$('#raise-preset-buttons > button').first().addClass('selected');
}
function fold() {
	raiseMenu.setHidden(true);
	pokerSocket.emit("move", {
		type: "fold"
	});
};
function kick(id) {
	pokerSocket.emit("move", {
		type: "kick",
		kicked_player: id
	});
}
function giveHost(id) {
	pokerSocket.emit("move", {
		type: "givehost",
		new_host: id
	});
}
function leave() {
	pokerSocket.emit("move", {
		type: "leave"
	});
}
function showHand() {
	pokerSocket.emit("move", {
		type: "showhand"
	});
}

function render() {
	let uniqueKey = 0;
	function getUniqueKey() {
		return uniqueKey++;
	}

	function makePlayingCard(rank, suit, isDim) {
		const dimClass = isDim ? ".dim" : "";
		if (rank === '?' || suit === '?') {
			return h(`div.playing-card.playing-card-face-down${dimClass}`, {key: getUniqueKey()}, []);
		}
		if (rank === 'T') {
			rank = '10';
		}
		let color = (suit === 'h' || suit === 'd') ? "red" : "black";
		suit = {'h': '♥️', 'd': '♦️', 'c': '♣️', 's': '♠️'}[suit];
		return h(`div.playing-card.playing-card_${color}${dimClass}`, {key: getUniqueKey()}, [
			h("div.playing-card_large", {key: getUniqueKey()}, [`${rank}`]),
			h("div.playing-card_large", {key: getUniqueKey()}, [`${suit}`])
		]);
	}

	$("#currencySelect").attr("hidden", !("currency" in gameState));
	$("#wagerCoins").prop("checked", gameState.currency === "coins");
	$("#wagerMarseybux").prop("checked", gameState.currency === "marseybux");
	if ("coins" in gameState) {
		$("#user-coins-amount-casino").text(gameState.coins.toLocaleString());
	}
	if ("marseybux" in gameState) {
		$("#user-bux-amount-casino").text(gameState.marseybux.toLocaleString());
	}

	return h("div#poker-room", [
		h("div#poker-buttons", [
			h(`button#poker-POST.btn.btn-primary.poker-btn`, {on: {click: disableAndRun(post)}, hidden: gameState.actions.indexOf("post") === -1}, [
				"Post Bring-in (", chips(gameState.post_amount || 0), ")"
			]),
			(
				(gameState.actions.indexOf("call") !== -1)
				? h(`button#poker-CALL.btn.btn-primary.poker-btn`, {on: {click: disableAndRun(call)}}, [
					"Call (", chips(gameState.call_amount), ")"
				])
				: h(`button#poker-CHECK.btn.btn-primary.poker-btn`, {on: {click: disableAndRun(check)}, hidden: gameState.actions.indexOf("check") === -1}, ["Check"])
			),
			h(`button#poker-RAISE.btn.btn-primary.poker-btn`, {on: {click: showRaiseMenu}, hidden: gameState.actions.indexOf("raise") === -1}, ["Raise"]),
			h(`button#poker-FOLD.btn.btn-primary.poker-btn`, {on: {click: disableAndRun(fold)}, hidden: gameState.actions.indexOf("fold") === -1}, ["Fold"]),
			(
				("next_hand_time" in gameState)
				? h(`button#poker-CANCEL.btn.btn-primary.poker-btn.btn-danger`, {on: {click: disableAndRun(cancelStart)}, hidden: gameState.actions.indexOf("cancelstart") === -1}, ["Cancel"])
				: h(`button#poker-STARTGAME.btn.btn-primary.poker-btn`, {on: {click: disableAndRun(startGame)}, hidden: gameState.actions.indexOf("startgame") === -1}, ["Start Game"])
			),
			(
				(gameState.actions.indexOf("ready") !== -1)
				? h(`button#poker-READY.btn.btn-primary.poker-btn`, {on: {click: disableAndRun(ready, true)}}, ["Ready"])
				: h(`button#poker-UNREADY.btn.btn-primary.poker-btn`, {on: {click: disableAndRun(ready, false)}, hidden: gameState.actions.indexOf("unready") === -1}, ["Unready"])
			),
			h(`button#poker-SHOWHAND.btn.btn-primary.poker-btn`, {on: {click: disableAndRun(showHand)}, hidden: gameState.actions.indexOf("showhand") === -1}, ["Show Hand"]),
			h(`button#poker-LEAVE.btn.btn-primary.poker-btn.btn-danger`, {on: {click: disableAndRun(leave)}, hidden: gameState.actions.indexOf("leave") === -1}, ["Leave"]),
		]),
		raiseMenu.render(getUniqueKey),
		h("div#poker-table", {"data-state": JSON.stringify(gameState)}, [
			h("div#poker-table-center", [
				(("next_hand_time" in gameState)
					? h("div#move-timer.mb-2", ["Next hand starts in ", moveTimer.render(), " seconds"])
					: (gameState.in_game ? h("div#move-timer.mb-2", [moveTimer.render()]) : null)
				),
				(("host_switch_time" in gameState && !("next_hand_time" in gameState))
					? h("div#switch-host-timer.mb-2", [
						"Host will switch to ", h("strong", [gameState.host_switch_new_host_username]), " in ",
						h("span", [Math.max(0, Math.floor(gameState.host_switch_time - (Date.now()/1000))).toString()]), " seconds"
					])
					: null
				),
				h("div#poker-board", {hidden: gameState.board.length === 0},
					gameState.board.map((card,index) => makePlayingCard(card[0], card[1], gameState.board_dimmed[index]))
				),
				h("div#pots", [
					h("div.pot#pot-total", [chips(gameState.pot_total)]),
					(gameState.pots.length >= 2
						? h("div.pot#player-pots", gameState.pots.reduce((acc, pot) => {
							return acc.concat(chips(pot), ", ");
						}, []).slice(0, -1))
						: []
					)
				]),
			]),
			h("div#poker-players", {on: {click: hideChatIfMobile}},
				[...Array(12).keys()].map(seatNumber => {
					const player = gameState.players[seatNumber.toString()];
					let containerClass = `div.poker-player.seat-${seatNumber}`;
					if (player !== undefined) {
						if (player.result !== null) {
							containerClass = containerClass.concat(`.poker-player__${player.result.toUpperCase()}`);
							if (player.show_hand) {
								containerClass = containerClass.concat(".show_hand");
							}
						}
						if (gameState.moving_player === player.id) {
							containerClass = containerClass.concat(".poker-player-moving");
						}
						if (gameState.dealer === player.id) {
							containerClass = containerClass.concat(".dealer");
						}
					} else {
						const canSit = gameState.actions.indexOf("sit") !== -1;
						if (canSit && pokerSocket.active) {
							return h(`${containerClass}.empty-seat`, [
								h(`button.poker-SIT.btn.btn-primary.poker-btn`, {on: {click: disableAndRun(sit)}, "data-seat": seatNumber.toString()}, ["Sit"])
							]);
						} else {
							return null;
						}
					}
					let handContents = [""];
					let handClass = null;
					if (player.best_hand !== null) {
						handClass = "HAND";
						handContents = [player.best_hand];
					}

					let moveContents = [""];
					let moveClass = null;
					if (player.result !== null) {
						moveClass = "NOMOVE";
						moveContents = [""];
					} else {
						if (player.action !== null) {
							// POST, CHECK, CALL, RAISE, ALLIN, FOLD
							moveClass = player.action.type.toUpperCase();
							moveContents = renderAction(player.action);
						} else {
							moveClass = "NOMOVE";
							moveContents = [""];
						}
					}
					return h(containerClass, [
						h("div.poker-player-info", [
							h("a.poker-player-name.font-weight-bold", {target: "_blank", style: `color: #${player.namecolor}`, href: `/@${player.username}`}, [
								(
									isHost(player.id)
								  ? h("i.ml-1.fas.fa-crown", {style: "color: gold;"})
								  : (gameState.in_game ? null : h(`i.ml-1.fas${player.ready ? ".fa-check" : ".fa-x"}`, {style: `color: ${player.ready ? "#0f0" : "#f00"};`}))
								),
								h("div.avatar.ml-1.profile-pic-20-wrapper", [
									h("img", {loading: "lazy", src: `/pp/${player.user_id}`}, []),
									(!!player.hat ? h("img.profile-pic-20-hat.hat", {loading: "lazy", src: player.hat}, []) : null)
								]),
								h(`span.ml-1${player.patron ? ".patron" : ""}`, {style: player.patron ? `background-color: #${player.namecolor};` : null, pride_username: player.pride_username ? "" : null}, [player.username]),
								h(`i.poker-player-online.ml-1.${((player.id === gameState.id) ? pokerSocket.active : player.online) ? "text-success" : "text-danger"}.fas.fa-circle`, [])
							]),
							h("div.poker-player-money", [chips(player.chips)]),
							h("div.poker-player-blind", {hidden: player.blind === null}, (player.blind !== 0 ? ["Blind: ", chips(player.blind)] : ["No Blind"])),
							((player.result !== null && player.payoff !== null) ? h("div.poker-player-payoff", [`${player.payoff < 0 ? "-" : "+"}`, chips(Math.abs(player.payoff))]) : null)
						]),
						h("div.moving-marker", []),
						h(`div.poker-player-hand${player.cards.length >= 4 ? ".smaller-cards" : ""}`,
							player.cards.map((card, index) => makePlayingCard(card[0], card[1], player.dimmed[index]))
							.concat(h("div.poker-player-buttons", [
								((gameState.actions.indexOf("kick") !== -1 && player.id !== gameState.id) ? h("button.btn.btn-primary.poker-player-kick", {disabled: gameState.in_game, on: {click: disableAndRun(kick, player.id)}}, ["Kick"]) : null),
								((gameState.actions.indexOf("givehost") !== -1 && player.id !== gameState.id) ? h("button.btn.btn-primary.poker-player-givehost", {on: {click: disableAndRun(giveHost, player.id)}}, ["Give Host"]) : null)
							]))
						),
						h(`div.poker-player-move.poker-player-move__${handClass}`, handContents),
						h(`div.poker-player-move.poker-player-move__${moveClass}`, moveContents)
					]);
				})
			),
		]),
		h("img#allin-image", {src: `${SITE_FULL_IMAGES}/i/allin.webp`}, []), //don't add lazy, makes it shit for bad-internet-cels
	]);
}

addEventListener("DOMContentLoaded", () => {
	const table = document.getElementById("poker-room");
	gameState = JSON.parse(table.dataset.state);
	moveTimer.endTime = ("next_hand_time" in gameState) ? gameState.next_hand_time : gameState.move_timer;
	projector.replace(table, render);
});

pokerSocket.on("state", (state) => {
	onStateUpdate(gameState, state);
	gameState = state;
	moveTimer.endTime = ("next_hand_time" in gameState) ? gameState.next_hand_time : gameState.move_timer;
	projector.scheduleRender();
	// Update host switch timer every second if it exists
	if ("host_switch_time" in gameState) {
		const updateTimer = () => {
			if ("host_switch_time" in gameState && gameState.host_switch_time > Date.now()/1000) {
				projector.scheduleRender();
				setTimeout(updateTimer, 1000);
			}
		};
		setTimeout(updateTimer, 1000);
	}
});

function showAllInImage() {
	const allin_image = document.getElementById("allin-image");
	// Force reflow to ensure initial opacity: 0 is applied
	allin_image.offsetHeight;

	// Show the image with fade in
	allin_image.classList.add("show");

	// Hide after 1.5 seconds (fade out handled by CSS transition)
	setTimeout(() => {
		allin_image.classList.remove("show");
	}, 1000);
}

pokerSocket.on("move", (moveType) => {
	switch (moveType) {
	case "check": {
		playPokerSound("check", 0.3);
		break;
	}
	case "post":
	case "call":
	case "raise": {
		playPokerSound("call");
		break;
	}
	case "allin": {
		playPokerSound("allin");
		showAllInImage();
		break;
	}
	case "fold": {
		playPokerSound("fold");
		break;
	}
	}
});

pokerSocket.on('error', (message) => {
	showToast(false, message);
});

pokerSocket.on("connect", () => {
	projector.scheduleRender();
});

pokerSocket.on("connect_error", (error) => {
	// show the offline indicator for this player
	projector.scheduleRender();
	if (!pokerSocket.active) {
		console.error(error.message);
		pokerSocket.connect();
	}
});

pokerSocket.on('disconnect', (reason, details) => {
	if (reason === "io server disconnect") {
		if (location.pathname.startsWith("/casino/poker/")) {
			showToast(false, "Room has been deleted, redirecting to room list...");
			location.pathname = "/casino/poker";
		} else {
			$("#poker-room").html('<div style="width:100%;display:flex;justify-content:center;align-items:center;min-height:100px;">Poker room not found</div>');
		}
	} else {
		console.log(reason);
		projector.scheduleRender();
	}
});

pokerSocket.on('sat', () => {
	playPokerSound("sat");
});


// POKER MUSIC
// handle_playing_music(poker_music); // This line breaks the playlist
prepare_to_pause(poker_music);

pokerSocket.on('music', (track, start_time) => {
	poker_music.src = `/assets/poker_music/${track}`;
	poker_music.dataset.start_time = start_time;
	play_poker_music();
})

function play_poker_music() {
	if (muted_poker_music == 'True' || playing_music())
		return

	const now = Date.now() / 1000;
	poker_music.currentTime = now - poker_music.dataset.start_time;
	poker_music.play()
}

if (muted_poker_music != 'True' && poker_music.src.endsWith('.mp3') && poker_music.paused) {
	play_poker_music()

	// user click fallback
	document.addEventListener('click', () => {
		if (poker_music.paused)
			play_poker_music()
	}, {once: true});
}

// Mobile Poker Chat Toggle Functionality (I didn't review the following AI code, take that as you will)
(function() {
	let chatElement, toggleButton, messageCountBadge;
	let isChatVisible = false;
	let unreadMessageCount = 0;
	let lastMessageIds = new Set();
	let toggleChat, updateMessageCountBadge;

	// Update message count badge
	updateMessageCountBadge = function() {
		if (messageCountBadge) {
			if (unreadMessageCount > 0) {
				messageCountBadge.textContent = unreadMessageCount > 99 ? '99+' : unreadMessageCount.toString();
				messageCountBadge.classList.remove('d-none');
			} else {
				messageCountBadge.classList.add('d-none');
			}
		}
	};

	// Toggle chat visibility
	toggleChat = function() {
		if (!chatElement || !toggleButton) return;

		isChatVisible = !isChatVisible;

		if (isChatVisible) {
			chatElement.classList.remove('chat-hidden');
			chatElement.classList.add('chat-visible');
			toggleButton.classList.add('chat-open');
			// Reset message count when opening chat
			unreadMessageCount = 0;
			lastMessageIds.clear();
			updateMessageCountBadge();
		} else {
			chatElement.classList.remove('chat-visible');
			chatElement.classList.add('chat-hidden');
			toggleButton.classList.remove('chat-open');
		}
	};

	hideChatIfMobile = function() {
		if (isChatVisible)
			toggleChat()
	};

	function initMobileChat() {
		// Only run on mobile
		if (window.innerWidth > 767) {
			// Desktop: ensure chat is visible
			const el = document.getElementById('poker-chat');
			if (el) {
				el.classList.remove('chat-hidden', 'chat-visible');
				el.style.position = '';
				el.style.transform = '';
			}
			return;
		}

		chatElement = document.getElementById('poker-chat');
		toggleButton = document.getElementById('poker-chat-toggle-btn');
		messageCountBadge = document.getElementById('poker-chat-message-count');

		if (!chatElement || !toggleButton) {
			console.warn('Poker chat toggle: Elements not found', {chatElement: !!chatElement, toggleButton: !!toggleButton});
			return;
		}

		// Initialize chat as hidden on mobile
		chatElement.classList.add('chat-hidden');
		toggleButton.classList.remove('chat-open');
		isChatVisible = false;

		// Handle button click
		toggleButton.onclick = function(e) {
			e.stopPropagation();
			toggleChat();
		};

		// Close chat when clicking outside (on the overlay)
		chatElement.addEventListener('click', function(e) {
			// Only close if clicking on the chat container itself, not its children
			if (e.target === chatElement) {
				toggleChat();
			}
		});

		// Prevent chat from closing when clicking inside chat content
		const chatContent = chatElement.querySelector('#chat');
		if (chatContent) {
			chatContent.addEventListener('click', function(e) {
				e.stopPropagation();
			});
		}

		// Track new messages when chat is closed
		// Try to hook into socket.on('spoken') first, fallback to MutationObserver
		if (typeof socket !== 'undefined' && socket && typeof socket.on === 'function') {
			// Listen to the same 'spoken' event that chat.js uses
			socket.on('spoken', function(json) {
				// Only count messages when chat is closed
				if (!isChatVisible && json && json.id) {
					const messageId = json.id.toString();
					if (!lastMessageIds.has(messageId)) {
						lastMessageIds.add(messageId);
						unreadMessageCount++;
						updateMessageCountBadge();
					}
				}
			});
		} else {
			// Fallback: Hook into DOM changes if socket is not available
			const chatWindow = chatElement.querySelector('#chat-window');
			if (chatWindow) {
				const observer = new MutationObserver(function(mutations) {
					if (!isChatVisible && chatWindow.children.length > 0) {
						// Get the last chat group
						const lastGroup = chatWindow.lastElementChild;
						if (lastGroup) {
							const lastLine = lastGroup.querySelector('.chat-line:last-child');
							if (lastLine && lastLine.id) {
								const messageId = lastLine.id;
								if (!lastMessageIds.has(messageId)) {
									lastMessageIds.add(messageId);
									unreadMessageCount++;
									updateMessageCountBadge();
								}
							}
						}
					}
				});

				observer.observe(chatWindow, {
					childList: true,
					subtree: true
				});
			}
		}

		// Wrap onStateUpdate to check for turn changes
		// Wait for onStateUpdate to be defined first
		const wrapOnStateUpdate = function() {
			if (typeof onStateUpdate === 'undefined') {
				// Try again after a short delay
				setTimeout(wrapOnStateUpdate, 100);
				return;
			}

			const originalOnStateUpdate = onStateUpdate;

			// Wrap onStateUpdate to check for turn changes
			window.onStateUpdate = function(oldState, newState) {
				// Call original function first
				if (originalOnStateUpdate && typeof originalOnStateUpdate === 'function') {
					originalOnStateUpdate(oldState, newState);
				}

				// Check if it just became the user's turn
				if (oldState && newState && oldState.moving_player && oldState.id && newState.moving_player && newState.id) {
					const wasUserTurn = oldState.moving_player === oldState.id;
					const isNowUserTurn = newState.moving_player === newState.id;

					// If it just became the user's turn and chat is visible, close it
					if (!wasUserTurn && isNowUserTurn && isChatVisible) {
						setTimeout(toggleChat, 100); // Small delay to ensure smooth transition
					}
				}
			};
		};
		wrapOnStateUpdate();

		// Hook into poker socket state updates by wrapping the existing handler
		// This will be called after the existing pokerSocket.on('state') handler
		if (typeof pokerSocket !== 'undefined' && pokerSocket) {
			// Use a small delay to ensure this runs after the main handler updates gameState
			pokerSocket.on('state', function(state) {
				// Use setTimeout to check after gameState is updated
				setTimeout(function() {
					if (typeof gameState !== 'undefined' && gameState && gameState.moving_player && gameState.id && gameState.moving_player === gameState.id && isChatVisible) {
						toggleChat();
					}
				}, 50);
			});
		}

		// Handle window resize to show/hide button appropriately
		let resizeTimer;
		window.addEventListener('resize', function() {
			clearTimeout(resizeTimer);
			resizeTimer = setTimeout(function() {
				if (window.innerWidth > 767) {
					// Desktop: show chat normally, hide button
					chatElement.classList.remove('chat-hidden', 'chat-visible');
					chatElement.style.position = '';
					chatElement.style.transform = '';
					isChatVisible = true;
				} else {
					// Mobile: hide chat, show button
					if (!isChatVisible) {
						chatElement.classList.add('chat-hidden');
						chatElement.classList.remove('chat-visible');
					}
				}
			}, 250);
		});

		// Initialize on page load
		updateMessageCountBadge();
	}

	// Start initialization - needs to be there twice for some reason
	initMobileChat();
	initMobileChat();

	if (window.innerWidth <= 767) {
		document.addEventListener('click', function() {
			const elem = document.documentElement; // fullscreen the entire page
			if (elem.requestFullscreen) {
				elem.requestFullscreen();
			} else if (elem.webkitRequestFullscreen) { // Safari
				elem.webkitRequestFullscreen();
			}
		})
	}
})();


const savedRoomCurrency = localStorage.getItem("savedRoomCurrency");
if (savedRoomCurrency) {
	const currencyRadio = document.querySelector(`[name="wagerCurrency"][value="${savedRoomCurrency}"]`);
	currencyRadio.click();
}

