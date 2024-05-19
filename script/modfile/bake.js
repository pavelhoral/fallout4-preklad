"use strict";
var zlib = require('zlib');

var parseModfile = require('../parse/parse-modfile'),
    renderFormId = require('../utils/render-formId'),
    bakeDefs = require('./bake-defs');

var MODFILE_TYPES = new parseModfile.ModfileType([
        'TES4', 'GRUP', 'GMST', 'EDID', 'DATA', 'INFO', 'BOOK', 'REFR', 'MAST',
        'QUST', 'DIAL', 'WRLD', 'CELL', 'PNAM'
    ]),
    BAKED_TYPES = new parseModfile.ModfileType(Object.keys(bakeDefs)),
    WATCHED_TYPES = Object.keys(bakeDefs).reduce((watched, type) => {
        watched[BAKED_TYPES[type]] = new parseModfile.ModfileType(bakeDefs[type]);
        return watched;
    }, {}),
    CONTEXT_TYPES = [1, 6, 7, 8, 9, 10];

var ROOT_CONTEXT = 0,
    GROUP_CONTEXT = 1,
    RECORD_CONTEXT = 2;

var STATIC_REVISION = 0xFFFF,
    STATIC_VERSION = 0x83;

var PNAM_AFTER = ['EDID', 'VMAD', 'DATA', 'ENAM'].map(MODFILE_TYPES.encode);

/**
 * ModfileHandler implementation for baking translations.
 */
class RecordBaker {

    constructor(plugin, strings) {
        // Current plugin
        this.plugin = plugin;
        // Current plugin strings (reset before each plugin)
        this.strings = strings;
        // Parent plugin names
        this.parents = [plugin.replace(/\.esl/, '.esm')];
        // Baking context stack
        this.context = {
            _: ROOT_CONTEXT,
            children: [],
            overrideIds: [],
            count: 0
        };
        this.stack = [this.context];
    }

    parseChildren(parse) {
        this.stack.push(this.context)
        parse(this);
        this.context = this.stack.pop();
    }

    processBake() {
        // Mark parent group
        this.context.parent.bake = true;
        // Mark parent record
        if (this.context._ === GROUP_CONTEXT && CONTEXT_TYPES.indexOf(this.context.type) > -1) {
            let head = this.context.parent.children.find(child => child.formId === this.context.label);
            if (head) { // Head record might be sibling of a parent group
                head.bake = true;
            }
        }
    }

    handleHeader(header) {
        this.parents.unshift(...header.parents);
    }

    insertField(field, after) {
        const idx = this.context.children.findIndex(child => after.indexOf(child.readUInt32LE(0)) < 0);
        this.context.children.splice(idx >= 0 ? idx : this.context.children.length, 0, field);
    }

    handleGroup(type, label, parse) {
        if (type === 0 && !BAKED_TYPES[label]) {
            return; // No need to bake this top-level group
        }
        // Find or build group context
        this.context = {
            _: GROUP_CONTEXT,
            parent: this.stack[this.stack.length - 1],
            children: [],
            type: type,
            label: label,
            bake: false
        };
        this.context.parent.children.push(this.context);
        // Parse children
        this.parseChildren(parse);
        // Check for bake requests
        if (this.context.bake) {
            this.processBake();
        } else {
            this.context.children = []; // No need to keep children
        }
    }

    handleRecord(type, size, flags, formId, parse) {
        // Check if the record needs to be processed
        if (!BAKED_TYPES[type] && !MODFILE_TYPES[type]) {
            return; // Not a baked or parent record
        }
        // Create context
        this.context = {
            _: RECORD_CONTEXT,
            parent: this.stack[this.stack.length - 1],
            children: [],
            type: type,
            size: size,
            flags: flags,
            formId: formId,
            watch: WATCHED_TYPES[type] || {},
            bake: false
        };
        this.context.parent.children.push(this.context);
        // Parse fields
        this.parseChildren(parse);
        // Process INFO ordering
        if (MODFILE_TYPES.INFO === type) {
            if (this.context.children.findIndex(field => field.readUInt32LE(0) == MODFILE_TYPES.PNAM) < 0) {
                this.insertField(this.bakeField(MODFILE_TYPES.PNAM, this.context.parent.lastInfo || 0), PNAM_AFTER);
            }
            this.context.parent.lastInfo = formId;
        }
        // Check for bake requests
        if (this.context.bake) {
            this.processBake();
        }
    }

    handleField(type, size, buffer, offset) {
        // Parse EDID for GMST type recognition
        if (type === MODFILE_TYPES.EDID && this.context.type === MODFILE_TYPES.GMST) {
            if (buffer.toString('ascii', offset, offset + size - 1)[0] !== 's') {
                this.context.watch = {}; // Reset watch for non-string GMST
            }
        }
        // Check if baking
        var bake = this.context.watch[type] && size === 4;
        if (MODFILE_TYPES.EPFD === type && !this.context.epfd) {
            bake = false;
        }
        // Get and check string reference
        var stringId = bake ? buffer.readUInt32LE(offset) : null;
        if (!bake || !stringId) {
            this.context.children.push(Buffer.from(buffer.slice(offset - 6, offset + size)));
            return; // NULL string reference or non-baked field
        }
        // Fetch the translation to be baked
        var string = this.strings[stringId];
        if (string === undefined) {
            string = 'INVALID_REF';
            console.error(`[WARN] Invalid string reference ` +
                    `${MODFILE_TYPES.decode(this.context.type)}:${MODFILE_TYPES.decode(type)} ` +
                    `in ${renderFormId(this.context.formId)}.`);
        }
        this.context.children.push(this.bakeField(type, string));
        this.context.bake = true; // Request baking of the whole stack
    }

