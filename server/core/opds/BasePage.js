const _ = require('lodash');
const he = require('he');

const WebWorker = require('../WebWorker');//singleton
const XmlParser = require('../xml/XmlParser');

const spaceChar = String.fromCodePoint(0x00B7);
const emptyFieldValue = '?';
const maxUtf8Char = String.fromCodePoint(0xFFFFF);
const ruAlphabet = 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя';
const enAlphabet = 'abcdefghijklmnopqrstuvwxyz';
const enruArr = (ruAlphabet + enAlphabet).split('');
const enru = new Set(enruArr);

class BasePage {
    constructor(config) {        
        this.config = config;

        this.webWorker = new WebWorker(config);
        this.rootTag = 'feed';
        this.opdsRoot = config.opdsRoot;
    }

    makeEntry(entry = {}) {
        if (!entry.id)
            throw new Error('makeEntry: no id');
        if (!entry.title)
            throw new Error('makeEntry: no title');

        entry.title = he.escape(entry.title);

        const result = {
            updated: (new Date()).toISOString().substring(0, 19) + 'Z',
        };

        return Object.assign(result, entry);
    }

    myEntry() {
        return this.makeEntry({
            id: this.id,
            title: this.title, 
            link: this.navLink({href: `/${this.id}`}),
        });
    }

    makeLink(attrs) {
        return {'*ATTRS': attrs};
    }

    navLink(attrs) {
        return this.makeLink({
            href: (attrs.hrefAsIs ? attrs.href : `${this.opdsRoot}${attrs.href || ''}`),
            rel: attrs.rel || 'subsection',
            type: 'application/atom+xml;profile=opds-catalog;kind=navigation',
        });
    }

    acqLink(attrs) {
        return this.makeLink({
            href: (attrs.hrefAsIs ? attrs.href : `${this.opdsRoot}${attrs.href || ''}`),
            rel: attrs.rel || 'subsection',
            type: 'application/atom+xml;profile=opds-catalog;kind=acquisition',
        });
    }

    downLink(attrs) {
        if (!attrs.href)
            throw new Error('downLink: no href');
        if (!attrs.type)
            throw new Error('downLink: no type');

        return this.makeLink({
            href: attrs.href,
            rel: 'http://opds-spec.org/acquisition',
            type: attrs.type,
        });
    }

    imgLink(attrs) {
        if (!attrs.href)
            throw new Error('imgLink: no href');

        return this.makeLink({
            href: attrs.href,
            rel: `http://opds-spec.org/image${attrs.thumb ? '/thumbnail' : ''}`,
            type: attrs.type || 'image/jpeg',
        });
    }

    baseLinks(req) {
        return [
            this.navLink({rel: 'start'}),
            this.navLink({rel: 'self', href: req.originalUrl, hrefAsIs: true}),
        ];
    }

    makeBody(content, req) {
        const base = this.makeEntry({id: this.id, title: this.title});
        base['*ATTRS'] = {
            'xmlns': 'http://www.w3.org/2005/Atom',
            'xmlns:dc': 'http://purl.org/dc/terms/',
            'xmlns:opds': 'http://opds-spec.org/2010/catalog',
        };

        if (!content.link)
            base.link = this.baseLinks(req);

        const xml = new XmlParser();
        const xmlObject = {};        
        xmlObject[this.rootTag] = Object.assign(base, content);

        xml.fromObject(xmlObject);

        return xml.toString({format: true});
    }

    async body() {
        throw new Error('Body not implemented');
    }

    // -- stuff -------------------------------------------
    async search(from, query) {
        const result = [];
        const queryRes = await this.webWorker.search(from, query);

        for (const row of queryRes.found) {
            const rec = {
                id: row.id,
                title: (row[from] || 'Без автора'),
                q: `=${encodeURIComponent(row[from])}`,
            };

            result.push(rec);
        }

        return result;
    }

