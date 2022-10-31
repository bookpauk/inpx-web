<template>
    <div>
        <a ref="download" style="display: none;"></a>

        <LoadingMessage :message="loadingMessage" z-index="2" />
        <LoadingMessage :message="loadingMessage2" z-index="1" />

        <!-- Формирование списка ------------------------------------------------------------------------>
        <div v-for="item in tableData" :key="item.key" class="column" :class="{'odd-item': item.num % 2}" style="font-size: 120%">
            <BookView
                class="q-ml-md"
                :book="item.book" mode="title" :genre-map="genreMap" :show-read-link="showReadLink" @book-event="bookEvent"
            />
            <BookView
                v-for="book in item.books" :key="book.id"
                class="q-ml-md"
                :book="book"
                mode="title"
                :genre-map="genreMap" :show-read-link="showReadLink"
                @book-event="bookEvent"
            />
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

class TitleList extends BaseList {
    get foundCountMessage() {
        return `${this.list.totalFound} уникальн${utils.wordEnding(this.list.totalFound, 6)} назван${utils.wordEnding(this.list.totalFound, 3)}`;
    }

    async updateTableData() {
        let result = [];

        const title = this.searchResult.found;
        if (!title)
            return;

        let num = 0;
        for (const rec of title) {
            const item = reactive({
                key: rec.id,
                title: rec.title,
                num,

                book: false,
                books: [],
            });

            if (rec.books) {
                const filtered = this.filterBooks(rec.books);

                for (let i = 0; i < filtered.length; i++) {
                    if (i === 0)
                        item.book = filtered[i];
                    else
                        item.books.push(filtered[i]);                    
                }

                if (filtered.length) {
                    num++;
                    result.push(item);
                }
            }
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
                this.loadingMessage = 'Поиск книг...';
        })();

        try {
            while (this.queryExecute) {
                const query = this.queryExecute;
                this.queryExecute = null;

                try {
                    const response = await this.api.search('title', query);

                    this.list.queryFound = response.found.length;
                    this.list.totalFound = response.totalFound;
                    this.list.inpxHash = response.inpxHash;

                    this.searchResult = response;

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

export default vueComponent(TitleList);
//-----------------------------------------------------------------------------
</script>

<style scoped>
.clickable2 {
    cursor: pointer;
}

.odd-item {
    background-color: #e8e8e8;
}
</style>
