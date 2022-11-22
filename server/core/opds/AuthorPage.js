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

    async body(req) {
        const result = {};

        const query = {author: '', depth: 1, del: 0, limit: 100};
        if (req.query.author) {
            query.author = req.query.author;
            query.depth = query.author.length + 1;
        }

        if (req.query.author == '___others') {
            query.author = '';
            query.depth = 1;
            query.others = true;
        }

        const entry = [];
        if (query.author && query.author[0] == '=') {
            //книги по автору
            const bookList = await this.webWorker.getAuthorBookList(0, query.author.substring(1));

            if (bookList.books) {
                const books = JSON.parse(bookList.books);

                for (const book of books) {
                    const title = book.title || 'Без названия';
                    entry.push(
                        this.makeEntry({
                            id: book._uid,
                            title,
                            link: this.navLink({rel: 'subsection', href: `/${this.id}?book=${book._uid}`}),
                        })
                    );
                }
            }
        } else {
            //поиск по каталогу
            const queryRes = await this.opdsQuery('author', query);

            for (const rec of queryRes) {
console.log(rec);                
                entry.push(
                    this.makeEntry({
                        id: rec.id,
                        title: this.bookAuthor(rec.title),//${(query.depth > 1 && rec.count ? ` (${rec.count})` : '')}
                        link: this.navLink({rel: 'subsection', href: `/${this.id}?author=${rec.q}`}),
                    })
                );
            }
        }

        result.entry = entry;
        return this.makeBody(result);
    }
}

module.exports = AuthorPage;