const fs = require('fs-extra');
const path = require('path');
const yazl = require('yazl');

const express = require('express');
const utils = require('./core/utils');
const webAppDir = require('../build/appdir');
const {exec, execSync} = require('child_process');

const log = new (require('./core/AppLogger'))().log;//singleton

function generateZip(zipFile, dataFile, dataFileInZip) {
    return new Promise((resolve, reject) => {
        const zip = new yazl.ZipFile();
        zip.addFile(dataFile, dataFileInZip);
        zip.outputStream
            .pipe(fs.createWriteStream(zipFile)).on('error', reject)
            .on('finish', (err) => {
                if (err) reject(err);
                else resolve();
            }
        );
        zip.end();
    });
}

module.exports = (app, config) => {
    /*
    config.bookPathStatic = `${config.rootPathStatic}/book`;
    config.bookDir = `${config.publicFilesDir}/book`;
    */
    //загрузка или восстановление файлов в /public-files, при необходимости
    app.use([`${config.bookPathStatic}/:fileName/:fileType`, `${config.bookPathStatic}/:fileName`], async(req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            return next();
        }

        try {
            const fileName = req.params.fileName;
            const fileType = req.params.fileType;

            if (path.extname(fileName) === '') {//восстановление файлов {hash}.raw, {hash}.zip
                let bookFile = path.resolve(`${config.bookDir}/${fileName}`);
                const bookFileDesc = `${bookFile}.d.json`;

                //восстановим из json-файла описания
                if (await fs.pathExists(bookFile) && await fs.pathExists(bookFileDesc)) {
                    await utils.touchFile(bookFile);
                    await utils.touchFile(bookFileDesc);

                    let bookDesc = JSON.parse(await fs.readFile(bookFileDesc, 'utf8'));
                    let downFileName = bookDesc.downFileName;
                    let gzipped = true;

                    if (!req.acceptsEncodings('gzip') || fileType) {
                        const rawFile = `${bookFile}.raw`;
                        //не принимает gzip, тогда распакуем
                        if (!await fs.pathExists(rawFile))
                            await utils.gunzipFile(bookFile, rawFile);

                        gzipped = false;

                        if (fileType === undefined || fileType === 'raw') {
                            bookFile = rawFile;
                        } else if (fileType === 'zip') {
                            //создаем zip-файл
                            bookFile += '.zip';
                            if (!await fs.pathExists(bookFile))
                                await generateZip(bookFile, rawFile, downFileName);
                            downFileName += '.zip';
                        } else {
                            let extType = fileType.match(/^ext-([0-9a-z]+)$/i);
                            if (extType && config.external[extType[1]]) {
                                //external tools
                                let ext = config.external[extType[1]];
                                ext.ext = ext.ext || extType[1];

                                if (!ext.active || !ext.cmd) {
                                    throw new Error(`File type '${extType[0]}' is not active or has empty cmd`);
                                }

                                if (req.method === 'HEAD')
                                    return res.end();

                                let extVar = {
                                    BOOKFILE: bookFile,
                                    HASHFILE: path.basename(bookFile),
                                    RESULTFILE: `${bookFile}.${ext.ext}`,
                                    FILENAME: downFileName.replace(/\.fb2$/, `.${ext.ext}`),
                                    EXTDIR: path.dirname(config.externalToolsConfig),
                                    LIBFOLDER: bookDesc.libFolder,
                                    LIBFILE: bookDesc.libFile,
                                };

                                let re = new RegExp("\\$\\{(.*?)\\}","gi");
                                let cmd_line = ext.cmd.replace(re, function(matched){
                                    return extVar[matched.replace(/[${}]/g, "")] || matched;
                                });

                                if (ext.debug)
                                    log(`CMD_EXEC: ${cmd_line}`);

                                //можно запускать GUI, например, локальную читалку или какой-то редактор/конвертер с интерфейсом
                                if (ext.type === "gui") {
                                    try {
                                        let cmd = exec(cmd_line, {
                                            cwd: `${config.publicFilesDir}${config.bookPathStatic}`,
                                            windowsHide: false,
                                        }, (error, stdout, stderr) => {
                                            if (error) {
                                                log(LM_ERR, error);
                                                return res.end();
                                            }
                                            if (ext.debug) {
                                                log(`CMD_stdout: ${stdout}`);
                                                log(`CMD_stderr: ${stderr}`);
                                            }
                                        });
                                    } catch (e) {
                                        log(LM_ERR, e);
                                        log(LM_ERR, e.stderr.toString());
                                    }
                                    return res.end();
                                }

                                //запуск cmd конвертера
                                try {
                                    let cmd = execSync(cmd_line, {
                                        cwd: `${config.publicFilesDir}${config.bookPathStatic}`,
                                        windowsHide: ext.debug ? false : true,
                                        timeout: 60000,
                                    });
                                    if (ext.debug)
                                        log("CMD_stdout: " + cmd.toString());
                                } catch (e) {
                                    log(LM_ERR, e);
                                    log(LM_ERR, e.stderr.toString());
                                    return res.end();
                                }

                                //если есть cmdExport и есть результат работы конвертера(RESULTFILE), то запускается cmdExport
                                if (ext.cmdExport && await fs.pathExists(extVar.RESULTFILE)) {
                                    cmd_line = ext.cmdExport.replace(re, function(matched){
                                        return extVar[matched.replace(/[${}]/g, "")] || matched;
                                    });
                                    if (ext.debug)
                                        log(`CMD_EXPORT: ${cmd_line}`);
                                    try {
                                        let cmd = execSync(cmd_line, {
                                            cwd: `${config.publicFilesDir}${config.bookPathStatic}`,
                                            windowsHide: ext.debug ? false : true,
                                            timeout: 60000,
                                        });
                                        if (ext.debug)
                                            log("CMD_stdout: " + cmd.toString());
                                    } catch (e) {
                                        log(LM_ERR, e);
                                        log(LM_ERR, e.stderr.toString());
                                        return res.end();
                                    }
                                }

                                if (ext.type === "download") {
                                    if (!await fs.pathExists(extVar.RESULTFILE))
                                        throw new Error(`File not exists: '${extVar.RESULTFILE}'`);
                                    //тут нужно посмотреть, что лучше inline или attachment. на inline может браузер со своими действиями влезть
                                    //res.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(extVar.FILENAME)}`);
                                    //res.set('Content-Type', 'application/octet-stream');
                                    res.set('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(extVar.FILENAME)}`);
                                    res.set('Content-Length', fs.statSync(extVar.RESULTFILE).size);
                                    res.set('Cache-Control', 'private');
                                    return res.sendFile(extVar.RESULTFILE);
                                }
                                return res.end();
                            }
                            throw new Error(`Unsupported file type: ${fileType}`);
                        }
                    }

                    //отдача файла
                    if (gzipped)
                        res.set('Content-Encoding', 'gzip');
                    res.set('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(downFileName)}`);
                    res.sendFile(bookFile);
                    return;
                } else {
                    await fs.remove(bookFile);
                    await fs.remove(bookFileDesc);
                }
            }
        } catch(e) {
            log(LM_ERR, e.message);
        }

        return next();
    });

    //иначе просто отдаем запрошенный файл из /public-files
    app.use(config.bookPathStatic, express.static(config.bookDir));

    if (config.rootPathStatic) {
        //подмена rootPath в файлах статики WebApp при необходимости
        app.use(config.rootPathStatic, async(req, res, next) => {
            if (req.method !== 'GET' && req.method !== 'HEAD') {
                return next();
            }

            try {
                const reqPath = (req.path == '/' ? '/index.html' : req.path);
                const ext = path.extname(reqPath);
                if (ext == '.html' || ext == '.js' || ext == '.css') {
                    const reqFile = `${config.publicDir}${reqPath}`;
                    const flagFile = `${reqFile}.replaced`;

                    if (!await fs.pathExists(flagFile) && await fs.pathExists(reqFile)) {
                        const content = await fs.readFile(reqFile, 'utf8');
                        const re = new RegExp(`/${webAppDir}`, 'g');
                        await fs.writeFile(reqFile, content.replace(re, `${config.rootPathStatic}/${webAppDir}`));
                        await fs.writeFile(flagFile, '');
                    }
                }
            } catch(e) {
                log(LM_ERR, e.message);
            }

            return next();
        });
    }

    //статика файлов WebApp
    app.use(config.rootPathStatic, express.static(config.publicDir));
};