<template>
    <div>
        <div class="q-my-sm" @click="selectTitle(book.title)">
            {{ book.title }}
            <br>{{ book.src }}
        </div>
    </div>
</template>

<script>
//-----------------------------------------------------------------------------
import vueComponent from '../../vueComponent.js';

const componentOptions = {
    components: {
    },
    watch: {
    }
};
class BookView {
    _options = componentOptions;
    _props = {
        book: Object,
    };

    created() {
    }

}

export default vueComponent(BookView);
//-----------------------------------------------------------------------------
</script>

<style scoped>
</style>