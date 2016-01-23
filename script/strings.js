"use strict";
/**
 * Search for text in STRINGS.
 */
var parseStrings = require('./parse/parse-strings'),
    program = require('commander'),
    fs = require('fs');

program.
    usage('[options] <pattern>').
    option('-s, --strings <path>', 'Path to the STRINGS file.').
    option('-f, --flags <flags>', 'Additional regexp flags.').
    parse(process.argv);

if (!program.args.length) {
    program.help();
}

function renderStringId(stringId) {
    var hexId = (stringId | 0).toString(16).toUpperCase();
    return '[' + '00000000'.substring(0, 8 - hexId.length) + hexId + ']';
}

var strings = new parseStrings.StringsReader().readFile(program.strings),
    pattern = new RegExp(program.args[0], program.flags);

Object.keys(strings).forEach(stringId => {
    if (pattern.test(strings[stringId])) {
        console.log('[MATCH]', renderStringId(stringId), strings[stringId]);
    }
});
