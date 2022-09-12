<template>
    <Dialog ref="dialog" v-model="dialogVisible">
        <template #header>
            <div class="row items-center">
                <div style="font-size: 130%">
                    Выбрать язык
                </div>
            </div>
        </template>

        <div ref="box" class="column q-mt-xs overflow-auto no-wrap" style="width: 370px; padding: 0px 10px 10px 10px;">
            <div v-show="langList.length" class="checkbox-tick-all">
                <div class="row items-center">
                    <q-option-group
                        v-model="ticked"
                        :options="optionsPre"
                        type="checkbox"
                        inline
                    />

                    <div class="col" />
                    <div v-show="lang != langDefault" class="clickable" @click="setAsDefaults">
                        Установить по умолчанию
                    </div>
                </div>

                <q-checkbox v-model="tickAll" label="Выбрать/снять все" toggle-order="ft" @update:model-value="makeTickAll" />
            </div>

            <q-option-group
                v-model="ticked"
                :options="options"
                type="checkbox"
                inline
            >
                <template #label="opt">
                    <div class="row items-center" style="width: 35px">
                        <span>{{ opt.label }}</span>
                    </div>
                </template>
            </q-option-group>
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

const componentOptions = {
    components: {
        Dialog
    },
    watch: {
        modelValue(newValue) {
            this.dialogVisible = newValue;
            if (newValue)
                this.init();//no await
        },
        dialogVisible(newValue) {
            this.$emit('update:modelValue', newValue);
        },
        lang() {
            this.updateTicked();
        },
        ticked() {
            this.checkAllTicked();
            this.updateLang();
        },
    }
};
class SelectLangDialog {
    _options = componentOptions;
    _props = {
        modelValue: Boolean,
        lang: {type: String, value: ''},
        langDefault: {type: String, value: ''},
        langList: Array,
    };

    dialogVisible = false;

    ticked = [];
    tickAll = false;

    created() {
        this.commit = this.$store.commit;
    }

    mounted() {
    }

    async init() {
        //await this.$refs.dialog.waitShown();
    }

    get options() {
        const result = [];

        for (const lang of this.langList) {
            result.push({label: lang, value: lang});
        }

        return result;
    }

    get optionsPre() {
        const result = [];

        for (const lang of this.langList) {
            if (['ru', 'en'].includes(lang)) {
                result.push({label: lang, value: lang});
            }
        }

        return result.reverse();
    }

    makeTickAll() {
        if (this.tickAll) {
            const newTicked = [];
            for (const lang of this.langList) {
                newTicked.push(lang);
            }
            this.ticked = newTicked;
        } else {
            this.ticked = [];
            this.tickAll = false;
        }
    }

    checkAllTicked() {
        const ticked = new Set(this.ticked);

        let newTickAll = !!(this.langList.length);
        for (const lang of this.langList) {
            if (!ticked.has(lang)) {
                newTickAll = false;
                break;
            }
        }

        if (this.ticked.length && !newTickAll) {
            this.tickAll = undefined;
        } else {
            this.tickAll = newTickAll;
        }
    }

    updateTicked() {
        this.ticked = this.lang.split(',').filter(s => s);
    }

    updateLang() {
        this.$emit('update:lang', this.ticked.join(','));
    }

    setAsDefaults() {
        this.commit('setSettings', {langDefault: this.lang});
    }

    okClick() {
        this.dialogVisible = false;
    }
}

export default vueComponent(SelectLangDialog);
//-----------------------------------------------------------------------------
</script>

<style scoped>
.checkbox-tick-all {
    border-bottom: 1px solid #bbbbbb;
    margin-bottom: 7px;
    padding: 5px 5px 2px 0px;
}

.clickable {
    color: blue;
    cursor: pointer;
}
</style>