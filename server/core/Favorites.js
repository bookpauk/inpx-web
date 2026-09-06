const fs = require('fs-extra');

const LockQueue = require('./LockQueue');

//Полка «Избранное»: список книг, которые уже скачивали.
//Хранится отдельным файлом, а не в поисковой БД, — та пересоздается при смене inpx.
class Favorites {
    constructor(config) {
        if (Favorites.instance)
            return Favorites.instance;

        this.config = config;
        this.filePath = `${config.dataDir}/favorites.json`;
        this.lock = new LockQueue(1000);
        this.books = null;

        Favorites.instance = this;
    }

    get maxCount() {
        const c = this.config.favorites;
        return (c && c.maxCount) || 5000;
    }

    async load() {
        if (this.books)
            return this.books;

        this.books = [];
        if (await fs.pathExists(this.filePath)) {
            try {
                const data = JSON.parse(await fs.readFile(this.filePath, 'utf8'));
                if (data && Array.isArray(data.books))
                    this.books = data.books;
            } catch (e) {
                //битый файл не должен ронять сервер, начинаем полку заново
                this.books = [];
            }
        }

        return this.books;
    }

    async save() {
        const tmpFile = `${this.filePath}.tmp`;
        await fs.writeFile(tmpFile, JSON.stringify({books: this.books}, null, 2));
        await fs.move(tmpFile, this.filePath, {overwrite: true});
    }

    //book: запись из таблицы book поисковой БД
    async add(bookUid, book = {}) {
        if (!bookUid)
            return;

        await this.lock.get();
        try {
            await this.load();

            const rec = {
                uid: bookUid,
                author: book.author || '',
                title: book.title || '',
                series: book.series || '',
                serno: book.serno || 0,
                ext: book.ext || '',
                size: book.size || 0,
                addedAt: (new Date()).toISOString(),
            };

            const i = this.books.findIndex(b => b.uid === bookUid);
            if (i >= 0) {
                rec.addedAt = this.books[i].addedAt;
                rec.downloadCount = (this.books[i].downloadCount || 1) + 1;
                rec.lastAt = (new Date()).toISOString();
                this.books.splice(i, 1);
            } else {
                rec.downloadCount = 1;
                rec.lastAt = rec.addedAt;
            }

            this.books.unshift(rec);
            if (this.books.length > this.maxCount)
                this.books = this.books.slice(0, this.maxCount);

            await this.save();
        } finally {
            this.lock.ret();
        }
    }

    async remove(bookUid) {
        await this.lock.get();
        try {
            await this.load();

            const i = this.books.findIndex(b => b.uid === bookUid);
            if (i >= 0) {
                this.books.splice(i, 1);
                await this.save();
            }
        } finally {
            this.lock.ret();
        }
    }

    async list() {
        await this.lock.get();
        try {
            return (await this.load()).slice();
        } finally {
            this.lock.ret();
        }
    }
}

module.exports = Favorites;
