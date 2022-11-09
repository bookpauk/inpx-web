const XmlParser = require('../xml/XmlParser');

class Fb2Parser {
    constructor() {
        this.xml = new XmlParser();
    }

    toString(options) {
        return this.xml.toString(options);
    }

    fromString(fb2String) {
        this.xml.fromString(fb2String);
        return this;
    }

    toObject(options) {
        return this.xml.toObject(options);
    }

    fromObject(fb2Object) {
        this.xml.fromObject(fb2Object);
        return this;
    }

    bookInfo(fb2Object) {
        if (!fb2Object)
            fb2Object = this.toObject();

        //const result = {};

    }

    bookInfoList(fb2Object) {
    }
}

module.exports = Fb2Parser;