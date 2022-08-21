<template>
    <div class="root column fit" style="position: relative">
        <div v-show="loadingMessage" class="fit row justify-center items-center" style="position: absolute; background-color: rgba(0, 0, 0, 0.2); z-index: 2">
            <div class="bg-white row justify-center items-center q-px-lg" style="min-width: 180px; height: 50px; border-radius: 10px; box-shadow: 2px 2px 10px #333333">
                <q-spinner color="primary" size="2em" />
                <div class="q-ml-sm">
                    {{ loadingMessage }}
                </div>
            </div>
        </div>
        <div v-show="getBooksMessage" class="fit row justify-center items-center" style="position: absolute; background-color: rgba(0, 0, 0, 0.2); z-index: 1">
            <div class="bg-white row justify-center items-center q-px-lg" style="min-width: 180px; height: 50px; border-radius: 10px; box-shadow: 2px 2px 10px #333333">
                <q-spinner color="primary" size="2em" />
                <div class="q-ml-sm">
                    {{ getBooksMessage }}
                </div>
            </div>
        </div>

        <div ref="scroller" class="col fit column no-wrap" style="overflow: auto; position: relative" @scroll="onScroll">
            <div ref="toolPanel" class="tool-panel column bg-green-11" style="position: sticky; top: 0; z-index: 10;">
                <div class="header q-mx-md q-mt-xs row items-center justify-between">
                    <div class="row items-center q-mr-xs" style="font-size: 150%;">
                        <div class="q-py-xs q-px-sm bg-green-12" style="border: 1px solid #aaaaaa; border-radius: 6px">
                            {{ projectName }}
                        </div>
                        <div class="q-ml-md q-mr-xs">
                            Коллекция
                        </div>
                        <div class="clickable" @click="showCollectionInfo">
                            {{ collection }}
                        </div>
                    </div>
                    <div class="row items-center" style="font-size: 120%;">
                        <div class="q-mr-xs">
                            На странице
                        </div>
                        <q-select
                            v-model="limit" :options="limitOptions" class="bg-white"
                            dropdown-icon="la la-angle-down la-sm"
                            outlined dense emit-value map-options
                        />
                    </div>
                </div>
                <div class="row q-mx-md q-mb-sm items-center">
                    <q-input
                        ref="authorInput" v-model="author" :maxlength="5000" :debounce="inputDebounce"
                        class="bg-white q-mt-xs" style="width: 300px;" label="Автор" stack-label outlined dense clearable
                    />
                    <div class="q-mx-xs" />
                    <q-input
                        v-model="series" :maxlength="inputMaxLength" :debounce="inputDebounce"
                        class="bg-white q-mt-xs" style="width: 200px;" label="Серия" stack-label outlined dense clearable
                    />
                    <div class="q-mx-xs" />
                    <q-input
                        v-model="title" :maxlength="inputMaxLength" :debounce="inputDebounce"
                        class="bg-white q-mt-xs" style="width: 200px;" label="Название" stack-label outlined dense clearable
                    />
                    <div class="q-mx-xs" />
                    <q-input
                        v-model="genre" :maxlength="inputMaxLength" :debounce="inputDebounce"
                        class="bg-white q-mt-xs" style="width: 200px;" label="Жанр" stack-label outlined dense clearable readonly
                        @click="selectGenre"
                    />
                    <div class="q-mx-xs" />
                    <q-input
                        v-model="lang" :maxlength="inputMaxLength" :debounce="inputDebounce"
                        class="bg-white q-mt-xs" style="width: 80px;" label="Язык" stack-label outlined dense clearable readonly
                        @click="selectLang"
                    />
                    <div class="q-mx-xs" />                
                    <q-btn round dense style="height: 20px" color="grey-13" icon="la la-question" @click="showSearchHelp" />

                    <div class="q-mx-xs" />
                    <div class="row items-center q-mt-xs">
                        <div v-show="queryFound > 0">
                            {{ foundAuthorsMessage }}
                        </div>
                        <div v-show="queryFound == 0">
                            Ничего не найдено
                        </div>
                    </div>
                </div>
            </div>

            <div v-if="totalPages > 1" class="row justify-center">
                <PageScroller v-model="page" :total-pages="totalPages" />
            </div>
            <div v-else class="q-my-sm" />

            <!-- Формирование списка ------------------------------------------------------------------------>
            <div v-for="item in tableData" :key="item.key" class="column" :class="{'odd-author': item.num % 2}" style="font-size: 120%">
                <div class="row items-center q-ml-md q-mr-xs no-wrap">
                    <div style="min-width: 35px">
                        <DivBtn v-if="tableData.length > 1" :icon-size="24" icon="la la-check-circle" @click="selectAuthor(item.author)">
                            <q-tooltip :delay="1500" anchor="bottom right" content-style="font-size: 80%">
                                Только этот автор
                            </q-tooltip>
                        </DivBtn>
                    </div>

                    <div class="row items-center clickable q-py-xs no-wrap" @click="expandAuthor(item)">
                        <div style="min-width: 30px">
                            <div v-if="!isExpanded(item)">
                                <q-icon name="la la-plus-square" size="28px" />
                            </div>
                            <div v-else>
                                <q-icon name="la la-minus-square" size="28px" />
                            </div>
                        </div>
                        <div class="q-ml-xs" style="font-weight: bold">
                            {{ item.name }}                            
                        </div>

                        <div v-if="item.books" class="q-ml-sm" style="font-weight: bold">
                            ({{ item.books.length }})
                        </div>
                    </div>
                </div>

                <div v-if="isExpanded(item) && item.books">
                    {{ item.books }}
                </div>
            </div>
            <!-- Формирование списка конец ------------------------------------------------------------------>

            <div v-if="totalPages > 1" class="row justify-center">
                <PageScroller v-model="page" :total-pages="totalPages" />
            </div>
            <div v-else class="q-my-sm" />
        </div>
    </div>
