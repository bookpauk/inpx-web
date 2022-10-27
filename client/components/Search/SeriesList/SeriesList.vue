<template>
    <div>
        <a ref="download" style="display: none;"></a>

        <LoadingMessage :message="loadingMessage" z-index="2" />
        <LoadingMessage :message="loadingMessage2" z-index="1" />

        <!-- Формирование списка ------------------------------------------------------------------------>
        <div v-for="item in tableData" :key="item.key" class="column" :class="{'odd-item': item.num % 2}" style="font-size: 120%">
            <div class="row items-center q-ml-md q-mr-xs no-wrap">
                <div class="row items-center clickable2 q-py-xs no-wrap" @click="expandSeries(item)">
                    <div style="min-width: 30px">
                        <div v-if="!isExpandedSeries(item)">
                            <q-icon name="la la-plus-square" size="28px" />
                        </div>
                        <div v-else>
                            <q-icon name="la la-minus-square" size="28px" />
                        </div>
                    </div>
                </div>

                <div class="clickable2 q-ml-xs q-py-sm text-bold" @click="selectSeries(item.series)">
                    Серия: {{ item.series }}
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

            <div v-if="isExpandedSeries(item) && item.books">
                <div v-if="item.showAllBooks" class="book-row column">
                    <BookView
                        v-for="seriesBook in item.allBooks" :key="seriesBook.id"
                        :book="seriesBook" :genre-map="genreMap"
                        show-author
                        :show-read-link="showReadLink"
                        :title-color="isFoundSeriesBook(item, seriesBook) ? 'text-blue-10' : 'text-red'"
                        @book-event="bookEvent"
                    />
                </div>
                <div v-else class="book-row column">
                    <BookView 
                        v-for="seriesBook in item.books" :key="seriesBook.key"
                        show-author
                        :book="seriesBook" :genre-map="genreMap" :show-read-link="showReadLink" @book-event="bookEvent"
                    />
                </div>

                <!--div v-if="!item.showAllBooks && isExpandedSeries(item) && item.books && !item.books.length" class="book-row row items-center">
                    <q-icon class="la la-meh q-mr-xs" size="24px" />
                    Возможно у этой серии были найдены книги, помеченные как удаленные, но подходящие по критериям
                </div-->

                <div
                    v-if="item.allBooksLoaded && item.allBooksLoaded.length != item.booksLoaded.length"
                    class="row items-center q-my-sm"
                    style="margin-left: 100px"
                >
                    <div v-if="item.showAllBooks && item.showMoreAll" class="row items-center q-mr-md">
                        <i class="las la-ellipsis-h text-red" style="font-size: 40px"></i>
                        <q-btn class="q-ml-md" color="red" style="width: 200px" dense rounded no-caps @click="showMoreAll(item)">
                            Показать еще (~{{ showMoreCount }})
                        </q-btn>
                        <q-btn class="q-ml-sm" color="red" style="width: 200px" dense rounded no-caps @click="showMoreAll(item, true)">
                            Показать все ({{ (item.allBooksLoaded && item.allBooksLoaded.length) || '?' }})
                        </q-btn>
                    </div>

                    <div v-if="item.showAllBooks" class="row items-center clickable2 text-blue-10" @click="item.showAllBooks = false">
                        <q-icon class="la la-long-arrow-alt-up" size="28px" />
                        Только найденные книги
                    </div>
                    <div v-else class="row items-center clickable2 text-red" @click="item.showAllBooks = true">
                        <q-icon class="la la-long-arrow-alt-down" size="28px" />
                        Все книги серии
                    </div>
                </div>
            </div>

            <div v-if="isExpandedSeries(item) && item.showMore" class="row items-center book-row q-mb-sm">
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

import * as utils from '../../../share/utils';

import _ from 'lodash';

class SeriesList extends BaseList {
    get foundCountMessage() {
        return `${this.list.totalFound} сери${utils.wordEnding(this.list.totalFound, 1)} найден${utils.wordEnding(this.list.totalFound, 4)}`;
    }

    isFoundSeriesBook(seriesItem, seriesBook) {
        if (!seriesItem.booksSet) {
            seriesItem.booksSet = new Set(seriesItem.books.map(b => b.id));
        }

        return seriesItem.booksSet.has(seriesBook.id);
    }

    getBookCount(item) {
        let result = '';
        if (!this.showCounts || item.count === undefined)
            return result;

        if (item.books) {
            result = `${item.books.length}/${item.count}`;
        } else 
            result = `#/${item.count}`;

        return `(${result})`;
    }

    async getSeriesBooks(seriesItem) {
        if (seriesItem.count > this.maxItemCount) {
            seriesItem.bookLoading = true;
            await this.$nextTick();
        }

        try {
            await super.getSeriesBooks(seriesItem);

            if (seriesItem.allBooksLoaded) {
                const prepareBook = (book) => {
                    return Object.assign(
                        {
                            key: book.id,
                            type: 'book',
                        },
                        book
                    );
                };

                const filtered = this.filterBooks(seriesItem.allBooksLoaded);

                //объединение по сериям
                const books = [];
                for (const book of filtered) {
                    books.push(prepareBook(book));
                }

                seriesItem.booksLoaded = books;
                this.showMore(seriesItem);
            }
        } finally {
            seriesItem.bookLoading = false;
        }
    }

    async updateTableData() {
        let result = [];

        const expandedSet = new Set(this.expandedSeries);
        const series = this.searchResult.series;
        if (!series)
            return;

        let num = 0;
        for (const rec of series) {
            const count = (this.showDeleted ? rec.bookCount + rec.bookDelCount : rec.bookCount);

            const item = reactive({
                key: rec.series,
                series: rec.series,
                num,
                count,
                bookLoading: false,

                allBooksLoaded: false,
                allBooks: false,
                showAllBooks: false,
                showMoreAll: false,

                booksLoaded: false,
                books: false,
                showMore: false,
            });
            num++;

            if (expandedSet.has(item.series)) {
                if (series.length > 1 || item.count > this.maxItemCount)
                    this.getSeriesBooks(item);//no await
                else 
                    await this.getSeriesBooks(item);
            }

            result.push(item);
        }

        if (result.length == 1 && !this.isExpandedSeries(result[0])) {
            this.expandSeries(result[0]);
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
                    const result = await this.api.seriesSearch(query);

                    this.list.queryFound = result.series.length;
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

export default vueComponent(SeriesList);
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
