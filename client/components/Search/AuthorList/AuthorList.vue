<template>
    <div>
        <a ref="download" style="display: none;"></a>

        <LoadingMessage :message="loadingMessage" z-index="2" />
        <LoadingMessage :message="loadingMessage2" z-index="1" />

        <!-- Формирование списка ------------------------------------------------------------------------>
        <div v-for="item in tableData" :key="item.key" class="column" :class="{'odd-item': item.num % 2}" style="font-size: 120%">
            <div class="row items-center q-ml-md q-mr-xs no-wrap">
                <div class="row items-center clickable2 q-py-xs no-wrap" @click="expandAuthor(item)">
                    <div style="min-width: 30px">
                        <div v-if="!isExpandedAuthor(item)">
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

            <div v-if="isExpandedAuthor(item) && item.books">
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
                                v-if="book.allBooksLoaded && book.allBooksLoaded.length != book.seriesBooks.length"
                                class="row items-center q-my-sm"
                                style="margin-left: 100px"
                            >
                                <div v-if="book.showAllBooks && book.showMoreAll" class="row items-center q-mr-md">
                                    <i class="las la-ellipsis-h text-red" style="font-size: 40px"></i>
                                    <q-btn class="q-ml-md" color="red" style="width: 200px" dense rounded no-caps @click="showMoreAll(book)">
                                        Показать еще (~{{ showMoreCount }})
                                    </q-btn>
                                    <q-btn class="q-ml-sm" color="red" style="width: 200px" dense rounded no-caps @click="showMoreAll(book, true)">
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

                <div v-if="isExpandedAuthor(item) && item.books && !item.books.length" class="book-row row items-center">
                    <q-icon class="la la-meh q-mr-xs" size="24px" />
                    По каждому из заданных критериев у этого автора были найдены разные книги, но нет полного совпадения
                </div>
            </div>

            <div v-if="isExpandedAuthor(item) && item.showMore" class="row items-center book-row q-mb-sm">
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

        <div v-if="!refreshing && !tableData.length" class="row items-center q-ml-md" style="font-size: 120%">
            <q-icon class="la la-meh q-mr-xs" size="28px" />
            Поиск не дал результатов
        </div>
    </div>
</template>

<script>
//-----------------------------------------------------------------------------
import vueComponent from '../../vueComponent.js';
import { reactive } from 'vue';

import BaseList from '../BaseList';

import authorBooksStorage from '../authorBooksStorage';

import * as utils from '../../../share/utils';

import _ from 'lodash';

class AuthorList extends BaseList {
    cachedAuthors = {};

    showHiddenHelp() {
        this.$root.stdDialog.alert(`
            Книги скрытых авторов помечены как удаленные. Для того, чтобы их увидеть, необходимо установить опцию "Показывать удаленные" в настройках.
        `, 'Пояснение', {iconName: 'la la-info-circle'});
    }

    get foundCountMessage() {
        return `${this.list.totalFound} автор${utils.wordEnding(this.list.totalFound)}`;
    }    

    isFoundSeriesBook(seriesItem, seriesBook) {
        if (!seriesItem.booksSet) {
            seriesItem.booksSet = new Set(seriesItem.seriesBooks.map(b => b.id));
        }

        return seriesItem.booksSet.has(seriesBook.id);
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

    async expandAuthor(item) {
        const expanded = _.cloneDeep(this.expandedAuthor);
        const key = item.author;

        if (!this.isExpandedAuthor(item)) {
            expanded.push(key);

            await this.getAuthorBooks(item);

            if (expanded.length > 10) {
                expanded.shift();
            }

            //this.$emit('listEvent', {action: 'ignoreScroll'});
            this.setSetting('expandedAuthor', expanded);
        } else {
            const i = expanded.indexOf(key);
            if (i >= 0) {
                expanded.splice(i, 1);
                this.setSetting('expandedAuthor', expanded);
            }
        }
    }

    async getAuthorBooks(item) {
        if (item.books) {
            if (item.count > this.maxItemCount) {
                item.bookLoading = true;
                await utils.sleep(1);//для перерисовки списка
                item.bookLoading = false;
            }
            return;
        }

        if (!this.getBooksFlag)
            this.getBooksFlag = 0;

        this.getBooksFlag++;
        if (item.count > this.maxItemCount)
            item.bookLoading = true;

        try {
            if (this.getBooksFlag == 1) {
                (async() => {
                    await utils.sleep(500);
                    if (this.getBooksFlag > 0)
                        this.loadingMessage2 = 'Загрузка списка книг...';
                })();
            }

            const booksToFilter = await this.loadAuthorBooks(item.key);
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
                            key: book.series,
                            type: 'series',
                            series: book.series,
                            allBooksLoaded: false,
                            allBooks: false,
                            showAllBooks: false,
                            showMoreAll: false,

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

        const expandedSet = new Set(this.expandedAuthor);
        const authors = this.searchResult.author;
        if (!authors)
            return;

        let num = 0;
        for (const rec of authors) {
            this.cachedAuthors[rec.author] = rec;

            const count = (this.showDeleted ? rec.bookCount + rec.bookDelCount : rec.bookCount);

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
                if (authors.length > 1 || item.count > this.maxItemCount)
                    this.getAuthorBooks(item);//no await
                else 
                    await this.getAuthorBooks(item);
            }

            result.push(item);
        }

        if (result.length == 1 && !this.isExpandedAuthor(result[0])) {
            this.expandAuthor(result[0]);
        }

        this.tableData = result;
    }

    async refresh() {
        //параметры запроса
        let newQuery = _.cloneDeep(this.search);
        newQuery = newQuery.setDefaults(newQuery);
        delete newQuery.setDefaults;
        newQuery.offset = (newQuery.page - 1)*newQuery.limit;
        if (!this.showDeleted)
            newQuery.del = 0;

        if (_.isEqual(newQuery, this.prevQuery))
            return;
        this.prevQuery = newQuery;

        //оптимизация, вместо запроса к серверу, берем из кеша
        if (this.abCacheEnabled && this.search.author && this.search.author[0] == '=') {
            const authorSearch = this.search.author.substring(1);
            const author = this.cachedAuthors[authorSearch];

            if (author) {
                const key = `author-${author.id}-${this.list.inpxHash}`;
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

        (async() => {
            await utils.sleep(500);
            if (this.refreshing)
                this.loadingMessage = 'Поиск серий...';
        })();

        try {
            while (this.queryExecute) {
                const query = this.queryExecute;
                this.queryExecute = null;

                try {
                    const result = await this.api.authorSearch(query);

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
                }
            }
        } finally {
            this.refreshing = false;
            this.loadingMessage = '';
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

.odd-item {
    background-color: #e8e8e8;
}

.book-row {
    margin-left: 50px;
}
</style>
