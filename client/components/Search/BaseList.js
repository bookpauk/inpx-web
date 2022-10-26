import _ from 'lodash';

import authorBooksStorage from './authorBooksStorage';

import BookView from './BookView/BookView.vue';
import LoadingMessage from './LoadingMessage/LoadingMessage.vue';
import * as utils from '../../share/utils';

const showMoreCount = 100;//значение для "Показать еще"
const maxItemCount = 500;//выше этого значения показываем "Загрузка"

const componentOptions = {
    components: {
        BookView,
        LoadingMessage,
    },
    watch: {
        settings() {
            this.loadSettings();
        },
        search: {
            handler(newValue) {
                this.limit = newValue.limit;

                if (this.pageCount > 1)
                    this.prevPage = this.search.page;

                this.refresh();
            },
            deep: true,
        },
        showDeleted() {
            this.updateTableData();
        },
    },
};
export default class BaseList {
    _options = componentOptions;
    _props = {
        list: Object,
        search: Object,
        genreMap: Object,
    };
    
    loadingMessage = '';
    loadingMessage2 = '';

    //settings
    expandedAuthor = [];
    expandedSeries = [];

    showCounts = true;
    showRate = true;
    showGenres = true;    
    showDeleted = false;
    abCacheEnabled = true;

    //stuff
    refreshing = false;

    showMoreCount = showMoreCount;
    maxItemCount = maxItemCount;

    searchResult = {};
    tableData = [];

    created() {
        this.commit = this.$store.commit;
        this.api = this.$root.api;

        this.loadSettings();
    }

    mounted() {
        this.refresh();//no await
    }

    loadSettings() {
        const settings = this.settings;

        this.expandedAuthor = _.cloneDeep(settings.expandedAuthor);
        this.expandedSeries = _.cloneDeep(settings.expandedSeries);
        this.showCounts = settings.showCounts;
        this.showRate = settings.showRate;
        this.showGenres = settings.showGenres;
        this.showDeleted = settings.showDeleted;
        this.abCacheEnabled = settings.abCacheEnabled;
    }

    get config() {
        return this.$store.state.config;
    }

    get settings() {
        return this.$store.state.settings;
    }

    get showReadLink() {
        return this.config.bookReadLink != '' || this.list.liberamaReady;
    }

    scrollToTop() {
        this.$emit('listEvent', {action: 'scrollToTop'});
    }

    selectAuthor(author) {
        this.search.author = `=${author}`;
        this.scrollToTop();
    }

    selectSeries(series) {
        this.search.series = `=${series}`;
    }

    selectTitle(title) {
        this.search.title = `=${title}`;
    }

    async download(book, action) {
        if (this.downloadFlag)
            return;

        this.downloadFlag = true;
        (async() => {
            await utils.sleep(200);
            if (this.downloadFlag)
                this.loadingMessage2 = 'Подготовка файла...';
        })();

        try {
            const makeValidFilenameOrEmpty = (s) => {
                try {
                    return utils.makeValidFilename(s);
                } catch(e) {
                    return '';
                }
            };

            //имя файла
            let downFileName = 'default-name';
            const author = book.author.split(',');
            const at = [author[0], book.title];
            downFileName = makeValidFilenameOrEmpty(at.filter(r => r).join(' - '))
                || makeValidFilenameOrEmpty(at[0])
                || makeValidFilenameOrEmpty(at[1])
                || downFileName;
            downFileName = downFileName.substring(0, 100);

            const ext = `.${book.ext}`;
            if (downFileName.substring(downFileName.length - ext.length) != ext)
                downFileName += ext;

            const bookPath = `${book.folder}/${book.file}${ext}`;
            //подготовка
            const response = await this.api.getBookLink({bookPath, downFileName});
            
            const link = response.link;
            const href = `${window.location.origin}${link}`;

            if (action == 'download') {
                //скачивание
                const d = this.$refs.download;
                d.href = href;
                d.download = downFileName;

                d.click();
            } else if (action == 'copyLink') {
                //копирование ссылки
                if (await utils.copyTextToClipboard(href))
                    this.$root.notify.success('Ссылка успешно скопирована');
                else
                    this.$root.stdDialog.alert(
`Копирование ссылки не удалось. Пожалуйста, попробуйте еще раз.
<br><br>
<b>Пояснение</b>: вероятно, браузер запретил копирование, т.к. прошло<br>
слишком много времени с момента нажатия на кнопку (инициация<br>
пользовательского события). Сейчас ссылка уже закеширована,<br>
поэтому повторная попытка должна быть успешной.`, 'Ошибка');
            } else if (action == 'readBook') {
                //читать
                if (this.list.liberamaReady) {
                    this.sendMessage({type: 'submitUrl', data: href});
                } else {
                    const url = this.config.bookReadLink.replace('${DOWNLOAD_LINK}', href);
                    window.open(url, '_blank');
                }
            }
        } catch(e) {
            this.$root.stdDialog.alert(e.message, 'Ошибка');
        } finally {
            this.downloadFlag = false;
            this.loadingMessage2 = '';
        }
    }

