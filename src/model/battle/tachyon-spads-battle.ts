import { Static } from "@sinclair/typebox";
import { entries, objectKeys } from "jaz-ts-utils";
import { lobbySchema } from "tachyon-client";

import { AbstractBattle } from "@/model/battle/abstract-battle";
import { Bot, Player, Spectator } from "@/model/battle/participants";
import { BattleOptions, StartBox } from "@/model/battle/types";
import { EngineVersionFormat, GameVersionFormat } from "@/model/formats";

export class TachyonSpadsBattle extends AbstractBattle {
    protected lastBattleResponse?: Static<typeof lobbySchema>;
    protected responseHandlers: { [K in keyof Static<typeof lobbySchema>]: (data: Static<typeof lobbySchema>[K]) => void } = {
        bots: (data) => {
            // TODO
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
            // TODO
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
        },
        type: (data) => {
            // TODO
        },
    };

    constructor(serverBattleResponse: Static<typeof lobbySchema>) {
        super({
            battleOptions: {} as BattleOptions,
            participants: [],
        });

        this.handleServerResponse(serverBattleResponse);

        const bots: Bot[] = entries(serverBattleResponse.bots).map(([botId, botData]) => {
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

        serverBattleResponse.players.forEach((userId) => {
            const user = api.session.getUserById(userId);
            if (!user) {
                console.error(`User ${userId} not found in session`);
                return;
            }
            if (user.battleStatus.spectator) {
                this.participants.push({
                    type: "spectator",
                    userId: user.userId,
                });
            } else {
                this.participants.push({
                    type: "player",
                    userId: user.userId,
                    playerId: user.battleStatus.playerId,
                    teamId: user.battleStatus.teamId,
                    // TODO: other props
                });
            }
        });

        this.participants.push(...bots);
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

    public updateParticipant(name: string, updatedProperties: Partial<Player | Bot | Spectator>) {
        // TODO
    }

    public say(message: string) {
        api.comms.request("c.lobby.message", {
            message,
        });
    }

    public addParticipant(participant: Player | Bot | Spectator) {
        // TODO
    }

    public removeParticipant(participant: Player | Bot | Spectator) {
        // TODO
    }

    public playerToSpectator(player: Player) {
        // TODO
    }

    public spectatorToPlayer(spectator: Spectator, teamId: number) {
        // TODO
    }

    public changeContenderTeam(contender: Player | Bot, teamId: number) {
        // TODO
    }

    public setBotOptions(botName: string, options: Record<string, any>) {
        // TODO
    }
}
