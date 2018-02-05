#!/usr/bin/env node
'use strict';
var parseSource = require('./parse/parse-source'),
    parseModfile = require('./parse/parse-modfile'),
    parseStrings = require('./parse/parse-strings'),
    renderFormId = require('./utils/render-formId'),
    program = require('commander'),
    output = require('./utils/program-output')(program),
    util = require('util'),
    path = require('path');

program.
    option('-m, --modfile <file>', 'specify modfile to use').
    option('-s, --strings <directory>', 'strings source directory').
    option('-l, --language <lang>', 'translation language code [en]', 'en').
    option('-o, --output <file>', 'write output to the specified file');

function readStrings() {
    var modfilePath = program.modfile;
    if (program.strings) {
        modfilePath = path.resolve(path.dirname(program.strings), path.basename(program.modfile));
    }
    return new parseStrings.StringsReader().readByModfile(modfilePath, program.language);
}

function readModfile(handler) {
    var modfileSource = new parseSource.FileSource(program.modfile),
        modfileParser = new parseModfile.ModfileParser(modfileSource);
    modfileParser.parse(handler);
    modfileSource.close();
    return handler;
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
            output.write(`[INNR] ${key}\n`);
            output.write(renderInnrs(innrExtractor.innrs[key]) + '\n');
        });
    });

/**
 * DIAL extraction command.
 */
program.
    command('dials').
    description('Extract DIAL identifiers with their respective INFOs.').
    option('-q, --quest', 'include quest reference').
    action((options) => {
        var modfileDial = require('./modfile/dial'),
            dialExtractor = readModfile(new modfileDial.DialExtractor()),
            dials = dialExtractor.dials;
        Object.keys(dials).filter(id => dials[id].length).sort().forEach((id) => {
            output.write((options.quest ? `[QUST] ${dials[id].questId} ` : '') +
                    `[DIAL] ${id} [INFO] ${dials[id].join(' ')}\n`);
        });
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
            output.write(`[${parseModfile.MODFILE_TYPES.decode(match.type)}] ${match.editorId}\n`);
        });
    });

/**
 * General search command.
 */
program.
    command('find <pattern>').
    description('Find items with the defined pattern in their body.').
    option('-g, --group <group>', 'specify entry type to find').
    option('-t, --text', 'do a text based search').
    option('-r, --reverse', 'use reversed hex pattern').
    action((pattern, options) => {
        var modfileFind = require('./modfile/find');
        if (options.text) {
            pattern = Buffer.from(pattern, 'utf-8').toString('hex');
        } else if (options.reverse) {
            pattern = pattern.match(/../g).reverse().join('');
        }
        readModfile(new modfileFind.MatchExtractor(options.type, pattern)).result.forEach((match) => {
            output.write(`${renderFormId(match.formId)} [${parseModfile.MODFILE_TYPES.decode(match.type)}] ${match.editorId}\n`);
        });
    });

/**
 * Create 'baked' modfile.
 */
program.
    command('bake').
    description('Produce modfile with baked-in translations.').
    action(() => {
        var modfileBake = require('./modfile/bake'),
            pluginName = path.parse(program.modfile).name,
            recordBaker = new modfileBake.RecordBaker(pluginName, readStrings());
        if (!program.output) {
            console.error('Output file must be specified.');
        } else {
            output.write(readModfile(recordBaker).bakePlugin('DEFAULT'));
        }
    });

/**
 * Fallback command.
 */
program.
    action(() => {
        program.help();
    });

program.parse(process.argv);
output.close();
