class DbSearcher {
    constructor(db) {
        this.db = db;
    }

    async search(query) {
        const db = this.db;

        let result = [];

        if (query.author) {
            //
        } else {
            result = await db.select({
                table: 'author',
                map: `(r) => ({id: r.id, author: r.author})`
            });
        }

        if (query.limit) {
            result = result.slice(0, query.limit);
        }

        return result;
    }
}

module.exports = DbSearcher;