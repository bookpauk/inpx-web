const fs = require('fs-extra');

const InpxParser = require('./InpxParser');
const InpxHashCreator = require('./InpxHashCreator');
const utils = require('./utils');

const emptyFieldValue = '?';

class DbCreator {
    constructor(config) {
        this.config = config;
    }

    async loadInpxFilter() {
        const inpxFilterFile = this.config.inpxFilterFile;

        if (await fs.pathExists(inpxFilterFile)) {
            let filter = await fs.readFile(inpxFilterFile, 'utf8');
            filter = JSON.parse(filter);

            if (filter.includeAuthors) {
                filter.includeAuthors = filter.includeAuthors.map(a => a.toLowerCase());
                filter.includeSet = new Set(filter.includeAuthors);
            }

            if (filter.excludeAuthors) {
                filter.excludeAuthors = filter.excludeAuthors.map(a => a.toLowerCase());
                filter.excludeSet = new Set(filter.excludeAuthors);
            }

            return filter;
        } else {
            return false;
        }
    }

    //процедура формировани БД несколько усложнена, в целях экономии памяти
    async run(db, callback) {
        const config = this.config;

        callback({jobStepCount: 5});
        callback({job: 'load inpx', jobMessage: 'Загрузка INPX', jobStep: 1, progress: 0});

        //временная таблица
        await db.create({
            table: 'book',
            cacheSize: (config.lowMemoryMode ? 5 : 500),
        });        

        //поисковые таблицы, позже сохраним в БД
        let authorMap = new Map();//авторы
        let authorArr = [];
        let seriesMap = new Map();//серии
        let seriesArr = [];
        let titleMap = new Map();//названия
        let titleArr = [];
        let genreMap = new Map();//жанры
        let genreArr = [];
        let langMap = new Map();//языки
        let langArr = [];
        let delMap = new Map();//удаленные
        let delArr = [];
        let dateMap = new Map();//дата поступления
        let dateArr = [];
        let librateMap = new Map();//оценка
        let librateArr = [];

        let uidSet = new Set();//уникальные идентификаторы

        //stats
        let authorCount = 0;
        let bookCount = 0;
        let noAuthorBookCount = 0;
        let bookDelCount = 0;

        //stuff
        let recsLoaded = 0;
        callback({recsLoaded});
        let chunkNum = 0;

        //фильтр
        const inpxFilter = await this.loadInpxFilter();
        let filter = () => true;
        if (inpxFilter) {

            let recFilter = () => true;
            if (inpxFilter.filter) {
                if (config.allowUnsafeFilter)
                    recFilter = new Function(`'use strict'; return ${inpxFilter.filter}`)();
                else
                    throw new Error(`Unsafe property 'filter' detected in ${this.config.inpxFilterFile}. Please specify '--unsafe-filter' param if you know what you're doing.`);
            }

            filter = (rec) => {
                let author = rec.author;
                if (!author)
                    author = emptyFieldValue;

                author = author.toLowerCase();

                let excluded = false;
                if (inpxFilter.excludeSet) {
                    const authors = author.split(',');

                    for (const a of authors) {
                        if (inpxFilter.excludeSet.has(a)) {
                            excluded = true;
                            break;
                        }
                    }
                }

                return recFilter(rec)
                    && (!inpxFilter.includeSet || inpxFilter.includeSet.has(author))
                    && !excluded
                ;
            };
        }

        //вспомогательные функции
        const splitAuthor = (author) => {
            if (!author)
                author = emptyFieldValue;

            const result = author.split(',');
            if (result.length > 1)
                result.push(author);

            return result;
        }

        let totalFiles = 0;
        const readFileCallback = async(readState) => {
            callback(readState);

            if (readState.totalFiles)
                totalFiles = readState.totalFiles;

            if (totalFiles)
                callback({progress: (readState.current || 0)/totalFiles});
        };

        const parseField = (fieldValue, fieldMap, fieldArr, bookId, rec, fillBookIds = true) => {
            let value = fieldValue;

            if (typeof(fieldValue) == 'string') {
                if (!fieldValue)
                    fieldValue = emptyFieldValue;

                value = fieldValue.toLowerCase();
            }

            let fieldRec;
            if (fieldMap.has(value)) {
                const fieldId = fieldMap.get(value);
                fieldRec = fieldArr[fieldId];
            } else {
                fieldRec = {id: fieldArr.length, value, bookIds: new Set()};                
                if (rec !== undefined) {
                    fieldRec.name = fieldValue;
                    fieldRec.bookCount = 0;
                    fieldRec.bookDelCount = 0;
                }
                fieldArr.push(fieldRec);
                fieldMap.set(value, fieldRec.id);
            }

            if (fieldValue !== emptyFieldValue || fillBookIds)
                fieldRec.bookIds.add(bookId);

            if (rec !== undefined) {
                if (!rec.del)
                    fieldRec.bookCount++;
                else
                    fieldRec.bookDelCount++;
            }
        };        

        const parseBookRec = (rec) => {
            //авторы
            const author = splitAuthor(rec.author);

            for (let i = 0; i < author.length; i++) {
                const a = author[i];

                //статистика
                if (!authorMap.has(a.toLowerCase()) && (author.length == 1 || i < author.length - 1)) //без соавторов
                    authorCount++;
                
                parseField(a, authorMap, authorArr, rec.id, rec);                
            }

            //серии
            parseField(rec.series, seriesMap, seriesArr, rec.id, rec, false);

            //названия
            parseField(rec.title, titleMap, titleArr, rec.id, rec);

            //жанры
            let genre = rec.genre || emptyFieldValue;
            genre = rec.genre.split(',');

            for (let g of genre) {
                parseField(g, genreMap, genreArr, rec.id);
            }

            //языки
            parseField(rec.lang, langMap, langArr, rec.id);
            
            //удаленные
            parseField(rec.del, delMap, delArr, rec.id);

            //дата поступления
            parseField(rec.date, dateMap, dateArr, rec.id);

            //оценка
            parseField(rec.librate, librateMap, librateArr, rec.id);
        };

        //основная процедура парсинга
        let id = 0;
        const parsedCallback = async(chunk) => {
            let filtered = false;
            for (const rec of chunk) {
                //сначала фильтр
                if (!filter(rec) || uidSet.has(rec._uid)) {
                    rec.id = 0;
                    filtered = true;
                    continue;
                }

                rec.id = ++id;
                uidSet.add(rec._uid);

                if (!rec.del) {
                    bookCount++;
                    if (!rec.author)
                        noAuthorBookCount++;
                } else {
                    bookDelCount++;
                }

                parseBookRec(rec);
            }

            let saveChunk = [];
            if (filtered) {
                saveChunk = chunk.filter(r => r.id);
            } else {
                saveChunk = chunk;
            }

            await db.insert({table: 'book', rows: saveChunk});

            recsLoaded += chunk.length;
            callback({recsLoaded});

            if (chunkNum++ % 10 == 0 && config.lowMemoryMode)
                utils.freeMemory();
        };

        //парсинг
        const parser = new InpxParser();
        await parser.parse(config.inpxFile, readFileCallback, parsedCallback);        

        //чистка памяти, ибо жрет как не в себя
        authorMap = null;
        seriesMap = null;
        titleMap = null;
        genreMap = null;
        langMap = null;
        delMap = null;
        dateMap = null;
        librateMap = null;
        uidSet = null;

        await db.close({table: 'book'});
        await db.freeMemory();
        utils.freeMemory();

        //отсортируем таблицы выдадим им правильные id
        //порядок id соответствует ASC-сортировке по value
        callback({job: 'sort', jobMessage: 'Сортировка', jobStep: 2, progress: 0});
        await utils.sleep(100);
        //сортировка авторов
        authorArr.sort((a, b) => a.value.localeCompare(b.value));
        callback({progress: 0.2});
        await utils.sleep(100);

        id = 0;
        for (const authorRec of authorArr) {
            authorRec.id = ++id;
        }
        callback({progress: 0.3});
        await utils.sleep(100);

        //сортировка серий
        seriesArr.sort((a, b) => a.value.localeCompare(b.value));
        callback({progress: 0.5});
        await utils.sleep(100);

        id = 0;
        for (const seriesRec of seriesArr) {
            seriesRec.id = ++id;
        }
        callback({progress: 0.6});
        await utils.sleep(100);

        //сортировка названий
        titleArr.sort((a, b) => a.value.localeCompare(b.value));
        callback({progress: 0.8});
        await utils.sleep(100);        
        id = 0;
        for (const titleRec of titleArr) {
            titleRec.id = ++id;
        }

        //stats
        const stats = {
            filesCount: 0,//вычислим позднее
            filesCountAll: 0,//вычислим позднее
            filesDelCount: 0,//вычислим позднее
            recsLoaded,
            authorCount,
            authorCountAll: authorArr.length,
            bookCount,
            bookCountAll: bookCount + bookDelCount,
            bookDelCount,
            noAuthorBookCount,
            titleCount: titleArr.length,
            seriesCount: seriesArr.length,
            genreCount: genreArr.length,
            langCount: langArr.length,
        };
        //console.log(stats);

        //сохраним поисковые таблицы
        const chunkSize = 10000;

        const saveTable = async(table, arr, nullArr, indexType = 'string', delEmpty = false) => {
            
            if (indexType == 'string')
                arr.sort((a, b) => a.value.localeCompare(b.value));
            else
                arr.sort((a, b) => a.value - b.value);

            await db.create({
                table,
                index: {field: 'value', unique: true, type: indexType, depth: 1000000},
            });

            //вставка в БД по кусочкам, экономим память
            for (let i = 0; i < arr.length; i += chunkSize) {
                const chunk = arr.slice(i, i + chunkSize);
                
                for (const rec of chunk)
                    rec.bookIds = Array.from(rec.bookIds);

                await db.insert({table, rows: chunk});

                if (i % 5 == 0) {
                    await db.freeMemory();
                    await utils.sleep(10);
                }

                callback({progress: i/arr.length});                
            }

            if (delEmpty) {
                const delResult = await db.delete({table, where: `@@indexLR('value', '?', '?')`});
                const statField = `${table}Count`;
                if (stats[statField])
                    stats[statField] -= delResult.deleted;
            }

            nullArr();
            await db.close({table});
            utils.freeMemory();
            await db.freeMemory();
        };

        //author
        callback({job: 'author save', jobMessage: 'Сохранение индекса авторов', jobStep: 3, progress: 0});
        await saveTable('author', authorArr, () => {authorArr = null});

        //series
        callback({job: 'series save', jobMessage: 'Сохранение индекса серий', jobStep: 4, progress: 0});
        await saveTable('series', seriesArr, () => {seriesArr = null}, 'string', true);

        //title
        callback({job: 'title save', jobMessage: 'Сохранение индекса названий', jobStep: 5, progress: 0});
        await saveTable('title', titleArr, () => {titleArr = null});

        //genre
        callback({job: 'genre save', jobMessage: 'Сохранение индекса жанров', jobStep: 6, progress: 0});
        await saveTable('genre', genreArr, () => {genreArr = null});

        callback({job: 'others save', jobMessage: 'Сохранение остальных индексов', jobStep: 7, progress: 0});
        //lang
        await saveTable('lang', langArr, () => {langArr = null});

        //del
        await saveTable('del', delArr, () => {delArr = null}, 'number');

        //date
        await saveTable('date', dateArr, () => {dateArr = null});

        //librate
        await saveTable('librate', librateArr, () => {librateArr = null}, 'number');

        //кэш-таблицы запросов
        await db.create({table: 'query_cache'});
        await db.create({table: 'query_time'});

        //кэш-таблица имен файлов и их хешей
        await db.create({table: 'file_hash'});

        //-- завершающие шаги --------------------------------
        await db.open({
            table: 'book',
            cacheSize: (config.lowMemoryMode ? 5 : 500),
        });

        callback({job: 'optimization', jobMessage: 'Оптимизация', jobStep: 8, progress: 0});
        await this.optimizeTable('author', db, (p) => {
            if (p.progress)
                p.progress = 0.3*p.progress;
            callback(p);
        });
        await this.optimizeTable('series', db, (p) => {
            if (p.progress)
                p.progress = 0.3 + 0.2*p.progress;
            callback(p);
        });
        await this.optimizeTable('title', db, (p) => {
            if (p.progress)
                p.progress = 0.5 + 0.5*p.progress;
            callback(p);
        });

        callback({job: 'stats count', jobMessage: 'Подсчет статистики', jobStep: 9, progress: 0});
        await this.countStats(db, callback, stats);

        //чистка памяти, ибо жрет как не в себя
        await db.close({table: 'book'});
        await db.freeMemory();
        utils.freeMemory();

        //config сохраняем в самом конце, нет конфига - с базой что-то не так
        const inpxHashCreator = new InpxHashCreator(config);

        await db.create({
            table: 'config'
        });

        const inpxInfo = parser.info;
        if (inpxFilter && inpxFilter.info) {
            if (inpxFilter.info.collection)
                inpxInfo.collection = inpxFilter.info.collection;
            if (inpxFilter.info.version)
                inpxInfo.version = inpxFilter.info.version;
        }

        await db.insert({table: 'config', rows: [
            {id: 'inpxInfo', value: inpxInfo},
            {id: 'stats', value: stats},
            {id: 'inpxHash', value: await inpxHashCreator.getHash()},
        ]});

        callback({job: 'done', jobMessage: ''});
    }

