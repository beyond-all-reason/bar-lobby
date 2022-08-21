import { Static } from "@sinclair/typebox";
import { assign } from "jaz-ts-utils";
import { battleSchema, ResponseType, TachyonClient } from "tachyon-client";

import { TachyonSpadsBattle } from "@/model/battle/tachyon-spads-battle";
import { tachyonLog } from "@/utils/tachyon-log";
export class CommsAPI extends TachyonClient {
    constructor(config: ConstructorParameters<typeof TachyonClient>[0]) {
        super({
            ...config,
            verbose: true,
            logMethod: tachyonLog,
        });

        this.onConnect.add(() => {
            console.log(`Connected to ${config.host}:${config.port}`);
            api.session.offlineMode.value = false;

            this.socket?.on("close", () => {
                console.log(`Disconnected from ${config.host}:${config.port}`);
                api.session.offlineMode.value = true;
            });
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

        this.onResponse("s.user.user_and_client_list").add(({ clients, users }) => {
            for (const client of clients) {
                updateUser(client.userid, undefined, client);
            }

            for (const user of users) {
                updateUser(user.id, user);
            }
        });

        const joinBattle = (data: Static<typeof battleSchema>) => {
            let battle = api.session.getBattleById(data.lobby.id);
            if (!battle) {
                battle = new TachyonSpadsBattle(data);
            }

            battle.handleServerResponse(data);

            // TODO: remove this when server fixes adding the joining client to member_list
            battle.userIds.add(api.session.currentUser.userId);

            api.session.onlineBattle.value = battle;

            api.router.push("/multiplayer/battle");
        };

        this.onResponse("s.lobby.join_response").add((data) => {
            if (data.result === "approve") {
                joinBattle(data);
            }
        });

        this.onResponse("s.lobby.force_join").add((data) => {
            joinBattle(data);
        });

        this.onResponse("s.lobby.updated").add((data) => {
            const battle = api.session.getBattleById(data.lobby.id);
            if (battle) {
                battle.handleServerResponse(data);
            } else {
                console.warn(`Trying to update battle but battle not found: ${data}`);
            }
        });

        this.onResponse("s.lobby.update_values").add((data) => {
            const battle = api.session.getBattleById(data.lobby_id);
            if (battle) {
                battle.handleServerResponse({
                    lobby: data.new_values,
                });
            } else {
                console.warn(`Trying to update battle but battle not found: ${data}`);
            }
        });

        this.onResponse("s.lobby.set_modoptions").add((data) => {
            const battle = api.session.onlineBattle.value;
            if (battle) {
                battle.handleServerResponse({
                    modoptions: data.new_options,
                });
            }
        });

        this.onResponse("s.lobby.updated_client_battlestatus").add(({ client }) => {
            updateUser(client.userid, undefined, client);

            const battle = api.session.onlineBattle.value;
            if (battle && battle.battleOptions.founderId === client.userid) {
                if (client.in_game) {
                    api.game.launch(battle);
                }
            }
        });

        this.onResponse("s.lobby.add_user").add((data) => {
            const user = api.session.getUserById(data.joiner_id);
            const battle = api.session.getBattleById(data.lobby_id);
            if (user && battle) {
                battle.userIds.add(user.userId);
            }
        });

        this.onResponse("s.lobby.remove_user").add((data) => {
            const user = api.session.getUserById(data.leaver_id);
            const battle = api.session.getBattleById(data.lobby_id);
            if (user && battle) {
                // TODO: add player to battle
            }
        });

        this.onResponse("s.lobby.add_start_area").add((data) => {
            const battle = api.session.getBattleById(data.lobby_id);
            if (battle) {
                battle.handleServerResponse({
                    lobby: {
                        start_areas: data,
                    },
                });
            }
        });

        this.onResponse("s.lobby.remove_start_area").add((data) => {
            const battle = api.session.getBattleById(data.lobby_id);
            if (battle) {
                // TODO
                battle.handleServerResponse({
                    lobby: {
                        start_areas: data,
                    },
                });
            }
        });

        this.onResponse("s.lobby.closed").add((data) => {
            const battle = api.session.onlineBattle.value;
            if (data.lobby_id === battle?.battleOptions.id) {
                api.session.battles.delete(battle.battleOptions.id);
                api.session.onlineBattle.value = null;
                if (api.router.currentRoute.value.path === "/multiplayer/battle") {
                    api.router.push("/multiplayer");
                }
            }
        });

        this.onResponse("s.lobby.add_bot").add(({ bot }) => {
            const battle = api.session.onlineBattle.value;
            if (battle) {
                battle.bots.push({
                    name: bot.name,
                    playerId: bot.player_number,
                    teamId: bot.team_number,
                    ownerUserId: bot.owner_id,
                    aiOptions: {},
                    aiShortName: bot.ai_dll,
                    // TODO: other options
                });
            }
        });

        this.onResponse("s.lobby.update_bot").add(({ bot }) => {
            const battle = api.session.onlineBattle.value;
            if (battle) {
                const existingBot = battle.bots.find((b) => b.name === bot.name);
                if (existingBot) {
                    assign(existingBot, {
                        name: bot.name,
                        playerId: bot.player_number,
                        teamId: bot.team_number,
                        ownerUserId: bot.owner_id,
                        aiOptions: {},
                        aiShortName: bot.ai_dll,
                        // TODO: other options
                    });
                }
            }
        });

        this.onResponse("s.lobby.remove_bot").add(({ name }) => {
            const battle = api.session.onlineBattle.value;
            if (battle) {
                const botIndex = battle.bots.findIndex((b) => b.name === name);
                if (botIndex !== -1) {
                    battle.bots.splice(botIndex, 1);
                }
            }
        });
    }
}

function updateUser(userId: number, userStatus?: ResponseType<"s.user.user_and_client_list">["users"][0], battleStatus?: ResponseType<"s.lobby.updated_client_battlestatus">["client"]) {
    const user = api.session.getUserById(userId);
    if (user && userStatus) {
        user.clanId = userStatus.clan_id;
        user.username = userStatus.name;
        user.isBot = userStatus.bot;
        user.countryCode = userStatus.country;
        user.icons = userStatus.icons;
    }
    if (user && battleStatus) {
        user.battleStatus.away = battleStatus.away;
        user.battleStatus.battleId = battleStatus.lobby_id;
        user.battleStatus.inBattle = battleStatus.in_game;
        user.battleStatus.isSpectator = !battleStatus.player;
        user.battleStatus.sync = battleStatus.sync;
        user.battleStatus.teamId = battleStatus.team_number;
        user.battleStatus.playerId = battleStatus.player_number;
        user.battleStatus.color = battleStatus.team_colour;
        user.battleStatus.ready = battleStatus.ready;
    }
}
