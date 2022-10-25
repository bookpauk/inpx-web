//const _ = require('lodash');
const utils = require('./utils');

const maxMemCacheSize = 100;
const maxLimit = 1000;

const emptyFieldValue = '?';
const maxUtf8Char = String.fromCodePoint(0xFFFFF);
const ruAlphabet = 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя';
const enAlphabet = 'abcdefghijklmnopqrstuvwxyz';
const enruArr = (ruAlphabet + enAlphabet).split('');

class DbSearcher {
    constructor(config, db) {
        this.config = config;
        this.db = db;

        this.searchFlag = 0;
        this.timer = null;
        this.closed = false;

        this.memCache = new Map();

        this.periodicCleanCache();//no await
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

    async selectAuthorIds(query) {
        const db = this.db;

        const authorKеy = `select-ids-author-${query.author}`;
        let authorIds = await this.getCached(authorKеy);

        //сначала выберем все id авторов по фильтру
        //порядок id соответствует ASC-сортировке по author    
        if (authorIds === null) {
            if (query.author && query.author !== '*') {
                const where = this.getWhere(query.author);

                const authorRows = await db.select({
                    table: 'author',
                    rawResult: true,
                    where: `return Array.from(${where})`,
                });

                authorIds = authorRows[0].rawResult;
            } else {//все авторы
                const authorRows = await db.select({
                    table: 'author',
                    rawResult: true,
                    where: `return Array.from(@all())`,
                });

                authorIds = authorRows[0].rawResult;
            }

            await this.putCached(authorKеy, authorIds);
        }

        const idsArr = [];

        //серии
        if (query.series && query.series !== '*') {
            const seriesKеy = `select-ids-series-${query.series}`;
            let seriesIds = await this.getCached(seriesKеy);

            if (seriesIds === null) {
                const where = this.getWhere(query.series);

                const seriesRows = await db.select({
                    table: 'series',
                    rawResult: true,
                    where: `
                        const ids = ${where};

                        const result = new Set();
                        for (const id of ids) {
                            const row = @unsafeRow(id);
                            for (const authorId of row.authorId)
                                result.add(authorId);
                        }

                        return Array.from(result);
                    `
                });

                seriesIds = seriesRows[0].rawResult;
                await this.putCached(seriesKеy, seriesIds);
            }

            idsArr.push(seriesIds);
        }

        //названия
        if (query.title && query.title !== '*') {
            const titleKey = `select-ids-title-${query.title}`;
            let titleIds = await this.getCached(titleKey);

            if (titleIds === null) {
                const where = this.getWhere(query.title);

                let titleRows = await db.select({
                    table: 'title',
                    rawResult: true,
                    where: `
                        const ids = ${where};

                        const result = new Set();
                        for (const id of ids) {
                            const row = @unsafeRow(id);
                            for (const authorId of row.authorId)
                                result.add(authorId);
                        }

                        return Array.from(result);
                    `
                });

                titleIds = titleRows[0].rawResult;
                await this.putCached(titleKey, titleIds);
            }

            idsArr.push(titleIds);

            //чистки памяти при тяжелых запросах
            if (this.config.lowMemoryMode && query.title[0] == '*') {
                utils.freeMemory();
                await db.freeMemory();
            }
        }

        //жанры
        if (query.genre) {
            const genreKey = `select-ids-genre-${query.genre}`;
            let genreIds = await this.getCached(genreKey);

            if (genreIds === null) {
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
                            for (const authorId of row.authorId)
                                result.add(authorId);
                        }

                        return Array.from(result);
                    `
                });

                genreIds = genreRows[0].rawResult;
                await this.putCached(genreKey, genreIds);
            }

            idsArr.push(genreIds);
        }

        //языки
        if (query.lang) {
            const langKey = `select-ids-lang-${query.lang}`;
            let langIds = await this.getCached(langKey);

            if (langIds === null) {
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
                            for (const authorId of row.authorId)
                                result.add(authorId);
                        }

                        return Array.from(result);
                    `
                });

                langIds = langRows[0].rawResult;
                await this.putCached(langKey, langIds);
            }

            idsArr.push(langIds);
        }

