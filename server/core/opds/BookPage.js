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
                entry.push(
                    this.makeEntry({
                        id: bookUid,
                        title: bookInfo.book.title || 'Без названия',
                        link: [
                            //this.imgLink({href: bookInfo.cover, type: coverType}),
                            this.acqLink({href: bookInfo.link, type: `application/${bookInfo.book.ext}+gzip`}),
                        ],
                    })
                );
            }
        }

        result.entry = entry;
        return this.makeBody(result);
    }
}

module.exports = BookPage;