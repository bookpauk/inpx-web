<template>
    <div ref="btn" class="clickable row justify-center items-center">
        <q-icon :name="icon" :size="`${iconSize}px`" />
        <slot></slot>
    </div>
</template>

<script>
//-----------------------------------------------------------------------------
import vueComponent from '../vueComponent.js';

//import * as utils from '../../share/utils';

const componentOptions = {
    watch: {
        size() {
            this.updateSizes();
        },
    }
};
class DivBtn {
    _options = componentOptions;
    _props = {
        size: { type: Number, default: 24 },
        icon: { type: String, default: '' },
        iconSize: { type: Number, default: 14 },
        round: { type: Boolean },
    };

    created() {
    }

    mounted() {
        this.updateSizes();
    }

    updateSizes() {
        this.$refs.btn.style.width = `${this.size}px`;
        this.$refs.btn.style.height = `${this.size}px`;
        if (this.round)
            this.$refs.btn.style.borderRadius = `${this.size}px`;
    }
}

export default vueComponent(DivBtn);
//-----------------------------------------------------------------------------
</script>

<style scoped>
.clickable-icon {
    cursor: pointer;
}

</style>