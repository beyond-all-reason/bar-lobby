import { Signal } from "jaz-ts-utils";
import { reactive } from "vue";

import type { DownloadInfo } from "@/model/downloads";

export abstract class AbstractContentAPI<T> {
    public installedVersions: T[] = reactive([]);
    public currentDownloads: DownloadInfo[] = reactive([]);
    public onDownloadStart: Signal<DownloadInfo> = new Signal();
    public onDownloadComplete: Signal<DownloadInfo> = new Signal();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public async init(...args: any[]) {
        return this;
    }

    public abstract isVersionInstalled(id: string): boolean;

    public abstract uninstallVersion(version: T): Promise<void>;

    protected async downloadStarted(downloadInfo: DownloadInfo) {
        this.onDownloadStart.dispatch(downloadInfo);
    }

    protected async downloadComplete(downloadInfo: DownloadInfo) {
        this.onDownloadComplete.dispatch(downloadInfo);
    }
}
