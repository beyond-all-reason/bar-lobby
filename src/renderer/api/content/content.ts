import { computed, ComputedRef } from "vue";

import { EngineContentAPI } from "@/api/content/engine-content";
import { GameContentAPI } from "@/api/content/game-content";
import { MapContentAPI } from "@/api/content/map-content";
import { ReplayContentAPI } from "@/api/content/replay-content";
import { DownloadInfo } from "@/model/downloads";

export class ContentAPI {
    public engine: EngineContentAPI;
    public game: GameContentAPI;
    public maps: MapContentAPI;
    public replays: ReplayContentAPI;

    public downloads: ComputedRef<DownloadInfo[]>;
    public currentDownloadCurrent: ComputedRef<number>;
    public currentDownloadTotal: ComputedRef<number>;
    public currentDownloadPercent: ComputedRef<number>;

    constructor() {
        this.engine = new EngineContentAPI();
        this.game = new GameContentAPI();
        this.maps = new MapContentAPI();
        this.replays = new ReplayContentAPI();

        this.downloads = computed(() => [...this.engine.currentDownloads, ...this.game.currentDownloads, ...this.maps.currentDownloads]);
        this.currentDownloadCurrent = computed(() => this.downloads.value.reduce((acc, cur) => acc + cur.currentBytes, 0));
        this.currentDownloadTotal = computed(() => this.downloads.value.reduce((acc, cur) => acc + cur.totalBytes, 0));
        this.currentDownloadPercent = computed(() => this.currentDownloadCurrent.value / this.currentDownloadTotal.value);

        // this.engine.onDownloadStart.add((data) => {
        //     const battle = api.session.onlineBattle.value;
        //     const me = api.session.onlineUser;

        //     if (battle && battle.battleOptions.engineVersion === data.name) {
        //         api.comms.request("c.lobby.update_status", {
        //             client: {
        //                 sync: {
        //                     engine: 0,
        //                     game: me.battleStatus.sync.game,
        //                     map: me.battleStatus.sync.map,
        //                 },
        //             },
        //         });
        //     }
        // });

        // this.engine.onDownloadComplete.add((data) => {
        //     const battle = api.session.onlineBattle.value;
        //     const me = api.session.onlineUser;

        //     if (battle && battle.battleOptions.engineVersion === data.name) {
        //         api.comms.request("c.lobby.update_status", {
        //             client: {
        //                 sync: {
        //                     engine: 1,
        //                     game: me.battleStatus.sync.game,
        //                     map: me.battleStatus.sync.map,
        //                 },
        //             },
        //         });
        //     }
        // });

        // this.game.onDownloadStart.add((data) => {
        //     const battle = api.session.onlineBattle.value;
        //     const me = api.session.onlineUser;

        //     if (battle && battle.battleOptions.gameVersion === data.name) {
        //         api.comms.request("c.lobby.update_status", {
        //             client: {
        //                 sync: {
        //                     engine: me.battleStatus.sync.engine,
        //                     game: 0,
        //                     map: me.battleStatus.sync.map,
        //                 },
        //             },
        //         });
        //     }
        // });

        // this.game.onDownloadComplete.add((data) => {
        //     const battle = api.session.onlineBattle.value;
        //     const me = api.session.onlineUser;

        //     if (battle && battle.battleOptions.gameVersion === data.name) {
        //         api.comms.request("c.lobby.update_status", {
        //             client: {
        //                 sync: {
        //                     engine: me.battleStatus.sync.engine,
        //                     game: 1,
        //                     map: me.battleStatus.sync.map,
        //                 },
        //             },
        //         });
        //     }
        // });

        // this.maps.onDownloadStart.add((data) => {
        //     const battle = api.session.onlineBattle.value;
        //     const me = api.session.onlineUser;

        //     if (battle && battle.battleOptions.map === data.name) {
        //         api.comms.request("c.lobby.update_status", {
        //             client: {
        //                 sync: {
        //                     engine: me.battleStatus.sync.engine,
        //                     game: me.battleStatus.sync.game,
        //                     map: 0,
        //                 },
        //             },
        //         });
        //     }
        // });

        // this.maps.onDownloadComplete.add((data) => {
        //     const battle = api.session.onlineBattle.value;
        //     const me = api.session.onlineUser;

        //     if (battle && battle.battleOptions.map === data.name) {
        //         api.comms.request("c.lobby.update_status", {
        //             client: {
        //                 sync: {
        //                     engine: me.battleStatus.sync.engine,
        //                     game: me.battleStatus.sync.game,
        //                     map: 1,
        //                 },
        //             },
        //         });
        //     }
        // });
    }

    public async init() {
        await this.engine.init();
        await this.game.init();
        await this.maps.init();
        await this.replays.init();

        return this;
    }
}
