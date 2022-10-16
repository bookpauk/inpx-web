//const _ = require('lodash');

const utils = require('./utils');

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

        let authorIds = new Set();

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
                authorIds.add(row.id);
        } else {//все авторы
            if (!db.searchCache.authorIdsAll) {
                const authorRows = await db.select({
                    table: 'author',
                    dirtyIdsOnly: true,
                });

                db.searchCache.authorIdsAll = [];
                for (const row of authorRows) {
                    authorIds.add(row.id);
                    db.searchCache.authorIdsAll.push(row.id);
                }
            } else {//оптимизация
                authorIds = new Set(db.searchCache.authorIdsAll);
            }
        }

        const idsArr = [];
        idsArr.push(authorIds);

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

        if (idsArr.length > 1)
            authorIds = utils.intersectSet(idsArr);

        //сортировка
        authorIds = Array.from(authorIds);
        
        authorIds.sort((a, b) => a - b);

        return authorIds;
    }

    async getAuthorIds(query) {
        const db = this.db;

        if (!db.searchCache)
            db.searchCache = {};

        let result;

        //сначала попробуем найти в кеше
        const q = query;
        const keyArr = [q.author, q.series, q.title, q.genre, q.lang];
        const keyStr = `query-${keyArr.join('')}`;
        
        if (!keyStr) {//пустой запрос
            if (db.searchCache.authorIdsAll)
                result = db.searchCache.authorIdsAll;
            else
                result = await this.selectAuthorIds(query);

        } else {//непустой запрос
            if (this.config.queryCacheEnabled) {
                const key = JSON.stringify(keyArr);
                const rows = await db.select({table: 'query_cache', where: `@@id(${db.esc(key)})`});

                if (rows.length) {//нашли в кеше
                    await db.insert({
                        table: 'query_time',
                        replace: true,
                        rows: [{id: key, time: Date.now()}],
                    });

                    result = rows[0].value;
                } else {//не нашли в кеше, ищем в поисковых таблицах
                    result = await this.selectAuthorIds(query);

                    await db.insert({
                        table: 'query_cache',
                        replace: true,
                        rows: [{id: key, value: result}],
                    });
                    await db.insert({
                        table: 'query_time',
                        replace: true,
                        rows: [{id: key, time: Date.now()}],
                    });
                }
            } else {
                result = await this.selectAuthorIds(query);
            }
        }

        return result;
    }

    async search(query) {
        if (this.closed)
            throw new Error('DbSearcher closed');

        this.searchFlag++;

        try {
            const db = this.db;

            const authorIds = await this.getAuthorIds(query);

            const totalFound = authorIds.length;
            let limit = (query.limit ? query.limit : 100);
            limit = (limit > 1000 ? 1000 : limit);
            const offset = (query.offset ? query.offset : 0);

            //выборка найденных авторов
            let result = await db.select({
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

            //выборка автора по authorId
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
            const rows = await db.select({
                table: 'series',
                where: `@@dirtyIndexLR('value', ${db.esc(series)}, ${db.esc(series)})`
            });

            return {books: (rows.length ? rows[0].books : '')};
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