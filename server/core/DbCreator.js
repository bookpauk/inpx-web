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

        const splitAuthor = (author) => {
            if (!author) {
                author = 'Автор не указан';
            }

            const result = author.split(',');
            if (result.length > 1)
                result.push(author);

            return result;
        }

        const parsedCallback = async(chunk) => {
            for (const rec of chunk) {
                rec.id = ++id;

                if (!rec.del) {
                    bookCount++;
                    if (!rec.author)
                        noAuthorBookCount++;
                } else {
                    bookDelCount++;
                }

                //авторы
                const author = splitAuthor(rec.author);

                for (let i = 0; i < author.length; i++) {
                    const a = author[i];
                    const value = a.toLowerCase();

                    let authorRec;                    
                    if (authorMap.has(value)) {
                        const authorTmpId = authorMap.get(value);
                        authorRec = authorArr[authorTmpId];
                    } else {
                        authorRec = {tmpId: authorArr.length, author: a, value, bookId: []};
                        authorArr.push(authorRec);
                        authorMap.set(value, authorRec.tmpId);

                        if (author.length == 1 || i < author.length - 1) //без соавторов
                            authorCount++;
                    }

                    //это нужно для того, чтобы имя автора начиналось с заглавной
                    if (a[0].toUpperCase() === a[0])
                        authorRec.author = a;
                    
                    //ссылки на книги
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
        const parseField = (fieldValue, fieldMap, fieldArr, authorIds) => {
            if (fieldValue) {
                const value = fieldValue.toLowerCase();

                let fieldRec;
                if (fieldMap.has(value)) {
                    const fieldId = fieldMap.get(value);
                    fieldRec = fieldArr[fieldId];
                } else {
                    fieldRec = {id: fieldArr.length, value, authorId: new Set()};
                    fieldArr.push(fieldRec);
                    fieldMap.set(value, fieldRec.id);
                }

                for (const id of authorIds) {
                    fieldRec.authorId.add(id);
                }
            }
        };

        const parseBookRec = (rec) => {
            //авторы
            const author = splitAuthor(rec.author);

            const authorIds = [];
            for (const a of author) {
                const authorId = authorMap.get(a);
                if (!authorId) //подстраховка
                    continue;
                authorIds.push(authorId);
            }

            //серии
            parseField(rec.series, seriesMap, seriesArr, authorIds);

            //названия
            parseField(rec.title, titleMap, titleArr, authorIds);

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
            parseField(rec.lang, langMap, langArr, authorIds);
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

        const saveTable = async(table, arr, nullArr, authorIdToArray = true) => {
            
            arr.sort((a, b) => a.value.localeCompare(b.value));

            await db.create({
                table,
                index: {field: 'value', unique: true, depth: 1000000},
            });

            //вставка в БД по кусочкам, экономим память
            for (let i = 0; i < arr.length; i += chunkSize) {
                const chunk = arr.slice(i, i + chunkSize);
                
                if (authorIdToArray) {
                    for (const rec of chunk)
                        rec.authorId = Array.from(rec.authorId);
                }

                await db.insert({table, rows: chunk});

                await utils.sleep(100);
            }

            nullArr();
            await db.close({table});
            utils.freeMemory();
        };

        //author
        callback({job: 'author save', jobMessage: 'Сохранение авторов книг'});
        await saveTable('author', authorArr, () => {authorArr = null}, false);

        //series
        callback({job: 'series save', jobMessage: 'Сохранение серий книг'});
        await saveTable('series', seriesArr, () => {seriesArr = null});

        //title
        callback({job: 'title save', jobMessage: 'Сохранение названий книг'});
        await saveTable('title', titleArr, () => {titleArr = null});

        //genre
        callback({job: 'genre save', jobMessage: 'Сохранение жанров'});
        await saveTable('genre', genreArr, () => {genreArr = null});

        //lang
        callback({job: 'lang save', jobMessage: 'Сохранение языков'});
        await saveTable('lang', langArr, () => {langArr = null});

        //кэш-таблицы запросов
        await db.create({table: 'query_cache'});
        await db.create({table: 'query_time'});

        callback({job: 'done', jobMessage: ''});
    }
}

module.exports = DbCreator;