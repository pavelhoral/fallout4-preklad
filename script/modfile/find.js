"use strict";
var parseModfile = require('../parse/parse-modfile');

var MODFILE_TYPES = new parseModfile.ModfileType(['EDID']);

class FieldMatcher {

    constructor(pattern) {
        pattern = pattern.split(':');
        this.type = pattern.length > 1 ? MODFILE_TYPES.encode(pattern[0]) : null;
        this.pattern = new RegExp(pattern[pattern.length - 1], 'i');
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

    constructor(type, pattern) {
        this.type = type ? MODFILE_TYPES.encode(type) : null;
        this.matcher = new FieldMatcher(pattern);
        this.context = null;
        this.result = [];
    }

    handleGroup(type, label, parse) {
        if (type === 0 && this.type && this.type !== label) {
            return; // Unwanted top-level group
        }
        parse(this);
    }

    handleRecord(type, size, flags, formId, parse) {
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
            if (this.context.type == MODFILE_TYPES.KYWD && this.keyword === this.context.editorId) {
                this.pattern = this.context.formId;
            }
        }
        if (this.matcher.matches(type, size, buffer, offset)) {
            this.context.match = true;
        }
    }

}
module.exports.MatchExtractor = MatchExtractor;
