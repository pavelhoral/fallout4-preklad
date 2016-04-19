"use strict";
/**
 * Walk through ESN and extract various data.
 */
var parseSource = require('./parse/parse-source'),
    parseModfile = require('./parse/parse-modfile'),
    parseStrings = require('./parse/parse-strings'),
    renderFormId = require('./utils/render-formId'),
    program = require('commander'),
    util = require('util'),
    fs = require('fs');

program.
    option('-m, --modfile <path>', 'Specify modfile to use.').
    option('-l, --language <lang>', 'Language specifier.').
    option('-o, --output <path>', 'Write output to the specified file.');

function readStrings() {
    return new parseStrings.StringsReader().readByModfile(program.modfile, program.language || 'en');
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
        var modfileInnr = require('./modfile/innr'),
            innrExtractor = readModfile(new modfileInnr.InnrExtractor(readStrings())),
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
        var modfileDial = require('./modfile/dial'),
            dialExtractor = readModfile(new modfileDial.DialExtractor());
        writeOutput(renderDials(dialExtractor.dials));
    });

/**
 * OMOD search command.
 */
program.
    command('omods <keyword>').
    description('Search items and their modifications based on keyword the given.').
    action(() => {
        var modfileOmod = require('./modfile/omod'),
            omodExtractor = readModfile(new modfileOmod.OmodExtractor(program.args[0])),
            resultData = [];
        omodExtractor.result.forEach((match) => {
            resultData.push('[' + parseModfile.MODFILE_TYPES.decode(match.type) + '] ' + match.editorId);
        });
        writeOutput(resultData.join('\n'));
    });

/**
 * General search command.
 */
program.
    command('find <pattern>').
    description('Find items with the defined HEX pattern in their body.').
    option('-t, --type <type>', 'Specify entry type to find.').
    action(() => {
        var modfileFind = require('./modfile/find'),
            matchExtractor = readModfile(new modfileFind.MatchExtractor(program.args[1].type, program.args[0])),
            resultData = [];
        matchExtractor.result.forEach((match) => {
            resultData.push(renderFormId(match.formId) + ' [' + parseModfile.MODFILE_TYPES.decode(match.type) + '] ' +
                    match.editorId);
        });
        writeOutput(resultData.join('\n'));
    });

/**
 * Fallback command.
 */
program.
    action(() => {
        console.error('[ERROR] Unknown command \'' + program.args[0] + '\'.');
    });

program.parse(process.argv);
if (!program.args.length) {
    program.help();
}
