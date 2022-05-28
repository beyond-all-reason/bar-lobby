/* eslint-disable @typescript-eslint/no-explicit-any */
import type { TObject } from "@sinclair/typebox";
import type { ValidateFunction } from "ajv";
import Ajv from "ajv";
import { app, ipcMain, ipcRenderer, shell } from "electron";
import * as fs from "fs";
import * as path from "path";
import type { ToRefs } from "vue";
import { reactive, toRefs, watch } from "vue";

export class StoreAPI<T extends Record<string, unknown>> {
    public model!: ToRefs<T>; // TODO: replace with reactive object

    protected name: string;
    protected filename: string;
    protected schema: TObject<any>;
    protected dir: string;
    protected filePath: string;
    protected ajv: Ajv;
    protected validator: ValidateFunction;
    protected fileHandle!: fs.promises.FileHandle;
    protected writeTimeout: NodeJS.Timeout | null = null;

    constructor(name: string, schema: TObject<any>, protected syncWithMain = false) {
        this.name = name;
        this.filename = `${name}.json`;

        let userDataPath = "";
        if (process.type === "renderer") {
            userDataPath = api.info.userDataPath;
        } else {
            userDataPath = app.getPath("userData");
        }

        this.dir = path.join(userDataPath, "store");
        this.filePath = path.join(this.dir, this.filename);

        this.schema = schema;
        this.ajv = new Ajv({ coerceTypes: true, useDefaults: true });
        this.validator = this.ajv.compile(this.schema);
    }

    public async init() {
        await fs.promises.mkdir(this.dir, { recursive: true });

        await this.read();

        // TODO: refactor to watch file and pull changes into model without retriggering a write
        if (process.type === "renderer") {
            for (const value of Object.values(this.model) as Array<ToRefs<T>>) {
                watch(value, async () => {
                    await this.write();

                    if (this.syncWithMain) {
                        ipcRenderer.invoke(`store-update:${this.name}`, this.serialize());
                    }
                });
            }
        } else if (process.type === "browser") {
            ipcMain.handle(`store-update:${this.name}`, async (event, model: T) => {
                for (const [key, val] of Object.entries(model)) {
                    this.model[key].value = val;
                }
            });
        }

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
