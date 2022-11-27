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
import * as cryptoUtils from '../../share/cryptoUtils';
import LockQueue from '../../../server/core/LockQueue';
import packageJson from '../../../package.json';

const rotor = '|/-\\';
const stepBound = [
    0,
    0,// jobStep = 1
    40,// jobStep = 2
    50,// jobStep = 3
    54,// jobStep = 4
    58,// jobStep = 5
    69,// jobStep = 6
    69,// jobStep = 7
    70,// jobStep = 8
    95,// jobStep = 9
    100,// jobStep = 10
];

const componentOptions = {
    components: {
    },
    watch: {
        settings() {
            this.loadSettings();
        },
        modelValue(newValue) {
            this.accessGranted = newValue;
        },
        accessGranted(newValue) {
            this.$emit('update:modelValue', newValue);
        }
    },
};
class Api {
    _options = componentOptions;
    _props = {
        modelValue: Boolean,
    };
    accessGranted = false;

    busyDialogVisible = false;
    mainMessage = '';
    jobMessage = '';
    //jsonMessage = '';
    progress = 0;
    accessToken = '';

    created() {
        this.commit = this.$store.commit;
        this.lock = new LockQueue();

        this.loadSettings();
    }

    mounted() {
        this.updateConfig();//no await
    }

    loadSettings() {
        const settings = this.settings;

        this.accessToken = settings.accessToken;
    }

    async updateConfig() {
        try {
            const config = await this.getConfig();
            config.webAppVersion = packageJson.version;
            this.commit('setConfig', config);
        } catch (e) {
            this.$root.stdDialog.alert(e.message, 'Ошибка');
        }
    }

    get settings() {
        return this.$store.state.settings;
    }

    async showPasswordDialog() {
        try {
            await this.lock.get();//заход только один раз, остальные ждут закрытия диалога
        } catch (e) {
            return;
        }

        try {
            const result = await this.$root.stdDialog.password('Введите пароль:', 'Доступ ограничен', {
                inputValidator: (str) => (str ? true : 'Пароль не должен быть пустым'),
                userName: 'access',
                noEscDismiss: true,
                noBackdropDismiss: true,
                noCancel: true,
            });

            if (result && result.value) {
                //получим свежую соль
                const response = await wsc.message(await wsc.send({}), 10);
                let salt = '';
                if (response && response.error == 'need_access_token' && response.salt)
                    salt = response.salt;

                const accessToken = utils.toHex(cryptoUtils.sha256(result.value + salt));
                this.commit('setSettings', {accessToken});
            }
        } finally {
            this.lock.errAll();
            this.lock.ret();
        }
    }

    async showBusyDialog() {
        try {
            await this.lock.get();//заход только один раз, остальные ждут закрытия диалога
        } catch (e) {
            return;
        }

        this.mainMessage = '';
        this.jobMessage = '';
        this.busyDialogVisible = true;
        try {
            let ri = 0;
            while (1) {// eslint-disable-line
                const params = {action: 'get-worker-state', workerId: 'server_state'};
                if (this.accessToken)
                    params.accessToken = this.accessToken;

                const server = await wsc.message(await wsc.send(params));

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
            this.lock.errAll();
            this.lock.ret();
        }
    }

    async request(params, timeoutSecs = 10) {
        let errCount = 0;
        while (1) {// eslint-disable-line
            try {
                if (this.accessToken)
                    params.accessToken = this.accessToken;

                const response = await wsc.message(await wsc.send(params), timeoutSecs);

                if (response && response.error == 'need_access_token') {
                    this.accessGranted = false;
                    await this.showPasswordDialog();
                } else if (response && response.error == 'server_busy') {
                    this.accessGranted = true;
                    await this.showBusyDialog();
                } else {
                    this.accessGranted = true;
                    if (response.error) {
                        throw new Error(response.error);
                    }

                    return response;
                }

                errCount = 0;
            } catch(e) {
                errCount++;
                if (e.message !== 'WebSocket не отвечает' || errCount > 10) {
                    errCount = 0;
                    throw e;
                }
                await utils.sleep(100);
            }
        }
    }

    async search(from, query) {
        return await this.request({action: 'search', from, query}, 30);
    }

    async getAuthorBookList(authorId) {
        return await this.request({action: 'get-author-book-list', authorId});
    }

    async getSeriesBookList(series) {
        return await this.request({action: 'get-series-book-list', series});
    }

    async getGenreTree() {
        return await this.request({action: 'get-genre-tree'});
    }    

    async getBookLink(bookUid) {
        return await this.request({action: 'get-book-link', bookUid}, 120);
    }

    async getBookInfo(bookUid) {
        return await this.request({action: 'get-book-info', bookUid}, 120);
    }

    async getConfig() {
        return await this.request({action: 'get-config'});
    }

    async logout() {
        await this.request({action: 'logout'});
        await this.request({action: 'test'});
    }
}

export default vueComponent(Api);
//-----------------------------------------------------------------------------
</script>

<style scoped>
</style>
