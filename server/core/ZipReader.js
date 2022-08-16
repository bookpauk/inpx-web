const StreamZip = require('node-stream-zip');

class ZipReader {
    constructor() {
        this.zip = null;
    }

    checkState() {
        if (!this.zip)
            throw new Error('Zip closed');
    }

    async open(zipFile) {
        if (this.zip)
            throw new Error('Zip file is already open');

         const zip = new StreamZip.async({file: zipFile});
         
         this.zipEntries = await zip.entries();

         this.zip = zip;
    }

    get entries() {
        this.checkState();

        return this.zipEntries;
    }

    async extractToBuf(entryFilePath) {
        this.checkState();

        return await this.zip.entryData(entryFilePath);
    }

    async extractToFile(entryFilePath, outputFile) {
        this.checkState();

        await this.zip.extract(entryFilePath, outputFile);
    }

    async extractAllToDir(outputDir) {
        this.checkState();

        await this.zip.extract(null, outputDir);
    }

    close() {
        if (this.zip) {
            this.zip.close();
            this.zip = null;
            this.zipEntries = null;
        }
    }
}

module.exports = ZipReader;