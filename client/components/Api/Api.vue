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

    async config() {
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
