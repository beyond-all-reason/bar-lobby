import { TSchema } from "@sinclair/typebox";
import { ipcRenderer } from "electron";
import path from "path";
import { watch } from "vue";

import { AsbtractStoreAPI } from "$/api/abstract-store";

export class StoreAPI<T extends TSchema> extends AsbtractStoreAPI<T> {
    public async init() {
        await super.init();

        const name = path.parse(this.filePath).name;

        watch(
            () => this.model,
            async () => {
                await ipcRenderer.invoke(`store-update:${name}`, this.model);
            }
        );

        return this;
    }
}
