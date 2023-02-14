import type { TObject } from "@sinclair/typebox";
import type { ValidateFunction } from "ajv";
import Ajv from "ajv";
import { shell } from "electron";
import * as fs from "fs";
import * as path from "path";
import type { ToRefs } from "vue";
import { reactive, toRefs } from "vue";

/**
 * TODO
 * - replace generic T extends TSchema
 * - make model reaction object
 */

export abstract class AsbtractStoreAPI<T extends Record<string, unknown>> {
    public model!: ToRefs<T>;

    protected filePath: string;
    protected name: string;
    protected schema: TObject<any>;
    protected ajv: Ajv;
    protected validator: ValidateFunction;
    protected fileHandle!: fs.promises.FileHandle;
    protected writeTimeout: NodeJS.Timeout | null = null;

    constructor(file: string, schema: TObject<any>, protected syncWithMain = false) {
        this.filePath = file;

        this.name = path.parse(file).name;

        this.schema = schema;
        this.ajv = new Ajv({ coerceTypes: true, useDefaults: true });
        this.validator = this.ajv.compile(this.schema);
    }

    public async init() {
        const dir = path.parse(this.filePath).dir;

        await fs.promises.mkdir(dir, { recursive: true });

        await this.read();

        return this;
    }

    public openFileInEditor() {
        shell.openExternal(this.filePath);
    }

    protected validate(store: any): store is T {
        const isValid = this.validator(store);
        return isValid;
    }

    protected async read() {
        try {
            this.fileHandle = await fs.promises.open(this.filePath, "r+");
        } catch {
            this.fileHandle = await fs.promises.open(this.filePath, "w+");
        }

        const fileBuffer = await this.fileHandle.readFile();
        const fileString = fileBuffer.toString();
        const model = (fileString ? JSON.parse(fileString) : {}) as T;
        this.validate(model);
        this.model = toRefs<T>(reactive<T>(model) as any);

        if (!fileString) {
            await this.write();
        }
    }

    protected async write() {
        if (this.writeTimeout) {
            clearTimeout(this.writeTimeout);
        }

        this.writeTimeout = setTimeout(async () => {
            const obj: Record<string, unknown> = {};
            for (const key in this.model) {
                const value = this.model[key as keyof T];
                obj[key] = value.value;
            }

            await this.fileHandle.truncate(0);
            await this.fileHandle.write(JSON.stringify(obj, null, 4), 0);
        }, 100);
    }

    protected serialize() {
        const obj: Record<string, unknown> = {};

        for (const [key, val] of Object.entries(this.model)) {
            obj[key] = val.value;
        }

        return obj;
    }
}
