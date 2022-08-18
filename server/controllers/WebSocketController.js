const WebSocket = require ('ws');
const _ = require('lodash');

const WorkerState = require('../core/WorkerState');//singleton
const WebWorker = require('../core/WebWorker');//singleton
const log = new (require('../core/AppLogger'))().log;//singleton
//const utils = require('../core/utils');

const cleanPeriod = 1*60*1000;//1 минута
const closeSocketOnIdle = 5*60*1000;//5 минут

class WebSocketController {
    constructor(wss, config) {
        this.config = config;
        this.isDevelopment = (config.branch == 'development');

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

            switch (req.action) {
                case 'test':
                    await this.test(req, ws); break;
                case 'get-config':
                    await this.getConfig(req, ws); break;
                case 'get-worker-state':
                    await this.getWorkerState(req, ws); break;
                case 'search':
                    await this.search(req, ws); break;

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
                log(`WebSocket-OUT: ${message.substr(0, 4000)}`);
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

    async search(req, ws) {
        if (!req.query)
            throw new Error(`query is empty`);

        const result = await this.webWorker.search(req.query);

        this.send(result, req, ws);
    }
}

module.exports = WebSocketController;
