'use strict';
var fs = require('fs');

/**
 * Program output facade for file / stdio output.
 */
var ProgramOutput = function(program, lenient) {
    this.program = program;
    this.stream = null;
    this.lenient = lenient;
};

/**
 * Initialize the output stream.
 */
ProgramOutput.prototype.init = function() {
    if (this.program.output) {
        this.stream = fs.createWriteStream(this.program.output, { flags: this.lenient ? 'w' : 'wx' });
    } else {
        this.stream = process.stdout;
    }
}

/**
 * Lazily initialize output stream and write the given data.
 */
ProgramOutput.prototype.write = function(data) {
    if (!this.stream) {
        this.init();
    }
    this.stream.write(data);
};

/**
 * Close the underlying stream.
 */
ProgramOutput.prototype.close = function() {
    if (this.program.output && this.program.stream) {
        this.stream.end();
    }
};

/**
 * Export factory method.
 */
module.exports = function programOutput(program, lenient) {
    return new ProgramOutput(program, lenient);
};
