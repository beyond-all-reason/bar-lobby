import { Static, TObject } from "@sinclair/typebox";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import fs from "fs";

import { Optionals } from "$/jaz-ts-utils/types";

export type LoadConfigOptions<T extends TObject> = {
    filePath?: string;
    config?: Static<T>;
    schema: T;
};

export const defaultLoadConfigOptions: Optionals<LoadConfigOptions<any>> = {
    filePath: "config.json",
    config: undefined,
};

const ajv = new Ajv({
    coerceTypes: true,
    useDefaults: true,
});
addFormats(ajv);

/**
 * Define a config structure in JSONSchema using Typebox and then load it
 */
export async function loadConfig<T extends TObject>(options: LoadConfigOptions<T>): Promise<Static<T>> {
    const finalOptions = Object.assign({}, defaultLoadConfigOptions, options);

    try {
        const validator = ajv.compile(finalOptions.schema);
        let config: Static<T> | undefined;
        if (finalOptions.config) {
            config = finalOptions.config;
        } else {
            const configFile = await fs.promises.readFile(finalOptions.filePath, { encoding: "utf-8" });
            config = JSON.parse(configFile) as Static<T>;
        }
        const isValid = validator(config);
        if (!isValid) {
            throw validator.errors;
        }
        return config as Static<T>;
    } catch (err) {
        console.error(`error loading ${options.filePath}`, err);
        throw err;
    }
}
