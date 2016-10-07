'use strict';
/**
 * Create distribution package of the translation.
 */
var fs = require('fs'),
    path = require('path'),
    child = require('child_process'),
    yazl = require("yazl");

/**
 * Assign identifier for the build being created.
 */
function getBuildId() {
    var hash = child.execSync('git rev-parse --short HEAD', { encoding: 'ascii' }).trim();
    var date = new Date().toISOString().substring(0, 10).replace(/-/g, '');
    return date + '-f4cs-' + hash;
}

/**
 * Process file before adding it to the final package.
 */
function processFile(base, file, build) {
    var basename = path.basename(file),
        filepath = path.join(base, file);
    if (basename === 'Translate_en.txt') {
        let content = fs.readFileSync(filepath, 'utf16le'),
            regexp = new RegExp('(\\$Press any button to start\\t).*');
        content = content.replace(regexp, '$1Verze češtiny: ' + build.id);
        build.zip.addBuffer(Buffer.from(content, 'utf16le'), file);
    } else {
        build.zip.addFile(filepath, file);
    }
}

/**
 * Process target directory or subdirectory.
 */
function processDir(base, directory, build) {
    var names = fs.readdirSync(path.join(base, directory));
    names.forEach((name) => {
        var stat = fs.statSync(path.join(base, directory, name));
        if (stat.isDirectory()) {
            processDir(base, path.join(directory, name), build);
        } else {
            processFile(base, path.join(directory, name), build);
        }
    });
}

var build = {
    id: getBuildId(),
    zip: new yazl.ZipFile()
};

build.zip.outputStream.pipe(fs.createWriteStream(build.id + '.zip')).on('close', () => {
    console.log('Created build \'%s\'.', build.id);
});
processDir('target', '', build);
build.zip.end();
