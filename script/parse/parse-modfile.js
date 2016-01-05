"use strict";

/**
 * Modfile entry type constant pool.
 * Contains type names mapped onto their UINT32LE equivalents.
 */
class ModfileType {

    constructor(types) {
        types.forEach((type) => {
            this[type] = this.encode(type);
        });
        Object.freeze(this);
    }

    encode(type) {
        return type.charCodeAt(0) +
                (type.charCodeAt(1) << 8) +
                (type.charCodeAt(2) << 16) +
                (type.charCodeAt(3) << 24);
    }

    decode(type) {
        return String.fromCharCode(
                type & 0xff,
                type >> 8 & 0xff,
                type >> 16 & 0xff,
                type >> 24 & 0xff);
    }

}
module.exports.ModfileType = ModfileType;

/**
 * Create basic MODFILE_TYPE pool.
 */
var MODFILE_TYPES = new ModfileType([
    'GRUP', 'EDID', 'OFST'
]);
module.exports.MODFILE_TYPES = MODFILE_TYPES;

/**
 * Define default modfile parsing handler.
 * Serves both as base and example handler implementation.
 */
class ModfileHandler {

    constructor() {
        this.parsingStack = [{
            label: 'ROOT',
            children: []
        }];
    }

    /**
     * Handle group based entry.
     */
    handleGroup(type, label, parse) {
        var head = this.parsingStack[this.parsingStack.length - 1];
        // Push group on the stack
        this.parsingStack.push({
            label: label,
            children: []
        });
        // Parse children entries
        parse(this);
        // Remove from stack and add to parent
        head.children.push(this.parsingStack.pop());
    }

    /**
     * Handle record based entry.
     */
    handleRecord(type, size, flags, formId, parse) {
        var head = this.parsingStack[this.parsingStack.length - 1];
        // Push record on the stack
        this.parsingStack.push({
            type: type,
            size: size,
            flags: flags,
            formId: formId
        });
        // Parse children entries
        parse(this);
        // Remove from stack and add to parent
        head.children.push(this.parsingStack.pop());
    }

    /**
     * Handle field based entry.
     */
    handleField(type, size, buffer, offset) {
        var head = this.parsingStack[this.parsingStack.length - 1];
        // Add editor identifier
        if (type == MODFILE_TYPES.EDID) {
            head.editorId = buffer.toString('ascii', offset, size - 1);
        }
    }

}
module.exports.ModfileHandler = ModfileHandler;

/**
 * Simple parser for Bethesda's ESM/ESP modfiles.
 * Parser reads provided data source and processes entries via provided entry handler.
 */
class ModfileParser {

    constructor(source) {
        // Set source
        this.source = source;
        // Freeze ourselves
        Object.freeze(this);
    }

    /**
     * Start modfile parsing with the given handler.
     */
    parse(handler) {
        while (this.parseNext(handler)) { /* no-op */ }
    }

    /**
     * Parse next entry and return its size in bytes.
     */
    parseNext(handler, assert) {
        var buffer = this.source.read(24),
            type = buffer.length === 24 ? buffer.readUInt32LE(0) : null;
        if (assert && type === null) {
            throw new Error("Unexpected end of source reached.");
        } else if (type === MODFILE_TYPES.GRUP) {
            return this.parseGroup(buffer, handler);
        } else {
            return this.parseRecord(type, buffer, handler);
        }
    }

    /**
     * Parse group based entry.
     */
    parseGroup(buffer, handler) {
        var size = buffer.readUInt32LE(4),
            label = buffer.readUInt32LE(8),
            type = buffer.readInt32LE(12),
            skip = size - 24;
        handler.handleGroup(type, label, (handler) => {
            while (skip > 0) {
                skip -= this.parseNext(handler, true);
            }
        });
        this.source.skip(skip);
        return size - 24;
    }

    /**
     * Parse record based entry.
     */
    parseRecord(type, buffer, handler) {
        var size = buffer.readUInt32LE(4),
            flags = buffer.readUInt32LE(8),
            formId = buffer.readUInt32LE(12),
            skip = size;
        handler.handleRecord(type, size, flags, formId, (handler) => {
            var buffer = this.source.read(size);
            if (record.flags & 0x00040000) {
                // TODO GZIP handling
            }
            parseFields(buffer, handler);
            skip = 0;
        });
        this.source.skip(skip);
        return size;
    }

    /**
     * Parse field based entries.
     */
    parseFields(buffer, handler) {
        var offset = 0;
        while (offset < buffer.length) {
            offset += this.parseField(offset);
        }
        return buffer.length;
    }

    /**
     * Parse field at the specified offset.
     */
    parseField(buffer, offset, handler) {
        var type = buffer.readUInt32LE(offset),
            size = buffer.readUInt16LE(offset + 4);
        if (type === MODFILE_TYPES.OFST) {
            return buffer.length - offset;
        }
        handler.handleField(type, size, buffer, offset + 6);
        return size + 6;
    }

}
module.exports.ModfileParser = ModfileParser;