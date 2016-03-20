"use strict";
/**
 * Compile translations into final STRINGS files.
 */
var fs = require('fs'),
    path = require('path'),
    xml2js = require('xml2js'),
    program = require('commander'),
    parseStrings = require('./parse/parse-strings');

program.
    usage('[options] <file>').
    option('-t, --target <directory>', 'Target output directory (defaults to cwd).').
    option('-s, --shadow <directory>', 'Shadow translation source directory.').
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

var xmlObject = loadXml(program.args[0]),
    inputParams = xmlObject.SSTXMLRessources.Params[0],
    inputStrings = xmlObject.SSTXMLRessources.Content[0].String,
    targetPrefix = path.join(program.target || '', inputParams.Addon[0] + '_' + inputParams.Dest[0] + '.');

['STRINGS', 'DLSTRINGS', 'ILSTRINGS'].forEach((type, index) => {
    var strings = inputStrings.
            filter((string) => string.$.List == index).
            reduce((result, string) => {
                result[parseInt(string.$.sID, 16)] = string.Dest[0];
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
