const BasePage = require('./BasePage');
const utils = require('../utils');

class SearchPage extends BasePage {
    constructor(config) {
        super(config);

        this.id = 'search';
        this.title = 'Поиск';
    }

    async body(req) {
        const result = {};

        const query = {
            type: req.query.type || '',
            term: req.query.term || '',
            page: parseInt(req.query.page, 10) || 1,
        };

        let entry = [];
        if (query.type) {
            if (['author', 'series', 'title'].includes(query.type)) {
                const from = query.type;
                const page = query.page;

                const limit = 100;
                const offset = (page - 1)*limit;
                const queryRes = await this.webWorker.search(from, {[from]: query.term, del: 0, offset, limit});

                const found = queryRes.found;

                for (let i = 0; i < found.length; i++) {
                    if (i >= limit)
                        break;

                    const row = found[i];

                    entry.push(
                        this.makeEntry({
                            id: row.id,
                            title: `${(from === 'series' ? 'Серия: ': '')}${row[from]}`,
                            link: this.navLink({href: `/${from}?${from}==${encodeURIComponent(row[from])}`}),
                            content: {
                                '*ATTRS': {type: 'text'},
                                '*TEXT': `${row.bookCount} книг${utils.wordEnding(row.bookCount, 8)}`,
                            },
                        }),
                    );
                }

                if (queryRes.totalFound > offset + found.length) {
                    entry.push(
                        this.makeEntry({
                            id: 'next_page',
                            title: '[Следующая страница]',
                            link: this.navLink({href: `/${this.id}?type=${from}&term=${encodeURIComponent(query.term)}&page=${page + 1}`}),
                        }),
                    );
                }
            }
        } else {
            //корневой раздел
            entry = [
                this.makeEntry({
                    id: 'search_author',
                    title: 'Поиск авторов',
                    link: this.navLink({href: `/${this.id}?type=author&term=${encodeURIComponent(query.term)}`}),
                    content: {
                        '*ATTRS': {type: 'text'},
                        '*TEXT': `Искать по именам авторов`,
                    },
                }),
                this.makeEntry({
                    id: 'search_series',
                    title: 'Поиск серий',
                    link: this.navLink({href: `/${this.id}?type=series&term=${encodeURIComponent(query.term)}`}),
                    content: {
                        '*ATTRS': {type: 'text'},
                        '*TEXT': `Искать по названиям серий`,
                    },
                }),
                this.makeEntry({
                    id: 'search_title',
                    title: 'Поиск книг',
                    link: this.navLink({href: `/${this.id}?type=title&term=${encodeURIComponent(query.term)}`}),
                    content: {
                        '*ATTRS': {type: 'text'},
                        '*TEXT': `Искать по названиям книг`,
                    },
                }),
            ]
        }

        result.entry = entry;
        return this.makeBody(result, req);
    }
}

module.exports = SearchPage;