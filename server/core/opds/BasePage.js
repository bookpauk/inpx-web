const WebWorker = require('../WebWorker');//singleton
const XmlParser = require('../xml/XmlParser');

class BasePage {
    constructor(config) {        
        this.config = config;

        this.webWorker = new WebWorker(config);
        this.rootTag = 'feed';
        this.opdsRoot = '/opds';
    }

    makeEntry(entry = {}) {
        if (!entry.id)
            throw new Error('makeEntry: no id');
        if (!entry.title)
            throw new Error('makeEntry: no title');

        const result = {
            updated: (new Date()).toISOString().substring(0, 19) + 'Z',
        };

        return Object.assign(result, entry);
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

    makeBody(content) {
        const base = this.makeEntry({id: this.id, title: this.title});
        base['*ATTRS'] = {
            'xmlns': 'http://www.w3.org/2005/Atom',
            'xmlns:dc': 'http://purl.org/dc/terms/',
            'xmlns:opds': 'http://opds-spec.org/2010/catalog',
        };

        base.link = [
            this.navLink({rel: 'start'}),
        ];

        const xml = new XmlParser();
        const xmlObject = {};        
        xmlObject[this.rootTag] = Object.assign(base, content);

        xml.fromObject(xmlObject);

        return xml.toString({format: true});
    }

    async body() {
        throw new Error('Body not implemented');
    }
}

module.exports = BasePage;