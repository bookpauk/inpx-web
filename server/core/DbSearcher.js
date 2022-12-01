const fs = require('fs-extra');
//const _ = require('lodash');
const utils = require('./utils');

const maxLimit = 1000;

const emptyFieldValue = '?';
const maxUtf8Char = String.fromCodePoint(0xFFFFF);
const ruAlphabet = 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя';
const enAlphabet = 'abcdefghijklmnopqrstuvwxyz';
const enruArr = (ruAlphabet + enAlphabet).split('');

class DbSearcher {
    constructor(config, db) {
        this.config = config;
        this.queryCacheMemSize = this.config.queryCacheMemSize;
        this.queryCacheDiskSize = this.config.queryCacheDiskSize;
        this.queryCacheEnabled = this.config.queryCacheEnabled
            && (this.queryCacheMemSize > 0 || this.queryCacheDiskSize > 0);

        this.db = db;

        this.searchFlag = 0;
        this.timer = null;
        this.closed = false;

        this.memCache = new Map();
        this.bookIdMap = {};

        this.periodicCleanCache();//no await
    }

    async init() {
        await this.fillBookIdMap('author');
        await this.fillBookIdMap('series');
        await this.fillBookIdMap('title');
        await this.fillDbConfig();
    }

    queryKey(q) {
        const result = [];
        for (const f of this.recStruct) {
            result.push(q[f.field]);
        }

        return JSON.stringify(result);
    }

    getWhere(a) {
        const db = this.db;

        a = a.toLowerCase();
        let where;

        //особая обработка префиксов
        if (a[0] == '=') {
            a = a.substring(1);
            where = `@dirtyIndexLR('value', ${db.esc(a)}, ${db.esc(a)})`;
        } else if (a[0] == '*') {
            a = a.substring(1);
            where = `@indexIter('value', (v) => (v !== ${db.esc(emptyFieldValue)} && v.indexOf(${db.esc(a)}) >= 0) )`;
        } else if (a[0] == '#') {
            a = a.substring(1);
            where = `@indexIter('value', (v) => {
                const enru = new Set(${db.esc(enruArr)});
                return !v || (v !== ${db.esc(emptyFieldValue)} && !enru.has(v[0]) && v.indexOf(${db.esc(a)}) >= 0);
            })`;
        } else {
            where = `@dirtyIndexLR('value', ${db.esc(a)}, ${db.esc(a + maxUtf8Char)})`;
        }

        return where;
    }

