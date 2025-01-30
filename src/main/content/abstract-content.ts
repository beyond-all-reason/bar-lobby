import { Signal } from "$/jaz-ts-utils/signal";
import { DownloadInfo } from "./downloads";

export abstract class AbstractContentAPI<ID, T> {
    public availableVersions: Map<ID, T> = new Map();
    public currentDownloads: DownloadInfo[] = [];

    public onDownloadStart: Signal<DownloadInfo> = new Signal();
    public onDownloadComplete: Signal<DownloadInfo> = new Signal();
    public onDownloadProgress: Signal<DownloadInfo> = new Signal();
    public onDownloadFail: Signal<DownloadInfo> = new Signal();

    public async init() {
        return this;
    }

    public abstract isVersionInstalled(id: ID): boolean;

    public abstract uninstallVersion(version: ID | T): Promise<void>;

    protected async downloadStarted(downloadInfo: DownloadInfo) {
        this.onDownloadStart.dispatch(downloadInfo);
    }

    protected async downloadComplete(downloadInfo: DownloadInfo) {
        this.onDownloadComplete.dispatch(downloadInfo);
    }

    protected async downloadProgress(downloadInfo: DownloadInfo) {
        this.onDownloadProgress.dispatch(downloadInfo);
    }

    protected async downloadFailed(downloadInfo: DownloadInfo) {
        this.onDownloadFail.dispatch(downloadInfo);
    }
}
