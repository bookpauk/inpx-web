<template>
    <div>
        <a ref="download" style="display: none;"></a>

        <LoadingMessage :message="loadingMessage" z-index="2" />
        <LoadingMessage :message="loadingMessage2" z-index="1" />

        <!-- Формирование списка ------------------------------------------------------------------------>
        <div v-for="item in tableData" :key="item.key" class="column" :class="{'odd-author': item.num % 2}" style="font-size: 120%">
            <div class="row items-center q-ml-md q-mr-xs no-wrap">
                <div class="row items-center clickable2 q-py-xs no-wrap" @click="expandAuthor(item)">
                    <div style="min-width: 30px">
                        <div v-if="!isExpanded(item)">
                            <q-icon name="la la-plus-square" size="28px" />
                        </div>
                        <div v-else>
                            <q-icon name="la la-minus-square" size="28px" />
                        </div>
                    </div>
                </div>

                <div class="clickable2 q-ml-xs q-py-sm text-green-10 text-bold" @click="selectAuthor(item.author)">
                    {{ item.name }}                            
                </div>

                <div class="q-ml-sm text-bold" style="color: #555">
                    {{ getBookCount(item) }}
                </div>                    
            </div>

            <div v-if="item.bookLoading" class="book-row row items-center">
                <q-icon class="la la-spinner icon-rotate text-blue-8" size="28px" />
                <div class="q-ml-xs">
                    Обработка...
                </div>
            </div>

            <div v-if="isExpanded(item) && item.books">
                <div v-for="book in item.books" :key="book.key" class="book-row column">
                    <!-- серия книг -->
                    <div v-if="book.type == 'series'" class="column">
                        <div class="row items-center q-mr-xs no-wrap text-grey-9">
                            <div class="row items-center clickable2 q-py-xs no-wrap" @click="expandSeries(book)">
                                <div style="min-width: 30px">
                                    <div v-if="!isExpandedSeries(book)">
                                        <q-icon name="la la-plus-square" size="28px" />
                                    </div>
                                    <div v-else>
                                        <q-icon name="la la-minus-square" size="28px" />
                                    </div>
                                </div>
                            </div>

                            <div class="clickable2 q-ml-xs q-py-sm text-bold" @click="selectSeries(book.series)">
                                Серия: {{ book.series }}
                            </div>
                        </div>

                        <div v-if="isExpandedSeries(book) && book.seriesBooks">
                            <div v-if="book.showAllBooks" class="book-row column">
                                <BookView
                                    v-for="seriesBook in book.allBooks" :key="seriesBook.id"
                                    :book="seriesBook" :genre-map="genreMap"
                                    show-author
                                    :show-read-link="showReadLink"
                                    :title-color="isFoundSeriesBook(book, seriesBook) ? 'text-blue-10' : 'text-red'"
                                    @book-event="bookEvent"
                                />
                            </div>
                            <div v-else class="book-row column">
                                <BookView 
                                    v-for="seriesBook in book.seriesBooks" :key="seriesBook.key"
                                    :book="seriesBook" :genre-map="genreMap" :show-read-link="showReadLink" @book-event="bookEvent"
                                />
                            </div>

                            <div
                                v-if="book.allBooks && book.allBooks.length != book.seriesBooks.length"
                                class="row items-center q-my-sm"
                                style="margin-left: 100px"
                            >
                                <div v-if="book.showAllBooks && book.showMore" class="row items-center q-mr-md">
                                    <i class="las la-ellipsis-h text-red" style="font-size: 40px"></i>
                                    <q-btn class="q-ml-md" color="red" style="width: 200px" dense rounded no-caps @click="showMoreSeries(book)">
                                        Показать еще (~{{ showMoreCount }})
                                    </q-btn>
                                    <q-btn class="q-ml-sm" color="red" style="width: 200px" dense rounded no-caps @click="showMoreSeries(book, true)">
                                        Показать все ({{ (book.allBooksLoaded && book.allBooksLoaded.length) || '?' }})
                                    </q-btn>
                                </div>

                                <div v-if="book.showAllBooks" class="row items-center clickable2 text-blue-10" @click="book.showAllBooks = false">
                                    <q-icon class="la la-long-arrow-alt-up" size="28px" />
                                    Только найденные книги
                                </div>
                                <div v-else class="row items-center clickable2 text-red" @click="book.showAllBooks = true">
                                    <q-icon class="la la-long-arrow-alt-down" size="28px" />
                                    Все книги серии
                                </div>
                            </div>
                        </div>
                    </div>
                    <!-- книга без серии -->
                    <BookView v-else :book="book" :genre-map="genreMap" :show-read-link="showReadLink" @book-event="bookEvent" />
                </div>

                <div v-if="isExpanded(item) && item.books && !item.books.length" class="book-row row items-center">
                    <q-icon class="la la-meh q-mr-xs" size="24px" />
                    По каждому из заданных критериев у этого автора были найдены разные книги, но нет полного совпадения                    
                </div>
            </div>

            <div v-if="isExpanded(item) && item.showMore" class="row items-center book-row q-mb-sm">
                <i class="las la-ellipsis-h text-blue-10" style="font-size: 40px"></i>
                <q-btn class="q-ml-md" color="primary" style="width: 200px" dense rounded no-caps @click="showMore(item)">
                    Показать еще (~{{ showMoreCount }})
                </q-btn>
                <q-btn class="q-ml-sm" color="primary" style="width: 200px" dense rounded no-caps @click="showMore(item, true)">
                    Показать все ({{ (item.booksLoaded && item.booksLoaded.length) || '?' }})
                </q-btn>
            </div>
        </div>
        <!-- Формирование списка конец ------------------------------------------------------------------>

        <div v-if="ready && !refreshing && !tableData.length" class="row items-center q-ml-md" style="font-size: 120%">
            <q-icon class="la la-meh q-mr-xs" size="28px" />
            Поиск не дал результатов
        </div>

        <div v-show="hiddenCount" class="row">
            <div class="q-ml-lg q-py-sm clickable2 text-red" style="font-size: 120%" @click="showHiddenHelp">
                {{ hiddenResultsMessage }}
            </div>
        </div>
    </div>
