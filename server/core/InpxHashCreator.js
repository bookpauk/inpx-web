const fs = require('fs-extra');

const utils = require('./utils');

class InpxHashCreator {
    constructor(config) {
        this.config = config;
    }

    async getHash() {
        const config = this.config;

        let inpxFilterHash = '';
        if (await fs.pathExists(config.inpxFilterFile))
            inpxFilterHash = await utils.getFileHash(config.inpxFilterFile, 'sha256', 'hex');

        const joinedHash = this.config.dbVersion + inpxFilterHash +
            await utils.getFileHash(config.inpxFile, 'sha256', 'hex');

        return utils.getBufHash(joinedHash, 'sha256', 'hex');
    }

    async getInpxFileHash() {
        return (
            await fs.pathExists(this.config.inpxFile) ?
            await utils.getFileHash(this.config.inpxFile, 'sha256', 'hex') :
            ''
        );
    }
}

module.exports = InpxHashCreator;