    async selectBookIds(query) {
        const db = this.db;

        const idsArr = [];

        const tableBookIds = async(table, where) => {
            const rows = await db.select({
                table,
                rawResult: true,
                where: `
                    const ids = ${where};

                    const result = new Set();
                    for (const id of ids) {
                        const row = @unsafeRow(id);
                        for (const bookId of row.bookIds)
                            result.add(bookId);
                    }

                    return new Uint32Array(result);
                `
            });

            return rows[0].rawResult;
        };

        //авторы
        if (query.author && query.author !== '*') {
            const key = `book-ids-author-${query.author}`;
            let ids = await this.getCached(key);

            if (ids === null) {
                ids = await tableBookIds('author', this.getWhere(query.author));

                await this.putCached(key, ids);
            }

            idsArr.push(ids);
        }

        //серии
        if (query.series && query.series !== '*') {
            const key = `book-ids-series-${query.series}`;
            let ids = await this.getCached(key);

            if (ids === null) {
                ids = await tableBookIds('series', this.getWhere(query.series));

                await this.putCached(key, ids);
            }

            idsArr.push(ids);
        }

        //названия
        if (query.title && query.title !== '*') {
            const key = `book-ids-title-${query.title}`;
            let ids = await this.getCached(key);

            if (ids === null) {
                ids = await tableBookIds('title', this.getWhere(query.title));

                await this.putCached(key, ids);
            }

            idsArr.push(ids);
        }

        //жанры
        if (query.genre) {
            const key = `book-ids-genre-${query.genre}`;
            let ids = await this.getCached(key);

            if (ids === null) {
                const genreRows = await db.select({
                    table: 'genre',
                    rawResult: true,
                    where: `
                        const genres = ${db.esc(query.genre.split(','))};

                        const ids = new Set();
                        for (const g of genres) {
                            for (const id of @indexLR('value', g, g))
                                ids.add(id);
                        }
                        
                        const result = new Set();
                        for (const id of ids) {
                            const row = @unsafeRow(id);
                            for (const bookId of row.bookIds)
                                result.add(bookId);
                        }

                        return new Uint32Array(result);
                    `
                });

                ids = genreRows[0].rawResult;
                await this.putCached(key, ids);
            }

            idsArr.push(ids);
        }

        //языки
        if (query.lang) {
            const key = `book-ids-lang-${query.lang}`;
            let ids = await this.getCached(key);

            if (ids === null) {
                const langRows = await db.select({
                    table: 'lang',
                    rawResult: true,
                    where: `
                        const langs = ${db.esc(query.lang.split(','))};

                        const ids = new Set();
                        for (const l of langs) {
                            for (const id of @indexLR('value', l, l))
                                ids.add(id);
                        }
                        
                        const result = new Set();
                        for (const id of ids) {
                            const row = @unsafeRow(id);
                            for (const bookId of row.bookIds)
                                result.add(bookId);
                        }

                        return new Uint32Array(result);
                    `
                });

                ids = langRows[0].rawResult;
                await this.putCached(key, ids);
            }

            idsArr.push(ids);
        }

        //удаленные
        if (query.del !== undefined) {
            const key = `book-ids-del-${query.del}`;
            let ids = await this.getCached(key);

            if (ids === null) {
                ids = await tableBookIds('del', `@indexLR('value', ${db.esc(query.del)}, ${db.esc(query.del)})`);

                await this.putCached(key, ids);
            }

            idsArr.push(ids);
        }

        //дата поступления
        if (query.date) {
            const key = `book-ids-date-${query.date}`;
            let ids = await this.getCached(key);

            if (ids === null) {
                let [from = '', to = ''] = query.date.split(',');
                ids = await tableBookIds('date', `@indexLR('value', ${db.esc(from)} || undefined, ${db.esc(to)} || undefined)`);

                await this.putCached(key, ids);
            }

            idsArr.push(ids);
        }

        //оценка
        if (query.librate) {
            const key = `book-ids-librate-${query.librate}`;
            let ids = await this.getCached(key);

            if (ids === null) {
                const dateRows = await db.select({
                    table: 'librate',
                    rawResult: true,
                    where: `
                        const rates = ${db.esc(query.librate.split(',').map(n => parseInt(n, 10)).filter(n => !isNaN(n)))};

                        const ids = new Set();
                        for (const rate of rates) {
                            for (const id of @indexLR('value', rate, rate))
                                ids.add(id);
                        }
                        
                        const result = new Set();
                        for (const id of ids) {
                            const row = @unsafeRow(id);
                            for (const bookId of row.bookIds)
                                result.add(bookId);
                        }

                        return new Uint32Array(result);
                    `
                });

                ids = dateRows[0].rawResult;
                await this.putCached(key, ids);
            }

            idsArr.push(ids);
        }

        if (idsArr.length > 1) {
            //ищем пересечение множеств
            let proc = 0;
            let nextProc = 0;
            let inter = new Set(idsArr[0]);
            for (let i = 1; i < idsArr.length; i++) {
                const newInter = new Set();

                for (const id of idsArr[i]) {
                    if (inter.has(id))
                        newInter.add(id);

                    //прерываемся иногда, чтобы не блокировать Event Loop
                    proc++;
                    if (proc >= nextProc) {
                        nextProc += 10000;
                        await utils.processLoop();
                    }
                }
                inter = newInter;
            }

            return new Uint32Array(inter);
        } else if (idsArr.length == 1) {            
            return idsArr[0];
        } else {
            return false;
        }
    }

    async fillDbConfig() {
        if (!this.dbConfig) {
            const rows = await this.db.select({table: 'config'});
            const config = {};

            for (const row of rows) {
                config[row.id] = row.value;
            }

            this.dbConfig = config;
            this.recStruct = config.inpxInfo.recStruct;
        }
    }

