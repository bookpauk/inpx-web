<template>
    <q-dialog ref="dialog" v-model="active" no-route-dismiss @show="onShow" @hide="onHide">
        <slot></slot>

        <!--------------------------------------------------->
        <div v-show="type == 'alert'" class="bg-white no-wrap">
            <div class="header row">
                <div class="caption col row items-center q-ml-md">
                    <q-icon v-show="caption" class="q-mr-sm" :class="iconColor" :name="iconName" size="28px"></q-icon>
                    <div v-html="caption"></div>
                </div>
                <div class="close-icon column justify-center items-center">
                    <q-btn v-close-popup flat round dense>
                        <q-icon name="la la-times" size="18px"></q-icon>
                    </q-btn>
                </div>
            </div>

            <div class="q-mx-md">
                <div v-html="message"></div>
            </div>

            <div class="buttons row justify-end q-pa-md">
                <q-btn class="q-px-md" dense no-caps @click="okClick">
                    OK
                </q-btn>
            </div>
        </div>

        <!--------------------------------------------------->
        <div v-show="type == 'confirm'" class="bg-white no-wrap">
            <div class="header row">
                <div class="caption col row items-center q-ml-md">
                    <q-icon v-show="caption" class="q-mr-sm" :class="iconColor" :name="iconName" size="28px"></q-icon>
                    <div v-html="caption"></div>
                </div>
                <div class="close-icon column justify-center items-center">
                    <q-btn v-close-popup flat round dense>
                        <q-icon name="la la-times" size="18px"></q-icon>
                    </q-btn>
                </div>
            </div>

            <div class="q-mx-md">
                <div v-html="message"></div>
            </div>

            <div class="buttons row justify-end q-pa-md">
                <q-btn v-close-popup class="q-px-md q-ml-sm" dense no-caps>
                    Отмена
                </q-btn>
                <q-btn class="q-px-md q-ml-sm" color="primary" dense no-caps @click="okClick">
                    OK
                </q-btn>
            </div>
        </div>

        <!--------------------------------------------------->
        <div v-show="type == 'prompt'" class="bg-white no-wrap">
            <div class="header row">
                <div class="caption col row items-center q-ml-md">
                    <q-icon v-show="caption" class="q-mr-sm" :class="iconColor" :name="iconName" size="28px"></q-icon>
                    <div v-html="caption"></div>
                </div>
                <div class="close-icon column justify-center items-center">
                    <q-btn v-close-popup flat round dense>
                        <q-icon name="la la-times" size="18px"></q-icon>
                    </q-btn>
                </div>
            </div>

            <div class="q-mx-md">
                <div v-html="message"></div>
                <q-input ref="input" v-model="inputValue" class="q-mt-xs" outlined dense />
                <div class="error">
                    <span v-show="error != ''">{{ error }}</span>
                </div>
            </div>

            <div class="buttons row justify-end q-pa-md">
                <q-btn v-close-popup class="q-px-md q-ml-sm" dense no-caps>
                    Отмена
                </q-btn>
                <q-btn class="q-px-md q-ml-sm" color="primary" dense no-caps @click="okClick">
                    OK
                </q-btn>
            </div>
        </div>

        <!--------------------------------------------------->
        <div v-show="type == 'hotKey'" class="bg-white no-wrap">
            <div class="header row">
                <div class="caption col row items-center q-ml-md">
                    <q-icon v-show="caption" class="q-mr-sm" :class="iconColor" :name="iconName" size="28px"></q-icon>
                    <div v-html="caption"></div>
                </div>
                <div class="close-icon column justify-center items-center">
                    <q-btn v-close-popup flat round dense>
                        <q-icon name="la la-times" size="18px"></q-icon>
                    </q-btn>
                </div>
            </div>

            <div class="q-mx-md">
                <div v-html="message"></div>
                <div class="q-my-md text-center">
                    <div v-show="hotKeyCode == ''" class="text-grey-5">
                        Нет
                    </div>
                    <div>{{ hotKeyCode }}</div>
                </div>
            </div>

            <div class="buttons row justify-end q-pa-md">
                <q-btn v-close-popup class="q-px-md q-ml-sm" dense no-caps>
                    Отмена
                </q-btn>
                <q-btn class="q-px-md q-ml-sm" color="primary" dense no-caps :disabled="hotKeyCode == ''" @click="okClick">
                    OK
                </q-btn>
            </div>
        </div>
    </q-dialog>
</template>

