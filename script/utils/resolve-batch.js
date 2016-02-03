var fs = require('fs'),
    path = require('path');

var BATCH_FILE_TYPES = {
    'translated': '.xml',
    'workload': '.txt'
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
 * Resolve filename to a batch based file path.
 */
function resolveBatchPath(filename, type) {
    var batchPath = filename;
    if (!validateFilePath(batchPath)) {
        batchPath = path.resolve(__dirname, '../..', type, batchPath);
    }
    if (!validateFilePath(batchPath)) {
        batchPath = batchPath + BATCH_FILE_TYPES[type];
    }
    if (!validateFilePath(batchPath)) {
        throw new Error('Invalid filename \'' + batchPath + '\'.');
    }
    return batchPath;
}

/**
 * Resolve filename to a translation batch based.
 */
function resolveBatch(filename, name) {
    var xmlPath = resolveBatchPath(filename, 'translated'),
        batchName = name || path.basename(xmlPath).replace(/\.xml$/i, ''),
        txtPath = resolveBatchPath(batchName, 'workload');
    if (!validateFilePath(txtPath)) {
        throw new Error('Unable to load batch definition for \'' + (name || filename) + '\'.');
    }
    return {
        name: batchName,
        xmlPath: xmlPath,
        txtPath: txtPath
    };
}
module.exports = resolveBatch;
