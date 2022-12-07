const path = require('path');
const crypto = require('crypto');
const ZipReader = require('./ZipReader');
const utils = require('./utils');

const collectionInfo = 'collection.info';
const structureInfo = 'structure.info';
const versionInfo = 'version.info';

const defaultStructure = 'AUTHOR;GENRE;TITLE;SERIES;SERNO;FILE;SIZE;LIBID;DEL;EXT;DATE;LANG;LIBRATE;KEYWORDS';
//'AUTHOR;GENRE;TITLE;SERIES;SERNO;FILE;SIZE;LIBID;DEL;EXT;DATE;INSNO;FOLDER;LANG;LIBRATE;KEYWORDS;'
const recStructType = {
    author: 'S',
    genre: 'S',
    title: 'S',
    series: 'S',
    serno: 'N',
    file: 'S',
    size: 'N',
    libid: 'S',
    del: 'N',
    ext: 'S',
    date: 'S',
    insno: 'N',
    folder: 'S',
    lang: 'S',
    librate: 'N',
    keywords: 'S',
}

class InpxParser {
    constructor() {
        this.inpxInfo = {};
    }

    async safeExtractToString(zipReader, fileName) {
        let result = '';

        try {
            result = (await zipReader.extractToBuf(fileName)).toString().trim();
        } catch (e) {
            //quiet
        }
        return result;
    }

    getRecStruct(structure) {
        const result = [];
        let struct = structure;
        //folder есть всегда
        if (!struct.includes('folder'))
            struct = struct.concat(['folder']);

        for (const field of struct) {
            if (utils.hasProp(recStructType, field))
                result.push({field, type: recStructType[field]});
        }

        return result;
    }

    async parse(inpxFile, readFileCallback, parsedCallback) {
        if (!readFileCallback)
            readFileCallback = async() => {};

        if (!parsedCallback)
            parsedCallback = async() => {};


        const zipReader = new ZipReader();
        await zipReader.open(inpxFile);

        try {
            const info = this.inpxInfo;

            //посчитаем inp-файлы
            const entries = Object.values(zipReader.entries);
            const inpFiles = [];
            for (const entry of entries) {
                if (!entry.isDirectory && path.extname(entry.name) == '.inp')
                    inpFiles.push(entry.name);
            }            

            //плюс 3 файла .info
            await readFileCallback({totalFiles: inpFiles.length + 3});

            let current = 0;
            //info
            await readFileCallback({fileName: collectionInfo, current: ++current});
            info.collection = await this.safeExtractToString(zipReader, collectionInfo);
            
            await readFileCallback({fileName: structureInfo, current: ++current});
            info.structure = await this.safeExtractToString(zipReader, structureInfo);
            
            await readFileCallback({fileName: versionInfo, current: ++current});
            info.version = await this.safeExtractToString(zipReader, versionInfo);

            //структура
            if (!info.structure)
                info.structure = defaultStructure;
            const structure = info.structure.toLowerCase().split(';');

            info.recStruct = this.getRecStruct(structure);

            //парсим inp-файлы
            this.chunk = [];
            for (const inpFile of inpFiles) {
                await readFileCallback({fileName: inpFile, current: ++current});
                
                await this.parseInp(zipReader, inpFile, structure, parsedCallback);
            }

            if (this.chunk.length) {
                await parsedCallback(this.chunk);
            }
            
        } finally {
            await zipReader.close();
        }
    }

    async parseInp(zipReader, inpFile, structure, parsedCallback) {
        const inpBuf = await zipReader.extractToBuf(inpFile);
        const rows = inpBuf.toString().split('\n');

        const defaultFolder = `${path.basename(inpFile, '.inp')}.zip`;
        const structLen = structure.length;

        for (const row of rows) {
            let line = row;
            if (!line)
                continue;

            if (line[line.length - 1] == '\x0D')
                line = line.substring(0, line.length - 1);

            const rec = {};
            //уникальный идентификатор записи
            const sha256 = crypto.createHash('sha256');
            rec._uid = sha256.update(line).digest('base64');

            //парсим запись
            const parts = line.split('\x04');

            const len = (parts.length > structLen ? structLen : parts.length);
            for (let i = 0; i < len; i++) {
                if (structure[i])
                    rec[structure[i]] = parts[i];
            }

            //специальная обработка некоторых полей
            if (rec.author) {
                rec.author = rec.author.split(':').map(s => s.replace(/,/g, ' ').trim()).filter(s => s).join(',');
            }

            if (rec.genre) {
                rec.genre = rec.genre.split(':').filter(s => s).join(',');
            }

            if (!rec.folder)
                rec.folder = defaultFolder;

            rec.serno = parseInt(rec.serno, 10) || 0;
            rec.size = parseInt(rec.size, 10) || 0;
            rec.del = parseInt(rec.del, 10) || 0;
            rec.insno = parseInt(rec.insno, 10) || 0;
            rec.librate = parseInt(rec.librate, 10) || 0;

            //пушим
            this.chunk.push(rec);

            if (this.chunk.length >= 10000) {
                await parsedCallback(this.chunk);
                this.chunk = [];
            }
        }
    }

    get info() {
        return this.inpxInfo;
    }
}

module.exports = InpxParser;