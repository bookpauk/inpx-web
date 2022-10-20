//const _ = require('lodash');

const utils = require('./utils');

const maxMemCacheSize = 100;

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

        db.searchCache = {
            memCache: new Map(),
            authorIdsAll: false,
        };

        this.periodicCleanCache();//no await
    }

    getWhere(a) {
        const db = this.db;

        a = a.toLowerCase();
        let where;

        //особая обработка префиксов
        if (a[0] == '=') {
            a = a.substring(1);
            where = `@@dirtyIndexLR('value', ${db.esc(a)}, ${db.esc(a)})`;
        } else if (a[0] == '*') {
            a = a.substring(1);
            where = `@@indexIter('value', (v) => (v.indexOf(${db.esc(a)}) >= 0) )`;
        } else if (a[0] == '#') {
            a = a.substring(1);
            where = `@@indexIter('value', (v) => {                    
                const enru = new Set(${db.esc(enruArr)});
                return !v || (!enru.has(v[0].toLowerCase()) && v.indexOf(${db.esc(a)}) >= 0);
            });`;
        } else {
            where = `@@dirtyIndexLR('value', ${db.esc(a)}, ${db.esc(a + maxUtf8Char)})`;
        }

        return where;
    }

    async selectAuthorIds(query) {
        const db = this.db;

        let authorIds = [];

        //сначала выберем все id авторов по фильтру
        //порядок id соответсвует ASC-сортировке по author
        if (query.author && query.author !== '*') {
            const where = this.getWhere(query.author);

            const authorRows = await db.select({
                table: 'author',
                dirtyIdsOnly: true,
                where
            });

            for (const row of authorRows)
                authorIds.push(row.id);
        } else {//все авторы
            if (!db.searchCache.authorIdsAll) {
                const authorRows = await db.select({
                    table: 'author',
                    dirtyIdsOnly: true,
                });

                for (const row of authorRows) {
                    authorIds.push(row.id);
                }

                db.searchCache.authorIdsAll = authorIds;
            } else {//оптимизация
                authorIds = db.searchCache.authorIdsAll;
            }
        }

        const idsArr = [];

        //серии
        if (query.series && query.series !== '*') {
            const where = this.getWhere(query.series);

            const seriesRows = await db.select({
                table: 'series',
                map: `(r) => ({authorId: r.authorId})`,
                where
            });

            const ids = new Set();
            for (const row of seriesRows) {
                for (const id of row.authorId)
                    ids.add(id);
            }

            idsArr.push(ids);
        }

        //названия
        if (query.title && query.title !== '*') {
            const where = this.getWhere(query.title);

            let titleRows = await db.select({
                table: 'title',
                map: `(r) => ({authorId: r.authorId})`,
                where
            });

            const ids = new Set();
            for (const row of titleRows) {
                for (const id of row.authorId)
                    ids.add(id);
            }
            idsArr.push(ids);

            //чистки памяти при тяжелых запросах
            if (query.title[0] == '*') {
                titleRows = null;
                utils.freeMemory();
                await db.freeMemory();
            }
        }

        //жанры
        if (query.genre) {
            const genres = query.genre.split(',');

            const ids = new Set();
            for (const g of genres) {
                const genreRows = await db.select({
                    table: 'genre',
                    map: `(r) => ({authorId: r.authorId})`,
                    where: `@@indexLR('value', ${db.esc(g)}, ${db.esc(g)})`,
                });

                for (const row of genreRows) {
                    for (const id of row.authorId)
                        ids.add(id);
                }
            }

            idsArr.push(ids);
        }

        //языки
        if (query.lang) {
            const langs = query.lang.split(',');

            const ids = new Set();
            for (const l of langs) {
                const langRows = await db.select({
                    table: 'lang',
                    map: `(r) => ({authorId: r.authorId})`,
                    where: `@@indexLR('value', ${db.esc(l)}, ${db.esc(l)})`,
                });

                for (const row of langRows) {
                    for (const id of row.authorId)
                        ids.add(id);
                }
            }
            
            idsArr.push(ids);
        }

        if (idsArr.length) {
            //ищем пересечение множеств
            idsArr.push(new Set(authorIds));
            authorIds = Array.from(utils.intersectSet(idsArr));
        }

        //сортировка
        authorIds.sort((a, b) => a - b);

        return authorIds;
    }

    queryKey(q) {
        return JSON.stringify([q.author, q.series, q.title, q.genre, q.lang]);
    }

    async getCached(key) {
        if (!this.config.queryCacheEnabled)
            return null;

        let result = null;

        const db = this.db;
        const memCache = db.searchCache.memCache;

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

        const memCache = db.searchCache.memCache;
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

    async search(query) {
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
            limit = (limit > 1000 ? 1000 : limit);
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

    async getBookList(authorId) {
        if (this.closed)
            throw new Error('DbSearcher closed');

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

        this.searchFlag++;

        try {
            const db = this.db;

            series = series.toLowerCase();

            //выборка серии по названию серии
            let rows = await db.select({
                table: 'series',
                where: `@@dirtyIndexLR('value', ${db.esc(series)}, ${db.esc(series)})`
            });

            let books;
            if (rows.length) {
                //выборка книг серии
                rows = await db.select({
                    table: 'series_book',
                    where: `@@id(${rows[0].id})`
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

        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        this.closed = true;
    }
}

module.exports = DbSearcher;