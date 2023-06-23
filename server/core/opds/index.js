const basicAuth = require('express-basic-auth');

const RootPage = require('./RootPage');
const AuthorPage = require('./AuthorPage');
const SeriesPage = require('./SeriesPage');
const TitlePage = require('./TitlePage');
const GenrePage = require('./GenrePage');
const BookPage = require('./BookPage');

const OpensearchPage = require('./OpensearchPage');
const SearchPage = require('./SearchPage');
const SearchHelpPage = require('./SearchHelpPage');

const log = new (require('../AppLogger'))().log;//singleton

module.exports = function(app, config) {
    if (!config.opds || !config.opds.enabled)
        return;
    
    const opdsRoot = config.opds.root || '/opds';
    config.opdsRoot = opdsRoot;

    const root = new RootPage(config);
    const author = new AuthorPage(config);
    const series = new SeriesPage(config);
    const title = new TitlePage(config);
    const genre = new GenrePage(config);
    const book = new BookPage(config);

    const opensearch = new OpensearchPage(config);
    const search = new SearchPage(config);
    const searchHelp = new SearchHelpPage(config);

    const routes = [
        ['', root],
        ['/root', root],
        ['/author', author],
        ['/series', series],
        ['/title', title],
        ['/genre', genre],
        ['/book', book],

        ['/opensearch', opensearch],
        ['/search', search],
        ['/search-help', searchHelp],
    ];

    const pages = new Map();
    for (const r of routes) {
        pages.set(`${opdsRoot}${r[0]}`, r[1]);
    }

    const opds = async(req, res, next) => {
        try {
            const page = pages.get(req.path);

            if (page) {
                res.set('Content-Type', 'application/atom+xml; charset=utf-8');

                const result = await page.body(req, res);

                if (result !== false)
                    res.send(result);
            } else {
                next();
            }
        } catch (e) {
            log(LM_ERR, `OPDS: ${e.message}, url: ${req.originalUrl}`);
            res.status(500).send({error: e.message});
        }
    };

    const opdsPaths = [opdsRoot, `${opdsRoot}/*`];
    if (config.opds.password) {
        if (!config.opds.user)
            throw new Error('User must not be empty if password set');
/*
        app.use((req, res, next) => {
            console.log(req.headers);
            next();
        });
*/
        app.use(opdsPaths, basicAuth({
            users: {[config.opds.user]: config.opds.password},
            challenge: true,
        }));
    }
    app.get(opdsPaths, opds);
};

