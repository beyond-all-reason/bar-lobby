import { Static } from "@sinclair/typebox";
import { assign, entries, objectKeys } from "jaz-ts-utils";
import { battleSchema, lobbySchema } from "tachyon-client";

import { AbstractBattle } from "@/model/battle/abstract-battle";
import { Bot, StartBox, StartPosType } from "@/model/battle/types";
import { User } from "@/model/user";

type LobbyType = Static<typeof lobbySchema>;
type BattleType = Static<typeof battleSchema>;
type LobbyResponseHandlers = { [K in keyof Required<LobbyType>]: (data: Required<LobbyType[K]>) => void };
export class TachyonSpadsBattle extends AbstractBattle {
    protected responseHandlers: { [K in keyof Required<BattleType>]: (data: Required<BattleType[K]>) => void } = {
        lobby: (data) => {
            const lobbyResponseHandlers: LobbyResponseHandlers = {
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
                    // using member_list handler instead
                },
                start_rectangles: (data) => {
                    const startBoxes: StartBox[] = [];
                    entries(data).forEach(([teamId, startBox]) => {
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
                type: (data) => {
                    // TODO
                },
            };

            objectKeys(data).forEach((key) => {
                const value = data[key];
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const responseHandler = lobbyResponseHandlers[key] as any;
                if (responseHandler) {
                    responseHandler(value);
                }
            });
        },
        bots: (data) => {
            if (data) {
                entries(data).forEach(([botId, botData]) => {
                    const bot: Bot = {
                        name: botData.name,
                        playerId: botData.player_number,
                        teamId: botData.team_number,
                        ownerUserId: botData.owner_id,
                        aiOptions: {},
                        aiShortName: botData.ai_dll,
                    };

                    const existingBot = this.bots.find((bot) => bot.name === botId);

                    if (!existingBot) {
                        this.bots.push(bot);
                    } else {
                        assign(existingBot, bot);
                    }
                });
            }
        },
        member_list: (data) => {
            if (data) {
                const newUserIds = data.map((client) => client.userid);

                for (const userId of this.userIds) {
                    if (!newUserIds.includes(userId)) {
                        this.userIds.delete(userId);
                    }
                }

                for (const userId of newUserIds) {
                    if (!this.battleUsers.value.find((user) => user.userId === userId)) {
                        const user = api.session.getUserById(userId);
                        if (!user) {
                            console.error("Battle update received for unknown user", userId);
                            continue;
                        }
                        this.userIds.add(userId);
                    }
                }
            }
        },
        modoptions: (data) => {
            if (data) {
                this.battleOptions.gameOptions = data;

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
    };

    constructor(serverBattleResponse: BattleType) {
        super({
            battleOptions: {
                founderId: -1,
                engineVersion: "",
                gameOptions: {},
                gameVersion: "",
                id: -1,
                isHost: false,
                locked: false,
                map: "",
                mapOptions: {},
                maxPlayers: 16,
                password: null,
                passworded: false,
                restrictions: [],
                startBoxes: [],
                startPosType: StartPosType.Fixed,
                startTime: null,
                title: "",
            },
            userIds: [],
            bots: [],
        });

        this.handleServerResponse(serverBattleResponse);
    }

    public handleServerResponse(battleUpdateResponse: Partial<Omit<BattleType, "lobby"> & { lobby?: Partial<BattleType["lobby"]> }>) {
        objectKeys(battleUpdateResponse).forEach((key) => {
            const data = battleUpdateResponse[key];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const responseHandler = this.responseHandlers[key] as any;
            if (responseHandler) {
                responseHandler(data);
            }
        });
    }

    public changeEngine(engineVersion: string) {
        console.warn("not implemented: changeEngine");
        // TODO
    }

    public changeGame(gameVersion: string) {
        console.warn("not implemented: changeGame");
        // TODO
    }

    public changeMap(map: string) {
        api.comms.request("c.lobby.message", {
            message: `!map ${map}`,
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public setGameOptions(options: Record<string, any>) {
        console.warn("not implemented: setGameOptions");
        // TODO
    }

    public updateParticipant(name: string, updatedProperties: Partial<User | Bot>) {
        console.warn("not implemented: updateParticipant");
        // TODO
    }

    public say(message: string) {
        api.comms.request("c.lobby.message", {
            message,
        });
    }

    public addBot(participant: User | Bot) {
        console.warn("not implemented: addParticipant");
        // TODO
    }

    public removeBot(participant: User | Bot) {
        console.warn("not implemented: removeParticipant");
        // TODO
    }

    public playerToSpectator(player: User) {
        api.comms.request("c.lobby.update_status", {
            client: {
                player: false,
            },
        });
    }

    public spectatorToPlayer(spectator: User, teamId: number) {
        api.comms.request("c.lobby.update_status", {
            client: {
                player: true,
                team_number: teamId,
            },
        });
    }

    public changeContenderTeam(contender: User | Bot, teamId: number) {
        api.comms.request("c.lobby.update_status", {
            client: {
                team_number: teamId,
            },
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public setBotOptions(botName: string, options: Record<string, any>) {
        console.warn("not implemented: setBotOptions");
        // TODO
    }

    public async leave() {
        api.comms.request("c.lobby.leave", {});
        api.session.onlineBattle.value = null;
        api.router.replace("/multiplayer/custom");
    }
}
