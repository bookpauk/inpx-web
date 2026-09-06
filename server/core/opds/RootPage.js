const BasePage = require('./BasePage');
const AuthorPage = require('./AuthorPage');
const SeriesPage = require('./SeriesPage');
const TitlePage = require('./TitlePage');
const GenrePage = require('./GenrePage');
const FavoritesPage = require('./FavoritesPage');

class RootPage extends BasePage {
    constructor(config) {
        super(config);

        this.id = 'root';
        this.title = '';

        this.authorPage = new AuthorPage(config);
        this.seriesPage = new SeriesPage(config);
        this.titlePage = new TitlePage(config);
        this.genrePage = new GenrePage(config);
        this.favoritesPage = new FavoritesPage(config);
    }

    async body(req) {
        const result = {};

        if (!this.title) {
            const dbConfig = await this.webWorker.dbConfig();
            const collection = dbConfig.inpxInfo.collection.split('\n');
            this.title = collection[0].trim();
            if (!this.title)
                this.title = 'Неизвестная коллекция';
        }

        result.entry = [
            this.authorPage.myEntry(),
            this.seriesPage.myEntry(),
            this.titlePage.myEntry(),
            this.genrePage.myEntry(),
            this.favoritesPage.myEntry(),
        ];

        return this.makeBody(result, req);
    }
}

module.exports = RootPage;