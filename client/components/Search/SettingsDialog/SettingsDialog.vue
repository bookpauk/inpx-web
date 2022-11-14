<template>
    <Dialog ref="dialog" v-model="dialogVisible">
        <template #header>
            <div class="row items-center" style="font-size: 110%">
                <q-icon class="q-mr-sm text-green" name="la la-cog" size="28px"></q-icon>
                Настройки
            </div>
        </template>

        <div class="q-mx-md column" style="min-width: 300px; font-size: 120%;">
            <div class="row items-center q-ml-sm">
                <div class="q-mr-sm">
                    Результатов на странице
                </div>
                <q-select
                    v-model="limit" :options="limitOptions" class="bg-white"
                    dropdown-icon="la la-angle-down la-sm"
                    outlined dense emit-value map-options
                />
            </div>

            <q-checkbox v-model="showCounts" size="36px" label="Показывать количество" />                
            <q-checkbox v-model="showRates" size="36px" label="Показывать оценки" />
            <q-checkbox v-model="showInfo" size="36px" label="Показывать кнопку (инфо)" />
            <q-checkbox v-model="showGenres" size="36px" label="Показывать жанры" />
            <q-checkbox v-model="showDates" size="36px" label="Показывать даты поступления" />
            <q-checkbox v-model="showDeleted" size="36px" label="Показывать удаленные" />
            <q-checkbox v-model="abCacheEnabled" size="36px" label="Кешировать запросы" />
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
        },
        dialogVisible(newValue) {
            this.$emit('update:modelValue', newValue);
        },

        settings() {
            this.loadSettings();
        },
        limit(newValue) {
            this.commit('setSettings', {'limit': newValue});
        },
        showCounts(newValue) {
            this.commit('setSettings', {'showCounts': newValue});
        },
        showRates(newValue) {
            this.commit('setSettings', {'showRates': newValue});
        },
        showInfo(newValue) {
            this.commit('setSettings', {'showInfo': newValue});
        },
        showGenres(newValue) {
            this.commit('setSettings', {'showGenres': newValue});
        },
        showDates(newValue) {
            this.commit('setSettings', {'showDates': newValue});
        },
        showDeleted(newValue) {
            this.commit('setSettings', {'showDeleted': newValue});
        },
        abCacheEnabled(newValue) {
            this.commit('setSettings', {'abCacheEnabled': newValue});
        },
    }
};
class SettingsDialog {
    _options = componentOptions;
    _props = {
        modelValue: Boolean,
    };

    dialogVisible = false;

    //settings
    limit = 20;
    showCounts = true;
    showRates = true;
    showInfo = true;
    showGenres = true;
    showDates = true;
    showDeleted = false;
    abCacheEnabled = true;

    limitOptions = [
        {label: '10', value: 10},
        {label: '20', value: 20},
        {label: '50', value: 50},
        {label: '100', value: 100},
        {label: '200', value: 200},
        {label: '500', value: 500},
        {label: '1000', value: 1000},
    ];

    created() {
        this.commit = this.$store.commit;

        this.loadSettings();
    }

    mounted() {
    }

    get settings() {
        return this.$store.state.settings;
    }

    loadSettings() {
        const settings = this.settings;

        this.limit = settings.limit;

        this.showCounts = settings.showCounts;
        this.showRates = settings.showRates;
        this.showInfo = settings.showInfo;
        this.showGenres = settings.showGenres;
        this.showDates = settings.showDates;
        this.showDeleted = settings.showDeleted;
        this.abCacheEnabled = settings.abCacheEnabled;
    }

    okClick() {
        this.dialogVisible = false;
    }
}

export default vueComponent(SettingsDialog);
//-----------------------------------------------------------------------------
</script>

<style scoped>
</style>