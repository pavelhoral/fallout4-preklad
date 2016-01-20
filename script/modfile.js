"use strict";
/**
 * Clean-up translation files by removing any string which does not belong into its EDID range.
 */
var parseSource = require('./parse/parse-source'),
    parseModfile = require('./parse/parse-modfile'),
    parseStrings = require('./parse/parse-strings'),
    modfileInnr = require('./modfile/innr'),
    modfileDial = require('./modfile/dial'),
    program = require('commander'),
    util = require('util'),
    fs = require('fs');

program.
    option('-m, --modfile <path>', 'Specify modfile to use.').
    option('-o, --output <path>', 'Write output to the specified file.');

function readStrings() {
    return new parseStrings.StringsReader().readByModfile(program.modfile, 'en');
}

function readModfile(handler) {
    var modfileSource = new parseSource.FileSource(program.modfile),
        modfileParser = new parseModfile.ModfileParser(modfileSource);
    modfileParser.parse(handler);
    modfileSource.close();
    return handler;
}

function writeOutput(data) {
    if (program.output) {
        fs.writeFileSync(program.output, data);
    } else {
        console.log(data);
    }
}

function renderInnrs(innrs) {
    var rowCount = Math.max.apply(null, innrs.map(part => part.choices.length)),
        rows = [];
    innrs.forEach((part) => {
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
        var innrExtractor = readModfile(new modfileInnr.InnrExtractor(readStrings())),
            resultData = [];
        Object.keys(innrExtractor.innrs).forEach(key =>  {
            resultData.push('[INNR] ' + key);
            resultData.push(renderInnrs(innrExtractor.innrs[key]));
        });
        writeOutput(resultData.join('\n'));
    });

function renderDials(dials) {
    var resultData = [];
    Object.keys(dials).filter(id => dials[id].length).sort().forEach((id) => {
        resultData.push('[DIAL] ' + id + ' [INFO] ' + dials[id].join(' '));
    });
    return resultData.join('\n');
}

/**
 * DIAL extraction command.
 */
program.
    command('dials').
    description('Extract DIAL identifiers with their respective INFOs.').
    action(() => {
         var dialExtractor = readModfile(new modfileDial.DialExtractor());
         writeOutput(renderDials(dialExtractor.dials));
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
