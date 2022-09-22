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
                v-show="mmButtons"
                style="font-size: 100%"
                v-ripple="modelValue != min" 
                :class="(modelValue != min ? '' : 'disable')" 
                name="la la-angle-double-left" 
                class="button" 
                @click="toMin"
            />

            <q-icon
                v-ripple="validate(modelValue - step)" 
                :class="(validate(modelValue - step) ? '' : 'disable')" 
                :name="minusIcon" 
                class="button" 
                @click="onClick('minus')"
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
                :name="plusIcon"
                class="button"
                @click="onClick('plus')"
                @mousedown.prevent.stop="onMouseDown($event, 'plus')"
                @mouseup.prevent.stop="onMouseUp"
                @mouseout.prevent.stop="onMouseUp"
                @touchstart.stop="onTouchStart($event, 'plus')"
                @touchend.stop="onTouchEnd"
                @touchcancel.prevent.stop="onTouchEnd"
            />

            <q-icon
                v-show="mmButtons"
                style="font-size: 100%"
                v-ripple="modelValue != max" 
                :class="(modelValue != max ? '' : 'disable')" 
                name="la la-angle-double-right" 
                class="button" 
                @click="toMax"
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
        filteredValue() {
            this.checkErrorAndEmit(true);
        },
        modelValue(newValue) {
            this.filteredValue = newValue;
        },
        min() {
            this.checkErrorAndEmit();
        },
        max() {
            this.checkErrorAndEmit();
        }
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
        disable: Boolean,
        minusIcon: {type: String, default: 'la la-minus-circle'},
        plusIcon: {type: String, default: 'la la-plus-circle'},
        mmButtons: Boolean,
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

    checkErrorAndEmit(emit = false) {
        if (this.validate(this.filteredValue)) {
            this.error = false;
            if (emit)
                this.$emit('update:modelValue', this.string2number(this.filteredValue));
        } else {
            this.error = true;
        }
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

    onClick(way) {
        if (this.clickRepeat)
            return;

        if (way == 'plus') {
            this.plus();
        } else {
            this.minus();
        }
    }

    onMouseDown(event, way) {
        this.startClickRepeat = true;
        this.clickRepeat = false;

        if (event.button == 0) {
            (async() => {
                if (this.inRepeatFunc)
                    return;

                this.inRepeatFunc = true;
                try {
                    await utils.sleep(300);
                    if (this.startClickRepeat) {
                        this.clickRepeat = true;
                        while (this.clickRepeat) {
                            if (way == 'plus') {
                                this.plus();
                            } else {
                                this.minus();
                            }
                            await utils.sleep(200);
                        }
                    }
                } finally {
                    this.inRepeatFunc = false;
                }
            })();
        }
    }

    onMouseUp() {
        if (this.inTouch)
            return;
        this.startClickRepeat = false;
        if (this.clickRepeat) {
            (async() => {
                await utils.sleep(50);
                this.clickRepeat = false;
            })();
        }
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

    toMin() {
        this.filteredValue = this.min;
    }

    toMax() {
        this.filteredValue = this.max;
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
    border-radius: 15px;
    width: 30px;
    height: 30px;
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