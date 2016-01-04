var fs = require('fs');

/**
 * Generic data source.
 * Serves mainly as an interface definition.
 */
class DataSource {

    /**
     * Read the defined number of bytes as a buffer.
     */
    read(length) {
    }

    /**
     * Skip the defined number of bytes.
     */
    skip(length) {
    }

    /**
     * Close the underlying data source.
     */
    close() {
    }

}

/**
 * File based data source.
 */
class FileSource extends DataSource {

    constructor(path, bufferSize) {
        this.fileDesc = fs.openSync(path, 'r');
        this.filePosition = 0;
        this.readBuffer = new Buffer(bufferSize || 0x3fff);
        this.readLength = 0;
        this.readOffset = 0;
    }

    close() {
        fs.closeSync(this.fileDesc);
    }

    /**
     * Read another portion of the file into the target buffer.
     */
    readFile(buffer, length) {
        var reminderLength = this.readLength - this.readOffset;
        // Copy buffer reminder to the beginning of the target buffer
        this.readBuffer.copy(buffer, 0, this.readOffset, this.readLength);
        // Reset read length and position
        this.readLength = 0;
        this.readOffset = 0;
        // Try to read the rest of the buffer
        var bytesRead = fs.readSync(buffer, reminderLength, length - reminderLength, this.filePosition);
        this.filePosition += bytesRead;
        return buffer.slice(0, bytesRead);
    }

    /**
     * Read data using the internal buffer.
     */
    readBuffer(length) {
        if (this.readOffset + length > this.readLength) {
            this.readLength = this.readFile(this.readBuffer, this.readBuffer.length).length;
        }
        if (this.readOffset + length > this.readLength) {
            length = this.readLength - this.readOffset;
        }
        this.readOffset += length;
        return this.readBuffer.slice(this.readOffset - length, this.readOffset);
    }

    read(length) {
        if (length > this.buffer.length) {
            return this.readFile(new Buffer(length), length);
        } else {
            return this.readBuffer(length);
        }
    }

    skip(length) {
        this.readOffset += length;
        if (this.readOffset > this.readLength) {
            this.filePosition += this.readOffset - this.readLength;
            this.readOffset = 0;
            this.readLength = 0;
        }
    }

}
