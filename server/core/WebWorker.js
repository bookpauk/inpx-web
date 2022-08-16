const WorkerState = require('./WorkerState');

//server states:
const ssNormal = 'normal';
const ssDbLoading = 'db_loading';

//singleton
let instance = null;

class WebWorker {
    constructor(config) {
        if (!instance) {
            this.config = config;
            this.workerState = new WorkerState();
            
            this.wState = this.workerState.getControl('server_state');
            this.myState = '';

            this.loadOrCreateDb();//no await

            instance = this;
        }

        return instance;
    }

    checkMyState() {
        if (this.myState != ssNormal)
            throw new Error('server_busy');
    }

    setMyState(newState) {
        this.myState = newState;
        this.wState.set({state: newState});
    }

    async loadOrCreateDb() {
        this.setMyState(ssDbLoading);

        try {
            //
        } catch (e) {
            //
        } finally {
            this.setMyState(ssNormal);
        }
    }
}

module.exports = WebWorker;