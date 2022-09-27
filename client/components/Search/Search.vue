<template>
    <div class="root column fit" style="position: relative">
        <a ref="download" style="display: none;"></a>
        <div v-show="loadingMessage" class="fit row justify-center items-center" style="position: absolute; background-color: rgba(0, 0, 0, 0.2); z-index: 2">
            <div class="bg-white row justify-center items-center q-px-lg" style="min-width: 180px; height: 50px; border-radius: 10px; box-shadow: 2px 2px 10px #333333">
                <q-icon class="la la-spinner icon-rotate text-blue-8" size="28px" />
                <div class="q-ml-sm">
                    {{ loadingMessage }}
                </div>
            </div>
        </div>
        <div v-show="loadingMessage2" class="fit row justify-center items-center" style="position: absolute; background-color: rgba(0, 0, 0, 0.2); z-index: 1">
            <div class="bg-white row justify-center items-center q-px-lg" style="min-width: 180px; height: 50px; border-radius: 10px; box-shadow: 2px 2px 10px #333333">
                <q-icon class="la la-spinner icon-rotate text-blue-8" size="28px" />
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
                    <div class="q-px-sm q-py-xs bg-green-12 clickable2" style="border: 1px solid #aaaaaa; border-radius: 6px" @click="openReleasePage">
                        {{ projectName }}
                    </div>
                </div>
                <div class="row q-mx-md q-mb-sm items-center">
                    <q-input
                        ref="authorInput" v-model="search.author" :maxlength="5000" :debounce="inputDebounce"
                        class="bg-white q-mt-xs" style="width: 300px;" label="Автор" stack-label outlined dense clearable
                    >
                        <q-tooltip v-if="search.author" :delay="500" anchor="bottom middle" content-style="font-size: 80%" max-width="400px">
                            {{ search.author }}
                        </q-tooltip>
                    </q-input>
                    <div class="q-mx-xs" />
                    <q-input
                        v-model="search.series" :maxlength="inputMaxLength" :debounce="inputDebounce"
                        class="bg-white q-mt-xs" style="width: 200px;" label="Серия" stack-label outlined dense clearable
                    >
                        <q-tooltip v-if="search.series" :delay="500" anchor="bottom middle" content-style="font-size: 80%" max-width="400px">
                            {{ search.series }}
                        </q-tooltip>
                    </q-input>
                    <div class="q-mx-xs" />
                    <q-input
                        v-model="search.title" :maxlength="inputMaxLength" :debounce="inputDebounce"
                        class="bg-white q-mt-xs" style="width: 200px;" label="Название" stack-label outlined dense clearable
                    >
                        <q-tooltip v-if="search.title" :delay="500" anchor="bottom middle" content-style="font-size: 80%" max-width="400px">
                            {{ search.title }}
                        </q-tooltip>
                    </q-input>
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

                    <div class="q-ml-sm" style="font-weight: bold; color: #555">
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
                    <div v-for="book in item.books" :key="book._key" class="book-row column">
                        <div v-if="book._type == 'series'" class="column">
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

                                <div class="clickable2 q-ml-xs q-py-sm" style="font-weight: bold" @click="selectSeries(book.series)">
                                    Серия: {{ book.series }}
                                </div>
                            </div>

                            <div v-if="isExpandedSeries(book) && book.books" class="book-row column">
                                <BookView v-for="subbook in book.books" :key="subbook._key" :book="subbook" :genre-tree="genreTree" @book-event="bookEvent" />
                            </div>
                        </div>
                        <BookView v-else :book="book" :genre-tree="genreTree" @book-event="bookEvent" />
                    </div>
                </div>
            </div>
            <!-- Формирование списка конец ------------------------------------------------------------------>

            <div v-show="hiddenCount" class="q-ml-lg q-py-sm clickable2 text-red" style="font-size: 120%" @click="showHiddenHelp">
                {{ hiddenResultsMessage }}
            </div>

            <div class="row justify-center">
                <PageScroller v-show="pageCount > 1" v-model="search.page" :page-count="pageCount" />
            </div>
            <div v-show="pageCount <= 1" class="q-mt-lg" />
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
                <q-checkbox v-model="showGenres" size="36px" label="Показывать жанры" />
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
import BookView from './BookView/BookView.vue';

import authorBooksStorage from './authorBooksStorage';
import DivBtn from '../share/DivBtn.vue';
import Dialog from '../share/Dialog.vue';

import * as utils from '../../share/utils';
import diffUtils from '../../share/diffUtils';

import _ from 'lodash';

const maxItemCount = 500;//выше этого значения показываем "Загрузка"

