'use strict';
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
        var count = this.buffer.readUInt32LE(0),
            start = (count + 1) * 8;
        for (let i = 8; i < start; i += 8) {
            handler.handleString(
                    this.buffer.readUInt32LE(i),
                    this.parseString(start + this.buffer.readUInt32LE(i + 4)));
        }
    }

    parseString(offset) {
        var start = this.padded ? offset + 4 : offset,
            end = start;
        if (this.padded) {
            end += this.buffer.readUInt32LE(offset) - 1;
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
            padded = path.extname(filename).toUpperCase() !== '.STRINGS';
        return this.readBuffer(buffer, padded, encoding, target);
    }

    readByModfile(filename, language, encoding, extensions) {
        var basename = path.basename(filename).replace(/\.[^\.]+$/, '') + '_' + language,
            dirname = path.join(path.dirname(filename), 'Strings'),
            strings = {};
        (extensions || ['.STRINGS', '.DLSTRINGS', '.ILSTRINGS']).forEach((extension) => {
            this.readFile(path.join(dirname, basename + extension), encoding, strings);
        });
        return strings;
    }

}
module.exports.StringsReader = StringsReader;

/**
 * Strings file serializer.
 */
class StringsSerializer {

    constructor(strings, padded, encoding) {
        this.strings = strings;
        this.padded = !!padded;
    }

    serialize() {
        var stringIds = Object.keys(this.strings),
            directorySize = stringIds.length * 8,
            dataSize = 0,
            stringMap = stringIds.reduce((result, stringId) => {
                var string = this.strings[stringId];
                if (!result[string]) {
                    result[string] = Buffer.from(this.strings[stringId], this.encoding);
                    dataSize += this.padded * 8 + result[string].length + 1;
                }
                return result;
            }, {}),
            buffer = Buffer.alloc(8 + directorySize + dataSize);
        // Write header
        buffer.writeUInt32LE(stringIds.length, 0);
        buffer.writeUInt32LE(dataSize, 4);
        // Serialize data
        Object.keys(stringMap).reduce((offset, string) => {
            var encoded = stringMap[string],
                length = encoded.length;
            stringMap[string] = offset;
            if (this.padded) {
                buffer.writeUInt32LE(encoded.length + 1, 8 + directorySize + offset);
                offset += 4;
            }
            encoded.copy(buffer, 8 + directorySize + offset);
            return offset + encoded.length + 1;
        }, 0);
        // Serialize dictionary
        stringIds.forEach((stringId, index) => {
            buffer.writeUInt32LE(stringId | 0, 8 + index * 8);
            buffer.writeUInt32LE(stringMap[this.strings[stringId]], 8 + index * 8 + 4);
        });
        return buffer;
    }

}
module.exports.StringsSerializer = StringsSerializer;

/**
 * Strings file writer.
 */
class StringsWriter {

    constructor(encoding) {
        this.encoding = encoding || 'utf-8';
    }

    writeBuffer(strings, padded, encoding) {
        var stringsSerializer = new StringsSerializer(strings, padded, encoding || this.encoding);
        return stringsSerializer.serialize();
    }

    writeFile(strings, filename, encoding) {
        var outputBuffer = this.writeBuffer(strings, path.extname(filename) !== '.STRINGS', encoding);
        fs.writeFileSync(filename, outputBuffer);
    }

}
module.exports.StringsWriter = StringsWriter;
