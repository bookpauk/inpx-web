const XmlParser = require('../xml/XmlParser');

class Fb2Parser extends XmlParser {
    get xlinkNS() {
        if (!this._xlinkNS) {
            const rootAttrs = this.$self().attrs();
            let ns = 'l';
            for (const [key, value] of rootAttrs) {
                if (value == 'http://www.w3.org/1999/xlink') {
                    ns = key.split(':')[1] || ns;
                    break;
                }
            }

            this._xlinkNS = ns;
        }

        return this._xlinkNS;
    }

    bookInfo(fb2Object) {
        const result = {};

        if (!fb2Object)
            fb2Object = this.toObject();

        const desc = this.inspector(fb2Object).$('fictionbook/description');

        if (!desc)
            return result;

        //title-info
        const titleInfo = desc.$('title-info');
        if (titleInfo) {
            const info = {};

            info.genre = [];
            for (const g of titleInfo.$$('genre'))
                info.genre.push(g.text());

            const parseAuthors = (tagName) => {
                const authors = [];
                for (const a of titleInfo.$$(tagName)) {
                    let names = [];
                    names.push(a.text('last-name'));
                    names.push(a.text('first-name'));
                    names.push(a.text('middle-name'));
                    names = names.filter(n => n);
                    if (!names.length)
                        names.push(a.text('nickname'));

                    authors.push(names.join(' '));
                }

                return authors;
            }

            info.author = parseAuthors('author');

            info.bookTitle = titleInfo.text('book-title');

            info.annotation = null;
            info.annotationHtml = null;
            const node = titleInfo.$('annotation') && titleInfo.$('annotation').value;

            if (node) {
                //annotation как кусок xml
                info.annotation = (new XmlParser()).fromObject(node).toString({noHeader: true});

                //annotation как html
                info.annotationHtml = this.toHtml(info.annotation);
            }

            info.keywords = titleInfo.text('keywords');
            info.date = titleInfo.text('date');
            info.coverpage = titleInfo.$('coverpage') && titleInfo.$('coverpage').value;
            info.lang = titleInfo.text('lang');
            info.srcLang = titleInfo.text('src-lang');

            info.translator = parseAuthors('translator');

            const seqAttrs = titleInfo.attrs('sequence') || {};
            info.sequenceName = seqAttrs['name'] || null;
            info.sequenceNum = seqAttrs['number'] || null;
            info.sequenceLang = seqAttrs['xml:lang'] || null;

            result.titleInfo = info;
        }

        return result;
    }

    bookInfoList(fb2Object, options = {}) {
        let {
            correctMapping = false,
            valueToString = false,
        } = options;

        if (!correctMapping)
            correctMapping = mapping => mapping;

        if (!valueToString) {
            valueToString = (value, nodePath) => {//eslint-disable-line no-unused-vars
                if (typeof(value) === 'string') {
                    return value;
                } else if (Array.isArray(value)) {
                    return value.join(', ');
                } else if (typeof(value) === 'object') {
                    return JSON.stringify(value);
                }

                return value;
            };
        }

        let mapping = [
            {name: 'titleInfo', label: 'Общая информация', value: [
                {name: 'author', label: 'Автор(ы)'},
                {name: 'bookTitle', label: 'Название'},
                {name: 'sequenceName', label: 'Серия'},
                {name: 'sequenceNum', label: 'Номер в серии'},
                {name: 'genre', label: 'Жанр'},

                {name: 'date', label: 'Дата'},
                {name: 'lang', label: 'Язык книги'},
                {name: 'srcLang', label: 'Язык оригинала'},
                {name: 'translator', label: 'Переводчик(и)'},
                {name: 'keywords', label: 'Ключевые слова'},
            ]},
        ];

        mapping = correctMapping(mapping);
        const bookInfo = this.bookInfo(fb2Object);

        //заполняем mapping
        let result = [];
        for (const item of mapping) {
            const itemOut = {name: item.name, label: item.label, value: []};
            const info = bookInfo[item.name];
            if (!info)
                continue;

            for (const subItem of item.value) {
                if (info[subItem.name] !== null) {
                    const subItemOut = {
                        name: subItem.name,
                        label: subItem.label,
                        value: valueToString(info[subItem.name], `${item.name}/${subItem.name}`)
                    };

                    if (subItemOut.value)
                        itemOut.value.push(subItemOut);
                }
            }

            if (itemOut.value.length)
                result.push(itemOut);
        }

        return result;
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