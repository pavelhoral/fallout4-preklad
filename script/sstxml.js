#!/usr/bin/env node
'use strict';
var fs = require('fs'),
    path = require('path'),
    xml2js = require('xml2js'),
    program = require('commander'),
    output = require('./utils/program-output')(program, true);

program.
    option('-o, --output <file>', 'write output to the specified file');

function makeArray(value) {
    return Array.isArray(value) ? value : value ? [value] : [];
}

function readXml(xmlFile) {
    var xmlString = fs.readFileSync(xmlFile, { encoding: 'utf-8' }),
        xmlObject = null;
    new xml2js.Parser({ explicitArray: false }).parseString(xmlString, (error, result) => {
        xmlObject = result.SSTXMLRessources;
    });
    xmlObject.Content.String = makeArray(xmlObject.Content.String);
    return xmlObject;
}

function renderXml(xmlObject) {
    return new xml2js.Builder().buildObject({ SSTXMLRessources: xmlObject }) + '\n';
}

function writeXml(xmlFile, xmlObject) {
    fs.writeFileSync(xmlFile, renderXml(xmlObject));
}

function readBatch(batchFile) {
    var rows = fs.readFileSync(batchFile, { encoding: 'utf-8' }).trim().split('\n');
    return rows.reduce((result, row) => {
        row.replace(/^.*\[INFO\] /, '').split(' ').forEach(edid => result[edid] = true);
        return result;
    }, {})
}

/**
 * Clean-up batch translation.
 */
program.
    command('cleanup <file...>').
    description('Clean-up translations by removing foreign strings.').
    option('-b, --batch <batch>', 'batch definition file to use').
    option('-w, --write', 'override file with the cleaned-up content').
    action((files, options) => {
        files.forEach(xmlFile => {
            var xmlObject = readXml(xmlFile),
                batchIds = readBatch(options.batch || xmlFile.replace(/l10n/, 'work/').replace(/xml$/, 'txt'));
            // Clean-up strings based on the batch EDIDs
            var originalStrings = xmlObject.Content.String,
                cleanedStrings = originalStrings.filter(string => batchIds[string.EDID]),
                stats = {
                    processed: originalStrings.length, // Number of processed strings
                    retained: cleanedStrings.length, // Number of retained strings
                    removed: originalStrings.length - cleanedStrings.length, // Number of removed strings
                    records: 0, // Number of distinct retained EDIDs
                    chars: 0, // Length of translated text in retained strings
                    original: 0 // Length of original text in retained strings
                };
            xmlObject.Content.String = cleanedStrings;
            // Add missing clean-up statistics
            stats.records = Object.keys(cleanedStrings.reduce((retainedIds, string) => {
                retainedIds[string.EDID] = true;
                stats.chars += string.Dest.length;
                stats.original += string.Source.length;
                return retainedIds;
            }, {})).length;
            // Write result if requested
            if (options.write) {
                writeXml(xmlFile, xmlObject);
            }
            // Print out statistics
            output.write(`${path.basename(xmlFile)} ${JSON.stringify(stats)}\n`);
        });
    });

/**
 * Combine files command.
 */
program.
    command('combine <file...>').
    description('Combine two or more SST XML files into one.').
    action(files => {
        output.write(renderXml(files.reduce((combinedXml, xmlFile) => {
            var xmlObject = readXml(xmlFile);
            if (combinedXml) {
                xmlObject.Content.String.forEach(string => {
                    combinedXml.Content.String.push(string);
                });
            }
            return combinedXml || xmlObject;
        }, null)));
    });


/**
 * Translation overlay command.
 */
program.
    command('overlay <file...>').
    description('Apply translations from source file into target files.').
    option('-s, --source <file>', 'source sstxml file').
    action((files, options) => {
        var sourceStrings = {};
        readXml(options.source).Content.String.forEach(string => sourceStrings[string.$.sID] = string);
        files.forEach(file => {
            var xmlObject = readXml(file),
                updateCount = 0;
            xmlObject.Content.String.forEach(string => {
                var overlayString = sourceStrings[string.$.sID];
                if (overlayString && string.Dest !== overlayString.Dest) {
                    string.$ = overlayString.$;
                    string.Dest = overlayString.Dest;
                    updateCount++;
                }
            });
            if (updateCount) {
                writeXml(file, xmlObject);
                output.write(`${path.basename(file)} Update count: ${updateCount}\n`);
            }
        });
    });

/**
 * Fallback command.
 */
program.
    action(() => {
        console.error('[ERROR] Unknown command \'' + program.args[0] + '\'.');
    });

program.parse(process.argv);
output.close();
if (process.argv.length < 3) {
    program.help();
}
