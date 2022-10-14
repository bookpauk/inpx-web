import localForage from 'localforage';
//import _ from 'lodash';
import * as utils from '../../share/utils';

const maxDataSize = 100*1024*1024;//100 Mb

const abStore = localForage.createInstance({
    name: 'authorBooksStorage'
});

class AuthorBooksStorage {
    constructor() {
    }

    async init() {
        this.cleanStorage(); //no await
    }

    async setData(key, data) {
        if (typeof data !== 'string')
            throw new Error('AuthorBooksStorage: data must be a string');

        await abStore.setItem(key, data);
        await abStore.setItem(`addTime-${key}`, Date.now());    
    }

    async getData(key) {
        const item = await abStore.getItem(key);
        
        //обновим addTime
        if (item !== undefined)
            abStore.setItem(`addTime-${key}`, Date.now());//no await

        return item;
    }

    async removeData(key) {
        await abStore.removeItem(key);
        await abStore.removeItem(`addTime-${key}`);
    }

    async cleanStorage() {
        await utils.sleep(5000);

        while (1) {// eslint-disable-line no-constant-condition
            let size = 0;
            let min = Date.now();
            let toDel = null;
            for (const key of (await abStore.keys())) {
                if (key.indexOf('addTime-') == 0)
                    continue;

                const item = await abStore.getItem(key);
                const addTime = await abStore.getItem(`addTime-${key}`);

                size += item.length;

                if (addTime < min) {
                    toDel = key;
                    min = addTime;
                }
            }

            if (size > maxDataSize && toDel) {
                await this.removeData(toDel);
            } else {
                break;
            }
        }
    }

}

export default new AuthorBooksStorage();