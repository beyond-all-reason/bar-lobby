export type SetUndefinedValues<T> = { [K in keyof T]?: T[K] | undefined }; // TODO: move to jaz-ts-utils

export function assign<T>(target: T, source: SetUndefinedValues<T>) {
    for (const key in source) {
        if (source[key] !== undefined) {
            target[key] = source[key]!;
        }
    }

    return target;
}