<script>
//-----------------------------------------------------------------------------
import vueComponent from '../vueComponent.js';
import * as utils from '../../share/utils';

const componentOptions = {
    watch: {
        inputValue: function(newValue) {
            this.validate(newValue);
        },
    }
};
class StdDialog {
    _options = componentOptions;
    caption = '';
    message = '';
    active = false;
    type = '';
    inputValue = '';
    error = '';
    iconColor = '';
    iconName = '';
    hotKeyCode = '';

    created() {
        if (this.$root.addKeyHook) {
            this.$root.addKeyHook(this.keyHook);
        }
    }

    init(message, caption, opts) {
        this.caption = caption;
        this.message = message;

        this.ok = false;        
        this.type = '';
        this.inputValidator = null;
        this.inputValue = '';
        this.error = '';
        this.showed = false;

        this.iconColor = 'text-warning';
        if (opts && opts.color) {
            this.iconColor = `text-${opts.color}`;
        }

        this.iconName = 'las la-exclamation-circle';
        if (opts && opts.iconName) {
            this.iconName = opts.iconName;
        }

        this.hotKeyCode = '';
        if (opts && opts.hotKeyCode) {
            this.hotKeyCode = opts.hotKeyCode;
        }
    }

    onHide() {
        if (this.hideTrigger) {
            this.hideTrigger();
            this.hideTrigger = null;
        }
        this.showed = false;
    }

    onShow() {
        if (this.type == 'prompt') {
            this.enableValidator = true;
            if (this.inputValue)
                this.validate(this.inputValue);
            this.$refs.input.focus();
        }
        this.showed = true;
    }

    validate(value) {
        if (!this.enableValidator)
            return false;

        if (this.inputValidator) {
            const result = this.inputValidator(value);
            if (result !== true) {
                this.error = result;
                return false;
            }
        }
        this.error = '';
        return true;
    }

    okClick() {
        if (this.type == 'prompt' && !this.validate(this.inputValue)) {
            this.$refs.dialog.shake();
            return;
        }

        if (this.type == 'hotKey' && this.hotKeyCode == '') {
            this.$refs.dialog.shake();
            return;
        }

        this.ok = true;
        this.$refs.dialog.hide();
    }

    alert(message, caption, opts) {
        return new Promise((resolve) => {
            this.init(message, caption, opts);

            this.hideTrigger = () => {
                if (this.ok) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            };

            this.type = 'alert';
            this.active = true;
        });
    }

    confirm(message, caption, opts) {
        return new Promise((resolve) => {
            this.init(message, caption, opts);

            this.hideTrigger = () => {
                if (this.ok) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            };

            this.type = 'confirm';
            this.active = true;
        });
    }

    prompt(message, caption, opts) {
        return new Promise((resolve) => {
            this.enableValidator = false;
            this.init(message, caption, opts);

            this.hideTrigger = () => {
                if (this.ok) {
                    resolve({value: this.inputValue});
                } else {
                    resolve(false);
                }
            };

            this.type = 'prompt';
            if (opts) {
                this.inputValidator = opts.inputValidator || null;
                this.inputValue = opts.inputValue || '';
            }
            this.active = true;
        });
    }

    getHotKey(message, caption, opts) {
        return new Promise((resolve) => {
            this.init(message, caption, opts);

            this.hideTrigger = () => {
                if (this.ok) {
                    resolve(this.hotKeyCode);
                } else {
                    resolve(false);
                }
            };

            this.type = 'hotKey';
            this.active = true;
        });
    }

    keyHook(event) {
        if (this.active && this.showed) {
            let handled = false;
            if (this.type == 'hotKey') {
                if (event.type == 'keydown') {
                    this.hotKeyCode = utils.keyEventToCode(event);
                    handled = true;
                }
            } else {
                if (event.key == 'Enter') {
                    this.okClick();
                    handled = true;
                }

                if (event.key == 'Escape') {
                    this.$nextTick(() => {
                        this.$refs.dialog.hide();
                    });
                    handled = true;
                }
            }

            if (handled) {
                event.stopPropagation();
                event.preventDefault();
            }
        }
    }
}

export default vueComponent(StdDialog);
//-----------------------------------------------------------------------------
</script>

<style scoped>
.header {
    height: 50px;
}

.caption {
    font-size: 110%;
    overflow: hidden;
}

.close-icon {
    width: 50px;
}

.buttons {
    height: 60px;
}

.error {
    height: 20px;
    font-size: 80%;
    color: red;
}
</style>