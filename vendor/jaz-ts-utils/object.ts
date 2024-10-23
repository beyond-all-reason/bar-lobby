import { SetUndefinedValues } from "$/jaz-ts-utils/types";
import { DeepReadonly } from "$/jaz-ts-utils/types";

export function asArray<T>(target: T | T[]): T[] {
    if (Array.isArray(target)) {
        return target;
    } else {
        return [target];
    }
}

export type Entries<T> = { [K in keyof T]: [K, T[K]] }[keyof T];
export function entries<T extends object>(t: T): Entries<T>[] {
    return Object.entries(t) as Entries<T>[];
}

export const objectKeys = Object.keys as <T>(o: T) => Extract<keyof T, string>[];

export function randomFromArray<T>(arr: T[]): T | undefined {
    return arr[Math.floor(Math.random() * arr.length)];
}

export function lastInArray<T>(target: T[]): T | undefined {
    return target[target.length - 1];
}

export function firstInArray<T>(target: T[]): T | undefined {
    return target[0];
}

export function removeFromArray<T>(target: T[], item: T): T[] {
    const index = target.indexOf(item);
    if (index > -1) {
        target.splice(index, 1);
    }
    return target;
}

export function shuffle<T>(array: Readonly<T[]>): T[] {
    const arrayCopy = array.slice();

    let currentIndex = arrayCopy.length;
    let randomIndex = 0;

    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [arrayCopy[currentIndex], arrayCopy[randomIndex]] = [arrayCopy[randomIndex], arrayCopy[currentIndex]];
    }

    return arrayCopy;
}

// https://stackoverflow.com/a/62765924/1864403
// Remove this when groupBy is available in TS https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/groupBy
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function groupBy<T, K extends keyof any>(list: T[], getKey: (item: T) => K) {
    return list.reduce((previous, currentItem) => {
        const group = getKey(currentItem);
        if (!previous.get(group)) {
            previous.set(group, []);
        }
        previous.get(group)!.push(currentItem);
        return previous;
    }, new Map<K, T[]>());
}

export function deepFreeze<T>(obj: T): DeepReadonly<T> {
    objectKeys(obj).forEach((prop) => {
        if (typeof obj[prop] === "object" && !Object.isFrozen(obj[prop])) {
            deepFreeze(obj[prop]);
        }
    });
    return Object.freeze(obj) as DeepReadonly<T>;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
// https://javascript.plainenglish.io/deep-clone-an-object-and-preserve-its-type-with-typescript-d488c35e5574
export function clone<T>(source: T): T {
    return Array.isArray(source)
        ? source.map((item) => clone(item))
        : source instanceof Date
          ? new Date(source.getTime())
          : source && typeof source === "object"
            ? Object.getOwnPropertyNames(source).reduce(
                  (o, prop) => {
                      Object.defineProperty(o, prop, Object.getOwnPropertyDescriptor(source, prop)!);
                      o[prop] = clone((source as { [key: string]: any })[prop]);
                      return o;
                  },
                  Object.create(Object.getPrototypeOf(source))
              )
            : (source as T);
}

export function assign<T>(target: T, source: SetUndefinedValues<T>) {
    for (const key in source) {
        if (source[key] !== undefined) {
            target[key] = source[key]!;
        }
    }

    return target;
}

export function clearObject(target: any) {
    for (const key in target) {
        delete target[key];
    }
}

export function arrayToMap<T extends Record<string, unknown>, K extends keyof T>(arr: T[], uniqueIndexKey: K): Map<T[K], T> {
    const map = new Map<T[K], T>();
    for (const obj of arr) {
        map.set(obj[uniqueIndexKey], obj);
    }
    return map;
}
