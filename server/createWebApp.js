const fs = require('fs-extra');

const webApp = require('../dist/public.json');
const ZipReader = require('./core/ZipReader');

module.exports = async(config) => {
    const zipFile = `${config.tempDir}/public.zip`;

    await fs.writeFile(zipFile, webApp.data, {encoding: 'base64'});

    const zipReader = new ZipReader();
    await zipReader.open(zipFile);

    await fs.remove(config.publicDir);

    try {
        await zipReader.extractAllToDir(config.publicDir);
    } finally {
        await zipReader.close();
    }

    await fs.remove(zipFile);
};