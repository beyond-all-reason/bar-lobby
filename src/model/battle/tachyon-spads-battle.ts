import { Static } from "@sinclair/typebox";
import { entries, objectKeys } from "jaz-ts-utils";
import { lobbySchema } from "tachyon-client";

import { AbstractBattle } from "@/model/battle/abstract-battle";
import { BattleOptions, Bot, StartBox, StartPosType } from "@/model/battle/types";
import { EngineVersionFormat, GameVersionFormat } from "@/model/formats";
import { User } from "@/model/user";

export class TachyonSpadsBattle extends AbstractBattle {
    protected lastBattleResponse?: Static<typeof lobbySchema>;
    protected responseHandlers: { [K in keyof Static<typeof lobbySchema>]: (data: Static<typeof lobbySchema>[K]) => void } = {
        bots: (data) => {
            const bots: Bot[] = entries(data).map(([botId, botData]) => {
                return {
                    playerId: botData.player_number,
                    teamId: botData.team_number,
                    name: botData.name,
                    ownerUserId: botData.owner_id,
                    aiOptions: {},
                    aiShortName: botData.ai_dll,
                    // TODO: other props
                };
            });

            this.bots.push(...bots);
        },
        disabled_units: (data) => {
            // TODO
        },
        engine_name: (data) => {
            // TODO
        },
        engine_version: (data) => {
            this.battleOptions.engineVersion = data as EngineVersionFormat;
        },
        founder_id: (data) => {
            // TODO
        },
        game_name: (data) => {
            this.battleOptions.gameVersion = data as GameVersionFormat;
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
            // TODO
        },
        map_hash: (data) => {
            // TODO
        },
        map_name: (data) => {
            this.battleOptions.map = data;
        },
        max_players: (data) => {
            // TODO
        },
        name: (data) => {
            this.battleOptions.title = data;
        },
        password: (data) => {
            // TODO
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
                startBoxes[teamId] = {
                    xPercent: startBox[0] / 200,
                    yPercent: startBox[1] / 200,
                    widthPercent: startBox[2] / 200 - startBox[0] / 200,
                    heightPercent: startBox[3] / 200 - startBox[1] / 200,
                };
            });
            this.battleOptions.startBoxes = startBoxes;
        },
        started_at: (data) => {
            // TODO
        },
        tags: (data) => {
            // TODO
            if (data["game/startpostype"] === "0") {
                this.battleOptions.startPosType = StartPosType.Fixed;
            } else if (data["game/startpostype"] === "1") {
                this.battleOptions.startPosType = StartPosType.Random;
            } else {
                this.battleOptions.startPosType = StartPosType.Boxes;
            }
        },
        type: (data) => {
            // TODO
        },
    };

    constructor(serverBattleResponse: Static<typeof lobbySchema>) {
        super({
            battleOptions: {} as BattleOptions,
            userIds: [],
            bots: [],
        });

        this.handleServerResponse(serverBattleResponse);
    }

    public handleServerResponse(battleUpdateResponse: Static<typeof lobbySchema>) {
        let partialBattleUpdateResponse: Partial<Static<typeof lobbySchema>> = {};

        if (this.lastBattleResponse) {
            const diff: Partial<Static<typeof lobbySchema>> = {};

            entries(this.lastBattleResponse).forEach(([key, value]) => {
                if (JSON.stringify(value) !== JSON.stringify(battleUpdateResponse[key])) {
                    Object.assign(diff, { [key]: battleUpdateResponse[key] });
                }
            });

            partialBattleUpdateResponse = diff;
            console.debug("Partial battle update diff", diff);
        } else {
            partialBattleUpdateResponse = battleUpdateResponse;
        }

        objectKeys(partialBattleUpdateResponse).forEach((key) => {
            const data = battleUpdateResponse[key];
            const responseHandler = this.responseHandlers[key] as any; // TODO: get rid of any
            responseHandler(data);
        });

        this.lastBattleResponse = battleUpdateResponse;
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
}