const componentOptions = {
    components: {
        PageScroller,
        SelectGenreDialog,
        SelectLangDialog,
        BookView,
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
        showGenres(newValue) {
            this.setSetting('showGenres', newValue);
        },
        showDeleted(newValue) {
            this.setSetting('showDeleted', newValue);
            this.updateTableData();
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
    expandedSeries = [];
    showCounts = true;
    showGenres = true;
    showDeleted = false;
    abCacheEnabled = true;
    langDefault = '';
    limit = 20;

    //stuff
    refreshing = false;
    queryFound = -1;
    totalFound = 0;
    bookRowsOnPage = 100;
    inpxHash = '';
    genreTree = [];
    langList = [];
    genreTreeInpxHash = '';
    cachedAuthors = {};
    hiddenCount = 0;

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
        this.expandedSeries = _.cloneDeep(settings.expandedSeries);
        this.showCounts = settings.showCounts;
        this.showGenres = settings.showGenres;
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

    openReleasePage() {
        window.open('https://github.com/bookpauk/inpx-web', '_blank');
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

    showHiddenHelp() {
        this.$root.stdDialog.alert(`
            Книги этих авторов помечены как удаленные. Для того, чтобы их увидеть, необходимо установить опцию "Показывать удаленные" в настройках.
        `, 'Пояснение', {iconName: 'la la-info-circle'});
    }

    showCollectionInfo() {
        /*
          "dbConfig": {
            "inpxInfo": {
              "collection": "Flibusta Offline 2 August 2022\r\nflibusta_all_local_2022-08-02\r\n65537\r\nFlibusta. A local collection. Total: 636591 books\r\nhttp://flibusta.is/",
            },
            "stats": {
              "recsLoaded": 687063,
              "authorCount": 153364,
              "authorCountAll": 177034,
              "bookCount": 576018,
              "bookCountAll": 687063,
              "bookDelCount": 111045,
              "noAuthorBookCount": 4347,
              "titleCount": 512671,
              "seriesCount": 54472,
              "genreCount": 238,
              "langCount": 102
            },
        */      
        let info = '';  
        const inpxInfo = this.config.dbConfig.inpxInfo;
        const stat = this.config.dbConfig.stats;

        const keyStyle = 'style="display: inline-block; text-align: right; margin-right: 5px; min-width: 200px"';
        info += `<div style="min-width: 250px" />`;

        info += `
<div><div ${keyStyle}>Обработано ссылок на файлы:</div><span>${stat.bookCountAll}</span></div>
<div><div ${keyStyle}>Из них актуальных:</div><span>${stat.bookCount}</span></div>
<div><div ${keyStyle}>Помеченных как удаленные:</div><span>${stat.bookDelCount}</span></div>
<div><div ${keyStyle}>Актуальных без автора:</div><span>${stat.noAuthorBookCount}</span></div>
<br>
<div><div ${keyStyle}>Всего записей об авторах:</div><span>${stat.authorCountAll}</span></div>
<div><div ${keyStyle}>Записей без соавторов:</div><span>${stat.authorCount}</span></div>
<div><div ${keyStyle}>С соавторами:</div><span>${stat.authorCountAll- stat.authorCount}</span></div>
<br>
<div><div ${keyStyle}>Уникальных названий книг:</div><span>${stat.titleCount}</span></div>
<div><div ${keyStyle}>Уникальных серий:</div><span>${stat.seriesCount}</span></div>
<div><div ${keyStyle}>Найдено жанров:</div><span>${stat.genreCount}</span></div>
<div><div ${keyStyle}>Найдено языков:</div><span>${stat.langCount}</span></div>
`;        

        info += `
<div><hr/>
    <b>collection.info:</b>
    <pre>${inpxInfo.collection}</pre>
</div>
`;        

        this.$root.stdDialog.alert(info, 'Статистика по коллекции', {iconName: 'la la-info-circle'});
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

    get hiddenResultsMessage() {
        return `+${this.hiddenCount} результат${utils.wordEnding(this.hiddenCount)} скрыт${utils.wordEnding(this.hiddenCount, 2)}`;
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

    getBookCount(item) {
        let result = '';
        if (!this.showCounts || item.count === undefined)
            return result;

        if (item.books) {
            let count = 0;
            for (const book of item.books) {
                if (book._type == 'series')
                    count += book.books.length;
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

    async download(book, copy = false) {
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
            downFileName = `${downFileName.substring(0, 100)}.${book.ext}`;

            const bookPath = `${book.folder}/${book.file}.${book.ext}`;
            //подготовка
            const response = await this.api.getBookLink({bookPath, downFileName});
            
            const link = response.link;
            const href = `${window.location.origin}${link}`;

            if (!copy) {
                //скачивание
                const d = this.$refs.download;
                d.href = href;
                d.download = downFileName;

                d.click();
            } else {
                //копирование ссылки
                if (utils.copyTextToClipboard(href))
                    this.$root.notify.success('Ссылка успешно скопирована');
                else
                    this.$root.notify.error('Копирование ссылки не удалось');
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
            case 'titleClick':
                this.search.title = `=${event.book.title}`;
                break;
            case 'download':
                this.download(event.book);//no await
                break;
            case 'copyLink':
                this.download(event.book, true);//no await
                break;
        }
    }

    isExpanded(item) {
        return this.expanded.indexOf(item.author) >= 0;
    }

    isExpandedSeries(seriesItem) {
        return this.expandedSeries.indexOf(seriesItem._key) >= 0;
    }

    setSetting(name, newValue) {
        this.commit('setSettings', {[name]: _.cloneDeep(newValue)});
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
            limit: parseInt(query.limit, 10) || 20,
        });

        if (this.search.limit > 1000)
            this.search.limit = 1000;
    }

    updateRouteQuery() {
        this.routeUpdating = true;
        try {
            const oldQuery = this.$route.query;
            const query = _.pickBy(this.search);

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

    async expandAuthor(item) {
        const expanded = _.cloneDeep(this.expanded);
        const key = item.author;

        if (!this.isExpanded(item)) {
            expanded.push(key);

            await this.getBooks(item);

            if (expanded.length > 10) {
                expanded.shift();
            }

            this.setSetting('expanded', expanded);
            this.ignoreScroll();
        } else {
            const i = expanded.indexOf(key);
            if (i >= 0) {
                expanded.splice(i, 1);
                this.setSetting('expanded', expanded);
            }
        }
    }

    expandSeries(seriesItem) {
        const expandedSeries = _.cloneDeep(this.expandedSeries);
        const key = seriesItem._key;

        if (!this.isExpandedSeries(seriesItem)) {
            expandedSeries.push(key);

            if (expandedSeries.length > 100) {
                expandedSeries.shift();
            }

            this.setSetting('expandedSeries', expandedSeries);
            this.ignoreScroll();
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
        const s = this.search;

        const emptyFieldValue = '?';
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

            bookValue = bookValue.toLowerCase();
            searchValue = searchValue.toLowerCase();

            //особая обработка префиксов
            if (searchValue[0] == '=') {

                searchValue = searchValue.substring(1);
                return bookValue == searchValue;
            } else if (searchValue[0] == '*') {

                searchValue = searchValue.substring(1);
                return bookValue.indexOf(searchValue) >= 0;
            } else if (searchValue[0] == '#') {

                searchValue = searchValue.substring(1);
                return !bookValue || (!enru.has(bookValue[0]) && bookValue.indexOf(searchValue) >= 0);
            } else {

                return bookValue.indexOf(searchValue) == 0;
            }
        };

        return loadedBooks.filter((book) => {
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

            const loadedBooks = await this.loadBooks(item.key);

            const filtered = this.filterBooks(loadedBooks);

            const prepareBook = (book) => {
                return Object.assign(
                    {
                        _key: book.id,
                        _type: 'book',
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
                        books.push({
                            _key: `${item.author}-${book.series}`,
                            _type: 'series',
                            series: book.series,

                            books: [],
                        });

                        seriesIndex[book.series] = index;
                    }

                    books[index].books.push(prepareBook(book));
                } else {
                    books.push(prepareBook(book));
                }
            }

            //сортировка
            books.sort((a, b) => {
                if (a._type == 'series') {
                    return (b._type == 'series' ? a._key.localeCompare(b._key) : -1);
                } else {
                    return (b._type == 'book' ? a.title.localeCompare(b.title) : 1);
                }
            });

            //сортировка внутри серий
            for (const book of books) {
                if (book._type == 'series') {
                    book.books.sort((a, b) => {
                        const dserno = (a.serno || Number.MAX_VALUE) - (b.serno || Number.MAX_VALUE);
                        const dtitle = a.title.localeCompare(b.title);
                        const dext = a.ext.localeCompare(b.ext);
                        return (dserno ? dserno : (dtitle ? dtitle : dext));
                    });
                }
            }

            if (books.length == 1 && books[0]._type == 'series' && !this.isExpandedSeries(books[0])) {
                this.expandSeries(books[0]);
            }

            item.books = books;
            await this.$nextTick();
        } finally {
            item.bookLoading = false;
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
                book: false,
                bookLoading: false,
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

        this.updateRouteQuery();

        //оптимизация
        if (this.abCacheEnabled && this.search.author && this.search.author[0] == '=') {
            const authorSearch = this.search.author.substring(1);
            const author = this.cachedAuthors[authorSearch];

            if (author) {
                const key = `${author.id}-${this.inpxHash}`;
                let data = await authorBooksStorage.getData(key);

                if (data) {
                    this.queryFound = 1;
                    this.totalFound = 1;
                    this.searchResult = {author: [author]};
                    await this.updateTableData();
                    return;
                }
            }
        }

        //параметры запроса
        const offset = (this.search.page - 1)*this.search.limit;

        const newQuery = _.cloneDeep(this.search);
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
    margin-left: 70px;
}
</style>
