<template>
    <div class="row items-center q-my-sm no-wrap">
        <div class="row items-center">
            <div v-if="showRates || showDeleted">
                <div v-if="showRates && !book.del">
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
        </div>

        <div class="q-ml-sm column">
            <div v-if="(mode == 'series' || mode == 'title' || mode == 'extended') && bookAuthor" class="row">
                <div class="clickable2 text-green-10" @click.stop.prevent="emit('authorClick')">
                    {{ bookAuthor }}
                </div>
            </div>

            <div class="row items-center">
                <div v-if="book.serno" class="q-mr-xs">
                    {{ book.serno }}.
                </div>
                <div class="clickable2" :class="titleColor" @click.stop.prevent="emit('titleClick')">
                    {{ book.title }}
                </div>
                <div v-if="(mode == 'title' || mode == 'extended') && bookSeries" class="q-ml-xs clickable2" @click.stop.prevent="emit('seriesClick')">
                    {{ bookSeries }}
                </div>


                <div class="q-ml-sm">
                    {{ bookSize }}, {{ book.ext }}
                </div>

                <div v-if="showInfo" class="q-ml-sm clickable" @click.stop.prevent="emit('bookInfo')">
                    (инфо)
                </div>

                <div class="q-ml-sm clickable" @click.stop.prevent="emit('download')">
                    (скачать)
                </div>

                <div class="q-ml-sm clickable" @click.stop.prevent="emit('copyLink')">
                    <q-icon name="la la-copy" size="20px" />
                </div>

                <div v-if="showReadLink" class="q-ml-sm clickable" @click.stop.prevent="emit('readBook')">
                    (читать)
                </div>

                <div v-if="showGenres && book.genre" class="q-ml-sm">
                    {{ bookGenre }}
                </div>

                <div v-if="showDates && book.date" class="q-ml-sm">
                    {{ bookDate }}
                </div>
            </div>

            <div v-show="showJson && mode == 'extended'">
                <pre style="font-size: 80%">{{ book }}</pre>
            </div>
        </div>
    </div>
</template>

<script>
//-----------------------------------------------------------------------------
import vueComponent from '../../vueComponent.js';

import * as utils from '../../../share/utils';

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
        mode: String,
        genreMap: Object,
        showReadLink: Boolean,
        titleColor: { type: String, default: 'text-blue-10'},
    };

    showRates = true;
    showInfo = true;
    showGenres = true;
    showDeleted = false;
    showDates = false;
    showJson = false;

    created() {
        this.loadSettings();
    }

    loadSettings() {
        const settings = this.settings;

        this.showRates = settings.showRates;
        this.showInfo = settings.showInfo;
        this.showGenres = settings.showGenres;
        this.showDates = settings.showDates;
        this.showDeleted = settings.showDeleted;
        this.showJson = settings.showJson;
    }

    get settings() {
        return this.$store.state.settings;
    }

    get bookAuthor() {
        if (this.book.author) {
            let a = this.book.author.split(',');
            return a.slice(0, 3).join(', ') + (a.length > 3 ? ' и др.' : '');
        }

        return '';
    }

    get bookSeries() {
        if (this.book.series) {
            return `(Серия: ${this.book.series})`;
        }

        return '';
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
        const genre = this.book.genre.split(',');

        for (const g of genre) {
            const name = this.genreMap.get(g);
            if (name)
                result.push(name);
        }

        return `(${result.join(' / ')})`;
    }

    get bookDate() {
        if (!this.book.date)
            return '';

        return utils.sqlDateFormat(this.book.date);
    }

    emit(action) {
        this.$emit('bookEvent', {action, book: this.book});
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