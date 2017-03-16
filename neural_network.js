/**
 * Population of a generation, it should be a even number
 * @type {number}
 */
const GENERATION_POPULATION = 10;
/**
 * Number of survivors when we decide to kill some individuals
 * of the generation
 * @type {number}
 */
const GENERATION_SURVIVORS = 5;
/**
 * Probability for an individual to try to reproduce
 * @type {number}
 */
const REPRODUCTION_PROBABILITY = 0.5;
/**
 * Probability for a weight to be mutated on reproduction
 * @type {number}
 */
const MUTATION_PROBABILITY = 0.001;
/**
 * Number of neurons per layer in our neural networks
 * @type {number[]}
 */
const NETWORK_LAYERS_SIZE = [60, 30, 50, 1];
/**
 * Size of the recursive buffer for the networks
 * @type {number}
 */
const RECURSIVE_BUFFER_SIZE = 60;
/**
 * Limit absolute value of input for the sigmoid function in the neurons
 * we want to get with the random generated weights.
 * If we want the sigmoid function to give results with
 * a given minimum distance to 1 (the maximum output value),
 * we can calculate the X_LIMIT as:
 * X_LIMIT = -ln(d/(1-d))
 * where d is the given minimum distance
 * @type {number}
 */
const X_LIMIT = 11.5129;

const constantFunc = (x)=>x;
const sigmoidFunc = (x)=>1 / (1 + Math.exp(-x));

/**
 * Generation individual, the kind of individuals the NNBank manages
 * @param generation {number} generation the individual belongs to
 * @param identifier {number} identifier inside the generation
 * @param [weights] {number[]} weights for the underlying neural network
 * @param [normalizedFitness] {Number} fitness
 * @constructor
 */
var Individual = function (generation, identifier, weights, normalizedFitness) {
    if (weights !== undefined) this.nn = new NN(generation, identifier, weights);
    else this.nn = new NN(generation, identifier);
    if (normalizedFitness !== undefined)
        this.normalizedFitness = normalizedFitness;
    else
        this.normalizedFitness = -1;
};

/**
 * Neural Network bank that provides the AI players with
 * neural networks to work, performing this class the
 * evolution of Neural Networks
 * @constructor
 */
var NNBank = function () {
    this._generationNumber = -1;
    this._generation = [];
    this._currentIndex = -1;
    log({logtype: "newlog"});
};

