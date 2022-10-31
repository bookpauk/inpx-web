<template>
    <div class="root column fit" style="position: relative">
        <div ref="scroller" class="col fit column no-wrap" style="overflow: auto; position: relative" @scroll="onScroll">
            <div ref="toolPanel" class="tool-panel q-pb-xs column bg-cyan-2" style="position: sticky; top: 0; z-index: 10;">
                <div class="header q-mx-md q-mb-xs q-mt-sm row items-center">
                    <a :href="newSearchLink" style="height: 33px">
                        <img src="./assets/logo.png" />
                        <q-tooltip :delay="1500" anchor="bottom middle" content-style="font-size: 80%" max-width="400px">
                            Новый поиск
                        </q-tooltip>
                    </a>
                    <div class="row items-center q-ml-sm" style="font-size: 150%;">
                        <div class="q-mr-xs">
                            Коллекция
                        </div>
                        <div class="clickable" @click="showCollectionInfo">
                            {{ collection }}
                        </div>
                    </div>
                    
                    <q-btn-toggle
                        v-if="extendedSearch"
                        v-model="selectedList"
                        class="q-ml-md"
                        toggle-color="primary"
                        :options="listOptions"
                        push
                        no-caps
                        rounded
                    />

                    <DivBtn class="q-ml-md text-white bg-secondary" :size="30" :icon-size="24" :imt="1" icon="la la-cog" round @click="settingsDialogVisible = true">
                        <template #tooltip>
                            <q-tooltip :delay="1500" anchor="bottom middle" content-style="font-size: 80%" max-width="400px">
                                Настройки
                            </q-tooltip>
                        </template>
                    </DivBtn>

                    <DivBtn class="q-ml-sm text-white bg-secondary" :size="30" :icon-size="24" icon="la la-question" round @click="showSearchHelp">
                        <template #tooltip>
                            <q-tooltip :delay="1500" anchor="bottom middle" content-style="font-size: 80%" max-width="400px">
                                Памятка
                            </q-tooltip>
                        </template>
                    </DivBtn>

                    <div class="col"></div>
                    <div class="q-px-sm q-py-xs bg-green-12 clickable2" style="border: 1px solid #aaaaaa; border-radius: 6px" @click="openReleasePage">
                        {{ projectName }}
                    </div>
                </div>
                <div class="row q-mx-md q-mb-xs items-center">
                    <q-input
                        ref="authorInput" v-model="search.author" :maxlength="5000" :debounce="inputDebounce"
                        class="q-mt-xs" :bg-color="inputBgColor('author')" style="width: 200px;" label="Автор" stack-label outlined dense clearable
                    >
                        <q-tooltip v-if="search.author" :delay="500" anchor="bottom middle" content-style="font-size: 80%" max-width="400px">
                            {{ search.author }}
                        </q-tooltip>
                    </q-input>
                    <div class="q-mx-xs" />
                    <q-input
                        v-model="search.series" :maxlength="inputMaxLength" :debounce="inputDebounce"
                        class="q-mt-xs" :bg-color="inputBgColor('series')" style="width: 200px;" label="Серия" stack-label outlined dense clearable
                    >
                        <q-tooltip v-if="search.series" :delay="500" anchor="bottom middle" content-style="font-size: 80%" max-width="400px">
                            {{ search.series }}
                        </q-tooltip>
                    </q-input>
                    <div class="q-mx-xs" />
                    <q-input
                        v-model="search.title" :maxlength="inputMaxLength" :debounce="inputDebounce"
                        class="q-mt-xs" :bg-color="inputBgColor('title')" style="width: 200px;" label="Название" stack-label outlined dense clearable
                    >
                        <q-tooltip v-if="search.title" :delay="500" anchor="bottom middle" content-style="font-size: 80%" max-width="400px">
                            {{ search.title }}
                        </q-tooltip>
                    </q-input>
                    <div class="q-mx-xs" />
                    <q-input
                        v-model="search.lang" :maxlength="inputMaxLength" :debounce="inputDebounce"
                        class="q-mt-xs" :bg-color="inputBgColor()" input-style="cursor: pointer" style="width: 100px;" label="Язык" stack-label outlined dense clearable readonly
                        @click="selectLang"
                    >
                        <template v-if="search.lang" #append>
                            <q-icon name="la la-times-circle" class="q-field__focusable-action" @click.stop.prevent="search.lang = ''" />
                        </template>

                        <q-tooltip v-if="search.lang && showTooltips" :delay="500" anchor="bottom middle" content-style="font-size: 80%" max-width="400px">
                            {{ search.lang }}
                        </q-tooltip>
                    </q-input>

                    <div class="q-mx-xs" />
                    <DivBtn
                        class="text-grey-5 bg-yellow-1 q-mt-xs" :size="34" :icon-size="24" round
                        :icon="(extendedParams ? 'la la-angle-double-up' : 'la la-angle-double-down')"
                        @click="extendedParams = !extendedParams"
                    >
                        <template #tooltip>
                            <q-tooltip :delay="1500" anchor="bottom middle" content-style="font-size: 80%" max-width="400px">
                                {{ `${(extendedParams ? 'Скрыть' : 'Показать')} дополнительные критерии поиска` }}
                            </q-tooltip>
                        </template>
                    </DivBtn>
                </div>
                <div v-show="extendedParams" class="row q-mx-md q-mb-xs items-center">
                    <q-input
                        v-model="genreNames" :maxlength="inputMaxLength" :debounce="inputDebounce"
                        class="q-mt-xs" :bg-color="inputBgColor()" input-style="cursor: pointer" style="width: 200px;" label="Жанр" stack-label outlined dense clearable readonly
                        @click="selectGenre"
                    >
                        <template v-if="genreNames" #append>
                            <q-icon name="la la-times-circle" class="q-field__focusable-action" @click.stop.prevent="search.genre = ''" />
                        </template>

                        <q-tooltip v-if="genreNames && showTooltips" :delay="500" anchor="bottom middle" content-style="font-size: 80%" max-width="400px">
                            {{ genreNames }}
                        </q-tooltip>
                    </q-input>

                    <div class="q-mx-xs" />
                    <q-input
                        v-model="search.date" :maxlength="inputMaxLength" :debounce="inputDebounce"
                        class="q-mt-xs" :bg-color="inputBgColor()" input-style="cursor: pointer" style="width: 200px;" label="Дата поступления" stack-label outlined dense clearable
                    >
                        <q-tooltip v-if="search.date && showTooltips" :delay="500" anchor="bottom middle" content-style="font-size: 80%" max-width="400px">
                            {{ search.date }}
                        </q-tooltip>
                    </q-input>

                    <div class="q-mx-xs" />
                    <q-input
                        v-model="librateNames" :maxlength="inputMaxLength" :debounce="inputDebounce"
                        class="q-mt-xs" :bg-color="inputBgColor()" input-style="cursor: pointer" style="width: 100px;" label="Оценка" stack-label outlined dense clearable readonly
                        @click="selectLibRate"
                    >
                        <template v-if="librateNames" #append>
                            <q-icon name="la la-times-circle" class="q-field__focusable-action" @click.stop.prevent="search.librate = ''" />
                        </template>

                        <q-tooltip v-if="librateNames && showTooltips" :delay="500" anchor="bottom middle" content-style="font-size: 80%" max-width="400px">
                            {{ librateNames }}
                        </q-tooltip>
                    </q-input>
                </div>
                <div v-show="!extendedParams && extendedParamsMessage" class="row q-mx-md items-center clickable" @click="extendedParams = true">
                    +{{ extendedParamsMessage }}
                </div>
            </div>

            <div class="row items-center q-ml-lg q-mt-sm">
                <div style="width: 400px; height: 50px">
                    <PageScroller v-show="pageCount > 1" ref="pageScroller1" v-model="search.page" :page-count="pageCount" />
                </div>

                <div v-show="list.totalFound > 0" class="text-bold" style="font-size: 120%; padding-bottom: 2px">
                    {{ foundCountMessage }}
                </div>
            </div>

            <!-- Формирование списка ------------------------------------------------------------------------>
            <div v-if="selectedListComponent">
                <div class="separator" />
                <component :is="selectedListComponent" ref="list" :list="list" :search="search" :genre-map="genreMap" @list-event="listEvent" />
                <div class="separator" />
            </div>
            <!-- Формирование списка конец ------------------------------------------------------------------>

            <div class="row q-ml-lg q-mb-sm">
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
                <q-checkbox v-model="showRates" size="36px" label="Показывать оценки" />
                <q-checkbox v-model="showGenres" size="36px" label="Показывать жанры" />
                <q-checkbox v-model="showDates" size="36px" label="Показывать даты поступления" />
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
        <SelectLibRateDialog v-model="selectLibRateDialogVisible" v-model:librate="search.librate" />
    </div>
