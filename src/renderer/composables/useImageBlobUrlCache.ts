function base64ToBlobUrl(base64: string) {
    const byteString = atob(base64.split(",")[1]);
    const mimeString = base64.split(",")[0].split(":")[1].split(";")[0];
    const arrayBuffer = new Uint8Array(byteString.length);

    for (let i = 0; i < byteString.length; i++) {
        arrayBuffer[i] = byteString.charCodeAt(i);
    }

    const blob = new Blob([arrayBuffer], { type: mimeString });
    return URL.createObjectURL(blob);
}

const cache = new Map<string, string>();

export const useImageBlobUrlCache = () => {
    const base64 = (id: string, base64: string) => {
        if (cache.has(id)) {
            return cache.get(id);
        }
        const url = base64ToBlobUrl(base64);
        cache.set(id, url);
        return url;
    };

    const get = (id: string, blob: Blob) => {
        if (cache.has(id)) {
            return cache.get(id);
        }
        const url = URL.createObjectURL(blob);
        cache.set(id, url);
        return url;
    };

    return { base64, get };
};
