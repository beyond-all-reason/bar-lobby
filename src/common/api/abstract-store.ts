import type { Static, TObject } from "@sinclair/typebox";
import type { ValidateFunction } from "ajv";
import Ajv from "ajv";
import fs from "fs";
import { assign } from "jaz-ts-utils";
import path from "path";
import { reactive, watch } from "vue";

export abstract class AsbtractStoreAPI<T extends TObject> {
    public readonly model: Static<T> = reactive({});
    public readonly filePath: string;

    protected readonly schema: T;
    protected readonly ajv: Ajv;
    protected readonly validator: ValidateFunction;

    constructor(file: string, schema: T) {
        this.filePath = file;
        this.schema = schema;
        this.ajv = new Ajv({ coerceTypes: true, useDefaults: true });
        this.validator = this.ajv.compile(this.schema);
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

        watch(this.model, () => {
            this.write();
        });

        return this;
    }

    protected async read() {
        const modelStr = await fs.promises.readFile(this.filePath, { encoding: "utf-8" });
        const model = JSON.parse(modelStr);
        const isValid = this.validator(model);
        if (isValid) {
            assign(this.model, model as Static<T>);
        } else {
            console.error(`Error validating file store: ${this.filePath}`, this.validator.errors);
        }
    }

    protected async write() {
        await fs.promises.writeFile(this.filePath, JSON.stringify(this.model, null, 4));
    }
}
