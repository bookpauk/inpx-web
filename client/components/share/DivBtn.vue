<template>
    <div ref="btn" class="button clickable row justify-center items-center" :class="{disabled}" @click.stop.prevent="clickEffect">
        <div class="row justify-center items-center no-wrap" :class="{'button-pressed': pressed}">
            <i :class="icon" :style="`font-size: ${iconSize}px; margin-top: ${imt}px`" />
            <slot></slot>
        </div>
        <slot name="tooltip"></slot>
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
        minWidth: { type: Number, default: 0 },
        height: { type: Number, default: 0 },
        icon: { type: String, default: '' },
        iconSize: { type: Number, default: 14 },
        round: Boolean,
        imt:  { type: Number, default: 0 },// icon margin top
        disabled: Boolean,
        noShadow: Boolean,
    };

    pressed = false;

    created() {
    }

    mounted() {
        this.updateSizes();
    }

    updateSizes() {
        const style = this.$refs.btn.style;
        style.minWidth = `${(this.minWidth ? this.minWidth : this.size)}px`;
        style.height = `${(this.height ? this.height : this.size)}px`;
        if (this.pad) {
            style.paddingLeft = `${this.pad}px`;
            style.paddingRight = `${this.pad + 5}px`;
        }

        if (this.round)
            style.borderRadius = `${this.size}px`;
        else
            style.borderRadius = `${this.size/10}px`;

        if (!this.noShadow)
            style.boxShadow = '0.5px 1px 3px #333333';
    }

    async clickEffect(event) {
        if (this.disabled) {
            return;
        }

        this.$emit('meClick', event);
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
}

.button:hover {
    opacity: 0.8;
    transition: opacity 0.2s linear;
}

.button-pressed {
    margin-left: 1px;
    margin-top: 1px;
    margin-right: -1px;
    margin-bottom: -1px;
}

.clickable {
    cursor: pointer;
}
</style>