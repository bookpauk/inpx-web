const InpxParser = require('./InpxParser');
const utils = require('./utils');

const emptyFieldValue = '?';

class DbCreator {
    constructor(config) {
        this.config = config;
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

        //stats
        let authorCount = 0;
        let bookCount = 0;
        let noAuthorBookCount = 0;
        let bookDelCount = 0;

        //stuff
        let recsLoaded = 0;
        callback({recsLoaded});
        let chunkNum = 0;

        const splitAuthor = (author) => {
            if (!author) {
                author = emptyFieldValue;
            }

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

        let id = 0;
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
                        authorRec = {tmpId: authorArr.length, author: a, value, bookCount: 0, bookDelCount: 0, bookId: []};
                        authorArr.push(authorRec);
                        authorMap.set(value, authorRec.tmpId);

                        if (author.length == 1 || i < author.length - 1) //без соавторов
                            authorCount++;
                    }

                    //это нужно для того, чтобы имя автора начиналось с заглавной
                    if (a[0].toUpperCase() === a[0])
                        authorRec.author = a;

                    //счетчики
                    if (!rec.del) {
                        authorRec.bookCount++;
                    } else {
                        authorRec.bookDelCount++;
                    }

                    //ссылки на книги
                    authorRec.bookId.push(id);
                }
            }

            await db.insert({table: 'book', rows: chunk});

            recsLoaded += chunk.length;
            callback({recsLoaded});

            if (chunkNum++ % 10 == 0 && config.lowMemoryMode)
                utils.freeMemory();
        };

        //парсинг 1
        const parser = new InpxParser();
        await parser.parse(config.inpxFile, readFileCallback, parsedCallback);

        utils.freeMemory();

        //отсортируем авторов и выдадим им правильные id
        //порядок id соответствует ASC-сортировке по author.toLowerCase
        callback({job: 'author sort', jobMessage: 'Сортировка авторов', jobStep: 2, progress: 0});
        await utils.sleep(100);
        authorArr.sort((a, b) => a.value.localeCompare(b.value));

        id = 0;
        authorMap = new Map();
        for (const authorRec of authorArr) {
            authorRec.id = ++id;
            authorMap.set(authorRec.author, id);
            delete authorRec.tmpId;
        }

        utils.freeMemory();

        //подготовка к сохранению author_book
        const saveBookChunk = async(authorChunk, callback) => {
            callback(0);

            const ids = [];
            for (const a of authorChunk) {
                for (const id of a.bookId) {
                    ids.push(id);
                }
            }

            ids.sort();// обязательно, иначе будет тормозить - особенности JembaDb

            callback(0.1);
            const rows = await db.select({table: 'book', where: `@@id(${db.esc(ids)})`});
            callback(0.6);
            await utils.sleep(100);

            const bookArr = new Map();
            for (const row of rows)
                bookArr.set(row.id, row);

            const abRows = [];
            for (const a of authorChunk) {
                const aBooks = [];
                for (const id of a.bookId) {
                    const rec = bookArr.get(id);
                    aBooks.push(rec);
                }

                abRows.push({id: a.id, author: a.author, books: JSON.stringify(aBooks)});

                delete a.bookId;//в дальнейшем не понадобится, authorArr сохраняем без него
            }

            callback(0.7);
            await db.insert({
                table: 'author_book',
                rows: abRows,
            });
            callback(1);
        };

        callback({job: 'book sort', jobMessage: 'Сортировка книг', jobStep: 3, progress: 0});

        //сохранение author_book
        await db.create({
            table: 'author_book',
        });

        let idsLen = 0;
        let aChunk = [];
        let prevI = 0;
        for (let i = 0; i < authorArr.length; i++) {// eslint-disable-line
            const author = authorArr[i];

            aChunk.push(author);
            idsLen += author.bookId.length;

            if (idsLen > 50000) {//константа выяснена эмпирическим путем "память/скорость"
                await saveBookChunk(aChunk, (p) => {
                    callback({progress: (prevI + (i - prevI)*p)/authorArr.length});
                });

                prevI = i;
                idsLen = 0;
                aChunk = [];
                await utils.sleep(100);
                utils.freeMemory();
                await db.freeMemory();
            }
        }
        if (aChunk.length) {
            await saveBookChunk(aChunk, () => {});
            aChunk = null;
        }

        callback({progress: 1});

        //чистка памяти, ибо жрет как не в себя
        await db.drop({table: 'book'});
        await db.freeMemory();
        utils.freeMemory();

        //парсинг 2, подготовка
        const parseField = (fieldValue, fieldMap, fieldArr, authorIds) => {
            if (!fieldValue)
                fieldValue = emptyFieldValue;

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
            let genre = rec.genre || emptyFieldValue;
            genre = rec.genre.split(',');

            for (let g of genre) {
                if (!g)
                    g = emptyFieldValue;

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

            //языки
            parseField(rec.lang, langMap, langArr, authorIds);
        };

        callback({job: 'search tables create', jobMessage: 'Создание поисковых таблиц', jobStep: 4, progress: 0});

        //парсинг 2, теперь можно создавать остальные поисковые таблицы
        let proc = 0;
        while (1) {// eslint-disable-line
            const rows = await db.select({
                table: 'author_book',
                where: `
                    let iter = @getItem('parse_book');
                    if (!iter) {
                        iter = @all();
                        @setItem('parse_book', iter);
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
                for (const row of rows) {
                    const books = JSON.parse(row.books);
                    for (const rec of books)
                        parseBookRec(rec);
                }

                proc += rows.length;
                callback({progress: proc/authorArr.length});
            } else
                break;

            await utils.sleep(100);
            if (config.lowMemoryMode) {
                utils.freeMemory();
                await db.freeMemory();
            }
        }

        //чистка памяти, ибо жрет как не в себя
        authorMap = null;
        seriesMap = null;
        titleMap = null;
        genreMap = null;

        utils.freeMemory();

        //config
        callback({job: 'config save', jobMessage: 'Сохранение конфигурации', jobStep: 5, progress: 0});
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

                if (i % 5 == 0) {
                    await db.freeMemory();
                    await utils.sleep(100);
                }

                callback({progress: i/arr.length});                
            }

            nullArr();
            await db.close({table});
            utils.freeMemory();
            await db.freeMemory();
        };

        //author
        callback({job: 'author save', jobMessage: 'Сохранение индекса авторов', jobStep: 6, progress: 0});
        await saveTable('author', authorArr, () => {authorArr = null}, false);

        //series
        callback({job: 'series save', jobMessage: 'Сохранение индекса серий', jobStep: 7, progress: 0});
        await saveTable('series', seriesArr, () => {seriesArr = null});

        //title
        callback({job: 'title save', jobMessage: 'Сохранение индекса названий', jobStep: 8, progress: 0});
        await saveTable('title', titleArr, () => {titleArr = null});

        //genre
        callback({job: 'genre save', jobMessage: 'Сохранение индекса жанров', jobStep: 9, progress: 0});
        await saveTable('genre', genreArr, () => {genreArr = null});

        //lang
        callback({job: 'lang save', jobMessage: 'Сохранение индекса языков', jobStep: 10, progress: 0});
        await saveTable('lang', langArr, () => {langArr = null});

        //кэш-таблицы запросов
        await db.create({table: 'query_cache'});
        await db.create({table: 'query_time'});

        callback({job: 'done', jobMessage: ''});
    }
}

module.exports = DbCreator;