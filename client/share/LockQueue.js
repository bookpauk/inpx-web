class LockQueue {
    constructor(queueSize) {
        this.queueSize = queueSize;
        this.freed = true;
        this.waitingQueue = [];
    }

    //async
    get(take = true) {
        return new Promise((resolve, reject) => {
            if (this.freed) {
                if (take)
                    this.freed = false;
                resolve();
                return;
            }

            if (this.waitingQueue.length < this.queueSize) {
                this.waitingQueue.push({resolve, reject});
            } else {
                reject(new Error('Lock queue is too long'));
            }
        });
    }

    ret() {
        if (this.waitingQueue.length) {
            this.waitingQueue.shift().resolve();
        } else {
            this.freed = true;
        }
    }

    //async
    wait() {
        return this.get(false);
    }

    retAll() {
        while (this.waitingQueue.length) {
            this.waitingQueue.shift().resolve();
        }
    }

    errAll(error = 'rejected') {
        while (this.waitingQueue.length) {
            this.waitingQueue.shift().reject(new Error(error));
        }
    }

}

export default LockQueue;