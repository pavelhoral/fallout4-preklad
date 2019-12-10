'use strict';

var parseModfile = require('../parse/parse-modfile');

var MODFILE_TYPES = new parseModfile.ModfileType([
    'KYWD', 'INNR', 'EDID', 'KWDA', 'WNAM', 'VNAM', 'UNAM'
]);

/**
 * ModfileHandler implementation for extracting INNR records.
 */
class InnrExtractor {

    constructor(strings) {
        this.strings = strings;
        this.keywords = {};
        this.innrs = {};
        this.context = null;
    }

    handleHeader() {
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
        if (type === MODFILE_TYPES.KYWD) {
            parse(this);
            this.keywords[formId] = this.context.editorId || formId;
        } else if (type === MODFILE_TYPES.INNR) {
            this.context.names = [];
            parse(this);
            this.innrs[this.context.editorId] = this.context.names;
        }
    }

    handleField(type, size, buffer, offset) {
        if (type === MODFILE_TYPES.EDID) {
            this.context.editorId = buffer.toString('ascii', offset, offset + size - 1);
        } else if (this.context.type !== MODFILE_TYPES.INNR) {
            return; // Further processing only for INNR
        }
        if (type === MODFILE_TYPES.VNAM) {
            this.context.name = { choices: [] };
            this.context.names.push(this.context.name);
        }
        if (type === MODFILE_TYPES.WNAM) {
            this.context.choice = {
                name: this.strings[buffer.readUInt32LE(offset)] || null,
                conditions: []
            };
            this.context.name.choices.push(this.context.choice);
        }
        if (type === MODFILE_TYPES.KWDA) {
            for (; size > 0; size -= 4, offset += 4) {
                // TODO Add support for keywords from MAST file
                this.context.choice.conditions.push(this.keywords[buffer.readUInt32LE(offset)] || '???');
            }
        }
    }

}
module.exports.InnrExtractor = InnrExtractor;
