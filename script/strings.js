#!/usr/bin/env node
'use strict';
var parseStrings = require('./parse/parse-strings'),
    renderStringId = require('./utils/render-formId'),
    program = require('commander'),
    fs = require('fs');

program.
    option('-o --output <file>', 'Export STRINGS to a file.');

var output = program.output ? fs.createWriteStream(program.output, 'wx') : process.stdout;

function readStrings(filePath) {
    return new parseStrings.StringsReader().readFile(filePath);
}

program.
    command('find <pattern>').
    description('Search for text in STRINGS.').
    option('-s, --strings <file>', 'Path to a STRINGS file.').
    option('-f, --flags <flags>', 'Additional regexp flags.').
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

program.parse(process.argv);
if (program.output) {
    output.end();
}
if (!program.args.length) {
    program.help();
}