/*
        //ищем пересечение множеств
        idsArr.push(authorIds);

        if (idsArr.length > 1) {
            const idsSetArr = idsArr.map(ids => new Set(ids));
            authorIds = Array.from(utils.intersectSet(idsSetArr));
        }

       //сортировка
        authorIds.sort((a, b) => a - b);
*/

        //ищем пересечение множеств, работает быстрее предыдущего
        if (idsArr.length) {
            idsArr.push(authorIds);

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
            authorIds = Array.from(inter);
        }
        //сортировка
        authorIds.sort((a, b) => a - b);

        return authorIds;
    }

    async selectSeriesIds(query) {
        const db = this.db;

        let seriesIds = [];

        //серии
        if (query.series && query.series !== '*') {
            const where = this.getWhere(query.series);

            const seriesRows = await db.select({
                table: 'series',
                rawResult: true,
                where: `return Array.from(${where})`,
            });

            seriesIds = seriesRows[0].rawResult;
        } else {
            const authorRows = await db.select({
                table: 'series',
                rawResult: true,
                where: `return Array.from(@all())`,
            });

            seriesIds = authorRows[0].rawResult;
        }

        seriesIds.sort((a, b) => a - b);

        return seriesIds;
    }

    queryKey(q) {
        return JSON.stringify([q.author, q.series, q.title, q.genre, q.lang]);
    }

    async getCached(key) {
        if (!this.config.queryCacheEnabled)
            return null;

        let result = null;

        const db = this.db;
        const memCache = this.memCache;

        if (memCache.has(key)) {//есть в недавних
            result = memCache.get(key);

            //изменим порядок ключей, для последующей правильной чистки старых
            memCache.delete(key);
            memCache.set(key, result);
        } else {//смотрим в таблице
            const rows = await db.select({table: 'query_cache', where: `@@id(${db.esc(key)})`});

            if (rows.length) {//нашли в кеше
                await db.insert({
                    table: 'query_time',
                    replace: true,
                    rows: [{id: key, time: Date.now()}],
                });

                result = rows[0].value;
                memCache.set(key, result);

                if (memCache.size > maxMemCacheSize) {
                    //удаляем самый старый ключ-значение
                    for (const k of memCache.keys()) {
                        memCache.delete(k);
                        break;
                    }
                }
            }
        }

        return result;
    }

    async putCached(key, value) {
        if (!this.config.queryCacheEnabled)
            return;

        const db = this.db;

        const memCache = this.memCache;
        memCache.set(key, value);

        if (memCache.size > maxMemCacheSize) {
            //удаляем самый старый ключ-значение
            for (const k of memCache.keys()) {
                memCache.delete(k);
                break;
            }
        }

        //кладем в таблицу
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
    }

    async authorSearch(query) {
        if (this.closed)
            throw new Error('DbSearcher closed');

        this.searchFlag++;

        try {
            const db = this.db;

            const key = `author-ids-${this.queryKey(query)}`;

            //сначала попробуем найти в кеше
            let authorIds = await this.getCached(key);
            if (authorIds === null) {//не нашли в кеше, ищем в поисковых таблицах
                authorIds = await this.selectAuthorIds(query);

                await this.putCached(key, authorIds);
            }

            const totalFound = authorIds.length;
            let limit = (query.limit ? query.limit : 100);
            limit = (limit > maxLimit ? maxLimit : limit);
            const offset = (query.offset ? query.offset : 0);

            //выборка найденных авторов
            const result = await db.select({
                table: 'author',
                map: `(r) => ({id: r.id, author: r.author, bookCount: r.bookCount, bookDelCount: r.bookDelCount})`,
                where: `@@id(${db.esc(authorIds.slice(offset, offset + limit))})`
            });

            return {result, totalFound};
        } finally {
            this.searchFlag--;
        }
    }

    async seriesSearch(query) {
        if (this.closed)
            throw new Error('DbSearcher closed');

        this.searchFlag++;

        try {
            const db = this.db;

            const key = `series-ids-${this.queryKey(query)}`;

            //сначала попробуем найти в кеше
            let seriesIds = await this.getCached(key);
            if (seriesIds === null) {//не нашли в кеше, ищем в поисковых таблицах
                seriesIds = await this.selectSeriesIds(query);

                await this.putCached(key, seriesIds);
            }

            const totalFound = seriesIds.length;
            let limit = (query.limit ? query.limit : 100);
            limit = (limit > maxLimit ? maxLimit : limit);
            const offset = (query.offset ? query.offset : 0);

            //выборка найденных авторов
            const result = await db.select({
                table: 'series_book',
                map: `(r) => ({id: r.id, series: r.series, bookCount: r.bookCount, bookDelCount: r.bookDelCount})`,
                where: `@@id(${db.esc(seriesIds.slice(offset, offset + limit))})`
            });

            return {result, totalFound};
        } finally {
            this.searchFlag--;
        }
    }

    async getAuthorBookList(authorId) {
        if (this.closed)
            throw new Error('DbSearcher closed');

        if (!authorId)
            return {author: '', books: ''};

        this.searchFlag++;

        try {
            const db = this.db;

            //выборка книг автора по authorId
            const rows = await db.select({
                table: 'author_book',
                where: `@@id(${db.esc(authorId)})`
            });

            let author = '';
            let books = '';

            if (rows.length) {
                author = rows[0].author;
                books = rows[0].books;
            }

            return {author, books};
        } finally {
            this.searchFlag--;
        }
    }

    async getSeriesBookList(series) {
        if (this.closed)
            throw new Error('DbSearcher closed');

        if (!series)
            return {books: ''};

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

            let books;
            if (rows.length && rows[0].rawResult.length) {
                //выборка книг серии
                rows = await db.select({
                    table: 'series_book',
                    where: `@@id(${rows[0].rawResult[0]})`
                });

                if (rows.length)
                    books = rows[0].books;
            }

            return {books: (books && books.length ? JSON.stringify(books) : '')};
        } finally {
            this.searchFlag--;
        }
    }

    async periodicCleanCache() {
        this.timer = null;
        const cleanInterval = this.config.cacheCleanInterval*60*1000;
        if (!cleanInterval)
            return;

        try {
            const db = this.db;

            const oldThres = Date.now() - cleanInterval;

            //выберем всех кандидатов на удаление
            const rows = await db.select({
                table: 'query_time',
                where: `
                    @@iter(@all(), (r) => (r.time < ${db.esc(oldThres)}));
                `
            });

            const ids = [];
            for (const row of rows)
                ids.push(row.id);

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