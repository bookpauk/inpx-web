import { createRouter, createWebHashHistory } from 'vue-router';
import _ from 'lodash';

const Search = () => import('./components/Search/Search.vue');

const myRoutes = [
    ['/', Search],
    ['/:pathMatch(.*)*', null, null, '/'],
];

let routes = {};

for (let route of myRoutes) {
    const [path, component, name, redirect] = route;
    let cleanRoute = _.pickBy({path, component, name, redirect}, _.identity);
    
    let parts = cleanRoute.path.split('~');
    let f = routes;
    for (let part of parts) {
        const curRoute = _.assign({}, cleanRoute, { path: part });

        if (!f.children)
            f.children = [];
        let r = f.children;

        f = _.find(r, {path: part});
        if (!f) {
            r.push(curRoute);
            f = curRoute;
        }
    }
}
routes = routes.children;

export default createRouter({
    history: createWebHashHistory(),
    routes
});
