const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const zlib = require('zlib');
const _ = require('lodash');

const ZipReader = require('./ZipReader');
const WorkerState = require('./WorkerState');
const { JembaDbThread } = require('jembadb');
const DbCreator = require('./DbCreator');
const DbSearcher = require('./DbSearcher');

const ayncExit = new (require('./AsyncExit'))();
const log = new (require('./AppLogger'))().log;//singleton
const utils = require('./utils');
const genreTree = require('./genres');

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

            log('Searcher DB successfully created');
        } finally {
            await db.unlock();
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
                utils.freeMemory();
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

            this.dbSearcher = new DbSearcher(config, db);

            db.wwCache = {};            
            this.db = db;

            log('Searcher DB ready');
        } catch (e) {
            log(LM_FATAL, e.message);            
            ayncExit.exit(1);
        } finally {
            this.setMyState(ssNormal);
        }
    }

    async recreateDb() {
        this.setMyState(ssDbCreating);

        if (this.dbSearcher) {
            await this.dbSearcher.close();
            this.dbSearcher = null;
        }

        await this.closeDb();

        await this.loadOrCreateDb(true);
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

    async getBookList(authorId) {
        this.checkMyState();

        return await this.dbSearcher.getBookList(authorId);
    }

    async getGenreTree() {
        this.checkMyState();

        const config = await this.dbConfig();

        let result;
        const db = this.db;
        if (!db.wwCache.genres) {
            const genres = _.cloneDeep(genreTree);
            const last = genres[genres.length - 1];

            const genreValues = new Set();
            for (const section of genres) {
                for (const g of section.value)
                    genreValues.add(g.value);
            }

            //добавим к жанрам те, что нашлись при парсинге
            const genreParsed = new Set();
            let rows = await db.select({table: 'genre', map: `(r) => ({value: r.value})`});
            for (const row of rows) {
                genreParsed.add(row.value);

                if (!genreValues.has(row.value))
                    last.value.push({name: row.value, value: row.value});
            }

            //уберем те, которые не нашлись при парсинге
            for (let j = 0; j < genres.length; j++) {
                const section = genres[j];
                for (let i = 0; i < section.value.length; i++) {
                    const g = section.value[i];
                    if (!genreParsed.has(g.value))
                        section.value.splice(i--, 1);
                }

                if (!section.value.length)
                    genres.splice(j--, 1);
            }

            // langs
            rows = await db.select({table: 'lang', map: `(r) => ({value: r.value})`});
            const langs = rows.map(r => r.value);            

            result = {
                genreTree: genres,
                langList: langs,
                inpxHash: (config.inpxHash ? config.inpxHash : ''),
            };

            db.wwCache.genres = result;
        } else {
            result = db.wwCache.genres;
        }

        return result;
    }

    async extractBook(bookPath) {
        const tempDir = this.config.tempDir;
        const outFile = `${tempDir}/${utils.randomHexString(30)}`;

        const folder = `${this.config.libDir}/${path.dirname(bookPath)}`;
        const file = path.basename(bookPath);

        const zipReader = new ZipReader();
        await zipReader.open(folder);

        try {
            await zipReader.extractToFile(file, outFile);
            return outFile;
        } finally {
            await zipReader.close();
        }
    }

    async gzipFile(inputFile, outputFile, level = 1) {
        return new Promise((resolve, reject) => {
            const gzip = zlib.createGzip({level});
            const input = fs.createReadStream(inputFile);
            const output = fs.createWriteStream(outputFile);

            input.pipe(gzip).pipe(output).on('finish', (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    async restoreBook(bookPath) {
        const db = this.db;

        const extractedFile = await this.extractBook(bookPath);

        const hash = await utils.getFileHash(extractedFile, 'sha256', 'hex');
        const link = `/files/${hash}`;
        const publicPath = `${this.config.publicDir}${link}`;

        if (!await fs.pathExists(publicPath)) {
            await fs.ensureDir(path.dirname(publicPath));
            await this.gzipFile(extractedFile, publicPath, 4);
        } else {
            await fs.remove(extractedFile);
        }

        await db.insert({
            table: 'file_hash',
            replace: true,
            rows: [
                {id: bookPath, hash},
                {id: hash, bookPath}
            ]
        });

        return link;
    }

    async getBookLink(bookPath) {
        this.checkMyState();

        try {
            const db = this.db;
            let link = '';

            //найдем хеш
            const rows = await db.select({table: 'file_hash', where: `@@id(${db.esc(bookPath)})`});
            if (rows.length) {//хеш найден по bookPath
                const hash = rows[0].hash;
                link = `/files/${hash}`;
                const publicPath = `${this.config.publicDir}${link}`;

                if (!await fs.pathExists(publicPath)) {
                    link = '';
                }
            }

            if (!link) {
                link = await this.restoreBook(bookPath)
            }

            if (!link)
                throw new Error('404 Файл не найден');

            return {link};
        } catch(e) {
            log(LM_ERR, `getBookLink error: ${e.message}`);
            if (e.message.indexOf('ENOENT') >= 0)
                throw new Error('404 Файл не найден');
            throw e;
        }
    }

    async restoreBookFile(publicPath) {
        try {
            const db = this.db;
            const hash = path.basename(publicPath);

            //найдем bookPath
            const rows = await db.select({table: 'file_hash', where: `@@id(${db.esc(hash)})`});        
            if (rows.length) {//bookPath найден по хешу
                const bookPath = rows[0].bookPath;
                await this.restoreBook(bookPath);
            } else {//bookPath не найден
                throw new Error('404 Файл не найден');
            }
        } catch(e) {
            log(LM_ERR, `restoreBookFile error: ${e.message}`);
            if (e.message.indexOf('ENOENT') >= 0)
                throw new Error('404 Файл не найден');
            throw e;
        }
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
            await utils.sleep(5*1000);
        }
    }
}

module.exports = WebWorker;