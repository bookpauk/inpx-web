const path = require('path');
const BasePage = require('./BasePage');

class BookPage extends BasePage {
    constructor(config) {
        super(config);

        this.id = 'book';
        this.title = 'Книга';
    }

    async body(req) {
        const result = {};

        const bookUid = req.query.uid;
        const entry = [];
        if (bookUid) {
            const {bookInfo} = await this.webWorker.getBookInfo(bookUid);
            if (bookInfo) {
                const e = this.makeEntry({
                    id: bookUid,
                    title: bookInfo.book.title || 'Без названия',
                    link: [
                        this.downLink({href: bookInfo.link, type: `application/${bookInfo.book.ext}+zip`}),
                    ],
                });

                if (bookInfo.cover) {
                    let coverType = 'image/jpeg';
                    if (path.extname(bookInfo.cover) == '.png')
                        coverType = 'image/png';

                    e.link.push(this.imgLink({href: bookInfo.cover, type: coverType}));
                    e.link.push(this.imgLink({href: bookInfo.cover, type: coverType, thumb: true}));
                }

                entry.push(e);
            }
        }

        result.entry = entry;
        return this.makeBody(result, req);
    }
}

module.exports = BookPage;