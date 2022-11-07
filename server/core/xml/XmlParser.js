const sax = require('./sax');

//node types
const NODE = 1;
const TEXT = 2;
const CDATA = 3;
const COMMENT = 4;

const name2type = {
    'NODE': NODE,
    'TEXT': TEXT,
    'CDATA': CDATA,
    'COMMENT': COMMENT,
};

const type2name = {
    [NODE]: 'NODE',
    [TEXT]: 'TEXT',
    [CDATA]: 'CDATA',
    [COMMENT]: 'COMMENT',
};

class NodeBase {
    makeSelectorObj(selectorString) {
        const result = {all: false, before: false, type: 0, name: ''};

        if (selectorString === '') {
            result.before = true;
        } else if (selectorString === '*') {
            result.all = true;        
        } else if (selectorString[0] === '*') {
            const typeName = selectorString.substring(1);
            result.type = name2type[typeName];
            if (!result.type)
                throw new Error(`Unknown selector type: ${typeName}`);
        } else {
            result.name = selectorString;
        }

        return result;
    }

    checkNode(rawNode, selectorObj) {
        return selectorObj.all || selectorObj.before
            || (selectorObj.type && rawNode[0] === selectorObj.type)
            || (rawNode[0] === NODE && rawNode[1] === selectorObj.name);
    }

    findNodeIndex(nodes, selectorObj) {
        for (let i = 0; i < nodes.length; i++)
            if (this.checkNode(nodes[i], selectorObj))
                return i;
    }

    rawAdd(nodes, rawNode, selectorObj) {
        if (selectorObj.all) {
            nodes.push(rawNode);
        } else if (selectorObj.before) {
            nodes.unshift(rawNode);
        } else {
            const index = this.findNodeIndex(nodes, selectorObj);
            if (index >= 0)
                nodes.splice(index, 0, rawNode);
            else 
                nodes.push(rawNode);
        }
    }

    rawRemove(nodes, selectorObj) {
        if (selectorObj.before)
            return;

        for (let i = nodes.length - 1; i >= 0; i--) {
            if (this.checkNode(nodes[i], selectorObj))
                nodes.splice(i, 1);
        }
    }
}

class NodeObject extends NodeBase {
    constructor(rawNode) {
        super();

        if (rawNode)
            this.raw = rawNode;
        else
            this.raw = [];
    }

    get type() {
        return this.raw[0] || null;
    }

    get name() {
        if (this.type === NODE)
            return this.raw[1] || null;

        return null;
    }

    set name(value) {
        if (this.type === NODE)
            this.raw[1] = value;
    }

    get attrs() {
        if (this.type === NODE && Array.isArray(this.raw[2]))
            return new Map(this.raw[2]);

        return null;
    }

    set attrs(value) {
        if (this.type === NODE)
            if (value && value.size)
                this.raw[2] = Array.from(value);
            else
                this.raw[2] = null;
    }

    get value() {
        switch (this.type) {
            case NODE:
                return this.raw[3] || null;
            case TEXT:
            case CDATA:
            case COMMENT:
                return this.raw[1] || null;
        }

        return null;
    }

    add(node, after = '*') {
        if (this.type !== NODE)
            return;

        const selectorObj = this.makeSelectorObj(after);

        if (!Array.isArray(this.raw[3]))
            this.raw[3] = [];
        this.rawAdd(this.raw[3], node.raw, selectorObj);
    }

    remove(selector = '') {
        if (this.type !== NODE || !this.raw[3])
            return;

        const selectorObj = this.makeSelectorObj(selector);

        this.rawRemove(this.raw[3], selectorObj);
        if (!this.raw[3].length)
            this.raw[3] = null;
    }

    each(callback) {
        if (this.type !== NODE || !this.raw[3])
            return;

        for (const n of this.raw[3]) {
            callback(new NodeObject(n));
        }
    }

    eachDeep(callback) {
        if (this.type !== NODE || !this.raw[3])
            return;

        const deep = (nodes, route = '') => {
            for (const n of nodes) {
                const node = new NodeObject(n);
                callback(node, route);

                if (node.type === NODE && node.value) {
                    deep(node.value, route + `/${node.name}`);
                }
            }
        }

        deep(this.raw[3]);
    }
}

class XmlParser extends NodeBase {
    constructor(rawNodes = []) {
        super();

        this.NODE = NODE;
        this.TEXT = TEXT;
        this.CDATA = CDATA;
        this.COMMENT = COMMENT;

        this.rawNodes = rawNodes;
    }

    get count() {
        return this.rawNodes.length;
    }

    toObject(node) {
        return new NodeObject(node);
    }

    newParser(nodes) {
        return new XmlParser(nodes);
    }

    checkType(type) {
        if (!type2name[type])
            throw new Error(`Invalid type: ${type}`);
    }

    createTypedNode(type, nameOrValue, attrs = null, value = null) {
        this.checkType(type);
        switch (type) {
            case NODE:
                if (!nameOrValue || typeof(nameOrValue) !== 'string')
                    throw new Error('Node name must be non-empty string');
                return new NodeObject([type, nameOrValue, attrs, value]);
            case TEXT:
            case CDATA:
            case COMMENT:
                if (typeof(nameOrValue) !== 'string')
                    throw new Error('Node value must be of type string');
                return new NodeObject([type, nameOrValue]);
        }
    }

