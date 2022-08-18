const os = require('os');
const fs = require('fs-extra');

const WorkerState = require('./WorkerState');
const { JembaDbThread } = require('jembadb');
const DbCreator = require('./DbCreator');
const DbSearcher = require('./DbSearcher');

const ayncExit = new (require('./AsyncExit'))();
const log = new (require('./AppLogger'))().log;//singleton
const utils = require('./utils');

//server states
const ssNormal = 'normal';
const ssDbLoading = 'db_loading';
const ssDbCreating = 'db_creating';

const stateToText = {
    [ssNormal]: '',
    [ssDbLoading]: 'Загрузка поисковой базы',
    [ssDbCreating]: 'Создание поисковой базы',
};

//singleton
let instance = null;

class WebWorker {
    constructor(config) {
        if (!instance) {
            this.config = config;
            this.workerState = new WorkerState();
            
            this.wState = this.workerState.getControl('server_state');
            this.myState = '';
            this.db = null;
            this.dbSearcher = null;

            ayncExit.add(this.closeDb.bind(this));

            this.loadOrCreateDb();//no await
            this.logServerStats();//no await

            instance = this;
        }

        return instance;
    }

    checkMyState() {
        if (this.myState != ssNormal)
            throw new Error('server_busy');
    }

    setMyState(newState, workerState = {}) {
        this.myState = newState;
        this.wState.set(Object.assign({}, workerState, {
            state: newState,
            serverMessage: stateToText[newState]
        }));
    }

    async closeDb() {
        if (this.db) {
            await this.db.unlock();
            this.db = null;
        }
    }

    async createDb(dbPath) {
        this.setMyState(ssDbCreating);
        log('Searcher DB create start');

        const config = this.config;

        if (await fs.pathExists(dbPath))
            throw new Error(`createDb.pathExists: ${dbPath}`);

        const db = new JembaDbThread();//создаем не в потоке, чтобы лучше работал GC
        await db.lock({
            dbPath,
            create: true,
            softLock: true,

            tableDefaults: {
                cacheSize: 5,
            },
        });

        try {
            log('  start INPX import');
            const dbCreator = new DbCreator(config);        

            await dbCreator.run(db, (state) => {
                this.setMyState(ssDbCreating, state);

                if (state.fileName)
                    log(`  load ${state.fileName}`);
                if (state.recsLoaded)
                    log(`  processed ${state.recsLoaded} records`);
                if (state.job)
                    log(`  ${state.job}`);
            });

            log('  finish INPX import');
        } finally {
            await db.unlock();
            log('Searcher DB successfully created');
        }
    }

    async loadOrCreateDb(recreate = false) {
        this.setMyState(ssDbLoading);

        try {
            const config = this.config;
            const dbPath = `${config.dataDir}/db`;

            //пересоздаем БД из INPX если нужно
            if (config.recreateDb || recreate)
                await fs.remove(dbPath);

            if (!await fs.pathExists(dbPath)) {
                await this.createDb(dbPath);
                await utils.freeMemory();
            }

            //загружаем БД
            this.setMyState(ssDbLoading);
            log('Searcher DB loading');

            const db = new JembaDbThread();
            await db.lock({
                dbPath,
                softLock: true,

                tableDefaults: {
                    cacheSize: 5,
                },
            });

            //открываем все таблицы
            await db.openAll();

            //закроем title для экономии памяти, откроем при необходимости
            await db.close({table: 'title'});
            this.titleOpen = false;

            this.dbSearcher = new DbSearcher(db);

            db.wwCache = {};            
            this.db = db;

            log('Searcher DB is ready');
        } catch (e) {
            log(LM_FATAL, e.message);            
            ayncExit.exit(1);
        } finally {
            this.setMyState(ssNormal);
        }
    }

    async dbConfig() {
        this.checkMyState();

        const db = this.db;
        if (!db.wwCache.config) {
            const rows = await db.select({table: 'config'});
            const config = {};

            for (const row of rows) {
                config[row.id] = row.value;
            }

            db.wwCache.config = config;
        }

        return db.wwCache.config;
    }

    async search(query) {
        this.checkMyState();

        const config = await this.dbConfig();
        const result = await this.dbSearcher.search(query);

        return {
            author: result.result,
            totalFound: result.totalFound,
            inpxHash: (config.inpxHash ? config.inpxHash : ''),
        };
    }    

    async logServerStats() {
        while (1) {// eslint-disable-line
            try {
                const memUsage = process.memoryUsage().rss/(1024*1024);//Mb
                let loadAvg = os.loadavg();
                loadAvg = loadAvg.map(v => v.toFixed(2));

                log(`Server info [ memUsage: ${memUsage.toFixed(2)}MB, loadAvg: (${loadAvg.join(', ')}) ]`);
            } catch (e) {
                log(LM_ERR, e.message);
            }
            await utils.sleep(5000);
        }
    }
}

module.exports = WebWorker;