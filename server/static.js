const fs = require('fs-extra');
const path = require('path');

const express = require('express');
const utils = require('./core/utils');
const webAppDir = require('../build/appdir');

const log = new (require('./core/AppLogger'))().log;//singleton

module.exports = (app, config) => {
    /*
    config.bookPathStatic = `${config.rootPathStatic}/book`;
    config.bookDir = `${config.publicFilesDir}/book`;
    */
    //загрузка или восстановление файлов в /public-files, при необходимости
    app.use(config.bookPathStatic, async(req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            return next();
        }

        if (path.extname(req.path) == '') {
            const bookFile = `${config.bookDir}${req.path}`;
            const bookFileDesc = `${bookFile}.d.json`;

            let downFileName = '';
            //восстановим из json-файла описания
            try {
                if (await fs.pathExists(bookFile) && await fs.pathExists(bookFileDesc)) {
                    await utils.touchFile(bookFile);
                    await utils.touchFile(bookFileDesc);

                    let desc = await fs.readFile(bookFileDesc, 'utf8');
                    desc = JSON.parse(desc);
                    downFileName = desc.downFileName;
                } else {
                    await fs.remove(bookFile);
                    await fs.remove(bookFileDesc);
                }
            } catch(e) {
                log(LM_ERR, e.message);
            }

            if (downFileName) {
                res.downFileName = downFileName;

                if (!req.acceptsEncodings('gzip')) {
                    //не принимает gzip, тогда распакуем
                    const rawFile = `${bookFile}.raw`;
                    if (!await fs.pathExists(rawFile))
                        await utils.gunzipFile(bookFile, rawFile);

                    req.url += '.raw';
                    res.rawFile = true;
                }
            }
        }

        return next();
    });

    //заголовки при отдаче
    app.use(config.bookPathStatic, express.static(config.bookDir, {
        setHeaders: (res) => {
            if (res.downFileName) {
                if (!res.rawFile)
                    res.set('Content-Encoding', 'gzip');

                res.set('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(res.downFileName)}`);
            }
        },
    }));

    if (config.rootPathStatic) {
        //подмена rootPath в файлах статики WebApp при необходимости
        app.use(config.rootPathStatic, async(req, res, next) => {
            if (req.method !== 'GET' && req.method !== 'HEAD') {
                return next();
            }

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

            return next();
        });
    }

    //статика файлов WebApp
    app.use(config.rootPathStatic, express.static(config.publicDir));
};