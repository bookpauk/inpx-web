<template>
    <div class="root column fit">
        <div class="tool-panel bg-green-11">
            <div class="header q-mx-md q-mt-xs row justify-between items-center">
                <div class="row items-center">
                    <div class="q-mr-xs">
                        Коллекция:
                    </div>
                    <div class="clickable" @click="showCollectionInfo">
                        {{ collection }}
                    </div>
                </div>
                <div class="q-ml-md">
                    {{ projectName }}
                </div>
            </div>
            <div class="row q-mx-md q-my-sm items-center">
                <q-input ref="authorInput" v-model="author" maxlength="1000" class="bg-white" style="width: 300px;" label="Автор" stack-label outlined dense clearable />
                <div class="q-mx-xs" />
                <q-input v-model="series" maxlength="1000" class="bg-white" style="width: 200px;" label="Серия" stack-label outlined dense clearable />
                <div class="q-mx-xs" />
                <q-input v-model="title" maxlength="1000" class="bg-white" style="width: 200px;" label="Название" stack-label outlined dense clearable />
                <div class="q-mx-xs" />
                <q-input v-model="genre" maxlength="1000" class="bg-white" style="width: 200px;" label="Жанр" stack-label outlined dense clearable readonly />
                <div class="q-mx-xs" />
                <q-input v-model="lang" maxlength="1000" class="bg-white" style="width: 80px;" label="Язык" stack-label outlined dense clearable readonly />
                <div class="q-mx-xs" />                
                <q-btn round dense style="height: 20px" color="info" icon="la la-question" @click="showSearchHelp" />
            </div>
        </div>

        <div class="col fit" style="overflow: auto">
            {{ config }}
        </div>
    </div>
</template>

<script>
//-----------------------------------------------------------------------------
import vueComponent from '../vueComponent.js';

//import _ from 'lodash';

const componentOptions = {
    components: {
    },
    watch: {
        config() {
            this.makeTitle();
        },
    },
};
class Search {
    _options = componentOptions;
    collection = '';
    projectName = '';

    //search fields
    author = '';
    series = '';
    title = '';
    genre = '';
    lang = '';

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

    async updateTableData() {
    }

    async refresh() {
        const newQuery = {
            author: this.author,
            series: this.series,
            title: this.title,
            genre: this.genre,
            lang:  this.lang,
        };

        this.queryExecute = newQuery;

        if (this.refreshing)
            return;

        this.refreshing = true;
        try {
            while (this.queryExecute) {
                const query = this.queryExecute;
                this.queryExecute = null;

                try {
                    this.searchResult = await this.api.search(query);
                } catch (e) {
                    this.$root.stdDialog.alert(e.message, 'Ошибка');
                    return;
                }

                this.updateTableData();//no await
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
    font-size: 150%;
    height: 30px;
}

.clickable {
    color: blue;
    cursor: pointer;
}
</style>
