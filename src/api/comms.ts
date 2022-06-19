import { entries } from "jaz-ts-utils";
import { TachyonClient } from "tachyon-client";

import { BattleConfig } from "@/model/battle/abstract-battle";
import { Bot, Player, Spectator } from "@/model/battle/participants";
import { TachyonSpadsBattle } from "@/model/battle/tachyon-spads-battle";
import { EngineVersionFormat, GameVersionFormat } from "@/model/formats";
import { tachyonLog } from "@/utils/tachyon-log";

export class CommsAPI extends TachyonClient {
    constructor(config: ConstructorParameters<typeof TachyonClient>[0]) {
        super({
            ...config,
            verbose: true,
            logMethod: tachyonLog,
        });

        // TODO: need to attach to connect event somehow
        this.onResponse("s.auth.login").add(() => {
            this.socket?.on("connect", () => {
                console.log(`Connected to ${config.host}:${config.port}`);
                api.session.offlineMode.value = false;
            });

            this.socket?.on("close", () => {
                console.log(`Disconnected from ${config.host}:${config.port}`);
                api.session.offlineMode.value = true;
            });
            // TODO: attempt reconnect on disconnect
        });

        this.onResponse("s.system.server_event").add((data) => {
            if (data.event === "server_restart") {
                api.session.offlineMode.value = true;

                api.alerts.alert({
                    type: "notification",
                    severity: "warning",
                    content: "Server is restarting",
                });
            }
        });

        this.onResponse("s.system.server_event").add((data) => {
            if (data.event === "stop") {
                api.alerts.alert({
                    type: "notification",
                    severity: "warning",
                    content: "Server is shutting down",
                });
            }
        });

        this.onResponse("s.lobby.join_response").add((data) => {
            if (data.result === "approve") {
                // TODO: might need to request fresh client info here for cases where we don't already know about them (e.g. server forcing us into a battle)

                // TODO: if we already know about this battle, then simply update its existing object

                const bots: Bot[] = entries(data.lobby.bots).map(([botId, botData]) => {
                    return {
                        playerId: botData.player_number,
                        teamId: botData.team_number,
                        name: botData.name,
                        ownerUserId: botData.owner_id,
                        aiOptions: {},
                        aiShortName: botData.ai_dll,
                        type: "bot",
                        // TODO: other props
                    };
                });

                const participants: Array<Player | Spectator | Bot> = [];
                data.lobby.players.forEach((userId) => {
                    const user = api.session.getUserById(userId);
                    if (!user) {
                        console.error(`User ${userId} not found in session`);
                        return;
                    }
                    if (user.battleStatus.spectator) {
                        participants.push({
                            type: "spectator",
                            userId: user.userId,
                        });
                    } else {
                        participants.push({
                            type: "player",
                            userId: user.userId,
                            playerId: user.battleStatus.playerId,
                            teamId: user.battleStatus.teamId,
                            // TODO: other props
                        });
                    }
                });

                participants.push(...bots);

                const battleConfig: BattleConfig = {
                    battleOptions: {
                        engineVersion: data.lobby.engine_version as EngineVersionFormat,
                        id: data.lobby.id,
                        gameVersion: data.lobby.game_name as GameVersionFormat,
                        mapFileName: data.lobby.map_name,
                        isHost: false,
                        startPosType: parseInt(data.lobby.tags["game/startpostype"]),
                        startBoxes: entries(data.lobby.start_rectangles).map(([teamId, startBox]) => {
                            return { xPercent: startBox[0] / 200, yPercent: startBox[1] / 200, widthPercent: startBox[2] / 200, heightPercent: startBox[3] / 200 };
                        }),
                        gameOptions: data.lobby.tags,
                        mapOptions: {}, // TODO
                        restrictions: [], // TODO
                    },
                    participants,
                };

                api.session.onlineBattle = new TachyonSpadsBattle(battleConfig);

                api.router.push("/multiplayer/battle");
            }
        });
    }
}