</template>

<script>
//-----------------------------------------------------------------------------
import vueComponent from '../../vueComponent.js';
import { reactive } from 'vue';

import BaseList from '../BaseList';
import BookView from '../BookView/BookView.vue';
import LoadingMessage from '../LoadingMessage/LoadingMessage.vue';

import authorBooksStorage from '../authorBooksStorage';

import * as utils from '../../../share/utils';

import _ from 'lodash';

const maxItemCount = 500;//выше этого значения показываем "Загрузка"
const showMoreCount = 100;//значение для "Показать еще"

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
        ready(newValue) {
            if (newValue)
                this.refresh();//no await
        }
    },
};
class AuthorList extends BaseList {
    _options = componentOptions;
    _props = {
        ready: Boolean,
        list: Object,
        search: Object,
        genreMap: Object,
        liberamaReady: Boolean,
    };
    
    loadingMessage = '';
    loadingMessage2 = '';

    //settings
    expanded = [];
    expandedSeries = [];

    showCounts = true;
    showRate = true;
    showGenres = true;    
    showDeleted = false;
    abCacheEnabled = true;

    //stuff
    refreshing = false;

    cachedAuthors = {};
    hiddenCount = 0;
    showMoreCount = showMoreCount;

    searchResult = {};
    tableData = [];

    created() {
        this.commit = this.$store.commit;
        this.api = this.$root.api;

        this.loadSettings();
    }

    loadSettings() {
        const settings = this.settings;

        this.expanded = _.cloneDeep(settings.expanded);
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
        return this.config.bookReadLink != '' || this.liberamaReady;
    }

    showHiddenHelp() {
        this.$root.stdDialog.alert(`
            Книги скрытых авторов помечены как удаленные. Для того, чтобы их увидеть, необходимо установить опцию "Показывать удаленные" в настройках.
        `, 'Пояснение', {iconName: 'la la-info-circle'});
    }

    scrollToTop() {
        this.$emit('listEvent', {action: 'scrollToTop'});
    }

    get hiddenResultsMessage() {
        return `+${this.hiddenCount} результат${utils.wordEnding(this.hiddenCount)} скрыт${utils.wordEnding(this.hiddenCount, 2)}`;
    }

