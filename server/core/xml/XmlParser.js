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

    attrs(key, value) {
        if (this.type !== NODE)
            return null;

        let map = null;

        if (key instanceof Map) {
            map = key;
            this.raw[2] = Array.from(map);
        } else if (Array.isArray(this.raw[2])) {
            map = new Map(this.raw[2]);
            if (key) {
                map.set(key, value);
                this.raw[2] = Array.from(map);
            }
        }

        return map;
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

    set value(v) {
        switch (this.type) {
            case NODE:
                this.raw[3] = v;
                break;
            case TEXT:
            case CDATA:
            case COMMENT:
                this.raw[1] = v;
        }
    }

    add(node, after = '*') {
        if (this.type !== NODE)
            return;

        const selectorObj = this.makeSelectorObj(after);

        if (!Array.isArray(this.raw[3]))
            this.raw[3] = [];

        if (Array.isArray(node)) {
            for (const node_ of node)
                this.rawAdd(this.raw[3], node_.raw, selectorObj);
        } else {
            this.rawAdd(this.raw[3], node.raw, selectorObj);
        }

        return this;
    }

    remove(selector = '') {
        if (this.type !== NODE || !this.raw[3])
            return;

        const selectorObj = this.makeSelectorObj(selector);

        this.rawRemove(this.raw[3], selectorObj);
        if (!this.raw[3].length)
            this.raw[3] = null;

        return this;
    }

    each(callback) {
        if (this.type !== NODE || !this.raw[3])
            return;

        for (const n of this.raw[3]) {
            callback(new NodeObject(n));
        }

        return this;
    }

    eachDeep(callback) {
        if (this.type !== NODE || !this.raw[3])
            return;

        const deep = (nodes, route = '') => {
            for (const n of nodes) {
                const node = new NodeObject(n);
                callback(node, route);

                if (node.type === NODE && node.value) {
                    deep(node.value, `${route}${route ? '/' : ''}${node.name}`);
                }
            }
        }

        deep(this.raw[3]);

        return this;
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
                
                if (Array.isArray(node)) {
                    for (const node_ of node)
                        this.rawAdd(n[3], node_.raw, selectorObj);
                } else {
                    this.rawAdd(n[3], node.raw, selectorObj);
                }
            }
        }

        return this;
    }

    addRoot(node, after = '*') {
        const selectorObj = this.makeSelectorObj(after);

        if (Array.isArray(node)) {
            for (const node_ of node)
                this.rawAdd(this.rawNodes, node_.raw, selectorObj);
        } else {
            this.rawAdd(this.rawNodes, node.raw, selectorObj);
        }

        return this;
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

        return this;
    }

    removeRoot(selector = '') {
        const selectorObj = this.makeSelectorObj(selector);

        this.rawRemove(this.rawNodes, selectorObj);

        return this;
    }

    each(callback, self = false) {
        if (self) {
            for (const n of this.rawNodes) {
                callback(new NodeObject(n));
            }
        } else {
            for (const n of this.rawNodes) {
                if (n[0] === NODE && n[3])
                    callback(new NodeObject(n[3]));
            }
        }

        return this;
    }

    eachDeep(callback, self = false) {
        const deep = (nodes, route = '') => {
            for (const n of nodes) {
                const node = new NodeObject(n);
                callback(node, route);

                if (node.type === NODE && node.value) {
                    deep(node.value, `${route}${route ? '/' : ''}${node.name}`);
                }
            }
        }

        if (self) {
            deep(this.rawNodes);
        } else {
            for (const n of this.rawNodes) {
                if (n[0] === NODE && n[3])
                    deep(n[3]);
            }
        }

        return this;
    }

    eachDeepSelf(callback) {
        return this.eachDeep(callback, true);
    }

    rawSelect(nodes, selectorObj, callback) {
        for (const n of nodes)
            if (this.checkNode(n, selectorObj))
                callback(n);

        return this;
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

    $$(selector, self) {
        return this.select(selector, self);
    }

    $$self(selector) {
        return this.select(selector, true);
    }

    selectFirst(selector, self) {
        const result = this.select(selector, self);
        const node = (result.count ? result.rawNodes[0] : null);
        return this.toObject(node);
    }

    $(selector, self) {
        return this.selectFirst(selector, self);
    }

    $self(selector) {
        return this.selectFirst(selector, true);
    }

    toJson(options = {}) {
        const {format = false} = options;

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
        const {encoding = 'utf-8', format = false, noHeader = false} = options;

        let deepType = 0;
        let out = '';
        if (!noHeader)
            out += `<?xml version="1.0" encoding="${encoding}"?>`;

        const nodesToString = (nodes, depth = 0) => {
            let result = '';

            const indent = '\n' + ' '.repeat(depth);
            let lastType = 0;

            for (const n of nodes) {
                const node = new NodeObject(n);

                let open = '';
                let body = '';
                let close = '';

                if (node.type === NODE) {
                    if (!node.name)
                        break;

                    let attrs = '';

                    const nodeAttrs = node.attrs();
                    if (nodeAttrs) {
                        for (const [attrName, attrValue] of nodeAttrs) {
                            if (typeof(attrValue) === 'string')
                                attrs += ` ${attrName}="${attrValue}"`;
                            else
                                if (attrValue)
                                    attrs += ` ${attrName}`;
                        }
                    }


                    open = (format && lastType !== TEXT ? indent : '');
                    open += `<${node.name}${attrs}>`;

                    if (node.value)
                        body = nodesToString(node.value, depth + 2);

                    close = (format && deepType && deepType !== TEXT ? indent : '');
                    close += `</${node.name}>`;
                } else if (node.type === TEXT) {
                    body = node.value || '';
                } else if (node.type === CDATA) {
                    body = (format && lastType !== TEXT ? indent : '');
                    body += `<![CDATA[${node.value || ''}]]>`;
                } else if (node.type === COMMENT) {
                    body = (format && lastType !== TEXT ? indent : '');
                    body += `<!--${node.value || ''}-->`;
                }

                result += `${open}${body}${close}`;
                lastType = node.type;
            }

            deepType = lastType;
            return result;
        }

        out += nodesToString(this.rawNodes);

        return out;
    }

    fromString(xmlString, options = {}) {
        const {
            lowerCase = false,
            whiteSpace = false,
            pickNode = false,
        } = options;

        const parsed = [];
        const root = this.createNode('root', null, parsed);//fake node
        let node = root;

        let route = '';
        let routeStack = [];
        let ignoreNode = false;

        const onStartNode = (tag, tail, singleTag, cutCounter, cutTag) => {// eslint-disable-line no-unused-vars
            if (tag == '?xml')
                return;

            if (!ignoreNode && pickNode) {
                route += `/${tag}`;
                ignoreNode = !pickNode(route);
            }

            let newNode = node;
            if (!ignoreNode)
                newNode = this.createNode(tag);

            routeStack.push({tag, route, ignoreNode, node: newNode});

            if (ignoreNode)
                return;

            if (tail && tail.trim() !== '') {
                const parsedAttrs = sax.getAttrsSync(tail, lowerCase);
                const attrs = new Map();
                for (const attr of parsedAttrs.values()) {
                    attrs.set(attr.fn, attr.value);
                }

                if (attrs.size)
                    newNode.attrs(attrs);
            }

            if (!node.value)
                node.value = [];
            node.value.push(newNode.raw);
            node = newNode;
        };

        const onEndNode = (tag, tail, singleTag, cutCounter, cutTag) => {// eslint-disable-line no-unused-vars
            if (routeStack.length && routeStack[routeStack.length - 1].tag === tag) {
                routeStack.pop();

                if (routeStack.length) {
                    const last = routeStack[routeStack.length - 1];
                    route = last.route;
                    ignoreNode = last.ignoreNode;
                    node = last.node;
                } else {
                    route = '';
                    ignoreNode = false;
                    node = root;
                }
            }
        }

        const onTextNode = (text, cutCounter, cutTag) => {// eslint-disable-line no-unused-vars
            if (ignoreNode || (pickNode && !pickNode(`${route}/*TEXT`)))
                return;

            if (!whiteSpace && text.trim() == '')
                return;

            if (!node.value)
                node.value = [];

            node.value.push(this.createText(text).raw);
        };

        const onCdata = (tagData, cutCounter, cutTag) => {// eslint-disable-line no-unused-vars
            if (ignoreNode || (pickNode && !pickNode(`${route}/*CDATA`)))
                return;

            if (!node.value)
                node.value = [];

            node.value.push(this.createCdata(tagData).raw);
        }

        const onComment = (tagData, cutCounter, cutTag) => {// eslint-disable-line no-unused-vars
            if (ignoreNode || (pickNode && !pickNode(`${route}/*COMMENT`)))
                return;

            if (!node.value)
                node.value = [];

            node.value.push(this.createComment(tagData).raw);
        }

        sax.parseSync(xmlString, {
            onStartNode, onEndNode, onTextNode, onCdata, onComment, lowerCase
        });

        this.rawNodes = parsed;        
    }
}

module.exports = XmlParser;