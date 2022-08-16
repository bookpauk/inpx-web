<template>
    <div class="root row fit">
        <div>Search</div>
    </div>
</template>

<script>
//-----------------------------------------------------------------------------
import vueComponent from '../vueComponent.js';

//import _ from 'lodash';

const componentOptions = {
    components: {
    },
    watch: {
    },
};
class Search {
    _options = componentOptions;

    created() {
        this.commit = this.$store.commit;
    }

    mounted() {
    }

}

export default vueComponent(Search);
//-----------------------------------------------------------------------------
</script>

<style scoped>
.root {
}
</style>