</template>

<script>
//-----------------------------------------------------------------------------
import vueComponent from '../vueComponent.js';

import AuthorList from './AuthorList/AuthorList.vue';
import SeriesList from './SeriesList/SeriesList.vue';
import TitleList from './TitleList/TitleList.vue';

import PageScroller from './PageScroller/PageScroller.vue';
import SelectGenreDialog from './SelectGenreDialog/SelectGenreDialog.vue';
import SelectLangDialog from './SelectLangDialog/SelectLangDialog.vue';
import SelectLibRateDialog from './SelectLibRateDialog/SelectLibRateDialog.vue';

import authorBooksStorage from './authorBooksStorage';
import DivBtn from '../share/DivBtn.vue';
import Dialog from '../share/Dialog.vue';

import * as utils from '../../share/utils';
import diffUtils from '../../share/diffUtils';

import _ from 'lodash';

const route2component = {
    'author': {component: 'AuthorList', label: 'Авторы'},
    'series': {component: 'SeriesList', label: 'Серии'},
    'title': {component: 'TitleList', label: 'Книги'},
};

const componentOptions = {
    components: {
        AuthorList,
        SeriesList,
        TitleList,
        PageScroller,
        SelectGenreDialog,
        SelectLangDialog,
        SelectLibRateDialog,
        Dialog,
        DivBtn
    },
    watch: {
        config(newValue) {
            this.makeProjectName();
            if (newValue.dbConfig)
                this.list.inpxHash = newValue.dbConfig.inpxHash;
        },
        settings() {
            this.loadSettings();
        },
        search: {
            handler(newValue) {
                this.limit = newValue.limit;

                if (this.pageCount > 1)
                    this.prevPage = this.search.page;

                this.makeTitle();
                this.updateRouteQueryFromSearch();
            },
            deep: true,
        },
        extendedParams(newValue) {
            this.setSetting('extendedParams', newValue);
        },
        limit(newValue) {
            this.setSetting('limit', newValue);

            this.updatePageCount();
        },
        showCounts(newValue) {
            this.setSetting('showCounts', newValue);
        },
        showRates(newValue) {
            this.setSetting('showRates', newValue);
        },
        showGenres(newValue) {
            this.setSetting('showGenres', newValue);
        },
        showDates(newValue) {
            this.setSetting('showDates', newValue);
        },
        showDeleted(newValue) {
            this.setSetting('showDeleted', newValue);
        },
        abCacheEnabled(newValue) {
            this.setSetting('abCacheEnabled', newValue);
        },
        $route(to) {
            this.updateListFromRoute(to);
            this.updateSearchFromRouteQuery(to);
        },
        langDefault() {
            this.updateSearchFromRouteQuery(this.$route);
        },
        list: {
            handler(newValue) {
                this.updateGenreTreeIfNeeded();

                if (this.prevList.totalFound != newValue.totalFound) {
                    this.updatePageCount();
                    if (this.$refs.list)
                        this.foundCountMessage = this.$refs.list.foundCountMessage;
                    else
                        this.foundCountMessage = '';
                }

                this.prevList = _.cloneDeep(newValue);
            },
            deep: true,
        },
        selectedList(newValue) {
            this.selectedListComponent = (route2component[newValue] ? route2component[newValue].component : null);
            this.pageCount = 1;
            this.list.totalFound = 0;

            if (this.getListRoute() != newValue) {
                this.updateRouteQueryFromSearch();
            }
        }
    },
};
class Search {
    _options = componentOptions;
    
