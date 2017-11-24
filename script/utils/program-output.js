'use strict';
var fs = require('fs');

/**
 * Program output facade for file / stdio output.
 */
var ProgramOutput = function(program) {
    this.program = program;
    this.stream = null;
};

/**
 * Initialize the output stream.
 */
ProgramOutput.prototype.init = function() {
    if (this.program.output) {
        this.stream = fs.createWriteStream(this.program.output, { flags: 'wx' });
    } else {
        this.stream = process.stdout;
    }
}

/**
 * Lazily initialize output stream and write the given text.
 */
ProgramOutput.prototype.write = function(text) {
    if (!this.stream) {
        this.init();
    }
    this.stream.write(text);
};

/**
 * Close the underlying stream.
 */
ProgramOutput.prototype.close = function() {
    if (this.program.output) {
        this.stream.close();
    }
};

/**
 * Export factory method.
 */
module.exports = function programOutput(program) {
    return new ProgramOutput(program);
};