    async fillBookIdMap(from) {
        const data = await fs.readFile(`${this.config.dataDir}/db/${from}_id.map`, 'utf-8');

        const idMap = JSON.parse(data);
        idMap.arr = new Uint32Array(idMap.arr);
        idMap.map = new Map(idMap.map);

        this.bookIdMap[from] = idMap;
    }

    async tableIdsFilter(from, query) {
        //т.к. авторы у книги идут списком (т.е. одна книга относиться сразу к нескольким авторам),
        //то в выборку по bookId могут попасть авторы, которые отсутствуют в критерии query.author,
        //поэтому дополнительно фильтруем
        let result = null;
        if (from == 'author' && query.author && query.author !== '*') {
            const key = `filter-ids-author-${query.author}`;
            let authorIds = await this.getCached(key);

            if (authorIds === null) {
                const rows = await this.db.select({
                    table: 'author',
                    rawResult: true,
                    where: `return new Uint32Array(${this.getWhere(query.author)})`
                });

                authorIds = rows[0].rawResult;

                await this.putCached(key, authorIds);
            }

            result = new Set(authorIds);
        }

        return result;
    }

    async selectTableIds(from, query) {
        const db = this.db;
        const queryKey = this.queryKey(query);
        const tableKey = `${from}-table-ids-${queryKey}`;
        let tableIds = await this.getCached(tableKey);

        if (tableIds === null) {
            const bookKey = `book-ids-${queryKey}`;
            let bookIds = await this.getCached(bookKey);

            if (bookIds === null) {
                bookIds = await this.selectBookIds(query);
                await this.putCached(bookKey, bookIds);
            }

            //id книг (bookIds) нашли, теперь надо их смаппировать в id таблицы from (авторов, серий, названий)
            if (bookIds) {
                //т.к. авторы у книги идут списком, то дополнительно фильтруем
                const filter = await this.tableIdsFilter(from, query);

                const tableIdsSet = new Set();
                const idMap = this.bookIdMap[from];
                let proc = 0;
                let nextProc = 0;
                for (const bookId of bookIds) {
                    const tableId = idMap.arr[bookId];
                    if (tableId) {
                        if (!filter || filter.has(tableId))
                            tableIdsSet.add(tableId);
                        proc++;
                    } else {
                        const tableIdArr = idMap.map.get(bookId);
                        if (tableIdArr) {
                            for (const tableId of tableIdArr) {
                            if (!filter || filter.has(tableId))
                                    tableIdsSet.add(tableId);
                                proc++;
                            }
                        }
                    }

                    //прерываемся иногда, чтобы не блокировать Event Loop
                    if (proc >= nextProc) {
                        nextProc += 10000;
                        await utils.processLoop();
                    }
                }

                tableIds = new Uint32Array(tableIdsSet);
            } else {//bookIds пустой - критерии не заданы, значит берем все id из from
                const rows = await db.select({
                    table: from,
                    rawResult: true,
                    where: `return new Uint32Array(@all())`
                });

                tableIds = rows[0].rawResult;
            }

            //сортируем по id
            //порядок id соответствует ASC-сортировке по строковому значению из from (имя автора, назание серии, название книги)
            tableIds.sort((a, b) => a - b);

            await this.putCached(tableKey, tableIds);
        }

        return tableIds;
    }

    async restoreBooks(from, ids) {
        const db = this.db;
        const bookTable = `${from}_book`;

        const rows = await db.select({
            table: bookTable,
            where: `@@id(${db.esc(ids)})`
        });

        if (rows.length == ids.length)
            return rows;

        //далее восстановим книги из book в <from>_book
        const idsSet = new Set(rows.map(r => r.id));

        //недостающие
        const tableIds = [];
        for (const id of ids) {
            if (!idsSet.has(id))
                tableIds.push(id);
        }

        const tableRows = await db.select({
            table: from,
            where: `@@id(${db.esc(tableIds)})`
        });

        //список недостающих bookId
        const bookIds = [];
        for (const row of tableRows) {
            for (const bookId of row.bookIds)
                bookIds.push(bookId);
        }

        //выбираем книги
        const books = await db.select({
            table: 'book',
            where: `@@id(${db.esc(bookIds)})`
        });

        const booksMap = new Map();
        for (const book of books)
            booksMap.set(book.id, book);

        //распределяем
        for (const row of tableRows) {
            const books = [];
            for (const bookId of row.bookIds) {
                const book = booksMap.get(bookId);
                if (book)
                    books.push(book);
            }

            rows.push({id: row.id, name: row.name, books});
        }

        await db.insert({table: bookTable, ignore: true, rows});

        return rows;
    }

