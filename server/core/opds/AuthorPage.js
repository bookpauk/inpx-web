const BasePage = require('./BasePage');

class AuthorPage extends BasePage {
    constructor(config) {
        super(config);

        this.id = 'author';
        this.title = 'Авторы';
    }

    async body() {
        const result = {};

        result.entry = [
        ];

        return this.makeBody(result);
    }
}

module.exports = AuthorPage;