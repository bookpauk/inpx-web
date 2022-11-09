const XmlParser = require('../xml/XmlParser');

class Fb2Parser extends XmlParser {
    bookInfo(fb2Object) {
        if (!fb2Object)
            fb2Object = this.toObject();

        //const result = {};

    }

    bookInfoList(fb2Object) {
    }

    toHtml(xmlString) {
        const substs = {
            '<subtitle>': '<p><b>',
            '</subtitle>': '</b></p>',
            '<empty-line/>': '<br>',
            '<strong>': '<b>',
            '</strong>': '</b>',
            '<emphasis>': '<i>',
            '</emphasis>': '</i>',
            '<stanza>': '<br>',
            '</stanza>': '',
            '<poem>': '<br>',
            '</poem>': '',
            '<cite>': '<i>',
            '</cite>': '</i>',
            '<table>': '<br>',
            '</table>': '',
        };

        for (const [tag, s] of Object.entries(substs)) {
            const r = new RegExp(`${tag}`, 'g');
            xmlString = xmlString.replace(r, s);
        }

        return xmlString;
    }    
}

module.exports = Fb2Parser;