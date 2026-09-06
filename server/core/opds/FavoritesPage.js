const BasePage = require('./BasePage');
const Favorites = require('../Favorites');

class FavoritesPage extends BasePage {
    constructor(config) {
        super(config);

        this.id = 'favorites';
        this.title = 'Избранное';

        this.favorites = new Favorites(config);
    }

    async body(req) {
        const result = {};

        result.link = this.baseLinks(req, true);

        //удаление с полки: /opds/favorites?del=<uid>
        if (req.query.del)
            await this.favorites.remove(req.query.del);

        const books = await this.favorites.list();

        const entry = [];
        for (const book of books) {
            const series = (book.series ? ` (Серия: ${book.series}${book.serno ? ` #${book.serno}` : ''})` : '');

            entry.push(
                this.makeEntry({
                    id: book.uid,
                    title: `${book.title || 'Без названия'}${book.ext ? ` (${book.ext})` : ''}`,
                    link: this.acqLink({href: `/book?uid=${encodeURIComponent(book.uid)}`}),
                    content: {
                        '*ATTRS': {type: 'text'},
                        '*TEXT': `${this.bookAuthor(book.author)}${series}`,
                    },
                })
            );
        }

        if (!entry.length) {
            entry.push(
                this.makeEntry({
                    id: 'empty',
                    title: '[Полка пуста, скачайте книгу]',
                    link: this.navLink({href: '/root'}),
                })
            );
        }

        result.entry = entry;

        return this.makeBody(result, req);
    }
}

module.exports = FavoritesPage;