    ready = false;

    selectedList = '';
    selectedListComponent = '';

    collection = '';
    projectName = '';

    foundCountMessage = '';

    settingsDialogVisible = false;
    selectGenreDialogVisible = false;
    selectLangDialogVisible = false;
    selectLibRateDialogVisible = false;

    pageCount = 1;    

    //input field consts 
    inputMaxLength = 1000;
    inputDebounce = 200;

    //search fields
    search = {
        setDefaults(search) {
            return Object.assign({}, search, {
                author: search.author || '',
                series: search.series || '',
                title: search.title || '',
                genre: search.genre || '',
                lang: search.lang || '',
                date: search.date || '',
                librate: search.librate || '',
                page: search.page || 1,
                limit: search.limit || 50,
            });
        },
    };

    //settings
    showCounts = true;
    showRates = true;
    showGenres = true;
    showDates = true;
    showDeleted = false;
    abCacheEnabled = true;
    langDefault = '';
    limit = 20;
    extendedParams = false;

    //stuff
    prevList = {};
    list = {
        queryFound: -1,
        totalFound: -1,
        inpxHash: '',
        liberamaReady: false,
    };

    genreTree = [];
    genreMap = new Map();
    langList = [];
    genreTreeInpxHash = '';
    showTooltips = true;

    limitOptions = [
        {label: '10', value: 10},
        {label: '20', value: 20},
        {label: '50', value: 50},
        {label: '100', value: 100},
        {label: '200', value: 200},
        {label: '500', value: 500},
        {label: '1000', value: 1000},
    ];

