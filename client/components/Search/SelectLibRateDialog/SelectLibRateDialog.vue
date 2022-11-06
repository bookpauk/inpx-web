<template>
    <Dialog ref="dialog" v-model="dialogVisible">
        <template #header>
            <div class="row items-center">
                <div style="font-size: 110%">
                    Выбрать оценки
                </div>
            </div>
        </template>

        <div ref="box" class="column q-mt-xs overflow-auto no-wrap" style="width: 200px; padding: 0px 10px 10px 10px;">
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
        },
        dialogVisible(newValue) {
            this.$emit('update:modelValue', newValue);
        },
        librate() {
            this.updateTicked();
        },
        ticked() {
            this.updateLibrate();
        },
    }
};
class SelectLibRateDialog {
    _options = componentOptions;
    _props = {
        modelValue: Boolean,
        librate: String,
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

    get options() {
        return [
            {label: 'Без оценки', value: '0'},
            {label: '1', value: '1'},
            {label: '2', value: '2'},
            {label: '3', value: '3'},
            {label: '4', value: '4'},
            {label: '5', value: '5'},
        ];
    }

    updateTicked() {
        this.ticked = this.librate.split(',').filter(s => s);
    }

    updateLibrate() {
        this.ticked.sort((a, b) => a.localeCompare(b))
        this.$emit('update:librate', this.ticked.join(','));
    }

    okClick() {
        this.dialogVisible = false;
    }
}

export default vueComponent(SelectLibRateDialog);
//-----------------------------------------------------------------------------
</script>

<style scoped>
</style>