"use strict";

var parseModfile = require('../parse/parse-modfile'),
    renderFormId = require('../utils/render-formId'),
    bakeDefs = require('./bake-defs');

var MODFILE_TYPES = new parseModfile.ModfileType([ 'GRUP', 'GMST', 'EDID', 'DATA', 'INFO' ]),
    BAKED_TYPES = new parseModfile.ModfileType(Object.keys(bakeDefs)),
    WATCHED_TYPES = Object.keys(bakeDefs).reduce((watched, type) => {
        watched[BAKED_TYPES[type]] = new parseModfile.ModfileType(bakeDefs[type]);
        return watched;
    }, {}),
    CONTEXT_TYPES = new parseModfile.ModfileType([ 'QUST', 'DIAL' ]);

var ROOT_CONTEXT = 0,
    GROUP_CONTEXT = 1,
    RECORD_CONTEXT = 2;

/**
 * ModfileHandler implementation for baking translations.
 */
class RecordBaker {

    constructor(strings) {
        this.strings = strings;
        // Create root context
        this.context = {
            _: ROOT_CONTEXT,
            count: 0, // number of baked records
            next: 0, // highest baked formId
            data: []
        };
        this.stack = [this.context];
    }

    handleGroup(type, label, parse) {
        if (type === 0 && !BAKED_TYPES[label]) {
            return; // No need to bake this top-level group
        }
        // Build group context
        this.context = {
            _: GROUP_CONTEXT,
            parent: this.stack[this.stack.length - 1],
            type: type,
            label: label,
            count: 0,
            next: 0,
            head: null, // context record
            data: [],
            bake: false
        };
        // Check for group context record
        if (this.context.parent.head) {
            Object.assign(this.context, this.context.parent.head);
            this.context.parent.head = null;
        }
        // Parse children
        this.stack.push(this.context)
        parse(this);
        this.context = this.stack.pop();
        // Check for bake requests
        if (this.context.bake) {
            this.context.parent.bake = true; // Mark parent for baking
            this.context.parent.data.push(this.bakeGroup(this.context));
            this.context.parent.count += this.context.count + this.context.data.length + 1;
            if (this.context.parent.next < this.context.next) {
                this.context.parent.next = this.context.next;
            }
        }
    }

    handleRecord(type, size, flags, formId, parse) {
        // Reset group context record
        this.stack[this.stack.length - 1].head = null;
        // Check if the record needs to be processed
        if (!BAKED_TYPES[type] && !CONTEXT_TYPES[type]) {
            return; // Not a baked or context record
        }
        // Create context
        this.context = {
            _: RECORD_CONTEXT,
            parent: this.stack[this.stack.length - 1],
            type: type,
            size: size,
            flags: flags,
            formId: formId,
            watch: WATCHED_TYPES[type],
            data: [],
            bake: false
        };
        // Remember last INFO
        if (MODFILE_TYPES.INFO === type) {
            this.context.previous = this.context.parent.lastInfo || 0;
            this.context.parent.lastInfo = formId; // XXX
        }
        // Parse fields
        this.stack.push(this.context);
        parse(this);
        this.context = this.stack.pop();
        // Check for bake requests
        if (this.context.bake) {
            this.context.parent.bake = true; // Mark parent for baking
            this.context.parent.data.push(this.bakeRecord(this.context));
            if (this.context.parent.next < formId) {
                this.context.parent.next = formId;
            }
        } else if (CONTEXT_TYPES[type]) {
            this.context.parent.head = {
                data: [this.bakeRecord(this.context)],
                next: formId
            };
        }
    }

    handleField(type, size, buffer, offset) {
        // Parse EDID for GMST type recognition
        if (type === MODFILE_TYPES.EDID && this.context.type === MODFILE_TYPES.GMST) {
            if (buffer.toString('ascii', offset, offset + size - 1)[0] !== 's') {
                this.context.watch = {}; // Reset watch for non-string GMST
            }
        }
        // Check if the field is in watched set
        if (!this.context.watch[type] || size === 0) {
            this.context.data.push(buffer.slice(offset - 6, offset + size));
            return; // Non-translated field
        }
        // Get and check string reference
        var stringId = buffer.readUInt32LE(offset);
        if (!stringId) {
            this.context.data.push(buffer.slice(offset - 6, offset + size));
            return; // NULL string reference
        }
        // Fetch the translation to be baked
        var string = this.strings[stringId];
        if (string === undefined) {
            throw new Error('Invalid string reference in ' + renderFormId(this.context.formId) + '.');
        }
        this.context.data.push(this.bakeField(type, string));
        this.context.bake = true; // Request baking of the whole stack
    }

