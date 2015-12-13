/**
 * Clean-up translation files by removing any string which does not belong into its EDID range.
 */
var fs = require('fs'),
    path = require('path'),
    xml2js = require('xml2js'),
    compare = require('compare.js'),
    program = require('commander');

program.
    usage('<file ...>').
    parse(process.argv);

if (!program.args.length) {
    program.help();
}

/**
 * Validate that the given path is path for a readable file.
 */
function validateFilePath(filePath) {
    try {
        return fs.statSync(filePath).isFile();
    } catch (error) {
        return false;
    }
}

/**
 * Resolve the given file path to a valid SST XML file path.
 */
function resolveXmlPath(filePath) {
    var xmlPath = filePath;
    if (!validateFilePath(xmlPath)) {
        xmlPath = path.resolve(__dirname, '../translated', xmlPath);
    }
    if (!validateFilePath(xmlPath)) {
        xmlPath = xmlPath + '.xml';
    }
    if (!validateFilePath(xmlPath)) {
        throw new Error('Invalid filename \'' + filePath + '\'.');
    }
    return xmlPath;
}

/**
 * Resolve SST XML file path to a valid translation batch.
 */
function resolveBatch(filePath) {
    var xmlPath = resolveXmlPath(filePath),
        xmlName = path.basename(xmlPath),
        txtPath = path.resolve(__dirname, '../workload', xmlName.replace(/\.xml$/i, '.txt'));
    if (!validateFilePath(txtPath)) {
        throw new Error('Unable to load batch definition for \'' + filePath + '\'.');
    }
    return {
        xmlPath: xmlPath,
        xmlName: xmlName,
        txtPath: txtPath
    };
}

/**
 * Cleanup translation file for the given batch.
 */
function cleanupBatch(batch) {
    var batchIds = fs.readFileSync(batch.txtPath, { encoding: 'utf-8' }).trim().split('\n'),
        firstId = batchIds[0],
        lastId = batchIds[batchIds.length - 1],
        noInfo = path.basename(batch.txtPath).indexOf('noinfo-') === 0,
        xmlParser = new xml2js.Parser(),
        xmlBuilder = new xml2js.Builder(),
        xmlObject = null;
    // Parse XML input
    xmlParser.parseString(fs.readFileSync(batch.xmlPath, { encoding: 'utf-8' }), (error, result) => {
        xmlObject = result;
    });
    // Process XML object
    var stringArray = xmlObject.SSTXMLRessources.Content[0].String,
        stringCompare = compare.caseInsensitive(),
        edidTable = {},
        cleanupStats = {
            processed: stringArray.length,
            retained: 0,
            removed: 0,
            records: 0
        };
    stringArray = stringArray.filter((string) => {
        var retain = string.REC[0].indexOf('INFO:') === (noInfo ? -1 : 0) &&
                stringCompare(firstId, string.EDID[0]) <= 0 &&
                stringCompare(string.EDID[0], lastId) <= 0;
        if (retain) {
            edidTable[string.EDID[0]] = true;
            cleanupStats.retained++;
        } else {
            cleanupStats.removed++;
        }
        return retain;
    });
    cleanupStats.records = Object.keys(edidTable).length;
    // Replace the original
    fs.writeFileSync(batch.xmlPath, xmlBuilder.buildObject(xmlObject));
    return cleanupStats;
}

program.args.forEach((filePath) => {
    try {
        var batch = resolveBatch(filePath),
            stats = cleanupBatch(batch);
        console.log('[CLEANUP]', batch.xmlName, stats);
    } catch (error) {
        console.error('[ERROR]', error.message);
    }
});
