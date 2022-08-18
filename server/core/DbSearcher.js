//const _ = require('lodash');

const utils = require('./utils');

class DbSearcher {
    constructor(db) {
        this.db = db;
    }

    async selectAuthorIds(query) {
        const db = this.db;

        let authorRows;
        //сначала выберем все id авторов по фильтру
        //порядок id соответсвует ASC-сортировке по author
        if (query.author) {
            //
        } else {
            authorRows = await db.select({
                table: 'author',
                map: `(r) => ({id: r.id})`,
            });
        }

        let authorIds = new Set();
        for (const row of authorRows)
            authorIds.add(row.id);

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
        authorIds.sort();

        return authorIds;
    }

    async getAuthorIds(query) {
        const db = this.db;

        if (!db.searchCache)
            db.searchCache = {};

        /*const q = query;
        const key = JSON.stringify([q.author, ]);
        query);
        delete q.limit;

        q = */
        return await this.selectAuthorIds(query);
    }

    async search(query) {
        const db = this.db;

        const authorIds = await this.getAuthorIds(query);

        const totalFound = authorIds.length;
        const limit = (query.limit ? query.limit : 1000);

        //выборка найденных авторов
        let result = await db.select({
            table: 'author',
            map: `(r) => ({id: r.id, author: r.author})`,
            where: `@@id(${db.esc(authorIds)})`
        });

        result = result.slice(0, limit);

        return {result, totalFound};
    }
}

module.exports = DbSearcher;