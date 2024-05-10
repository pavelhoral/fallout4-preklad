"use strict";
var zlib = require('zlib');
var iconv = require('iconv-lite');

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
 * ModfileHandler implementation for loading translations.
 */
class RecordLoader {

    constructor(plugin) {
        // Current plugin
        this.plugin = plugin;
        // Current plugin strings (reset before each plugin)
        this.strings = new Map();
        // Parent plugin names
        this.parents = [plugin + '.esm'];
        // Parsing context stack
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

    handleHeader(header) {
        this.parents.unshift(...header.parents);
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
            label: label
        };
        this.context.parent.children.push(this.context);
        // Parse children
        this.parseChildren(parse);
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
            watch: WATCHED_TYPES[type] || {}
        };
        this.context.parent.children.push(this.context);
        // Parse fields
        this.parseChildren(parse);
    }

    handleField(type, size, buffer, offset) {
        if (type === MODFILE_TYPES.EDID) {
            this.context.editorId = buffer.toString('ascii', offset, offset + size - 1);
        }
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
        // Extract string for valid fields
        if (this.context.watch[type]) {
            this.strings.set(
                `${MODFILE_TYPES.decode(this.context.type)}:${this.context.editorId}:${MODFILE_TYPES.decode(type)}`,
                iconv.decode(buffer.subarray(offset, offset + size - 1), 'win1250')
            );
        }
    }

}
module.exports.RecordLoader = RecordLoader;
