const BasePage = require('./BasePage');

class AuthorPage extends BasePage {
    constructor(config) {
        super(config);

        this.id = 'author';
        this.title = 'Авторы';
    }

    bookAuthor(author) {
        if (author) {
            let a = author.split(',');
            return a.slice(0, 3).join(', ') + (a.length > 3 ? ' и др.' : '');
        }

        return '';
    }

    sortBooks(bookList) {
        //схлопывание серий
        const books = [];
        const seriesSet = new Set();
        for (const book of bookList) {
            if (book.series) {
                if (!seriesSet.has(book.series)) {
                    books.push({
                        type: 'series',
                        book
                    });

                    seriesSet.add(book.series);
                }
            } else {
                books.push({
                    type: 'book',
                    book
                });
            }
        }

        //сортировка
        books.sort((a, b) => {
            if (a.type == 'series') {
                return (b.type == 'series' ? a.book.series.localeCompare(b.book.series) : -1);
            } else {
                return (b.type == 'book' ? a.book.title.localeCompare(b.book.title) : 1);
            }
        });

        return books;
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
            author: req.query.author || '',
            series: req.query.series || '',
            genre: req.query.genre || '',
            del: 0,
            
            all: req.query.all || '',
            depth: 0,
        };
        query.depth = query.author.length + 1;

        if (query.author == '___others') {
            query.author = '';
            query.depth = 1;
            query.others = true;
        }

        const entry = [];
        if (query.series) {
            //книги по серии
            const bookList = await this.webWorker.getSeriesBookList(query.series);

            if (bookList.books) {
                let books = JSON.parse(bookList.books);
                const filtered = (query.all ? books : this.filterBooks(books, query));
                const sorted = this.sortSeriesBooks(filtered);

                if (books.length > filtered.length) {
                    entry.push(
                        this.makeEntry({
                            id: 'all_series_books',
                            title: '[Все книги серии]',
                            link: this.navLink({
                                href: `/${this.id}?author=${encodeURIComponent(query.author)}` +
                                    `&series=${encodeURIComponent(query.series)}&all=1`}),
                        })
                    );
                }

                for (const book of sorted) {
                    let title = `${book.serno ? `${book.serno}. `: ''}${book.title || 'Без названия'}`;
                    if (query.all) {
                        title = `${this.bookAuthor(book.author)} "${title}"`;
                    }
                    title += ` (${book.ext})`;

                    entry.push(
                        this.makeEntry({
                            id: book._uid,
                            title,
                            link: this.acqLink({href: `/book?uid=${encodeURIComponent(book._uid)}`}),
                        })
                    );
                }
            }
        } else if (query.author && query.author[0] == '=') {
            //книги по автору
            const bookList = await this.webWorker.getAuthorBookList(0, query.author.substring(1));

            if (bookList.books) {
                let books = JSON.parse(bookList.books);
                books = this.sortBooks(this.filterBooks(books, query));

                for (const b of books) {
                    if (b.type == 'series') {
                        entry.push(
                            this.makeEntry({
                                id: b.book._uid,
                                title: `Серия: ${b.book.series}`,
                                link: this.navLink({
                                    href: `/${this.id}?author=${encodeURIComponent(query.author)}` +
                                        `&series=${encodeURIComponent(b.book.series)}&genre=${encodeURIComponent(query.genre)}`}),
                            })
                        );
                    } else {
                        const title = `${b.book.title || 'Без названия'} (${b.book.ext})`;
                        entry.push(
                            this.makeEntry({
                                id: b.book._uid,
                                title,
                                link: this.acqLink({href: `/book?uid=${encodeURIComponent(b.book._uid)}`}),
                            })
                        );
                    }
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
            const queryRes = await this.opdsQuery('author', query, '[Остальные авторы]');

            for (const rec of queryRes) {                
                entry.push(
                    this.makeEntry({
                        id: rec.id,
                        title: this.bookAuthor(rec.title),//${(query.depth > 1 && rec.count ? ` (${rec.count})` : '')}
                        link: this.navLink({href: `/${this.id}?author=${rec.q}&genre=${encodeURIComponent(query.genre)}`}),
                    })
                );
            }
        }

        result.entry = entry;
        return this.makeBody(result, req);
    }
}

module.exports = AuthorPage;