<template>
    <Dialog ref="dialog" v-model="dialogVisible">
        <template #header>
            <div class="row items-center">
                <div style="font-size: 110%">
                    Расширенный поиск
                </div>
            </div>
        </template>

        <div ref="box" class="column q-mt-xs overflow-auto" style="max-width: 700px; padding: 0px 10px 10px 10px;">
            <div class="row">
                <div v-for="f in recStruct" :key="f.field" class="row">
                    <div class="q-mx-xs" />
                    <q-input
                        v-model="search[f.field]" :maxlength="5000"
                        class="q-mt-xs" style="width: 150px;" :label="`${f.field} (${f.type == 'N' ? 'число' : 'строка'})`"
                        :bg-color="bgColor[f.field] || 'white'"
                        stack-label outlined dense clearable
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
            <q-btn class="q-px-md q-ml-sm" color="primary" dense no-caps @click="okClick">
                Закрыть
            </q-btn>
        </template>
    </Dialog>
</template>

<script>
//-----------------------------------------------------------------------------
import vueComponent from '../../vueComponent.js';

import Dialog from '../../share/Dialog.vue';

const componentOptions = {
    components: {
        Dialog
    },
    watch: {
        modelValue(newValue) {
            this.dialogVisible = newValue;
        },
        dialogVisible(newValue) {
            this.$emit('update:modelValue', newValue);
        },
        extSearch(newValue) {
            this.search = newValue;
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
            return false;
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

    okClick() {
        this.dialogVisible = false;
    }

    apply() {
        this.validate();
        this.dialogVisible = false;
    }
}

export default vueComponent(SelectExtSearchDialog);
//-----------------------------------------------------------------------------
</script>

<style scoped>
</style>