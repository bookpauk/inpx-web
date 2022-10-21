const fs = require('fs-extra');
const Logger = require('./Logger');

let instance = null;

//singleton
class AppLogger {
    constructor() {
        if (!instance) {
            this.inited = false;
            this.logFileName = '';
            this.errLogFileName = '';
            this.fatalLogFileName = '';

            instance = this;
        }

        return instance;
    }

    async init(config) {
        if (this.inited)
            throw new Error('already inited');

        let loggerParams = null;

        if (config.loggingEnabled) {
            await fs.ensureDir(config.logDir);

            this.logFileName = `${config.logDir}/${config.name}.log`;
            this.errLogFileName = `${config.logDir}/${config.name}.err.log`;
            this.fatalLogFileName = `${config.logDir}/${config.name}.fatal.log`;

            loggerParams = [
                {log: 'ConsoleLog'},
                {log: 'FileLog', fileName: this.logFileName},
                {log: 'FileLog', fileName: this.errLogFileName, exclude: [LM_OK, LM_INFO, LM_TOTAL]},
                {log: 'FileLog', fileName: this.fatalLogFileName, exclude: [LM_OK, LM_INFO, LM_WARN, LM_ERR, LM_TOTAL]},//LM_FATAL only
            ];
        } else {
            loggerParams = [
                {log: 'ConsoleLog'},
            ];
        }

        this._logger = new Logger(loggerParams);

        this.inited = true;
        return this.logger;
    }

    get logger() {
        if (!this.inited)
            throw new Error('not inited');
        return this._logger;
    }

    get log() {
        const l = this.logger;
        return l.log.bind(l);
    }
}

module.exports = AppLogger;
