//const _ = require('lodash');

const utils = require('./utils');

const maxUtf8Char = String.fromCodePoint(0xFFFFF);

class DbSearcher {
    constructor(config, db) {
        this.config = config;
        this.db = db;

        this.searchFlag = 0;
        this.timer = null;
        this.closed = false;

        this.periodicCleanCache();//no await
    }

    async selectAuthorIds(query) {
        const db = this.db;

        let authorRows;
        let authorIds = new Set();
        //сначала выберем все id авторов по фильтру
        //порядок id соответсвует ASC-сортировке по author
        if (query.author) {
            const a = query.author.toLowerCase(query.author);

            authorRows = await db.select({
                table: 'author',
                map: `(r) => ({id: r.id})`,
                where: `
                    @@dirtyIndexLR('value', ${db.esc(a)}, ${db.esc(a + maxUtf8Char)})
                `,
            });

            for (const row of authorRows)
                authorIds.add(row.id);
        } else {//все авторы
            if (!db.searchCache.authorIdsAll) {
                authorRows = await db.select({
                    table: 'author',
                    map: `(r) => ({id: r.id})`,
                });

                db.searchCache.authorIdsAll = [];
                for (const row of authorRows) {
                    authorIds.add(row.id);
                    db.searchCache.authorIdsAll.push(row.id);
                }
            } else {//оптимизация
                for (const id of db.searchCache.authorIdsAll) {
                    authorIds.add(id);
                }
            }
        }

        const idsArr = [];
        idsArr.push(authorIds);

        //серии
        //названия
        //жанры
        //языки

        if (idsArr.length > 1)
            authorIds = utils.intersectSet(idsArr);

        //сортировка
        authorIds = Array.from(authorIds);
        
        authorIds.sort((a, b) => a > b);

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
        const keyStr = keyArr.join('');
        
        if (!keyStr) {//пустой запрос
            if (db.searchCache.authorIdsAll)
                result = db.searchCache.authorIdsAll;
            else
                result = await this.selectAuthorIds(query);

        } else {//непустой запрос
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
            const limit = (query.limit ? query.limit : 1000);

            //выборка найденных авторов
            let result = await db.select({
                table: 'author',
                map: `(r) => ({id: r.id, author: r.author})`,
                where: `@@id(${db.esc(authorIds.slice(0, limit))})`
            });

            return {result, totalFound};
        } finally {
            this.searchFlag--;
        }
    }

    async periodicCleanCache() {
        this.timer = null;
        const cleanInterval = 5*1000;//this.config.cacheCleanInterval*60*1000;

        try {
            const db = this.db;

            const oldThres = Date.now() - cleanInterval;

            //выберем всех кандидатов удаление
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
            
            console.log('Cache clean', ids);
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