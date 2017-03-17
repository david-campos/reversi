/**
 * Code made by David Campos Rodríguez
 * All rights reserved
 */

// Remember this code requires neural_network.js

/**
 * Global Neural Network bank
 * @type {NNBank}
 */
var glob_networkBank = new NNBank();

/**
 * General tree node constructor
 */
var TreeNode = function(matrix, turn, emptySquares) {
    this.matrix = matrix;
	this.turn = turn;
	this.emptySquares = emptySquares;

	this.confidence = 0.0;
	
    this.children = {};
	this.childrenGenerated = false;
};

/**
 * AI constructor
 * @param aiPlayerNumber {int} number of player for this AI so it can identify itself in the data received
 * @param [neuralNetwork] {NN} fixed neural network for the AI (if set, the AI won't use the NNBank)
 * @constructor
 */
var AI = function (aiPlayerNumber, neuralNetwork) {
	this._player = aiPlayerNumber;
	this._tree = null;
	if (neuralNetwork) {
		this.neuralNetwork = neuralNetwork;
		this._useBank = false;
	} else {
		// Get a new neural network to work with
		this.neuralNetwork = glob_networkBank.getNN();
		this._useBank = true;
	}
};

AI.prototype = {
	/**
	 * Init the AI from a previous created tree
	 * @param tree {TreeNode} the previous created tree
	 */
	initFromTree: function (tree) {
		this._tree = tree;
	},
	/**
	 * Init the AI tree from a game_board with the help of an arbitrary parser
	 * @param game_board {[[]]} initial state of the game board for the tree
	 * @param turn {int} initial turn for the tree
	 * @param parser {function} parser to get the information from the board,
	 * should return the number of the player that owes each cell or -1 if it
	 * is empty.
	 */
	init: function (game_board, turn, parser) {
		var data = [];
		var empty = [];
		for(var i=0; i<game_board.length; i++) {
			var line= [];
			for(var j=0; j<game_board[i].length; j++) {
				var dataChip = parser(game_board[i][j]);
				if(dataChip < 0) empty.push([i,j]);
				line.push(dataChip);
			}
			data.push(line);
		}
		this._tree = new TreeNode(data, turn, empty);
		this.createChildren(this._tree);
	},
	/**
	 * Gets the current TreeNode of this AI
	 * @returns {TreeNode}
	 */
	getTree: function () {
		return this._tree;
	},
	/**
	 * Asks the neural network bank for a new network. It has no effect
	 * if the AI has a fixed neural network
	 */
	getNewNN: function () {
		// Get a new neural network to work with
		if (this._useBank)
			this.neuralNetwork = glob_networkBank.getNN();
	},
	/**
	 * Notifies the AI a movement have been done, or the turn has been passed
	 * @param movement {int[]|null} the movement done, or null if the player just passed the turn
	 * @param [newTurn] {int} the new turn, only necessary if the player passed the turn
	 */
	notifyMovement: function (movement, newTurn) {
		if (movement !== null) {
			this.createChildren(this._tree);
			var step = movement.join(',');
			this._tree = this._tree.children[step];
		} else {
			// If movement is null it means the other player passed the turn
			this._tree.turn = newTurn;
			this._tree.children = {};
			this._tree.childrenGenerated = false;
		}
	},

	/**
	 * Called by the reversi script to ask this AI for a new movement
	 * @returns {int[]|null}
	 */
	play: function () {
		// It's our turn, generate next possible movements from here
		if (!this._tree.childrenGenerated)
			this.createChildren(this._tree);

		var child, bestChild = null;
		var bestMove = null;
		var topConfidence = -2; // indicate a initial topConfidence under the minimum
		for (var step in this._tree.children) {
			if (this._tree.children.hasOwnProperty(step)) {
				child = this._tree.children[step];

				// Calculate confidence for the node
				var codifiedBoard = this._codifyForNN(this._tree.children[step].matrix);
				child.confidence = this.neuralNetwork.getOutputs(codifiedBoard)[0];

				if (child.confidence > topConfidence) {
					bestChild = child;
					bestMove = step.split(",").map((x)=>parseInt(x));
					topConfidence = child.confidence;
				}
			}
		}
		// Generate children for the step we chose
		if (bestChild)
			this.createChildren(bestChild);
		// Play the one with more confidence
		return bestMove;
	},

	/**
	 * Codifies for the Neural Network input game matrix of one TreeNode
	 * @param matrix {[[int]]}
	 * @returns {int[]}
	 * @private
	 */
	_codifyForNN: function (matrix) {
		var codified = [];
		for (var i = 0; i < matrix.length; i++) {
			for (var j = 0; j < matrix[i].length; j++) {
				// The central square is irrelevant (it is always the same)
				if ((i == 3 || i == 4) && (j == 3 || j == 4))
					continue;

				if (matrix[i][j] === this._player)
					codified.push(0);
				else if (matrix[i][j] === -1)
					codified.push(-1);
				else
					codified.push(1);
			}
		}
		return codified;
	},

	/**
	 * Called when the game ends, causes the AI to evaluate his current NN
	 * @param [chipCount] {{0:int,1:int,empty:int}} chip count for each player and empty ones
	 */
	end: function (chipCount) {
		var myChips = 0, hisChips = 0, emptyOnes = 0;
		if (!chipCount) {
			for (var i = 0; i < this._tree.matrix.length; i++) {
				for (var j = 0; j < this._tree.matrix[i].length; j++) {
					if (this._tree.matrix[i][j] === this._player) {
						myChips++;
					} else if (this._tree.matrix[i][j] === -1) {
						emptyOnes++;
					} else {
						hisChips++;
					}
				}
			}
		} else {
			myChips = chipCount[this._player];
			hisChips = chipCount[1 - this._player];
			emptyOnes = chipCount.empty;
		}
		var fitness = (myChips + emptyOnes) / (myChips + hisChips + emptyOnes);
		this.neuralNetwork.setFitness(this.neuralNetwork.getFitness() + fitness);

		if (myChips <= hisChips) {
			// I've lost or got to draw, take another NN
			this.getNewNN();
		}
	},

	/**
	 * Creates the children nodes of a tree node
	 * @param node {TreeNode}
	 */
	createChildren: function (node) {
		if (!node || node.childrenGenerated) return;
		node.emptySquares.forEach(function (emptySquare, i) {
			// Is this a valid movement?
			var flanked = this.getFlankedPositions(
				node, emptySquare[0], emptySquare[1], node.turn);
			if (flanked.length === 0)
				return; // continue with next
			
			// Copy the matrix
			var newMatrix = [];
			node.matrix.forEach(function (line) {
				newMatrix.push(line.slice());
			});
			
			// Turn flanked to the player
			flanked.forEach(function (chip) {
				newMatrix[chip[0]][chip[1]] = node.turn;
			});
			
			// Copy empty squares without new move
			var newEmpty = node.emptySquares.filter(function (square, idx) {
				return (idx != i);
			});

			var step = emptySquare[0] + ',' + emptySquare[1];
			node.children[step] = new TreeNode(newMatrix, 1-node.turn, newEmpty);
		}.bind(this)); //We need to use 'this' inside
		node.childrenGenerated = true;
	},

	/**
	 * Gets the flanked positions for a given position in the given tree
	 * node for the given player
	 * @param node {TreeNode}
	 * @param i {int}
	 * @param j {int}
	 * @param player {int}
	 * @returns {[[int,int]]}
	 */
	getFlankedPositions: function(node, i, j, player) {
		// We get the flanked lines in the 8 directions
		return this.getFlankedLine(node, i, j, +1, +1, player)
			.concat(this.getFlankedLine(node, i, j, +1, -1, player))
			.concat(this.getFlankedLine(node, i, j, -1, +1, player))
			.concat(this.getFlankedLine(node, i, j, -1, -1, player))
			.concat(this.getFlankedLine(node, i, j, 0, +1, player))
			.concat(this.getFlankedLine(node, i, j, 0, -1, player))
			.concat(this.getFlankedLine(node, i, j, +1, 0, player))
			.concat(this.getFlankedLine(node, i, j, -1, 0, player));
	},

	/**
	 * Gets an array of flanked squares/chips in the given direction
	 * if a chip were placed by the player in the given coordinates.
	 * @param node {TreeNode}
	 * @param i {int} line to place the chip
	 * @param j {int} column to place the chip
	 * @param di {int} lines advanced in each step
	 * @param dj {int} columns advanced in each step
	 * @param player {int}
	 * @returns {[[int,int]]}
	 */
	getFlankedLine: function(node, i, j, di, dj, player) {
		var line = [];
		while (this._isValidSquare(i + di, j + dj)) {
			var square = node.matrix[i+di][j+dj];
			if( square < 0) {
				// We got to an empty square, return nothing
				return [];
			} else {
				line.push([i,j]);

				// Next is the last?
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
	},

	/**
	 * Checks if the given position corresponds to a valid square
	 * @param i {int}
	 * @param j {int}
	 * @returns {boolean}
	 * @private
	 */
	_isValidSquare: function (i, j) {
		return i >= 0 && i < 8 && j >= 0 && j < 8;
	}
};