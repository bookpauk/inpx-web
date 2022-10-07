const path = require('path');
const pckg = require('../../package.json');

const execDir = path.resolve(__dirname, '..');

module.exports = {
    branch: 'unknown',
    version: pckg.version,
    name: pckg.name,

    execDir,

    accessPassword: '',
    bookReadLink: '',
    loggingEnabled: true,

    maxFilesDirSize: 1024*1024*1024,//1Gb
    queryCacheEnabled: true,
    cacheCleanInterval: 60,//minutes
    inpxCheckInterval: 60,//minutes
    lowMemoryMode: false,

    webConfigParams: ['name', 'version', 'branch', 'bookReadLink'],

    allowRemoteLib: false,
    remoteLib: false,
    /*
    allowRemoteLib: true, // на сервере
    remoteLib: { // на клиенте
        accessPassword: '',
        url: 'wss://remoteInpxWeb.ru',
    },
    */

    server: {
        ip: '0.0.0.0',
        port: '22380',
    },
};

