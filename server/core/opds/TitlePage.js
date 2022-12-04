const BasePage = require('./BasePage');
const utils = require('../utils');

class TitlePage extends BasePage {
    constructor(config) {
        super(config);

        this.id = 'title';
        this.title = 'Книги';
    }

    async body(req) {
        const result = {};

        const query = {
            title: req.query.title || '',
            genre: req.query.genre || '',
            del: 0,
            
            depth: 0,
        };
        query.depth = query.title.length + 1;

        if (query.title == '___others') {
            query.title = '';
            query.depth = 1;
            query.others = true;
        }

        const entry = [];
        if (query.title && query.title[0] == '=') {
            //книги по названию
            const res = await this.webWorker.search('title', query);

            if (res.found.length) {
                const books = res.found[0].books || [];
                const filtered = this.filterBooks(books, query);

                for (const book of filtered) {
                    const title = `${book.serno ? `${book.serno}. `: ''}${book.title || 'Без названия'} (${book.ext})`;

                    entry.push(
                        this.makeEntry({
                            id: book._uid,
                            title,
                            link: this.acqLink({href: `/book?uid=${encodeURIComponent(book._uid)}`}),
                            content: {
                                '*ATTRS': {type: 'text'},
                                '*TEXT': this.bookAuthor(book.author),
                            },
                        })
                    );
                }
            }
        } else {
            if (query.depth == 1 && !query.genre && !query.others) {
                entry.push(
                    this.makeEntry({
                        id: 'select_genre',
                        title: '[Выбрать жанр]',
                        link: this.navLink({href: `/genre?from=${this.id}`}),
                    })
                );
            }

            //навигация по каталогу
            const queryRes = await this.opdsQuery('title', query, '[Остальные названия]');

            for (const rec of queryRes) {
                const e = {
                    id: rec.id,
                    title: rec.title,
                    link: this.navLink({href: `/${this.id}?title=${rec.q}&genre=${encodeURIComponent(query.genre)}`}),
                };

                if (rec.count) {
                    e.content = {
                        '*ATTRS': {type: 'text'},
                        '*TEXT': `${rec.count} назван${utils.wordEnding(rec.count, 3)}`,
                    };
                }

                entry.push(this.makeEntry(e));
            }
        }

        result.entry = entry;
        return this.makeBody(result, req);
    }
}

module.exports = TitlePage;