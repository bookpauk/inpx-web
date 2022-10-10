<template>
    <div class="row items-center q-my-sm">
        <div class="row no-wrap">
            <div v-if="showRate || showDeleted">
                <div v-if="showRate && !book.del">
                    <div v-if="book.librate">
                        <q-knob
                            :model-value="book.librate"
                            :min="0"
                            :max="5"
                            size="18px"
                            font-size="12px"
                            :thickness="1"
                            :color="rateColor"
                            track-color="grey-4"
                            readonly
                        />

                        <q-tooltip :delay="500" anchor="top middle" content-style="font-size: 80%" max-width="400px">
                            Оценка {{ book.librate }}
                        </q-tooltip>
                    </div>
                    <div v-else style="width: 18px" />
                </div>
                <div v-else class="row justify-center" style="width: 18px">
                    <q-icon v-if="book.del" class="la la-trash text-bold text-red" size="18px">
                        <q-tooltip :delay="500" anchor="top middle" content-style="font-size: 80%" max-width="400px">
                            Удалено
                        </q-tooltip>
                    </q-icon>
                </div>
            </div>

            <div class="q-ml-sm clickable2" @click="selectTitle">
                {{ book.serno ? `${book.serno}. ` : '' }}
                <span class="text-blue-10">{{ bookTitle }}</span>
            </div>
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

        <div v-if="config.bookReadLink" class="q-ml-sm clickable" @click="readBook">
            (читать)
        </div>

        <div v-if="showGenres && book.genre" class="q-ml-sm">
            {{ bookGenre }}
        </div>

        <div v-show="false">
            {{ book }}
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
        showAuthor: Boolean,
    };

    showRate = true;
    showGenres = true;
    showDeleted = false;

    created() {
        this.loadSettings();
    }

    loadSettings() {
        const settings = this.settings;

        this.showRate = settings.showRate;
        this.showGenres = settings.showGenres;
        this.showDeleted = settings.showDeleted;
    }

    get config() {
        return this.$store.state.config;
    }

    get settings() {
        return this.$store.state.settings;
    }

    get bookTitle() {
        if (this.showAuthor && this.book.author) {
            let a = this.book.author.split(',');
            const author = a.slice(0, 2).join(', ') + (a.length > 2 ? ' и др.' : '');

            return `${author} - ${this.book.title}`;
        } else {
            return this.book.title;
        }
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

    get rateColor() {
        const rate = (this.book.librate > 5 ? 5 : this.book.librate);
        if (rate > 2)
            return `green-${(rate - 1)*2}`;
        else
            return `red-${10 - rate*2}`;
    }

    get bookGenre() {
        let result = [];
        const genre = new Set(this.book.genre.split(','));

        for (const section of this.genreTree) {
            for (const g of section.value)
                if (genre.has(g.value))
                    result.push(g.name);
        }

        return `(${result.join(' / ')})`;
    }

    selectTitle() {
        this.$emit('bookEvent', {action: 'titleClick', book: this.book});
    }

    download() {
        this.$emit('bookEvent', {action: 'download', book: this.book});
    }

    copyLink() {
        this.$emit('bookEvent', {action: 'copyLink', book: this.book});
    }

    readBook() {
        this.$emit('bookEvent', {action: 'readBook', book: this.book});
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