'use strict';

var parseModfile = require('../parse/parse-modfile'),
    renderFormId = require('../utils/render-formId');

var MODFILE_TYPES = new parseModfile.ModfileType([
    'QUST', 'DIAL', 'INFO', 'EDID'
]);

/**
 * ModfileHandler implementation for extracting DIAL/INFO tree.
 */
class DialExtractor {

    constructor() {
        this.dials = {};
        this.context = null;
    }

    handleHeader() {
    }

    handleGroup(type, label, parse) {
        if (type === 0 && label === MODFILE_TYPES.QUST) {
            this.context = {};
            parse(this);
            this.context = null;
        } else if (this.context && this.context.branch) {
            this.context.branch = false;
            parse(this);
            this.context.dialId = null;
        } else if (this.context && !this.context.branch) {
            console.error('Unexpected GRUP record.');
        }
    }

    handleRecord(type, size, flags, formId, parse) {
        if (!this.context) {
            return;
        }
        // Reset context
        this.context.editorId = null;
        this.context.branch = false;
        // Parse fields for EDID
        parse(this);
        // Expect GRUP branch for DIAL and QUST
        if (type === MODFILE_TYPES.DIAL || type === MODFILE_TYPES.QUST) {
            this.context.branch = true;
        }
        // Handle QUST
        if (type === MODFILE_TYPES.QUST) {
            this.context.questId = this.context.editorId || renderFormId(formId);
        }
        // Handle DIAL
        if (type === MODFILE_TYPES.DIAL) {
            this.context.dialId = renderFormId(formId);
            this.dials[this.context.dialId] = [];
            this.dials[this.context.dialId].questId = this.context.questId;
        }
        // Handle INFO
        if (type === MODFILE_TYPES.INFO) {
            // flags & 0x40 -> pouze oznacuji oddil
            this.dials[this.context.dialId].push(this.context.editorId || renderFormId(formId));
        }
        this.context.editorId = null;
    }

    handleField(type, size, buffer, offset) {
        if (type === MODFILE_TYPES.EDID) {
            this.context.editorId = buffer.toString('ascii', offset, offset + size - 1);
        }
    }

}
module.exports.DialExtractor = DialExtractor;
