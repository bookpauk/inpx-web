const fs = require('fs-extra');

const webApp = require('../dist/public.json');
const ZipReader = require('./core/ZipReader');

module.exports = async(config) => {
    const verFile = `${config.publicDir}/version.txt`;
    const zipFile = `${config.tempDir}/public.zip`;

    if (await fs.pathExists(verFile)) {
        const curPublicVersion = await fs.readFile(verFile, 'utf8');
        if (curPublicVersion == config.version)
            return;
    }

    await fs.remove(config.publicDir);

    //извлекаем новый webApp
    await fs.writeFile(zipFile, webApp.data, {encoding: 'base64'});
    const zipReader = new ZipReader();
    await zipReader.open(zipFile);

    try {
        await zipReader.extractAllToDir(config.publicDir);
    } finally {
        await zipReader.close();
    }

    await fs.writeFile(verFile, config.version);
    await fs.remove(zipFile);
};