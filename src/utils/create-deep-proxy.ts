// TODO: move to jaz-ts-utils

// eslint-disable-next-line @typescript-eslint/ban-types
export function createDeepProxy<T extends object>(obj: T, proxyHandler: (breadcrumb: string) => ProxyHandler<T>, breadcrumb: string) : T {
    const newObj: any = Array.isArray(obj) ? [] : {};

    for (const key in obj) {
        const value = obj[key];
        if (typeof value === "object") {
            newObj[key] = createDeepProxy<any>(value, proxyHandler, breadcrumb + "." + key);
        } else {
            breadcrumb += "." + key;
            newObj[key] = value;
        }
    }

    return new Proxy(newObj, proxyHandler(breadcrumb));
}