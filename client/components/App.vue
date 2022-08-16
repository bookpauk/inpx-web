<template>
    <div class="fit row">
        <Notify ref="notify" />
        <StdDialog ref="stdDialog" />

        <router-view v-slot="{ Component }">
            <keep-alive>
                <component :is="Component" class="col" />
            </keep-alive>
        </router-view>        
    </div>
</template>

<script>
//-----------------------------------------------------------------------------
import vueComponent from './vueComponent.js';

//import * as utils from '../share/utils';
import Notify from './share/Notify.vue';
import StdDialog from './share/StdDialog.vue';

import Search from './Search/Search.vue';

const componentOptions = {
    components: {
        Notify,
        StdDialog,

        Search,
    },
    watch: {
    },

};
class App {
    _options = componentOptions;

    created() {
        //root route
        let cachedRoute = '';
        let cachedPath = '';
        this.$root.getRootRoute = () => {
            if (this.$route.path != cachedPath) {
                cachedPath = this.$route.path;
                const m = cachedPath.match(/^(\/[^/]*).*$/i);
                cachedRoute = (m ? m[1] : this.$route.path);
            }
            return cachedRoute;
        }

        this.$root.isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent);

        //global keyHooks
        this.keyHooks = [];
        this.keyHook = (event) => {
            for (const hook of this.keyHooks)
                hook(event);
        }

        this.$root.addKeyHook = (hook) => {
            if (this.keyHooks.indexOf(hook) < 0)
                this.keyHooks.push(hook);
        }

        this.$root.removeKeyHook = (hook) => {
            const i = this.keyHooks.indexOf(hook);
            if (i >= 0)
                this.keyHooks.splice(i, 1);
        }

        document.addEventListener('keyup', (event) => {
            this.keyHook(event);
        });
        document.addEventListener('keypress', (event) => {
            this.keyHook(event);
        });
        document.addEventListener('keydown', (event) => {
            this.keyHook(event);
        });        
    }

    mounted() {
        this.$root.notify = this.$refs.notify;
        this.$root.stdDialog = this.$refs.stdDialog;

        this.setAppTitle();
    }

    get rootRoute() {
        return this.$root.getRootRoute();
    }

    setAppTitle(title) {
        if (!title) {
            document.title = 'inpx-web';
        } else {
            document.title = title;
        }
    }
}

export default vueComponent(App);
//-----------------------------------------------------------------------------
</script>

<style scoped>
</style>

<style>
body, html, #app {    
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    font: normal 12px GameDefault;
}

.dborder {
    border: 2px solid yellow;
}

.icon-rotate {
    vertical-align: middle;
    animation: rotating 2s linear infinite;
}

@keyframes rotating { 
    from { 
        transform: rotate(0deg); 
    } to { 
        transform: rotate(360deg); 
    }
}

@font-face {
  font-family: 'GameDefault';
  src: url('fonts/web-default.woff') format('woff'),
       url('fonts/web-default.ttf') format('truetype');
}

</style>
