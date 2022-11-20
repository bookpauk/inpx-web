const path = require('path');

const RootPage = require('./RootPage');

module.exports = function(app, config) {
    const root = new RootPage(config);

    const pages = new Map([
        ['opds', root]
    ]);

    const opds = async(req, res, next) => {
        try {
            const pageName = path.basename(req.path);
            const page = pages.get(pageName);

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
        }
    };

    app.get(['/opds', '/opds/*'], opds);
};

