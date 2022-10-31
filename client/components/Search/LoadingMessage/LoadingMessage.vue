<template>
    <div v-show="message" class="fit row justify-center items-center" :style="`position: fixed; top: 0; left: 0; background-color: rgba(0, 0, 0, 0.2); z-index: ${zIndex}`">
        <div class="bg-white row justify-center items-center q-px-lg" style="min-width: 180px; height: 50px; border-radius: 10px; box-shadow: 2px 2px 10px #333333">
            <q-icon class="la la-spinner icon-rotate text-blue-8" size="28px" />
            <div class="q-ml-sm">
                {{ message }}
            </div>
        </div>
    </div>
</template>

<script>
//-----------------------------------------------------------------------------
import vueComponent from '../../vueComponent.js';

const componentOptions = {
    components: {
    },
};
class LoadingMessage {
    _options = componentOptions;
    _props = {
        message: String,
        zIndex: {type: String, dafault: '100'},
    };
}

export default vueComponent(LoadingMessage);
//-----------------------------------------------------------------------------
</script>

<style scoped>
</style>
