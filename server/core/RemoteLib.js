const fs = require('fs-extra');
const utils = require('./utils');

const WebSocketConnection = require('./WebSocketConnection');

//singleton
let instance = null;

class RemoteLib {
    constructor(config) {
        if (!instance) {
            this.config = config;

            this.wsc = new WebSocketConnection(config.remoteLib.url, 10, 30, {rejectUnauthorized: false});
            if (config.remoteLib.accessPassword)
                this.accessToken = utils.getBufHash(config.remoteLib.accessPassword, 'sha256', 'hex');

            this.inpxFile = `${config.tempDir}/${utils.randomHexString(20)}`;
            this.lastUpdateTime = 0;

            instance = this;
        }

        return instance;
    }

    async wsRequest(query) {
        if (this.accessToken)
            query.accessToken = this.accessToken;

        const response = await this.wsc.message(
            await this.wsc.send(query, 60),
            60
        );

        if (response.error)
            throw new Error(response.error);

        return response;
    }

    async getInpxFile(getPeriod = 0) {
        if (getPeriod && Date.now() - this.lastUpdateTime < getPeriod)
            return this.inpxFile;

        const response = await this.wsRequest({action: 'get-inpx-file'});

        await fs.writeFile(this.inpxFile, response.data, 'base64');

        this.lastUpdateTime = Date.now();

        return this.inpxFile;
    }
}

module.exports = RemoteLib;