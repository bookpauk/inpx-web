const fs = require('fs-extra');

const WorkerState = require('./WorkerState');
const { JembaDbThread } = require('jembadb');
const DbCreator = require('./DbCreator');

const ayncExit = new (require('./AsyncExit'))();
const log = new (require('./AppLogger'))().log;//singleton

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

            ayncExit.add(this.closeDb.bind(this));

            this.loadOrCreateDb();//no await

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
        log('Creating search DB');

        const config = this.config;

        if (await fs.pathExists(dbPath))
            throw new Error(`createDb.pathExists: ${dbPath}`);

        const db = new JembaDbThread();
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

            let fileName = '';
            await dbCreator.run(db, (state) => {
                this.setMyState(ssDbCreating, state);

                if (state.fileName && state.fileName !== fileName) {
                    fileName = state.fileName;
                    log(`  load ${fileName}`);
                }
                if (state.recsLoaded)
                    log(`  processed ${state.recsLoaded} records`);
            });

            log('  finish INPX import');
        } finally {
            await db.unlock();
            log('Search DB created');
        }
    }

    async loadOrCreateDb() {
        this.setMyState(ssDbLoading);

        try {
            const config = this.config;
            const dbPath = `${config.dataDir}/db`;

            //пересоздаем БД из INPX если нужно
            if (config.recreateDb)
                await fs.remove(dbPath);

            if (!await fs.pathExists(dbPath)) {
                await this.createDb(dbPath);
            }

            //загружаем БД
            this.setMyState(ssDbLoading);
            log('Open search DB');

            this.db = new JembaDbThread();
            await this.db.lock({
                dbPath,
                softLock: true,

                tableDefaults: {
                    cacheSize: 5,
                },
            });

            //открываем все таблицы
            await this.db.openAll();

            log('Search DB ready');
        } catch (e) {
            log(LM_FATAL, e.message);            
            ayncExit.exit(1);
        } finally {
            this.setMyState(ssNormal);
        }
    }
}

module.exports = WebWorker;