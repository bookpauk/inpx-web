<template>
    <div class="root column fit" style="position: relative">
        <div ref="scroller" class="col fit column no-wrap" style="overflow: auto; position: relative" @scroll="onScroll">
            <div ref="toolPanel" class="tool-panel q-pb-xs column bg-cyan-2" style="position: sticky; top: 0; z-index: 10;">
                <div class="header q-mx-md q-mb-xs q-mt-sm row items-center">
                    <a :href="newSearchLink" style="height: 33px; width: 34px">
                        <img src="./assets/logo.png" />
                        <q-tooltip :delay="1500" anchor="bottom middle" content-style="font-size: 80%" max-width="400px">
                            Новый поиск
                        </q-tooltip>
                    </a>

                    <q-btn-toggle
                        v-model="selectedList"
                        class="q-ml-sm"
                        toggle-color="primary"
                        :options="listOptions"
                        push
                        no-caps
                        rounded
                    />

                    <div class="row items-center q-ml-sm" style="font-size: 150%;">
                        <div class="q-mr-xs">
                            Коллекция
                        </div>
                        <div class="clickable" @click.stop.prevent="showCollectionInfo">
                            {{ collection }}
                        </div>
                    </div>

                    <div class="col"></div>

                    <DivBtn class="q-ml-md text-white bg-secondary" :size="30" :icon-size="24" icon="la la-question" round @click.stop.prevent="showSearchHelp">
                        <template #tooltip>
                            <q-tooltip :delay="1500" anchor="bottom middle" content-style="font-size: 80%" max-width="400px">
                                Памятка
                            </q-tooltip>
                        </template>
                    </DivBtn>

                    <DivBtn class="q-ml-sm text-white bg-secondary" :size="30" :icon-size="24" :imt="1" icon="la la-cog" round @click.stop.prevent="settingsDialogVisible = true">
                        <template #tooltip>
                            <q-tooltip :delay="1500" anchor="bottom middle" content-style="font-size: 80%" max-width="400px">
                                Настройки
                            </q-tooltip>
                        </template>
                    </DivBtn>

                    <DivBtn v-if="!config.freeAccess" class="q-ml-sm text-white bg-secondary" :size="30" :icon-size="24" :imt="1" icon="la la-sign-out-alt" round @click.stop.prevent="logout">
                        <template #tooltip>
                            <q-tooltip :delay="1500" anchor="bottom middle" content-style="font-size: 80%" max-width="400px">
                                Выход
                            </q-tooltip>
                        </template>
                    </DivBtn>
                </div>
                <div v-show="!isExtendedSearch" class="row q-mx-md q-mb-xs items-center">
                    <DivBtn
                        class="text-grey-5 bg-yellow-1 q-mt-xs" :size="30" :icon-size="24" round
                        :icon="(extendedParams ? 'la la-angle-double-up' : 'la la-angle-double-down')"
                        @click.stop.prevent="extendedParams = !extendedParams"
                    >
                        <template #tooltip>
                            <q-tooltip :delay="1500" anchor="bottom middle" content-style="font-size: 80%" max-width="400px">
                                {{ `${(extendedParams ? 'Скрыть' : 'Показать')} дополнительные критерии поиска` }}
                            </q-tooltip>
                        </template>
                    </DivBtn>
                    <div class="q-mx-xs" />
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
                        class="q-mt-xs" :bg-color="inputBgColor()" input-style="cursor: pointer" style="width: 90px;" label="Язык" stack-label outlined dense clearable readonly
                        @click.stop.prevent="selectLang"
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
                        class="text-grey-8 bg-yellow-1 q-mt-xs" :size="30" :icon-size="24" round
                        icon="la la-level-up-alt"
                        @click.stop.prevent="cloneSearch"
                    >
                        <template #tooltip>
                            <q-tooltip :delay="1500" anchor="bottom middle" content-style="font-size: 80%" max-width="400px">
                                Клонировать поиск
                            </q-tooltip>
                        </template>
                    </DivBtn>
                </div>
                <div v-show="!isExtendedSearch && extendedParams" class="row q-mx-md q-mb-xs items-center">
                    <div style="width: 30px" />
                    <div class="q-mx-xs" />
                    <q-input
                        v-model="genreNames" :maxlength="inputMaxLength" :debounce="inputDebounce"
                        class="q-mt-xs" :bg-color="inputBgColor()" input-style="cursor: pointer" style="width: 200px;" label="Жанр" stack-label outlined dense clearable readonly
                        @click.stop.prevent="selectGenre"
                    >
                        <template v-if="genreNames" #append>
                            <q-icon name="la la-times-circle" class="q-field__focusable-action" @click.stop.prevent="search.genre = ''" />
                        </template>

                        <q-tooltip v-if="genreNames && showTooltips" :delay="500" anchor="bottom middle" content-style="font-size: 80%" max-width="400px">
                            {{ genreNames }}
                        </q-tooltip>
                    </q-input>

                    <div class="q-mx-xs" />
                    <q-select 
                        v-model="searchDate"
                        class="q-mt-xs"
                        :options="searchDateOptions"
                        dropdown-icon="la la-angle-down la-sm"
                        :bg-color="inputBgColor()"
                        style="width: 200px;"
                        label="Дата поступления" stack-label
                        outlined dense emit-value map-options clearable
                    >
                        <template #selected-item="scope">
                            <div v-if="scope.opt.value == 'manual'">
                                <div v-html="formatSearchDate" />
                            </div>
                            <div v-else>
                                {{ scope.opt.label }}
                            </div>
                        </template>

                        <template #option="scope">
                            <q-item v-bind="scope.itemProps" @click.stop.prevent="dateSelectItemClick(scope.opt.value)">
                                <q-item-section>
                                    <q-item-label>
                                        {{ scope.opt.label }}
                                    </q-item-label>
                                </q-item-section>
                            </q-item>
                        </template>
                    </q-select>

                    <div class="q-mx-xs" />
                    <q-input
                        v-model="librateNames" :maxlength="inputMaxLength" :debounce="inputDebounce"
                        class="q-mt-xs" :bg-color="inputBgColor()" input-style="cursor: pointer" style="width: 90px;" label="Оценка" stack-label outlined dense clearable readonly
                        @click.stop.prevent="selectLibRate"
                    >
                        <template v-if="librateNames" #append>
                            <q-icon name="la la-times-circle" class="q-field__focusable-action" @click.stop.prevent="search.librate = ''" />
                        </template>

                        <q-tooltip v-if="librateNames && showTooltips" :delay="500" anchor="bottom middle" content-style="font-size: 80%" max-width="400px">
                            {{ librateNames }}
                        </q-tooltip>
                    </q-input>
                </div>
                <div v-show="!isExtendedSearch && !extendedParams && extendedParamsMessage" class="row q-mx-md items-center clickable" @click.stop.prevent="extendedParams = true">
                    +{{ extendedParamsMessage }}
                </div>

                <div v-show="isExtendedSearch" class="row q-mx-md q-mb-xs items-center">
                    <q-input
                        v-model="extSearchNames"
                        class="col q-mt-xs" :bg-color="inputBgColor('extended')" input-style="cursor: pointer"
                        style="min-width: 200px; max-width: 638px;" label="Расширенный поиск" stack-label outlined dense clearable readonly
                        @click.stop.prevent="selectExtSearch"
                    >
                        <template v-if="extSearchNames" #append>
                            <q-icon name="la la-times-circle" class="q-field__focusable-action" @click.stop.prevent="clearExtSearch" />
                        </template>

                        <q-tooltip v-if="extSearchNames && showTooltips" :delay="500" anchor="bottom middle" content-style="font-size: 80%" max-width="400px">
                            {{ extSearchNames }}
                        </q-tooltip>
                    </q-input>

                    <div class="q-mx-xs" />
                    <DivBtn
                        class="text-grey-8 bg-yellow-1 q-mt-xs" :size="30" round
                        :disabled="!extSearch.author"
                        @me-click="extToList('author')"
                    >
                        <div style="font-size: 130%">
                            <b>А</b>
                        </div>
                        <template #tooltip>
                            <q-tooltip :delay="1500" anchor="bottom middle" content-style="font-size: 80%" max-width="400px">
                                В раздел "Авторы" с переносом значения author={{ extSearch.author }}
                            </q-tooltip>
                        </template>
                    </DivBtn>

                    <div class="q-mx-xs" />
                    <DivBtn
                        class="text-grey-8 bg-yellow-1 q-mt-xs" :size="30" round
                        :disabled="!extSearch.series"
                        @me-click="extToList('series')"
                    >
                        <div style="font-size: 130%">
                            <b>С</b>
                        </div>
                        <template #tooltip>
                            <q-tooltip :delay="1500" anchor="bottom middle" content-style="font-size: 80%" max-width="400px">
                                В раздел "Серии" с переносом значения series={{ extSearch.series }}
                            </q-tooltip>
                        </template>
                    </DivBtn>

                    <div class="q-mx-xs" />
                    <DivBtn
                        class="text-grey-8 bg-yellow-1 q-mt-xs" :size="30" round
                        :disabled="!extSearch.title"
                        @me-click="extToList('title')"
                    >
                        <div style="font-size: 130%">
                            <b>К</b>
                        </div>
                        <template #tooltip>
                            <q-tooltip :delay="1500" anchor="bottom middle" content-style="font-size: 80%" max-width="400px">
                                В раздел "Книги" с переносом значения title={{ extSearch.title }}
                            </q-tooltip>
                        </template>
                    </DivBtn>

                    <div class="q-mx-xs" />
                    <DivBtn
                        class="text-grey-8 bg-yellow-1 q-mt-xs" :size="30" :icon-size="24" round
                        icon="la la-level-up-alt"
                        @click.stop.prevent="cloneSearch"
                    >
                        <template #tooltip>
                            <q-tooltip :delay="1500" anchor="bottom middle" content-style="font-size: 80%" max-width="400px">
                                Клонировать поиск
                            </q-tooltip>
                        </template>
                    </DivBtn>
                </div>
            </div>

            <div class="row items-center q-ml-lg q-mt-sm">
                <div style="width: 400px;">
                    <PageScroller v-show="pageCount > 1" ref="pageScroller1" v-model="search.page" :page-count="pageCount" />
                </div>

                <div v-show="list.totalFound > 0" class="text-bold" style="font-size: 120%; padding-bottom: 2px">
                    {{ foundCountMessage }}
                </div>

                <div v-show="list.totalFound > 0 && isExtendedSearch" class="q-ml-md">
                    <q-checkbox v-model="showJson" size="36px" label="Показывать JSON" />
                </div>
            </div>

            <!-- Формирование списка ------------------------------------------------------------------------>
            <div v-if="selectedListComponent">
                <div class="separator" />
                <component :is="selectedListComponent" ref="list" :list="list" :search="search" :ext-search="extSearch" :genre-map="genreMap" @list-event="listEvent" />
                <div class="separator" />
            </div>
            <!-- Формирование списка конец ------------------------------------------------------------------>

            <div class="row q-ml-lg q-mb-sm">
                <PageScroller v-show="pageCount > 1" v-model="search.page" :page-count="pageCount" />
            </div>

            <div class="row justify-center">
                <div class="q-mb-lg q-px-sm q-py-xs bg-cyan-2 clickable2" style="border: 1px solid #aaaaaa; border-radius: 6px; white-space: nowrap;" @click.stop.prevent="openReleasePage">
                    {{ projectName }}
                </div>
            </div>
        </div>

        <SettingsDialog v-model="settingsDialogVisible" />
        <SelectGenreDialog v-model="selectGenreDialogVisible" v-model:genre="search.genre" :genre-tree="genreTree" />
        <SelectLangDialog v-model="selectLangDialogVisible" v-model:lang="search.lang" :lang-list="langList" :lang-default="langDefault" />        
        <SelectLibRateDialog v-model="selectLibRateDialogVisible" v-model:librate="search.librate" />
        <SelectDateDialog v-model="selectDateDialogVisible" v-model:date="search.date" />
        <BookInfoDialog v-model="bookInfoDialogVisible" :book-info="bookInfo" />
        <SelectExtSearchDialog v-model="selectExtSearchDialogVisible" v-model:ext-search="extSearch" />        
    </div>