    getBookCount(item) {
        let result = '';
        if (!this.showCounts || item.count === undefined)
            return result;

        if (item.booksLoaded) {
            let count = 0;
            for (const book of item.booksLoaded) {
                if (book.type == 'series')
                    count += book.seriesBooks.length;
                else
                    count++;
            }

            result = `${count}/${item.count}`;
        } else 
            result = `#/${item.count}`;

        return `(${result})`;
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
                if (this.liberamaReady) {
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

    isExpanded(item) {
        return this.expanded.indexOf(item.author) >= 0;
    }

    isExpandedSeries(seriesItem) {
        return this.expandedSeries.indexOf(seriesItem.key) >= 0;
    }

    isFoundSeriesBook(seriesItem, seriesBook) {
        if (!seriesItem.booksSet) {
            seriesItem.booksSet = new Set(seriesItem.seriesBooks.map(b => b.id));
        }

        return seriesItem.booksSet.has(seriesBook.id);
    }

    setSetting(name, newValue) {
        this.commit('setSettings', {[name]: _.cloneDeep(newValue)});
    }

    highlightPageScroller(query) {
        this.$emit('listEvent', {action: 'highlightPageScroller', query});
    }

    async expandAuthor(item) {
        const expanded = _.cloneDeep(this.expanded);
        const key = item.author;

        if (!this.isExpanded(item)) {
            expanded.push(key);

            await this.getBooks(item);

            if (expanded.length > 10) {
                expanded.shift();
            }

            //this.$emit('listEvent', {action: 'ignoreScroll'});
            this.setSetting('expanded', expanded);
        } else {
            const i = expanded.indexOf(key);
            if (i >= 0) {
                expanded.splice(i, 1);
                this.setSetting('expanded', expanded);
            }
        }
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

    async loadBooks(authorId) {
        try {
            let result;

            if (this.abCacheEnabled) {
                const key = `${authorId}-${this.list.inpxHash}`;
                const data = await authorBooksStorage.getData(key);
                if (data) {
                    result = JSON.parse(data);
                } else {
                    result = await this.api.getBookList(authorId);
                    await authorBooksStorage.setData(key, JSON.stringify(result));
                }
            } else {
                result = await this.api.getBookList(authorId);
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
        //асинхронно подгружаем все книги серии, блокируем повторный вызов
        if (seriesItem.allBooksLoaded === null) {
            seriesItem.allBooksLoaded = undefined;
            (async() => {
                seriesItem.allBooksLoaded = await this.loadSeriesBooks(seriesItem.series);

                if (seriesItem.allBooksLoaded) {
                    seriesItem.allBooksLoaded = seriesItem.allBooksLoaded.filter(book => (this.showDeleted || !book.del));
                    this.sortSeriesBooks(seriesItem.allBooksLoaded);
                    this.showMoreSeries(seriesItem);
                } else {
                    seriesItem.allBooksLoaded = null;
                }
            })();
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
            if (all || currentLen + showMoreCount*1.5 > item.booksLoaded.length) {
                books = item.booksLoaded;
            } else {
                books = item.booksLoaded.slice(0, currentLen + showMoreCount);
            }

            item.showMore = (books.length < item.booksLoaded.length);
            item.books = books;
        }
    }

    showMoreSeries(seriesItem, all = false) {
        if (seriesItem.allBooksLoaded) {
            const currentLen = (seriesItem.allBooks ? seriesItem.allBooks.length : 0);
            let books;
            if (all || currentLen + showMoreCount*1.5 > seriesItem.allBooksLoaded.length) {
                books = seriesItem.allBooksLoaded;
            } else {
                books = seriesItem.allBooksLoaded.slice(0, currentLen + showMoreCount);
            }

            seriesItem.showMore = (books.length < seriesItem.allBooksLoaded.length);
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

    async getBooks(item) {
        if (item.books) {
            if (item.count > maxItemCount) {
                item.bookLoading = true;
                await utils.sleep(1);//для перерисовки списка
                item.bookLoading = false;
            }
            return;
        }

        if (!this.getBooksFlag)
            this.getBooksFlag = 0;

        this.getBooksFlag++;
        if (item.count > maxItemCount)
            item.bookLoading = true;

        try {
            if (this.getBooksFlag == 1) {
                (async() => {
                    await utils.sleep(500);
                    if (this.getBooksFlag > 0)
                        this.loadingMessage2 = 'Загрузка списка книг...';
                })();
            }

            const booksToFilter = await this.loadBooks(item.key);
            const filtered = this.filterBooks(booksToFilter);

            const prepareBook = (book) => {
                return Object.assign(
                    {
                        key: book.id,
                        type: 'book',
                    },
                    book
                );
            };

            //объединение по сериям
            const books = [];
            const seriesIndex = {};
            for (const book of filtered) {
                if (book.series) {
                    let index = seriesIndex[book.series];
                    if (index === undefined) {
                        index = books.length;
                        books.push(reactive({
                            key: `${item.author}-${book.series}`,
                            type: 'series',
                            series: book.series,
                            allBooksLoaded: null,
                            allBooks: null,
                            showAllBooks: false,
                            showMore: false,

                            seriesBooks: [],
                        }));

                        seriesIndex[book.series] = index;
                    }

                    books[index].seriesBooks.push(prepareBook(book));
                } else {
                    books.push(prepareBook(book));
                }
            }

            //сортировка
            books.sort((a, b) => {
                if (a.type == 'series') {
                    return (b.type == 'series' ? a.key.localeCompare(b.key) : -1);
                } else {
                    return (b.type == 'book' ? a.title.localeCompare(b.title) : 1);
                }
            });

            //сортировка внутри серий
            for (const book of books) {
                if (book.type == 'series') {
                    this.sortSeriesBooks(book.seriesBooks);

                    //асинхронно подгрузим все книги серии, если она раскрыта
                    if (this.isExpandedSeries(book)) {
                        this.getSeriesBooks(book);//no await
                    }
                }
            }

            if (books.length == 1 && books[0].type == 'series' && !this.isExpandedSeries(books[0])) {
                this.expandSeries(books[0]);
            }

            item.booksLoaded = books;
            this.showMore(item);

            await this.$nextTick();
        } finally {
            item.bookLoading = false;
            this.getBooksFlag--;
            if (this.getBooksFlag == 0)
                this.loadingMessage2 = '';
        }
    }

    async updateTableData() {
        let result = [];

        const expandedSet = new Set(this.expanded);
        const authors = this.searchResult.author;
        if (!authors)
            return;

        let num = 0;
        this.hiddenCount = 0;
        for (const rec of authors) {
            this.cachedAuthors[rec.author] = rec;

            const count = (this.showDeleted ? rec.bookCount + rec.bookDelCount : rec.bookCount);
            if (!count) {
                this.hiddenCount++;
                continue;
            }

            const item = reactive({
                key: rec.id,
                num,
                author: rec.author,
                name: rec.author.replace(/,/g, ', '),
                count,
                booksLoaded: false,
                books: false,
                bookLoading: false,
                showMore: false,
            });
            num++;

            if (expandedSet.has(item.author)) {
                if (authors.length > 1 || item.count > maxItemCount)
                    this.getBooks(item);//no await
                else 
                    await this.getBooks(item);
            }

            result.push(item);
        }

        if (result.length == 1 && !this.isExpanded(result[0])) {
            this.expandAuthor(result[0]);
        }

        this.tableData = result;
    }

    async refresh() {
        if (!this.ready)
            return;

        //параметры запроса
        const newQuery = _.cloneDeep(this.search);
        newQuery.offset = (newQuery.page - 1)*newQuery.limit;

        if (_.isEqual(newQuery, this.prevQuery))
            return;
        this.prevQuery = newQuery;

        //оптимизация, вместо запроса к серверу, берем из кеша
        if (this.abCacheEnabled && this.search.author && this.search.author[0] == '=') {
            const authorSearch = this.search.author.substring(1);
            const author = this.cachedAuthors[authorSearch];

            if (author) {
                const key = `${author.id}-${this.list.inpxHash}`;
                let data = await authorBooksStorage.getData(key);

                if (data) {
                    this.list.queryFound = 1;
                    this.list.totalFound = 1;
                    this.searchResult = {author: [author]};
                    await this.updateTableData();
                    return;
                }
            }
        }

        this.queryExecute = newQuery;

        if (this.refreshing)
            return;

        this.refreshing = true;
        try {
            while (this.queryExecute) {
                const query = this.queryExecute;
                this.queryExecute = null;

                let inSearch = true;
                (async() => {
                    await utils.sleep(500);
                    if (inSearch)
                        this.loadingMessage = 'Поиск авторов...';
                })();

                try {
                    const result = await this.api.search(query);

                    this.list.queryFound = result.author.length;
                    this.list.totalFound = result.totalFound;
                    this.list.inpxHash = result.inpxHash;

                    this.searchResult = result;

                    await utils.sleep(1);
                    if (!this.queryExecute) {
                        await this.updateTableData();
                        this.scrollToTop();
                        this.highlightPageScroller(query);
                    }
                } catch (e) {
                    this.$root.stdDialog.alert(e.message, 'Ошибка');
                } finally {
                    inSearch = false;
                    this.loadingMessage = '';
                }
            }
        } finally {
            this.refreshing = false;
        }
    }
}

export default vueComponent(AuthorList);
//-----------------------------------------------------------------------------
</script>

<style scoped>
.clickable2 {
    cursor: pointer;
}

.odd-author {
    background-color: #e8e8e8;
}

.book-row {
    margin-left: 50px;
}
</style>
