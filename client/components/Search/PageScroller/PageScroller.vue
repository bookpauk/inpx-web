<template>
    <div class="row items-center q-ml-md q-my-xs" style="font-size: 120%">
        <div class="q-mr-xs">
            Страница
        </div>
        <div class="trans" :class="{'bg-green-4': highlight, 'bg-white': !highlight}">
            <NumInput 
                v-model="page" :min="1" :max="pageCount" mask="#######"
                style="width: 220px" minus-icon="la la-chevron-circle-left" plus-icon="la la-chevron-circle-right" :disable="disable" mm-buttons
            />
        </div>
        <div class="q-ml-xs">
            из {{ pageCount }}
        </div>
    </div>
</template>

<script>
//-----------------------------------------------------------------------------
import vueComponent from '../../vueComponent.js';

import NumInput from '../../share/NumInput.vue';
import * as utils from '../../../share/utils';

const componentOptions = {
    components: {
        NumInput
    },
    watch: {
        modelValue(newValue) {
            this.page = newValue;
        },
        page(newValue) {
            this.$emit('update:modelValue', newValue);
        },
    }
};
class PageScroller {
    _options = componentOptions;
    _props = {
        modelValue: Number,
        disable: Boolean,
        pageCount: Number,
    };

    page = 1;
    highlight = false;

    created() {
    }

    async highlightScroller() {
        if (this.inTrans)
            return;

        this.inTrans = true;
        await utils.sleep(300);
        this.highlight = true;
        await utils.sleep(300);
        this.highlight = false;
        await utils.sleep(300);
        this.inTrans = false;
    }
}

export default vueComponent(PageScroller);
//-----------------------------------------------------------------------------
</script>

<style scoped>
.trans {
    border-radius: 5px;
    transition: background-color 0.3s linear;
}
</style>