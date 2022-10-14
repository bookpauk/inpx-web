const _ = require('lodash');

function getObjDiff(oldObj, newObj, opts = {}) {
    const {
        exclude = [],
        excludeAdd = [],
        excludeDel = [],
    } = opts;

    const ex = new Set(exclude);
    const exAdd = new Set(excludeAdd);
    const exDel = new Set(excludeDel);

    const makeObjDiff = (oldObj, newObj, keyPath) => {
        const result = {__isDiff: true, change: {}, add: {}, del: []};

        keyPath = `${keyPath}${keyPath ? '/' : ''}`;

        for (const key of Object.keys(oldObj)) {
            const kp = `${keyPath}${key}`;

            if (newObj.hasOwnProperty(key)) {
                if (ex.has(kp))
                    continue;

                if (!_.isEqual(oldObj[key], newObj[key])) {
                    if (_.isObject(oldObj[key]) && _.isObject(newObj[key])) {
                        result.change[key] = makeObjDiff(oldObj[key], newObj[key], kp);
                    } else {
                        result.change[key] = _.cloneDeep(newObj[key]);
                    }
                }
            } else {
                if (exDel.has(kp))
                    continue;
                result.del.push(key);
            }
        }

        for (const key of Object.keys(newObj)) {
            const kp = `${keyPath}${key}`;
            if (exAdd.has(kp))
                continue;

            if (!oldObj.hasOwnProperty(key)) {
                result.add[key] = _.cloneDeep(newObj[key]);
            }
        }

        return result;
    }

    return makeObjDiff(oldObj, newObj, '');
}

function isObjDiff(diff) {
    return (_.isObject(diff) && diff.__isDiff && diff.change && diff.add && diff.del);
}

function isEmptyObjDiff(diff) {
    return (!isObjDiff(diff) ||
        !(Object.keys(diff.change).length ||
          Object.keys(diff.add).length ||
          diff.del.length
        )
    );
}

function isEmptyObjDiffDeep(diff, opts = {}) {
    if (!isObjDiff(diff))
        return true;

    const {
        isApplyChange = true,
        isApplyAdd = true,
        isApplyDel = true,
    } = opts;

    let notEmptyDeep = false;
    const change = diff.change;
    for (const key of Object.keys(change)) {
        if (_.isObject(change[key]))
            notEmptyDeep |= !isEmptyObjDiffDeep(change[key], opts);
        else if (isApplyChange)
            notEmptyDeep = true;
    }

    return !(
        notEmptyDeep ||
        (isApplyAdd && Object.keys(diff.add).length) ||
        (isApplyDel && diff.del.length)
    );
}

function applyObjDiff(obj, diff, opts = {}) {
    const {
        isAddChanged = false,
        isApplyChange = true,
        isApplyAdd = true,
        isApplyDel = true,
    } = opts;

    let result = _.cloneDeep(obj);
    if (!diff.__isDiff)
        return result;

    const change = diff.change;
    for (const key of Object.keys(change)) {
        if (result.hasOwnProperty(key)) {
            if (_.isObject(change[key])) {
                result[key] = applyObjDiff(result[key], change[key], opts);
            } else {
                if (isApplyChange)
                    result[key] = _.cloneDeep(change[key]);
            }
        } else if (isAddChanged) {
            result[key] = _.cloneDeep(change[key]);
        }
    }

    if (isApplyAdd) {
        for (const key of Object.keys(diff.add)) {
            result[key] = _.cloneDeep(diff.add[key]);
        }
    }

    if (isApplyDel && diff.del.length) {
        for (const key of diff.del) {
            delete result[key];
        }
        if (_.isArray(result))
            result = result.filter(v => v);
    }

    return result;
}

module.exports = {
    getObjDiff,
    isObjDiff,
    isEmptyObjDiff,
    applyObjDiff,
}