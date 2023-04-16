import { Static } from "@sinclair/typebox";
import { assign, entries, objectKeys } from "jaz-ts-utils";
import { battleSchema, lobbySchema } from "tachyon-client";
import { computed, ComputedRef, Ref, ref } from "vue";

import { AbstractBattle } from "@/model/battle/abstract-battle";
import { Bot, SpadsBattleOptions, StartBox, StartPosType } from "@/model/battle/battle-types";
import { SpadsVote } from "@/model/spads/spads-types";
import { User } from "@/model/user";
import { spadsBoxToStartBox, StartBoxOrientation } from "@/utils/start-boxes";

type LobbyType = Static<typeof lobbySchema>;
type BattleType = Static<typeof battleSchema>;
type LobbyResponseHandlers = { [K in keyof Required<LobbyType>]: (data: Required<LobbyType[K]>) => void };

export class SpadsBattle extends AbstractBattle<SpadsBattleOptions> {
    public readonly currentVote: Ref<SpadsVote | null> = ref(null);
    public readonly founder: ComputedRef<User>;
    public readonly isLockedOrPassworded: ComputedRef<boolean>;
    public readonly myQueuePosition: ComputedRef<number | null>;

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
                    this.battleOptions.ip = data;
                },
                port: (data) => {
                    this.battleOptions.port = data;
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
                start_areas: (data) => {
                    const startBoxes: StartBox[] = [];
                    entries(data).forEach(([teamId, startBox]) => {
                        startBoxes[teamId] = spadsBoxToStartBox(startBox);
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

                this.bots.forEach((bot, i) => {
                    if (!(bot.name in data)) {
                        this.bots.splice(i, 1);
                    }
                });
            }
        },
        member_list: (data) => {
            if (data) {
                const newUsers = data.map((client) => {
                    const user = api.session.getUserById(client.userid);
                    if (!user) {
                        console.error(`Trying to add unknown user to battle: ${client.userid}`);
                    }
                    return user;
                });

                // remove users that left
                for (const user of this.users) {
                    if (!newUsers.includes(user)) {
                        this.users.splice(this.users.indexOf(user), 1);
                    }
                }

                // add users that joined
                for (const user of newUsers) {
                    if (!user) {
                        continue;
                    }
                    if (!this.users.includes(user)) {
                        this.users.push(user);
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
        script_password: (data) => {
            this.battleOptions.scriptPassword = data ?? null;
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
                ip: null,
                port: null,
                isHost: false,
                locked: false,
                map: "",
                mapOptions: {},
                maxPlayers: 16,
                password: null,
                scriptPassword: null,
                passworded: false,
                restrictions: [],
                startBoxes: [],
                startPosType: StartPosType.Fixed,
                startTime: null,
                title: "",
                preset: "",
                joinQueueUserIds: [],
                autoBalance: "",
                balanceMode: "",
                nbTeams: 0,
                teamSize: 0,
            },
            users: [],
            bots: [],
        });

        this.handleServerResponse(serverBattleResponse);

        this.founder = computed(() => api.session.getUserById(this.battleOptions.founderId)!);
        this.isLockedOrPassworded = computed(() => this.battleOptions.locked || this.battleOptions.passworded);
        this.myQueuePosition = computed(() => {
            const queuePosIndex = this.battleOptions.joinQueueUserIds.indexOf(api.session.onlineUser.userId);
            if (queuePosIndex === -1) {
                return null;
            }
            return queuePosIndex + 1;
        });
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

    public override async open() {
        super.open();

        await api.comms.request("c.user.list_users_from_ids", { id_list: this.users.map((user) => user.userId), include_clients: true });

        this.updateSync();
    }

    public override async leave() {
        super.leave();

        await api.comms.request("c.lobby.leave");
    }

    public start() {
        if (this.battleOptions.startTime) {
            api.comms.request("c.lobby.message", {
                message: "!joinas spec",
            });

            api.game.launch(this);
        } else {
            api.comms.request("c.lobby.message", {
                message: "!cv start",
            });
        }
    }

    public setEngine(engineVersion: string) {
        console.warn("not implemented: changeEngine");
        // TODO
    }

    public setGame(gameVersion: string) {
        console.warn("not implemented: changeGame");
        // TODO
    }

    public setMap(map: string) {
        api.comms.request("c.lobby.message", {
            message: `!map ${map}`,
        });
    }

    public setStartPosType(startPosType: StartPosType) {
        api.comms.request("c.lobby.message", {
            message: `!startPosType ${startPosType}`,
        });
    }

    // This is intentionally a simple implementation, a more robust version will be made if/when
    // the new lobby supports custom boxes and/or polygons for start areas
    public setStartBoxes(orientation: StartBoxOrientation, size: number) {
        let message = "";
        switch (orientation) {
            case StartBoxOrientation.EastVsWest:
                message = `!split v ${size}`;
                break;
            case StartBoxOrientation.NorthVsSouth:
                message = `!split h ${size}`;
                break;
            case StartBoxOrientation.NorthwestVsSouthEast:
                message = `!split c1 ${size}`;
                break;
            case StartBoxOrientation.NortheastVsSouthwest:
                message = `!split c2 ${size}`;
                break;
        }
        api.comms.request("c.lobby.message", { message });
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

    public addBot(participant: Bot) {
        api.comms.request("c.lobby.add_bot", {
            name: participant.name,
            ai_dll: participant.aiShortName,
            status: {
                player_number: participant.playerId,
                team_number: participant.teamId,
                side: 1,
                team_color: "#f00",
            },
        });
    }

    public removeBot(participant: Bot) {
        api.comms.request("c.lobby.remove_bot", {
            name: participant.name,
        });
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

    public setContenderTeam(contender: User | Bot, teamId: number) {
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

    protected updateSync() {
        const sync = { engine: 0, game: 0, map: 0 };

        if (api.content.engine.isVersionInstalled(this.battleOptions.engineVersion)) {
            sync.engine = 1;
        } else {
            const dl = api.content.engine.currentDownloads.find((dl) => dl.name === this.battleOptions.engineVersion);
            if (dl) {
                sync.engine = dl.currentBytes / dl.totalBytes;
            }
        }

        if (api.content.game.isVersionInstalled(this.battleOptions.gameVersion)) {
            sync.game = 1;
        } else {
            const dl = api.content.game.currentDownloads.find((dl) => dl.name === this.battleOptions.gameVersion);
            if (dl) {
                sync.game = dl.currentBytes / dl.totalBytes;
            }
        }

        if (api.content.maps.isVersionInstalled(this.battleOptions.map)) {
            sync.map = 1;
        } else {
            const dl = api.content.maps.currentDownloads.find((dl) => dl.name === this.battleOptions.map);
            if (dl) {
                sync.map = dl.currentBytes / dl.totalBytes;
            }
        }

        api.comms.request("c.lobby.update_status", {
            client: { sync },
        });
    }
}
