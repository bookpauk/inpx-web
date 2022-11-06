<template>
    <Dialog ref="dialog" v-model="dialogVisible">
        <template #header>
            <div class="row items-center">
                <div style="font-size: 110%">
                    Выбрать жанры
                </div>
            </div>
        </template>

        <div ref="box" class="column q-mt-xs overflow-auto no-wrap" style="width: 370px; padding: 0px 10px 10px 10px;">
            <div class="row items-center top-panel bg-grey-3">
                <q-input ref="search" v-model="search" class="col" outlined dense bg-color="white" placeholder="Найти" clearable />
            </div>
            <div v-show="nodes.length" class="checkbox-tick-all">
                <q-checkbox v-model="tickAll" size="36px" label="Выбрать/снять все" toggle-order="ft" @update:model-value="makeTickAll" />
            </div>
            <q-tree
                v-model:ticked="ticked"
                v-model:expanded="expanded"
                class="q-my-xs"
                :nodes="nodes"
                node-key="key"
                tick-strategy="leaf"
                selected-color="black"
                :filter="search"
                no-nodes-label="Жанров нет"
                no-results-label="Ничего не найдено"
            >
            </q-tree>
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

const componentOptions = {
    components: {
        Dialog
    },
    watch: {
        modelValue(newValue) {
            this.dialogVisible = newValue;
            if (newValue)
                this.init();//no await
        },
        dialogVisible(newValue) {
            this.$emit('update:modelValue', newValue);
        },
        genre() {
            this.updateTicked();
        },
        ticked() {
            this.checkAllTicked();
            this.updateGenre();
        },
    }
};
class GenreSelectDialog {
    _options = componentOptions;
    _props = {
        modelValue: Boolean,
        genre: {type: String, value: ''},
        genreTree: Array,
    };

    dialogVisible = false;

    search = '';
    ticked = [];
    expanded = [];
    tickAll = false;
    allKeys = [];

    created() {
    }

    mounted() {
        this.updateTicked();
    }

    async init() {
        await this.$refs.dialog.waitShown();
        //чтобы не скакало при поиске
        this.$refs.box.style.height = `${document.body.clientHeight - 160}px`;
    }

    get nodes() {
        const result = [];

        this.allKeys = [];
        for (const section of this.genreTree) {
            const rkey = `r-${section.name}`;
            const sec = {label: section.name, key: rkey, children: []};

            for (const g of section.value) {
                sec.children.push({label: g.name, key: g.value});
                this.allKeys.push(g.value);
            }

            result.push(sec);            
        }

        return result;
    }

    makeTickAll() {
        if (this.tickAll) {
            const newTicked = [];
            for (const key of this.allKeys) {
                newTicked.push(key);
            }
            this.ticked = newTicked;
        } else {
            this.ticked = [];
            this.tickAll = false;
        }
    }

    checkAllTicked() {
        const ticked = new Set(this.ticked);

        let newTickAll = !!(this.nodes.length);
        for (const key of this.allKeys) {
            if (!ticked.has(key)) {
                newTickAll = false;
                break;
            }
        }

        if (this.ticked.length && !newTickAll) {
            this.tickAll = undefined;
        } else {
            this.tickAll = newTickAll;
        }
    }

    updateTicked() {
        this.ticked = this.genre.split(',').filter(s => s);
    }

    updateGenre() {
        this.$emit('update:genre', this.ticked.join(','));
    }

    okClick() {
        this.dialogVisible = false;
    }
}

export default vueComponent(GenreSelectDialog);
//-----------------------------------------------------------------------------
</script>

<style scoped>
.top-panel {
    border-radius: 10px;
    padding: 5px;
}

.checkbox-tick-all {
    border-bottom: 1px solid #bbbbbb;
    margin-bottom: 7px;
    padding: 5px 5px 2px 16px;
}
</style>