NNBank.prototype = {
    /**
     * Gets a neural network that haven't played to play
     * @returns {NN} a neural network to play
     */
    getNN: function () {
        if (this._generation.length === 0) {
            // If the generation is empty we have to generate the first one
            this.initialGeneration();
            console.log("New generation (" + this.getGenerationNumber() + ")");
        } else if (this._currentIndex >= this._generation.length) {
            // If all the neural networks for this generation have played
            // we need to create a new generation
            console.log("Generation finished, killing AI's and reproducing");
            this.killSome();
            this.reproduceGeneration();
            console.log("New generation (" + this.getGenerationNumber() + ")");
        }
        // Return the next NN in the generation
        return this._generation[this._currentIndex++].nn;
    },

    /**
     * Creates the first generation of neural networks
     */
    initialGeneration: function () {
        this._generation = [];
        var bornArray = [];
        for (var i = 0; i < GENERATION_POPULATION; i++) {
            this._generation.push(new Individual(0, i));
            bornArray.push(i + ",-1,-1,-1,-1");
        }

        log({logtype: "born", generation: 0, born: bornArray.join(";")});

        this._currentIndex = 0;
        this._generationNumber = 0;
    },

    /**
     * Updates the fitness of all the individuals in the current generation.
     * WARNING: should be called only after all the neural networks have played
     */
    updateFitness: function () {
        // First we will calculate maximum and minimum fitness
        // to normalize the values to [0, 1]
        var max, min;
        max = min = this._generation[0].nn.getFitness();
        var fitnessArray = [];
        for (let individual of this._generation) {
            var f = individual.nn.getFitness();
            max = max > f ? max : f;
            min = min < f ? min : f;
            fitnessArray.push(individual.nn.generation + "," + individual.nn.identifier + "," + f);
        }
        // Now we normalize the values to [0, 1] and choose the survivors
        var amp = max - min;
        for (let individual of this._generation) {
            if (individual.normalizedFitness < 0)
                individual.normalizedFitness =
                    (individual.nn.getFitness() - min) / amp;
        }
        console.log("Generation " + this.getGenerationNumber() + " fitness min and max", min, max);
        log({logtype: "fitness", generation: this.getGenerationNumber(), fitness: fitnessArray.join(";")});
    },

    /**
     * Kills part of the individuals of the generation randomly, based on their normalizedFitness.
     * The numbers of survivors is given by the constant GENERATION_SURVIVORS.
     */
    killSome: function () {
        this.updateFitness();
        var individual;
        var survivors = [];
        while (survivors.length < GENERATION_SURVIVORS) {
            individual = this._generation.pop();
            // The ones with more fitness are more likely to survive
            if (Math.random() <= individual.normalizedFitness) {
                survivors.push(individual);
            } else {
                // Add it at the start because we are taking from the end (with pop)
                this._generation.unshift(individual);
            }
        }
        var killedArray = [];
        for (let killed of this._generation) {
            killedArray.push(killed.nn.generation + "," + killed.nn.identifier);
        }
        log({logtype: "killed", generation: this.getGenerationNumber(), killed: killedArray.join(";")});
        this._generation = survivors;
    },

    /**
     * Reproduces the current generation to get again the number of individuals
     * to be GENERATION_POPULATION.
     */
    reproduceGeneration: function () {
        var neededBabies = GENERATION_POPULATION - this._generation.length;
        // If the population is already the necessary we have nothing to do
        if (neededBabies < 1)
            return;

        var babies = [];
        var bornArray = []; // For logging purposes
        var previousParent = null;
        while (babies.length < neededBabies) {
            var survivor = this._generation.pop();
            var rand = Math.random();
            // Check if this one will be able to reproduce
            if (rand <= REPRODUCTION_PROBABILITY &&
                rand <= survivor.normalizedFitness) {
                if (previousParent === null) {
                    // This is the first parent
                    previousParent = survivor;
                } else {
                    // This is the second parent, mix the weights
                    babies.push(this.reproduceIndividuals(babies.length, previousParent, survivor));
                    bornArray.push(babies.length - 1 + "," +
                        previousParent.nn.generation + "," + previousParent.nn.identifier + "," +
                        survivor.nn.generation + "," + survivor.nn.identifier);
                    previousParent = null;
                }
            }
            // Put him again at the end... maybe it will reproduce again
            this._generation.unshift(survivor);
        }
        // Old ones will restart to count fitness again
        for (let individual of this._generation) {
            individual.nn.setFitness(0);
        }
        this._generation = this._generation.concat(babies);

        // Reset generation params
        this._generationNumber++;
        this._currentIndex = 0;

        log({logtype: "born", generation: this.getGenerationNumber(), born: bornArray.join(";")});
    },

    /**
     * Reproduces two individuals to get a new one
     * @param identifier {number} identifier for the child inside its generation
     * @param individualA {Individual} first parent
     * @param individualB {Individual} second parent
     * @returns {Individual} the child
     */
    reproduceIndividuals: function (identifier, individualA, individualB) {
        var childWeights = individualA.nn.getWeights();
        var weightsB = individualB.nn.getWeights();
        var n = childWeights.length;
        // We generate an array with all the possible index to copy
        var indexToCopy = Array.apply(null, {length: n}).map(Number.call, Number);
        var idx;
        for (var replaced = 0; replaced < n / 2; replaced++) {
            // Pick a random index for the available ones
            idx = indexToCopy.splice(Math.round(Math.random() * (indexToCopy.length - 1)), 1);
            // Put it in the child weights
            childWeights[idx] = weightsB[idx];
        }
        // Mutate the weights (maybe)
        this.mutate(childWeights);
        return new Individual(this._generationNumber + 1, identifier, childWeights);
    },

    /**
     * Mutates randomly the weights for the new child
     * @param weights {number[]} weights for the child to mutate
     */
    mutate: function (weights) {
        for (var i = 0; i < weights.length; i++) {
            if (Math.random() <= MUTATION_PROBABILITY) {
                weights[i] += (Math.random() * 2 - 1) * weights[i];
            }
        }
    },

    /**
     * Gets the generation number, zero-based
     * @returns {number}
     */
    getGenerationNumber: function () {
        return this._generationNumber;
    }
};

/**
 * A simple input neuron
 * @constructor
 */
var InputNeuron = function () {
    this.currentIpt = 0;
};
InputNeuron.prototype = {
    setInput: function (input) {
        this.currentIpt = input;
    },
    y: function () {
        return this.currentIpt;
    },
    getWeights: function () {
        return [];
    }
};

/**
 * A simple neuron of our neural networks hidden layers,
 * they have an arbitrary number of weighted inputs and one output
 * @param origins {HiddenNeuron[]|InputNeuron[]} neurons to take the inputs from
 * @param weights {number[]} weights for the inputs
 * @param func {function(number)}
 * @constructor
 */
var HiddenNeuron = function (origins, weights, func) {
    this.w = weights;
    this.origins = origins;
    this.f = func;
};
HiddenNeuron.prototype = {
    /**
     * Calculates the output of the neuron
     */
    y: function () {
        var ipts = [];
        for (let origin of this.origins) {
            ipts.push(origin.y());
        }
        var sum = 0;
        for (var i = 0; i < ipts.length; i++) {
            // Add up the weighted inputs
            sum += this.w[i] * ipts[i];
        }
        return this.f(sum);
    },
    getWeights: function () {
        return this.w;
    },
    addOrigins: function (array) {
        this.origins = this.origins.concat(array);
    }
};

