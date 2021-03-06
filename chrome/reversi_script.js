/**
 * Code made by David Campos Rodríguez
 * All rights reserved
 */

/**
 * Global game board
 * @type {null}
 */
// Global variables
var glob_board=null;
var glob_turn = 1;
var glob_ended = true;
var glob_initialTurn = glob_turn;
var glob_players = null;

const AI_PLAYERS_DELAY = 0;
const DELAY_BETWEEN_AI_GAMES = 0;

var HumanPlayer = function () {
};

// On page loaded
// Generate board, starting chips and update displayed info.
window.onload = function () {
	document.getElementById("pass").addEventListener("click", function () {
		makeMove(null);
	});
	document.getElementById("restart").addEventListener("click", function () {
		newGame();
	});

	if (window.location.hash) {
		var hashParts = window.location.hash.replace(/[^a-z\-]/i, "").split("-");
		if (hashParts.length == 2) {
			glob_players = [null, null].map(function (val, i) {
				if ("human".startsWith(hashParts[i].toLowerCase()))
					return new HumanPlayer();
				else
					return new AI(i);
			});
		}
	}

	if (!glob_players)
		glob_players = [new HumanPlayer(), new HumanPlayer()];

    newGame();
};

/**
 * Prepares a new game
 */
function newGame() {
	generateBoard();
	generateStartingChips();

	// Change the turn
	glob_turn = 1 - glob_initialTurn;
	glob_initialTurn = glob_turn;

	// Generate only one tree, to save space
	if (glob_players[0] instanceof AI)
		glob_players[0].init(glob_board, glob_turn, getDataChip);
	if (glob_players[1] instanceof AI) {
		if (glob_players[0] instanceof AI) {
			glob_players[1].initFromTree(glob_players[0].getTree());
		} else {
			glob_players[1].init(glob_board, glob_turn, getDataChip);
		}
	}

	glob_ended = false;

	updateInfo();
	if (glob_players[glob_turn] instanceof AI)
		setTimeout(askAiToMove, AI_PLAYERS_DELAY);
}

/**
 * Function to handle when the player click's a td.
 * Get's the flanked positions and turns them.
 * @param event the generated event
 */
function tdClicked(event) {
	if (glob_players[glob_turn] instanceof HumanPlayer)
        makeMove(event.target);
}

/**
 * If the turn is AI's turn, it will ask the AI for its movement
 */
function askAiToMove() {
	var coords = glob_players[glob_turn].play();
	if (coords !== null) {
		makeMove(glob_board[coords[0]][coords[1]]);
	} else {
		makeMove(null);
	}

}

/**
 * Makes the next movement on the indicated td
 * @param td the td that will be turned (or null to pass)
 */
function makeMove(td) {
    var move = null;
    if (td !== null) {
        move = [parseInt(td.getAttribute("data-i")), parseInt(td.getAttribute("data-j"))];
        var fP = getFlankedPositions(td.getAttribute("data-i"), td.getAttribute("data-j"), glob_turn);
        fP.forEach(function (turned) {
            if (turned) {
                turned.setAttribute("data-chip", "p" + glob_turn);
                turned.setAttribute("class", "");
            }
        });
    }
    if (td === null || fP.length > 0) {
		movementMade(move);
		if (isGameEnded()) {
			glob_ended = true;
			showWhoWins();
			// If both of them are AI, restart the game
			if (glob_players[0] instanceof AI && glob_players[1] instanceof AI)
				setTimeout(newGame, DELAY_BETWEEN_AI_GAMES);
		} else {
			// If the game haven't ended and is AI's turn, make it play
			if (glob_players[glob_turn] instanceof AI)
				setTimeout(askAiToMove, AI_PLAYERS_DELAY);
		}
		// Update game info
		updateInfo();
    }
}

/**
 * Checks if the game has ended
 * @returns {boolean}
 */
function isGameEnded() {
	return !(canMove(0) || canMove(1));
}

/**
 * Changes the turn
 * @param lastMove {int[]} coords of the last movement (to notify AIs)
 */
function movementMade(lastMove) {
	if (!lastMove) lastMove = null;

	glob_turn = 1 - glob_turn;
	// Notify AIs of the movement
	for (var i = 0; i < glob_players.length; i++)
		if (glob_players[i] instanceof AI)
			glob_players[i].notifyMovement(lastMove, glob_turn);
}

/**
 * Shows who have won
 */
function showWhoWins() {
	var chips = countChips();
	var text;
	if (chips[0] > chips[1]) {
		text = "White player wins!";
	} else if (chips[1] > chips[0]) {
		text = "Black player wins!";
	} else {
		text = "Draw :(";
	}

	// Notify AIs of the end
	var allAi = true;
	for (var i = 0; i < glob_players.length; i++)
		if (glob_players[i] instanceof AI)
			glob_players[i].end();
		else
			allAi = false;

	if (allAi)
		console.log(text);
	else
		alert(text);

}

/**
 * Generates the game board in #content
 */
function generateBoard() {
	var content = document.getElementById("content");
	while (content.firstChild) {
		content.removeChild(content.firstChild);
	}
	var table = document.createElement("table");
	glob_board = [];
	for (var i = 0; i < 8; i += 1) {
		var tr = document.createElement("tr");
		glob_board[i] = [];
		for (var j = 0; j < 8; j += 1) {
			var td = document.createElement("td");
			td.setAttribute("data-chip", "p-1");
			td.setAttribute("data-i", i);
			td.setAttribute("data-j", j);
			td.addEventListener("click", tdClicked);
			td.addEventListener("mouseenter", tdEntered);
			td.addEventListener("mouseleave", tdLeft);
			glob_board[i].push(td);
			tr.appendChild(td);
		}
		table.appendChild(tr);
	}
	content.appendChild(table);
}

