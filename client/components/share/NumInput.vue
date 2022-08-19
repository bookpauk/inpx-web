<template>
    <q-input
        v-model="filteredValue"
        outlined dense
        input-style="text-align: center"
        class="no-mp"
        :class="(error ? 'error' : '')"
        :disable="disable"
    >
        <slot></slot>
        <template #prepend>
            <q-icon
                v-ripple="validate(modelValue - step)" 
                :class="(validate(modelValue - step) ? '' : 'disable')" 
                name="la la-minus-circle" 
                class="button" 
                @click="minus"
                @mousedown.prevent.stop="onMouseDown($event, 'minus')"
                @mouseup.prevent.stop="onMouseUp"
                @mouseout.prevent.stop="onMouseUp"
                @touchstart.stop="onTouchStart($event, 'minus')"
                @touchend.stop="onTouchEnd"
                @touchcancel.prevent.stop="onTouchEnd"
            />
        </template>
        <template #append>
            <q-icon
                v-ripple="validate(modelValue + step)"
                :class="(validate(modelValue + step) ? '' : 'disable')"
                name="la la-plus-circle"
                class="button"
                @click="plus"
                @mousedown.prevent.stop="onMouseDown($event, 'plus')"
                @mouseup.prevent.stop="onMouseUp"
                @mouseout.prevent.stop="onMouseUp"
                @touchstart.stop="onTouchStart($event, 'plus')"
                @touchend.stop="onTouchEnd"
                @touchcancel.prevent.stop="onTouchEnd"
            />
        </template>
    </q-input>
</template>

<script>
//-----------------------------------------------------------------------------
import vueComponent from '../vueComponent.js';

import * as utils from '../../share/utils';

const componentOptions = {
    watch: {
        filteredValue: function(newValue) {
            if (this.validate(newValue)) {
                this.error = false;
                this.$emit('update:modelValue', this.string2number(newValue));
            } else {
                this.error = true;
            }
        },
        modelValue: function(newValue) {
            this.filteredValue = newValue;
        },
    }
};
class NumInput {
    _options = componentOptions;
    _props = {
        modelValue: Number,
        min: { type: Number, default: -Number.MAX_VALUE },
        max: { type: Number, default: Number.MAX_VALUE },
        step: { type: Number, default: 1 },
        digits: { type: Number, default: 0 },
        disable: Boolean
    };

    filteredValue = 0;
    error = false;

    created() {
        this.filteredValue = this.modelValue;
    }

    string2number(value) {
        return Number.parseFloat(Number.parseFloat(value).toFixed(this.digits));
    }

    validate(value) {
        let n = this.string2number(value);
        if (isNaN(n))
            return false;
        if (n < this.min)
            return false;
        if (n > this.max)
            return false;
        return true;
    }

    plus() {
        const newValue = this.modelValue + this.step;
        if (this.validate(newValue))
            this.filteredValue = newValue;
    }

    minus() {
        const newValue = this.modelValue - this.step;
        if (this.validate(newValue))
            this.filteredValue = newValue;
    }

    onMouseDown(event, way) {
        this.startClickRepeat = true;
        this.clickRepeat = false;

        if (event.button == 0) {
            (async() => {
                await utils.sleep(300);
                if (this.startClickRepeat) {
                    this.clickRepeat = true;
                    while (this.clickRepeat) {
                        if (way == 'plus') {
                            this.plus();
                        } else {
                            this.minus();
                        }
                        await utils.sleep(50);
                    }
                }
            })();
        }
    }

    onMouseUp() {
        if (this.inTouch)
            return;
        this.startClickRepeat = false;
        this.clickRepeat = false;
    }

    onTouchStart(event, way) {
        if (!this.$root.isMobileDevice)
            return;
        if (event.touches.length == 1) {
            this.inTouch = true;
            this.onMouseDown({button: 0}, way);
        }
    }

    onTouchEnd() {
        if (!this.$root.isMobileDevice)
            return;
        this.inTouch = false;
        this.onMouseUp();
    }
}

export default vueComponent(NumInput);
//-----------------------------------------------------------------------------
</script>

<style scoped>
.no-mp {
    margin: 0;
    padding: 0;
}

.button {
    font-size: 130%;
    border-radius: 20px;
    color: #bbb;
    cursor: pointer;
}

.button:hover {
    color: #616161;
    background-color: #efebe9;
}

.error {
    background-color: #ffabab;
    border-radius: 3px;
}

.disable, .disable:hover {
    cursor: not-allowed;
    color: #bbb;
    background-color: white;
}
</style>