    async search(from, query) {
        if (this.closed)
            throw new Error('DbSearcher closed');

        if (!['author', 'series', 'title'].includes(from))
            throw new Error(`Unknown value for param 'from'`);

        this.searchFlag++;

        try {
            const db = this.db;

            const ids = await this.selectTableIds(from, query);

            const totalFound = ids.length;            
            let limit = (query.limit ? query.limit : 100);
            limit = (limit > maxLimit ? maxLimit : limit);
            const offset = (query.offset ? query.offset : 0);

            const slice = ids.slice(offset, offset + limit);

            //выборка найденных значений
            const found = await db.select({
                table: from,
                map: `(r) => ({id: r.id, ${from}: r.name, bookCount: r.bookCount, bookDelCount: r.bookDelCount})`,
                where: `@@id(${db.esc(Array.from(slice))})`
            });

            //для title восстановим books
            if (from == 'title') {
                const bookIds = found.map(r => r.id);
                const rows = await this.restoreBooks(from, bookIds);
                const rowsMap = new Map();
                for (const row of rows)
                    rowsMap.set(row.id, row);

                for (const f of found) {
                    const b = rowsMap.get(f.id);
                    if (b)
                        f.books = b.books;
                }
            }

            return {found, totalFound};
        } finally {
            this.searchFlag--;
        }
    }

    async bookSearchIds(query) {
        const ids = await this.selectBookIds(query);
        const queryKey = this.queryKey(query);
        const bookKey = `book-search-ids-${queryKey}`;
        let bookIds = await this.getCached(bookKey);

        if (bookIds === null) {
            const db = this.db;
            const filterBySearch = (bookField, searchValue) => {
                //особая обработка префиксов
                if (searchValue[0] == '=') {
                    searchValue = searchValue.substring(1);
                    return `(row.${bookField}.localeCompare(${db.esc(searchValue)}) === 0)`;
                } else if (searchValue[0] == '*') {
                    searchValue = searchValue.substring(1);
                    return `(row.${bookField} && row.${bookField}.indexOf(${db.esc(searchValue)}) >= 0)`;
                } else if (searchValue[0] == '#') {

                    //searchValue = searchValue.substring(1);
                    //return !bookValue || (bookValue !== emptyFieldValue && !enru.has(bookValue[0]) && bookValue.indexOf(searchValue) >= 0);
                    return 'true';
                } else {
                    return `(row.${bookField}.localeCompare(${db.esc(searchValue)}) >= 0 && row.${bookField}.localeCompare(${db.esc(searchValue)} + maxUtf8Char) <= 0)`;
                }
            };

            const checks = ['true'];
            for (const f of this.recStruct) {
                if (query[f.field]) {
                    let searchValue = query[f.field];
                    if (f.type === 'S') {
                        checks.push(filterBySearch(f.field, searchValue));
                    } if (f.type === 'N') {
                        searchValue = parseInt(searchValue, 10);
                        checks.push(`row.${f.field} === ${searchValue}`);
                    }
                }
            }

            const rows = await db.select({
                table: 'book',
                rawResult: true,
                where: `
                    const ids = ${(ids ? db.esc(Array.from(ids)) : '@all()')};

                    const checkBook = (row) => {
                        return ${checks.join(' && ')};
                    };

                    const result = new Set();
                    for (const id of ids) {
                        const row = @unsafeRow(id);
                        if (checkBook(row))
                            result.add(row.id);
                    }

                    return new Uint32Array(result);
                `
            });

            bookIds = rows[0].rawResult;
    
            await this.putCached(bookKey, bookIds);
        }

        return bookIds;
    }

