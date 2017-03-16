// Requires reversi_script.js and neural_network.js

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
 */
var AI = function(aiPlayerNumber) {
	this._player = aiPlayerNumber;
	this._tree = null;
	// Get a new neural network to work with
	this.neuralNetwork = glob_networkBank.getNN();
};

AI.prototype = {
	initFromOthersTree: function (otherAi) {
		this._tree = otherAi._tree;
	},
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
		this.createPossibleChildsFor(this._tree);
	},
	getNewNN: function () {
		// Get a new neural network to work with
		this.neuralNetwork = glob_networkBank.getNN();
	},
	/**
	 * Notifies the AI a movement have been done, or the turn has been passed
	 * @param movement {int[]|null} the movement done, or null if the player just passed the turn
	 * @param [newTurn] {int} the new turn, only necessary if the player passed the turn
	 */
	notifyMovement: function (movement, newTurn) {
		if (movement !== null) {
			this.createPossibleChildsFor(this._tree);
			var step = movement[0] + ',' + movement[1];
			this._tree = this._tree.children[step];
		} else {
			// If movement is null it means the other player passed the turn
			this._tree.turn = newTurn;
			this._tree.children = {};
			this._tree.childrenGenerated = false;
		}
	},

	play: function () {
		// It's our turn, generate next possible movements from here
		// and possible movements from those movements
		if (!this._tree.childrenGenerated)
			this.createPossibleChildsFor(this._tree);

		var mostTrustworthyStep = null;
		var topConfidence = -2; // Indicate a initial topConfidence under the minimum
		for (var step in this._tree.children) {
			if (this._tree.children.hasOwnProperty(step)) {
				if (!this._tree.children[step].childrenGenerated)
					this.createPossibleChildsFor(this._tree.children[step]);
				// Calculate confidence for the node
				var codifiedBoard = this._codifyForNN(this._tree.children[step].matrix);
				this._tree.children[step].confidence = this.neuralNetwork.getOutputs(codifiedBoard)[0];
				if (this._tree.children[step].confidence > topConfidence) {
					mostTrustworthyStep = step.split(",");
					topConfidence = this._tree.children[step].confidence;
				}
			}
		}
		// Play the one with more confidence
		return mostTrustworthyStep;
	},

	_codifyForNN: function (matrix) {
		var codified = [];
		for (var i = 0; i < matrix.length; i++) {
			for (var j = 0; j < matrix[i].length; j++) {
				// The central square is irrelevant (it is always the same)
				if ((i == 3 || i == 4) && (j == 3 || j == 4)) {
					continue;
				}

				if (matrix[i][j] === this._player)
					codified.push(0);
				else if (matrix[i][j] === -1) {
					codified.push(-1);
				} else {
					codified.push(1);
				}
			}
		}
		return codified;
	},

	end: function () {
		var myChips = 0, hisChips = 0, emptyOnes = 0;
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
		var fitness = (myChips + emptyOnes) / (myChips + hisChips + emptyOnes);
		this.neuralNetwork.setFitness(this.neuralNetwork.getFitness() + fitness);

		if (myChips <= hisChips) {
			// I've lost or got to draw, take another NN
			this.getNewNN();
		}
	},
	
	createPossibleChildsFor: function(node) {
		if (node === null || node === undefined) return;
		if (node.childrenGenerated) return;
		for (var k = 0; k < node.emptySquares.length; k++) {
			var flanked = this.getFlankedPositions(
				node, node.emptySquares[k][0], node.emptySquares[k][1], node.turn);
			if(flanked.length === 0) continue;
			
			// Copy the matrix
			var newMatrix = [];
			for(var i=0; i < node.matrix.length; i++)
				newMatrix.push(node.matrix[i].slice());
			
			// Turn flanked to the player
			for(var m=0; m < flanked.length; m++)
				newMatrix[flanked[m][0]][flanked[m][1]] = node.turn;
			
			// Copy empty squares without new move
			var newEmpty = [];
			for (m = 0; m < node.emptySquares.length; m++)
				if(m!=k)
					newEmpty.push(node.emptySquares[m]);
			
			var step = node.emptySquares[k][0] + ',' + node.emptySquares[k][1];
			node.children[step] = new TreeNode(newMatrix, 1-node.turn, newEmpty);
		}
		node.childrenGenerated = true;
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