    async opdsQuery(from, query) {
        const queryRes = await this.webWorker.opdsQuery(from, query);
        let count = 0;
        for (const row of queryRes.found)
            count += row.count;

        const others = [];
        let result = [];
        if (count <= query.limit) {
            result = await this.search(from, query);
        } else {
            const names = new Set();
            for (const row of queryRes.found) {
                const name = row.name.toUpperCase();

                if (!names.has(name)) {
                    const rec = {
                        id: row.id,
                        title: name.replace(/ /g, spaceChar),
                        q: encodeURIComponent(row.name.toLowerCase()),
                        count: row.count,
                    };
                    if (query.depth > 1 || enru.has(row.name[0].toLowerCase())) {
                        result.push(rec);
                    } else {
                        others.push(rec);
                    }
                    names.add(name);
                }
            }
        }

        if (query.depth > 1 && result.length == 1 && query[from]) {
            const newQuery = _.cloneDeep(query);
            newQuery[from] = decodeURIComponent(result[0].q);

            if (newQuery[from].length >= query.depth) {
                newQuery.depth = newQuery[from].length + 1;
                return await this.opdsQuery(from, newQuery);
            }
        }

        if (!query.others && others.length)
            result.push({id: 'other', title: 'Все остальные', q: '___others'});

        return (!query.others ? result : others);
    }

    //скопировано из BaseList.js, часть функционала не используется
    filterBooks(books, query) {
        const s = query;

        const splitAuthor = (author) => {
            if (!author) {
                author = emptyFieldValue;
            }

            const result = author.split(',');
            if (result.length > 1)
                result.push(author);

            return result;
        };

        const filterBySearch = (bookValue, searchValue) => {
            if (!searchValue)
                return true;

            if (!bookValue)
                bookValue = emptyFieldValue;

            bookValue = bookValue.toLowerCase();
            searchValue = searchValue.toLowerCase();

            //особая обработка префиксов
            if (searchValue[0] == '=') {

                searchValue = searchValue.substring(1);
                return bookValue.localeCompare(searchValue) == 0;
            } else if (searchValue[0] == '*') {

                searchValue = searchValue.substring(1);
                return bookValue !== emptyFieldValue && bookValue.indexOf(searchValue) >= 0;
            } else if (searchValue[0] == '#') {

                searchValue = searchValue.substring(1);
                return !bookValue || (bookValue !== emptyFieldValue && !enru.has(bookValue[0]) && bookValue.indexOf(searchValue) >= 0);
            } else {
                //where = `@dirtyIndexLR('value', ${db.esc(a)}, ${db.esc(a + maxUtf8Char)})`;
                return bookValue.localeCompare(searchValue) >= 0 && bookValue.localeCompare(searchValue + maxUtf8Char) <= 0;
            }
        };

        return books.filter((book) => {
            //author
            let authorFound = false;
            const authors = splitAuthor(book.author);
            for (const a of authors) {
                if (filterBySearch(a, s.author)) {
                    authorFound = true;
                    break;
                }
            }

            //genre
            let genreFound = !s.genre;
            if (!genreFound) {
                const searchGenres = new Set(s.genre.split(','));
                const bookGenres = book.genre.split(',');

                for (let g of bookGenres) {
                    if (!g)
                        g = emptyFieldValue;

                    if (searchGenres.has(g)) {
                        genreFound = true;
                        break;
                    }
                }
            }

            //lang
            let langFound = !s.lang;
            if (!langFound) {
                const searchLang = new Set(s.lang.split(','));
                langFound = searchLang.has(book.lang || emptyFieldValue);
            }

            //date
            let dateFound = !s.date;
            if (!dateFound) {
                const date = this.queryDate(s.date).split(',');
                let [from = '0000-00-00', to = '9999-99-99'] = date;

                dateFound = (book.date >= from && book.date <= to);
            }

            //librate
            let librateFound = !s.librate;
            if (!librateFound) {
                const searchLibrate = new Set(s.librate.split(',').map(n => parseInt(n, 10)).filter(n => !isNaN(n)));
                librateFound = searchLibrate.has(book.librate);
            }

            return (this.showDeleted || !book.del)
                && authorFound
                && filterBySearch(book.series, s.series)
                && filterBySearch(book.title, s.title)
                && genreFound
                && langFound
                && dateFound
                && librateFound
            ;
        });
    }

    async getGenres() {
        let result;
        if (!this.genres) {
            const res = await this.webWorker.getGenreTree();

            result = {
                genreTree: res.genreTree,
                genreMap: new Map(),
            };

            for (const section of result.genreTree) {
                for (const g of section.value)
                    result.genreMap.set(g.value, g.name);
            }

            this.genres = result;
        } else {
            result = this.genres;
        }

        return result;
    }
}

module.exports = BasePage;