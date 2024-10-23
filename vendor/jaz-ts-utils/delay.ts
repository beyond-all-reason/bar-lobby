export function delay(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
            resolve();
        }, ms);
        if (signal) {
            signal.addEventListener("abort", () => {
                clearTimeout(timeout);
                reject(new Error("Delay aborted"));
            });
        }
    });
}
