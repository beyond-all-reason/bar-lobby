import { Signal } from "jaz-ts-utils";

export interface WorkerMessage {
    channel: string;
    data: any;
}

abstract class WorkerWrapper {
    protected messageHandlers: { [channel: string]: Signal<any> } = {};

    public send(channel: string, data?: any) : void {
        //
    }

    public on(channel: string) : Signal<any> {
        if (!this.messageHandlers[channel]) {
            this.messageHandlers[channel] = new Signal();
        }

        return this.messageHandlers[channel];
    }

    public invoke(channel: string, data?: any) {
        return new Promise<any>(resolve => {
            this.on(channel).addOnce((data: any) => resolve(data));
            this.send(channel, data);
        });
    }

    protected onMessage(event: MessageEvent) : void {
        const workerMessage: WorkerMessage = event.data;
        if (this.messageHandlers[workerMessage.channel]) {
            this.messageHandlers[workerMessage.channel].dispatch(workerMessage.data);
        }
    }
}

export class BetterWorkerHost extends WorkerWrapper {
    protected worker: Worker;

    // would be nice if it were possible to pass the worker filepath and initialise it internally,
    // but doesn't seem to play nice with webpack/electron
    constructor(worker: Worker) {
        super();
        this.worker = worker;
        this.worker.onmessage = (event) => this.onMessage(event);

        this.worker.addEventListener("error", (err) => {
            console.error("Worker error", err);
        });
    }

    public override send(channel: string, data?: any) {
        this.worker.postMessage({ channel, data });
    }
}

export class BetterWorker extends WorkerWrapper {
    constructor(protected debug = false) {
        super();

        addEventListener("message", (event) => this.onMessage(event));

        if (this.debug) {
            process.on("warning", (err) => {
                console.warn(err.stack);
            });

            process.on("uncaughtException", (err) => {
                console.warn(err.stack);
            });
        }
    }

    public override send(channel: string, data?: any) {
        postMessage({ channel, data });
    }
}