</template>

<script>
//-----------------------------------------------------------------------------
import vueComponent from '../vueComponent.js';
const { reactive } = require('@vue/reactivity');

import PageScroller from './PageScroller/PageScroller.vue';
import DivBtn from '../share/DivBtn.vue';

import * as utils from '../../share/utils';

import _ from 'lodash';

const componentOptions = {
    components: {
        PageScroller,
        DivBtn
    },
    watch: {
        config() {
            this.makeTitle();
        },
        author() {
            this.refresh();
        },
        series() {
            this.refresh();
        },
        title() {
            this.refresh();
        },
        genre() {
            this.refresh();
        },
        lang() {
            this.refresh();
        },
        page() {
            this.refresh();
        },
        limit(newValue) {
            const newSettings = _.cloneDeep(this.settings);
            newSettings.limit = newValue;
            this.commit('setSettings', newSettings);

            this.updatePageCount();
            this.refresh();
        },
        totalFound() {
            this.updatePageCount();
        },
        expanded(newValue) {
            const newSettings = _.cloneDeep(this.settings);
            newSettings.expanded = _.cloneDeep(newValue);
            this.commit('setSettings', newSettings);
        },
    },
};
class Search {
    _options = componentOptions;
    collection = '';
    projectName = '';

    loadingMessage = '';
    getBooksMessage = '';
    page = 1;
    totalPages = 1;
    expanded = [];

    //input field consts 
    inputMaxLength = 1000;
    inputDebounce = 200;

    //search fields
    author = '';
    series = '';
    title = '';
    genre = '';
    lang = '';
    limit = 50;

    //stuff
    queryFound = -1;
    totalFound = 0;

    limitOptions = [
        {label: '10', value: 10},
        {label: '20', value: 20},
        {label: '50', value: 50},
        {label: '100', value: 100},
        {label: '1000', value: 1000},
    ];

    searchResult = {};
    tableData = [];

    created() {
        this.commit = this.$store.commit;

        this.loadSettings();
    }

    mounted() {
        this.api = this.$root.api;

        if (!this.$root.isMobileDevice)
            this.$refs.authorInput.focus();

        this.ready = true;
        this.refresh();//no await
    }

    loadSettings() {
        const settings = this.settings;

        this.limit = settings.limit;
        this.expanded = _.cloneDeep(settings.expanded);
    }

    get config() {
        return this.$store.state.config;
    }

    get settings() {
        return this.$store.state.settings;
    }

    makeTitle() {
        const collection = this.config.dbConfig.inpxInfo.collection.split('\n');
        this.collection = collection[0].trim();

        this.projectName = `${this.config.name} v${this.config.version}`;
    }

    showSearchHelp() {
        this.$root.stdDialog.alert(`
<p>
    Здесь должна быть подсказка<br>
</p>
            `, 'Подсказка', {iconName: 'la la-info-circle'});
    }

    showCollectionInfo() {
        this.$root.stdDialog.alert(`
<p>
    Здесь должна быть информация о коллекции<br>
</p>
            `, 'Статистика по коллекции', {iconName: 'la la-info-circle'});
    }

