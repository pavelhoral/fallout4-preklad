"use strict";
var parseModfile = require('../parse/parse-modfile');

var MODFILE_TYPES = new parseModfile.ModfileType([
    'KYWD', 'KWDA', 'DATA', 'EDID', 'OMOD', 'WEAP', 'ARMO'
]);

function createPattern(formId) {
    var buffer = new Buffer(16);
    buffer.writeUInt32LE(4, 0);
    buffer.writeUInt32LE(2, 4);
    buffer.writeUInt32LE(31, 8);
    buffer.writeUInt32LE(formId, 12);
    return {
        kwda: formId,
        data: buffer
    };
}

/**
 * ModfileHandler implementation for finding ARMO, WEAP and OMOD records by KYWD.
 */
class OmodExtractor {

    constructor(keyword) {
        this.keyword = keyword;
        this.pattern = {};
        this.result = [];
        this.context = null;
    }

    handleGroup(type, label, parse) {
        MODFILE_TYPES[label] && parse(this);
    }

    handleRecord(type, size, flags, formId, parse) {
        if (!MODFILE_TYPES[type]) {
            return; // Invalid record
        }
        this.context = {
            type: type,
            formId: formId
        };
        parse(this);
        if (this.context.match) {
            this.result.push(this.context);
        }
    }

    handleField(type, size, buffer, offset) {
        if (!MODFILE_TYPES[type]) {
            return; // Invalid record
        }
        if (type === MODFILE_TYPES.EDID) {
            this.context.editorId = buffer.toString('ascii', offset, offset + size - 1);
            if (this.context.type == MODFILE_TYPES.KYWD && this.keyword === this.context.editorId) {
                this.pattern = createPattern(this.context.formId);
            }
        } else if (type === MODFILE_TYPES.KWDA) {
            for (; size > 0; size -= 4, offset += 4) {
                if (buffer.readUInt32LE(offset) === this.pattern.kwda) {
                    this.context.match = true;
                }
            }
        } else if (type === MODFILE_TYPES.DATA && this.context.type === MODFILE_TYPES.OMOD && size >= 32) {
            this.context.match |= this.checkDataMatch(type, size, buffer, offset);
        }
    }

    checkDataMatch(type, size, buffer, offset) {
        var includeCount = buffer.readUInt32LE(offset),
            propertyCount = buffer.readUInt32LE(offset + 4),
            keywordCount = buffer.readUInt32LE(offset + 20),
            propertyOffset = offset + 28 + keywordCount * 4;
        if (includeCount !== 0) {
            return false;
        }
        for (; propertyCount > 0; propertyCount--, propertyOffset += 24) {
            if (buffer.slice(propertyOffset, propertyOffset + 16).equals(this.pattern.data)) {
                return true;
            }
        }
    }

}
module.exports.OmodExtractor = OmodExtractor;
