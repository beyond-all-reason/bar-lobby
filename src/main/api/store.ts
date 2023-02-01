import { ipcMain } from "electron";

import { AsbtractStoreAPI } from "$/api/abstract-store";

export class StoreAPI<T extends Record<string, unknown>> extends AsbtractStoreAPI<T> {
    public async init() {
        await super.init();

        ipcMain.handle(`store-update:${this.name}`, async (event, model: T) => {
            for (const [key, val] of Object.entries(model)) {
                this.model[key].value = val;
            }
        });

        return this;
    }
}
