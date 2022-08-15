import { Signal } from "jaz-ts-utils";
import { reactive } from "vue";

import type { DownloadInfo } from "@/model/downloads";

export abstract class AbstractContentAPI {
    public currentDownloads: DownloadInfo[] = reactive([]);
    public onDownloadComplete: Signal<DownloadInfo> = new Signal();

    protected userDataDir: string;
    protected dataDir: string;

    constructor(userDataDir: string, dataDir: string) {
        this.userDataDir = userDataDir;
        this.dataDir = dataDir;
    }
}
