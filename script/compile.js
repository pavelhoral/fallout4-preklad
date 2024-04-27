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
                console.log(`${path.basename(shadowPath)} [${renderStringId(stringId) }] ${JSON.stringify(shadowString)}`);
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
function renderString(string) {
    var result = string.Dest[0].normalize('NFC'),
        type = typeof string.REC[0] === 'string' ? string.REC[0] : string.REC[0]._,
        unaccent = program.unaccent && (
                UNACCENT_TYPES.some(unaccentType => type.startsWith(unaccentType)) ||
                UNACCENT_EDIDS.indexOf(string.EDID[0]) > -1
            );
    if (program.review) {
        result = string.Source[0] + '|' + result;
        unaccent = true;
    }
    return unaccent ? latinize(result) : result;
}

var xmlObject = loadXml(program.args[0]),
    inputParams = xmlObject.SSTXMLRessources.Params[0],
    inputStrings = xmlObject.SSTXMLRessources.Content[0].String,
    targetDirectory = program.target || path.join(__dirname, '..', 'target/Strings'),
    targetPrefix = path.join(targetDirectory, inputParams.Addon[0] + '_' + inputParams.Source[0] + '.');

// Make sure target director exists
fs.ensureDirSync(targetDirectory);

['STRINGS', 'DLSTRINGS', 'ILSTRINGS'].forEach((type, index) => {
    var strings = inputStrings.
            filter(string => string.$.List == index).
            filter(string => program.partial || !string.$.Partial).
            reduce((result, string) => {
                result[parseInt(string.$.sID, 16)] = {
                    source: string.Source[0],
                    target: renderString(string)
                };
                return result;
            }, {});
    if (program.shadow) {
        applyShadow(
            strings,
            path.join(program.shadow, inputParams.Addon[0] + '_' + inputParams.Source[0] + '.' + type),
            program.missing
        );
    }
    if (program.debug) {
        applyDebug(strings);
    }
    new parseStrings.StringsWriter().writeFile(
            Object.fromEntries(Object.entries(strings).map(([key, value]) => [key, value.target])),
            targetPrefix + type);
});
