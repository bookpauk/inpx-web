<template>
    <div ref="btn" class="button clickable row justify-center items-center no-wrap" @click="clickEffect">
        <div :class="{'button-pressed': pressed}">
            <q-icon :name="icon" :size="`${iconSize}px`" />
            <slot></slot>
        </div>
    </div>
</template>

<script>
//-----------------------------------------------------------------------------
import vueComponent from '../vueComponent.js';

import * as utils from '../../share/utils';

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
        pad: { type: Number, default: 0 },
    };

    pressed = false;

    created() {
    }

    mounted() {
        this.updateSizes();
    }

    updateSizes() {
        const style = this.$refs.btn.style;
        style.minWidth = `${this.size}px`;
        style.height = `${this.size}px`;
        if (this.pad) {
            style.paddingLeft = `${this.pad}px`;
            style.paddingRight = `${this.pad + 5}px`;
        }

        if (this.round)
            style.borderRadius = `${this.size}px`;
    }

    async clickEffect() {
        this.pressed = true;
        await utils.sleep(100);
        this.pressed = false;
    }
}

export default vueComponent(DivBtn);
//-----------------------------------------------------------------------------
</script>

<style scoped>
.button {
    position: relative;
    box-shadow: 0.5px 1px 3px #333333;
}

.button:hover {
    opacity: 0.8;
    transition: opacity 0.2s linear;
}

.button-pressed {
    margin-left: 2px;
    margin-top: 2px;
}

.clickable {
    cursor: pointer;
}
</style>