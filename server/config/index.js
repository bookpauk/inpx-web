const _ = require('lodash');
const fs = require('fs-extra');

const branchFilename = __dirname + '/application_env';

const propsToSave = [
    'accessPassword',
    'bookReadLink',
    'loggingEnabled',
    'maxFilesDirSize',
    'queryCacheEnabled',
    'cacheCleanInterval',
    'lowMemoryMode',
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

    async init() {
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
        this._config = require(this.branchConfigFile);

        await fs.ensureDir(this._config.dataDir);
        this._userConfigFile = `${this._config.dataDir}/config.json`;

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
        if (!this.inited)
            throw new Error('not inited');
        if (!await fs.pathExists(this.userConfigFile)) {
            await this.save();
            return;
        }

        const data = await fs.readFile(this.userConfigFile, 'utf8');
        this.config = JSON.parse(data);
    }

    async save() {
        if (!this.inited)
            throw new Error('not inited');

        const dataToSave = _.pick(this._config, propsToSave);
        await fs.writeFile(this.userConfigFile, JSON.stringify(dataToSave, null, 4));
    }
}

module.exports = ConfigManager;