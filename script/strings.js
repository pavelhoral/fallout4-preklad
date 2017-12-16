#!/usr/bin/env node
'use strict';
var parseStrings = require('./parse/parse-strings'),
    renderStringId = require('./utils/render-formId'),
    program = require('commander'),
    output = require('./utils/program-output')(program);

program.
    option('-o --output <file>', 'write output to the specified file');

function readStrings(filePath) {
    return new parseStrings.StringsReader().readFile(filePath);
}

program.
    command('find <pattern>').
    description('Search for text in STRINGS.').
    option('-s, --strings <file>', 'path to a STRINGS file').
    option('-f, --flags <flags>', 'additional regexp flags').
    action((pattern, options) => {
        var strings = readStrings(options.strings),
            regexp = new RegExp(pattern, options.flags)
        Object.keys(strings).forEach(stringId => {
            var renderedId = renderStringId(stringId);
            if (!regexp.test(renderedId) && !regexp.test(strings[stringId])) {
                return; // Not a match
            }
            output.write(`[MATCH] ${renderedId} ${JSON.stringify(strings[stringId])}\n`);
        });
    });

program.
    command('diff <first> <second>').
    description('Compare two STRINGS files and find differences.').
    action((first, second) => {
        var strings = [readStrings(first), readStrings(second)],
            currentId = null;
        Object.keys(strings[0]).concat(Object.keys(strings[1])).sort().forEach(stringId => {
            if (stringId === currentId) {
                return;
            }
            currentId = stringId;
            if (strings[0][currentId] === strings[1][currentId]) {
                return;
            } else if (strings[0][currentId]) {
                output.write(`- ${renderStringId(currentId)} ${JSON.stringify(strings[0][currentId])}\n`);
            } else if (strings[1][currentId]) {
                output.write(`+ ${renderStringId(currentId)} ${JSON.stringify(strings[1][currentId])}\n`);
            }
        });
    });

program.parse(process.argv);
output.close();
if (!program.args.length) {
    program.help();
}
