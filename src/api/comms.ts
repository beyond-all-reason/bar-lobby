import { Static } from "@sinclair/typebox";
import { arrayToMap, assign } from "jaz-ts-utils";
import { battleSchema, myUserSchema, TachyonClient } from "tachyon-client";
import { reactive, Ref, ref } from "vue";

import { SpadsBattle } from "@/model/battle/spads-battle";
import { tachyonLog } from "@/utils/tachyon-log";
export class CommsAPI extends TachyonClient {
    public readonly isConnected: Ref<boolean> = ref(false);

    constructor(config: ConstructorParameters<typeof TachyonClient>[0]) {
        super({
            ...config,
            verbose: true,
            logMethod: tachyonLog,
            attemptReconnect: false,
        });

        this.onConnect.add(() => {
            this.isConnected.value = true;

            console.log(`Connected to ${config.host}:${config.port}`);
            this.request("c.system.watch", {
                channel: "server_stats",
            });

            // TODO: make this a .onDisconnect signal
            this.socket?.on("close", () => {
                this.isConnected.value = false;

                // TODO: display alerts whenever connecting/disconnecting
                console.log(`Disconnected from ${config.host}:${config.port}`);
                api.session.offlineBattle.value = null;
                api.session.users.clear();
                api.session.battles.clear();
                api.session.serverStats;

                if (api.router.currentRoute.value.path !== "/" && api.router.currentRoute.value.path !== "/login" && !api.session.offlineMode.value) {
                    api.router.replace("/login");
                }
            });
        });

        this.onResponse("s.system.server_stats").add(({ data }) => {
            if (api.session.serverStats.value === null) {
                api.session.serverStats.value = reactive(data);
            } else {
                assign(api.session.serverStats.value, data);
            }
        });

        this.onResponse("s.system.server_event").add((data) => {
            if (data.event === "server_restart") {
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

        const onLogin = (result: string, userData: Static<typeof myUserSchema> | undefined) => {
            if (result !== "success" || !userData) {
                return;
            }

            api.session.offlineMode.value = false;

            api.session.updateCurrentUser(userData);

            api.router.push("/home");
        };

        this.onResponse("s.auth.login").add((data) => {
            onLogin(data.result, data.user);
        });

        this.onResponse("s.auth.verify").add((data) => {
            onLogin(data.result, data.user);
        });

        this.onResponse("s.user.user_and_client_list").add(({ clients, users }) => {
            for (const userData of users) {
                api.session.updateUser(userData);
            }

            for (const client of clients) {
                api.session.updateUserBattleStauts(client);
            }
        });

        const joinBattle = async (data: Static<typeof battleSchema>) => {
            if (data.member_list) {
                const userIds = data.member_list.map((member) => member.userid);
                await this.updateUsers(userIds);
            }

            let battle = api.session.battles.get(data.lobby.id);
            if (!battle) {
                battle = new SpadsBattle(data);
            }

            battle.handleServerResponse(data);

            if (api.session.onlineUser && !battle.users.includes(api.session.onlineUser)) {
                battle.users.push(api.session.onlineUser);
            }

            api.session.onlineBattle.value = battle;

            api.session.battleMessages.length = 0;

            api.router.push("/multiplayer/battle");

            battle.open();
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
            const battle = api.session.battles.get(data.lobby.id);
            if (battle) {
                battle.handleServerResponse(data);
            } else {
                console.warn(`Trying to update battle but battle not found: ${data}`);
            }
        });

        this.onResponse("s.lobby.update_values").add((data) => {
            const battle = api.session.battles.get(data.lobby_id);
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
            api.session.updateUserBattleStauts(client);

            const battle = api.session.onlineBattle.value;
            if (battle && battle.battleOptions.founderId === client.userid) {
                if (client.in_game) {
                    api.game.launch({ battle });
                }
            }
        });

        this.onResponse("s.lobby.add_user").add((data) => {
            const user = api.session.updateUser(data.user);
            api.session.updateUserBattleStauts(data.client);

            const battle = api.session.battles.get(data.lobby_id);
            if (user && battle) {
                battle.users.push(user);
            }
        });

        this.onResponse("s.lobby.remove_user").add((data) => {
            const user = api.session.getUserById(data.leaver_id);
            const battle = api.session.battles.get(data.lobby_id);
            if (user && battle) {
                const index = battle.users.findIndex((user) => user.userId === data.leaver_id);
                battle.users.splice(index, 1);
            }
        });

        this.onResponse("s.lobby.add_start_area").add((data) => {
            const battle = api.session.battles.get(data.lobby_id);
            if (battle) {
                battle.battleOptions.startBoxes[data.area_id] = {
                    xPercent: data.structure.x1 / 200,
                    yPercent: data.structure.y1 / 200,
                    widthPercent: data.structure.x2 / 200 - data.structure.x1 / 200,
                    heightPercent: data.structure.y2 / 200 - data.structure.y1 / 200,
                };
            }
        });

        this.onResponse("s.lobby.remove_start_area").add((data) => {
            const battle = api.session.battles.get(data.lobby_id);
            if (battle) {
                battle.battleOptions.startBoxes[data.area_id] = undefined;
            }
        });

        this.onResponse("s.lobby.closed").add((data) => {
            const battle = api.session.battles.get(data.lobby_id);

            if (battle === api.session.onlineBattle.value) {
                battle.leave();
            }

            api.session.battles.delete(data.lobby_id);
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

        this.onResponse("s.lobby.remove_bot").add(({ bot_name }) => {
            const battle = api.session.onlineBattle.value;
            if (battle) {
                const botIndex = battle.bots.findIndex((b) => b.name === bot_name);
                if (botIndex !== -1) {
                    battle.bots.splice(botIndex, 1);
                }
            }
        });

        this.onResponse("s.lobby.say").add((data) => {
            const user = api.session.getUserById(data.sender_id);
            if (!user) {
                console.error("User not in session data", data.sender_id);
            }
            api.session.battleMessages.push({
                type: "chat",
                name: user?.username ?? "Unknown",
                text: data.message,
            });
        });

        this.onResponse("s.lobby.announce").add((data) => {
            api.session.battleMessages.push({
                type: "system",
                text: data.message,
            });
        });

        this.onResponse("s.user.user_and_client_list").add(({ clients, users }) => {
            const clientMap = arrayToMap(clients, "userid");

            for (const user of users) {
                const battleStatus = clientMap.get(user.id);

                if (!battleStatus) {
                    console.warn(`Battle status could not be found for user with id ${user.id}`);
                    continue;
                }

                api.session.updateUser(user);
                api.session.updateUserBattleStauts(battleStatus);
            }
        });
    }

    public async updateUsers(userIds: number[]) {
        await api.comms.request("c.user.list_users_from_ids", { id_list: userIds, include_clients: true });
    }
}
