const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');

const ZipReader = require('./ZipReader');
const WorkerState = require('./WorkerState');//singleton
const { JembaDbThread } = require('jembadb');
const DbCreator = require('./DbCreator');
const DbSearcher = require('./DbSearcher');
const InpxHashCreator = require('./InpxHashCreator');
const RemoteLib = require('./RemoteLib');//singleton

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

const cleanDirPeriod = 60*60*1000;//каждый час

//singleton
let instance = null;

class WebWorker {
    constructor(config) {
        if (!instance) {
            this.config = config;
            this.workerState = new WorkerState();

            this.remoteLib = null;
            if (config.remoteLib) {
                this.remoteLib = new RemoteLib(config);
            }
            
            this.inpxHashCreator = new InpxHashCreator(config);
            this.inpxFileHash = '';

            this.wState = this.workerState.getControl('server_state');
            this.myState = '';
            this.db = null;
            this.dbSearcher = null;

            ayncExit.add(this.closeDb.bind(this));

            this.loadOrCreateDb();//no await
            this.periodicLogServerStats();//no await

            const dirConfig = [
                {
                    dir: `${this.config.publicDir}/files`,
                    maxSize: this.config.maxFilesDirSize,
                },
            ];

            this.periodicCleanDir(dirConfig);//no await
            this.periodicCheckInpx();//no await

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

            this.inpxFileHash = await this.inpxHashCreator.getInpxFileHash();

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

            this.logServerStats();
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

    async getSeriesBookList(seriesId) {
        this.checkMyState();

        return await this.dbSearcher.getSeriesBookList(seriesId);
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
        const outFile = `${this.config.tempDir}/${utils.randomHexString(30)}`;

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

    async restoreBook(bookPath, downFileName) {
        const db = this.db;

        let extractedFile = '';
        let hash = '';

        if (!this.remoteLib) {
            extractedFile = await this.extractBook(bookPath);
            hash = await utils.getFileHash(extractedFile, 'sha256', 'hex');
        } else {
            hash = await this.remoteLib.downloadBook(bookPath, downFileName);
        }

        const link = `/files/${hash}`;
        const publicPath = `${this.config.publicDir}${link}`;

        if (!await fs.pathExists(publicPath)) {
            await fs.ensureDir(path.dirname(publicPath));

            const tmpFile = `${this.config.tempDir}/${utils.randomHexString(30)}`;
            await utils.gzipFile(extractedFile, tmpFile, 4);
            await fs.remove(extractedFile);
            await fs.move(tmpFile, publicPath, {overwrite: true});
        } else {
            if (extractedFile)
                await fs.remove(extractedFile);
            await utils.touchFile(publicPath);
        }

        await db.insert({
            table: 'file_hash',
            replace: true,
            rows: [
                {id: bookPath, hash},
                {id: hash, bookPath, downFileName}
            ]
        });

        return link;
    }

    async getBookLink(params) {
        this.checkMyState();

        const {bookPath, downFileName} = params;

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
                link = await this.restoreBook(bookPath, downFileName)
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
        this.checkMyState();

        try {
            const db = this.db;
            const hash = path.basename(publicPath);

            //найдем bookPath и downFileName
            const rows = await db.select({table: 'file_hash', where: `@@id(${db.esc(hash)})`});        
            if (rows.length) {//нашли по хешу
                const rec = rows[0];
                await this.restoreBook(rec.bookPath, rec.downFileName);

                return rec.downFileName;
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

    async getDownFileName(publicPath) {
        this.checkMyState();

        const db = this.db;
        const hash = path.basename(publicPath);

        //найдем downFileName
        const rows = await db.select({table: 'file_hash', where: `@@id(${db.esc(hash)})`});        
        if (rows.length) {//downFileName найден по хешу
            return rows[0].downFileName;
        } else {//bookPath не найден
            throw new Error('404 Файл не найден');
        }
    }

    async getInpxFile(params) {
        let data = null;
        if (params.inpxFileHash && this.inpxFileHash && params.inpxFileHash === this.inpxFileHash) {
            data = false;
        }

        if (data === null)
            data = await fs.readFile(this.config.inpxFile, 'base64');

        return {data};
    }

    logServerStats() {
        try {
            const memUsage = process.memoryUsage().rss/(1024*1024);//Mb
            let loadAvg = os.loadavg();
            loadAvg = loadAvg.map(v => v.toFixed(2));

            log(`Server info [ memUsage: ${memUsage.toFixed(2)}MB, loadAvg: (${loadAvg.join(', ')}) ]`);

            if (this.config.server.ready)
                log(`Server accessible at http://127.0.0.1:${this.config.server.port} (listening on ${this.config.server.host}:${this.config.server.port})`);
        } catch (e) {
            log(LM_ERR, e.message);
        }
    }
    
    async periodicLogServerStats() {
        while (1) {// eslint-disable-line
            this.logServerStats();
            await utils.sleep(60*1000);
        }
    }

    async cleanDir(config) {
        const {dir, maxSize} = config;

        const list = await fs.readdir(dir);

        let size = 0;
        let files = [];
        //формируем список
        for (const filename of list) {
            const filePath = `${dir}/${filename}`;
            const stat = await fs.stat(filePath);
            if (!stat.isDirectory()) {
                size += stat.size;
                files.push({name: filePath, stat});
            }
        }

        log(LM_WARN, `clean dir ${dir}, maxSize=${maxSize}, found ${files.length} files, total size=${size}`);

        files.sort((a, b) => a.stat.mtimeMs - b.stat.mtimeMs);

        let i = 0;
        //удаляем
        while (i < files.length && size > maxSize) {
            const file = files[i];
            const oldFile = file.name;
            await fs.remove(oldFile);
            size -= file.stat.size;
            i++;
        }

        log(LM_WARN, `removed ${i} files`);
    }

    async periodicCleanDir(dirConfig) {
        try {
            for (const config of dirConfig) 
                await fs.ensureDir(config.dir);

            let lastCleanDirTime = 0;
            while (1) {// eslint-disable-line no-constant-condition
                //чистка папок
                if (Date.now() - lastCleanDirTime >= cleanDirPeriod) {
                    for (const config of dirConfig) {
                        try {
                            await this.cleanDir(config);
                        } catch(e) {
                            log(LM_ERR, e.stack);
                        }
                    }

                    lastCleanDirTime = Date.now();
                }

                await utils.sleep(60*1000);//интервал проверки 1 минута
            }
        } catch (e) {
            log(LM_FATAL, e.message);
            ayncExit.exit(1);
        }
    }

    async periodicCheckInpx() {
        const inpxCheckInterval = this.config.inpxCheckInterval;
        if (!inpxCheckInterval)
            return;

        while (1) {// eslint-disable-line no-constant-condition
            try {
                while (this.myState != ssNormal)
                    await utils.sleep(1000);

                if (this.remoteLib) {
                    await this.remoteLib.downloadInpxFile();
                }

                const newInpxHash = await this.inpxHashCreator.getHash();

                const dbConfig = await this.dbConfig();
                const currentInpxHash = (dbConfig.inpxHash ? dbConfig.inpxHash : '');

                if (newInpxHash !== currentInpxHash) {
                    log('inpx file: changes found, recreating DB');
                    await this.recreateDb();
                } else {
                    log('inpx file: no changes');
                }
            } catch(e) {
                log(LM_ERR, `periodicCheckInpx: ${e.message}`);
            }

            await utils.sleep(inpxCheckInterval*60*1000);
        }
    }
}

module.exports = WebWorker;