<template>
    <Dialog ref="dialog" v-model="dialogVisible">
        <template #header>
            <div class="row items-center">
                <div style="font-size: 110%">
                    Информация о книге
                </div>
            </div>
        </template>

        <div ref="box" class="fit column q-mt-xs overflow-auto no-wrap" style="padding: 0px 10px 10px 10px;">
            <div class="text-green-10">
                {{ bookAuthor }}
            </div>
            <div>
                <b>{{ book.title }}</b>
            </div>

            <div class="row q-mt-sm no-wrap">
                <div class="column justify-center" style="height: 300px; width: 200px;">
                    <img v-if="coverSrc" :src="coverSrc" class="fit row justify-center items-center" style="object-fit: contain" @error="coverSrc = ''" />
                    <div v-if="!coverSrc" class="fit row justify-center items-center text-grey-5" style="border: 1px solid #ccc; font-size: 300%">
                        <i>{{ book.ext }}</i>
                    </div>
                </div>

                <div class="col column q-ml-sm" style="min-width: 300px; border: 1px solid #ccc">
                    <div class="bg-grey-3 row">
                        <q-tabs
                            v-model="selectedTab"
                            active-color="black"
                            active-bg-color="white"
                            indicator-color="white"
                            dense
                            no-caps
                            inline-label
                            class="bg-grey-4 text-grey-7"
                        >
                            <q-tab name="fb2" label="Fb2 инфо" />
                            <q-tab name="inpx" label="Inpx инфо" />
                        </q-tabs>
                    </div>

                    <div class="overflow-auto full-width" style="height: 262px">
                        <div v-for="item in info" :key="item.name">
                            <div class="row q-ml-sm q-mt-sm items-center">
                                <div class="text-blue" style="font-size: 90%">
                                    {{ item.label }}
                                </div>
                                <div class="col q-mx-xs" style="height: 0px; border-top: 1px solid #ccc" />
                            </div>

                            <div v-for="subItem in item.value" :key="subItem.name" class="row q-ml-md">
                                <div style="width: 110px">
                                    {{ subItem.label }}
                                </div>
                                <div class="q-ml-sm">
                                    {{ subItem.value }}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="q-mt-md" v-html="annotation" />
        </div>

        <template #footer>
            <q-btn class="q-px-md q-ml-sm" color="primary" dense no-caps @click="okClick">
                OK
            </q-btn>
        </template>
    </Dialog>
</template>

<script>
//-----------------------------------------------------------------------------
import vueComponent from '../../vueComponent.js';

import Dialog from '../../share/Dialog.vue';
import Fb2Parser from '../../../../server/core/fb2/Fb2Parser';

const componentOptions = {
    components: {
        Dialog
    },
    watch: {
        modelValue(newValue) {
            this.dialogVisible = newValue;
            if (newValue)
                this.init();
        },
        dialogVisible(newValue) {
            this.$emit('update:modelValue', newValue);
        },
    }
};
class BookInfoDialog {
    _options = componentOptions;
    _props = {
        modelValue: Boolean,
        bookInfo: Object,
    };

    dialogVisible = false;
    selectedTab = 'fb2';

    //info props
    coverSrc = '';
    annotation = '';
    fb2 = [];
    book = {};

    created() {
        this.commit = this.$store.commit;
    }

    mounted() {
    }

    init() {
        //defaults
        this.coverSrc = '';
        this.annotation = '';
        this.fb2 = [];
        this.book = {};

        this.parseBookInfo();
    }

    get bookAuthor() {
        if (this.book.author) {
            let a = this.book.author.split(',');
            return a.slice(0, 3).join(', ') + (a.length > 3 ? ' и др.' : '');
        }

        return '';
    }

    get inpx() {
        const mapping = [
            {name: 'fileInfo', label: 'Информация о файле', value: [
                {name: 'folder', label: 'Папка'},
                {name: 'file', label: 'Файл'},
                {name: 'size', label: 'Размер'},
                {name: 'date', label: 'Добавлен'},
            ]},
        ];
/*
                {name: 'author', label: 'Автор(ы)'},
                {name: 'bookTitle', label: 'Название'},
                {name: 'sequenceName', label: 'Серия'},
                {name: 'sequenceNum', label: 'Номер в серии'},
                {name: 'genre', label: 'Жанр'},

                {name: 'date', label: 'Дата'},
                {name: 'lang', label: 'Язык книги'},
                {name: 'srcLang', label: 'Язык оригинала'},
                {name: 'translator', label: 'Переводчик(и)'},
                {name: 'keywords', label: 'Ключевые слова'},


        {"author":"Грант Максвелл",
         "genre":"det_hard",
         "title":"Tower of Death",
         "series":"The Shadow[a]",
         "serno":53,
         "file":"641310",
         "size":420422,
         "libid":"641310",
         "del":0,
         "ext":"fb2",
         "date":"2021-11-04",
         "insno":181,
         "folder":"f.fb2-641019-643928.zip",
         "lang":"en",
         "librate":0,
         "keywords":"Hard-Boiled, Pulp Fiction,det",
*/
        const valueToString = (value, nodePath) => {//eslint-disable-line no-unused-vars
            if (typeof(value) === 'string') {
                return value;
            }

            return value;
        };

        let result = [];
        for (const item of mapping) {
            const itemOut = {name: item.name, label: item.label, value: []};

            for (const subItem of item.value) {
                const subItemOut = {
                    name: subItem.name,
                    label: subItem.label,
                    value: valueToString(this.book[subItem.name], `${item.name}/${subItem.name}`)
                };
                if (subItemOut.value)
                    itemOut.value.push(subItemOut);
            }

            if (itemOut.value.length)
                result.push(itemOut);
        }

        return result;
    }

    get info() {
        let result = [];

        switch (this.selectedTab) {
            case 'fb2':
                return this.fb2;
            case 'inpx':
                return this.inpx;
        }

        return result;
    }

    parseBookInfo() {
        const bookInfo = this.bookInfo;
        const parser = new Fb2Parser();

        //cover
        if (bookInfo.cover)
            this.coverSrc = bookInfo.cover;

        //fb2
        if (bookInfo.fb2) {
            this.fb2 = parser.bookInfoList(bookInfo.fb2);
            
            const infoObj = parser.bookInfo(bookInfo.fb2);
            if (infoObj.titleInfo) {
                let ann = infoObj.titleInfo.annotationHtml;
                if (ann) {
                    ann = ann.replace(/<p>/g, `<p class="p-annotation">`);
                    this.annotation = ann;
                }
            }
        }

        //book
        if (bookInfo.book)
            this.book = bookInfo.book;
    }

    okClick() {
        this.dialogVisible = false;
    }
}

export default vueComponent(BookInfoDialog);
//-----------------------------------------------------------------------------
</script>

<style scoped>
</style>

<style>
.p-annotation {
    text-indent: 20px;
    text-align: justify;
    padding: 0;
    margin: 0;
}
</style>
