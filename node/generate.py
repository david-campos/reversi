#!/usr/bin/env python

import os

filenames = ['../chrome/neural_network.js', '../chrome/reversi_ai.js', 'game.js']
os.remove('generated.js')
with open('generated.js', 'w') as outfile:
    for fname in filenames:
        with open(fname) as infile:
            for line in infile:
                outfile.write(line)