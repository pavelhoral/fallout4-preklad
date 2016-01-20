"use strict";
/**
 * Clean-up translation files by removing any string which does not belong into its EDID range.
 */
var parseSource = require('./parse/parse-source'),
    parseModfile = require('./parse/parse-modfile'),
    parseStrings = require('./parse/parse-strings'),
    modfileInnr = require('./modfile/innr'),
    program = require('commander'),
    util = require('util');

program.
    usage('[options] <modfile>').
    parse(process.argv);

if (!program.args.length) {
    program.help();
}

function readStrings(modfile) {
    return new parseStrings.StringsReader().readByModfile(program.args[0], 'en');
}

function renderInnr(innr) {
    var rowCount = Math.max.apply(null, innr.map(part => part.choices.length)),
        rows = [];
    innr.forEach((part) => {
        for (let i = 0; i < part.choices.length; i++) {
            rows[i] = (rows[i] || '') + (part.choices[i].name || '') + '\t"' +
                    part.choices[i].conditions.join('\n') + '"\t';
        }
        for (let i = part.choices.length; i < rowCount; i++) {
            rows[i] = (rows[i] || '') + '\t\t';
        }
    });
    return rows.join('\n');
}

function extractInnrs(modfile) {
    var modfileSource = new parseSource.FileSource(modfile),
        modfileParser = new parseModfile.ModfileParser(modfileSource),
        innrExtractor = new modfileInnr.InnrExtractor(readStrings(modfile));
    modfileParser.parse(innrExtractor);
    modfileSource.close();
    Object.keys(innrExtractor.innrs).forEach(key =>  {
        console.log(key);
        console.log(renderInnr(innrExtractor.innrs[key]));
    });
}

extractInnrs(program.args[0]);