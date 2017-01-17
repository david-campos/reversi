// Requires reversi_script.js

/**
 * General tree node constructor
 */
var TreeNode = function(matrix, turn, emptySquares) {
    this.matrix = matrix;
	this.turn = turn;
	this.emptySquares = emptySquares;
	
	this.qualityEstimation = 0.0;
	
    this.children = {};
};

/**
 * AI constructor
 */
var AI = function(aiPlayerNumber) {
	this._player = aiPlayerNumber;
	this._tree = null;
};

AI.prototype = {
	init: function(game_board, turn) {
		var data = [];
		var empty = [];
		for(var i=0; i<game_board.length; i++) {
			var line= [];
			for(var j=0; j<game_board[i].length; j++) {
				var dataChip = getDataChip(game_board[i][j]);
				if(dataChip < 0) empty.push([i,j]);
				line.push(dataChip);
			}
			data.push(line);
		}
		this._tree = new TreeNode(data, turn, empty);
	},
	
	createPossibleChildsFor: function(node) {
		for(var k=0; k < node.emptySquares.length; k++) {
			var flanked = this.getFlankedPositions(
				node, node.emptySquares[k][0], node.emptySquares[k][1], node.turn);
			if(flanked.length === 0) continue;
			
			// Copy the matrix
			var newMatrix = [];
			for(var i=0; i < node.matrix.length; i++)
				newMatrix.push(node.matrix[i].slice());
			
			// Turn flanked to the player
			for(var m=0; m < flanked.length; m++)
				newMatrix[flanked[m][0], flanked[m][1]] = node.turn;
			
			// Copy empty squares without new move
			var newEmpty = [];
			for(var m=0; m < node.emptySquares.length; m++)
				if(m!=k)
					newEmpty.push(node.emptySquares[m]);
			
			var step = node.emptySquares[k][0] + ',' + node.emptySquares[k][1];
			node.children[step] = new TreeNode(newMatrix, 1-node.turn, newEmpty);
		}
	},
	
	getFlankedPositions: function(node, i, j, player) {
		// We get the flanked lines in the 8 directions
		return this.getFlankedLine(node, i, j, +1, +1, player).concat(
			   this.getFlankedLine(node, i, j, +1, -1, player)).concat(
			   this.getFlankedLine(node, i, j, -1, +1, player)).concat(
			   this.getFlankedLine(node, i, j, -1, -1, player)).concat(
			   this.getFlankedLine(node, i, j,  0, +1, player)).concat(
			   this.getFlankedLine(node, i, j,  0, -1, player)).concat(
			   this.getFlankedLine(node, i, j, +1,  0, player)).concat(
			   this.getFlankedLine(node, i, j, -1,  0, player));
	},
	
	getFlankedLine: function(node, i, j, di, dj, player) {
		var line = [];
		while( exists(i+di, j+dj) ) {
			var square = node.matrix[i+di][j+dj];
			if( square < 0) {
				// We got to an empty square, return nothing
				return [];
			} else {
				line.push([i,j]);
				
				// Next is the last
				if(square == player)
					if(line.length > 1)
						return line;
					else
						return [];
			}
			
			i+=di; j+=dj;
		}
		// We got to the end of the table, return nothing
		return [];
	}
};