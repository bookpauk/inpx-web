const he = require('he');

const BasePage = require('./BasePage');

class SearchHelpPage extends BasePage {
    constructor(config) {
        super(config);

        this.id = 'search_help';
        this.title = 'Памятка по поиску';

    }

    async body(req) {
        const result = {};

        result.link = this.baseLinks(req, true);

        const content = `
Формат поискового значения:
<ul>
    <li>
        без префикса: значение трактуется, как "начинается с"
    </li>
    <li>
        префикс "=": поиск по точному совпадению
    </li>
    <li>
        префикс "*": поиск подстроки в строке
    </li>
    <li>
        префикс "#": поиск подстроки в строке, но только среди значений, начинающихся не с латинского или кириллического символа
    </li>
    <li>
        префикс "~": поиск по регулярному выражению
    </li>
    <li>
        префикс "?": поиск пустых значений или тех, что начинаются с этого символа
    </li>
</ul>
`;
        const entry = [
            this.makeEntry({
                id: 'help',
                title: this.title,
                content: {
                    '*ATTRS': {type: 'text/html'},
                    '*TEXT': he.escape(content),
                },
                link: [
                    this.downLink({href: '/book/fake-link', type: `application/fb2+zip`})
                ],
            })
        ];

        result.entry = entry;

        return this.makeBody(result, req);
    }
}

module.exports = SearchHelpPage;