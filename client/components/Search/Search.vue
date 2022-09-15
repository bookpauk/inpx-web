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
                <div class="header q-mx-md q-mb-xs q-mt-sm row items-center">
                    <div class="row items-center" style="font-size: 150%;">
                        <div class="q-mr-xs">
                            Коллекция
                        </div>
                        <div class="clickable" @click="showCollectionInfo">
                            {{ collection }}
                        </div>
                    </div>
                    
                    <DivBtn class="q-mx-md text-white bg-secondary" :size="30" :icon-size="24" :imt="1" icon="la la-cog" round @click="settingsDialogVisible = true">
                        <q-tooltip :delay="1500" anchor="bottom middle" content-style="font-size: 80%" max-width="400px">
                            Настройки
                        </q-tooltip>
                    </DivBtn>

                    <div class="col"></div>
                    <div class="q-px-sm q-py-xs bg-green-12" style="border: 1px solid #aaaaaa; border-radius: 6px">
                        {{ projectName }}
                    </div>
                </div>
                <div class="row q-mx-md q-mb-sm items-center">
                    <q-input
                        ref="authorInput" v-model="search.author" :maxlength="5000" :debounce="inputDebounce"
                        class="bg-white q-mt-xs" style="width: 300px;" label="Автор" stack-label outlined dense clearable
                    />
                    <div class="q-mx-xs" />
                    <q-input
                        v-model="search.series" :maxlength="inputMaxLength" :debounce="inputDebounce"
                        class="bg-white q-mt-xs" style="width: 200px;" label="Серия" stack-label outlined dense clearable
                    />
                    <div class="q-mx-xs" />
                    <q-input
                        v-model="search.title" :maxlength="inputMaxLength" :debounce="inputDebounce"
                        class="bg-white q-mt-xs" style="width: 200px;" label="Название" stack-label outlined dense clearable
                    />
                    <div class="q-mx-xs" />
                    <q-input
                        v-model="genreNames" :maxlength="inputMaxLength" :debounce="inputDebounce"
                        class="bg-white q-mt-xs" input-style="cursor: pointer" style="width: 200px;" label="Жанр" stack-label outlined dense clearable readonly
                        @click="selectGenre"
                    >
                        <q-tooltip v-if="genreNames" :delay="500" anchor="bottom middle" content-style="font-size: 80%" max-width="400px">
                            {{ genreNames }}
                        </q-tooltip>
                    </q-input>
                    <div class="q-mx-xs" />
                    <q-input
                        v-model="search.lang" :maxlength="inputMaxLength" :debounce="inputDebounce"
                        class="bg-white q-mt-xs" input-style="cursor: pointer" style="width: 80px;" label="Язык" stack-label outlined dense clearable readonly
                        @click="selectLang"
                    >
                        <q-tooltip v-if="search.lang" :delay="500" anchor="bottom middle" content-style="font-size: 80%" max-width="400px">
                            {{ search.lang }}
                        </q-tooltip>
                    </q-input>

                    <div class="q-mx-xs" />
                    <DivBtn class="text-white q-mt-xs bg-grey-13" :size="30" :icon-size="24" icon="la la-broom" round @click="setDefaults">
                        <q-tooltip :delay="1500" anchor="bottom middle" content-style="font-size: 80%" max-width="400px">
                            Сбросить поиск
                        </q-tooltip>
                    </DivBtn>
                    <div class="q-mx-xs" />
                    <DivBtn class="text-white q-mt-xs bg-grey-13" :size="30" :icon-size="24" icon="la la-question" round @click="showSearchHelp">
                        <q-tooltip :delay="1500" anchor="bottom middle" content-style="font-size: 80%" max-width="400px">
                            Подсказка
                        </q-tooltip>
                    </DivBtn>

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

            <div class="row justify-center" style="min-height: 48px">
                <PageScroller v-show="pageCount > 1" v-model="search.page" :page-count="pageCount" />
            </div>

            <!-- Формирование списка ------------------------------------------------------------------------>
            <div v-for="item in tableData" :key="item.key" class="column" :class="{'odd-author': item.num % 2}" style="font-size: 120%">
                <div class="row items-center q-ml-md q-mr-xs no-wrap">
                    <!--div style="min-width: 35px">
                        <DivBtn v-if="tableData.length > 1" :icon-size="24" icon="la la-check-circle" @click="selectAuthor(item.author)">
                            <q-tooltip :delay="1500" anchor="bottom middle" content-style="font-size: 80%">
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

                    <div class="q-ml-sm" style="font-weight: bold; color: #555">
                        {{ getBookCount(item) }}
                    </div>                    
                </div>

                <div v-if="isExpanded(item) && item.books">
                    <div v-for="book in item.books" :key="book.key" class="book-row column">
                        <div class="q-my-sm" @click="selectTitle(book.title)">
                            {{ book.title }} {{ book.src.del }}
                        </div>
                        <!--div>
                            {{ item.key }} {{ book.src }}
                        </div-->
                    </div>
                </div>
            </div>
            <!-- Формирование списка конец ------------------------------------------------------------------>

            <div class="row justify-center">
                <PageScroller v-show="pageCount > 1" v-model="search.page" :page-count="pageCount" />
            </div>
        </div>

        <Dialog v-model="settingsDialogVisible">
            <template #header>
                <div class="row items-center" style="font-size: 130%">
                    <q-icon class="q-mr-sm" name="la la-cog" size="28px"></q-icon>
                    Настройки
                </div>
            </template>

            <div class="q-mx-md column" style="min-width: 300px; font-size: 120%;">
                <div class="row items-center q-ml-sm">
                    <div class="q-mr-sm">
                        Результатов на странице
                    </div>
                    <q-select
                        v-model="limit" :options="limitOptions" class="bg-white"
                        dropdown-icon="la la-angle-down la-sm"
                        outlined dense emit-value map-options
                    />
                </div>

                <q-checkbox v-model="showCounts" size="36px" label="Показывать количество" />
                <q-checkbox v-model="showDeleted" size="36px" label="Показывать удаленные" />
                <q-checkbox v-model="abCacheEnabled" size="36px" label="Кешировать запросы" />
            </div>

            <template #footer>
                <q-btn class="q-px-md q-ml-sm" color="primary" dense no-caps @click="settingsDialogVisible = false">
                    OK
                </q-btn>
            </template>
        </Dialog>

        <SelectGenreDialog v-model="selectGenreDialogVisible" v-model:genre="search.genre" :genre-tree="genreTree" />
        <SelectLangDialog v-model="selectLangDialogVisible" v-model:lang="search.lang" :lang-list="langList" :lang-default="langDefault" />        
    </div>
