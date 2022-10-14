import { createApp } from 'vue';

import router from './router';
import store from './store';
import q from './quasar';

import App from './components/App.vue';

const app = createApp(App);

app.use(router);
app.use(store);
app.use(q.quasar, q.options);
q.init();

app.mount('#app');
