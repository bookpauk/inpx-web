const he = require('he');

const WebWorker = require('../WebWorker');//singleton
const XmlParser = require('../xml/XmlParser');

const spaceChar = String.fromCodePoint(0x00B7);
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
            link: this.navLink({rel: 'subsection', href: `/${this.id}`}),
        });
    }

    makeLink(attrs) {
        return {'*ATTRS': attrs};
    }

    navLink(attrs) {
        return this.makeLink({
            href: this.opdsRoot + (attrs.href || ''),
            rel: attrs.rel || '',
            type: 'application/atom+xml; profile=opds-catalog; kind=navigation',
        });
    }

    baseLinks() {
        return [
            this.navLink({rel: 'start'}),
            this.navLink({rel: 'self', href: (this.id ? `/${this.id}` : '')}),
        ];
    }

    makeBody(content) {
        const base = this.makeEntry({id: this.id, title: this.title});
        base['*ATTRS'] = {
            'xmlns': 'http://www.w3.org/2005/Atom',
            'xmlns:dc': 'http://purl.org/dc/terms/',
            'xmlns:opds': 'http://opds-spec.org/2010/catalog',
        };

        if (!content.link)
            base.link = this.baseLinks();

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
                title: '=' + (row[from] || 'Без имени'),
                q: `=${encodeURIComponent(row[from])}`,
            };

            result.push(rec);
        }

        return result;
    }

    async opdsQuery(from, query) {
        const result = [];

        const queryRes = await this.webWorker.opdsQuery(from, query);
        let count = 0;
        for (const row of queryRes.found)
            count += row.count;

        if (count <= query.limit)
            return await this.search(from, query);

        const names = new Set();
        const others = [];
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

        if (!query.others && query.depth == 1)
            result.push({id: 'other', title: 'Все остальные', q: '___others'});

        return (!query.others ? result : others);
    }
}

module.exports = BasePage;