const BasePage = require('./BasePage');
const XmlParser = require('../xml/XmlParser');

class OpensearchPage extends BasePage {
    constructor(config) {
        super(config);

        this.id = 'opensearch';
        this.title = 'opensearch';
    }

    async body() {
        const xml = new XmlParser();
        const xmlObject = {};        
/*
<?xml version="1.0" encoding="utf-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
  <ShortName>inpx-web</ShortName>
  <Description>Поиск по каталогу</Description>
  <InputEncoding>UTF-8</InputEncoding>
  <OutputEncoding>UTF-8</OutputEncoding>
  <Url type="application/atom+xml;profile=opds-catalog;kind=navigation" template="/opds/search?term={searchTerms}"/>
</OpenSearchDescription>
*/        
        xmlObject['OpenSearchDescription'] = {
            '*ATTRS': {xmlns: 'http://a9.com/-/spec/opensearch/1.1/'},
            ShortName: 'inpx-web',
            Description: 'Поиск по каталогу',
            InputEncoding: 'UTF-8',
            OutputEncoding: 'UTF-8',
            Url: {
                '*ATTRS': {
                    type: 'application/atom+xml;profile=opds-catalog;kind=navigation',
                    template: `${this.opdsRoot}/search?term={searchTerms}`,
                },
            },
        }

        xml.fromObject(xmlObject);

        return xml.toString({format: true});
    }
}

module.exports = OpensearchPage;