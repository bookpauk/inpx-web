<template>
    <div class="row items-center">
        <div class="q-my-sm clickable2" @click="selectTitle">
            {{ book.serno ? `${book.serno}. ` : '' }}
            <span class="text-blue-10">{{ book.title }}</span>
        </div>

        <div class="q-ml-sm">
            {{ bookSize }}, {{ book.ext }}
        </div>

        <div class="q-ml-sm clickable" @click="download">
            (скачать)
        </div>

        <div class="q-ml-sm clickable" @click="copyLink">
            <q-icon name="la la-copy" size="20px" />
        </div>

        <div v-if="showGenres" class="q-ml-sm">
            {{ bookGenre }}
        </div>

        {{ book.src1 }}
    </div>
</template>

<script>
//-----------------------------------------------------------------------------
import vueComponent from '../../vueComponent.js';

const componentOptions = {
    components: {
    },
    watch: {
        settings() {
            this.loadSettings();
        },
    }
};
class BookView {
    _options = componentOptions;
    _props = {
        book: Object,
        genreTree: Array,
    };

    showGenres = true;

    created() {
        this.loadSettings();
    }

    loadSettings() {
        const settings = this.settings;

        this.showGenres = settings.showGenres;
    }

    get settings() {
        return this.$store.state.settings;
    }

    get bookSize() {
        let size = this.book.size/1024;
        let unit = 'KB';
        if (size > 1024) {
            size = size/1024;
            unit = 'MB';
        }
        return `${size.toFixed(0)}${unit}`;
    }

    get bookGenre() {
        let result = [];
        const genre = new Set(this.book.genre.split(','));

        for (const section of this.genreTree) {
            for (const g of section.value)
                if (genre.has(g.value))
                    result.push(g.name);
        }

        return `(${result.join(', ')})`;
    }

    selectTitle() {
        this.$emit('bookEvent', {action: 'titleClick', book: this.book});
    }

    download() {
    }

    copyLink() {
    }
}

export default vueComponent(BookView);
//-----------------------------------------------------------------------------
</script>

<style scoped>
.clickable {
    color: blue;
    cursor: pointer;
}

.clickable2 {
    cursor: pointer;
}

</style>