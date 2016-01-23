"use strict";
/**
 * Combine two or more SST XML files into one.
 */
var fs = require('fs'),
    path = require('path'),
    xml2js = require('xml2js'),
    program = require('commander');

program.
    usage('[options] <file ...>').
    option('-a, --all', 'Combine all translated files.').
    option('-i, --ignore <pattern>', 'Ignore pattern when using --all option.').
    option('-o, --output <file>', 'Write combined result into a file.').
    parse(process.argv);

if (program.all && program.args.length || !program.all && program.args.length < 2) {
    program.help();
}

var files = program.args;
if (program.all) {
    files = fs.readdirSync(path.resolve(__dirname, '../translated')).
            filter((filename) => {
                return !program.ignore || !filename.startsWith(program.ignore);
            }).
            map(filename => {
                return path.resolve(__dirname, '../translated', filename);
            });
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

files.forEach((filePath) => {
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
