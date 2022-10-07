const https = require('https');
const axios = require('axios');
const utils = require('./utils');

const userAgent = 'Mozilla/5.0 (X11; HasCodingOs 1.0; Linux x64) AppleWebKit/637.36 (KHTML, like Gecko) Chrome/70.0.3112.101 Safari/637.36 HasBrowser/5.0';

class FileDownloader {
    constructor(limitDownloadSize = 0) {
        this.limitDownloadSize = limitDownloadSize;
    }

    async load(url, callback, abort) {
        let errMes = '';

        const options = {
            headers: {
                'user-agent': userAgent,
                timeout: 300*1000,
            },
            httpsAgent: new https.Agent({
                rejectUnauthorized: false // решение проблемы 'unable to verify the first certificate' для некоторых сайтов с валидным сертификатом
            }),
            responseType: 'stream',
        };

        try {
            const res = await axios.get(url, options);

            let estSize = 0;
            if (res.headers['content-length']) {
                estSize = res.headers['content-length'];
            }

            if (this.limitDownloadSize && estSize > this.limitDownloadSize) {
                throw new Error('Файл слишком большой');
            }

            let prevProg = 0;
            let transferred = 0;

            const download = this.streamToBuffer(res.data, (chunk) => {
                transferred += chunk.length;
                if (this.limitDownloadSize) {
                    if (transferred > this.limitDownloadSize) {
                        errMes = 'Файл слишком большой';
                        res.request.abort();
                    }
                }

                let prog = 0;
                if (estSize)
                    prog = Math.round(transferred/estSize*100);
                else
                    prog = Math.round(transferred/(transferred + 200000)*100);

                if (prog != prevProg && callback)
                    callback(prog);
                prevProg = prog;

                if (abort && abort()) {
                    errMes = 'abort';
                    res.request.abort();
                }
            });

            return await download;
        } catch (error) {
            errMes = (errMes ? errMes : error.message);
            throw new Error(errMes);
        }
    }

    async head(url) {
        const options = {
            headers: {
                'user-agent': userAgent,
                timeout: 10*1000,
            },
        };

        const res = await axios.head(url, options);
        return res.headers;
    }

    streamToBuffer(stream, progress, timeout = 30*1000) {
        return new Promise((resolve, reject) => {
            
            if (!progress)
                progress = () => {};

            const _buf = [];
            let resolved = false;
            let timer = 0;

            stream.on('data', (chunk) => {
                timer = 0;
                _buf.push(chunk);
                progress(chunk);
            });
            stream.on('end', () => {
                resolved = true;
                timer = timeout;
                resolve(Buffer.concat(_buf));
            });
            stream.on('error', (err) => {
                reject(err);
            });
            stream.on('aborted', () => {
                reject(new Error('aborted'));
            });

            //бодяга с timer и timeout, чтобы гарантировать отсутствие зависания по каким-либо причинам
            (async() => {
                while (timer < timeout) {
                    await utils.sleep(1000);
                    timer += 1000;
                }
                if (!resolved)
                    reject(new Error('FileDownloader: timed out'))
            })();
        });
    }
}

module.exports = FileDownloader;
