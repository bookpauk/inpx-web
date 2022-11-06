<template>
    <Dialog ref="dialog" v-model="dialogVisible">
        <template #header>
            <div class="row items-center">
                <div style="font-size: 110%">
                    Информация о книге
                </div>
            </div>
        </template>

        <div ref="box" class="column q-mt-xs overflow-auto no-wrap" style="width: 200px; padding: 0px 10px 10px 10px;">
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
    }
};
class BookInfoDialog {
    _options = componentOptions;
    _props = {
        modelValue: Boolean,
    };

    dialogVisible = false;

    created() {
        this.commit = this.$store.commit;
    }

    mounted() {
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