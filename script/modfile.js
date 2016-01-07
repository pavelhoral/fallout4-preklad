/**
 * Clean-up translation files by removing any string which does not belong into its EDID range.
 */
var parseSource = require('./parse/parse-source'),
    parseModfile = require('./parse/parse-modfile'),
    parseStrings = require('./parse/parse-strings'),
    modfileInnr = require('./modfile/innr'),
    program = require('commander'),
    util = require('util');

program.
    usage('[options] <modfile>').
    parse(process.argv);

if (!program.args.length) {
    program.help();
}

function readStrings(modfile) {
    return new parseStrings.StringsReader().readByModfile(program.args[0], 'en');
}

function extractInnrs(modfile) {
    var modfileSource = new parseSource.FileSource(modfile),
        modfileParser = new parseModfile.ModfileParser(modfileSource),
        innrExtractor = new modfileInnr.InnrExtractor(readStrings(modfile));
    modfileParser.parse(innrExtractor);
    modfileSource.close();
    console.log(util.inspect(innrExtractor.innrs, false, null));
}

extractInnrs(program.args[0]);