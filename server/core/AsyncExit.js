const defaultTimeout = 15*1000;//15 sec
const exitSignals = ['SIGINT', 'SIGTERM', 'SIGBREAK', 'SIGHUP', 'uncaughtException'];

//singleton
let instance = null;

class AsyncExit {
    constructor(signals = exitSignals, codeOnSignal = 2) {
        if (!instance) {
            this.onSignalCallbacks = new Map();
            this.callbacks = new Map();
            this.afterCallbacks = new Map();
            this.exitTimeout = defaultTimeout;
            
            this._init(signals, codeOnSignal);

            instance = this;
        }

        return instance;
    }

    _init(signals, codeOnSignal) {
        const runSingalCallbacks = async(signal, err, origin) => {
            if (!this.onSignalCallbacks.size) {
                console.error(`Uncaught signal "${signal}" received, error: "${(err.stack ? err.stack : err)}"`);
            }

            for (const signalCallback of this.onSignalCallbacks.keys()) {
                try {
                    await signalCallback(signal, err, origin);
                } catch(e) {
                    console.error(e);
                }
            }
        };

        for (const signal of signals) {
            process.once(signal, async(err, origin) => {
                await runSingalCallbacks(signal, err, origin);
                this.exit(codeOnSignal);
            });
        }
    }

    onSignal(signalCallback) {
        if (!this.onSignalCallbacks.has(signalCallback)) {
            this.onSignalCallbacks.set(signalCallback, true);
        }
    }

    add(exitCallback) {
        if (!this.callbacks.has(exitCallback)) {
            this.callbacks.set(exitCallback, true);
        }
    }

    addAfter(exitCallback) {
        if (!this.afterCallbacks.has(exitCallback)) {
            this.afterCallbacks.set(exitCallback, true);
        }
    }

    remove(exitCallback) {
        if (this.callbacks.has(exitCallback)) {
            this.callbacks.delete(exitCallback);
        }
        if (this.afterCallbacks.has(exitCallback)) {
            this.afterCallbacks.delete(exitCallback);
        }
    }

    setExitTimeout(timeout) {
        this.exitTimeout = timeout;
    }

    exit(code = 0) {
        if (this.exiting)
            return;

        this.exiting = true;

        const timer = setTimeout(() => { process.exit(code); }, this.exitTimeout);

        (async() => {
            for (const exitCallback of this.callbacks.keys()) {
                try {
                    await exitCallback();
                } catch(e) {
                    console.error(e);
                }
            }

            for (const exitCallback of this.afterCallbacks.keys()) {
                try {
                    await exitCallback();
                } catch(e) {
                    console.error(e);
                }
            }

            clearTimeout(timer);
            //console.log('Exited gracefully');
            process.exit(code);
        })();
    }
}

module.exports = AsyncExit;
