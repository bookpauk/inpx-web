const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function versionText(config) {
    return `${config.name} v${config.version}, Node.js ${process.version}`;
}

async function findFiles(callback, dir, recursive = true) {
    if (!(callback && dir))
        return;

    const files = await fs.readdir(dir, { withFileTypes: true });

    for (const file of files) {
        const found = path.resolve(dir, file.name);
        if (file.isDirectory()) {
            if (recursive)
                await findFiles(callback, found);
        } else {
            await callback(found);
        }
    }
}

async function touchFile(filename) {
    await fs.utimes(filename, Date.now()/1000, Date.now()/1000);
}

function hasProp(obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
}

function freeMemory() {
    if (global.gc) {
        global.gc();
    }
}

function getFileHash(filename, hashName, enc) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash(hashName);
        const rs = fs.createReadStream(filename);
        rs.on('error', reject);
        rs.on('data', chunk => hash.update(chunk));
        rs.on('end', () => resolve(hash.digest(enc)));
    });
}

function getBufHash(buf, hashName, enc) {
    const hash = crypto.createHash(hashName);
    hash.update(buf);
    return hash.digest(enc);
}

function intersectSet(arrSet) {
    if (!arrSet.length)
        return new Set();

    let min = 0;
    let size = arrSet[0].size;
    for (let i = 1; i < arrSet.length; i++) {
        if (arrSet[i].size < size) {
            min = i;
            size = arrSet[i].size;
        }
    }

    const result = new Set();
    for (const elem of arrSet[min]) {
        let inAll = true;
        for (let i = 0; i < arrSet.length; i++) {
            if (i === min)
                continue;
            if (!arrSet[i].has(elem)) {
                inAll = false;
                break;
            }
        }

        if (inAll)
            result.add(elem);
    }

    return result;
}

function randomHexString(len) {
    return crypto.randomBytes(len).toString('hex')
}

module.exports = {
    sleep,
    versionText,
    findFiles,
    touchFile,
    hasProp,
    freeMemory,
    getFileHash,
    getBufHash,
    intersectSet,
    randomHexString,
};