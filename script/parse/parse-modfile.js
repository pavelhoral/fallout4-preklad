'use strict';
const zlib = require('zlib');

/**
 * Modfile entry type constant pool.
 * Contains type names mapped onto their UINT32LE equivalents and vice-versa.
 */
class ModfileType {

    constructor(types) {
        types.forEach((type) => {
            const encoded = this.encode(type);
            this[type] = encoded;
            this[encoded] = type;
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
const MODFILE_TYPES = new ModfileType([
    'TES4', 'GRUP', 'EDID', 'OFST', 'CNAM', 'SNAM', 'MAST', 'XXXX'
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
     * Handle modfile header entry.
     */
    handleHeader(header) {
        Object.assign(this.parsingStack[0], header);
    }

    /**
     * Handle group based entry.
     */
    handleGroup(type, label, parse) {
        const head = this.parsingStack[this.parsingStack.length - 1];
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
        const head = this.parsingStack[this.parsingStack.length - 1];
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
        const head = this.parsingStack[this.parsingStack.length - 1];
        // Add editor identifier
        if (type == MODFILE_TYPES.EDID) {
            head.editorId = buffer.toString('ascii', offset, offset + size - 1);
        }
    }

}
module.exports.ModfileHandler = ModfileHandler;

/**
 * TES4 record mapper.
 */
class HeaderMapper {

    constructor() {
        this.header = { parents: [] };
    }

    handleRecord(type, size, flags, formId, parse) {
        if (type !== MODFILE_TYPES.TES4) {
            throw new Error(`Invalid header type ${type}.`);
        }
        parse(this);
    }

    handleField(type, size, buffer, offset) {
        if (type === MODFILE_TYPES.CNAM) {
            this.header.author = buffer.toString('ascii', offset, offset + size - 1);
        } else if (type === MODFILE_TYPES.SNAM) {
            this.header.description = buffer.toString('ascii', offset, offset + size - 1);
        } else if (type === MODFILE_TYPES.MAST) {
            this.header.parents.push(buffer.toString('ascii', offset, offset + size - 1));
        }
    }

}


/**
 * Simple parser for Bethesda's ESM/ESP modfiles.
 * Parser reads provided data source and processes entries via provided entry handler.
 */
class ModfileParser {

    constructor(source, loader) {
        // Set modfile source
        this.source = source;
        // Set resource loader
        this.loader = loader;
        // Freeze ourself
        Object.freeze(this);
    }

    /**
     * Start modfile parsing with the given handler.
     */
    parse(handler) {
        this.parseHeader(handler);
        while (this.parseNext(handler)) { /* no-op */ }
    }

    /**
     * Parse next entry and return its size in bytes.
     */
    parseNext(handler, assert) {
        const buffer = this.source.read(24);
        const type = buffer.length === 24 ? buffer.readUInt32LE(0) : null;
        if (assert && !type) {
            throw new Error("Unexpected end of source reached.");
        } else if (type === MODFILE_TYPES.GRUP) {
            return this.parseGroup(buffer, handler);
        } else if (type !== null) {
            return this.parseRecord(type, buffer, handler) + 24;
        }
        return 0; // EOF
    }

    /**
     * Parse modfile header field.
     */
    parseHeader(handler) {
        const mapper = new HeaderMapper();
        this.parseNext(mapper, true);
        handler.handleHeader(mapper.header);
    }

    /**
     * Parse group based entry and return its size (including header).
     */
    parseGroup(buffer, handler) {
        const size = buffer.readUInt32LE(4);
        const label = buffer.readUInt32LE(8);
        const type = buffer.readInt32LE(12);
        let skip = size - 24;
        handler.handleGroup(type, label, (handler) => {
            while (skip > 0) {
                skip -= this.parseNext(handler, true);
            }
        });
        this.source.skip(skip);
        return size;
    }

    /**
     * Parse record based entry and return size of its data.
     */
    parseRecord(type, buffer, handler) {
        const size = buffer.readUInt32LE(4);
        const flags = buffer.readUInt32LE(8);
        const formId = buffer.readUInt32LE(12);
        let skip = size;
        handler.handleRecord(type, size, flags, formId, (handler) => {
            const buffer = this.source.read(size);
            if (flags & 0x00040000) {
                buffer = zlib.inflateSync(buffer.slice(4));
            }
            this.parseFields(buffer, handler);
            skip = 0;
        });
        this.source.skip(skip);
        return size;
    }

    /**
     * Parse field based entries.
     */
    parseFields(buffer, handler) {
        let offset = 0;
        while (offset < buffer.length) {
            offset += this.parseField(buffer, offset, buffer.readUInt16LE(offset + 4), handler);
        }
        return buffer.length;
    }

    /**
     * Parse field at the specified offset.
     */
    parseField(buffer, offset, size, handler) {
        const type = buffer.readUInt32LE(offset);
        if (type === MODFILE_TYPES.OFST) {
            return buffer.length - offset;
        } else if (type === MODFILE_TYPES.XXXX) {
            return size + 6 + this.parseField(buffer, offset + 16, buffer.readUInt32LE(offset + 6), handler);
        }
        handler.handleField(type, size, buffer, offset + 6);
        return size + 6;
    }

}
module.exports.ModfileParser = ModfileParser;