    selectGenre() {
        this.$root.stdDialog.alert('Выбор жанра');
    }    

    selectLang() {
        this.$root.stdDialog.alert('Выбор языка');
    }
    
    onScroll() {
        if (this.ignoreScrolling)
            return;

        const curScrollTop = this.$refs.scroller.scrollTop;
        if (!this.lastScrollTop)
            this.lastScrollTop = 0;
        if (!this.lastScrollTop2)
            this.lastScrollTop2 = 0;

        if (curScrollTop - this.lastScrollTop > 0) {
            this.$refs.toolPanel.style.position = 'relative';
            this.$refs.toolPanel.style.top = `${this.lastScrollTop2}px`;
        } else if (curScrollTop - this.lastScrollTop <= 0) {
            this.$refs.toolPanel.style.position = 'sticky';
            this.$refs.toolPanel.style.top = 0;
            this.lastScrollTop2 = curScrollTop;
        }

        this.lastScrollTop = curScrollTop;
    }

    async ignoreScroll(ms) {
        this.ignoreScrolling = true;
        await utils.sleep(ms);
        this.ignoreScrolling = false;
    }

    scrollToTop() {
        this.$refs.scroller.scrollTop = 0;
        const curScrollTop = this.$refs.scroller.scrollTop;
        this.lastScrollTop = curScrollTop;
    }

    get foundAuthorsMessage() {
        return `Найден${utils.wordEnding(this.totalFound, 2)} ${this.totalFound} автор${utils.wordEnding(this.totalFound)}`;
    }

    updatePageCount() {
        this.totalPages = Math.ceil(this.totalFound/this.limit);
        this.totalPages = (this.totalPages < 1 ? 1 : this.totalPages);
        if (this.page > this.totalPages)
            this.page = 1;
    }

    selectAuthor(author) {
        this.author = `=${author}`;
    }

    isExpanded(item) {
        return this.expanded.indexOf(item.author) >= 0;
    }

    expandAuthor(item) {
        const expanded = _.cloneDeep(this.expanded);
        const author = item.author;

        if (!this.isExpanded(item)) {
            expanded.push(author);

            this.getBooks(item);

            if (expanded.length > 10) {
                expanded.shift();
            }

            this.expanded = expanded;
            this.ignoreScroll(50);
        } else {
            const i = expanded.indexOf(author);
            if (i >= 0) {
                expanded.splice(i, 1);
                this.expanded = expanded;
            }
        }
    }

    async loadBooks(authorId) {
        try {
            const result = await this.api.getBookList(authorId);

            return result.books;
        } catch (e) {
            this.$root.stdDialog.alert(e.message, 'Ошибка');
        }
    }

    async getBooks(item) {
        if (item.books)
            return;

        if (!this.getBooksFlag)
            this.getBooksFlag = 0;

        this.getBooksFlag++;

        try {
            if (this.getBooksFlag == 1) {
                (async() => {
                    await utils.sleep(500);
                    if (this.getBooksFlag > 0)
                        this.getBooksMessage = 'Загрузка списка книг...';
                })();
            }

            item.books = await this.loadBooks(item.key);
        } finally {
            this.getBooksFlag--;
            if (this.getBooksFlag == 0)
                this.getBooksMessage = '';
        }
    }

    async updateTableData() {
        let result = [];

        const expandedSet = new Set(this.expanded);
        const authors = this.searchResult.author;

        let num = 0;
        for (const rec of authors) {
            const item = reactive({
                key: rec.id,
                num,
                author: rec.author,
                name: rec.author.replace(/,/g, ', '),
                book: false,
            });
            num++;

            if (expandedSet.has(item.author)) {
                this.getBooks(item);//no await
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

        const offset = (this.page - 1)*this.limit;

        const newQuery = {
            author: this.author,
            series: this.series,
            title: this.title,
            genre: this.genre,
            lang:  this.lang,
            limit: this.limit,
            offset,
        };

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

                    this.queryFound = result.author.length;
                    this.totalFound = result.totalFound;

                    this.searchResult = result;
                    await this.updateTableData();
                    this.scrollToTop();
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

export default vueComponent(Search);
//-----------------------------------------------------------------------------
</script>

<style scoped>
.root {
}

.tool-panel {
    border-bottom: 1px solid black;
}

.header {
    min-height: 30px;
}

.clickable {
    cursor: pointer;
}

.odd-author {
    background-color: #e7e7e7;
}
</style>
