const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');
const iconv = require('iconv-lite');

const ZipReader = require('./ZipReader');
const WorkerState = require('./WorkerState');//singleton
const { JembaDb, JembaDbThread } = require('jembadb');
const DbCreator = require('./DbCreator');
const DbSearcher = require('./DbSearcher');
const InpxHashCreator = require('./InpxHashCreator');
const RemoteLib = require('./RemoteLib');//singleton
const FileDownloader = require('./FileDownloader');

const asyncExit = new (require('./AsyncExit'))();
const log = new (require('./AppLogger'))().log;//singleton
const utils = require('./utils');
const genreTree = require('./genres');
const Fb2Helper = require('./fb2/Fb2Helper');

//server states
const ssNormal = 'normal';
const ssDbLoading = 'db_loading';
const ssDbCreating = 'db_creating';

const stateToText = {
    [ssNormal]: '',
    [ssDbLoading]: 'Загрузка поисковой базы',
    [ssDbCreating]: 'Создание поисковой базы',
};

const cleanDirInterval = 60*60*1000;//каждый час
const checkReleaseInterval = 7*60*60*1000;//каждые 7 часов

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
            this.fb2Helper = new Fb2Helper();
            this.inpxFileHash = '';

            this.wState = this.workerState.getControl('server_state');
            this.myState = '';
            this.db = null;
            this.dbSearcher = null;

            asyncExit.add(this.closeDb.bind(this));

            this.loadOrCreateDb();//no await
            //this.periodicLogServerStats();//no await

            const dirConfig = [
                {
                    dir: config.bookDir,
                    maxSize: config.maxFilesDirSize,
                },
            ];

            this.periodicCleanDir(dirConfig);//no await
            this.periodicCheckInpx();//no await
            this.periodicCheckNewRelease();//no await

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
                cacheSize: config.dbCacheSize,
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

    async loadOrCreateDb(recreate = false, iteration = 0) {
        this.setMyState(ssDbLoading);

        try {
            const config = this.config;
            const dbPath = `${config.dataDir}/db`;

            this.inpxFileHash = await this.inpxHashCreator.getInpxFileHash();

            //проверим полный InxpHash (включая фильтр и версию БД)
            //для этого заглянем в конфиг внутри БД, если он есть
            if (!(config.recreateDb || recreate) && await fs.pathExists(dbPath)) {
                const newInpxHash = await this.inpxHashCreator.getHash();

                const tmpDb = new JembaDb();
                await tmpDb.lock({dbPath, softLock: true});

                try {
                    await tmpDb.open({table: 'config'});
                    const rows = await tmpDb.select({table: 'config', where: `@@id('inpxHash')`});

                    if (!rows.length || newInpxHash !== rows[0].value)
                        throw new Error('inpx file: changes found on start, recreating DB');
                } catch (e) {
                    log(LM_WARN, e.message);
                    recreate = true;
                } finally {
                    await tmpDb.unlock();
                }
            }

            //удалим БД если нужно
            if (config.recreateDb || recreate)
                await fs.remove(dbPath);

            //пересоздаем БД из INPX если нужно
            if (!await fs.pathExists(dbPath)) {
                await this.createDb(dbPath);
                utils.freeMemory();
            }

            //загружаем БД
            this.setMyState(ssDbLoading);
            log('Searcher DB loading');

            const db = new JembaDbThread();//в отдельном потоке
            await db.lock({
                dbPath,
                softLock: true,

                tableDefaults: {
                    cacheSize: config.dbCacheSize,
                },
            });

            try {
                //открываем таблицы
                await db.openAll({exclude: ['author_id', 'series_id', 'title_id', 'book']});

                const bookCacheSize = 500;
                await db.open({
                    table: 'book',
                    cacheSize: (config.lowMemoryMode || config.dbCacheSize > bookCacheSize ? config.dbCacheSize : bookCacheSize)
                });
            } catch(e) {
                log(LM_ERR, `Database error: ${e.message}`);
                if (iteration < 1) {
                    log('Recreating DB');
                    await this.loadOrCreateDb(true, iteration + 1);
                } else
                    throw e;
                return;
            }

            //поисковый движок
            this.dbSearcher = new DbSearcher(config, db);
            await this.dbSearcher.init();

            //stuff
            db.wwCache = {};            
            this.db = db;

            this.setMyState(ssNormal);

            log('Searcher DB ready');
            this.logServerStats();
        } catch (e) {
            log(LM_FATAL, e.message);            
            asyncExit.exit(1);
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

    async search(from, query) {
        this.checkMyState();

        const result = await this.dbSearcher.search(from, query);

        const config = await this.dbConfig();
        result.inpxHash = (config.inpxHash ? config.inpxHash : '');

        return result;
    }

    async bookSearch(query) {
        this.checkMyState();

        const result = await this.dbSearcher.bookSearch(query);

        const config = await this.dbConfig();
        result.inpxHash = (config.inpxHash ? config.inpxHash : '');

        return result;
    }

    async opdsQuery(from, query) {
        this.checkMyState();

        return await this.dbSearcher.opdsQuery(from, query);
    }

    async getAuthorBookList(authorId, author) {
        this.checkMyState();

        return await this.dbSearcher.getAuthorBookList(authorId, author);
    }

    async getAuthorSeriesList(authorId) {
        this.checkMyState();

        return await this.dbSearcher.getAuthorSeriesList(authorId);
    }

    async getSeriesBookList(series) {
        this.checkMyState();

        return await this.dbSearcher.getSeriesBookList(series);
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

            // exts
            rows = await db.select({table: 'ext', map: `(r) => ({value: r.value})`});
            const exts = rows.map(r => r.value);            

            result = {
                genreTree: genres,
                langList: langs,
                extList: exts,
                inpxHash: (config.inpxHash ? config.inpxHash : ''),
            };

            db.wwCache.genres = result;
        } else {
            result = db.wwCache.genres;
        }

        return result;
    }

    async extractBook(libFolder, libFile) {
        const outFile = `${this.config.tempDir}/${utils.randomHexString(30)}`;

        libFolder = libFolder.replace(/\\/g, '/').replace(/\/\//g, '/');

        const folder = `${this.config.libDir}/${libFolder}`;
        const file = libFile;
        
        const fullPath = `${folder}/${file}`;

        if (!file || await fs.pathExists(fullPath)) {// файл есть на диске
            
            await fs.copy(fullPath, outFile);
            return outFile;
        } else {// файл в zip-архиве
            const zipReader = new ZipReader();
            await zipReader.open(folder);

            try {
                await zipReader.extractToFile(file, outFile);

                if (!await fs.pathExists(outFile)) {//не удалось найти в архиве, попробуем имя файла в кодировке cp866
                    await zipReader.extractToFile(iconv.encode(file, 'cp866').toString(), outFile);                    
                }

                return outFile;
            } finally {
                await zipReader.close();
            }
        }
    }

    async restoreBook(bookUid, libFolder, libFile, downFileName) {
        const db = this.db;

        let extractedFile = '';
        let hash = '';

        if (!this.remoteLib) {
            extractedFile = await this.extractBook(libFolder, libFile);
            hash = await utils.getFileHash(extractedFile, 'sha256', 'hex');
        } else {
            hash = await this.remoteLib.downloadBook(bookUid);
        }

        const link = `${this.config.bookPathStatic}/${hash}`;
        const bookFile = `${this.config.bookDir}/${hash}`;
        const bookFileDesc = `${bookFile}.d.json`;

        if (!await fs.pathExists(bookFile) || !await fs.pathExists(bookFileDesc)) {
            if (!await fs.pathExists(bookFile) && extractedFile) {
                const tmpFile = `${this.config.tempDir}/${utils.randomHexString(30)}`;
                await utils.gzipFile(extractedFile, tmpFile, 4);
                await fs.remove(extractedFile);
                await fs.move(tmpFile, bookFile, {overwrite: true});
            } else {
                await utils.touchFile(bookFile);
            }

            await fs.writeFile(bookFileDesc, JSON.stringify({libFolder, libFile, downFileName}));
        } else {
            if (extractedFile)
                await fs.remove(extractedFile);

            await utils.touchFile(bookFile);
            await utils.touchFile(bookFileDesc);
        }

        await db.insert({
            table: 'file_hash',
            replace: true,
            rows: [
                {id: bookUid, hash},
            ]
        });

        return link;
    }

    async getBookLink(bookUid) {
        this.checkMyState();

        try {
            const db = this.db;
            let link = '';

            //найдем downFileName, libFolder, libFile
            let rows = await db.select({table: 'book', where: `@@hash('_uid', ${db.esc(bookUid)})`});
            if (!rows.length)
                throw new Error('404 Файл не найден');

            const book = rows[0];
            let downFileName = book.file;
            const authors = book.author.split(',');
            let author = authors[0];
            author = author.split(' ').filter(r => r.trim());
            for (let i = 1; i < author.length; i++)
                author[i] = `${(i === 1 ? ' ' : '')}${author[i][0]}.`;
            if (authors.length > 1)
                author.push(' и др.');

            const at = [author.join(''), (book.title ? `_${book.title}` : '')];
            downFileName = utils.makeValidFileNameOrEmpty(at.filter(r => r).join(''))
                || utils.makeValidFileNameOrEmpty(at[0])
                || utils.makeValidFileNameOrEmpty(at[1])
                || downFileName;
            if (downFileName.length > 50)
                downFileName = `${downFileName.substring(0, 50)}_`;

            const ext = `.${book.ext}`;
            if (downFileName.substring(downFileName.length - ext.length) != ext)
                downFileName += ext;

            const libFolder = book.folder;
            const libFile = `${book.file}${ext}`;

            //найдем хеш
            rows = await db.select({table: 'file_hash', where: `@@id(${db.esc(bookUid)})`});
            if (rows.length) {//хеш найден по bookUid
                const hash = rows[0].hash;
                const bookFile = `${this.config.bookDir}/${hash}`;
                const bookFileDesc = `${bookFile}.d.json`;

                if (await fs.pathExists(bookFile) && await fs.pathExists(bookFileDesc)) {
                    link = `${this.config.bookPathStatic}/${hash}`;
                }
            }

            if (!link) {
                link = await this.restoreBook(bookUid, libFolder, libFile, downFileName);
            }

            if (!link)
                throw new Error('404 Файл не найден');

            return {link, libFolder, libFile, downFileName};
        } catch(e) {
            log(LM_ERR, `getBookLink error: ${e.message}`);
            if (e.message.indexOf('ENOENT') >= 0)
                throw new Error('404 Файл не найден');
            throw e;
        }
    }

    async getBookInfo(bookUid) {
        this.checkMyState();

        try {
            const db = this.db;

            let bookInfo = await this.getBookLink(bookUid);
            const hash = path.basename(bookInfo.link);
            const bookFile = `${this.config.bookDir}/${hash}`;
            const bookFileInfo = `${bookFile}.i.json`;

            let rows = await db.select({table: 'book', where: `@@hash('_uid', ${db.esc(bookUid)})`});
            if (!rows.length)
                throw new Error('404 Файл не найден');
            const book = rows[0];

            const restoreBookInfo = async(info) => {
                const result = {};

                result.book = book;
                result.cover = '';
                result.fb2 = false;
                let parser = null;

                if (book.ext == 'fb2') {
                    const {fb2, cover, coverExt} = await this.fb2Helper.getDescAndCover(bookFile);
                    parser = fb2;
                    result.fb2 = fb2.rawNodes;

                    if (cover) {
                        result.cover = `${this.config.bookPathStatic}/${hash}${coverExt}`;
                        await fs.writeFile(`${bookFile}${coverExt}`, cover);
                    }
                }

                Object.assign(info, result);

                await fs.writeFile(bookFileInfo, JSON.stringify(info));

                if (this.config.branch === 'development') {
                    await fs.writeFile(`${bookFile}.dev`, `${JSON.stringify(info, null, 2)}\n\n${parser ? parser.toString({format: true}) : ''}`);
                }
            };

            if (!await fs.pathExists(bookFileInfo)) {
                await restoreBookInfo(bookInfo);
            } else {
                await utils.touchFile(bookFileInfo);
                const info = await fs.readFile(bookFileInfo, 'utf-8');
                const tmpInfo = JSON.parse(info);

                //проверим существование файла обложки, восстановим если нету
                let coverFile = '';
                if (tmpInfo.cover)
                    coverFile = `${this.config.publicFilesDir}${tmpInfo.cover}`;

                if (book.id != tmpInfo.book.id || (coverFile && !await fs.pathExists(coverFile))) {
                    await restoreBookInfo(bookInfo);
                } else {
                    bookInfo = tmpInfo;
                }
            }

            return {bookInfo};
        } catch(e) {
            log(LM_ERR, `getBookInfo error: ${e.message}`);
            if (e.message.indexOf('ENOENT') >= 0)
                throw new Error('404 Файл не найден');
            throw e;
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

        if (i > 0) {
            log(LM_WARN, `clean dir ${dir}, maxSize=${maxSize}, found ${files.length} files, total size=${size}`);
            log(LM_WARN, `removed ${i} files`);
        }
    }

    async periodicCleanDir(dirConfig) {
        try {
            for (const config of dirConfig) 
                await fs.ensureDir(config.dir);

            let lastCleanDirTime = 0;
            while (1) {// eslint-disable-line no-constant-condition
                //чистка папок
                if (Date.now() - lastCleanDirTime >= cleanDirInterval) {
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
            asyncExit.exit(1);
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
                }
                
            } catch(e) {
                log(LM_ERR, `periodicCheckInpx: ${e.message}`);
            }

            await utils.sleep(inpxCheckInterval*60*1000);
        }
    }

    async periodicCheckNewRelease() {
        const checkReleaseLink = this.config.checkReleaseLink;
        if (!checkReleaseLink)
            return;
        const down = new FileDownloader(1024*1024);

        while (1) {// eslint-disable-line no-constant-condition
            try {
                let release = await down.load(checkReleaseLink);
                release = JSON.parse(release.toString());

                if (release.tag_name)
                    this.config.latestVersion = release.tag_name;
            } catch(e) {
                log(LM_ERR, `periodicCheckNewRelease: ${e.message}`);
            }

            await utils.sleep(checkReleaseInterval);
        }
    }
}

module.exports = WebWorker;
