import { Static, TObject } from "@sinclair/typebox";
import { ipcMain } from "electron";
import { assign } from "jaz-ts-utils";
import path from "path";

import { AsbtractStoreAPI } from "$/api/abstract-store";

export class StoreAPI<T extends TObject> extends AsbtractStoreAPI<T> {
    public async init() {
        await super.init();

        const name = path.parse(this.filePath).name;

        ipcMain.on(`store-update:${name}`, (event, model: Static<T>) => {
            assign(this.model, model);
        });

        return this;
    }
}