</template>

<script>
//-----------------------------------------------------------------------------
import vueComponent from '../vueComponent.js';

import AuthorList from './AuthorList/AuthorList.vue';
import SeriesList from './SeriesList/SeriesList.vue';
import TitleList from './TitleList/TitleList.vue';
import ExtendedList from './ExtendedList/ExtendedList.vue';

import PageScroller from './PageScroller/PageScroller.vue';
import SettingsDialog from './SettingsDialog/SettingsDialog.vue';
import SelectGenreDialog from './SelectGenreDialog/SelectGenreDialog.vue';
import SelectLangDialog from './SelectLangDialog/SelectLangDialog.vue';
import SelectLibRateDialog from './SelectLibRateDialog/SelectLibRateDialog.vue';
import SelectDateDialog from './SelectDateDialog/SelectDateDialog.vue';
import BookInfoDialog from './BookInfoDialog/BookInfoDialog.vue';
import SelectExtSearchDialog from './SelectExtSearchDialog/SelectExtSearchDialog.vue';

import authorBooksStorage from './authorBooksStorage';
import DivBtn from '../share/DivBtn.vue';
import Dialog from '../share/Dialog.vue';

import * as utils from '../../share/utils';
import diffUtils from '../../share/diffUtils';

import _ from 'lodash';

