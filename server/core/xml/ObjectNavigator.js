class ObjectNavigator {
    constructor(raw = null) {
        if (Array.isArray(raw))
            this.raw = raw;
        else
            this.raw = [raw];
    }

    makeSelector(selector) {
        const result = [];
        selector = selector.trim();
        
        //последний индекс не учитывется, только если не задан явно
        if (selector && selector[selector.length - 1] == ']')
            selector += '/';

        const levels = selector.split('/');

        for (const level of levels) {
            const [name, indexPart] = level.split('[');
            let index = 0;
            if (indexPart) {
                const i = indexPart.indexOf(']');
                index = parseInt(indexPart.substring(0, i), 10) || 0;
            }

            result.push({name, index});
        }

        if (result.length);
            result[result.length - 1].last = true;

        return result;
    }

    select(selector = '') {
        selector = this.makeSelector(selector);

        let raw = this.raw;
        for (const s of selector) {
            if (s.name) {
                raw = raw[0];
                if (typeof(raw) === 'object' && !Array.isArray(raw))
                    raw = raw[s.name];
                else
                    raw = null;

                if (raw !== null && !s.last) {
                    if (Array.isArray(raw))
                        raw = raw[s.index];
                    else if (s.index > 0)
                        raw = null;
                }
            } else {
                raw = raw[s.index];
            }

            if (raw === undefined || raw === null) {
                raw = null;
                break;
            }

            if (!Array.isArray(raw))
                raw = [raw];
        }

        if (raw === null)
            return null;

        const result = [];
        for (const r of raw)
            result.push(new ObjectNavigator(r));

        return result;
    }

    $$(selector) {
        return this.select(selector);
    }

    $(selector) {
        const res = this.select(selector);
        return (res !== null && res.length ? res[0] : null);
    }

    get value() {
        return (this.raw.length ? this.raw[0] : null);
    }

    text(selector = '') {
        const res = this.$(`${selector}/*TEXT`);
        return (res ? res.value : null);
    }

    comment(selector = '') {
        const res = this.$(`${selector}/*COMMENT`);
        return (res ? res.value : null);
    }

    cdata(selector = '') {
        const res = this.$(`${selector}/*CDATA`);
        return (res ? res.value : null);
    }

    attrs(selector = '') {
        const res = this.$(`${selector}/*ATTRS`);
        return (res ? res.value : null);
    }
}

module.exports = ObjectNavigator;