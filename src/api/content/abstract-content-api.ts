import type { DownloadInfo } from "@/model/downloads";
import { reactive } from "vue";

export class AbstractContentAPI {
    public currentDownloads: DownloadInfo[] = reactive([]);

    protected userDataDir: string;
    protected dataDir: string;

    constructor(userDataDir: string, dataDir: string) {
        this.userDataDir = userDataDir;
        this.dataDir = dataDir;
    }
}