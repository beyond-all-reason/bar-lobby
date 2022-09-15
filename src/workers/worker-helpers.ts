// TODO: move these to jaz-ts-utils

/**
 * Used by the main process to provide hooks for functions in a web worker
 */
export function createWorkerFunctions<T extends Record<string, (...args: any[]) => Promise<any>>>(worker: Worker, functions: T): T {
    worker.addEventListener("error", (err) => {
        console.error(err);
    });

    const wrappedFunctions: Record<string, (...args: any[]) => Promise<any>> = {};

    for (const functionName in functions) {
        wrappedFunctions[functionName] = (...args: any) => {
            return new Promise((resolve) => {
                const onMessageListener = ({ data: message }: MessageEvent) => {
                    if (message?.function === functionName && message.result) {
                        worker.removeEventListener("message", onMessageListener);
                        resolve(message.result);
                    }
                };

                worker.addEventListener("message", onMessageListener);

                worker.postMessage({
                    function: functionName,
                    args: args,
                });
            });
        };
    }

    return wrappedFunctions as T;
}

/**
 * Used in a web worker to expose functions so they can be hooked into by the main process
 */
export function exposeWorkerFunctions<T extends Record<string, (...args: any[]) => Promise<any>>>(functions: T): T {
    self.addEventListener("message", async ({ data: message }) => {
        if (message?.function && message.args) {
            const func = functions[message.function];
            const result = await func(...message.args);

            self.postMessage({
                function: func.name,
                result,
            });
        }
    });

    return functions;
}
