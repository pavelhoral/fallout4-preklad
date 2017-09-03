'use strict';
/**
 * Search for text in STRINGS.
 */
var parseStrings = require('./parse/parse-strings'),
    renderStringId = require('./utils/render-formId'),
    program = require('commander'),
    fs = require('fs');

program.
    usage('[options] <pattern>').
    option('-s, --strings <file>', 'Path to a STRINGS file.').
    option('-f, --flags <flags>', 'Additional regexp flags.').
    option('-o --output <file>', 'Export STRINGS to a file.').
    parse(process.argv);

if (!program.args.length || !program.strings) {
    program.help();
}

var strings = new parseStrings.StringsReader().readFile(program.strings),
    pattern = new RegExp(program.args[0], program.flags),
    output = program.output ? fs.openSync(program.output, 'wx') : null;

Object.keys(strings).forEach(stringId => {
    var renderedId = renderStringId(stringId);
    if (!pattern.test(renderedId) && !pattern.test(strings[stringId])) {
        return; // Not a match
    }
    if (output) {
        fs.writeSync(output, renderedId + ' ' + JSON.stringify(strings[stringId]) + '\n');
    } else {
        console.log('[MATCH]', renderedId, strings[stringId]);
    }
});

if (output) {
    fs.closeSync(output);
}
