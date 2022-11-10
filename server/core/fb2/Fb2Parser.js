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

        const parseAuthors = (node, tagName) => {
            const authors = [];
            for (const a of node.$$(tagName)) {
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

        const parseTitleInfo = (titleInfo) => {
            const info = {};

            info.genre = [];
            for (const g of titleInfo.$$('genre'))
                info.genre.push(g.text());

            info.author = parseAuthors(titleInfo, 'author');

            info.bookTitle = titleInfo.text('book-title');

            //annotation как Object
            info.annotation = titleInfo.$('annotation') && titleInfo.$('annotation').value;
            info.annotationXml = null;
            info.annotationHtml = null;
            if (info.annotation) {
                //annotation как кусок xml
                info.annotationXml = (new XmlParser()).fromObject(info.annotation).toString({noHeader: true});

                //annotation как html
                info.annotationHtml = this.toHtml(info.annotationXml);
            }

            info.keywords = titleInfo.text('keywords');
            info.date = titleInfo.text('date');
            info.coverpage = titleInfo.$('coverpage') && titleInfo.$('coverpage').value;
            info.lang = titleInfo.text('lang');
            info.srcLang = titleInfo.text('src-lang');

            info.translator = parseAuthors(titleInfo, 'translator');

            const seqAttrs = titleInfo.attrs('sequence') || {};
            info.sequenceName = seqAttrs['name'] || null;
            info.sequenceNum = seqAttrs['number'] || null;
            info.sequenceLang = seqAttrs['xml:lang'] || null;

            return info;
        }

        //title-info
        const titleInfo = desc.$('title-info');
        if (titleInfo) {
            result.titleInfo = parseTitleInfo(titleInfo);
        }

        //src-title-info
        const srcTitleInfo = desc.$('src-title-info');
        if (srcTitleInfo) {
            result.srcTitleInfo = parseTitleInfo(srcTitleInfo);
        }

        //document-info
        const documentInfo = desc.$('document-info');
        if (documentInfo) {
            const info = {};

            info.author = parseAuthors(documentInfo, 'author');
            info.programUsed = documentInfo.text('program-used');
            info.date = documentInfo.text('date');

            info.srcUrl = [];
            for (const url of documentInfo.$$('src-url'))
                info.srcUrl.push(url.text());

            info.srcOcr = documentInfo.text('src-ocr');
            info.id = documentInfo.text('id');
            info.version = documentInfo.text('version');
            
            //аналогично annotation, но разбирать в Xml и Html пока не будем
            info.history = documentInfo.$('history') && documentInfo.$('history').value;
            info.historyXml = null;
            info.historyHtml = null;
            if (info.history) {
                //history как кусок xml
                info.historyXml = (new XmlParser()).fromObject(info.history).toString({noHeader: true});

                //history как html
                info.historyHtml = this.toHtml(info.historyXml);
            }


            info.publisher = parseAuthors(documentInfo, 'publisher');

            result.documentInfo = info;
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
            {name: 'srcTitleInfo', label: 'Информация о произведении на языке оригинала', value: [
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
            {name: 'documentInfo', label: 'Информация о документе (OCR)', value: [
                {name: 'author', label: 'Автор(ы)'},
                {name: 'programUsed', label: 'Программа'},
                {name: 'date', label: 'Дата'},
                //srcUrl = []
                {name: 'id', label: 'ID'},
                {name: 'version', label: 'Версия'},
                {name: 'srcOcr', label: 'Автор источника'},
                {name: 'historyHtml', label: 'История'},
                {name: 'publisher', label: 'Правообладатели'},
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