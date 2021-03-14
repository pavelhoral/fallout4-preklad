'use strict';
var parseModfile = require('../parse/parse-modfile');

var MODFILE_TYPES = new parseModfile.ModfileType(['EDID']);

class FieldMatcher {

    constructor(field, pattern) {
        this.type = field ? MODFILE_TYPES.encode(field) : null;
        this.pattern = new RegExp(pattern, 'i');
    }

    matches(type, size, buffer, offset) {
        if (this.type && this.type !== type) {
            return false;
        }
        return this.pattern.test(buffer.toString('hex', offset, offset + size));
    }

}

/**
 * ModfileHandler implementation for finding generic entries with predefined hex pattern.
 */
class MatchExtractor {

    constructor(group, record, field, pattern) {
        this.group = group ? MODFILE_TYPES.encode(group) : null;
        this.record = record ? MODFILE_TYPES.encode(record) : null;
        this.matcher = new FieldMatcher(field, pattern);
        this.context = null;
        this.result = [];
    }

    handleHeader() {
    }

    handleGroup(type, label, parse) {
        if (type === 0 && this.group && this.group !== label) {
            return; // Unwanted top-level group
        }
        parse(this);
    }

    handleRecord(type, size, flags, formId, parse) {
        if (this.record && this.record !== type) {
            return; // Unwanted record type
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
        if (type === MODFILE_TYPES.EDID) {
            this.context.editorId = buffer.toString('ascii', offset, offset + size - 1);
        }
        if (this.matcher.matches(type, size, buffer, offset)) {
            this.context.match = true;
        }
    }

}
module.exports.MatchExtractor = MatchExtractor;
