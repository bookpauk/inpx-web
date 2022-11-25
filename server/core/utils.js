const fs = require('fs-extra');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function processLoop() {
    return new Promise(resolve => setImmediate(resolve));
}

function versionText(config) {
    return `${config.name} v${config.version}, Node.js ${process.version}, ${process.platform}`;
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

//async
function gzipFile(inputFile, outputFile, level = 1) {
    return new Promise((resolve, reject) => {
        const gzip = zlib.createGzip({level});
        const input = fs.createReadStream(inputFile);
        const output = fs.createWriteStream(outputFile);

        input.on('error', reject)
            .pipe(gzip).on('error', reject)
            .pipe(output).on('error', reject)
            .on('finish', (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

function gunzipFile(inputFile, outputFile) {
    return new Promise((resolve, reject) => {
        const gzip = zlib.createGunzip();
        const input = fs.createReadStream(inputFile);
        const output = fs.createWriteStream(outputFile);

        input.on('error', reject)
            .pipe(gzip).on('error', reject)
            .pipe(output).on('error', reject)
            .on('finish', (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

function gzipBuffer(buf) {
    return new Promise((resolve, reject) => {
        zlib.gzip(buf, {level: 1}, (err, result) => {
            if (err) reject(err);
            resolve(result);
        });
    });
}

function gunzipBuffer(buf) {
    return new Promise((resolve, reject) => {
        zlib.gunzip(buf, (err, result) => {
            if (err) reject(err);
            resolve(result);
        });
    });
}

function toUnixPath(dir) {
    return dir.replace(/\\/g, '/');
}

function makeValidFileName(fileName, repl = '_') {
    let f = fileName.replace(/[\x00\\/:*"<>|]/g, repl); // eslint-disable-line no-control-regex
    f = f.trim();
    while (f.length && (f[f.length - 1] == '.' || f[f.length - 1] == '_')) {
        f = f.substring(0, f.length - 1);
    }

    if (f)
        return f;
    else
        throw new Error('Invalid filename');
}

function makeValidFileNameOrEmpty(fileName) {
    try {
        return makeValidFileName(fileName);
    } catch(e) {
        return '';
    }
}

module.exports = {
    sleep,
    processLoop,
    versionText,
    findFiles,
    touchFile,
    hasProp,
    freeMemory,
    getFileHash,
    getBufHash,
    intersectSet,
    randomHexString,
    gzipFile,
    gunzipFile,
    gzipBuffer,
    gunzipBuffer,
    toUnixPath,
    makeValidFileName,
    makeValidFileNameOrEmpty,
};