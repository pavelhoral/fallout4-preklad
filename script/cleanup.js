/**
 * Clean-up translation files by removing any string which does not belong into its EDID range.
 */
var fs = require('fs'),
    path = require('path'),
    xml2js = require('xml2js'),
    compare = require('compare.js'),
    program = require('commander'),
    resolveBatch = require('./utils/resolve-batch');

program.
    usage('[options] <file ...>').
    option('-v, --verbose', 'Print out identifiers of removed strings.').
    option('-w, --write', 'Replace original file with the cleaned version.').
    parse(process.argv);

if (!program.args.length) {
    program.help();
}

/**
 * Get identifier for the SST XML string entry.
 */
function getStringId(string) {
    if (string.REC[0].indexOf('INFO:') === 0) {
        string.Source[0].substring(1, 7);
    } else {
        return string.EDID[0];
    }
}

/**
 * Cleanup translation file for the given batch.
 */
function cleanupBatch(batch) {
    var batchIds = fs.readFileSync(batch.txtPath, { encoding: 'utf-8' }).trim().split('\n'),
        dialog = path.basename(batch.txtPath).indexOf('noinfo-') === -1,
        firstId = dialog ? batchIds[0].substring(8, 14) : batchIds[0],
        lastId = dialog ? batchIds[batchIds.length - 1].substring(8, 14) : batchIds[batchIds.length - 1],
        stringCompare = compare.caseInsensitive(),
        xmlParser = new xml2js.Parser(),
        xmlBuilder = new xml2js.Builder(),
        xmlObject = null;
    // Parse XML input
    xmlParser.parseString(fs.readFileSync(batch.xmlPath, { encoding: 'utf-8' }), (error, result) => {
        xmlObject = result;
    });
    // Process XML object
    var stringArray = xmlObject.SSTXMLRessources.Content[0].String,
        recordStats = {
            retained: {},
            removed: {}
        },
        cleanupStats = {
            processed: stringArray.length,
            retained: 0,
            removed: 0,
            records: 0,
            chars: 0
        };
    stringArray = stringArray.filter((string) => {
        var stringId = getStringId(string),
            retain = stringId && stringCompare(firstId, stringId) <= 0 && stringCompare(stringId, lastId) <= 0;
        if (string.Dest[0] === ' ') {
            return false; // Do not include empty translations
        } else if (retain) {
            recordStats.retained[string.EDID[0]] = true;
            cleanupStats.retained++;
            cleanupStats.chars += string.Dest[0].length;
        } else {
            recordStats.removed[string.EDID[0]] = true;
            cleanupStats.removed++;
        }
        return retain;
    });
    cleanupStats.records = Object.keys(recordStats.retained).length;
    // Log removed IDs so that they can be manually checked
    if (Object.keys(recordStats.removed).length && program.verbose) {
        console.log('Removed IDs:', Object.keys(recordStats.removed).join(', '));
    }
    // Replace the original
    if (program.write) {
        xmlObject.SSTXMLRessources.Content[0].String = stringArray;
        fs.writeFileSync(batch.xmlPath, xmlBuilder.buildObject(xmlObject));
    }
    return cleanupStats;
}

program.args.forEach((filePath) => {
    try {
        var batch = resolveBatch(filePath),
            stats = cleanupBatch(batch);
        console.log('[CLEANUP]', batch.xmlName, JSON.stringify(stats));
    } catch (error) {
        console.error('[ERROR]', error.message);
    }
});
