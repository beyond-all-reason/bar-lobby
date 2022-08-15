import { computed, ComputedRef } from "vue";

import { AiContentAPI } from "@/api/content/ai-content";
import { EngineContentAPI } from "@/api/content/engine-content";
import { GameContentAPI } from "@/api/content/game-content";
import { MapContentAPI } from "@/api/content/map-content";
import { ReplayContentAPI } from "@/api/content/replay-content";
import { DownloadInfo } from "@/model/downloads";

export class ContentAPI {
    public engine: EngineContentAPI;
    public game: GameContentAPI;
    public maps: MapContentAPI;
    public ai: AiContentAPI;
    public replays: ReplayContentAPI;

    public downloads: ComputedRef<DownloadInfo[]>;
    public currentDownloadCurrent: ComputedRef<number>;
    public currentDownloadTotal: ComputedRef<number>;
    public currentDownloadPercent: ComputedRef<number>;

    constructor(userDataDir: string, dataDir: string) {
        this.engine = new EngineContentAPI(userDataDir, dataDir);
        this.game = new GameContentAPI(userDataDir, dataDir);
        this.maps = new MapContentAPI(userDataDir, dataDir);
        this.ai = new AiContentAPI(userDataDir, dataDir);
        this.replays = new ReplayContentAPI(userDataDir, dataDir);

        this.downloads = computed(() => [...this.engine.currentDownloads, ...this.game.currentDownloads, ...this.maps.currentDownloads]);
        this.currentDownloadCurrent = computed(() => this.downloads.value.reduce((acc, cur) => acc + cur.currentBytes, 0));
        this.currentDownloadTotal = computed(() => this.downloads.value.reduce((acc, cur) => acc + cur.totalBytes, 0));
        this.currentDownloadPercent = computed(() => this.currentDownloadCurrent.value / this.currentDownloadTotal.value);
    }

    public async init() {
        return this;
    }
}