    created() {
        this.commit = this.$store.commit;
        this.api = this.$root.api;

        this.search = this.search.setDefaults(this.search);
        this.search.lang = this.langDefault;

        this.loadSettings();
    }

    mounted() {
        (async() => {
            //для встраивания в liberama
            window.addEventListener('message', (event) => {
                if (!_.isObject(event.data) || event.data.from != 'ExternalLibs')
                    return;

                //console.log(event);

                this.recvMessage(event.data);
            });

            //локальный кеш
            await authorBooksStorage.init();

            if (!this.$root.isMobileDevice)
                this.$refs.authorInput.focus();

            this.updateListFromRoute(this.$route);
            this.updateSearchFromRouteQuery(this.$route);

            this.sendMessage({type: 'mes', data: 'hello-from-inpx-web'});

            this.ready = true;
        })();
    }

    loadSettings() {
        const settings = this.settings;

        this.search.limit = settings.limit;

        this.extendedParams = settings.extendedParams;
        this.expanded = _.cloneDeep(settings.expanded);
        this.expandedSeries = _.cloneDeep(settings.expandedSeries);
        this.showCounts = settings.showCounts;
        this.showRates = settings.showRates;
        this.showGenres = settings.showGenres;
        this.showDates = settings.showDates;
        this.showDeleted = settings.showDeleted;
        this.abCacheEnabled = settings.abCacheEnabled;
        this.langDefault = settings.langDefault;
    }

    recvMessage(d) {
        if (d.type == 'mes') {
            switch(d.data) {
                case 'ready':
                    this.list.liberamaReady = true;
                    this.sendMessage({type: 'mes', data: 'ready'});
                    this.sendCurrentUrl();
                    break;
            }
        }
    }

