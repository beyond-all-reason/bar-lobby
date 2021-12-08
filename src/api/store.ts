import Ajv from "ajv";
import { reactive, ToRefs, toRefs, watch } from "vue";
import * as fs from "fs";
import * as path from "path";
import { shell } from "electron";
import { TObject } from "@sinclair/typebox";

export class StoreAPI<T extends Record<string, unknown>> {
    public model!: ToRefs<T>;
    
    protected filePath = path.join(window.info.userDataPath, this.filename);
    protected ajv = new Ajv({ coerceTypes: true, useDefaults: true });
    protected validator = this.ajv.compile(this.schema);
    protected fileHandle!: fs.promises.FileHandle;
    protected writeTimeout: NodeJS.Timeout | null = null;

    constructor(protected filename: string, protected schema: TObject<any>) {
    }

    public async init() {
        await this.readSettings();

        for (const setting of Object.values(this.model) as Array<ToRefs<T>>) {
            watch(setting, async () => {
                await this.writeSettings();
            });
        }

        return this;
    }

    public openFileInEditor() {
        shell.openExternal(this.filePath);
    }

    protected validateSettings(settings: any) : settings is T {
        const isValid = this.validator(settings);
        return isValid;
    }

    protected async readSettings() {
        try {
            this.fileHandle = await fs.promises.open(this.filePath, "r+");
        } catch {
            this.fileHandle = await fs.promises.open(this.filePath, "w+");
        }
        
        const fileBuffer = await this.fileHandle.readFile();
        const fileString = fileBuffer.toString();
        const model = (fileString ? JSON.parse(fileString) : {}) as T;
        this.validateSettings(model);
        this.model = toRefs<T>(reactive<T>(model) as any);

        if (!fileString) {
            await this.writeSettings();
        }
    }

    protected async writeSettings() {
        if (this.writeTimeout) {
            clearTimeout(this.writeTimeout);
        }

        this.writeTimeout = setTimeout(async () => {
            const obj: any = {};
            for (const key in this.model) {
                const setting = this.model[key as keyof T];
                obj[key] = setting.value;
            }

            await this.fileHandle.truncate(0);
            await this.fileHandle.write(JSON.stringify(obj, null, 4), 0);
        }, 100);
    }
}