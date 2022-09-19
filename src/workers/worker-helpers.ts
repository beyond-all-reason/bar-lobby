// TODO: move these to jaz-ts-utils

export type WorkerMessageData = string | boolean | number | bigint | symbol | Date | null | undefined | WorkerMessageData[] | { [key: string | number]: WorkerMessageData };

/**
 * Used by the main process to provide hooks for functions in a web worker.
 *
 * Function arguments and return values must be primitive object data and won't work with things such as class instances, buffers or circular references.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function hookWorkerFunction<T extends (...args: any[]) => Promise<WorkerMessageData>>(worker: Worker, func: T): T {
    worker.addEventListener("error", (err) => {
        console.error(err);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wrappedFunc = ((...args: any[]) => {
        return new Promise((resolve) => {
            const onMessageListener = ({ data: message }: MessageEvent) => {
                if (message?.function === func.name && message.result) {
                    worker.removeEventListener("message", onMessageListener);
                    resolve(message.result);
                }
            };

            worker.addEventListener("message", onMessageListener);

            worker.postMessage({
                function: func.name,
                args: args,
            });
        });
    }) as T;

    return wrappedFunc;
}

/**
 * Used in a web worker to expose functions so they can be hooked into by the main process.
 *
 * Function arguments and return values must be primitive object data and won't work with things such as class instances, buffers or circular references.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function exposeWorkerFunction<T extends (...args: any[]) => Promise<WorkerMessageData>>(func: T): T {
    self.addEventListener("message", async ({ data: message }) => {
        if (message?.function === func.name && message.args) {
            const result = await func(...message.args);

            self.postMessage({
                function: func.name,
                result,
            });
        }
    });

    return func;
}
