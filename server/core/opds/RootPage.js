const BasePage = require('./BasePage');

class RootPage extends BasePage {
    constructor(config) {
        super(config);

        this.id = 'root';
        this.title = '';
    }

    async body() {
        const result = {};
        const ww = this.webWorker;

        if (!this.title) {
            const dbConfig = await ww.dbConfig();
            const collection = dbConfig.inpxInfo.collection.split('\n');
            this.title = collection[0].trim();
            if (!this.title)
                this.title = 'Неизвестная коллекция';
        }

        result.link = [
            this.navLink({rel: 'start'}),
            this.navLink({rel: 'self'}),
        ];

        result.entry = [
            this.makeEntry({
                id: 'author',
                title: 'Авторы', 
                link: this.navLink({rel: 'subsection', href: '/author'}),
            }),
        ];

        return this.makeBody(result);
    }
}

module.exports = RootPage;