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

                <div v-if="isExpandedAuthor(item) && item.books && !item.books.length" class="book-row row items-center">
                    <q-icon class="la la-meh q-mr-xs" size="24px" />
                    По каждому из заданных критериев у этой серии были найдены разные книги, но нет полного совпадения                    
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

class SeriesList extends BaseList {
    /*async updateTableData() {
        let result = [];

        const expandedSet = new Set(this.expandedAuthor);
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
                if (authors.length > 1 || item.count > this.maxItemCount)
                    this.getBooks(item);//no await
                else 
                    await this.getBooks(item);
            }

            result.push(item);
        }

        if (result.length == 1 && !this.isExpandedAuthor(result[0])) {
            this.expandAuthor(result[0]);
        }

        this.tableData = result;
    }*/

    async refresh() {
        return;
        //параметры запроса
        let newQuery = _.cloneDeep(this.search);
        newQuery = newQuery.setDefaults(newQuery);
        delete newQuery.setDefaults;
        newQuery.offset = (newQuery.page - 1)*newQuery.limit;

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

export default vueComponent(SeriesList);
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
