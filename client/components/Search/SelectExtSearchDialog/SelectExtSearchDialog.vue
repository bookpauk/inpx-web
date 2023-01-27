<template>
    <Dialog ref="dialog" v-model="dialogVisible">
        <template #header>
            <div class="row items-center">
                <div style="font-size: 110%">
                    Расширенный поиск
                </div>

                <DivBtn class="q-ml-sm text-grey-5 bg-yellow-1" :size="28" :icon-size="24" icon="la la-question" round @click.stop.prevent="showSearchHelp">
                    <template #tooltip>
                        <q-tooltip :delay="1500" anchor="bottom middle" content-style="font-size: 80%" max-width="400px">
                            Памятка
                        </q-tooltip>
                    </template>
                </DivBtn>
            </div>
        </template>

        <div ref="box" class="column q-mt-xs overflow-auto" style="max-width: 660px; padding: 0px 10px 10px 10px;">
            <div class="row">
                <div v-for="f in recStruct" :key="f.field" class="row">
                    <div class="q-mx-xs" />
                    <q-input
                        v-model="search[f.field]" :maxlength="5000"
                        class="q-mt-xs" style="width: 150px;" :label="`(${f.type}) ${f.field}`"
                        :bg-color="bgColor[f.field] || 'white'"
                        stack-label outlined dense clearable
                        @keydown="onKeyDown"
                    >
                        <q-tooltip v-if="search[f.field]" :delay="500" anchor="bottom middle" content-style="font-size: 80%" max-width="400px">
                            {{ search[f.field] }}
                        </q-tooltip>
                    </q-input>
                </div>
            </div>
            <div class="row q-mt-xs q-ml-sm" style="color: red" v-html="error" />
        </div>

        <template #footer>
            <q-btn class="q-px-md q-ml-sm" color="primary" dense no-caps :disabled="error !== ''" @click="apply">
                Применить
            </q-btn>
        </template>
    </Dialog>
</template>

<script>
//-----------------------------------------------------------------------------
import vueComponent from '../../vueComponent.js';

import Dialog from '../../share/Dialog.vue';
import DivBtn from '../../share/DivBtn.vue';

import _ from 'lodash';

const componentOptions = {
    components: {
        Dialog,
        DivBtn,
    },
    watch: {
        modelValue(newValue) {
            this.dialogVisible = newValue;
        },
        dialogVisible(newValue) {
            this.$emit('update:modelValue', newValue);
        },
        extSearch: {
            handler(newValue) {
                this.search = _.cloneDeep(newValue);
            },
            deep: true,
        },
        search: {
            handler() {
                this.validate();
            },
            deep: true,
        },
    }
};
class SelectExtSearchDialog {
    _options = componentOptions;
    _props = {
        modelValue: Boolean,
        extSearch: Object,
    };

    dialogVisible = false;
    search = {};
    bgColor = {};
    error = '';

    created() {
        this.commit = this.$store.commit;
    }

    mounted() {
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

    validate() {
        const validNumValue = (n) => {
            const validChars = new Set('0123456789.'.split(''));
            for (const c of n.split(''))
                if (!validChars.has(c))
                    return false;

            const v = n.split('..');
            if ( isNaN(parseInt(v[0] || '0', 10)) || isNaN(parseInt(v[1] || '0', 10)) )
                return false;

            return true;
        };

        let error = [];
        const s = this.search;
        for (const f of this.recStruct) {
            if (f.type == 'N' && s[f.field] && !validNumValue(s[f.field])) {
                error.push(`Недопустимое значение поля ${f.field}`);
                this.bgColor[f.field] = 'red-2';
            } else {
                this.bgColor[f.field] = '';//default
            }
        }

        this.error = error.join('<br>');
    }

    showSearchHelp() {
        let info = `<div style="min-width: 250px" />`;
        info += `
<p>
    Расширенный поиск ведется непосредственно по значениям атрибутов записей описания книг.
    Атрибуты можно увидеть, если включить опцию "Показывать JSON".
    Названия атрибутов (кроме "_uid" и "id") соответствуют названиям полей струкутры записей из inpx-файла.
    На поисковые значения действуют те же правила, что и для разделов "Авторы", "Серии", "Книги".
    <br>
    Для строковых значений (S):
    <ul>
        <li>
            без префикса: значение трактуется, как "начинается с"
        </li>
        <li>
            префикс "=": поиск по точному совпадению
        </li>
        <li>
            префикс "*": поиск подстроки в строке
        </li>
        <li>
            префикс "#": поиск подстроки в строке, но только среди начинающихся не с латинского или кириллического символа
        </li>
        <li>
            префикс "~": поиск по регулярному выражению
        </li>
        <li>
            префикс "?": поиск пустых значений или тех, что начинаются с этого символа
        </li>
    </ul>
    Для числовых значений (N):
    <ul>
        <li>
            число N: поиск по точному совпадению
        </li>
        <li>
            диапазон N..M: поиск по диапазону числовых значений, включая N и M. Например, поисковое значение 1024..2048 в поле "size"
            найдет все ссылки на файлы размером от 1КБ до 2КБ.
        </li>
    </ul>
</p>
`;

        this.$root.stdDialog.alert(info, 'Памятка', {iconName: 'la la-info-circle'});
    }

    onKeyDown(event) {
        if (event.code == 'Enter')
            this.apply();
    }

    apply() {
        this.validate();
        if (!this.error) {
            this.$emit('update:extSearch', _.cloneDeep(this.search));
            this.dialogVisible = false;
        }
    }
}

export default vueComponent(SelectExtSearchDialog);
//-----------------------------------------------------------------------------
</script>

<style scoped>
</style>