    async optimizeTable(from, db, callback) {
        const config = this.config;

        const to = `${from}_book`;

        await db.open({table: from});
        await db.create({table: to});

        let bookId2RecId = new Map();

        const saveChunk = async(chunk) => {
            const ids = [];
            for (const rec of chunk) {
                for (const id of rec.bookIds) {
                    let b2r = bookId2RecId.get(id);
                    if (!b2r) {
                        b2r = [];
                        bookId2RecId.set(id, b2r);
                    }
                    b2r.push(rec.id);

                    ids.push(id);
                }
            }

            if (config.fullOptimization) {
                ids.sort((a, b) => a - b);// обязательно, иначе будет тормозить - особенности JembaDb

                const rows = await db.select({table: 'book', where: `@@id(${db.esc(ids)})`});

                const bookArr = new Map();
                for (const row of rows)
                    bookArr.set(row.id, row);

                for (const rec of chunk) {
                    rec.books = [];

                    for (const id of rec.bookIds) {
                        const book = bookArr.get(id);
                        if (book) {//на всякий случай
                            rec.books.push(book);
                        }
                    }

                    delete rec.name;
                    delete rec.value;
                    delete rec.bookIds;
                }

                await db.insert({
                    table: to,
                    rows: chunk,
                });
            }
        };

        const rows = await db.select({table: from, count: true});
        const fromLength = rows[0].count;

        let processed = 0;
        while (1) {// eslint-disable-line
            const chunk = await db.select({
                table: from,
                where: `
                    let iter = @getItem('optimize');
                    if (!iter) {
                        iter = @all();
                        @setItem('optimize', iter);
                    }

                    const ids = new Set();
                    let bookIdsLen = 0;
                    let id = iter.next();
                    while (!id.done) {
                        ids.add(id.value);

                        const row = @row(id.value);
                        bookIdsLen += row.bookIds.length;
                        if (bookIdsLen >= 50000)
                            break;

                        id = iter.next();
                    }

                    return ids;
                `
            });

            if (chunk.length) {
                await saveChunk(chunk);

                processed += chunk.length;
                callback({progress: 0.9*processed/fromLength});
            } else
                break;

            if (this.config.lowMemoryMode) {
                await utils.sleep(10);
                utils.freeMemory();
                await db.freeMemory();
            }
        }

        await db.close({table: to});
        await db.close({table: from});

        const idMap = {arr: [], map: []};
        for (const [id, value] of bookId2RecId) {
            if (value.length > 1) {
                idMap.map.push([id, value]);
                idMap.arr[id] = 0;
            } else {
                idMap.arr[id] = value[0];
            }
        }

        callback({progress: 1});
        await fs.writeFile(`${this.config.dataDir}/db/${from}_id.map`, JSON.stringify(idMap));

        bookId2RecId = null;
        utils.freeMemory();
    }

