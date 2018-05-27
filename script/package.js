#!/usr/bin/env node
'use strict';
var fs = require('fs-extra'),
    path = require('path'),
    program = require('commander'),
    exec = require('child_process').execFileSync,
    yazl = require("yazl");

program.
    usage('[options]').
    description('Create distribution package.').
    option('-b, --build', 'process data files').
    option('-z, --zip', 'create ZIP distribution package').
    option('-m, --msi', 'create MSI distribution package').
    parse(process.argv);

if (!program.build && !program.zip && !program.msi) {
    program.help();
}

/**
 * Directory tree processor.
 */
class DirectoryProcessor {

    constructor(processFile) {
        this.processFile = processFile;
    }

    process(base) {
        this.processDirectory(base, '');
    }

    processDirectory(base, directory) {
        var names = fs.readdirSync(path.join(base, directory));
        names.forEach((name) => {
            var stat = fs.statSync(path.join(base, directory, name));
            if (stat.isDirectory()) {
                this.processDirectory(base, path.join(directory, name));
            } else if (!name.startsWith('.')) { // Ignore hidden files
                this.processFile(base, path.join(directory, name));
            }
        });
    }

}

/**
 * Process translation data files.
 */
function buildData(version) {
    new DirectoryProcessor((base, file) => {
        var basename = path.basename(file),
            filepath = path.join(base, file),
            buffer = null;
        if (basename === 'Translate_en.txt') {
            let content = fs.readFileSync(filepath, { encoding: 'utf-8' }),
                regexp = new RegExp('(\\$Press any button to start\\t).*');
            content = content.replace(regexp, '$1Čeština: ' + version);
            buffer = Buffer.from(content, 'utf16le');
        } else if (basename === 'Fallout4_Cestina.html') {
            let content = fs.readFileSync(filepath, 'utf-8');
            content = content.replace(/{{version}}/, version);
            buffer = Buffer.from(content);
        }
        if (buffer) {
            fs.writeFileSync(path.join('target', file), buffer);
        } else {
            fs.copySync(path.join(base, file), path.join('target', file));
        }
    }).process('source/data');
    console.log('Built data for \'%s\'.', version);
}

/**
* Process ZIP package file entry.
*/
function buildZip(version) {
    var zip = new yazl.ZipFile(),
        name = 'fallout4-cestina-' + version + '.zip';
    zip.outputStream.pipe(fs.createWriteStream('build/' + name)).on('close', () => {
        console.log('Created ZIP \'%s\'.', name);
    });
    new DirectoryProcessor((base, file) => {
        zip.addFile(path.join(base, file), file, {
            mode: parseInt("0100444", 8)
        });
    }).process('target');
    zip.end();
}

var version = require('../package.json').version;
if (program.build) {
    console.log('Building data...');
    buildData(version);
}

if (program.zip) {
    console.log('Creating ZIP package...');
    buildZip(version);
}

if (program.msi) {
    console.log('Creating MSI package...');
    exec('candle.exe', [
        '-dProductVersion=' + version,
        'fallout4-cestina.wxs'
    ], { cwd: 'source/install', stdio: [0, 1, 2] });
    exec('light.exe', [
        'fallout4-cestina.wixobj',
        '-out', '../../build/fallout4-cestina-' + version + '.msi',
        '-ext', 'WixUIExtension',
        '-ext', 'WixUtilExtension',
        '-cultures:cs-cz'
    ], { cwd: 'source/install', stdio: [0, 1, 2] });
}
