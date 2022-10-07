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

    //сохраним files
    const filesDir = `${config.publicDir}/files`;
    let tmpFilesDir = '';
    if (await fs.pathExists(filesDir)) {
        tmpFilesDir = `${config.dataDir}/files`;
        if (!await fs.pathExists(tmpFilesDir))
            await fs.move(filesDir, tmpFilesDir);
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

    //восстановим files
    if (tmpFilesDir)
        await fs.move(tmpFilesDir, filesDir);

    await fs.writeFile(verFile, config.version);
    await fs.remove(zipFile);

    //rename app_new
    const webAppDir = `${config.publicDir}/app`;
    const appNewDir = `${config.publicDir}/app_new`;
    if (await fs.pathExists(appNewDir)) {
        await fs.remove(webAppDir);
        await fs.move(appNewDir, webAppDir);
    }

};