    createNode(name, attrs = null, value = null) {
        return this.createTypedNode(NODE, name, attrs, value);
    }

    createText(value = null) {
        return this.createTypedNode(TEXT, value);
    }

    createCdata(value = null) {
        return this.createTypedNode(CDATA, value);
    }

    createComment(value = null) {
        return this.createTypedNode(COMMENT, value);
    }

    add(node, after = '*') {
        const selectorObj = this.makeSelectorObj(after);

        for (const n of this.rawNodes) {
            if (n && n[0] === NODE) {
                if (!Array.isArray(n[3]))
                    n[3] = [];
                this.rawAdd(n[3], node.raw, selectorObj);
            }
        }
    }

    addRoot(node, after = '*') {
        const selectorObj = this.makeSelectorObj(after);

        this.rawAdd(this.rawNodes, node.raw, selectorObj);
    }

    remove(selector = '') {
        const selectorObj = this.makeSelectorObj(selector);

        for (const n of this.rawNodes) {
            if (n && n[0] === NODE && Array.isArray(n[3])) {
                this.rawRemove(n[3], selectorObj);
                if (!n[3].length)
                    n[3] = null;
            }
        }
    }

    removeRoot(selector = '') {
        const selectorObj = this.makeSelectorObj(selector);

        this.rawRemove(this.rawNodes, selectorObj);
    }

    each(callback) {
        for (const n of this.rawNodes) {
            callback(new NodeObject(n));
        }
    }

    eachDeep(callback) {
        const deep = (nodes, route = '') => {
            for (const n of nodes) {
                const node = new NodeObject(n);
                callback(node, route);

                if (node.type === NODE && node.value) {
                    deep(node.value, route + `/${node.name}`);
                }
            }
        }

        deep(this.rawNodes);
    }

    rawSelect(nodes, selectorObj, callback) {
        for (const n of nodes)
            if (this.checkNode(n, selectorObj))
                callback(n);
    }

    select(selector = '', self = false) {
        let newRawNodes = [];

        if (selector.indexOf('/') >= 0) {
            const selectors = selector.split('/');
            let res = this;
            for (const sel of selectors) {
                res = res.select(sel, self);
                self = false;
            }

            newRawNodes = res.rawNodes;
        } else {
            const selectorObj = this.makeSelectorObj(selector);

            if (self) {
                this.rawSelect(this.rawNodes, selectorObj, (node) => {
                    newRawNodes.push(node);
                })
            } else {
                for (const n of this.rawNodes) {
                    if (n && n[0] === NODE && Array.isArray(n[3])) {
                        this.rawSelect(n[3], selectorObj, (node) => {
                            newRawNodes.push(node);
                        })
                    }
                }
            }
        }

        return new XmlParser(newRawNodes);
    }

    s(selector, self) {
        return this.select(selector, self);
    }

    selectFirst(selector, self) {
        const result = this.select(selector, self);
        const node = (result.count ? result.rawNodes[0] : null);
        return this.toObject(node);
    }

    sf(selector, self) {
        return this.selectFirst(selector, self);
    }

    toJson(format = false) {
        if (format)
            return JSON.stringify(this.rawNodes, null, 2);
        else
            return JSON.stringify(this.rawNodes);
    }

    fromJson(jsonString) {
        const parsed = JSON.parse(jsonString);
        if (!Array.isArray(parsed))
            throw new Error('JSON parse error: root element must be array');

        this.rawNodes = parsed;
    }

    toString(options = {}) {
        const {encoding = 'utf-8', format = false} = options;

        let deepType = 0;
        let out = '';
        if (this.count < 2)
            out += `<?xml version="1.0" encoding="${encoding}"?>`;

        const nodesToString = (nodes, depth = 0) => {
            let result = '';
            let lastType = 0;

            for (const n of nodes) {
                const node = new NodeObject(n);
                lastType = node.type;

                let open = '';
                let body = '';
                let close = '';

                if (node.type === NODE) {
                    if (!node.name)
                        break;

                    let attrs = '';

                    if (node.attrs) {
                        for (const [attrName, attrValue] of node.attrs) {
                            attrs += ` ${attrName}="${attrValue}"`;
                        }
                    }

                    open = `<${node.name}${attrs}>`;

                    if (node.value)
                        body = nodesToString(node.value, depth + 2);
                    close = `</${node.name}>`;

                    if (format) {
                        open = '\n' + ' '.repeat(depth) + open;
                        close = (deepType === NODE ? ' '.repeat(depth) : '') + close + '\n';
                    }
                } else if (node.type === TEXT) {
                    body = node.value;
                } else if (node.type === CDATA) {
                    //
                } else if (node.type === COMMENT) {
                    //
                }

                result += `${open}${body}${close}`;
            }

            deepType = lastType;
            return result;
        }

        out += nodesToString(this.rawNodes);

        return out;
    }

    fromSrtring() {
    }
}

module.exports = XmlParser;