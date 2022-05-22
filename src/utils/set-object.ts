import { objectKeys } from "jaz-ts-utils";

export function setObject<T extends Record<string, unknown> | Array<unknown>>(object: T, newObject: T) {
    if (Array.isArray(object) && Array.isArray(newObject)) {
        object.length = 0;

        for (const entry of newObject) {
            object.push(entry);
        }
    } else {
        objectKeys(object).forEach((key) => {
            delete object[key];
        });

        objectKeys(newObject).forEach((key) => {
            object[key] = newObject[key];
        });
    }

    return object;
}
