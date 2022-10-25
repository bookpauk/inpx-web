const _ = require('lodash');
const WebSocket = require ('ws');

const WorkerState = require('../core/WorkerState');//singleton
const WebWorker = require('../core/WebWorker');//singleton
const log = new (require('../core/AppLogger'))().log;//singleton
const utils = require('../core/utils');

const cleanPeriod = 1*60*1000;//1 минута
const closeSocketOnIdle = 5*60*1000;//5 минут

class WebSocketController {
    constructor(wss, config) {
        this.config = config;
        this.isDevelopment = (config.branch == 'development');
        this.accessToken = '';
        if (config.accessPassword)
            this.accessToken = utils.getBufHash(config.accessPassword, 'sha256', 'hex');

        this.workerState = new WorkerState();
        this.webWorker = new WebWorker(config);

        this.wss = wss;

        wss.on('connection', (ws) => {
            ws.on('message', (message) => {
                this.onMessage(ws, message.toString());
            });

            ws.on('error', (err) => {
                log(LM_ERR, err);
            });
        });

        setTimeout(() => { this.periodicClean(); }, cleanPeriod);
    }

    periodicClean() {
        try {
            const now = Date.now();
            this.wss.clients.forEach((ws) => {
                if (!ws.lastActivity || now - ws.lastActivity > closeSocketOnIdle - 50) {
                    ws.terminate();
                }
            });
        } finally {
            setTimeout(() => { this.periodicClean(); }, cleanPeriod);
        }
    }

    async onMessage(ws, message) {
        let req = {};
        try {
            if (this.isDevelopment) {
                log(`WebSocket-IN:  ${message.substr(0, 4000)}`);
            }

            req = JSON.parse(message);

            ws.lastActivity = Date.now();
            
            //pong for WebSocketConnection
            this.send({_rok: 1}, req, ws);

            if (this.accessToken && req.accessToken !== this.accessToken) {
                await utils.sleep(1000);
                throw new Error('need_access_token');
            }

            switch (req.action) {
                case 'test':
                    await this.test(req, ws); break;
                case 'get-config':
                    await this.getConfig(req, ws); break;
                case 'get-worker-state':
                    await this.getWorkerState(req, ws); break;
                case 'author-search':
                    await this.authorSearch(req, ws); break;
                case 'get-author-book-list':
                    await this.getAuthorBookList(req, ws); break;
                case 'get-series-book-list':
                    await this.getSeriesBookList(req, ws); break;
                case 'get-genre-tree':
                    await this.getGenreTree(req, ws); break;
                case 'get-book-link':
                    await this.getBookLink(req, ws); break;

                case 'get-inpx-file':
                    await this.getInpxFile(req, ws); break;

                default:
                    throw new Error(`Action not found: ${req.action}`);
            }
        } catch (e) {
            this.send({error: e.message}, req, ws);
        }
    }

    send(res, req, ws) {
        if (ws.readyState == WebSocket.OPEN) {
            ws.lastActivity = Date.now();
            let r = res;
            if (req.requestId)
                r = Object.assign({requestId: req.requestId}, r);

            const message = JSON.stringify(r);
            ws.send(message);

            if (this.isDevelopment) {
                log(`WebSocket-OUT: ${message.substr(0, 200)}`);
            }

        }
    }

    //Actions ------------------------------------------------------------------
    async test(req, ws) {
        this.send({message: `${this.config.name} project is awesome`}, req, ws);
    }

    async getConfig(req, ws) {
        const config = _.pick(this.config, this.config.webConfigParams);
        config.dbConfig = await this.webWorker.dbConfig();

        this.send(config, req, ws);
    }

    async getWorkerState(req, ws) {
        if (!req.workerId)
            throw new Error(`key 'workerId' is empty`);

        const state = this.workerState.getState(req.workerId);
        this.send((state ? state : {}), req, ws);
    }

    async authorSearch(req, ws) {
        if (!req.query)
            throw new Error(`query is empty`);

        const result = await this.webWorker.authorSearch(req.query);

        this.send(result, req, ws);
    }

    async getAuthorBookList(req, ws) {
        const result = await this.webWorker.getAuthorBookList(req.authorId);

        this.send(result, req, ws);
    }

    async getSeriesBookList(req, ws) {
        const result = await this.webWorker.getSeriesBookList(req.series, req.seriesId);

        this.send(result, req, ws);
    }

    async getGenreTree(req, ws) {
        const result = await this.webWorker.getGenreTree();

        this.send(result, req, ws);
    }

    async getBookLink(req, ws) {
        if (!utils.hasProp(req, 'bookPath'))
            throw new Error(`bookPath is empty`);
        if (!utils.hasProp(req, 'downFileName'))
            throw new Error(`downFileName is empty`);    

        const result = await this.webWorker.getBookLink({bookPath: req.bookPath, downFileName: req.downFileName});

        this.send(result, req, ws);
    }

    async getInpxFile(req, ws) {
        if (!this.config.allowRemoteLib)
            throw new Error('Remote lib access disabled');

        const result = await this.webWorker.getInpxFile(req);

        this.send(result, req, ws);
    }

}

module.exports = WebSocketController;
