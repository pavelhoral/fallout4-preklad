/**
 * Clean-up translation files by removing any string which does not belong into its EDID range.
 */
var program = require('commander');

program.
    usage('<file ...>').
    parse(process.argv);

if (!program.args.length) {
    program.help();
}

// TODO