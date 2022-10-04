import { Signal } from "jaz-ts-utils";
import { reactive } from "vue";

import type { DownloadInfo } from "@/model/downloads";

export abstract class AbstractContentAPI {
    public currentDownloads: DownloadInfo[] = reactive([]);
    public onDownloadStart: Signal<DownloadInfo> = new Signal();
    public onDownloadComplete: Signal<DownloadInfo> = new Signal();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public async init(...args: any[]) {
        return this;
    }
}