    //неоптимизированный поиск по всем книгам, по всем полям
    async bookSearch(query) {
        if (this.closed)
            throw new Error('DbSearcher closed');

        this.searchFlag++;

        try {
            const db = this.db;

            const ids = await this.bookSearchIds(query);

            const totalFound = ids.length;            
            let limit = (query.limit ? query.limit : 100);
            limit = (limit > maxLimit ? maxLimit : limit);
            const offset = (query.offset ? query.offset : 0);

            const slice = ids.slice(offset, offset + limit);

            //выборка найденных значений
            const found = await db.select({
                table: 'book',
                where: `@@id(${db.esc(Array.from(slice))})`
            });

            return {found, totalFound};
        } finally {
            this.searchFlag--;
        }
    }

    async opdsQuery(from, query) {
        if (this.closed)
            throw new Error('DbSearcher closed');

        if (!['author', 'series', 'title'].includes(from))
            throw new Error(`Unknown value for param 'from'`);

        this.searchFlag++;

        try {
            const db = this.db;

            const depth = query.depth || 1;
            const queryKey = this.queryKey(query);
            const opdsKey = `${from}-opds-d${depth}-${queryKey}`;
            let result = await this.getCached(opdsKey);

            if (result === null) {
                const ids = await this.selectTableIds(from, query);

                const totalFound = ids.length;

                //группировка по name длиной depth
                const found = await db.select({
                    table: from,
                    rawResult: true,
                    where: `
                        const depth = ${db.esc(depth)};
                        const group = new Map();

                        const ids = ${db.esc(Array.from(ids))};
                        for (const id of ids) {
                            const row = @unsafeRow(id);
                            const s = row.value.substring(0, depth);
                            let g = group.get(s);
                            if (!g) {
                                g = {id: row.id, name: row.name, value: s, count: 0};
                                group.set(s, g);
                            }
                            g.count++;
                        }

                        const result = Array.from(group.values());
                        result.sort((a, b) => a.value.localeCompare(b.value));

                        return result;
                    `
                });

                result = {found: found[0].rawResult, totalFound};
                
                await this.putCached(opdsKey, result);
            }

            return result;
        } finally {
            this.searchFlag--;
        }
    }

    async getAuthorBookList(authorId, author) {
        if (this.closed)
            throw new Error('DbSearcher closed');

        if (!authorId && !author)
            return {author: '', books: []};

        this.searchFlag++;

        try {
            const db = this.db;

            if (!authorId) {                
                //восстановим authorId
                authorId = 0;
                author = author.toLowerCase();

                const rows = await db.select({
                    table: 'author',
                    rawResult: true,
                    where: `return Array.from(@dirtyIndexLR('value', ${db.esc(author)}, ${db.esc(author)}))`
                });

                if (rows.length && rows[0].rawResult.length)
                    authorId = rows[0].rawResult[0];
            }

            //выборка книг автора по authorId
            const rows = await this.restoreBooks('author', [authorId]);

            let authorName = '';
            let books = [];

            if (rows.length) {
                authorName = rows[0].name;
                books = rows[0].books;
            }

            return {author: authorName, books};
        } finally {
            this.searchFlag--;
        }
    }

    async getAuthorSeriesList(authorId) {
        if (this.closed)
            throw new Error('DbSearcher closed');

        if (!authorId)
            return {author: '', series: []};

        this.searchFlag++;

        try {
            const db = this.db;

            //выборка книг автора по authorId
            const bookList = await this.getAuthorBookList(authorId);
            const books = bookList.books;
            const seriesSet = new Set();
            for (const book of books) {
                if (book.series)
                    seriesSet.add(book.series.toLowerCase());
            }

            let series = [];
            if (seriesSet.size) {
                //выборка серий по названиям
                series = await db.select({
                    table: 'series',
                    map: `(r) => ({id: r.id, series: r.name, bookCount: r.bookCount, bookDelCount: r.bookDelCount})`,
                    where: `
                        const seriesArr = ${db.esc(Array.from(seriesSet))};
                        const ids = new Set();
                        for (const value of seriesArr) {
                            for (const id of @dirtyIndexLR('value', value, value))
                                ids.add(id);
                        }

                        return ids;
                    `
                });
            }

            return {author: bookList.author, series};
        } finally {
            this.searchFlag--;
        }
    }

