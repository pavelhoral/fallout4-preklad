'use strict';
var parseModfile = require('../parse/parse-modfile');

var MODFILE_TYPES = new parseModfile.ModfileType([
    'KYWD', 'KWDA', 'DATA', 'EDID', 'OMOD', 'WEAP', 'ARMO'
]);

/**
 * ModfileHandler implementation for finding ARMO, WEAP and OMOD records by KYWD.
 */
class OmodExtractor {

    constructor(keyword) {
        this.keyword = keyword;
        this.pattern = null;
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
            return; // Invalid field
        }
        if (type === MODFILE_TYPES.EDID) {
            this.context.editorId = buffer.toString('ascii', offset, offset + size - 1);
            if (this.context.type == MODFILE_TYPES.KYWD && this.keyword === this.context.editorId) {
                this.pattern = this.context.formId;
            }
        } else if (type === MODFILE_TYPES.KWDA) {
            for (; size > 0; size -= 4, offset += 4) {
                if (buffer.readUInt32LE(offset) === this.pattern) {
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
            propertyOffset = offset + 28 + keywordCount * 4,
            propertyType = null;
        if (includeCount !== 0 || !this.pattern) {
            return false;
        }
        for (; propertyCount > 0; propertyCount--, propertyOffset += 24) {
            if (buffer.readUInt32LE(propertyOffset) !== 4) {
                continue; // FormID value type
            } else if (buffer.readUInt32LE(propertyOffset + 4) !== 2) {
                continue; // ADD combinator
            }
            propertyType = buffer.readUInt32LE(propertyOffset + 8);
            if (propertyType !== 3 && propertyType !== 31) {
                continue; // Armor and Weapon keywords
            } else if (buffer.readUInt32LE(propertyOffset + 12) === this.pattern) {
                return true;
            }
        }
        return false;
    }

}
module.exports.OmodExtractor = OmodExtractor;
