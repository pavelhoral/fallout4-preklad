/**
 * Clean-up translation files by removing any string which does not belong into its EDID range.
 */
var fs = require('fs'),
    path = require('path'),
    xml2js = require('xml2js'),
    program = require('commander');

program.
    usage('[options] <first-file> <second-file>').
    option('-v, --verbose', 'Print out the differences.').
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
        stringTable[string.EDID[0]] = string;
    });
    return stringTable;
}

var firstStrings = loadStrings(program.args[0]),
    secondStrings = loadStrings(program.args[1]),
    diffStats = {
        same: 0,
        diff: 0
    },
    stringDiffs = [];

Object.keys(firstStrings).sort().forEach((edid) => {
    if (!secondStrings[edid] || firstStrings[edid].Dest[0] === ' ') {
        return;
    }
    if (firstStrings[edid].Dest[0] === secondStrings[edid].Dest[0]) {
        diffStats.same++;
    } else {
        diffStats.diff++;
        stringDiffs.push({
            edid: edid,
            source: firstStrings[edid].Source[0],
            first: firstStrings[edid].Dest[0],
            second: secondStrings[edid].Dest[0]
        });
    }
});

console.log('[COMPARE]', JSON.stringify(diffStats));

if (program.verbose) {
    stringDiffs.forEach((diff) => {
        console.log('----');
        console.log(diff.edid, '-', diff.source);
        console.log(diff.first);
        console.log(diff.second);
    });
}
