<template>
    <div class="row items-center q-ml-md q-my-xs" style="font-size: 120%">
        <div class="q-mr-xs">
            Страница
        </div>
        <div class="bg-white">
            <NumInput 
                v-model="page" :min="1" :max="pageCount"
                style="width: 200px" minus-icon="la la-chevron-circle-left" plus-icon="la la-chevron-circle-right" :disable="disable" mm-buttons
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

    created() {
    }

}

export default vueComponent(PageScroller);
//-----------------------------------------------------------------------------
</script>

<style scoped>
</style>