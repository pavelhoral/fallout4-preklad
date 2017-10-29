#!/usr/bin/env node
'use strict';
/**
 * Compile translations into final STRINGS files.
 */
var fs = require('fs-extra'),
    path = require('path'),
    xml2js = require('xml2js'),
    program = require('commander'),
    latinize = require('latinize'),
    parseStrings = require('./parse/parse-strings');

program.
    usage('[options] <file>').
    option('-t, --target <directory>', 'Target output directory (defaults to target/Strings).').
    option('-s, --shadow <directory>', 'Shadow translation source directory.').
    option('-u, --unaccent', 'Remove all accents from translation strings.').
    option('-d, --debug', 'Prepend string identifiers to translations.').
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

function applyShadow(strings, shadowPath) {
    var shadow = new parseStrings.StringsReader().readFile(shadowPath);
    Object.keys(shadow).forEach((stringId) => {
        var shadowString = shadow[stringId];
        if (strings[stringId] !== undefined) {
            return;
        }
        if (shadowString && shadowString != ' ' && shadowString != '  ') {
            shadowString = '!' + shadowString;
        }
        strings[stringId] = shadowString;
    });
}

function applyDebug(strings) {
    Object.keys(strings).forEach((stringId) => {
        var string = strings[stringId],
            hexId = (stringId | 0).toString(16).toUpperCase();
        if (string && string != ' ' && string != '  ' && string != '*') {
            strings[stringId] = '[' + '00000000'.substring(0, 8 - hexId.length) + hexId + ']' + string;
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
            filter((string) => string.$.List == index).
            reduce((result, string) => {
                result[parseInt(string.$.sID, 16)] =  renderString(string);
                return result;
            }, {});
    if (program.shadow) {
        applyShadow(strings, path.join(program.shadow, inputParams.Addon[0] + '_' + inputParams.Source[0] + '.' + type));
    }
    if (program.debug) {
        applyDebug(strings);
    }
    new parseStrings.StringsWriter().writeFile(strings, targetPrefix + type);
});
