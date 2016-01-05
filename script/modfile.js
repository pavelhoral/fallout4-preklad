/**
 * Clean-up translation files by removing any string which does not belong into its EDID range.
 */
var parseSource = require('./parse/parse-source'),
    parseModfile = require('./parse/parse-modfile');
    path = require('path'),
    program = require('commander');

program.
    usage('[options] <modfile>').
    parse(process.argv);

if (!program.args.length) {
    program.help();
}

function extractInnrs() {
    var modfileSource = new parseSource.FileSource(program.args[0]),
        modfileParser = new parseModfile.ModfileParser(modfileSource),
        MODFILE_TYPES = new parseModfile.ModfileType(['KYWD', 'INNR']),
        modfileHandler = new parseModfile.ModfileHandler();
    modfileParser.parse(modfileHandler);
    modfileSource.close();
}

extractInnrs();