</template>

<script>
//-----------------------------------------------------------------------------
import vueComponent from '../vueComponent.js';
import { reactive } from 'vue';

import PageScroller from './PageScroller/PageScroller.vue';
import SelectGenreDialog from './SelectGenreDialog/SelectGenreDialog.vue';
import SelectLangDialog from './SelectLangDialog/SelectLangDialog.vue';

import authorBooksStorage from './authorBooksStorage';
import DivBtn from '../share/DivBtn.vue';
import Dialog from '../share/Dialog.vue';

import * as utils from '../../share/utils';
import diffUtils from '../../share/diffUtils';

import _ from 'lodash';

const componentOptions = {
    components: {
        PageScroller,
        SelectGenreDialog,
        SelectLangDialog,
        Dialog,
        DivBtn
    },
    watch: {
        config() {
            this.makeTitle();
        },
        settings() {
            this.loadSettings();
        },
        search: {
            handler(newValue) {
                this.limit = newValue.limit;
                this.refresh();
            },
            deep: true,
        },
        limit(newValue) {
            this.setSetting('limit', newValue);

            this.updatePageCount();
        },
        showCounts(newValue) {
            this.setSetting('showCounts', newValue);
        },
        showDeleted(newValue) {
            this.setSetting('showDeleted', newValue);
        },
        abCacheEnabled(newValue) {
            this.setSetting('abCacheEnabled', newValue);
        },
        totalFound() {
            this.updatePageCount();
        },
        $route(to) {
            this.updateQueryFromRoute(to);
        },
        langDefault() {
            this.updateQueryFromRoute(this.$route);
        },
    },
};
class Search {
    _options = componentOptions;
    collection = '';
    projectName = '';

    loadingMessage = '';
    loadingMessage2 = '';
    settingsDialogVisible = false;
    selectGenreDialogVisible = false;
    selectLangDialogVisible = false;

    pageCount = 1;

    //input field consts 
    inputMaxLength = 1000;
    inputDebounce = 200;

    //search fields
    search = {
        author: '',
        series: '',
        title: '',
        genre: '',
        lang: '',
        page: 1,
        limit: 50,
    };

    //settings
    expanded = [];
    showCounts = true;
    showDeleted = false;
    abCacheEnabled = true;
    langDefault = '';
    limit = 50;

    //stuff
    refreshing = false;
    queryFound = -1;
    totalFound = 0;
    bookRowsOnPage = 100;
    inpxHash = '';
    genreTree = [];
    langList = [];
    genreTreeInpxHash = '';

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

        /*this.refresh = _.debounce(() => {
            this.refreshDebounced();
        }, 1000);*/

