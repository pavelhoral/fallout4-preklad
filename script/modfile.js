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
    option('-m, --modfile <path>', 'Specify modfile to use.');

function readStrings() {
    return new parseStrings.StringsReader().readByModfile(program.modfile, 'en');
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

/**
 * INNR extraction command.
 */
program.
    command('innrs').
    description('Extract INNR records as tab separated values.').
    action(() => {
        var modfileSource = new parseSource.FileSource(program.modfile),
            modfileParser = new parseModfile.ModfileParser(modfileSource),
            innrExtractor = new modfileInnr.InnrExtractor(readStrings());
        modfileParser.parse(innrExtractor);
        modfileSource.close();
        Object.keys(innrExtractor.innrs).forEach(key =>  {
            console.log('[INNR]', key);
            console.log(renderInnr(innrExtractor.innrs[key]));
        });
    });



/**
 * DIAL extraction command.
 */
program.
    command('dials').
    description('Extract DIAL identifiers with their respective INFOs.').
    action(() => {
        console.log('RUNNING DIAL');
    });

/**
 * Fallback command.
 */
program.
    command('*').
    action(() => {
        console.error('[ERROR] Unknown command \'' + program.args[0] + '\'.');
    });

program.parse(process.argv);
if (!program.args.length) {
    program.help();
}