const maxLimit = 1000;

const route2component = {
    'author': {component: 'AuthorList', label: 'Авторы'},
    'series': {component: 'SeriesList', label: 'Серии'},
    'title': {component: 'TitleList', label: 'Книги'},
    'extended': {component: 'ExtendedList', label: 'Расширенный поиск'},
};

const componentOptions = {
    components: {
        AuthorList,
        SeriesList,
        TitleList,
        ExtendedList,
        PageScroller,
        SettingsDialog,
        SelectGenreDialog,
        SelectLangDialog,
        SelectLibRateDialog,
        SelectDateDialog,
        BookInfoDialog,
        SelectExtSearchDialog,
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
                this.updateSearchDate(true);

                //extSearch
                if (this.isExtendedSearch) {
                    this.extSearch.page = newValue.page;
                    this.extSearch.limit = newValue.limit;
                }
            },
            deep: true,
        },
        extSearch: {
            handler() {
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
        $route(to) {
            this.updateListFromRoute(to);
            this.updateSearchFromRouteQuery(to);
        },
        langDefault() {
            this.updateSearchFromRouteQuery(this.$route);
        },
        showJson(newValue) {
            this.setSetting('showJson', newValue);
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
            if (this.selectedListComponent) {
                this.pageCount = 1;
                this.list.totalFound = 0;
            }

            this.selectedListComponent = (route2component[newValue] ? route2component[newValue].component : null);

            if (this.getListRoute() != newValue) {
                this.updateRouteQueryFromSearch();
            }

            this.makeTitle();
        },
        searchDate() {
            this.updateSearchDate(false);
        },
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
    selectDateDialogVisible = false;
    bookInfoDialogVisible = false;
    selectExtSearchDialogVisible = false;

    pageCount = 1;    

    //input field consts 
    inputMaxLength = 1000;
    inputDebounce = 200;

    //search fields
    search = {};
    extSearch = {};

    searchDate = '';
    prevManualDate = '';

    //settings
    abCacheEnabled = true;
    langDefault = '';
    limit = 20;
    extendedParams = false;
    showJson = false;

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

    bookInfo = {};

    searchDateOptions = [
        {label: 'сегодня', value: 'today'},
        {label: 'за 3 дня', value: '3days'},
        {label: 'за неделю', value: 'week'},
        {label: 'за 2 недели', value: '2weeks'},
        {label: 'за месяц', value: 'month'},
        {label: 'за 2 месяца', value: '2months'},
        {label: 'за 3 месяца', value: '3months'},
        {label: 'выбрать даты', value: 'manual'},
    ];

    generateDefaults(obj, fields) {
        obj.setDefaults = (self, value = {}) => {
            for (const f of fields)
                self[f] = value[f] || '';

            self.page = value.page || 1;
            self.limit = value.limit || 50;
        };
    }

    created() {
        this.commit = this.$store.commit;
        this.api = this.$root.api;

        this.generateDefaults(this.search, ['author', 'series', 'title', 'genre', 'lang', 'date', 'librate']);
        this.search.setDefaults(this.search);

        this.loadSettings();
    }

    mounted() {
        (async() => {
            await this.api.updateConfig();

            this.generateDefaults(this.extSearch, this.recStruct.map(f => f.field));
            this.extSearch.setDefaults(this.extSearch);
            this.search.lang = this.langDefault;

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

            this.ready = true;

            this.sendMessage({type: 'mes', data: 'hello-from-inpx-web'});
            this.updateSearchFromRouteQuery(this.$route);
        })();
    }

    loadSettings() {
        const settings = this.settings;

        this.search.limit = settings.limit;

        this.extendedParams = settings.extendedParams;
        this.expanded = _.cloneDeep(settings.expanded);
        this.expandedSeries = _.cloneDeep(settings.expandedSeries);
        this.abCacheEnabled = settings.abCacheEnabled;
        this.langDefault = settings.langDefault;
        this.showJson = settings.showJson;
    }

    recvMessage(d) {
        if (d.type == 'mes') {
            switch(d.data) {
                case 'ready':
                    this.list.liberamaReady = true;
                    this.sendMessage({type: 'mes', data: 'ready'});
                    this.sendCurrentUrl();
                    this.makeTitle();
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

    get recStruct() {
        if (this.config.dbConfig && this.config.dbConfig.inpxInfo.recStruct)
            return this.config.dbConfig.inpxInfo.recStruct;
        else
            return [];
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
            if (route == 'extended') {
                if (this.config.extendedSearch) {
                    result.push({value: route, icon: 'la la-code', size: '10px'});
                }
            } else {
                result.push({label: rec.label, value: route, icon: rec.icon});
            }
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

    get isExtendedSearch() {
        return this.selectedList === 'extended';
    }

    get extSearchNames() {
        let result = [];
        for (const f of this.recStruct) {
            if (this.extSearch[f.field])
                result.push(`${f.field}=${this.extSearch[f.field]}`);
        }
        return result.join(', ');
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
        if (newList == 'extended' && !this.config.extendedSearch)
            newList = '';
        newList = (newList ? newList : 'author');

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

        if (!this.isExtendedSearch) {
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
                s = (s ? `(Серия: ${s})` : '');
                let t = correctValue(search.title);
                t = (t ? `"${t}"` : '');

                result = [s, t].filter(v => v).join(' ');
                result = [a, result].filter(v => v).join(' ');
            }
        } else {
            if (this.extSearchNames)
                result = this.extSearchNames;
        }

        this.$root.setAppTitle(result);
        if (this.list.liberamaReady)
            this.sendMessage({type: 'titleChange', data: result});
    }

    showSearchHelp() {
        let info = `<div style="min-width: 250px" />`;
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
            "~" поиск по регулярному выражению. Например, для "~^\\s" в поле названия, будут найдены
            все книги, названия которых начинаются с пробельного символа
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

    selectExtSearch() {
        this.hideTooltip();
        this.selectExtSearchDialogVisible = true;
    }

    clearExtSearch() {
        const self = this.extSearch;
        self.setDefaults(self, {page: self.page, limit: self.limit});
    }
    
    onScroll() {
        const curScrollTop = this.$refs.scroller.scrollTop;
		const toolpanelviewportoffset= this.$refs.toolPanel.getBoundingClientRect().top;

        if (this.ignoreScrolling) {
            this.lastScrollTop = curScrollTop;
            if (this.$refs.toolPanel.offsetTop > curScrollTop)
                this.$refs.toolPanel.style.top = `${curScrollTop}px`;
            return;
        }


		if (this.lastScrollTop==curScrollTop) return; //если событие вызвано более 1 раза на 1 скролл

        if (!this.lastScrollTop)
            this.lastScrollTop = 0;

		if (curScrollTop - this.lastScrollTop > 0) { //страницу крутят вверх
		    if (this.$refs.toolPanel.style.position=="sticky") //Если блок приклеен к окну
			this.$refs.toolPanel.style.top=`${curScrollTop}px`;//Приклеиваем его к позиции в родителе
		    this.$refs.toolPanel.style.position="relative";
		    if (toolpanelviewportoffset<-this.$refs.toolPanel.offsetHeight) //Но не даём блоку оказаться дальше своей высоты за экраном
			this.$refs.toolPanel.style.top = `${curScrollTop-this.$refs.toolPanel.offsetHeight}px`;
    		} else {
        	if (toolpanelviewportoffset>=0)
			{
				this.$refs.toolPanel.style.top="0px";
				this.$refs.toolPanel.style.position="sticky";
			
			}
		}
        this.lastScrollTop = curScrollTop;


    }

    async ignoreScroll(ms = 300) {
        this.ignoreScrolling = true;
        await utils.sleep(ms);
        await this.$nextTick();
        await this.$nextTick();
        await this.$nextTick();
        this.ignoreScrolling = false;
    }

    scrollToTop() {
        this.$refs.scroller.scrollTop = 0;
        this.lastScrollTop = 0;
	this.$refs.toolPanel.style.top="0px";
	this.$refs.toolPanel.style.position="sticky";
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
            case 'submitUrl':
                this.sendMessage({type: 'submitUrl', data: event.data});
                break;
            case 'bookInfo':
                this.bookInfo = event.data;
                this.bookInfoDialogVisible = true;
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
        if (!this.ready)
            return;
        if (this.list.liberamaReady)
            this.sendCurrentUrl();

        if (this.routeUpdating)
            return;

        const query = to.query;

        this.search.setDefaults(this.search, {
            author: query.author,
            series: query.series,
            title: query.title,
            genre: query.genre,
            lang: (typeof(query.lang) == 'string' ? query.lang : this.langDefault),
            date: query.date,
            librate: query.librate,

            page: parseInt(query.page, 10),
            limit: parseInt(query.limit, 10) || this.search.limit,
        });

        if (this.search.limit > maxLimit)
            this.search.limit = maxLimit;

        const queryExtSearch = {
            page: this.search.page,
            limit: this.search.limit,
        };

        for (const f of this.recStruct) {
            const field = `ex_${f.field}`;
            if (query[field])
                queryExtSearch[f.field] = query[field];
        }

        this.extSearch.setDefaults(this.extSearch, queryExtSearch);
    }

    updateRouteQueryFromSearch() {
        if (!this.ready)
            return;

        this.routeUpdating = true;
        try {
            const oldQuery = this.$route.query;
            let query = {};

            const cloned = {};
            this.search.setDefaults(cloned, this.search);

            query = _.pickBy(cloned);

            if (this.search.lang == this.langDefault) {
                delete query.lang;
            } else {
                query.lang = this.search.lang;
            }

            for (const f of this.recStruct) {
                const field = `ex_${f.field}`;
                if (this.extSearch[f.field])
                    query[field] = this.extSearch[f.field];
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

    updateSearchDate(toLocal) {
        if (toLocal) {
            let local = this.search.date || '';

            if (utils.isManualDate(local) || !local)
                this.prevManualDate = local;

            if (utils.isManualDate(local))
                local = 'manual';

            this.searchDate = local;
        } else {
            if (this.searchDate != 'manual')
                this.search.date = this.searchDate || '';
        }
    }

    get formatSearchDate() {
        const result = [];
        const date = this.search.date;
        if (utils.isManualDate(date)) {
            const [from, to] = date.split(',')
            if (from)
                result.push(`<div style="display: inline-block; width: 15px; text-align: right;">с</div> ${utils.sqlDateFormat(from)}`);
            if (to)
                result.push(`<div style="display: inline-block; width: 15px; text-align: right;">по</div> ${utils.sqlDateFormat(to)}`);
        }

        return result.join('<br>');
    }

    dateSelectItemClick(itemValue) {
        if (itemValue == 'manual') {
            if (!utils.isManualDate(this.search.date)) {
                this.search.date = this.prevManualDate;
                if (!this.search.date)
                    this.searchDate = '';
            }
            this.selectDateDialogVisible = true
        }
    }

    cloneSearch() {
        window.open(window.location.href, '_blank');
    }

    extToList(list) {
        if (this.extSearch[list])
            this.search[list] = this.extSearch[list];
        this.selectedList = list;
    }

    async logout() {
        await this.api.logout();
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