/**
 * Adapter to connect the buffer outputs as origins for
 * the other neurons
 * @param buffer {RecursiveBuffer} the buffer to take the values from
 * @param idx {int} the index of this output inside the buffer
 * @constructor
 */
var BufferOutput = function (buffer, idx) {
    this.buffer = buffer;
    this.idx = idx;
};
BufferOutput.prototype = {
    y: function () {
        return this.buffer.getStored(this.idx);
    }
};

/**
 * Recursive buffer for the neural network, saves the last
 * outputs of the neural network
 * @param size {int} number of outputs to save
 * @constructor
 */
var RecursiveBuffer = function (size) {
    this.buffer = Array
        .apply(null, new Array(size))
        .map((x, i)=>-1);
};
RecursiveBuffer.prototype = {
    getStored: function (idx) {
        return this.buffer[idx];
    },
    update: function (val) {
        this.buffer.pop(); // Delete the last one
        this.buffer.unshift(val); // This is the first
    }
};

/**
 * Class for the neural networks that will play the game
 * @param generation {number} generation of the neural network
 * @param identifier {number} identifier of the neural network inside the generation
 * @param [weights] {number[]} array of initial weights for the neural network
 * @constructor
 */
var NN = function (generation, identifier, weights) {
    var i, k, j;

    this.fitness = 0;  // Initial fitness will be 0
    this.generation = generation;
    this.identifier = identifier;

    this.layers = [];
    var startOfLayerWeights = 0;
    var max_r_w, min_r_w;
    for (k = 0; k < NETWORK_LAYERS_SIZE.length; k++) {
        var layer = [];
        var numberOfWeightsPerNeuron = numberOfWeightsForLayer(k);

        // The max and minimum random weights
        max_r_w = X_LIMIT / numberOfWeightsPerNeuron;
        min_r_w = -max_r_w;

        for (i = 0; i < NETWORK_LAYERS_SIZE[k]; i++) {
            var neuronWeights;
            if (weights !== undefined) {
                neuronWeights =
                    weights.slice(startOfLayerWeights + i * numberOfWeightsPerNeuron,
                        startOfLayerWeights + i * numberOfWeightsPerNeuron + numberOfWeightsPerNeuron);
            } else {
                neuronWeights = new Array(numberOfWeightsPerNeuron);
                for (j = 0; j < numberOfWeightsPerNeuron; j++) {
                    // Between min_r_w and max_r_w
                    neuronWeights[j] = Math.random() * (max_r_w - min_r_w) + min_r_w;
                }
            }
            switch (k) {
                case 0:
                    layer.push(new InputNeuron());
                    break;
                case NETWORK_LAYERS_SIZE.length - 1:
                    layer.push(new HiddenNeuron(this.layers[k - 1], neuronWeights, constantFunc));
                    break;
                default:
                    layer.push(new HiddenNeuron(this.layers[k - 1], neuronWeights, sigmoidFunc));
                    break;
            }
        }
        startOfLayerWeights += NETWORK_LAYERS_SIZE[k] * numberOfWeightsPerNeuron;
        this.layers.push(layer);
    }

    // Create the recursive buffer initialized to -1s
    this.recursiveBuffer = new RecursiveBuffer(RECURSIVE_BUFFER_SIZE);
    var newOrigins = [];
    for (j = 0; j < RECURSIVE_BUFFER_SIZE; j++) {
        newOrigins.push(new BufferOutput(this.recursiveBuffer, j));
    }
    // Add it's values as inputs for the first layer neurons
    for (i = 0; i < NETWORK_LAYERS_SIZE[1]; i++) {
        this.layers[1][i].addOrigins(newOrigins);
    }
};
NN.prototype = {
    /**
     * Calculates the outputs of the neural network
     * @param x {number[]}
     */
    getOutputs: function (x) {
        // Prepare the inputs
        for (var i = 0; i < x.length; i++) {
            this.layers[0][i].setInput(x[i]);
        }
        // Calculate the outputs (recursive calling from the output neurons)
        var outputs = [];
        for (let outputNeuron of this.layers[NETWORK_LAYERS_SIZE.length - 1]) {
            var y = outputNeuron.y();
            outputs.push(y);
            this.recursiveBuffer.update(y);
        }
        return outputs;
    },
    getFitness: function () {
        return this.fitness;
    },
    setFitness: function (fitness) {
        this.fitness = fitness;
    },
    getWeights: function () {
        var weights = [];
        for (var k = 0; k < this.layers.length; k++) {
            for (var i = 0; i < this.layers[k].length; i++) {
                weights = weights.concat(this.layers[k][i].getWeights());
            }
        }
        return weights;
    },
};

function numberOfWeightsForLayer(k) {
    switch (k) {
        case -1:
        case 0:
            return 0;
        case 1:
            return NETWORK_LAYERS_SIZE[0] + RECURSIVE_BUFFER_SIZE;
        default:
            return NETWORK_LAYERS_SIZE[k - 1];
    }
}