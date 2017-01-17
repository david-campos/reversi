// Global variables
var glob_board=null;
var glob_turn = 0;

// On page loaded
// Generate board, starting chips and update displayed info.
window.onload = function(event) {
	document.getElementById("pass").addEventListener("click", passTurn);

	generateBoard();
	generateStartingChips();
	updateInfo();
};

/**
 * Generates the game board in #content
 */
function generateBoard() {
	var content = document.getElementById("content");
	var table = document.createElement("table");
	glob_board = [];
	for(var i=0; i<8; i+=1) {
		var tr = document.createElement("tr");
		glob_board[i] = [];
		for(var j=0; j<8; j+=1) {
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
 * Generates the starting chips for the game.
 */
function generateStartingChips() {
	if( glob_board ) {
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
	if(document.getElementById("showMovePrediction").checked) {
		var td = event.target;
		var fP = getFlankedPositions(td.getAttribute("data-i"), td.getAttribute("data-j"), glob_turn);
		fP.forEach(function(turned) {
			if(turned) {
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
	fP.forEach(function(turned) {
		if(turned) {
			turned.setAttribute("class", "");
		}
	});
}

/**
 * Function to handle when the player click's a td.
 * Get's the flanked positions and turns them.
 * @param event the generated event
 */
function tdClicked(event) {
	var td = event.target;
	var fP = getFlankedPositions(td.getAttribute("data-i"), td.getAttribute("data-j"), glob_turn);
	fP.forEach(function(turned) {
		if(turned) {
			turned.setAttribute("data-chip", "p"+glob_turn);
			turned.setAttribute("class", "");	
		}
	});
	if(fP.length > 0) {
		passTurn();
		checkEnd();
	}
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
 * @param payer {int} player who has the turn
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
 * @returns {bool}
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
 * Passes the turn
 */
function passTurn() {
	glob_turn = 1 - glob_turn;
	updateInfo();
}

/**
 * Checks if the game is ended (nobody can move)
 */
function checkEnd() {
	if(!canMove(1) && !canMove(0))
		showWhoWins();
}

/**
 * Shows who have won
 */
function showWhoWins() {
	var chips = countChips();	
	if( chips[0] > chips[1])
		alert("White player wins!");
	else if( chips[1] > chips[0])
		alert("Black player wins!");
	else
		alert("Draw :(");
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
	
	if(canMove(glob_turn))
		document.getElementById("pass").setAttribute("disabled", "true");
	else
		document.getElementById("pass").removeAttribute("disabled");
	
	var chips = countChips();
	document.getElementById("whiteChips").innerHTML = ""+chips[0];
	document.getElementById("blackChips").innerHTML = ""+chips[1];
}

/**
 * Checks if the square (i, j) exists
 * @returns {bool}
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
