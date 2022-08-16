const fs = require('fs-extra');
const argv = require('minimist')(process.argv.slice(2));
const express = require('express');
const compression = require('compression');
const http = require('http');
const WebSocket = require ('ws');

const ayncExit = new (require('./core/AsyncExit'))();
const utils = require('./core/utils');

let log = null;
let config = null;

const maxPayloadSize = 50;//in MB

async function init() {
    //config
    const configManager = new (require('./config'))();//singleton
    await configManager.init();
    //configManager.userConfigFile = argv.config;
    await configManager.load();
    config = configManager.config;

    //logger
    const appLogger = new (require('./core/AppLogger'))();//singleton
    await appLogger.init(config);
    log = appLogger.log;

    if (!argv.help) {
        log(utils.versionText(config));
        log('Initializing');
    }

    //dirs
    await fs.ensureDir(config.dataDir);
    await fs.ensureDir(config.tempDir);
    await fs.emptyDir(config.tempDir);

    const appDir = `${config.publicDir}/app`;
    const appNewDir = `${config.publicDir}/app_new`;
    if (await fs.pathExists(appNewDir)) {
        await fs.remove(appDir);
        await fs.move(appNewDir, appDir);
    }
}

function showHelp() {
    console.log(utils.versionText(config));
    console.log(
`Usage: ${config.name} [options]

Options:
  --help         Print ${config.name} command line options
`
    );
}

async function main() {
    if (argv.help) {
        showHelp();
        ayncExit.exit(0);
    }

    const log = new (require('./core/AppLogger'))().log;//singleton

    //server
    const app = express();

    const server = http.createServer(app);
    const wss = new WebSocket.Server({ server, maxPayload: maxPayloadSize*1024*1024 });

    const serverConfig = Object.assign({}, config, config.server);

    let devModule = undefined;
    if (serverConfig.branch == 'development') {
        const devFileName = './dev.js'; //require ignored by pkg -50Mb executable size
        devModule = require(devFileName);
        devModule.webpackDevMiddleware(app);
    }

    app.use(compression({ level: 1 }));
    //app.use(express.json({limit: `${maxPayloadSize}mb`}));
    if (devModule)
        devModule.logQueries(app);

    initStatic(app, config);
    
    const { WebSocketController } = require('./controllers');
    new WebSocketController(wss, config);

    if (devModule) {
        devModule.logErrors(app);
    } else {
        app.use(function(err, req, res, next) {// eslint-disable-line no-unused-vars
            log(LM_ERR, err.stack);
            res.sendStatus(500);
        });
    }

    server.listen(serverConfig.port, serverConfig.ip, function() {
        log(`Server is ready on http://${serverConfig.ip}:${serverConfig.port}`);
    });
}

function initStatic(app, config) {// eslint-disable-line
    //загрузка файлов в /files
    //TODO

    app.use(express.static(config.publicDir, {
        maxAge: '30d',

        /*setHeaders: (res, filePath) => {
            if (path.dirname(filePath) == filesDir) {
                res.set('Content-Type', 'application/xml');
                res.set('Content-Encoding', 'gzip');
            }
        },*/
    }));
}

(async() => {
    try {
        await init();
        await main();
    } catch (e) {
        if (log)
            log(LM_FATAL, e.stack);
        else
            console.error(e.stack);
        ayncExit.exit(1);
    }
})();
