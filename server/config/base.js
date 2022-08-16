const path = require('path');
const pckg = require('../../package.json');

const execDir = path.resolve(__dirname, '..');
const dataDir = `${execDir}/.${pckg.name}`;

module.exports = {
    branch: 'unknown',
    version: pckg.version,
    name: pckg.name,

    execDir,
    dataDir,
    tempDir: `${dataDir}/tmp`,
    logDir: `${dataDir}/log`,
    publicDir: `${dataDir}/public`,

    loggingEnabled: true,

    maxFilesDirSize: 1024*1024*1024,//1Gb

    webConfigParams: ['name', 'version', 'branch'],

    server: {
        ip: '0.0.0.0',
        port: '22380',
    },
};

