const XmlParser = require('../xml/XmlParser');

class BasePage {
    constructor(config) {        
        this.config = config;

        this.rootTag = 'feed';
    }

    makeBody(content) {
        if (!this.id)
            throw new Error('makeBody: no id');

        content.id = this.id;

        const xml = new XmlParser();
        const xmlObject = {};        
        xmlObject[this.rootTag] = content;

        xml.fromObject(xmlObject);

        return xml.toString({format: true});
    }

    async body() {
        throw new Error('Body not implemented');
    }
}

module.exports = BasePage;