import { FileSource, ModfileHandler, ModfileParser, decodeTypeTag, encodeTypeTag } from "beth-parser";
import { readFile } from "fs/promises";

export async function mergePlugins(sources, target) {
    // Load all source plugins (no memory optimization)
    const sourceData = [];
    for (const source of sources) {
        sourceData.push(await loadPlugin(source));
    }

    // Construct link table
    const targetTable = new Map();
    for (let pluginData of sourceData) {
        const masterRecord = pluginData.children[0];
        if (masterRecord.type !== encodeTypeTag("TES4")) {
            throw new Error(`Invalid master record: ${decodeTypeTag(masterRecord.type)}`);
        }
        for (const field of masterRecord.fields) {
            if (field.type !== encodeTypeTag("MAST")) {
                continue;
            }
            const masterName = field.value.toString('utf-8', 0, field.value.length - 1);
            if (!targetTable.has(masterName)) {
                targetTable.set(masterName, targetTable.size);
            }
        }
    }

    console.log(targetTable);
}

/**
 * Load modfile as a generic group/record tree.
 * @param {string} filename 
 * @returns {GroupEntry} Root group entry.
 */
async function loadPlugin(filename) {
    const handler = new ModfileHandler();
    const source = new FileSource(filename);
    try {
        console.debug(`Loading ${filename}`);
        new ModfileParser(source).parse(handler);
    } finally {
        source.close();
    }
    return handler.root;
}
