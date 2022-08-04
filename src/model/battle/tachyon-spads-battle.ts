import { Static } from "@sinclair/typebox";
import { entries, objectKeys } from "jaz-ts-utils";
import { battleSchema, lobbySchema } from "tachyon-client";

import { AbstractBattle } from "@/model/battle/abstract-battle";
import { BattleOptions, Bot, StartBox, StartPosType } from "@/model/battle/types";
import { User } from "@/model/user";

export type BattleResponseData = Static<typeof lobbySchema> & { bots: Static<typeof battleSchema>["bots"] } & { modoptions: Static<typeof battleSchema>["modoptions"] };
export type BattleResponseHandlers = { [K in keyof Required<BattleResponseData>]: (data: Required<BattleResponseData[K]>) => void };
export type PartialBattleData = Partial<BattleResponseData>;

export class TachyonSpadsBattle extends AbstractBattle {
    protected responseHandlers: BattleResponseHandlers = {
        bots: (data) => {
            if (data) {
                entries(data).forEach(([botId, botData]) => {
                    this.bots.push({
                        playerId: botData.player_number,
                        teamId: botData.team_number,
                        name: botData.name,
                        ownerUserId: botData.owner_id,
                        aiOptions: {},
                        aiShortName: botData.ai_dll,
                        // TODO: other props
                    });
                });
            }
        },
        disabled_units: (data) => {
            // TODO
        },
        engine_name: (data) => {
            this.battleOptions.engineVersion = data;
        },
        engine_version: (data) => {
            this.battleOptions.engineVersion = data;
        },
        founder_id: (data) => {
            this.battleOptions.founderId = data;
        },
        game_name: (data) => {
            this.battleOptions.gameVersion = data;
        },
        id: (data) => {
            this.battleOptions.id = data;
        },
        in_progress: (data) => {
            // TODO
        },
        ip: (data) => {
            // TODO
        },
        locked: (data) => {
            this.battleOptions.locked = data;
        },
        map_hash: (data) => {
            // TODO
        },
        map_name: (data) => {
            this.battleOptions.map = data;
        },
        max_players: (data) => {
            this.battleOptions.maxPlayers = data;
        },
        name: (data) => {
            this.battleOptions.title = data;
        },
        passworded: (data) => {
            this.battleOptions.passworded = data;
        },
        players: (data) => {
            for (const userId of this.userIds) {
                if (!data.includes(userId)) {
                    this.userIds.splice(this.userIds.indexOf(userId), 1);
                }
            }
            for (const userId of data) {
                if (!this.battleUsers.value.find((user) => user.userId === userId)) {
                    const user = api.session.getUserById(userId);
                    if (!user) {
                        console.error("Battle update received for unknown user", userId);
                        continue;
                    }
                    this.userIds.push(userId);
                }
            }
        },
        start_rectangles: (data) => {
            const startBoxes: StartBox[] = [];
            entries(data).forEach(([teamId, startBox]) => {
                // TODO: first property is the area shape, currently only accounting for "rect"
                startBoxes[teamId] = {
                    xPercent: startBox[1] / 200,
                    yPercent: startBox[2] / 200,
                    widthPercent: startBox[3] / 200 - startBox[1] / 200,
                    heightPercent: startBox[4] / 200 - startBox[2] / 200,
                };
            });
            this.battleOptions.startBoxes = startBoxes;
        },
        started_at: (data) => {
            if (data) {
                this.battleOptions.startTime = new Date(data * 1000);
            } else {
                this.battleOptions.startTime = null;
            }
        },
        modoptions: (data) => {
            if (data) {
                // TODO
                if (data["game/startpostype"] === "0") {
                    this.battleOptions.startPosType = StartPosType.Fixed;
                } else if (data["game/startpostype"] === "1") {
                    this.battleOptions.startPosType = StartPosType.Random;
                } else {
                    this.battleOptions.startPosType = StartPosType.Boxes;
                }
            }
        },
        type: (data) => {
            // TODO
        },
    };

    constructor(serverBattleResponse: BattleResponseData) {
        super({
            battleOptions: {} as BattleOptions,
            userIds: [],
            bots: [],
        });

        this.handleServerResponse(serverBattleResponse);
    }

    public handleServerResponse(battleUpdateResponse: PartialBattleData) {
        objectKeys(battleUpdateResponse).forEach((key) => {
            const data = battleUpdateResponse[key];
            const responseHandler = this.responseHandlers[key] as any; // TODO: get rid of any
            if (responseHandler) {
                responseHandler(data);
            } else {
                console.warn(`No response handler for ${key} property`, key);
            }
        });
    }

    public changeEngine(engineVersion: string) {
        // TODO
    }

    public changeGame(gameVersion: string) {
        // TODO
    }

    public changeMap(map: string) {
        api.comms.request("c.lobby.message", {
            message: `!map ${map}`,
        });
    }

    public setGameOptions(options: Record<string, any>) {
        // TODO
    }

    public updateParticipant(name: string, updatedProperties: Partial<User | Bot>) {
        // TODO
    }

    public say(message: string) {
        api.comms.request("c.lobby.message", {
            message,
        });
    }

    public addParticipant(participant: User | Bot) {
        // TODO
    }

    public removeParticipant(participant: User | Bot) {
        // TODO
    }

    public playerToSpectator(player: User) {
        // TODO
    }

    public spectatorToPlayer(spectator: User, teamId: number) {
        // TODO
    }

    public changeContenderTeam(contender: User | Bot, teamId: number) {
        // TODO
    }

    public setBotOptions(botName: string, options: Record<string, any>) {
        // TODO
    }

    public async leave() {
        const response = await api.comms.request("c.lobby.leave", {});
        if (response.result === "success") {
            api.session.onlineBattle = null;
            api.router.replace("/multiplayer/custom");
        }
    }
}
