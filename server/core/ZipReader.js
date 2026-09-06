const fs = require('fs-extra');
const {execFile, execFileSync} = require('child_process');
const StreamUnzip = require('node-stream-zip');

// Архивы многих inpx-коллекций (в частности, Флибусты) сжаты PPMd (метод 98).
// node-stream-zip умеет только deflate и падает на "Unknown compression method: 98",
// поэтому такие записи достаем внешним 7z, если он есть в системе.
const SEVEN_ZIP_CANDIDATES = ['7z', '7zz', '7za'];
const MAX_BUF = 512*1024*1024;

let sevenZipCmd;//undefined - еще не искали, '' - не нашли

function findSevenZip() {
    if (sevenZipCmd !== undefined)
        return sevenZipCmd;

    sevenZipCmd = '';
    for (const cmd of SEVEN_ZIP_CANDIDATES) {
        try {
            execFileSync(cmd, ['i'], {stdio: 'ignore'});
            sevenZipCmd = cmd;
            break;
        } catch (e) {
            //нет такой команды, пробуем следующую
        }
    }

    return sevenZipCmd;
}

function isUnsupportedMethod(e) {
    return e && /Unknown compression method/i.test(e.message || '');
}

function sevenZipToBuf(cmd, zipFile, entryFilePath) {
    return new Promise((resolve, reject) => {
        execFile(cmd, ['x', '-so', '-bd', '-bso0', '-bse0', zipFile, entryFilePath],
            {maxBuffer: MAX_BUF, encoding: 'buffer'},
            (err, stdout) => {
                if (err)
                    reject(err);
                else if (!stdout || !stdout.length)
                    reject(new Error(`7z: empty output for ${entryFilePath}`));
                else
                    resolve(stdout);
            }
        );
    });
}

class ZipReader {
    constructor() {
        this.zip = null;
        this.zipFile = null;
    }

    checkState() {
        if (!this.zip)
            throw new Error('Zip closed');
    }

    async open(zipFile, zipEntries = true) {
        if (this.zip)
            throw new Error('Zip file is already open');

         const zip = new StreamUnzip.async({file: zipFile, skipEntryNameValidation: true});
         
        if (zipEntries)
            this.zipEntries = await zip.entries();

         this.zip = zip;
         this.zipFile = zipFile;
    }

    get entries() {
        this.checkState();

        return this.zipEntries;
    }

    //если запись сжата неподдерживаемым методом, пробуем внешний 7z
    fallbackOrThrow(e) {
        if (!isUnsupportedMethod(e))
            throw e;

        const cmd = findSevenZip();
        if (!cmd)
            throw new Error(`${e.message}. Install 7-Zip (7z) to read such archives`);

        return cmd;
    }

    async extractToBuf(entryFilePath) {
        this.checkState();

        try {
            return await this.zip.entryData(entryFilePath);
        } catch (e) {
            const cmd = this.fallbackOrThrow(e);
            return await sevenZipToBuf(cmd, this.zipFile, entryFilePath);
        }
    }

    async extractToFile(entryFilePath, outputFile) {
        this.checkState();

        try {
            await this.zip.extract(entryFilePath, outputFile);
        } catch (e) {
            const cmd = this.fallbackOrThrow(e);
            await fs.writeFile(outputFile, await sevenZipToBuf(cmd, this.zipFile, entryFilePath));
        }
    }

    async extractAllToDir(outputDir) {
        this.checkState();

        try {
            await this.zip.extract(null, outputDir);
        } catch (e) {
            const cmd = this.fallbackOrThrow(e);

            await fs.ensureDir(outputDir);
            await new Promise((resolve, reject) => {
                execFile(cmd, ['x', '-y', '-bd', '-bso0', '-bse0', `-o${outputDir}`, this.zipFile],
                    {maxBuffer: MAX_BUF}, (err) => err ? reject(err) : resolve());
            });
        }
    }

    async close() {
        if (this.zip) {
            await this.zip.close();
            this.zip = null;
            this.zipFile = null;
            this.zipEntries = undefined;
        }
    }
}

module.exports = ZipReader;
