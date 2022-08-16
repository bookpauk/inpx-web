const InpxParser = require('./InpxParser');

class DbCreator {
    constructor(config) {
        this.config = config;
    }

    async run(db, callback) {
        const config = this.config;

        //book
        await db.create({
            table: 'book'            
        });

        //парсинг
        const parser = new InpxParser();

        const readFileCallback = async(readState) => {
            callback(readState);
        };

        let recsLoaded = 0;
        let id = 0;
        const parsedCallback = async(chunk) => {
            for (const rec of chunk) {
                rec.id = ++id;
            }

            await db.insert({table: 'book', rows: chunk});
            
            recsLoaded += chunk.length;
            callback({recsLoaded});
        };

        await parser.parse(config.inpxFile, readFileCallback, parsedCallback);

        //поисковые таблицы
    }
}

module.exports = DbCreator;