#!/usr/bin/env node
'use strict';
var fs = require('fs'),
    path = require('path'),
    xml2js = require('xml2js'),
    program = require('commander');

program.
    usage('[options] <first-file> <second-file>').
    description('Compare two SST XML files and find conflicting translations.').
    option('-d, --different', 'Print out the different translations.').
    option('-m, --missing', 'Print out the missing translation.').
    parse(process.argv);

if (program.args.length !== 2) {
    program.help();
}

function loadStrings(xmlPath) {
    var xmlParser = new xml2js.Parser(),
        xmlObject = null,
        stringTable = {};
    xmlParser.parseString(fs.readFileSync(xmlPath, { encoding: 'utf-8' }), (error, result) => {
        xmlObject = result;
    });
    xmlObject.SSTXMLRessources.Content[0].String.forEach((string) => {
        var stringId = string.EDID[0] + ' ' + string.REC[0] + ' ' + string.Source[0];
        if (stringTable[stringId]) {
            console.warn('Duplicate identifier:', stringId);
        }
        stringTable[stringId] = string;
    });
    return stringTable;
}

var firstStrings = loadStrings(program.args[0]),
    secondStrings = loadStrings(program.args[1]),
    diffStats = {
        same: 0,
        diff: 0,
        missing: 0
    },
    stringDiffs = [];

Object.keys(firstStrings).sort().forEach((stringId) => {
    if (!secondStrings[stringId]) {
        diffStats.missing++;
        stringDiffs.push({
            id: stringId,
            source: firstStrings[stringId].Source[0],
            first: firstStrings[stringId].Dest[0]
        });
    } else if (firstStrings[stringId].Dest[0] === secondStrings[stringId].Dest[0]) {
        diffStats.same++;
    } else {
        diffStats.diff++;
        stringDiffs.push({
            id: stringId,
            source: firstStrings[stringId].Source[0],
            first: firstStrings[stringId].Dest[0],
            second: secondStrings[stringId].Dest[0]
        });
    }
});

console.log('[COMPARE]', JSON.stringify(diffStats));

if (program.different) {
    stringDiffs.filter(diff => diff.second).forEach(diff => {
        console.log('----D');
        console.log(diff.id);
        console.log(diff.first);
        console.log(diff.second);
    });
}
if (program.missing) {
    stringDiffs.filter(diff => !diff.second).forEach((diff) => {
        console.log('----M');
        console.log(diff.id);
        console.log(diff.first);
    });
}
