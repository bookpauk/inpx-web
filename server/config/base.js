const path = require('path');
const pckg = require('../../package.json');

const execDir = path.resolve(__dirname, '..');

module.exports = {
    branch: 'unknown',
    version: pckg.version,
    name: pckg.name,

    execDir,

    accessPassword: '',
    accessTimeout: 0,
    extendedSearch: true,
    bookReadLink: '',
    loggingEnabled: true,

    //поправить в случае, если были критические изменения в DbCreator или InpxParser
    //иначе будет рассинхронизация между сервером и клиентом на уровне БД
    dbVersion: '10',
    dbCacheSize: 5,

    maxPayloadSize: 500,//in MB
    maxFilesDirSize: 1024*1024*1024,//1Gb
    queryCacheEnabled: true,
    queryCacheMemSize: 50,
    queryCacheDiskSize: 500,
    cacheCleanInterval: 60,//minutes
    inpxCheckInterval: 60,//minutes
    lowMemoryMode: false,
    fullOptimization: false,

    webConfigParams: ['name', 'version', 'branch', 'bookReadLink', 'dbVersion', 'extendedSearch'],

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
        host: '0.0.0.0',
        port: '22380',
        root: '',
    },
    //opds: false,
    opds: {
        enabled: true,
        user: '',
        password: '',
        root: '/opds',
    },
};

