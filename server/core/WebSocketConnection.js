const isBrowser = (typeof window !== 'undefined');

const utils = {
    sleep: (ms) => { return new Promise(resolve => setTimeout(resolve, ms)); }
};

const cleanPeriod = 5*1000;//5 секунд

class WebSocketConnection {
    //messageLifeTime в секундах (проверка каждый cleanPeriod интервал)
    constructor(url, openTimeoutSecs = 10, messageLifeTimeSecs = 30, webSocketOptions = {}) {
        this.WebSocket = (isBrowser ? WebSocket : require('ws'));
        this.url = url;
        this.webSocketOptions = webSocketOptions;

        this.ws = null;

        this.listeners = [];
        this.messageQueue = [];
        this.messageLifeTime = messageLifeTimeSecs*1000;
        this.openTimeout = openTimeoutSecs*1000;
        this.requestId = 0;

        this.wsErrored = false;
        this.closed = false;

        this.connecting = false;
        this.periodicClean();//no await
    }

    //рассылаем сообщение и удаляем те обработчики, которые его получили
    emit(mes, isError) {
        const len = this.listeners.length;
        if (len > 0) {
            let newListeners = [];
            for (const listener of this.listeners) {
                let emitted = false;
                if (isError) {
                    listener.onError(mes);
                    emitted = true;
                } else {
                    if ( (listener.requestId && mes.requestId && listener.requestId === mes.requestId) ||
                        (!listener.requestId && !mes.requestId) ) {
                        listener.onMessage(mes);
                        emitted = true;
                    }
                }

                if (!emitted)
                    newListeners.push(listener);
            }
            this.listeners = newListeners;
        }
        
        return this.listeners.length != len;
    }

    get isOpen() {
        return (this.ws && this.ws.readyState == this.WebSocket.OPEN);
    }

    processMessageQueue() {
        let newMessageQueue = [];
        for (const message of this.messageQueue) {
            if (!this.emit(message.mes)) {
                newMessageQueue.push(message);
            }
        }

        this.messageQueue = newMessageQueue;
    }

    _open() {
        return new Promise((resolve, reject) => { (async() => {
            if (this.closed)
                reject(new Error('Этот экземпляр класса уничтожен. Пожалуйста, создайте новый.'));

            if (this.connecting) {
                let i = this.openTimeout/100;
                while (i-- > 0 && this.connecting) {
                    await utils.sleep(100);
                }
            }

            //проверим подключение, и если нет, то подключимся заново
            if (this.isOpen) {
                resolve(this.ws);
            } else {
                this.connecting = true;
                this.terminate();

                if (isBrowser) {
                    const protocol = (window.location.protocol == 'https:' ? 'wss:' : 'ws:');
                    const url = this.url || `${protocol}//${window.location.host}/ws`;
                    this.ws = new this.WebSocket(url);
                } else {
                    this.ws = new this.WebSocket(this.url, this.webSocketOptions);
                }

                const onopen = () => {
                    this.connecting = false;
                    resolve(this.ws);
                };

                const onmessage = (data) => {
                    try {
                        if (isBrowser)
                            data = data.data;
                        const mes = JSON.parse(data);
                        this.messageQueue.push({regTime: Date.now(), mes});

                        this.processMessageQueue();
                    } catch (e) {
                        this.emit(e.message, true);
                    }
                };

                const onerror = (e) => {
                    this.emit(e.message, true);
                    reject(new Error(e.message));
                };

                const onclose = (e) => {
                    this.emit(e.message, true);
                    reject(new Error(e.message));
                };

                if (isBrowser) {
                    this.ws.onopen = onopen;
                    this.ws.onmessage = onmessage;
                    this.ws.onerror = onerror;
                    this.ws.onclose = onclose;
                } else {
                    this.ws.on('open', onopen);
                    this.ws.on('message', onmessage);
                    this.ws.on('error', onerror);
                    this.ws.on('close', onclose);
                }

                await utils.sleep(this.openTimeout);
                reject(new Error('Соединение не удалось'));
            }
        })() });
    }

    //timeout в секундах (проверка каждый cleanPeriod интервал)
    message(requestId, timeoutSecs = 4) {
        return new Promise((resolve, reject) => {
            this.listeners.push({
                regTime: Date.now(),
                requestId,
                timeout: timeoutSecs*1000,
                onMessage: (mes) => {
                    resolve(mes);
                },
                onError: (mes) => {
                    reject(new Error(mes));
                }
            });
            
            this.processMessageQueue();
        });
    }

    async send(req, timeoutSecs = 4) {
        await this._open();
        if (this.isOpen) {
            this.requestId = (this.requestId < 1000000 ? this.requestId + 1 : 1);
            const requestId = this.requestId;//реентерабельность!!!

            this.ws.send(JSON.stringify(Object.assign({requestId}, req)));

            let resp = {};
            try {
                resp = await this.message(requestId, timeoutSecs);
            } catch(e) {
                this.terminate();
                throw new Error('WebSocket не отвечает');
            }

            if (resp._rok) {                
                return requestId;
            } else {
                throw new Error('Запрос не принят сервером');
            }
        } else {
            throw new Error('WebSocket коннект закрыт');
        }
    }

    terminate() {
        if (this.ws) {
            if (isBrowser) {
                this.ws.close();
            } else {
                this.ws.terminate();
            }
        }
        this.ws = null;
    }

    close() {
        this.terminate();
        this.closed = true;
    }

    async periodicClean() {
        while (!this.closed) {
            try {
                const now = Date.now();
                //чистка listeners
                let newListeners = [];
                for (const listener of this.listeners) {
                    if (now - listener.regTime < listener.timeout) {
                        newListeners.push(listener);
                    } else {
                        if (listener.onError)
                            listener.onError('Время ожидания ответа истекло');
                    }
                }
                this.listeners = newListeners;

                //чистка messageQueue
                let newMessageQueue = [];
                for (const message of this.messageQueue) {
                    if (now - message.regTime < this.messageLifeTime) {
                        newMessageQueue.push(message);
                    }
                }
                this.messageQueue = newMessageQueue;
            } catch(e) {
                //
            }

            await utils.sleep(cleanPeriod);
        }
    }
}

module.exports = WebSocketConnection;