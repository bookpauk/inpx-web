const path = require('path');
const base = require('./base');

const execDir = path.dirname(process.execPath);

module.exports = Object.assign({}, base, {
    branch: 'production',

    execDir,

    server: {
        ip: '0.0.0.0',
        port: '12380',
    },

});
