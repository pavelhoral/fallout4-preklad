#!/usr/bin/env node
'use strict';

var fs = require('fs-extra'),
    path = require('path'),
    xml2js = require('xml2js'),
    program = require('commander'),
    latinize = require('latinize'),
    parseStrings = require('./parse/parse-strings');

program.
    usage('[options] <file>').
    description('Compile translations into final STRINGS files.').
    option('-t, --target <directory>', 'target output directory [target/Strings]').
    option('-s, --shadow <directory>', 'shadow translation source directory').
    option('-u, --unaccent', 'remove accents from translation strings').
    option('-p, --partial', 'include partial translations').
    option('-d, --debug', 'prepend string identifiers to translations').
    option('-m, --missing', 'print missing translations').
    option('-r, --review', 'create strings suitable for Creation Kit review').
    parse(process.argv);

if (program.args.length < 1) {
    program.help();
}

function loadXml(xmlPath) {
    var xmlParser = new xml2js.Parser(),
        xmlObject = null;
    xmlParser.parseString(fs.readFileSync(xmlPath, { encoding: 'utf-8' }), (error, result) => {
        xmlObject = result;
    });
    return xmlObject;
}

function renderStringId(stringId) {
    var hexId = (stringId | 0).toString(16).toUpperCase();
    return '000000'.substring(0, 6 - hexId.length) + hexId;
}

function applyShadow(strings, shadowPath, missing = false) {
    var shadow = new parseStrings.StringsReader().readFile(shadowPath, 'latin1');
    Object.keys(shadow).forEach((stringId) => {
        var shadowString = shadow[stringId];
        if (strings[stringId] !== undefined) {
            if (strings[stringId].source !== shadowString) {
                console.log(`Source string mismatch for ${renderStringId(stringId)}: ${JSON.stringify(shadowString).substring(0, 50)}`);
            }
            return;
        }
        if (shadowString && shadowString != ' ' && shadowString != '  ') {
            if (missing) {
                console.log(`Missing string ${path.basename(shadowPath)} [${renderStringId(stringId)}] ${JSON.stringify(shadowString)}`);
            }
            shadowString = '!' + shadowString;
        }
        strings[stringId] = { target: shadowString };
    });
}

function applyDebug(strings) {
    Object.keys(strings).forEach((stringId) => {
        var string = strings[stringId].target;
        if (string && string != ' ' && string != '  ' && string != '*') {
            strings[stringId].target = '[' + renderStringId(stringId) + ']' + string;
        }
    });
}

var UNACCENT_TYPES = [
        'TERM:BTXT', 'TERM:ITXT', 'TERM:NAM0',
        'TERM:RNAM', 'TERM:UNAM', 'TERM:WNAM',
        'BOOK:DESC',
        'PERK:FULL'
    ],
    UNACCENT_EDIDS = [
        'sPlayTape' // TODO tohle by se dalo prelozit bez hacku (spustit pasku)
    ];
function renderString(source, target, edid, type) {
    var result = target?.normalize('NFC') || source,
        unaccent = program.unaccent && (
                UNACCENT_TYPES.some(unaccentType => type?.startsWith(unaccentType)) ||
                UNACCENT_EDIDS.indexOf(edid) > -1
            );
    if (program.review) {
        result = source + '|' + result;
        unaccent = true;
    }
    return unaccent ? latinize(result) : result;
}

function loadXmlStrings(filename) {
    const xmlObject = loadXml(program.args[0]);
    const xmlStrings = {
        plugin: xmlObject.SSTXMLRessources.Params[0].Addon[0],
        language: xmlObject.SSTXMLRessources.Params[0].Source[0],
        STRINGS: {},
        DLSTRINGS: {},
        ILSTRINGS: {}
    };
    for (const string of xmlObject.SSTXMLRessources.Content[0].String) {
        const type = ['STRINGS', 'DLSTRINGS', 'ILSTRINGS'][string.$.List];
        xmlStrings[type][parseInt(string.$.sID, 16)] = {
            fuzzy: !!string.$.Partial,
            source: string.Source[0],
            target: renderString(
                string.Source[0],
                string.Dest?.[0],
                string.EDID[0],
                typeof string.REC[0] === 'string' ? string.REC[0] : string.REC[0]._
        )
        };
    }
    return xmlStrings;
}

async function loadPoStrings(filename) {
    const gettext = await import('@prekladyher/l10n-toolbox-gettext');
    const entries = gettext.decodeEntries(fs.readFileSync(filename, 'utf-8'));
    const poStrings = {
        plugin: path.parse(filename).name,
        language: 'en',
        STRINGS: {},
        DLSTRINGS: {},
        ILSTRINGS: {}
    };
    for (const entry of entries) {
        if (!entry.msgctxt) {
            continue; // skip header
        }
        const metadata = Object.fromEntries(entry['#.']?.split('\n').map(line => line.split('=')) || []);
        const context = entry.msgctxt.split(':');
        poStrings[context[1].toUpperCase()][parseInt(context[2], 16)] = {
            fuzzy: entry['#,']?.indexOf('fuzzy') >= 0,
            source: entry.msgid,
            target: renderString(
                entry.msgid,
                entry.msgstr,
                metadata['EDID'],
                metadata['Field'],
            )
        };
    }
    return poStrings;
}

var targetDirectory = program.target || path.join(__dirname, '..', 'target/Strings');
function compile(l10nStrings) {
    ['STRINGS', 'DLSTRINGS', 'ILSTRINGS'].forEach(type => {
        const strings = Object.fromEntries(Object.entries(l10nStrings[type])
            .filter(string => program.partial || !string.fuzzy));
        if (program.shadow) {
            applyShadow(
                strings,
                path.join(program.shadow, l10nStrings.plugin + '_' + l10nStrings.language + '.' + type),
                program.missing
            );
        }
        if (program.debug) {
            applyDebug(strings);
        }
        new parseStrings.StringsWriter().writeFile(
                Object.fromEntries(Object.entries(strings).map(([key, value]) => [key, value.target])),
                path.join(targetDirectory, l10nStrings.plugin + '_' + l10nStrings.language + '.') + type);
    });
}


// Make sure target director exists
fs.ensureDirSync(targetDirectory);

if (program.args[0].endsWith('.xml')) {
    compile(loadXmlStrings(program.args[0]));
} else {
    loadPoStrings(program.args[0]).then(compile);
}