    async countStats(db, callback, stats) {
        //статистика по количеству файлов

        //эмуляция прогресса
        let countDone = false;
        (async() => {
            let i = 0;
            while (!countDone) {
                callback({progress: i/100});
                i = (i < 100 ? i + 5 : 100);
                await utils.sleep(1000);
            }
        })();

        //подчсет
        const countRes = await db.select({table: 'book', rawResult: true, where: `
            const files = new Set();
            const filesDel = new Set();

            for (const id of @all()) {
                const r = @row(id);
                const file = ${"`${r.folder}/${r.file}.${r.ext}`"};
                if (!r.del) {
                    files.add(file);
                } else {
                    filesDel.add(file);
                }
            }

            for (const file of filesDel)
                if (files.has(file))
                    filesDel.delete(file);

            return {filesCount: files.size, filesDelCount: filesDel.size};
        `});

        if (countRes.length) {
            const res = countRes[0].rawResult;
            stats.filesCount = res.filesCount;
            stats.filesCountAll = res.filesCount + res.filesDelCount;
            stats.filesDelCount = res.filesDelCount;
        }

        //заодно добавим нужный индекс
        await db.create({
            in: 'book',
            hash: {field: '_uid', type: 'string', depth: 100, unique: true},
        });

        countDone = true;
    }
}

module.exports = DbCreator;