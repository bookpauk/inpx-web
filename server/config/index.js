const _ = require('lodash');
const path = require('path');
const fs = require('fs-extra');

const branchFilename = __dirname + '/application_env';

const propsToSave = [
    'accessPassword',
    'extendedSearch',
    'bookReadLink',
    'loggingEnabled',
    'dbCacheSize',
    'maxFilesDirSize',
    'queryCacheEnabled',
    'cacheCleanInterval',
    'inpxCheckInterval',
    'lowMemoryMode',
    'allowRemoteLib',
    'remoteLib',
    'server',
];

let instance = null;

//singleton
class ConfigManager {
    constructor() {    
        if (!instance) {
            this.inited = false;

            instance = this;
        }

        return instance;
    }

    async init(dataDir) {
        if (this.inited)
            throw new Error('already inited');

        this.branch = 'production';
        try {
            await fs.access(branchFilename);
            this.branch = (await fs.readFile(branchFilename, 'utf8')).trim();
        } catch (err) {
            //
        }

        process.env.NODE_ENV = this.branch;

        this.branchConfigFile = __dirname + `/${this.branch}.js`;
        const config = require(this.branchConfigFile);

        if (dataDir) {
            config.dataDir = path.resolve(dataDir);
        } else {
            config.dataDir = `${config.execDir}/.${config.name}`;
        }

        await fs.ensureDir(config.dataDir);
        this._userConfigFile = `${config.dataDir}/config.json`;
        this._config = config;

        this.inited = true;
    }

    get config() {
        if (!this.inited)
            throw new Error('not inited');
        return _.cloneDeep(this._config);
    }

    set config(value) {
        Object.assign(this._config, value);
    }

    get userConfigFile() {
        return this._userConfigFile;
    }

    set userConfigFile(value) {
        if (value)
            this._userConfigFile = value;
    }

    async load() {
        try {
            if (!this.inited)
                throw new Error('not inited');

            if (await fs.pathExists(this.userConfigFile)) {
                const data = JSON.parse(await fs.readFile(this.userConfigFile, 'utf8'));
                const config = _.pick(data, propsToSave);

                this.config = config;

                //сохраним конфиг, если не все атрибуты присутствуют в файле конфига
                for (const prop of propsToSave)
                    if (!Object.prototype.hasOwnProperty.call(config, prop)) {
                        await this.save();
                        break;
                    }
            } else {
                await this.save();
            }
        } catch(e) {
            throw new Error(`Error while loading "${this.userConfigFile}": ${e.message}`);
        }
    }

    async save() {
        if (!this.inited)
            throw new Error('not inited');

        const dataToSave = _.pick(this._config, propsToSave);
        await fs.writeFile(this.userConfigFile, JSON.stringify(dataToSave, null, 4));
    }
}

module.exports = ConfigManager;