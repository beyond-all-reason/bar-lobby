export function keys<T extends Record<string, unknown>>(obj: T) {
    return {
        [Symbol.iterator]: function* () {
            for (const key in obj) {
                if (Object.hasOwn(obj, key)) {
                    yield key as keyof T;
                }
            }
        },
    };
}
