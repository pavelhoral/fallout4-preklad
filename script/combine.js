"use strict";
/**
 * Combine two or more SST XML files into one.
 */
var fs = require('fs'),
    xml2js = require('xml2js'),
    program = require('commander');

program.
    usage('[options] <file ...>').
    option('-o, --output [file]', 'Write combined result into a file.').
    parse(process.argv);

if (program.args.length !== 2) {
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

var combined = null;

program.args.reduce((filePath) => {
    if (!combined) {
        combined = loadXml(filePath);
    } else {
        loadXml(filePath).SSTXMLRessources.Content[0].String.forEach((string) => {
            combined.SSTXMLRessources.Content[0].String.push(string);
        });
    }
});

var result = new xml2js.Builder().buildObject(combined);

if (program.output) {
    fs.writeFileSync(program.output, result);
} else {
    console.log(result);
}
