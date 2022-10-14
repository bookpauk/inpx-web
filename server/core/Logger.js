/*
  Журналирование с буферизацией вывода
*/
const fs = require('fs-extra');
const ayncExit = new (require('./AsyncExit'))();

const sleep = (ms) => { return new Promise(resolve => setTimeout(resolve, ms)) };

global.LM_OK = 0;
global.LM_INFO = 1;
global.LM_WARN = 2;
global.LM_ERR = 3;
global.LM_FATAL = 4;
global.LM_TOTAL = 5;

const LOG_CACHE_BUFFER_SIZE  = 8192;
const LOG_BUFFER_FLUSH_INTERVAL = 200;

const LOG_ROTATE_FILE_LENGTH = 1000000;
const LOG_ROTATE_FILE_DEPTH  = 9;
const LOG_ROTATE_FILE_CHECK_INTERVAL = 60000;

let msgTypeToStr = {
    [LM_OK]:    '   OK',
    [LM_INFO]:  ' INFO',
    [LM_WARN]:  ' WARN',
    [LM_ERR]:   'ERROR',
    [LM_FATAL]: 'FATAL ERROR',
    [LM_TOTAL]: 'TOTAL'
};

class BaseLog {

    constructor(params) {
        this.params = params;
        this.exclude = new Set(params.exclude);
        this.outputBufferLength = 0;
        this.outputBuffer = [];
        this.flushing = false;
    }
    
    async flush() {
        if (this.flushing || !this.outputBufferLength)
            return;
        this.flushing = true;

        this.data = this.outputBuffer;
        this.outputBufferLength = 0;
        this.outputBuffer = [];

        await this.flushImpl(this.data)
            .catch(e => { console.error(`Logger error: ${e}`); ayncExit.exit(1); } );
        this.flushing = false;
    }

    log(msgType, message) {
        if (this.closed)
            return;

        if (!this.exclude.has(msgType)) {
            this.outputBuffer.push(message);
            this.outputBufferLength += message.length;

            if (this.outputBufferLength >= LOG_CACHE_BUFFER_SIZE && !this.flushing) {
                this.flush();
            }

            if (!this.iid) {
                this.iid = setInterval(() => {
                    if (!this.flushing) {
                        clearInterval(this.iid);
                        this.iid = 0;
                        this.flush();
                    }
                }, LOG_BUFFER_FLUSH_INTERVAL);
            }
        }
    }

    async close() {
        if (this.closed)
            return;

        if (this.iid)
            clearInterval(this.iid);

        try {
            while (this.outputBufferLength) {
                await this.flush();
                await sleep(1);
            }
        } catch(e) {
            console.log(e);
            ayncExit.exit(1);
        }
        this.outputBufferLength = 0;
        this.outputBuffer = [];
        this.closed = true;
    }
}

class FileLog extends BaseLog {
    
    constructor(params) {
        super(params);
        this.fileName = params.fileName;
        this.fd = fs.openSync(this.fileName, 'a');
        this.rcid = 0;
    }

    async close() {
        if (this.closed)
            return;
        await super.close();
        if (this.fd) {
            await fs.close(this.fd);
            this.fd = null;
        }
        if (this.rcid)
            clearTimeout(this.rcid);
    }

    async rotateFile(fileName, i) {
        let fn = fileName;
        if (i > 0)
            fn += `.${i}`;
        let tn = fileName + '.' + (i + 1);
        let exists = await fs.access(tn).then(() => true).catch(() => false);
        if (exists) {
            if (i >= LOG_ROTATE_FILE_DEPTH - 1) {
                await fs.unlink(tn);
            } else {
                await this.rotateFile(fileName, i + 1);
            }
        }
        await fs.rename(fn, tn);
    }

    async doFileRotationIfNeeded() {
        this.rcid = 0;

        let stat = await fs.fstat(this.fd);
        if (stat.size > LOG_ROTATE_FILE_LENGTH) {
            await fs.close(this.fd);
            await this.rotateFile(this.fileName, 0);
            this.fd = await fs.open(this.fileName, "a");
        }
    }

    async flushImpl(data) {
        if (this.closed)
            return;

        if (!this.rcid) {
            await this.doFileRotationIfNeeded();
            this.rcid = setTimeout(() => {
                this.rcid = 0;
            }, LOG_ROTATE_FILE_CHECK_INTERVAL);
        }

        if (this.fd)
            await fs.write(this.fd, Buffer.from(data.join('')));
    }
}

class ConsoleLog extends BaseLog {
    async flushImpl(data) {
        process.stdout.write(data.join(''));
    }
}

//------------------------------------------------------------------
const factory = {
    ConsoleLog,
    FileLog,
};

class Logger {

    constructor(params = null) {
        this.handlers = [];
        if (params) {
            params.forEach((logParams) => {
                let className = logParams.log;
                let loggerClass = factory[className];
                this.handlers.push(new loggerClass(logParams));
            });
        }

        this.closed = false;
        ayncExit.onSignal((signal, err) => {
            this.log(LM_FATAL, `Signal "${signal}" received, error: "${(err.stack ? err.stack : err)}", exiting...`);
        });
        ayncExit.addAfter(this.close.bind(this));
    }

    formatDate(date) {
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ` +
            `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}.` +
            `${date.getMilliseconds().toString().padStart(3, '0')}`;
    }

    prepareMessage(msgType, message) {
        return this.formatDate(new Date()) + ` ${msgTypeToStr[msgType]}: ${message}\n`;
    }

    log(msgType, message) {
        if (message == null) {
            message = msgType;
            msgType = LM_INFO;
        }

        const mes = this.prepareMessage(msgType, message);

        if (!this.closed) {
            for (let i = 0; i < this.handlers.length; i++)
                this.handlers[i].log(msgType, mes);
        } else {
            console.log(mes);
        }

        return mes;
    }

    async close() {
        for (let i = 0; i < this.handlers.length; i++)
            await this.handlers[i].close();
        this.closed = true;
    }
}

module.exports = Logger;