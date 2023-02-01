import { ipcRenderer } from "electron";
import { ToRefs, watch } from "vue";

import { AsbtractStoreAPI } from "$/api/abstract-store";

export class StoreAPI<T extends Record<string, unknown>> extends AsbtractStoreAPI<T> {
    public async init() {
        await super.init();

        for (const value of Object.values(this.model) as Array<ToRefs<T>>) {
            watch(value, async () => {
                await this.write();

                if (this.syncWithMain) {
                    ipcRenderer.invoke(`store-update:${this.name}`, this.serialize());
                }
            });
        }

        return this;
    }
}
