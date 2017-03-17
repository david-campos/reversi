#!/usr/bin/env python

import os

filenames = ['../chrome/neural_network.js', '../chrome/reversi_ai.js', '../chrome/game_no_interface.js']
try:
    os.remove('generated.js')
except:
    print('No file to delete')

with open('generated.js', 'w') as outfile:
    for fname in filenames:
        with open(fname) as infile:
            for line in infile:
                outfile.write(line)