    bakeField(type, value) {
        var length = typeof value === 'string' ? Buffer.byteLength(value) + 1: 4,
            buffer = Buffer.alloc(6 + length);
        if (length >= 65535) {
            console.error('Unable to write field value (XXXX fields not supported)!');
            process.exit(1);
        }
        buffer.writeUInt32LE(type);
        buffer.writeUInt16LE(length, 4);
        buffer[typeof value === 'string' ? 'write' : 'writeUInt32LE'](value, 6);
        return buffer;
    }

    bakeRecord(record) {
        var data = Buffer.concat(record.children),
            length = data.length,
            baked = null;
        // Write data first
        if (record.flags & 0x00040000) {
            data = zlib.deflateSync(data, { level: 7 });
            baked = Buffer.alloc(28 + data.length);
            baked.writeUInt32LE(length, 24);
            data.copy(baked, 28);
        } else {
            baked = Buffer.alloc(24 + data.length);
            data.copy(baked, 24);
        }
        // Write record header
        baked.writeUInt32LE(record.type);
        baked.writeUInt32LE(baked.length - 24, 4);
        baked.writeUInt32LE(record.flags, 8);
        baked.writeUInt32LE(record.formId, 12);
        baked.writeUInt16LE(STATIC_VERSION, 20);
        baked.writeUInt16LE(0x0C, 22);
        // Handle overrides
        if (MODFILE_TYPES.REFR === record.type) {
            this.stack[0].overrideIds.push(record.formId);
        }
        return baked;
    }

    bakeNode(node) {
        this.stack[0].count++;
        return node._ === GROUP_CONTEXT ? this.bakeGroup(node) : this.bakeRecord(node);
    }

    bakeChildren(node) {
        return node.children.
                filter(child => child.bake).
                map(child => this.bakeNode(child));
    }

    bakeGroup(group) {
        var data = this.bakeChildren(group),
            baked = Buffer.concat([Buffer.alloc(24), ...data]);
        baked.writeUInt32LE(MODFILE_TYPES.GRUP);
        baked.writeUInt32LE(baked.length, 4);
        baked.writeUInt32LE(group.label, 8);
        baked.writeUInt32LE(group.type, 12);
        baked.writeUInt16LE(STATIC_REVISION, 16);
        baked.writeUInt16LE(STATIC_REVISION, 20);
        return baked;
    }

    bakeHeader(author) {
        var root = this.stack[0],
            data = [];
        // Write HEDR
        var hedrField = Buffer.alloc(18);
        hedrField.writeUInt32LE(MODFILE_TYPES.encode('HEDR'));
        hedrField.writeUInt16LE(12, 4);
        hedrField.writeUInt32LE(this.plugin.endsWith('.esl') ? 0x3F800000 : 0x3F733333, 6);
        hedrField.writeInt32LE(root.count, 10);
        hedrField.writeUInt32LE(2048, 14);
        data.push(hedrField);
        // Write CNAM
        data.push(this.bakeField(MODFILE_TYPES.encode('CNAM'), author))
        // Write MAST
        this.parents.forEach(parent => {
            data.push(this.bakeField(MODFILE_TYPES.encode('MAST'), parent));
        });
        // Write DATA
        var dataField = Buffer.alloc(14);
        dataField.writeUInt32LE(MODFILE_TYPES.encode('DATA'));
        dataField.writeUInt16LE(8, 4)
        data.push(dataField);
        // Write ONAM
        var onamField = Buffer.alloc(6 + root.overrideIds.length * 4);
        onamField.writeUInt32LE(MODFILE_TYPES.encode('ONAM'));
        onamField.writeUInt16LE(root.overrideIds.length * 4, 4);
        root.overrideIds.sort().reduce((offset, formId) => {
            onamField.writeUInt32LE(formId, offset);
            return offset + 4;
        }, 6);
        data.push(onamField);
        // Write INTV
        var intvField = Buffer.alloc(10);
        intvField.writeUInt32LE(MODFILE_TYPES.encode('INTV'));
        intvField.writeUInt16LE(4, 4);
        intvField.writeUInt32LE(1, 6);
        data.push(intvField);
        // Write field
        var tes4Field = Buffer.alloc(24);
        tes4Field.writeUInt32LE(MODFILE_TYPES.TES4);
        tes4Field.writeUInt32LE(data.reduce((sum, buffer) => sum + buffer.length, 0), 4);
        tes4Field.writeUInt16LE(STATIC_VERSION, 20);
        data.unshift(tes4Field)
        return Buffer.concat(data);
    }

    bakePlugin(author) {
        var data = this.bakeChildren(this.stack[0]),
            header = this.bakeHeader(author);
        console.log(`Baked ${this.stack[0].count} entries.`);
        return Buffer.concat([header, ...data]);
    }

}
module.exports.RecordBaker = RecordBaker;
