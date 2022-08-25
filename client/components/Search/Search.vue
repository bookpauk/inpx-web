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
        <div v-show="loadingMessage2" class="fit row justify-center items-center" style="position: absolute; background-color: rgba(0, 0, 0, 0.2); z-index: 1">
            <div class="bg-white row justify-center items-center q-px-lg" style="min-width: 180px; height: 50px; border-radius: 10px; box-shadow: 2px 2px 10px #333333">
                <q-spinner color="primary" size="2em" />
                <div class="q-ml-sm">
                    {{ loadingMessage2 }}
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

            <div v-if="pageCount > 1" class="row justify-center">
                <PageScroller v-model="page" :page-count="pageCount" />
            </div>
            <div v-else class="q-my-sm" />

            <!-- Формирование списка ------------------------------------------------------------------------>
            <div v-for="item in tableData" :key="item.key" class="column" :class="{'odd-author': item.num % 2}" style="font-size: 120%">
                <div class="row items-center q-ml-md q-mr-xs no-wrap">
                    <!--div style="min-width: 35px">
                        <DivBtn v-if="tableData.length > 1" :icon-size="24" icon="la la-check-circle" @click="selectAuthor(item.author)">
                            <q-tooltip :delay="1500" anchor="bottom right" content-style="font-size: 80%">
                                Только этот автор
                            </q-tooltip>
                        </DivBtn>
                    </div-->

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

                    <div class="clickable q-ml-xs q-py-sm" style="font-weight: bold" @click="selectAuthor(item.author)">
                        {{ item.name }}                            
                    </div>

                    <div class="q-ml-sm" style="font-weight: bold">
                        {{ getBookCount(item) }}
                    </div>                    
                </div>

                <div v-if="isExpanded(item) && item.books">
                    <div v-for="book in item.books" :key="book.key" class="book-row column">
                        <div class="q-my-sm" @click="selectAuthor(book.title)">
                            {{ book.title }} {{ book.src.del }}
                        </div>
                    </div>
                </div>
            </div>
            <!-- Формирование списка конец ------------------------------------------------------------------>

            <div v-if="pageCount > 1" class="row justify-center">
                <PageScroller v-model="page" :page-count="pageCount" />
            </div>
            <div v-else class="q-my-sm" />
        </div>
    </div>
</template>

<script>
//-----------------------------------------------------------------------------
import vueComponent from '../vueComponent.js';
import { reactive } from 'vue';

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
        settings() {
            this.loadSettings();
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
            this.setSetting('limit', newValue);

            this.updatePageCount();
            this.refresh();
        },
        showDeleted(newValue) {
            this.setSetting('showDeleted', newValue);
        },
        totalFound() {
            this.updatePageCount();
        },
    },
};
class Search {
    _options = componentOptions;
    collection = '';
    projectName = '';

    loadingMessage = '';
    loadingMessage2 = '';
    page = 1;
    pageCount = 1;

    //input field consts 
    inputMaxLength = 1000;
    inputDebounce = 200;

    //search fields
    author = '';
    series = '';
    title = '';
    genre = '';
    lang = '';
    limit = 50;//settings

    //settings
    expanded = [];
    showDeleted = false;

    //stuff
    queryFound = -1;
    totalFound = 0;
    bookRowsOnPage = 100;

    limitOptions = [
        {label: '10', value: 10},
        {label: '20', value: 20},
        {label: '50', value: 50},
        {label: '100', value: 100},
        {label: '200', value: 200},
        {label: '500', value: 500},
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
        this.showDeleted = settings.showDeleted;
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

    async ignoreScroll(ms = 50) {
        this.ignoreScrolling = true;
        await utils.sleep(ms);
        this.ignoreScrolling = false;
    }

    scrollToTop() {
        this.$refs.scroller.scrollTop = 0;
        this.lastScrollTop = 0;
    }

    get foundAuthorsMessage() {
        return `Найден${utils.wordEnding(this.totalFound, 2)} ${this.totalFound} автор${utils.wordEnding(this.totalFound)}`;
    }

    updatePageCount() {
        this.pageCount = Math.ceil(this.totalFound/this.limit);
        this.pageCount = (this.pageCount < 1 ? 1 : this.pageCount);
        if (this.page > this.pageCount)
            this.page = 1;
    }

    selectAuthor(author) {
        this.author = `=${author}`;
        this.scrollToTop();
    }

    isExpanded(item) {
        return this.expanded.indexOf(item.author) >= 0;
    }

    setSetting(name, newValue) {
        const newSettings = _.cloneDeep(this.settings);
        newSettings[name] = _.cloneDeep(newValue);
        this.commit('setSettings', newSettings);
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

            this.setSetting('expanded', expanded);
            this.ignoreScroll();
        } else {
            const i = expanded.indexOf(author);
            if (i >= 0) {
                expanded.splice(i, 1);
                this.setSetting('expanded', expanded);
            }
        }
    }

    getBookCount(item) {
        let result = '';
        if (item.bookCount === undefined)
            return result;

        if (this.showDeleted) {
            result = item.bookCount + item.bookDelCount;
        } else {
            result = item.bookCount;
        }

        if (item.books && item.books.length < result)
            result = `${item.books.length}/${result}`;

        return `(${result})`;
    }

    async loadBooks(author, authorId) {
        try {
            const result = await this.api.getBookList(authorId);

            return JSON.parse(result.books);
        } catch (e) {
            this.$root.stdDialog.alert(e.message, 'Ошибка');
        }
    }

    filterBooks(loadedBooks) {
        return loadedBooks;
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
                        this.loadingMessage2 = 'Загрузка списка книг...';
                })();
            }

            const loadedBooks = await this.loadBooks(item.author, item.key);

            const filtered = this.filterBooks(loadedBooks);

            filtered.sort((a, b) => a.title.localeCompare(b.title));

            const books = [];
            for (const book of filtered) {
                books.push({key: book.id, title: book.title, src: book});
            }

            item.books = books;
        } finally {
            this.getBooksFlag--;
            if (this.getBooksFlag == 0)
                this.loadingMessage2 = '';
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
                bookCount: rec.bookCount,
                bookDelCount: rec.bookDelCount,
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
    color: blue;
    cursor: pointer;
}

.clickable2 {
    cursor: pointer;
}

.odd-author {
    background-color: #e8e8e8;
}

.book-row {
    margin-left: 100px;
}
</style>
