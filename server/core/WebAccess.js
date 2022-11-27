const { JembaDbThread } = require('jembadb');
const utils = require('../core/utils');
const log = new (require('../core/AppLogger'))().log;//singleton
const asyncExit = new (require('./AsyncExit'))();

const cleanPeriod = 1*60*1000;//1 минута
const cleanUnusedTokenTimeout = 5*60*1000;//5 минут

class WebAccess {
    constructor(config) {
        this.config = config;

        this.freeAccess = (config.accessPassword === '');
        this.accessTimeout = config.accessTimeout*60*1000;
        this.accessMap = new Map();

        asyncExit.add(this.closeDb.bind(this));

        setTimeout(() => { this.periodicClean(); }, cleanPeriod);
    }

    async init() {
        const config = this.config;
        const dbPath = `${config.dataDir}/web-access`;
        const db = new JembaDbThread();//в отдельном потоке
        await db.lock({
            dbPath,
            create: true,
            softLock: true,

            tableDefaults: {
                cacheSize: config.dbCacheSize,
            },
        });

        try {
            //открываем таблицы
            await db.openAll();
        } catch(e) {
            if (
                e.message.indexOf('corrupted') >= 0 
                || e.message.indexOf('Unexpected token') >= 0
                || e.message.indexOf('invalid stored block lengths') >= 0
            ) {
                log(LM_ERR, `DB ${dbPath} corrupted`);
                log(`Open "${dbPath}" with auto repair`);
                await db.openAll({autoRepair: true});
            } else {
                throw e;
            }
        }

        await db.create({table: 'access', quietIfExists: true});
        //проверим, нужно ли обнулить таблицу access
        const pass = utils.getBufHash(this.config.accessPassword, 'sha256', 'hex');
        await db.create({table: 'config', quietIfExists: true});
        let rows = await db.select({table: 'config', where: `@@id('pass')`});

        if (!rows.length || rows[0].value !== pass) {
            //пароль сменился в конфиге, обнуляем токены
            await db.truncate({table: 'access'});
            await db.insert({table: 'config', replace: true, rows: [{id: 'pass', value: pass}]});
        }

        //загрузим токены сессий
        rows = await db.select({table: 'access'});
        for (const row of rows)
            this.accessMap.set(row.id, row.value);

        this.db = db;
    }

    async closeDb() {
        if (this.db) {
            await this.db.unlock();
            this.db = null;
        }
    }

    async periodicClean() {
        while (1) {//eslint-disable-line no-constant-condition
            try {
                const now = Date.now();

                //почистим accessMap
                if (!this.freeAccess) {
                    for (const [accessToken, accessRec] of this.accessMap) {
                        if (   !(accessRec.used > 0 || now - accessRec.time < cleanUnusedTokenTimeout)
                            || !(this.accessTimeout === 0 || now - accessRec.time < this.accessTimeout)
                            ) {
                            await this.deleteAccess(accessToken);
                        } else if (!accessRec.saved) {
                            await this.saveAccess(accessToken);
                        }
                    }
                }

            } catch(e) {
                log(LM_ERR, `WebAccess.periodicClean error: ${e.message}`);
            }
            
            await utils.sleep(cleanPeriod);
        }
    }

    async hasAccess(accessToken) {
        if (this.freeAccess)
            return true;

        const accessRec = this.accessMap.get(accessToken);
        if (accessRec) {
            const now = Date.now();

            if (this.accessTimeout === 0 || now - accessRec.time < this.accessTimeout) {
                accessRec.used++;
                accessRec.time = now;
                accessRec.saved = false;
                if (accessRec.used === 1)
                    await this.saveAccess(accessToken);
                return true;
            }
        }

        return false;
    }

    async deleteAccess(accessToken) {
        await this.db.delete({table: 'access', where: `@@id(${this.db.esc(accessToken)})`});
        this.accessMap.delete(accessToken);
    }

    async saveAccess(accessToken) {
        const value = this.accessMap.get(accessToken);
        if (!value || value.saved)
            return;

        value.saved = true;
        await this.db.insert({
            table: 'access',
            replace: true,
            rows: [{id: accessToken, value}]
        });
    }

    newToken() {
        const salt = utils.randomHexString(32);
        const accessToken = utils.getBufHash(this.config.accessPassword + salt, 'sha256', 'hex');
        this.accessMap.set(accessToken, {time: Date.now(), used: 0});

        return salt;
    }
}

module.exports = WebAccess;