<template>
    <Dialog ref="dialog" v-model="dialogVisible">
        <template #header>
            <div class="row items-center">
                <div style="font-size: 110%">
                    Выбрать даты
                </div>
            </div>
        </template>

        <div ref="box" class="column q-mt-xs overflow-auto no-wrap" style="width: 240px; padding: 0px 10px 10px 10px;">
            <div class="row items-center">
                <div class="row justify-end q-mr-sm" style="width: 15px">
                    С:
                </div>
                <q-btn icon="la la-calendar" color="secondary" :label="labelFrom" dense no-caps style="width: 150px;">
                    <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                        <q-date v-model="from" mask="YYYY-MM-DD">
                            <div class="row items-center justify-end q-gutter-sm">
                                <q-btn v-close-popup label="Отмена" color="primary" flat />
                                <q-btn v-close-popup label="OK" color="primary" flat @click="save" />
                            </div>
                        </q-date>
                    </q-popup-proxy>
                </q-btn>
                <q-icon name="la la-times-circle" class="q-ml-sm text-grey-6 clickable2" size="28px" @click="from = ''; save();" />
            </div>

            <div class="q-my-sm" />
            <div class="row items-center">
                <div class="row justify-end q-mr-sm" style="width: 15px">
                    По:
                </div>
                <q-btn icon="la la-calendar" color="secondary" :label="labelTo" dense no-caps style="width: 150px;">
                    <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                        <q-date v-model="to" mask="YYYY-MM-DD">
                            <div class="row items-center justify-end q-gutter-sm">
                                <q-btn v-close-popup label="Отмена" color="primary" flat />
                                <q-btn v-close-popup label="OK" color="primary" flat @click="save" />
                            </div>
                        </q-date>
                    </q-popup-proxy>
                </q-btn>
                <q-icon name="la la-times-circle" class="q-ml-sm text-grey-6 clickable2" size="28px" @click="to = ''; save();" />
            </div>
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
import * as utils from '../../../share/utils';

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
        date() {
            this.updateFromTo();
        },
    }
};
class SelectDateDialog {
    _options = componentOptions;
    _props = {
        modelValue: Boolean,
        date: String,
    };

    dialogVisible = false;

    from = '';
    to = '';

    created() {
    }

    mounted() {
        this.updateFromTo();
    }

    updateFromTo() {
        this.from = this.splitDate.from;
        this.to = this.splitDate.to;
    }

    get splitDate() {
        if (!utils.isManualDate(this.date))
            return {from: '', to: ''};

        const [from = '', to = ''] = (this.date || '').split(',');
        return {from, to};
    }

    get labelFrom() {
        return (this.splitDate.from ? utils.sqlDateFormat(this.splitDate.from) : 'Не указано');
    }

    get labelTo() {
        return (this.splitDate.to ? utils.sqlDateFormat(this.splitDate.to) : 'Не указано');
    }

    save() {
        let d = this.from;
        if (this.to)
            d += `,${this.to}`;
        this.$emit('update:date', d);
    }

    okClick() {
        this.dialogVisible = false;
    }
}

export default vueComponent(SelectDateDialog);
//-----------------------------------------------------------------------------
</script>

<style scoped>
.clickable2 {
    cursor: pointer;
}
</style>