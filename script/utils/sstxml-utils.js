'use strict';
var xml2js = require('xml2js'),
    fs = require('fs');

/**
 * Parse XML string into JS object.
 */
function parseXml(xmlString) {
    var xmlObject = null;
    new xml2js.Parser({ explicitArray: false }).parseString(xmlString, (error, result) => xmlObject = result);
    return xmlObject;
}
module.exports.parseXml = parseXml;

/**
 * Read XML file into JS object.
 */
function readXml(xmlFile) {
    var xmlString = fs.readFileSync(xmlFile, { encoding: 'utf-8' });
    return parseXml(xmlString);
};
module.exports.readXml = readXml;

/**
 * Serialize JS object into XML string.
 */
function renderXml(xmlObject) {
    return new xml2js.Builder().buildObject(xmlObject);
}
module.exports.renderXml = renderXml;

/**
 * Serialize XML object into file.
 */
function writeXml(xmlFile, xmlObject) {
    fs.writeFileSync(xmlFile, renderXml(xmlObject));
}
module.exports.writeXml = writeXml;