    bakeField(type, string) {
        var length = Buffer.byteLength(string),
            buffer = Buffer.alloc(7 + length);
        buffer.writeUInt32LE(type);
        buffer.writeUInt16LE(length + 1, 4);
        buffer.write(string, 6);
        return buffer;
    }

    bakeRecord(record) {
        var length = record.data.reduce((length, buffer) => length + buffer.length, 0),
            baked = Buffer.alloc(24 + length);
        // Write record header
        baked.writeUInt32LE(record.type);
        baked.writeUInt32LE(length, 4);
        baked.writeUInt32LE(record.flags, 8);
        baked.writeUInt32LE(record.formId, 12);
        baked.writeUInt16LE(0x83, 20)
        // Bake field data
        record.data.reduce((offset, buffer) => {
            buffer.copy(baked, offset);
            return offset + buffer.length;
        }, 24);
        return baked;
    }

    bakeGroup(group) {
        var length = group.data.reduce((length, buffer) => length + buffer.length, 0),
            baked = Buffer.alloc(24 + length);
        baked.writeUInt32LE(MODFILE_TYPES.GRUP);
        baked.writeUInt32LE(baked.length, 4);
        baked.writeUInt32LE(group.label, 8);
        baked.writeUInt32LE(group.type, 12);
        baked.writeUInt16LE(0xFFFF, 16); // XXX
        baked.writeUInt16LE(0xFFFF, 20); // XXX
        group.data.reduce((offset, buffer) => {
            buffer.copy(baked, offset);
            return offset + buffer.length;
        }, 24);
        return baked;
    }

    bakeHeader(author, master) {
        var length = 24 +
                /* HEDR */ 20 +
                /* CNAM */ 7 + Buffer.byteLength(author) +
                /* MAST */ 7 + Buffer.byteLength(master) +
                /* DATA */ 12 +
                /* ONAM */ 0 + // XXX
                /* INTV */ 10,
            baked = Buffer.alloc(length),
            offset;
        // Write record header
        baked.writeUInt32LE(MODFILE_TYPES.encode('TES4'));
        baked.writeUInt32LE(length - 24, 4);
        baked.writeUInt16LE(0x83, 20);
        offset = 24;
        // Write HEDR
        baked.writeUInt32LE(MODFILE_TYPES.encode('HEDR'), offset);
        baked.writeUInt16LE(12, offset + 4)
        baked.writeUInt32LE(0x3F733333, offset + 6);
        baked.writeInt32LE(this.stack[0].count, offset + 10);
        baked.writeUInt32LE(this.stack[0].next + 1, offset + 14);
        offset += 18;
        // Write CNAM
        baked.writeUInt32LE(MODFILE_TYPES.encode('CNAM'), offset);
        baked.writeUInt16LE(Buffer.byteLength(author) + 1, offset + 4)
        baked.write(author, offset + 6);
        offset += 7 + Buffer.byteLength(author);
        // Write MAST
        baked.writeUInt32LE(MODFILE_TYPES.encode('MAST'), offset);
        baked.writeUInt16LE(Buffer.byteLength(master) + 1, offset + 4)
        baked.write(master, offset + 6);
        offset += 7 + Buffer.byteLength(master);
        // Write DATA
        baked.writeUInt32LE(MODFILE_TYPES.encode('DATA'), offset);
        baked.writeUInt16LE(8, offset + 4)
        offset += 14;
        // Write INTV
        baked.writeUInt32LE(MODFILE_TYPES.encode('INTV'), offset);
        baked.writeUInt16LE(4, offset + 4);
        baked.writeUInt32LE(1, offset + 6);
        return baked;
    }

}
module.exports.RecordBaker = RecordBaker;

