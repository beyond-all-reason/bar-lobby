import type { Static, TObject } from "@sinclair/typebox";
import type { ValidateFunction } from "ajv";
import Ajv from "ajv";
import fs from "fs";
import path from "path";
import { logger } from "@main/utils/logger";

const log = logger("file-store.ts");

export class FileStore<T extends TObject> {
    public readonly model: Static<T> = {};
    public readonly filePath: string;

    protected readonly schema: T;
    protected readonly ajv: Ajv;
    protected readonly validator: ValidateFunction;

    constructor(filePath: string, schema: T, defaultModel?: Static<T>) {
        this.filePath = filePath;
        this.schema = schema;
        this.ajv = new Ajv({ coerceTypes: true, useDefaults: true });
        this.validator = this.ajv.compile(this.schema);
        if (defaultModel) {
            this.model = defaultModel;
        }
    }

    public async init() {
        const dir = path.parse(this.filePath).dir;
        await fs.promises.mkdir(dir, { recursive: true });
        if (fs.existsSync(this.filePath)) {
            await this.read();
        } else {
            this.validator(this.model);
            await this.write();
        }
        return this;
    }

    // could throw if the data is invalid
    public async update(data: Partial<T>) {
        // not great since we're modifying the model before validation
        Object.assign(this.model, data);
        const isValid = this.validator(this.model);
        if (isValid) {
            await this.write();
        } else {
            log.error(`Error validating file: ${this.filePath}`, this.validator.errors);
        }
        return this.model;
    }

    protected async read() {
        try {
            const modelStr = await fs.promises.readFile(this.filePath, { encoding: "utf-8" });
            const model = JSON.parse(modelStr);
            const isValid = this.validator(model);
            if (isValid) {
                Object.assign(this.model, model as Static<T>);
            } else {
                log.error(`Error validating file: ${this.filePath}`, this.validator.errors);
            }
        } catch (e) {
            log.error(`Error reading file: ${this.filePath}`, e);
        }
    }

    protected async write() {
        await fs.promises.writeFile(this.filePath, JSON.stringify(this.model, null, 4));
    }
}