    bookEvent(event) {
        switch (event.action) {
            case 'authorClick':
                this.selectAuthor(event.book.author);
                break;
            case 'seriesClick':
                this.selectSeries(event.book.series);
                break;
            case 'titleClick':
                this.selectTitle(event.book.title);
                break;
            case 'download':
            case 'copyLink':
            case 'readBook':
                this.download(event.book, event.action);//no await
                break;
        }
    }

    isExpandedAuthor(item) {
        return this.expandedAuthor.indexOf(item.author) >= 0;
    }

    isExpandedSeries(seriesItem) {
        return this.expandedSeries.indexOf(seriesItem.key) >= 0;
    }

    setSetting(name, newValue) {
        this.commit('setSettings', {[name]: _.cloneDeep(newValue)});
    }

    highlightPageScroller(query) {
        this.$emit('listEvent', {action: 'highlightPageScroller', query});
    }

    async expandSeries(seriesItem) {
        const expandedSeries = _.cloneDeep(this.expandedSeries);
        const key = seriesItem.key;

        if (!this.isExpandedSeries(seriesItem)) {
            expandedSeries.push(key);

            if (expandedSeries.length > 100) {
                expandedSeries.shift();
            }

            this.getSeriesBooks(seriesItem); //no await

            //this.$emit('listEvent', {action: 'ignoreScroll'});
            this.setSetting('expandedSeries', expandedSeries);
        } else {
            const i = expandedSeries.indexOf(key);
            if (i >= 0) {
                expandedSeries.splice(i, 1);
                this.setSetting('expandedSeries', expandedSeries);
            }
        }
    }

    async loadAuthorBooks(authorId) {
        try {
            let result;

            if (this.abCacheEnabled) {
                const key = `author-${authorId}-${this.list.inpxHash}`;
                const data = await authorBooksStorage.getData(key);
                if (data) {
                    result = JSON.parse(data);
                } else {
                    result = await this.api.getAuthorBookList(authorId);
                    await authorBooksStorage.setData(key, JSON.stringify(result));
                }
            } else {
                result = await this.api.getAuthorBookList(authorId);
            }

            return (result.books ? JSON.parse(result.books) : []);
        } catch (e) {
            this.$root.stdDialog.alert(e.message, 'Ошибка');
        }
    }

    async loadSeriesBooks(series) {
        try {
            let result;

            if (this.abCacheEnabled) {
                const key = `series-${series}-${this.list.inpxHash}`;
                const data = await authorBooksStorage.getData(key);
                if (data) {
                    result = JSON.parse(data);
                } else {
                    result = await this.api.getSeriesBookList(series);
                    await authorBooksStorage.setData(key, JSON.stringify(result));
                }
            } else {
                result = await this.api.getSeriesBookList(series);
            }

            return (result.books ? JSON.parse(result.books) : []);
        } catch (e) {
            this.$root.stdDialog.alert(e.message, 'Ошибка');
        }
    }

    async getSeriesBooks(seriesItem) {
        //блокируем повторный вызов
        if (seriesItem.seriesBookLoading)
            return;
        seriesItem.seriesBookLoading = true;

        try {
            seriesItem.allBooksLoaded = await this.loadSeriesBooks(seriesItem.series);

            if (seriesItem.allBooksLoaded) {
                seriesItem.allBooksLoaded = seriesItem.allBooksLoaded.filter(book => (this.showDeleted || !book.del));
                this.sortSeriesBooks(seriesItem.allBooksLoaded);
                this.showMoreAll(seriesItem);
            }
        } finally {
            seriesItem.seriesBookLoading = false;
        }
    }

