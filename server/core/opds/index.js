const RootPage = require('./RootPage');
const AuthorPage = require('./AuthorPage');
const SeriesPage = require('./SeriesPage');
const GenrePage = require('./GenrePage');
const BookPage = require('./BookPage');

module.exports = function(app, config) {
    const opdsRoot = '/opds';
    config.opdsRoot = opdsRoot;

    const root = new RootPage(config);
    const author = new AuthorPage(config);
    const series = new SeriesPage(config);
    const genre = new GenrePage(config);
    const book = new BookPage(config);

    const routes = [
        ['', root],
        ['/root', root],
        ['/author', author],
        ['/series', series],
        ['/genre', genre],
        ['/book', book],
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
            res.status(500).send({error: e.message});
            if (config.branch == 'development') {
                console.error({error: e.message, url: req.originalUrl});
            }
        }
    };

    app.get([opdsRoot, `${opdsRoot}/*`], opds);
};

