import Ajv from "ajv";
import { reactive, ToRefs, toRefs, watch } from "vue";
import * as fs from "fs";
import * as path from "path";
import { app, ipcMain, ipcRenderer, shell } from "electron";
import { TObject } from "@sinclair/typebox";

export class StoreAPI<T extends Record<string, unknown>> {
    public model!: ToRefs<T>;
    
    protected dir: string;
    protected filePath: string;
    protected ajv = new Ajv({ coerceTypes: true, useDefaults: true });
    protected validator = this.ajv.compile(this.schema);
    protected fileHandle!: fs.promises.FileHandle;
    protected writeTimeout: NodeJS.Timeout | null = null;

    constructor(protected filename: string, protected schema: TObject<any>) {
        let userDataPath = "";
        if (process.type === "renderer") {
            userDataPath = window.info.userDataPath;
        } else {
            userDataPath = app.getPath("userData");
        }
        
        this.dir = path.join(userDataPath, "store");
        this.filePath = path.join(this.dir, filename);
    }

    public async init() {
        await fs.promises.mkdir(this.dir, { recursive: true });

        await this.read();

        if (process.type === "renderer") {
            for (const value of Object.values(this.model) as Array<ToRefs<T>>) {
                watch(value, async () => {
                    await this.write();

                    ipcRenderer.invoke("store-update", this.serialize());
                });
            }
        } else if (process.type === "browser") {
            ipcMain.handle("store-update", async (event, model: Record<string, unknown>) => {
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

    protected validate(store: any) : store is T {
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
            const obj: any = {};
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