'use strict';
var fs = require('fs'),
    path = require('path');

var BATCH_FILE_TYPES = {
    'l10n': '.xml',
    'work': '.txt'
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
 * Resolve filename to a batch based file path using first match from the following:
 * - use `filename` as is
 * - use `pluginName/fileType/filename`
 * - use `pluginName/fileType/filename.ext`
 */
function resolveBatchPath(filename, pluginName, fileType) {
    var batchPath = filename;
    if (!validateFilePath(batchPath)) {
        batchPath = path.resolve(__dirname, '../../source', fileType, pluginName, batchPath);
    }
    if (!validateFilePath(batchPath)) {
        batchPath = batchPath + BATCH_FILE_TYPES[fileType];
    }
    if (!validateFilePath(batchPath)) {
        throw new Error(`Invalid filename '${batchPath}.`);
    }
    return batchPath;
}

/**
 * Resolve plugin name based using first match from the following:
 * - plugin from compound batch name (e.g. `Fallout4/noinfo-edids-00`)
 * - plugin from the directory path of xmlPath
 */
function resolvePluginName(xmlPath, batchName) {
    var pluginName = path.basename(batchName || '');
    if (!pluginName) {
        pluginName = path.basename(path.dirname(xmlPath));
    }
    if (!pluginName) {
        throw new Error(`Unable to resolve plugin name.`);
    }
    return pluginName;
}

/**
 * Resolve batch meta data based on the given translation filename.
 */
function resolveBatch(filename, batchName, pluginName) {
    var batch = {
        pluginName: pluginName || resolvePluginName(filename, batchName)
    };
    batch.xmlPath = resolveBatchPath(filename, batch.pluginName, 'l10n');
    batch.batchName = path.basename(batchName || '') || path.basename(batch.xmlPath).replace(/\.xml$/i, '');
    batch.txtPath = resolveBatchPath(batch.batchName, batch.pluginName, 'work');
    if (!validateFilePath(batch.txtPath)) {
        throw new Error(`Unable to locate batch definition for '${filename}.`);
    }
    return batch;
}
module.exports = resolveBatch;