        this.loadSettings();
    }

    mounted() {
        (async() => {
            await authorBooksStorage.init();

            this.api = this.$root.api;

            if (!this.$root.isMobileDevice)
                this.$refs.authorInput.focus();

            this.setDefaults();
            this.updateQueryFromRoute(this.$route);

            //чтоб не вызывался лишний refresh
            await utils.sleep(100);

            this.ready = true;
            this.refresh();//no await
        })();
    }

    loadSettings() {
        const settings = this.settings;

        this.search.limit = settings.limit;
        this.expanded = _.cloneDeep(settings.expanded);
        this.showCounts = settings.showCounts;
        this.showDeleted = settings.showDeleted;
        this.abCacheEnabled = settings.abCacheEnabled;
        this.langDefault = settings.langDefault;
    }

    get config() {
        return this.$store.state.config;
    }

    get settings() {
        return this.$store.state.settings;
    }

    get genreNames() {
        let result = [];
        const genre = new Set(this.search.genre.split(','));

        for (const section of this.genreTree) {
            for (const g of section.value)
                if (genre.has(g.value))
                    result.push(g.name);
        }

        return result.join(', ');
    }

    makeTitle() {
        const collection = this.config.dbConfig.inpxInfo.collection.split('\n');
        this.collection = collection[0].trim();

        this.projectName = `${this.config.name} v${this.config.version}`;
        this.$root.setAppTitle(`Коллекция ${this.collection}`);
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
        this.selectGenreDialogVisible = true;
    }    

    selectLang() {
        this.selectLangDialogVisible = true;
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
        const prevPageCount = this.pageCount;

        this.pageCount = Math.ceil(this.totalFound/this.limit);
        this.pageCount = (this.pageCount < 1 ? 1 : this.pageCount);

        if (this.prevPage && prevPageCount == 1 && this.pageCount > 1 && this.prevPage <= this.pageCount) {
            this.search.page = this.prevPage;
        }

        if (this.search.page > this.pageCount) {
            this.prevPage = this.search.page;
            this.search.page = 1;
        }
    }

    selectAuthor(author) {
        this.search.author = `=${author}`;
        this.scrollToTop();
    }

    selectTitle(title) {
        this.search.title = `=${title}`;
    }

    isExpanded(item) {
        return this.expanded.indexOf(item.author) >= 0;
    }

    setSetting(name, newValue) {
        this.commit('setSettings', {[name]: _.cloneDeep(newValue)});
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
        if (!this.showCounts || item.bookCount === undefined)
            return result;

        if (this.showDeleted) {
            result = item.bookCount + item.bookDelCount;
        } else {
            result = item.bookCount;
        }

        if (item.books)
            result = `${item.books.length}/${result}`;
        else 
            result = `#/${result}`;

        return `(${result})`;
    }

    async loadBooks(authorId) {
        try {
            let result;

            if (this.abCacheEnabled) {
                const key = `${authorId}-${this.inpxHash}`;
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

            const loadedBooks = await this.loadBooks(item.key);

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

    async updateGenreTreeIfNeeded() {
        try {
            if (this.genreTreeInpxHash !== this.inpxHash) {
                let result;

                if (this.abCacheEnabled) {
                    const key = `genre-tree-${this.inpxHash}`;
                    const data = await authorBooksStorage.getData(key);
                    if (data) {
                        result = JSON.parse(data);
                    } else {
                        result = await this.api.getGenreTree();

                        await authorBooksStorage.setData(key, JSON.stringify(result));
                    }
                } else {
                    result = await this.api.getGenreTree();
                }

                this.genreTree = result.genreTree;
                this.langList = result.langList;
                this.genreTreeInpxHash = result.inpxHash;
            }
        } catch (e) {
            this.$root.stdDialog.alert(e.message, 'Ошибка');
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

    setDefaults() {
        this.search = Object.assign({}, this.search, {
            author: '',
            series: '',
            title: '',
            genre: '',
            lang: this.langDefault,
        });
    }

    async updateQueryFromRoute(to) {
        if (this.routeUpdating)
            return;

        const query = to.query;

        this.search = Object.assign({}, this.search, {
            author: query.author || '',
            series: query.series || '',
            title: query.title || '',
            genre: query.genre || '',
            lang: (query.lang == 'default' ? this.langDefault : query.lang || ''),
            page: parseInt(query.page, 10) || 1,
        });
    }

    updateRouteQuery() {
        this.routeUpdating = true;
        try {
            const oldQuery = this.$route.query;
            const query = _.pickBy(this.search);
            delete query.limit;
            if (this.search.lang == this.langDefault)
                query.lang = 'default'

            const diff = diffUtils.getObjDiff(oldQuery, query);
            if (!diffUtils.isEmptyObjDiff(diff)) {
                this.$router.replace({query});
            }
        } finally {
            (async() => {
                await utils.sleep(100);
                this.routeUpdating = false;
            })();
        }
    }

    async refresh() {
        if (!this.ready)
            return;

        this.updateRouteQuery();

        const offset = (this.search.page - 1)*this.limit;

        const newQuery = _.cloneDeep(this.search);
        newQuery.limit = this.limit;
        newQuery.offset = offset;

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
                    this.inpxHash = result.inpxHash;

                    this.searchResult = result;

                    await utils.sleep(1);
                    if (!this.queryExecute) {
                        await this.updateGenreTreeIfNeeded();
                        await this.updateTableData();
                        this.scrollToTop();
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