    filterBooks(books) {
        const s = this.search;

        const emptyFieldValue = '?';
        const maxUtf8Char = String.fromCodePoint(0xFFFFF);
        const ruAlphabet = 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя';
        const enAlphabet = 'abcdefghijklmnopqrstuvwxyz';
        const enru = new Set((ruAlphabet + enAlphabet).split(''));

        const splitAuthor = (author) => {
            if (!author) {
                author = emptyFieldValue;
            }

            const result = author.split(',');
            if (result.length > 1)
                result.push(author);

            return result;
        };

        const filterBySearch = (bookValue, searchValue) => {
            if (!searchValue)
                return true;

            if (!bookValue)
                bookValue = emptyFieldValue;

            bookValue = bookValue.toLowerCase();
            searchValue = searchValue.toLowerCase();

            //особая обработка префиксов
            if (searchValue[0] == '=') {

                searchValue = searchValue.substring(1);
                return bookValue.localeCompare(searchValue) == 0;
            } else if (searchValue[0] == '*') {

                searchValue = searchValue.substring(1);
                return bookValue !== emptyFieldValue && bookValue.indexOf(searchValue) >= 0;
            } else if (searchValue[0] == '#') {

                searchValue = searchValue.substring(1);
                return !bookValue || (bookValue !== emptyFieldValue && !enru.has(bookValue[0]) && bookValue.indexOf(searchValue) >= 0);
            } else {
                //where = `@dirtyIndexLR('value', ${db.esc(a)}, ${db.esc(a + maxUtf8Char)})`;
                return bookValue.localeCompare(searchValue) >= 0 && bookValue.localeCompare(searchValue + maxUtf8Char) <= 0;
            }
        };

        return books.filter((book) => {
            //author
            let authorFound = false;
            const authors = splitAuthor(book.author);
            for (const a of authors) {
                if (filterBySearch(a, s.author)) {
                    authorFound = true;
                    break;
                }
            }

            //genre
            let genreFound = !s.genre;
            if (!genreFound) {
                const searchGenres = new Set(s.genre.split(','));
                const bookGenres = book.genre.split(',');

                for (let g of bookGenres) {
                    if (!g)
                        g = emptyFieldValue;

                    if (searchGenres.has(g)) {
                        genreFound = true;
                        break;
                    }
                }
            }

            //lang
            let langFound = !s.lang;
            if (!langFound) {
                const searchLang = new Set(s.lang.split(','));
                langFound = searchLang.has(book.lang || emptyFieldValue);
            }

            return (this.showDeleted || !book.del)
                && authorFound
                && filterBySearch(book.series, s.series)
                && filterBySearch(book.title, s.title)
                && genreFound
                && langFound
            ;
        });
    }

    showMore(item, all = false) {
        if (item.booksLoaded) {
            const currentLen = (item.books ? item.books.length : 0);
            let books;
            if (all || currentLen + this.showMoreCount*1.5 > item.booksLoaded.length) {
                books = item.booksLoaded;
            } else {
                books = item.booksLoaded.slice(0, currentLen + this.showMoreCount);
            }

            item.showMore = (books.length < item.booksLoaded.length);
            item.books = books;
        }
    }

    showMoreAll(seriesItem, all = false) {
        if (seriesItem.allBooksLoaded) {
            const currentLen = (seriesItem.allBooks ? seriesItem.allBooks.length : 0);
            let books;
            if (all || currentLen + this.showMoreCount*1.5 > seriesItem.allBooksLoaded.length) {
                books = seriesItem.allBooksLoaded;
            } else {
                books = seriesItem.allBooksLoaded.slice(0, currentLen + this.showMoreCount);
            }

            seriesItem.showMoreAll = (books.length < seriesItem.allBooksLoaded.length);
            seriesItem.allBooks = books;
        }
    }

    sortSeriesBooks(seriesBooks) {
        seriesBooks.sort((a, b) => {
            const dserno = (a.serno || Number.MAX_VALUE) - (b.serno || Number.MAX_VALUE);
            const dtitle = a.title.localeCompare(b.title);
            const dext = a.ext.localeCompare(b.ext);
            return (dserno ? dserno : (dtitle ? dtitle : dext));
        });
    }
}