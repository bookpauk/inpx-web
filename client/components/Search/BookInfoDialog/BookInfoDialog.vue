<template>
    <Dialog ref="dialog" v-model="dialogVisible">
        <template #header>
            <div class="row items-center">
                <div style="font-size: 110%">
                    Информация о книге
                </div>
            </div>
        </template>

        <div ref="box" class="column q-mt-xs overflow-auto no-wrap" style="padding: 0px 10px 10px 10px;">
            <div v-html="annotation" />
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
import XmlParser from '../../../../server/core/xml/XmlParser';

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
        bookInfo() {
            this.parseBookInfo();
        }
    }
};
class BookInfoDialog {
    _options = componentOptions;
    _props = {
        modelValue: Boolean,
        bookInfo: Object,
    };

    dialogVisible = false;

    //info props
    annotation = '';

    created() {
        this.commit = this.$store.commit;
        this.parseBookInfo();
    }

    mounted() {
    }

    parseBookInfo() {
        const bookInfo = this.bookInfo;
        const xml = new XmlParser();

        //defaults
        this.annotation = '';

        if (bookInfo.fb2) {
            const desc = xml.navigator(bookInfo.fb2);

            //annotation
            const annObj = desc.v('description/title-info/annotation');
            if (annObj) {
                this.annotation = xml.fromObject(annObj).toString({noHeader: true});
                this.annotation = this.annotation.replace(/<p>/g, `<p class="p-annotation">`);
            }
        }
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
