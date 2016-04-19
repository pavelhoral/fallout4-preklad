"use strict";
/**
 * Search for text in STRINGS.
 */
var parseStrings = require('./parse/parse-strings'),
    renderStringId = require('./utils/render-formId'),
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

var strings = new parseStrings.StringsReader().readFile(program.strings),
    pattern = new RegExp(program.args[0], program.flags);

Object.keys(strings).forEach(stringId => {
    if (pattern.test(strings[stringId])) {
        console.log('[MATCH]', renderStringId(stringId), strings[stringId]);
    }
});