/**
 * Get's the flanked positions if the player "player" places
 * a chip in the position (i, j).
 * @param i {int,String} component i of the position
 * @param j {int,String} component j of the position
 * @param player {int,String} player that places the chip, 0 or 1
 * @returns {Array}
 */
function getFlankedPositions(i, j, player) {
	if(typeof(i) === "string") i = parseInt(i);
	if(typeof(j) === "string") j = parseInt(j);
	if(typeof(player) === "string") player = parseInt(player);
	if( glob_board ) {
		// Only empty ones!
		if( getDataChip(glob_board[i][j]) < 0) {
			// We get the flanked lines in the 8 directions
			return getFlankedLine(i, j, +1, +1, player).concat(
				   getFlankedLine(i, j, +1, -1, player)).concat(
				   getFlankedLine(i, j, -1, +1, player)).concat(
				   getFlankedLine(i, j, -1, -1, player)).concat(
				   getFlankedLine(i, j,  0, +1, player)).concat(
				   getFlankedLine(i, j,  0, -1, player)).concat(
				   getFlankedLine(i, j, +1,  0, player)).concat(
				   getFlankedLine(i, j, -1,  0, player));
		} else
			return [];
	} else
		return null;
}

/**
 * Recursive function that get's all the td's in a line
 * starting in (i, j) and advancing (di, dj) that the player player
 * would flank.
 * @param i {int} component i of the position
 * @param j {int} component j of the position
 * @param di {int} component di of the advance
 * @param dj {int} component dj of the advance
 * @param player {int} player who has the turn
 * @returns {Array}
 */
function getFlankedLine(i, j, di, dj, player) {
	// Can we advance?
	if( exists(i+di, j+dj) ) {
		var nextDataChip = getDataChip(glob_board[i+di][j+dj]);
		
		if( nextDataChip < 0 ) {
			// We got to an empty square, return nothing
			return [];
			
		} else if(nextDataChip == player) {
			// Next is the last, return this if this is not empty
			// (this is made to avoid to return only the start)
			if( getDataChip(glob_board[i][j]) < 0 )
				return [];
			else 
				return [glob_board[i][j]];
		
		} else {
			// This is not the last, return this and next if next is not empty!
			var rest = getFlankedLine(i+di, j+dj, di, dj, player);
			if(rest.length > 0)
				return [glob_board[i][j]].concat(rest);
			else
				return [];
		}
	} else
		// We got the end of the board, return nothing
		return [];
}

/**
 * Checks if the player has legal moves available
 * @param player {int} the player to check the moves (0 or 1)
 * @returns {boolean}
 */
function canMove(player) {
	for(var i=0; i<8; i++) 
		for(var j=0; j<8; j++) {
			if( getDataChip(glob_board[i][j]) < 0 )
				if( getFlankedPositions(i, j, player).length > 0 )
					return true;
		}
	return false;
}

/**
 * Counts the chips on the board and returns an array with the number
 * of chips of each player
 * @returns {Array}
 */
function countChips() {
	var p0Chips=0, p1Chips=0;
	var chip;
	for(var i=0; i<8; i++)
		for(var j=0; j<8; j++) {
			chip = getDataChip(glob_board[i][j]);
			if( chip == 0 )
				p0Chips++;
			else if( chip == 1)
				p1Chips++;
		}
	return [p0Chips, p1Chips];
}

/**
 * Updates the information displayed about the game
 */
function updateInfo() {
	// Update the turn
	document.getElementById("turn").setAttribute("class", "p"+glob_turn);

	if (glob_ended || canMove(glob_turn))
		document.getElementById("pass").setAttribute("disabled", "true");
	else
		document.getElementById("pass").removeAttribute("disabled");
	
	var chips = countChips();
	document.getElementById("whiteChips").innerHTML = ""+chips[0];
	document.getElementById("blackChips").innerHTML = ""+chips[1];
}

/**
 * Checks if the square (i, j) isValidSquare
 * @returns {boolean}
 */
function exists(i, j) {
	return i >= 0 && i < 8 && j >= 0 && j < 8;
}

/**
 * Get's the data about the chip (attribute data-chip) from
 * the indicated td.
 * @param td The table td to check.
 * @returns {int}
 */
function getDataChip(td) {
	return parseInt(td.getAttribute("data-chip").substring(1));
}

/**
 * Generates the starting chips for the game.
 */
function generateStartingChips() {
	if (glob_board) {
		glob_board[3][3].setAttribute("data-chip", "p0");
		glob_board[4][4].setAttribute("data-chip", "p0");
		glob_board[3][4].setAttribute("data-chip", "p1");
		glob_board[4][3].setAttribute("data-chip", "p1");
	}
}

/**
 * Function to handle when the mouse enters a td
 * @param event the generated event
 */
function tdEntered(event) {
	if (document.getElementById("showMovePrediction").checked && glob_players[glob_turn] instanceof HumanPlayer) {
		var td = event.target;
		var fP = getFlankedPositions(td.getAttribute("data-i"), td.getAttribute("data-j"), glob_turn);
		fP.forEach(function (turned) {
			if (turned) {
				turned.setAttribute("class", "toTurn");
			}
		});
	}
}

/**
 * Function to handle when the mouse leaves a td
 * @param event the generated event
 */
function tdLeft(event) {
	var td = event.target;
	var fP = getFlankedPositions(td.getAttribute("data-i"), td.getAttribute("data-j"), glob_turn);
	fP.forEach(function (turned) {
		if (turned) {
			turned.setAttribute("class", "");
		}
	});
}