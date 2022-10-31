const fs = require('fs-extra');
const path = require('path');
const utils = require('./utils');

const FileDownloader = require('./FileDownloader');
const WebSocketConnection = require('./WebSocketConnection');
const InpxHashCreator = require('./InpxHashCreator');
const log = new (require('./AppLogger'))().log;//singleton

//singleton
let instance = null;

class RemoteLib {
    constructor(config) {
        if (!instance) {
            this.config = config;

            this.wsc = new WebSocketConnection(config.remoteLib.url, 10, 30, {rejectUnauthorized: false});
            if (config.remoteLib.accessPassword)
                this.accessToken = utils.getBufHash(config.remoteLib.accessPassword, 'sha256', 'hex');

            this.remoteHost = config.remoteLib.url.replace(/^ws:\/\//, 'http://').replace(/^wss:\/\//, 'https://');

            this.down = new FileDownloader(config.maxPayloadSize*1024*1024);
            this.inpxHashCreator = new InpxHashCreator(config);
            this.inpxFileHash = '';

            instance = this;
        }

        return instance;
    }

    async wsRequest(query) {
        if (this.accessToken)
            query.accessToken = this.accessToken;

        const response = await this.wsc.message(
            await this.wsc.send(query),
            120
        );

        if (response.error)
            throw new Error(response.error);

        return response;
    }

    async downloadInpxFile() {
        if (!this.inpxFileHash)
            this.inpxFileHash = await this.inpxHashCreator.getInpxFileHash();

        const response = await this.wsRequest({action: 'get-inpx-file', inpxFileHash: this.inpxFileHash});

        if (response.data) {
            await fs.writeFile(this.config.inpxFile, response.data, 'base64');
            this.inpxFileHash = '';
        }
    }

    async downloadBook(bookPath, downFileName) {
        try {
            const response = await await this.wsRequest({action: 'get-book-link', bookPath, downFileName});
            const link = response.link;

            const buf = await this.down.load(`${this.remoteHost}${link}`, {decompress: false});

            const publicPath = `${this.config.publicFilesDir}${link}`;
            
            await fs.writeFile(publicPath, buf);

            return path.basename(link);
        } catch (e) {
            log(LM_ERR, `RemoteLib.downloadBook: ${e.message}`);
            throw new Error('502 Bad Gateway');
        }
    }
}

module.exports = RemoteLib;