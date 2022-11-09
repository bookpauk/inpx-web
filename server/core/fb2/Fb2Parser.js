const fs = require('fs-extra');
const iconv = require('iconv-lite');
const textUtils = require('./textUtils');

const XmlParser = require('../xml/XmlParser');
const utils = require('../utils');

class Fb2Parser {
    checkEncoding(data) {
        //Корректируем кодировку UTF-16
        let encoding = textUtils.getEncoding(data);
        if (encoding.indexOf('UTF-16') == 0) {
            data = Buffer.from(iconv.decode(data, encoding));
            encoding = 'utf-8';
        }

        //Корректируем пробелы, всякие файлы попадаются :(
        if (data[0] == 32) {
            data = Buffer.from(data.toString().trim());
        }

        //Окончательно корректируем кодировку
        let result = data;

        let left = data.indexOf('<?xml version="1.0"');
        if (left < 0) {
            left = data.indexOf('<?xml version=\'1.0\'');
        }

        if (left >= 0) {
            const right = data.indexOf('?>', left);
            if (right >= 0) {
                const head = data.slice(left, right + 2).toString();
                const m = head.match(/encoding=['"](.*?)['"]/);
                if (m) {
                    let enc = m[1].toLowerCase();
                    if (enc != 'utf-8') {
                        //enc может не соответсвовать реальной кодировке файла, поэтому:
                        if (encoding.indexOf('ISO-8859') >= 0) {
                            encoding = enc;
                        }

                        result = iconv.decode(data, encoding);
                        result = Buffer.from(result.toString().replace(m[0], `encoding="utf-8"`));
                    }
                }
            }
        }

        return result;
    }

    async getDescAndCover(bookFile) {
        let data = await fs.readFile(bookFile);
        data = await utils.gunzipBuffer(data);

        data = this.checkEncoding(data);

        const xml = new XmlParser();

        xml.fromString(data.toString(), {
            lowerCase: true,
            pickNode: route => route.indexOf('fictionbook/body') !== 0,
        });

        const desc = xml.$$('description').toObject();
        const coverImage = xml.navigator(desc).$('description/title-info/coverpage/image');

        let cover = null;
        let coverExt = '';
        if (coverImage) {
            const coverAttrs = coverImage.attrs();
            const href = coverAttrs['l:href'];
            let coverType = coverAttrs['content-type'];
            coverType = (coverType == 'image/jpg' || coverType == 'application/octet-stream' ? 'image/jpeg' : coverType);
            coverExt = (coverType == 'image/png' ? '.png' : '.jpg');

            if (href) {
                const binaryId = (href[0] == '#' ? href.substring(1) : href);

                //найдем нужный image
                xml.$$('binary').eachSelf(node => {
                    let attrs = node.attrs();
                    if (!attrs)
                        return;
                    attrs = Object.fromEntries(attrs);

                    if (attrs.id === binaryId) {
                        const textNode = new XmlParser(node.value);
                        const base64 = textNode.$self('*TEXT').value;

                        cover = (base64 ? Buffer.from(base64, 'base64') : null);
                    }
                });
            }
        }

        return {desc, cover, coverExt};
    }
}

module.exports = Fb2Parser;