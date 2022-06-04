import { objectKeys } from "jaz-ts-utils";

// TODO: move to jaz-ts-utils

/** Assign new values to an object while retaining the same object reference */
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
