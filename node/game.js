/**
 * Code made by David Campos Rodríguez
 * All rights reserved
 */

var players = [new AI(0), new AI(1)];
var initialTurn = 1;

startGame();

function startGame() {
    var data = [];
    var empty = [];
    for (var i = 0; i < 8; i++) {
        var line = [];
        for (var j = 0; j < 8; j++) {
            if ((i == 4 || i == 3) && (j == 4 || j == 3))
                line.push(i == j ? 0 : 1);
            else {
                line.push(-1);
                empty.push([i, j]);
            }
        }
        data.push(line);
    }
    var startingTreeNode = new TreeNode(data, 0, empty);
    players.forEach((p)=>p.initFromTree(startingTreeNode));
    initialTurn = 1 - initialTurn;
    gameLoop();
}

function gameLoop() {
    var turn = initialTurn;
    var ended = false;
    do {
        var movement = players[turn].play();
        turn = 1 - turn;
        players[0].notifyMovement(movement, turn);
        players[1].notifyMovement(movement, turn);
        if (movement === null)
            ended = isGameEnded(turn);
    } while (!ended);

    var endMatrix = players[0].getTree().matrix;

    var result = {0: 0, 1: 0, empty: 0};
    for (var i = 0; i < endMatrix.length; i++) {
        for (var j = 0; j < endMatrix[i].length; j++) {
            if (endMatrix[i][j] === 0) {
                result[0]++;
            } else if (endMatrix[i][j] === 1) {
                result[1]++;
            } else {
                result.empty++;
            }
        }
    }

    players[0].end(result);
    players[1].end(result);

    var text = "DRAW";
    if (result[0] > result[1])
        text = "WHITE WINS";
    else if (result[1] > result[0])
        text = "BLACK WINS";

    console.log(`Game ended.
    White chips: ${result[0]}
    Black chips: ${result[1]}
    Empty squares: ${result.empty}
        Result: ${text}`);

    // Put another game to start in the queue
    setTimeout(startGame, 0);
}

function isGameEnded(turn) {
    var tree = players[turn].getTree();
    var validForMoving = (emptySquare) =>
        (AI.prototype.getFlankedPositions(tree, emptySquare[0], emptySquare[1], 0).length > 0 ||
        AI.prototype.getFlankedPositions(tree, emptySquare[0], emptySquare[1], 1).length > 0);
    return !tree.emptySquares.some(validForMoving);
}