const path = require('path');
const pckg = require('../../package.json');

const execDir = path.resolve(__dirname, '..');

module.exports = {
    branch: 'unknown',
    version: pckg.version,
    latestVersion: '',
    name: pckg.name,

    execDir,
    dataDir: '',
    tempDir: '',
    logDir: '',
    libDir: '',
    inpx: '',
    inpxFilterFile: '',

    allowConfigRewrite: false,
    allowUnsafeFilter: false,
    accessPassword: '',
    accessTimeout: 0,
    extendedSearch: true,
    bookReadLink: '',
    loggingEnabled: true,
    logServerStats: false,
    logQueries: false,

    //поправить в случае, если были критические изменения в DbCreator или InpxParser
    //иначе будет рассинхронизация по кешу между сервером и клиентом на уровне БД
    dbVersion: '12',
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

    webConfigParams: ['name', 'version', 'latestVersion', 'branch', 'bookReadLink', 'dbVersion', 'extendedSearch', 'latestReleaseLink', 'uiDefaults'],

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

    latestReleaseLink: 'https://github.com/bookpauk/inpx-web/releases/latest',
    checkReleaseLink: 'https://api.github.com/repos/bookpauk/inpx-web/releases/latest',

    uiDefaults: {
        limit: 20,
        downloadAsZip: false,
        showCounts: true,
        showRates: true,
        showInfo: true,
        showGenres: true,
        showDates: false,
        showDeleted: false,
        abCacheEnabled: true,
        langDefault: '',
        showJson: false,
        showNewReleaseAvailable: true,
    },
};

