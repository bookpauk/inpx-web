const fs = require('fs-extra');

const utils = require('./utils');

//поправить в случае, если изменился порядок формирования id для авторов в DbCreator
//иначе будет неправильно работать кеширование на клиенте
const dbCreatorVersion = '1';

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
}

module.exports = InpxHashCreator;