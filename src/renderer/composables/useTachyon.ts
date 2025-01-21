export const useTachyon = () => {
    const subscribe = (callback) => {
        window.tachyon.onEvent(callback);
    };

    return {
        subscribe,
    };
};
