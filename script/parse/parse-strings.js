"use strict";
var fs = require('fs'),
    path = require('path');

/**
 * Strings parsing handler.
 * Serves both as an interface and example implementation.
 */
class StringsHandler {

    constructor(strings) {
        this.strings = strings || {};
    }

    /**
     * Handle single string record.
     */
    handleString(id, text) {
        this.strings[id] = text;
    }

}
module.exports.StringsHandler = StringsHandler;

/**
 * Strings file parser.
 */
class StringsParser {

    constructor(buffer, padded, encoding) {
        this.buffer = buffer;
        this.padded = padded || false;
        this.encoding = encoding || 'utf-8';
        Object.freeze(this);
    }

    parse(handler) {
        var count = buffer.readUInt32LE(0),
            start = (count + 1) * 8;
        for (let i = 8; i < start; i += 8) {
            handler.handleString(
                    this.buffer.readUInt32LE(i),
                    this.parseString(this.buffer.readUInt32LE(i + 4)));
        }
    }

    parseString(offset) {
        var start = this.padded ? offset + 4 : offset;
            end = start;
        if (this.padded) {
            end += this.buffer.readUInt32LE(offset);
        } else {
            while (this.buffer[end] != 0 || end >= this.buffer.length) {
                end++;
            }
        }
        return this.buffer.toString(this.encoding, start, end);
    }

}
module.exports.StringsParser = StringsParser;

/**
 * Strings file reader.
 */
class StringsReader {

    constructor(encoding) {
        this.encoding = encoding || 'utf-8';
    }

    readBuffer(buffer, padded, encoding, target) {
        var stringsHandler = new StringsHandler(target),
            stringsParser = new StringsParser(buffer, padded, encoding || this.encoding);
        stringsParser.parse(stringsHandler);
        return stringsHandler.strings;
    }

    readFile(filename, encoding, target) {
        var buffer = fs.readFileSync(filename),
            padded = path.extname(filename) === '.STRINGS';
        return this.readBuffer(buffer, padded, encoding, target);
    }

    readByModfile(filename, encoding) {
        var extensions = ['.STRINGS', '.DLSTRINGS', '.ILSTRINGS'],
            basename = path.basename(filename).replace(/\.[^\.]+$/, ''),
            dirname = path.join(path.dirname(filename), 'Strings'),
            strings = {};
        extensions.forEach((extension) => {
            this.readFile(path.join(dirname, basename + extension), encoding, strings);
        });
        return strings;
    }

}
module.exports.StringsReader = StringsReader;
