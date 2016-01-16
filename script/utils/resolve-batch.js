var fs = require('fs'),
    path = require('path');

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
        xmlPath = path.resolve(__dirname, '../../translated', xmlPath);
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
 * Resolve the SST XML name or file path to a valid translation batch.
 */
function resolveBatch(filePath) {
    var xmlPath = resolveXmlPath(filePath),
        xmlName = path.basename(xmlPath),
        txtPath = path.resolve(__dirname, '../../workload', xmlName.replace(/\.xml$/i, '.txt'));
    if (!validateFilePath(txtPath)) {
        throw new Error('Unable to load batch definition for \'' + filePath + '\'.');
    }
    return {
        xmlPath: xmlPath,
        xmlName: xmlName,
        txtPath: txtPath
    };
}
module.exports = resolveBatch;
