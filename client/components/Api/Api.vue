<template>
    <div>
        <q-dialog v-model="busyDialogVisible" no-route-dismiss no-esc-dismiss no-backdrop-dismiss>
            <div class="q-pa-lg bg-white column" style="width: 400px">
                <div style="font-weight: bold; font-size: 120%;">
                    {{ mainMessage }}
                </div>

                <div v-show="jobMessage" class="q-mt-sm" style="width: 350px; white-space: nowrap; overflow: hidden">
                    {{ jobMessage }}
                </div>
                <div v-show="jobMessage">
                    <q-linear-progress stripe rounded size="30px" :value="progress" color="green">
                        <div class="absolute-full flex flex-center">
                            <div class="text-black bg-white" style="font-size: 10px; padding: 1px 4px 1px 4px; border-radius: 4px">
                                {{ (progress*100).toFixed(2) }}%
                            </div>
                        </div>
                    </q-linear-progress>
                </div>
                <!--div class="q-ml-sm">
                    {{ jsonMessage }}
                </div-->                
            </div>
        </q-dialog>
    </div>
</template>

<script>
//-----------------------------------------------------------------------------
import vueComponent from '../vueComponent.js';

//import _ from 'lodash';

import wsc from './webSocketConnection';
import * as utils from '../../share/utils';

const rotor = '|/-\\';
const stepBound = [
    0,
    0,//1
    18,//2
    20,//3
    70,//4
    82,//5
    84,//6
    88,//7
    90,//8
    98,//9
    99,//10
    100,//11
];

const componentOptions = {
    components: {
    },
    watch: {
    },
};
class Api {
    _options = componentOptions;
    busyDialogVisible = false;
    mainMessage = '';
    jobMessage = '';
    //jsonMessage = '';
    progress = 0;

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

    async showBusyDialog() {
        this.mainMessage = '';
        this.jobMessage = '';
        this.busyDialogVisible = true;
        try {
            let ri = 0;
            while (1) {// eslint-disable-line
                const server = await wsc.message(await wsc.send({action: 'get-worker-state', workerId: 'server_state'}));

                if (server.state != 'normal') {
                    this.mainMessage = `${server.serverMessage} ${rotor[ri]}`;
                    if (server.job == 'load inpx') {
                        this.jobMessage = `${server.jobMessage} (${server.recsLoaded}): ${server.fileName}`;
                    } else {
                        this.jobMessage = server.jobMessage;
                    }

                    //this.jsonMessage = server;

                    const jStep = server.jobStep;

                    if (jStep && stepBound[jStep] !== undefined) {
                        const sp = server.progress || 0;
                        const delta = stepBound[jStep + 1] - stepBound[jStep];
                        this.progress = (stepBound[jStep] + sp*delta)/100;
                    }
                } else {
                    break;
                }

                await utils.sleep(300);
                ri = (ri < rotor.length - 1 ? ri + 1 : 0);
            }
        } finally {
            this.busyDialogVisible = false;
        }
    }

    async request(params, timeoutSecs = 10) {
        while (1) {// eslint-disable-line
            const response = await wsc.message(await wsc.send(params), timeoutSecs);

            if (response && response.error == 'server_busy') {
                await this.showBusyDialog();
            } else {
                return response;
            }
        }
    }

    async search(query) {
        const response = await this.request({action: 'search', query});

        if (response.error) {
            throw new Error(response.error);
        }

        return response;
    }

    async getBookList(authorId) {
        const response = await this.request({action: 'get-book-list', authorId});

        if (response.error) {
            throw new Error(response.error);
        }

        return response;
    }

    async getGenreTree() {
        const response = await this.request({action: 'get-genre-tree'});

        if (response.error) {
            throw new Error(response.error);
        }

        return response;
    }    

    async getBookLink(params) {
        const response = await this.request(Object.assign({action: 'get-book-link'}, params), 120);

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
