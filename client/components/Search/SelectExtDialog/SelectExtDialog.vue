<template>
    <Dialog ref="dialog" v-model="dialogVisible">
        <template #header>
            <div class="row items-center">
                <div style="font-size: 110%">
                    Выбрать типы файлов
                </div>
            </div>
        </template>

        <div ref="box" class="column q-mt-xs overflow-auto no-wrap" style="width: 370px; padding: 0px 10px 10px 10px;">
            <div v-show="extList.length" class="checkbox-tick-all">
                <div class="row items-center">
                    <q-option-group
                        v-model="ticked"
                        :options="optionsPre"
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

                <q-checkbox v-model="tickAll" label="Выбрать/снять все" toggle-order="ft" @update:model-value="makeTickAll" />
            </div>

            <q-option-group
                v-model="ticked"
                :options="options"
                type="checkbox"
            >
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
        ext() {
            this.updateTicked();
        },
        ticked() {
            this.checkAllTicked();
            this.updateExt();
        },
    }
};
class SelectExtDialog {
    _options = componentOptions;
    _props = {
        modelValue: Boolean,
        ext: {type: String, value: ''},
        extList: Array,
    };

    dialogVisible = false;

    ticked = [];
    tickAll = false;

    created() {
        this.commit = this.$store.commit;
    }

    mounted() {
        this.updateTicked();
    }

    async init() {
        //await this.$refs.dialog.waitShown();
    }

    get options() {
        const result = [];

        for (const ext of this.extList) {
            if (ext.length <= 4)
                result.push({label: ext, value: ext});
        }

        for (const ext of this.extList) {
            if (ext.length > 4)
                result.push({label: ext, value: ext});
        }

        return result;
    }

    get optionsPre() {
        const result = [];

        for (const ext of ['fb2', 'epub', 'mobi', 'pdf', 'djvu', 'doc', 'docx', 'rtf', 'xml', 'html', 'txt', 'zip']) {
            if (this.extList.includes(ext)) {
                result.push({label: ext, value: ext});
            }
        }

        return result;
    }

    makeTickAll() {
        if (this.tickAll) {
            const newTicked = [];
            for (const ext of this.extList) {
                newTicked.push(ext);
            }
            this.ticked = newTicked;
        } else {
            this.ticked = [];
            this.tickAll = false;
        }
    }

    checkAllTicked() {
        const ticked = new Set(this.ticked);

        let newTickAll = !!(this.extList.length);
        for (const ext of this.extList) {
            if (!ticked.has(ext)) {
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
        this.ticked = this.ext.split('|').filter(s => s);
    }

    updateExt() {
        this.$emit('update:ext', this.ticked.join('|'));
    }

    okClick() {
        this.dialogVisible = false;
    }
}

export default vueComponent(SelectExtDialog);
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