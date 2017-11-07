#!/usr/bin/env node
'use strict';
var fs = require('fs'),
    path = require('path'),
    xml2js = require('xml2js'),
    program = require('commander'),
    resolveBatch = require('./utils/resolve-batch');

program.
    usage('[options] <file ...>').
    description('Clean up SST XML files by removing everything not belonging into their batch.').
    option('-w, --write', 'Replace original file with the cleaned version.').
    option('-p, --plugin <plugin>', 'Name of the plugin being translated.').
    option('-b, --batch <batch>', 'Name of the batch to use for cleanup.').
    option('-m, --missing', 'Print out identifiers of missing strings.').
    option('-r, --removed', 'Print out identifiers of removed strings.').
    parse(process.argv);

if (!program.args.length) {
    program.help();
}

/**
 * Read EDIDs belonging to the given batch.
 */
function readBatchEdids(batch) {
    var rows = fs.readFileSync(batch.txtPath, { encoding: 'utf-8' }).trim().split('\n'),
        dialog = path.basename(batch.txtPath).indexOf('noinfo-') === -1;
    if (dialog) {
        rows = rows.reduce((edids, row) => {
            row.substring(row.indexOf('[INFO]') + 7).split(' ').forEach((edid) => edids.push(edid));
            return edids;
        }, []);
    }
    return rows;
}

/**
 * Cleanup translation file for the given batch.
 */
function cleanupBatch(batch) {
    // Read batch EDIDs
    var edids = readBatchEdids(batch).reduce((edids, edid) => {
        edids[edid] = false;
        return edids;
    }, {});
    // Parse XML strings
    var xmlParser = new xml2js.Parser(),
        xmlBuilder = new xml2js.Builder(),
        xmlObject = null;
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
        var edid = string.EDID[0],
            retain = edids[edid] !== undefined;
        if (retain) {
            edids[edid] = true;
            recordStats.retained[edid] = true;
            cleanupStats.retained++;
            cleanupStats.chars += string.Dest[0].length;
        } else {
            recordStats.removed[edid] = true;
            cleanupStats.removed++;
        }
        return retain;
    });
    cleanupStats.records = Object.keys(recordStats.retained).length;
    // Log removed IDs
    if (program.removed) {
        console.log('[INFO] Removed IDs:', Object.keys(recordStats.removed).join(', '));
    }
    // Log missing IDs
    if (program.missing) {
        console.log('[INFO] Missing IDs:', Object.keys(edids).filter(edid => !edids[edid]).join(', '));
    }
    // Replace the original
    if (program.write) {
        xmlObject.SSTXMLRessources.Content[0].String = stringArray;
        fs.writeFileSync(batch.xmlPath, xmlBuilder.buildObject(xmlObject));
    }
    return cleanupStats;
}

program.args.forEach((filename) => {
    try {
        var batch = resolveBatch(filename, program.batch, program.plugin),
            stats = cleanupBatch(batch);
        console.log('[CLEANUP]', batch.pluginName, batch.batchName, JSON.stringify(stats));
    } catch (error) {
        console.error('[ERROR]', error.message);
    }
});
