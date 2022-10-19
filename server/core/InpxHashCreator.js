const fs = require('fs-extra');

const utils = require('./utils');

//поправить в случае, если были критические изменения в DbCreator
//иначе будет рассинхронизация между сервером и клиентом на уровне БД
const dbCreatorVersion = '3';

class InpxHashCreator {
    constructor(config) {
        this.config = config;
    }

    async getHash() {
        const config = this.config;

        let inpxFilterHash = '';
        if (await fs.pathExists(config.inpxFilterFile))
            inpxFilterHash = await utils.getFileHash(config.inpxFilterFile, 'sha256', 'hex');

        const joinedHash = dbCreatorVersion + inpxFilterHash +
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