    sendMessage(d) {
        window.parent.postMessage(Object.assign({}, {from: 'inpx-web'}, d), '*');
    }

    sendCurrentUrl() {
        this.sendMessage({type: 'urlChange', data: window.location.href});
    }

    get config() {
        return this.$store.state.config;
    }

    get extendedSearch() {
        return this.config.extendedSearch;
    }

    get settings() {
        return this.$store.state.settings;
    }

    get genreNames() {
        let result = [];
        const genre = this.search.genre.split(',');

        for (const g of genre) {
            const name = this.genreMap.get(g);
            if (name)
                result.push(name);
        }

        return result.join(', ');
    }

    get librateNames() {
        let result = [];
        const rates = this.search.librate.split(',');

        for (const r of rates) {
            result.push(r == '0' ? 'Без оценки' : r);
        }

        return result.join(', ');
    }

    get listOptions() {
        const result = [];
        for (const [route, rec] of Object.entries(route2component))
            result.push({label: rec.label, value: route});
        return result;
    }

    get extendedParamsMessage() {
        const s = this.search;
        const result = [];
        result.push(s.genre ? 'Жанр' : '');
        result.push(s.date ? 'Дата поступления' : '');
        result.push(s.librate ? 'Оценка' : '');

        return result.filter(s => s).join(', ');
    }

    inputBgColor(inp) {
        if (inp === this.selectedList)
            return 'white';
        else
            return 'yellow-1';
    }

    async updateListFromRoute(to) {
        const newPath = to.path;
        let newList = this.getListRoute(newPath);
        newList = (newList && this.extendedSearch ? newList : 'author');
        if (this.selectedList != newList)
            this.selectedList = newList;
    }

    getListRoute(newPath) {
        newPath = (newPath ? newPath : this.$route.path);
        const m = newPath.match(/^\/([^/]*).*$/i);
        return (m ? m[1] : newPath);
    }

    openReleasePage() {
        window.open('https://github.com/bookpauk/inpx-web/releases', '_blank');
    }

    makeProjectName() {
        const collection = this.config.dbConfig.inpxInfo.collection.split('\n');
        this.collection = collection[0].trim();

        this.projectName = `${this.config.name} v${this.config.webAppVersion}`;
        this.makeTitle();
    }

    makeTitle() {
        if (!this.collection)
            return;

        let result = `Коллекция ${this.collection}`;

        const search = this.search;
        const specSym = new Set(['*', '#']);
        const correctValue = (v) => {
            if (v) {
                if (v[0] === '=')
                    v = v.substring(1);
                else if (!specSym.has(v[0]))
                    v = '^' + v;
            }
            return v || '';
        };

        if (search.author || search.series || search.title) {
            const as = (search.author ? search.author.split(',') : []);
            const author = (as.length ? as[0] : '') + (as.length > 1 ? ' и др.' : '');

            const a = correctValue(author);
            let s = correctValue(search.series);
            s = (s ? `(${s})` : '');
            let t = correctValue(search.title);
            t = (t ? `"${t}"` : '');

            result = [s, t].filter(v => v).join(' ');
            result = [a, result].filter(v => v).join(' ');
        }

        this.$root.setAppTitle(result);
        if (this.list.liberamaReady)
            this.sendMessage({type: 'titleChange', data: result});
    }

