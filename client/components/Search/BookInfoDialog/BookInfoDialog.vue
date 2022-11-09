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
            <div class="row" style="height: 300px">
                <div style="height: 300px">
                    <img v-if="coverSrc" :src="coverSrc" style="height: 100%;" />
                </div>
            </div>

            <div class="q-mt-md" v-html="annotation" />
            <pre>{{ annotation }}</pre>
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
    coverSrc = '';
    annotation = '';

    created() {
        this.commit = this.$store.commit;
        this.parseBookInfo();
    }

    mounted() {
    }

    parseBookInfo() {
        const bookInfo = this.bookInfo;
        const parser = new Fb2Parser();

        //defaults
        this.coverSrc = '';
        this.annotation = '';

        //cover
        if (bookInfo.cover)
            this.coverSrc = bookInfo.cover;

        //fb2
        if (bookInfo.fb2 && bookInfo.fb2.fictionbook && bookInfo.fb2.fictionbook.description) {
            const desc = parser.inspector(bookInfo.fb2.fictionbook.description);

            //annotation
            const annObj = desc.v('title-info/annotation');
            if (annObj) {
                this.annotation = parser.fromObject(annObj).toString({noHeader: true, format: true});
                this.annotation = parser.toHtml(this.annotation);
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
