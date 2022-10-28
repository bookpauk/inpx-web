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

    queryKey(q) {
        return JSON.stringify([q.author, q.series, q.title, q.genre, q.lang, q.del, q.date, q.librate]);
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

        const authorKеy = `author-ids-author-${query.author}`;
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
            const seriesKеy = `author-ids-series-${query.series}`;
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
            const titleKey = `author-ids-title-${query.title}`;
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
            const genreKey = `author-ids-genre-${query.genre}`;
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
            const langKey = `author-ids-lang-${query.lang}`;
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

        //удаленные
        if (query.del !== undefined) {
            const delKey = `author-ids-del-${query.del}`;
            let delIds = await this.getCached(delKey);

            if (delIds === null) {
                const delRows = await db.select({
                    table: 'del',
                    rawResult: true,
                    where: `
                        const ids = @indexLR('value', ${db.esc(query.del)}, ${db.esc(query.del)});
                        
                        const result = new Set();
                        for (const id of ids) {
                            const row = @unsafeRow(id);
                            for (const authorId of row.authorId)
                                result.add(authorId);
                        }

                        return Array.from(result);
                    `
                });

                delIds = delRows[0].rawResult;
                await this.putCached(delKey, delIds);
            }

            idsArr.push(delIds);
        }

        //дата поступления
        if (query.date) {
            const dateKey = `author-ids-date-${query.date}`;
            let dateIds = await this.getCached(dateKey);

            if (dateIds === null) {
                let [from = '', to = ''] = query.date.split(',');

                const dateRows = await db.select({
                    table: 'date',
                    rawResult: true,
                    where: `
                        const ids = @indexLR('value', ${db.esc(from)} || undefined, ${db.esc(to)} || undefined);
                        
                        const result = new Set();
                        for (const id of ids) {
                            const row = @unsafeRow(id);
                            for (const authorId of row.authorId)
                                result.add(authorId);
                        }

                        return Array.from(result);
                    `
                });

                dateIds = dateRows[0].rawResult;
                await this.putCached(dateKey, dateIds);
            }

            idsArr.push(dateIds);
        }

        //оценка
        if (query.librate) {
            const librateKey = `author-ids-librate-${query.librate}`;
            let librateIds = await this.getCached(librateKey);

            if (librateIds === null) {
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
                            for (const authorId of row.authorId)
                                result.add(authorId);
                        }

                        return Array.from(result);
                    `
                });

                librateIds = dateRows[0].rawResult;
                await this.putCached(librateKey, librateIds);
            }

            idsArr.push(librateIds);
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

    getWhere2(query, ids, exclude = '') {
        const db = this.db;

        const filterBySearch = (searchValue) => {
            searchValue = searchValue.toLowerCase();

            //особая обработка префиксов
            if (searchValue[0] == '=') {

                searchValue = searchValue.substring(1);
                return `bookValue.localeCompare(${db.esc(searchValue)}) == 0`;
            } else if (searchValue[0] == '*') {

                searchValue = searchValue.substring(1);
                return `bookValue !== ${db.esc(emptyFieldValue)} && bookValue.indexOf(${db.esc(searchValue)}) >= 0`;
            } else if (searchValue[0] == '#') {

                searchValue = searchValue.substring(1);
                return `!bookValue || (bookValue !== ${db.esc(emptyFieldValue)} && !enru.has(bookValue[0]) && bookValue.indexOf(${db.esc(searchValue)}) >= 0)`;
            } else {
                return `bookValue.localeCompare(${db.esc(searchValue)}) >= 0 && bookValue.localeCompare(${db.esc(searchValue + maxUtf8Char)}) <= 0`;
            }
        };

        //подготовка фильтра
        let filter = '';
        let closures = '';

        //порядок важен, более простые проверки вперед

        //удаленные
        if (query.del !== undefined) {
            filter += `
                if (book.del !== ${db.esc(query.del)})
                    return false;
            `;            
        }

        //дата поступления
        if (query.date) {
            let [from = '0000-00-00', to = '9999-99-99'] = query.date.split(',');
            filter += `
                if (!(book.date >= ${db.esc(from)} && book.date <= ${db.esc(to)}))
                    return false;
            `;
        }

        //оценка
        if (query.librate) {
            closures += `
                const searchLibrate = new Set(${db.esc(query.librate.split(',').map(n => parseInt(n, 10)).filter(n => !isNaN(n)))});
            `;
            filter += `
                if (!searchLibrate.has(book.librate))
                    return false;
            `;
        }

        //серии
        if (exclude !== 'series' && query.series && query.series !== '*') {
            closures += `
                const checkSeries = (bookValue) => {
                    if (!bookValue)
                        bookValue = ${db.esc(emptyFieldValue)};

                    bookValue = bookValue.toLowerCase();

                    return ${filterBySearch(query.series)};
                };
            `;
            filter += `
                if (!checkSeries(book.series))
                    return false;
            `;
        }

        //названия
        if (exclude !== 'title' && query.title && query.title !== '*') {
            closures += `
                const checkTitle = (bookValue) => {
                    if (!bookValue)
                        bookValue = ${db.esc(emptyFieldValue)};

                    bookValue = bookValue.toLowerCase();

                    return ${filterBySearch(query.title)};
                };
            `;
            filter += `
                if (!checkTitle(book.title))
                    return false;
            `;
        }

        //языки
        if (exclude !== 'lang' && query.lang) {
            const queryLangs = query.lang.split(',');

            closures += `
                const queryLangs = new Set(${db.esc(queryLangs)});

                const checkLang = (bookValue) => {
                    if (!bookValue)
                        bookValue = ${db.esc(emptyFieldValue)};

                    return queryLangs.has(bookValue);
                };
            `;
            filter += `
                if (!checkLang(book.lang))
                    return false;
            `;
        }

        //жанры
        if (exclude !== 'genre' && query.genre) {
            const queryGenres = query.genre.split(',');

            closures += `
                const queryGenres = new Set(${db.esc(queryGenres)});

                const checkGenre = (bookValue) => {
                    if (!bookValue)
                        bookValue = ${db.esc(emptyFieldValue)};

                    return queryGenres.has(bookValue);
                };
            `;
            filter += `
                const genres = book.genre.split(',');
                found = false;
                for (const g of genres) {
                    if (checkGenre(g)) {
                        found = true;
                        break;
                    }
                }

                if (!found)
                    return false;
            `;
        }

        //авторы
        if (exclude !== 'author' && query.author && query.author !== '*') {
            closures += `
                const splitAuthor = (author) => {
                    if (!author)
                        author = ${db.esc(emptyFieldValue)};

                    const result = author.split(',');
                    if (result.length > 1)
                        result.push(author);

                    return result;
                };

                const checkAuthor = (bookValue) => {
                    if (!bookValue)
                        bookValue = ${db.esc(emptyFieldValue)};

                    bookValue = bookValue.toLowerCase();

                    return ${filterBySearch(query.author)};
                };
            `;

            filter += `
                const author = splitAuthor(book.author);
                found = false;
                for (const a of author) {
                    if (checkAuthor(a)) {
                        found = true;
                        break;
                    }
                }

                if (!found)
                    return false;
            `;
        }

        //формируем where
        let where = '';
        if (filter) {
            where = `
                const enru = new Set(${db.esc(enruArr)});

                ${closures}

                const filterBook = (book) => {
                    let found = false;
                    ${filter}
                    return true;
                };

                let ids;
                if (${!ids}) {
                    ids = @all();
                } else {
                    ids = ${db.esc(ids)};
                }

                const result = new Set();
                for (const id of ids) {
                    const row = @unsafeRow(id);

                    if (row) {
                        for (const book of row.books) {
                            if (filterBook(book)) {
                                result.add(id);
                                break;
                            }
                        }
                    }
                }

                return Array.from(result);
            `;
        }

        return where;
    }

    async selectSeriesIds(query) {
        const db = this.db;

        let seriesIds = false;
        let isAll = !(query.series && query.series !== '*');

        //серии
        const seriesKеy = `series-ids-series-${query.series}`;
        seriesIds = await this.getCached(seriesKеy);

        if (seriesIds === null) {
            if (query.series && query.series !== '*') {
                const where = this.getWhere(query.series);

                const seriesRows = await db.select({
                    table: 'series',
                    rawResult: true,
                    where: `return Array.from(${where})`,
                });

                seriesIds = seriesRows[0].rawResult;
            } else {
                const seriesRows = await db.select({
                    table: 'series',
                    rawResult: true,
                    where: `return Array.from(@all())`,
                });

                seriesIds = seriesRows[0].rawResult;
            }

            seriesIds.sort((a, b) => a - b);

            await this.putCached(seriesKеy, seriesIds);
        }

        const where = this.getWhere2(query, (isAll ? false : seriesIds), 'series');

        if (where) {
            //тяжелый запрос перебором в series_book
            const rows = await db.select({
                table: 'series_book',
                rawResult: true,
                where,
            });

            seriesIds = rows[0].rawResult;
        }

        return seriesIds;
    }

    async selectTitleIds(query) {
        const db = this.db;

        let titleIds = false;
        let isAll = !(query.title && query.title !== '*');

        //серии
        const titleKеy = `title-ids-title-${query.title}`;
        titleIds = await this.getCached(titleKеy);

        if (titleIds === null) {
            if (query.title && query.title !== '*') {
                const where = this.getWhere(query.title);

                const titleRows = await db.select({
                    table: 'title',
                    rawResult: true,
                    where: `return Array.from(${where})`,
                });

                titleIds = titleRows[0].rawResult;
            } else {
                const titleRows = await db.select({
                    table: 'title',
                    rawResult: true,
                    where: `return Array.from(@all())`,
                });

                titleIds = titleRows[0].rawResult;
            }

            titleIds.sort((a, b) => a - b);

            await this.putCached(titleKеy, titleIds);
        }

        const where = this.getWhere2(query, (isAll ? false : titleIds), 'title');

        if (where) {
            //тяжелый запрос перебором в title_book
            const rows = await db.select({
                table: 'title_book',
                rawResult: true,
                where,
            });

            titleIds = rows[0].rawResult;
        }

        return titleIds;
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

    async titleSearch(query) {
        if (this.closed)
            throw new Error('DbSearcher closed');

        this.searchFlag++;

        try {
            const db = this.db;

            const key = `title-ids-${this.queryKey(query)}`;

            //сначала попробуем найти в кеше
            let titleIds = await this.getCached(key);
            if (titleIds === null) {//не нашли в кеше, ищем в поисковых таблицах
                titleIds = await this.selectTitleIds(query);

                await this.putCached(key, titleIds);
            }

            const totalFound = titleIds.length;
            let limit = (query.limit ? query.limit : 100);
            limit = (limit > maxLimit ? maxLimit : limit);
            const offset = (query.offset ? query.offset : 0);

            //выборка найденных авторов
            const result = await db.select({
                table: 'title_book',
                map: `(r) => ({id: r.id, title: r.title, books: r.books, bookCount: r.bookCount, bookDelCount: r.bookDelCount})`,
                where: `@@id(${db.esc(titleIds.slice(offset, offset + limit))})`
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