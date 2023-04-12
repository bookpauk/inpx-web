<template>
    <div>
        <a ref="download" style="display: none;"></a>

        <LoadingMessage :message="loadingMessage" z-index="2" />
        <LoadingMessage :message="loadingMessage2" z-index="1" />

        <!-- Формирование списка ------------------------------------------------------------------------>
        <div v-for="item in tableData" :key="item.key" class="column" :class="{'odd-item': item.num % 2}" style="font-size: 120%">
            <BookView
                class="q-ml-md"
                :book="item.book" mode="extended" :genre-map="genreMap" :show-read-link="showReadLink" @book-event="bookEvent"
            />
        </div>
        <!-- Формирование списка конец ------------------------------------------------------------------>

        <div v-if="!refreshing && (!tableData.length || error)" class="row items-center q-ml-md" style="font-size: 120%">
            <q-icon class="la la-meh q-mr-xs" size="28px" />
            {{ (error ? error : 'Поиск не дал результатов') }}
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

class ExtendedList extends BaseList {
    created() {
        super.created();
        this.isExtendedSearch = true;
    }

    get foundCountMessage() {
        return `${this.list.totalFound} ссыл${utils.wordEnding(this.list.totalFound, 5)} на файл(ы)`;
    }

    async updateTableData() {
        let result = [];

        const books = this.searchResult.found;
        if (!books)
            return;

        let num = 0;
        for (const book of books) {
            const item = reactive({
                num: num++,
                book,
            });

            result.push(item);
        }

        this.tableData = result;
    }

    async refresh() {
        //параметры запроса
        const newQuery = this.getQuery();
        if (_.isEqual(newQuery, this.prevQuery))
            return;
        this.prevQuery = newQuery;

        this.queryExecute = newQuery;

        if (this.refreshing)
            return;

        this.error = '';
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
                    const response = await this.api.bookSearch(query);

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
                    this.list.queryFound = 0;
                    this.list.totalFound = 0;
                    this.searchResult = {found: []};
                    await this.updateTableData();
                    //this.$root.stdDialog.alert(e.message, 'Ошибка');
                    this.error = `Ошибка: ${e.message}`;
                }
            }
        } finally {
            this.refreshing = false;
            this.loadingMessage = '';
        }
    }
}

export default vueComponent(ExtendedList);
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
