<template>
    <div v-if="totalPages > 1" class="row items-center q-ml-md q-my-xs" style="font-size: 120%">
        <div class="q-mr-xs">
            Страница
        </div>
        <div class="bg-white">
            <NumInput 
                v-model="page" :min="1" :max="totalPages"
                style="width: 140px" minus-icon="la la-chevron-circle-left" plus-icon="la la-chevron-circle-right" :disable="disable"
            />
        </div>
        <div class="q-ml-xs">
            из {{ totalPages }}
        </div>
    </div>
    <div v-else class="q-my-sm" />
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
        totalPages: Number,
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