const path = require(path);
const ZipReader = require('./ZipReader');

const collectionInfo = 'collection.info';
const structureInfo = 'structure.info';
const versionInfo = 'version.info';

const defaultStructure = 'AUTHOR;GENRE;TITLE;SERIES;SERNO;FILE;SIZE;LIBID;DEL;EXT;DATE;LANG;LIBRATE;KEYWORDS';

class InpxParser {
    constructor() {
        this.info = {};
    }

    async safeExtractToString(zipReader, fileName) {
        let result = '';

        try {
            result = await zipReader.extractToBuf(fileName).toString();
        } catch (e) {
            //quiet
        }
        return result.trim();
    }

    async parse(inpxFile, readFileCallback, parsedCallback) {
        if (!readFileCallback)
            readFileCallback = async() => {};

        if (!parsedCallback)
            parsedCallback = async() => {};


        const zipReader = new ZipReader();
        await zipReader.open(inpxFile);

        try {
            const info = this.info;

            //info
            await readFileCallback(collectionInfo);
            info.collection = await this.safeExtractToString(zipReader, collectionInfo);
            
            await readFileCallback(structureInfo);
            info.structure = await this.safeExtractToString(zipReader, structureInfo);
            
            await readFileCallback(versionInfo);
            info.version = await this.safeExtractToString(zipReader, versionInfo);

            //structure
            let inpxStructure = info.structure;
            if (!inpxStructure)
                inpxStructure = defaultStructure;
            inpxStructure = inpxStructure.toLowerCase();
            const structure = inpxStructure.split(';');

            //inp-файлы
            let chunk = [];
            const entries = Object.values(zipReader.entries);
            for (const entry of entries) {
                if (!entry.isDirectory && path.extname(entry.name) == '.inp') {

                    await readFileCallback(entry.name);
                    const buf = await zipReader.extractToBuf(entry.name);
                    chunk.push(this.parseInp(buf, structure));
                }
            }
        } finally {
            zipReader.close();
        }
    }

    parseInp(inpBuf, structure) {
        const rows = inpBuf.toString().split('\n');
        console.log(rows);
    }

    get info() {
        return this.info;
    }
}

module.exports = InpxParser;