    async getSeriesBookList(series) {
        if (this.closed)
            throw new Error('DbSearcher closed');

        if (!series)
            return {books: []};

        this.searchFlag++;

        try {
            const db = this.db;

            series = series.toLowerCase();

            //выборка серии по названию серии
            let rows = await db.select({
                table: 'series',
                rawResult: true,
                where: `return Array.from(@dirtyIndexLR('value', ${db.esc(series)}, ${db.esc(series)}))`
            });

            let books = [];
            if (rows.length && rows[0].rawResult.length) {
                //выборка книг серии
                const bookRows = await this.restoreBooks('series', [rows[0].rawResult[0]])

                if (bookRows.length)
                    books = bookRows[0].books;
            }

            return {books};
        } finally {
            this.searchFlag--;
        }
    }

    async getCached(key) {
        if (!this.queryCacheEnabled)
            return null;

        let result = null;

        const db = this.db;
        const memCache = this.memCache;

        if (this.queryCacheMemSize > 0 && memCache.has(key)) {//есть в недавних
            result = memCache.get(key);

            //изменим порядок ключей, для последующей правильной чистки старых
            memCache.delete(key);
            memCache.set(key, result);
        } else if (this.queryCacheDiskSize > 0) {//смотрим в таблице
            const rows = await db.select({table: 'query_cache', where: `@@id(${db.esc(key)})`});

            if (rows.length) {//нашли в кеше
                await db.insert({
                    table: 'query_time',
                    replace: true,
                    rows: [{id: key, time: Date.now()}],
                });

                result = rows[0].value;

                //заполняем кеш в памяти
                if (this.queryCacheMemSize > 0) {
                    memCache.set(key, result);

                    if (memCache.size > this.queryCacheMemSize) {
                        //удаляем самый старый ключ-значение
                        for (const k of memCache.keys()) {
                            memCache.delete(k);
                            break;
                        }
                    }
                }
            }
        }

        return result;
    }

    async putCached(key, value) {
        if (!this.queryCacheEnabled)
            return;

        const db = this.db;

        if (this.queryCacheMemSize > 0) {
            const memCache = this.memCache;
            memCache.set(key, value);

            if (memCache.size > this.queryCacheMemSize) {
                //удаляем самый старый ключ-значение
                for (const k of memCache.keys()) {
                    memCache.delete(k);
                    break;
                }
            }
        }

        if (this.queryCacheDiskSize > 0) {
            //кладем в таблицу асинхронно
            (async() => {
                try {
                    await db.insert({
                        table: 'query_cache',
                        replace: true,
                        rows: [{id: key, value}],
                    });

                    await db.insert({
                        table: 'query_time',
                        replace: true,
                        rows: [{id: key, time: Date.now()}],
                    });
                } catch(e) {
                    console.error(`putCached: ${e.message}`);
                }
            })();
        }
    }

    async periodicCleanCache() {
        this.timer = null;
        const cleanInterval = this.config.cacheCleanInterval*60*1000;
        if (!cleanInterval)
            return;

        try {
            if (!this.queryCacheEnabled || this.queryCacheDiskSize <= 0)
                return;

            const db = this.db;

            let rows = await db.select({table: 'query_time', count: true});
            const delCount = rows[0].count - this.queryCacheDiskSize;

            if (delCount < 1)
                return;

            //выберем delCount кандидатов на удаление
            rows = await db.select({
                table: 'query_time',
                rawResult: true,
                where: `
                    const delCount = ${delCount};
                    const rows = [];

                    @unsafeIter(@all(), (r) => {
                        rows.push(r);
                        return false;
                    });

                    rows.sort((a, b) => a.time - b.time);

                    return rows.slice(0, delCount).map(r => r.id);
                `
            });

            const ids = rows[0].rawResult;

            //удаляем
            await db.delete({table: 'query_cache', where: `@@id(${db.esc(ids)})`});
            await db.delete({table: 'query_time', where: `@@id(${db.esc(ids)})`});
            
            //console.log('Cache clean', ids);
        } catch(e) {
            console.error(e.message);
        } finally {
            if (!this.closed) {
                this.timer = setTimeout(() => { this.periodicCleanCache(); }, cleanInterval);
            }
        }
    }

    async close() {
        while (this.searchFlag > 0) {
            await utils.sleep(50);
        }

        this.searchCache = null;

        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        this.closed = true;
    }
}

module.exports = DbSearcher;