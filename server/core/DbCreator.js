const InpxParser = require('./InpxParser');
const utils = require('./utils');

class DbCreator {
    constructor(config) {
        this.config = config;
    }

    async run(db, callback) {
        const config = this.config;

        //book
        await db.create({
            table: 'book'
        });

        callback({job: 'load inpx', jobMessage: 'Загрузка INPX'});
        const readFileCallback = async(readState) => {
            callback(readState);
        };

        //поисковые таблицы, ниже сохраним в БД
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

        //stats
        let authorCount = 0;
        let bookCount = 0;
        let noAuthorBookCount = 0;
        let bookDelCount = 0;

        //stuff
        let recsLoaded = 0;
        let id = 0;
        let chunkNum = 0;
        const parsedCallback = async(chunk) => {
            for (const rec of chunk) {
                rec.id = ++id;

                if (!rec.del)
                    bookCount++;
                else 
                    bookDelCount++;

                if (!rec.author) {
                    if (!rec.del)
                        noAuthorBookCount++;
                    rec.author = 'Автор не указан';
                }

                //авторы
                const author = rec.author.split(',');
                if (author.length > 1)
                    author.push(rec.author);

                for (let i = 0; i < author.length; i++) {
                    const a = author[i];

                    let authorRec;                    
                    if (authorMap.has(a)) {
                        const authorTmpId = authorMap.get(a);
                        authorRec = authorArr[authorTmpId];
                    } else {
                        authorRec = {tmpId: authorArr.length, author: a, value: a.toLowerCase(), bookId: []};
                        authorArr.push(authorRec);
                        authorMap.set(a, authorRec.tmpId);

                        if (author.length == 1 || i < author.length - 1) //без соавторов
                            authorCount++;
                    }

                    authorRec.bookId.push(id);
                }
            }

            await db.insert({table: 'book', rows: chunk});
            
            recsLoaded += chunk.length;
            callback({recsLoaded});

            if (chunkNum++ % 10 == 0)
                utils.freeMemory();
        };

        //парсинг 1
        const parser = new InpxParser();
        await parser.parse(config.inpxFile, readFileCallback, parsedCallback);

        utils.freeMemory();

        //отсортируем авторов и выдадим им правильные id
        //порядок id соответствует ASC-сортировке по author.toLowerCase
        callback({job: 'author sort', jobMessage: 'Сортировка'});
        authorArr.sort((a, b) => a.value.localeCompare(b.value));

        id = 0;
        authorMap = new Map();
        for (const authorRec of authorArr) {
            authorRec.id = ++id;
            authorMap.set(authorRec.author, id);
            delete authorRec.tmpId;
        }

        utils.freeMemory();

        //теперь можно создавать остальные поисковые таблицы
        const parseBookRec = (rec) => {
            //авторы
            if (!rec.author) {
                if (!rec.del)
                    noAuthorBookCount++;
                rec.author = 'Автор не указан';
            }

            const author = rec.author.split(',');
            if (author.length > 1)
                author.push(rec.author);

            const authorIds = [];
            for (const a of author) {
                const authorId = authorMap.get(a);
                if (!authorId) //подстраховка
                    continue;
                authorIds.push(authorId);
            }

            //серии
            if (rec.series) {
                const series = rec.series;

                let seriesRec;
                if (seriesMap.has(series)) {
                    const seriesId = seriesMap.get(series);
                    seriesRec = seriesArr[seriesId];
                } else {
                    seriesRec = {id: seriesArr.length, value: series.toLowerCase(), authorId: new Set()};
                    seriesArr.push(seriesRec);
                    seriesMap.set(series, seriesRec.id);
                }

                for (const id of authorIds) {
                    seriesRec.authorId.add(id);
                }
            }

            //названия
            if (rec.title) {
                const title = rec.title;

                let titleRec;
                if (titleMap.has(title)) {
                    const titleId = titleMap.get(title);
                    titleRec = titleArr[titleId];
                } else {
                    titleRec = {id: titleArr.length, value: title.toLowerCase(), authorId: new Set()};
                    titleArr.push(titleRec);
                    titleMap.set(title, titleRec.id);
                }

                for (const id of authorIds) {
                    titleRec.authorId.add(id);
                }
            }

            //жанры
            if (rec.genre) {
                const genre = rec.genre.split(',');

                for (const g of genre) {
                    let genreRec;
                    if (genreMap.has(g)) {
                        const genreId = genreMap.get(g);
                        genreRec = genreArr[genreId];
                    } else {
                        genreRec = {id: genreArr.length, value: g, authorId: new Set()};
                        genreArr.push(genreRec);
                        genreMap.set(g, genreRec.id);
                    }

                    for (const id of authorIds) {
                        genreRec.authorId.add(id);
                    }
                }
            }

            //языки
            if (rec.lang) {
                const lang = rec.lang;

                let langRec;
                if (langMap.has(lang)) {
                    const langId = langMap.get(lang);
                    langRec = langArr[langId];
                } else {
                    langRec = {id: langArr.length, value: lang, authorId: new Set()};
                    langArr.push(langRec);
                    langMap.set(lang, langRec.id);
                }

                for (const id of authorIds) {
                    langRec.authorId.add(id);
                }
            }
        }

        callback({job: 'search tables create', jobMessage: 'Создание поисковых таблиц'});

        //парсинг 2
        while (1) {// eslint-disable-line
            //пробегаемся по сохраненным книгам
            const rows = await db.select({
                table: 'book',
                where: `
                    let iter = @getItem('book_parsing');
                    if (!iter) {
                        iter = @all();
                        @setItem('book_parsing', iter);
                    }

                    const ids = new Set();
                    let id = iter.next();
                    while (!id.done && ids.size < 10000) {
                        ids.add(id.value);
                        id = iter.next();
                    }

                    return ids;
                `
            });

            if (rows.length) {
                for (const rec of rows)
                    parseBookRec(rec);
            } else {
                break;
            }
        }

        //чистка памяти, ибо жрет как не в себя
        authorMap = null;
        seriesMap = null;
        titleMap = null;
        genreMap = null;

        for (let i = 0; i < 3; i++) {
            utils.freeMemory();
            await utils.sleep(1000);
        }

        //config
        callback({job: 'config save', jobMessage: 'Сохранение конфигурации'});
        await db.create({
            table: 'config'
        });

        const stats = {
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

        const inpxHash = await utils.getFileHash(config.inpxFile, 'sha256', 'hex');

        await db.insert({table: 'config', rows: [
            {id: 'inpxInfo', value: parser.info},
            {id: 'stats', value: stats},
            {id: 'inpxHash', value: inpxHash},
        ]});

        //сохраним поисковые таблицы
        const chunkSize = 10000;

        //author
        callback({job: 'author save', jobMessage: 'Сохранение авторов книг'});
        await db.create({
            table: 'author',
            index: {field: 'value', depth: config.indexDepth},
        });

        //вставка в БД по кусочкам, экономим память
        for (let i = 0; i < authorArr.length; i += chunkSize) {
            const chunk = authorArr.slice(i, i + chunkSize);

            await db.insert({table: 'author', rows: chunk});
        }

        authorArr = null;
        await db.close({table: 'author'});
        utils.freeMemory();

        //series
        callback({job: 'series save', jobMessage: 'Сохранение серий книг'});
        await db.create({
            table: 'series',
            index: {field: 'value', depth: config.indexDepth},
        });

        //вставка в БД по кусочкам, экономим память
        for (let i = 0; i < seriesArr.length; i += chunkSize) {
            const chunk = seriesArr.slice(i, i + chunkSize);
            for (const rec of chunk)
                rec.authorId = Array.from(rec.authorId);

            await db.insert({table: 'series', rows: chunk});
        }

        seriesArr = null;
        await db.close({table: 'series'});
        utils.freeMemory();

        //title
        callback({job: 'title save', jobMessage: 'Сохранение названий книг'});
        await db.create({
            table: 'title',
            index: {field: 'value', depth: config.indexDepth},
        });

        //вставка в БД по кусочкам, экономим память
        let j = 0;
        for (let i = 0; i < titleArr.length; i += chunkSize) {
            const chunk = titleArr.slice(i, i + chunkSize);
            for (const rec of chunk)
                rec.authorId = Array.from(rec.authorId);

            await db.insert({table: 'title', rows: chunk});
            if (j++ % 10 == 0)
                utils.freeMemory();
            await utils.sleep(100);
        }

        titleArr = null;
        await db.close({table: 'title'});
        utils.freeMemory();

        //genre
        callback({job: 'genre save', jobMessage: 'Сохранение жанров'});
        await db.create({
            table: 'genre',
            index: {field: 'value', depth: config.indexDepth},
        });

        await db.insert({table: 'genre', rows: genreArr});

        genreArr = null;
        await db.close({table: 'genre'});
        utils.freeMemory();

        //lang
        callback({job: 'lang save', jobMessage: 'Сохранение языков'});
        await db.create({
            table: 'lang',
            index: {field: 'value', depth: config.indexDepth},
        });

        await db.insert({table: 'lang', rows: langArr});

        langArr = null;
        await db.close({table: 'lang'});
        utils.freeMemory();

        //кэш-таблицы


        callback({job: 'done', jobMessage: ''});
    }
}

module.exports = DbCreator;