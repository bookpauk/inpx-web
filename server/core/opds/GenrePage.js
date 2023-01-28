const BasePage = require('./BasePage');

class GenrePage extends BasePage {
    constructor(config) {
        super(config);

        this.id = 'genre';
        this.title = 'Жанры';

    }

    async body(req) {
        const result = {};

        const query = {
            from: req.query.from || 'search',
            term: req.query.term || '*',
            section: req.query.section || '',
        };

        let searchQuery = '';
        if (query.from == 'search')
            searchQuery = `&type=title&term=${encodeURIComponent(query.term)}`;

        const entry = [];
        if (query.from) {
            if (query.section) {
                //выбираем подразделы
                const {genreSection} = await this.getGenres();
                const section = genreSection.get(query.section);

                if (section) {
                    let id = 0;
                    const all = [];
                    for (const g of section) {
                        all.push(g.value);
                        entry.push(
                            this.makeEntry({
                                id: ++id,
                                title: g.name,
                                link: this.navLink({href: `/${encodeURIComponent(query.from)}?genre=${encodeURIComponent(g.value)}${searchQuery}`}),
                            })
                        );
                    }

                    entry.unshift(
                        this.makeEntry({
                            id: 'whole_section',
                            title: '[Весь раздел]',
                            link: this.navLink({href: `/${encodeURIComponent(query.from)}?genre=${encodeURIComponent(all.join(','))}${searchQuery}`}),
                        })
                    );
                }
            } else {
                //выбираем разделы
                const {genreTree} = await this.getGenres();
                let id = 0;
                for (const section of genreTree) {
                    entry.push(
                        this.makeEntry({
                            id: ++id,
                            title: section.name,
                            link: this.navLink({href: `/genre?from=${encodeURIComponent(query.from)}&section=${encodeURIComponent(section.name)}${searchQuery}`}),
                        })
                    );
                }
            }
        }

        result.entry = entry;

        return this.makeBody(result, req);
    }
}

module.exports = GenrePage;