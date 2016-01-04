/**
 * Modfile entry type constant pool.
 * Contains type names mapped onto their UINT32LE equivalents.
 */
class ModfileType {

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

/**
 * Create and populate default MODFILE_TYPE pool.
 */
var MODFILE_TYPES = new ModfileType();
[
    'GRUP', 'EDID', 'OFST'
].forEach((type) => {
    MODFILE_TYPES[type] = MODFILE_TYPES.encode(type);
});

/**
 * Create internal freezed implementation.
 */
var FREEZED_TYPES = Object.freeze(MODFILE_TYPES);

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
    handleGroup(label, parse) {
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
    handleRecord(type, dataSize, flags, formId, parse) {
        var head = this.parsingStack[this.parsingStack.length - 1];
        // Push record on the stack
        this.parsingStack.push({
            type: type,
            dataSize: dataSize,
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
    handleField(type, dataSize, buffer, offset) {
        var head = this.parsingStack[this.parsingStack.length - 1];
        // Add editor identifier
        if (type == FREEZED_TYPES.EDID) {
            head.editorId = buffer.toString('ascii', offset, dataSize - 1);
        }
    }

}

// TODO XXX Bordel nize...

/**
 * Simple parser for Bethesda's ESM/ESP modfiles.
 *
 * Handler's signature is {@code handle(context, read, parse)}.
 *  - {object} context Parsing context.
 *  - {Function} read Read the current entry.
 *  - {Function} parse Parse child entries.
 *
 * Important context properties are:
 *  - {string} $type Type of the current entry.
 *  - {Number} $offset Source offset of the current entry.
 */
class ModfileParser {

    constructor(source, context) {
        this.source = source;
        this.context = Object.assign({}, context || {});
    }

    parse(handler) {
        this.result = new ModGroup('GRUP', null);
        this.result.label = 'ROOT';
        while (this.offset < this.buffer.byteLength) {
            this.result.$children.push(this.parseNext(this.result));
        }
        return this.result;
    }

    parseNext(parent) {
        var type = readChar4(this.array, this.offset);
        if (type === 'GRUP') {
            return this.parseGroup(parent);
        } else {
            return this.parseRecord(type, parent);
        }
    }

    parseGroup(parent) {
        var view = new DataView(this.buffer, this.offset),
            group = new ModGroup('GRUP', parent),
            start = this.offset;
        group.size = view.getUint32(4, true);
        group.type = view.getInt32(12, true);
        group.offset = start + 24;
        if (group.type === 0) {
            group.label = readChar4(this.array, this.offset + 8);
        } else {
            group.label = view.getUint32(8, true);
        }
        this.offset += 24;
        while (this.offset - start < group.size) {
            group.$children.push(this.parseNext(group));
        }
        return group;
    }

    parseRecord(type, parent) {
        var view = new DataView(this.buffer, this.offset),
            record = new ModRecord(type, parent);
        record.size = view.getUint32(4, true);
        record.flags = view.getUint32(8, true);
        record.id = view.getUint32(12, true);
        record.revision = view.getUint32(16, true);
        record.version = view.getUint16(20, true);
        record.offset = this.offset + 24;
        this.offset += 24;
        if (record.flags & 0x00040000) {
            this.offset += record.size;
        } else {
            this.parseFields(record, record.size);
        }
        return record;
    }

    parseFields(parent, size) {
        var start = this.offset,
            field = null;
        while (this.offset < start + size) {
            field = this.parseField(parent);
            this.onfield(parent, field);
            if (field.$type === 'OFST') {
                break; // Stop on OFST field
            }
        }
        this.offset = start + size;
    }

    parseField(parent) {
        var field = new ModField(readChar4(this.array, this.offset), parent);
        field.size = this.view.getUint16(this.offset + 4, true);
        field.offset = this.offset + 6;
        this.offset += 6 + field.size;
        return field;
    }

}