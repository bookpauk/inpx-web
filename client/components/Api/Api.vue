<template>
    <div>
    </div>
</template>

<script>
//-----------------------------------------------------------------------------
import vueComponent from '../vueComponent.js';

import wsc from './webSocketConnection';
//import _ from 'lodash';

const componentOptions = {
    components: {
    },
    watch: {
    },
};
class Api {
    _options = componentOptions;

    created() {
        this.commit = this.$store.commit;
    }

    mounted() {
        this.updateConfig();//no await
    }

    async updateConfig() {
        try {
            const config = await this.getConfig();
            this.commit('setConfig', config);
        } catch (e) {
            this.$root.stdDialog.alert(e.message, 'Ошибка');
        }
    }

    get config() {
        return this.$store.state.config;
    }

    async request(params) {
        return await wsc.message(await wsc.send(params));
    }

    async search(query) {
        const response = await this.request({action: 'search', query});

        if (response.error) {
            throw new Error(response.error);
        }

        return response;
    }

    async getConfig() {
        const response = await this.request({action: 'get-config'});

        if (response.error) {
            throw new Error(response.error);
        }

        return response;
    }
}

export default vueComponent(Api);
//-----------------------------------------------------------------------------
</script>

<style scoped>
</style>