    showSearchHelp() {
        let info = '';  
        info += `<div style="min-width: 250px" />`;
        info += `
<p>
    Для раздела <b>Авторы</b>, работу поискового движка можно описать простой фразой: найти авторов по указанным критериям.
    По тем же критериям среди найденных авторов фильтруются книги, сортируются и группируются по сериям.
    <br><br>
    По умолчанию поисковое значение трактуется как "начинается с". Например значение автора "Пушкин"
    трактуется как: найти авторов, имя которых начинается с "Пушкин". Поиск всегда ведется без
    учета регистра - значения "Ельцин" и "ельцин" равнозначны.
    <br><br>
    В поисковых полях "Автор", "Серия", "Название" также доступны следующие префиксы:
    <ul>
        <li>
            "=" поиск по точному совпадению. Например, если задать "=Пушкин Александр Сергеевич" в поле автора,
            то будет найден в точности этот автор
        </li>
        <br>
        <li>
            "*" поиск подстроки в строке. Например, для "*Александр" в поле автора, будут найдены
            все авторы, имя которых содержит "Александр"
        </li>
        <br>
        <li>
            "#" поиск подстроки в строке, но только для тех значений, которые не начинаются ни с одной буквы русского или латинского алфавита.
            Например, значение "#поворот" в поле автора означает: найти всех авторов, имя которых начинается не с русской или латинской буквы и содержит слово "поворот".
            Указание простого "#" в поиске по названию означает: найти всех авторов, названия книг которых начинаются не с русской или латинской буквы
        </li>
        <br>
        <li>
            "?" поиск пустых значений или тех, что начинаются с этого символа. Например, "?" в поле серии означает: найти всех авторов, у которых есть книги без серий
            или название серии начинается с "?".
            Значение "?" в поле названия означает: найти всех авторов, книги которых без названия или начинаются с "?"
        </li>
    </ul>
    <br>
    Специльное имя автора "?" служит для поиска и группировки книг без автора.
    <br><br>
    Для разделов <b>Серии</b>, <b>Книги</b> все аналогично разделу <b>Авторы</b>.
</p>
`;        

        this.$root.stdDialog.alert(info, 'Памятка', {iconName: 'la la-info-circle'});
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
<div><div ${keyStyle}>Всего файлов книг:</div><span>${stat.filesCountAll}</span></div>
<div><div ${keyStyle}>Из них актуальных:</div><span>${stat.filesCount}</span></div>
<div><div ${keyStyle}>Помеченных как удаленные:</div><span>${stat.filesDelCount}</span></div>
<br>
<div><div ${keyStyle}>Обработано ссылок на файлы:</div><span>${stat.bookCountAll}</span></div>
<div><div ${keyStyle}>Из них актуальных:</div><span>${stat.bookCount}</span></div>
<div><div ${keyStyle}>Помеченных как удаленные:</div><span>${stat.bookDelCount}</span></div>
<div><div ${keyStyle}>Актуальных без автора:</div><span>${stat.noAuthorBookCount}</span></div>
<br>
<div><div ${keyStyle}>Всего имен авторов:</div><span>${stat.authorCountAll}</span></div>
<div><div ${keyStyle}>Уникальных имен без соавторов:</div><span>${stat.authorCount}</span></div>
<div><div ${keyStyle}>С соавторами:</div><span>${stat.authorCountAll- stat.authorCount}</span></div>
<br>
<div><div ${keyStyle}>Уникальных названий книг:</div><span>${stat.titleCount}</span></div>
<div><div ${keyStyle}>Уникальных названий серий:</div><span>${stat.seriesCount}</span></div>
<div><div ${keyStyle}>Найдено жанров:</div><span>${stat.genreCount}</span></div>
<div><div ${keyStyle}>Найдено языков:</div><span>${stat.langCount}</span></div>
<br>
<div><div ${keyStyle}>Версия поисковой БД:</div><span>${this.config.dbVersion}</span></div>
`;        

        info += `
<div><hr/>
    <b>collection.info:</b>
    <pre>${inpxInfo.collection}</pre>
</div>
`;        

        this.$root.stdDialog.alert(info, 'Статистика по коллекции', {iconName: 'la la-info-circle'});
    }

    get newSearchLink() {
        return window.location.origin;
    }

    async hideTooltip() {
        //Firefox bugfix: при всплывающем диалоге скрываем подсказку
        this.showTooltips = false;
        await utils.sleep(1000);
        this.showTooltips = true;
    }

    selectGenre() {
        this.hideTooltip();
        this.selectGenreDialogVisible = true;
    }    

    selectLang() {
        this.hideTooltip();
        this.selectLangDialogVisible = true;
    }

    selectLibRate() {
        this.hideTooltip();
        this.selectLibRateDialogVisible = true;
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
        } else {
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

    updatePageCount() {
        if (this.list.totalFound < 0)
            return;

        const prevPageCount = this.pageCount;

        this.pageCount = Math.ceil(this.list.totalFound/this.limit);
        this.pageCount = (this.pageCount < 1 ? 1 : this.pageCount);

        if (this.prevPage && prevPageCount == 1 && this.pageCount > 1 && this.prevPage <= this.pageCount) {
            this.search.page = this.prevPage;
        }

        if (this.search.page > this.pageCount)
            this.search.page = 1;
    }

    listEvent(event) {
        switch (event.action) {
            case 'ignoreScroll':
                this.ignoreScroll();
                break;
            case 'highlightPageScroller':
                this.highlightPageScroller(event.query);
                break;
            case 'scrollToTop':
                this.scrollToTop();
                break;
        }
    }

    setSetting(name, newValue) {
        this.commit('setSettings', {[name]: _.cloneDeep(newValue)});
    }

    highlightPageScroller(query) {
        const q = _.cloneDeep(query);
        delete q.limit;
        delete q.offset;
        delete q.page;

        try {
            if (this.search.page < 2 || !this._prevQuery || _.isEqual(this._prevQuery, q))
                return;

            this.$refs.pageScroller1.highlightScroller();
        } finally {
            this._prevQuery = q;
        }
    }

    updateSearchFromRouteQuery(to) {
        if (this.list.liberamaReady)
            this.sendCurrentUrl();

        if (this.routeUpdating)
            return;

        const query = to.query;

        this.search = this.search.setDefaults(
            Object.assign({}, this.search, {
                author: query.author,
                series: query.series,
                title: query.title,
                genre: query.genre,
                lang: (typeof(query.lang) == 'string' ? query.lang : this.langDefault),
                date: query.date,
                librate: query.librate,
                page: parseInt(query.page, 10),
                limit: parseInt(query.limit, 10) || this.search.limit,
            })
        );

        if (this.search.limit > 1000)
            this.search.limit = 1000;
    }

    updateRouteQueryFromSearch() {
        if (!this.ready)
            return;

        this.routeUpdating = true;
        try {
            const oldQuery = this.$route.query;
            const cloned = _.cloneDeep(this.search);

            delete cloned.setDefaults;

            const query = _.pickBy(cloned);

            if (this.search.lang == this.langDefault) {
                delete query.lang;
            } else {
                query.lang = this.search.lang;
            }

            const diff = diffUtils.getObjDiff(oldQuery, query);
            if (!diffUtils.isEmptyObjDiff(diff)) {
                this.$router.replace({path: this.selectedList, query});
            }
        } finally {
            (async() => {
                await utils.sleep(100);
                this.routeUpdating = false;
            })();
        }
    }

    async updateGenreTreeIfNeeded() {
        if (this.genreTreeUpdating)
            return;

        this.genreTreeUpdating = true;
        try {
            if (this.genreTreeInpxHash !== this.list.inpxHash) {
                let result;

                if (this.abCacheEnabled) {
                    const key = `genre-tree-${this.list.inpxHash}`;
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
                this.genreMap = new Map();
                for (const section of this.genreTree) {
                    for (const g of section.value)
                        this.genreMap.set(g.value, g.name);
                }

                this.langList = result.langList;
                this.genreTreeInpxHash = result.inpxHash;
            }
        } catch (e) {
            this.$root.stdDialog.alert(e.message, 'Ошибка');
        } finally {
            this.genreTreeUpdating = false;
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
    border-bottom: 1px solid #bbb;
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

.separator {
    border-bottom: 2px solid #ddd;
    margin: 5px 0 5px 0;
}
</style>
