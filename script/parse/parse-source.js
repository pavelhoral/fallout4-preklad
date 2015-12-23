var fs = require('fs');

class FileSource {

    constructor(fileDesc) {
        this.fileDesc = fileDesc;
    }

    close() {
        fs.closeSync(this.fileDesc);
    }

    readUint32() {
    	
    }

}