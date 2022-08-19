<template>
    <div class="root column fit" style="position: relative">
        <div v-show="loadingMessage" class="fit row justify-center items-center" style="position: absolute; background-color: rgba(0, 0, 0, 0.2); z-index: 1">
            <div class="bg-white row justify-center items-center" style="width: 180px; height: 50px; border-radius: 10px; box-shadow: 2px 2px 10px #333333">
                <q-spinner color="primary" size="2em" />
                <div class="q-ml-sm">
                    {{ loadingMessage }}
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
                    <q-btn round dense style="height: 20px" color="info" icon="la la-question" @click="showSearchHelp" />

                    <div class="q-mx-xs" />
                    <div class="row items-center q-mt-xs">
                        <div v-show="queryFound > 0">
                            Найдено {{ totalFound }} авторов
                        </div>
                        <div v-show="queryFound == 0">
                            Ничего не найдено
                        </div>
                    </div>
                </div>
            </div>

            <div v-show="totalPages > 1" class="row justify-center items-center q-ml-md q-my-xs" style="font-size: 120%">
                <div class="q-mr-xs">
                    Страница
                </div>
                <div class="bg-white">
                    <NumInput v-model="page" :min="1" :max="totalPages" style="width: 150px" />
                </div>
                <div class="q-ml-xs">
                    из {{ totalPages }}
                </div>
            </div>

            <div v-for="item in tableData" :key="item.key" style="border-bottom: 1px solid #aaaaaa">
                <div class="q-my-sm q-ml-md" style="font-size: 120%">
                    {{ item.value }}
                </div>
            </div>

            <div v-show="totalPages > 1" class="row justify-center items-center q-ml-md q-my-xs" style="font-size: 120%">
                <div class="q-mr-xs">
                    Страница
                </div>
                <div class="bg-white">
                    <NumInput v-model="page" :min="1" :max="totalPages" style="width: 150px" />
                </div>
                <div class="q-ml-xs">
                    из {{ totalPages }}
                </div>
            </div>
        </div>
    </div>
</template>

<script>
//-----------------------------------------------------------------------------
import vueComponent from '../vueComponent.js';

import NumInput from '../share/NumInput.vue';
import * as utils from '../../share/utils';

//import _ from 'lodash';

const componentOptions = {
    components: {
        NumInput,
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
        limit() {
            this.updatePageCount();
            this.refresh();
        },
        totalFound() {
            this.updatePageCount();
        }
    },
};
class Search {
    _options = componentOptions;
    collection = '';
    projectName = '';

    loadingMessage = '';
    page = 1;
    totalPages = 1;

    //input field consts 
    inputMaxLength = 1000;
    inputDebounce = 200;

    //search fields
    author = '';
    series = '';
    title = '';
    genre = '';
    lang = '';
    limit = 100;

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
    }

    mounted() {
        this.api = this.$root.api;

        this.$refs.authorInput.focus();

        this.refresh();//no await
    }

    get config() {
        return this.$store.state.config;
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
        const curScrollTop = this.$refs.scroller.scrollTop;
        if (!this.lastScrollTop)
            this.lastScrollTop = 0;
        if (!this.lastScrollTop2)
            this.lastScrollTop2 = 0;

        if (curScrollTop - this.lastScrollTop > 0) {
            this.$refs.toolPanel.style.position = 'relative';
            this.$refs.toolPanel.style.top = `${this.lastScrollTop2}px`;
        } else if (curScrollTop - this.lastScrollTop < 0) {
            this.$refs.toolPanel.style.position = 'sticky';
            this.$refs.toolPanel.style.top = 0;
            this.lastScrollTop2 = curScrollTop;
        }

        this.lastScrollTop = curScrollTop;    
    }

    updatePageCount() {
        this.totalPages = Math.floor(this.totalFound/this.limit);
        this.totalPages = (this.totalPages < 1 ? 1 : this.totalPages);
        if (this.page > this.totalPages)
            this.page = 1;
    }

    async updateTableData() {
        let result = [];

        for (const rec of this.searchResult.author) {
            result.push({key: rec.id, value: `${rec.id} ${rec.author.replace(/,/g, ', ')}`});
        }

        this.tableData = result;
    }

    async refresh() {
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
                } catch (e) {
                    this.$root.stdDialog.alert(e.message, 'Ошибка');
                    return;
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
</style>
