const { Worker } = require('worker_threads');

class CalcThread {
    constructor() {
        this.worker = null;
        this.listeners = new Map();
        this.requestId = 0;

        this.runWorker();
    }

    terminate() {
        if (this.worker) {
            this.worker.terminate();

            for (const listener of this.listeners.values()) {
                listener({error: 'Worker terminated'});
            }
        }
        this.worker = null;
    }

    runWorker() {
        const workerProc = () => {
            const { parentPort } = require('worker_threads');

            const sleep = (ms) => {
                return new Promise(resolve => setTimeout(resolve, ms));
            };

            if (parentPort) {
                parentPort.on('message', async(mes) => {
                    let result = {};
                    try {
                        const fn = new Function(`'use strict'; return ${mes.fn}`)();
                        result.result = await fn(mes.args, sleep);
                    } catch (e) {
                        result = {error: e.message};
                    }

                    result.requestId = mes.requestId;
                    parentPort.postMessage(result);
                });
            }
        };

        const worker = new Worker(`const wp = ${workerProc.toString()}; wp();`, {eval: true});

        worker.on('message', (mes) => {
            const listener = this.listeners.get(mes.requestId);
            if (listener) {
                this.listeners.delete(mes.requestId);
                listener(mes);
            }
        });

        worker.on('error', (err) => {
            console.error(err);
        });

        worker.on('exit', () => {
            this.terminate();
        });

        this.worker = worker;
    }    

    //async
    run(params) {//args, fn
        return new Promise((resolve, reject) => {
            this.requestId++;

            this.listeners.set(this.requestId, (mes) => {
                if (mes.error)
                    reject(new Error(mes.error));
                else
                    resolve(mes.result);
            });

            if (this.worker) {
                this.worker.postMessage({requestId: this.requestId, args: params.args, fn: params.fn.toString()});
            } else {
                reject(new Error('Worker does not exist'));
            }
        });
    }
}

//singleton
let instance = null;

class HeavyCalc {
    constructor(opts = {}) {
        const singleton = opts.singleton || false;

        if (singleton && instance)
            return instance;

        this.threads = opts.threads || 1;
        this.terminated = false;

        this.workers = [];
        this.load = [];
        for (let i = 0; i < this.threads; i++) {
            const worker = new CalcThread();
            this.workers.push(worker);
            this.load.push(0);
        }

        if (singleton) {
            instance = this;
        }
    }

    async run(params) {
        if (this.terminated || !this.workers.length)
            throw new Error('All workers terminated');

        //находим поток с минимальной нагрузкой
        let found = 0;
        for (let i = 1; i < this.load.length; i++) {
            if (this.load[i] < this.load[found])
                found = i;
        }

        try {
            this.load[found]++;
            return await this.workers[found].run(params);
        } finally {
            this.load[found]--;
        }
    }

    terminate() {
        for (let i = 0; i < this.workers.length; i++) {
            this.workers[i].terminate();
        }
        this.workers = [];
        this.load = [];
        this.terminated = true;
    }
}

module.exports = HeavyCalc;