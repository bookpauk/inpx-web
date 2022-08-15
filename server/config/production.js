const path = require('path');
const pckg = require('../../package.json');
const base = require('./base');

const execDir = path.dirname(process.execPath);
const dataDir = `${execDir}/.${pckg.name}/data`;

module.exports = Object.assign({}, base, {
    branch: 'production',
    dataDir,
    tempDir: `${dataDir}/tmp`,
    logDir: `${dataDir}/log`,
    publicDir: `${dataDir}/public`,

    server: {
        ip: '0.0.0.0',
        port: '12380',
    },

});
