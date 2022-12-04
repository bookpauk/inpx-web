const BasePage = require('./BasePage');
const utils = require('../utils');

class SeriesPage extends BasePage {
    constructor(config) {
        super(config);

        this.id = 'series';
        this.title = 'Серии';
    }

    sortSeriesBooks(seriesBooks) {
        seriesBooks.sort((a, b) => {
            const dserno = (a.serno || Number.MAX_VALUE) - (b.serno || Number.MAX_VALUE);
            const dtitle = a.title.localeCompare(b.title);
            const dext = a.ext.localeCompare(b.ext);
            return (dserno ? dserno : (dtitle ? dtitle : dext));        
        });

        return seriesBooks;
    }

    async body(req) {
        const result = {};

        const query = {
            series: req.query.series || '',
            genre: req.query.genre || '',
            del: 0,
            
            all: req.query.all || '',
            depth: 0,
        };
        query.depth = query.series.length + 1;

        if (query.series == '___others') {
            query.series = '';
            query.depth = 1;
            query.others = true;
        }

        const entry = [];
        if (query.series && query.series[0] == '=') {
            //книги по серии
            const bookList = await this.webWorker.getSeriesBookList(query.series.substring(1));

            if (bookList.books) {
                let books = bookList.books;
                const booksAll = this.filterBooks(books, {del: 0});
                const filtered = (query.all ? booksAll : this.filterBooks(books, query));
                const sorted = this.sortSeriesBooks(filtered);

                if (booksAll.length > filtered.length) {
                    entry.push(
                        this.makeEntry({
                            id: 'all_series_books',
                            title: '[Все книги серии]',
                            link: this.navLink({
                                href: `/${this.id}?series=${encodeURIComponent(query.series)}&all=1`}),
                        })
                    );
                }

                for (const book of sorted) {
                    const title = `${book.serno ? `${book.serno}. `: ''}${book.title || 'Без названия'} (${book.ext})`;

                    const e = {
                        id: book._uid,
                        title,
                        link: this.acqLink({href: `/book?uid=${encodeURIComponent(book._uid)}`}),
                    };

                    if (query.all) {
                        e.content = {
                            '*ATTRS': {type: 'text'},
                            '*TEXT': this.bookAuthor(book.author),
                        }
                    }

                    entry.push(
                        this.makeEntry(e)
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
            const queryRes = await this.opdsQuery('series', query, '[Остальные серии]');

            for (const rec of queryRes) {
                const e = {
                    id: rec.id,
                    title: (rec.count ? rec.title : `Серия: ${rec.title}`),
                    link: this.navLink({href: `/${this.id}?series=${rec.q}&genre=${encodeURIComponent(query.genre)}`}),
                };

                if (rec.count) {
                    e.content = {
                        '*ATTRS': {type: 'text'},
                        '*TEXT': `${rec.count} сери${utils.wordEnding(rec.count, 1)}`,
                    };
                }

                entry.push(this.makeEntry(e));
            }
        }

        result.entry = entry;
        return this.makeBody(result, req);
    }
}

module.exports = SeriesPage;