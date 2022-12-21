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
const ruOnly = new Set(ruAlphabet.split(''));

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
        attrs.href = he.escape(attrs.href);
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

    baseLinks(req, selfAcq = false) {
        const result = [
            this.makeLink({href: `${this.opdsRoot}/opensearch`, rel: 'search', type: 'application/opensearchdescription+xml'}),
            this.makeLink({href: `${this.opdsRoot}/search?term={searchTerms}`, rel: 'search', type: 'application/atom+xml'}),

            this.navLink({rel: 'start'}),
        ];
        
        if (selfAcq) {
            result.push(this.acqLink({rel: 'self', href: req.originalUrl, hrefAsIs: true}));
        } else {
            result.push(this.navLink({rel: 'self', href: req.originalUrl, hrefAsIs: true}));
        }

        return result;
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
                bookCount: row.bookCount,
            };

            result.push(rec);
        }

        return result;
    }

    async opdsQuery(from, query, otherTitle = '[Другие]', prevLen = 0) {
        const queryRes = await this.webWorker.opdsQuery(from, query);
        let count = 0;
        for (const row of queryRes.found)
            count += row.count;

        const others = [];
        let result = [];
        if (count <= 50) {
            //конец навигации
            return await this.search(from, query);
        } else {
            let len = 0;
            const enResult = [];
            for (const row of queryRes.found) {
                const value = row.value;
                len += value.length;

                let rec;
                if (row.count == 1) {
                    rec = {
                        id: row.id,
                        title: row.name,
                        q: `=${encodeURIComponent(row.name)}`,
                        bookCount: row.bookCount,
                    };
                } else {
                    rec = {
                        id: row.id,
                        title: `${value.toUpperCase().replace(/ /g, spaceChar)}~`,
                        q: encodeURIComponent(value),
                        count: row.count,
                    };
                }
                if (query.depth > 1 || enru.has(value[0]) ) {
                    //такой костыль из-за проблем с локалями в pkg
                    //русский язык всегда идет первым!
                    if (ruOnly.has(value[0]))
                        result.push(rec)
                    else
                        enResult.push(rec);
                } else {
                    others.push(rec);
                }
            }

            result = result.concat(enResult);

            if (query[from] && query.depth > 1 && result.length < 10 && len > prevLen) {
                //рекурсия, с увеличением глубины, для облегчения навигации
                const newQuery = _.cloneDeep(query);
                newQuery.depth++;
                return await this.opdsQuery(from, newQuery, otherTitle, len);
            }
        }

        if (!query.others && others.length)
            result.unshift({id: 'other', title: otherTitle, q: '___others', count: others.length});

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
                if (!bookValue)
                    return false;
                return bookValue !== emptyFieldValue && !enru.has(bookValue[0]) && bookValue.indexOf(searchValue) >= 0;
            } else if (searchValue[0] == '~') {//RegExp

                searchValue = searchValue.substring(1);
                const re = new RegExp(searchValue, 'i');
                return re.test(bookValue);
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

    bookAuthor(author) {
        if (author) {
            let a = author.split(',');
            return a.slice(0, 3).join(', ') + (a.length > 3 ? ' и др.' : '');
        }

        return '';
    }

    async getGenres() {
        let result;
        if (!this.genres) {
            const res = await this.webWorker.getGenreTree();

            result = {
                genreTree: res.genreTree,
                genreMap: new Map(),
                genreSection: new Map(),
            };

            for (const section of result.genreTree) {
                result.genreSection.set(section.name, section.value);

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