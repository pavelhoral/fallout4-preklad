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

var xmlObject = loadXml(program.args[0]),
    inputParams = xmlObject.SSTXMLRessources.Params[0],
    inputStrings = xmlObject.SSTXMLRessources.Content[0].String,
    targetPrefix = path.join(program.target || '', inputParams.Addon[0] + '_' + inputParams.Dest[0] + '.');

['STRINGS', 'DLSTRINGS', 'ILSTRINGS'].forEach((type, index) => {
    var strings = inputStrings.
            filter((string) => string.$.List == index).
            reduce((result, string) => {
                result[string.$.sID] = string.Dest[0];
                return result;
            }, {});
    new parseStrings.StringsWriter().writeFile(strings, targetPrefix + type);
});
