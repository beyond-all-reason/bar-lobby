import { Signal } from "jaz-ts-utils";
import { reactive } from "vue";

import type { DownloadInfo } from "@/model/downloads";

export abstract class AbstractContentAPI {
    public currentDownloads: DownloadInfo[] = reactive([]);
    public onDownloadStart: Signal<DownloadInfo> = new Signal();
    public onDownloadComplete: Signal<DownloadInfo> = new Signal();
}
