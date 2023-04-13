/**
 * @fileoverview Comms API
 *
 * This class is a extension of the TachyonClient class. It is used to communicate with the server.
 * all communication with the server should be done through this class.
 *
 * this includes matchmaking, chat, direct messages, and other lobby related functions.
 */
import { Static, TSchema } from "@sinclair/typebox";
import { arrayToMap, assign } from "jaz-ts-utils";
import { battleSchema, myUserSchema, TachyonClient } from "tachyon-client";
import { nextTick, reactive, Ref, ref } from "vue";

import { barManagerHandlers } from "@/api/response-handlers/messages/bar-manager";
import { battleAnnouncementHandlers } from "@/api/response-handlers/messages/battle-announcement";
import { battleMessageHandlers } from "@/api/response-handlers/messages/battle-message";
import { directAnnouncementHandlers } from "@/api/response-handlers/messages/direct-announcement";
import { directMessageHandlers } from "@/api/response-handlers/messages/direct-message";
import { SpadsBattle } from "@/model/battle/spads-battle";
import { Message, MessageHandler } from "@/model/messages";
import { spadsBoxToStartBox } from "@/utils/start-boxes";
import { tachyonLog } from "@/utils/tachyon-log";

/**
 * TODO: move most of the response logic into separate response-handler files
 */

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
                api.session.onlineBattle.value = null;
                api.session.users.clear();
                api.session.battles.clear();
                api.session.serverStats;

                if (api.router.currentRoute.value.path !== "/" && api.router.currentRoute.value.path !== "/login" && !api.session.offlineMode.value) {
                    api.router.replace("/login");
                }
            });
        });

        this.onResponse("s.communication.received_direct_message").add(async (data) => {
            const message: Message = {
                type: "direct-message",
                senderUserId: data.sender_id,
                text: data.message,
            };

            const chatlog = api.session.directMessages.get(data.sender_id);
            if (chatlog) {
                chatlog.push(message);
            } else {
                api.session.directMessages.set(data.sender_id, [message]);
            }

            await this.handleMessage(message, directMessageHandlers);
        });

        this.setupAuthComms();
        this.setupLobbyComms();
        this.setupSystemComms();
        this.setupUserComms();
    }

    protected setupAuthComms() {
        function onLogin(result: string, userData: Static<typeof myUserSchema> | undefined) {
            if (result !== "success" || !userData) {
                return;
            }

            api.session.offlineMode.value = false;

            api.session.updateCurrentUser(userData);

            api.comms.request("c.user.list_users_from_ids", {
                id_list: [
                    ...api.session.onlineUser.friendUserIds,
                    ...api.session.onlineUser.incomingFriendRequestUserIds,
                    ...api.session.onlineUser.outgoingFriendRequestUserIds,
                    ...api.session.onlineUser.ignoreUserIds,
                ],
                include_clients: true,
            });

            api.router.push("/home");
        }

        this.onResponse("s.auth.login").add((data) => {
            onLogin(data.result, data.user);
        });

        this.onResponse("s.auth.verify").add((data) => {
            onLogin(data.result, data.user);
        });
    }

    protected setupLobbyComms() {
        async function joinBattle(data: Static<typeof battleSchema>) {
            let battle = api.session.battles.get(data.lobby.id);
            if (!battle) {
                battle = new SpadsBattle(data);
                api.session.battles.set(data.lobby.id, battle);
            }

            battle.handleServerResponse(data);

            if (api.session.onlineUser && !battle.users.includes(api.session.onlineUser)) {
                battle.users.push(api.session.onlineUser);
            }

            api.session.onlineBattle.value = battle;

            api.session.battleMessages.length = 0;

            if (data.member_list) {
                const userIds = data.member_list.map((member) => member.userid);
                await api.comms.request("c.user.list_users_from_ids", { id_list: userIds, include_clients: true });
            }

            await battle.open();

            await api.router.push("/multiplayer/battle");
        }

        this.onResponse("s.lobby.joined").add((data) => {
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
                    api.game.launch(battle);
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
            if (user) {
                if (battle) {
                    const index = battle.users.findIndex((user) => user.userId === data.leaver_id);
                    battle.users.splice(index, 1);
                }

                user.battleStatus.battleId = null;
            }
        });

        this.onResponse("s.lobby.add_start_area").add((data) => {
            const battle = api.session.battles.get(data.lobby_id);
            if (battle) {
                battle.battleOptions.startBoxes[data.area_id] = spadsBoxToStartBox(data.structure);
            }
        });

        this.onResponse("s.lobby.remove_start_area").add((data) => {
            const battle = api.session.battles.get(data.lobby_id);
            if (battle) {
                delete battle.battleOptions.startBoxes[data.area_id];
            }
        });

        this.onResponse("s.lobby.closed").add((data) => {
            api.session.battles.delete(data.lobby_id);
        });

        this.onResponse("s.lobby.leave").add((data) => {
            api.session.onlineBattle.value = null;
            api.router.replace("/multiplayer/custom");
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

        this.onResponse("s.lobby.say").add(async (data) => {
            const message: Message = {
                type: "battle-message",
                senderUserId: data.sender_id,
                text: data.message,
            };

            api.session.battleMessages.push(message);

            await this.handleMessage(message, battleMessageHandlers);
        });

        this.onResponse("s.lobby.announce").add(async (data) => {
            const message: Message = {
                type: "battle-announcement",
                senderUserId: data.sender_id,
                text: data.message,
            };

            api.session.battleMessages.push(message);

            if (data.message.startsWith("* BarManager")) {
                message.hide = true;
                await this.handleBarManagerMessage(message);
            } else {
                await this.handleMessage(message, battleAnnouncementHandlers);
            }
        });

        this.onResponse("s.lobby.received_lobby_direct_announce").add(async (data) => {
            const message: Message = {
                type: "direct-announcement",
                senderUserId: data.sender_id,
                text: data.message,
            };

            api.session.battleMessages.push(message);

            await this.handleMessage(message, directAnnouncementHandlers);
        });

        this.onResponse("s.lobby.updated_queue").add((data) => {
            const battle = api.session.battles.get(data.lobby_id);
            if (battle) {
                battle.battleOptions.joinQueueUserIds = data.queue;
            }
        });
    }

    protected setupSystemComms() {
        this.onResponse("s.system.server_stats").add(({ data }) => {
            if (api.session.serverStats.value === null) {
                api.session.serverStats.value = reactive(data);
            } else {
                assign(api.session.serverStats.value, data);
            }
        });

        this.onResponse("s.system.server_event").add((data) => {
            if (data.event === "server_restart") {
                api.notifications.alert({
                    severity: "warning",
                    text: "Server is restarting",
                });
            }
        });

        this.onResponse("s.system.server_event").add((data) => {
            if (data.event === "stop") {
                api.notifications.alert({
                    severity: "warning",
                    text: "Server is shutting down",
                });
            }
        });
    }

    protected setupUserComms() {
        this.onResponse("s.user.user_list").add(({ clients, users }) => {
            const clientMap = arrayToMap(clients ?? [], "userid");

            for (const userData of users) {
                const battleStatus = clientMap.get(userData.id);

                const user = api.session.updateUser(userData);

                if (clients) {
                    if (battleStatus) {
                        api.session.updateUserBattleStauts(battleStatus);
                    } else {
                        user.isOnline = false;
                    }
                }
            }
        });

        this.onResponse("s.user.friend_added").add(({ user_id }) => {
            api.session.onlineUser.friendUserIds.add(user_id);
            api.session.onlineUser.incomingFriendRequestUserIds.delete(user_id);
            api.session.onlineUser.outgoingFriendRequestUserIds.delete(user_id);
        });

        this.onResponse("s.user.friend_removed").add(({ user_id }) => {
            api.session.onlineUser.friendUserIds.delete(user_id);
        });

        this.onResponse("s.user.friend_request").add(({ user_id }) => {
            api.session.onlineUser.incomingFriendRequestUserIds.delete(user_id);
        });
    }

    protected async handleBarManagerMessage(message: Message) {
        const jsonStr = message.text.split("|")[1];
        const obj = JSON.parse(jsonStr);

        const key = Object.keys(obj)[0];

        for (const handler of barManagerHandlers) {
            if (!handler.regex.test(key)) {
                continue;
            }

            if (!handler.handler) {
                return;
            }

            const data = obj[key];
            if (handler.validator) {
                const valid = handler.validator(data);
                if (!valid) {
                    console.error(`BarManager message handler failed schema validation`, handler, handler.validator.errors);
                    return;
                }
            }

            try {
                await handler.handler(data, message);
                return;
            } catch (err) {
                console.error(`Error in BarManager message handler`, err, handler);
            }
        }

        console.warn(`No BarManager message handler defined for message`, message);
    }

    protected async handleMessage(message: Message, handlers: MessageHandler<TSchema>[], warnIfUnhandled = false) {
        const sender = api.session.getUserById(message.senderUserId);
        if (!sender) {
            console.warn(`Message from unknown user, querying server for user's details`);
            await api.comms.request("c.user.list_users_from_ids", { id_list: [message.senderUserId], include_clients: true });
            await nextTick();
            this.handleMessage(message, handlers);
            return;
        }

        for (const handler of handlers) {
            if (!handler.regex.test(message.text)) {
                continue;
            }

            if (!handler.handler) {
                return;
            }

            let data: Record<string, string> | undefined = {};

            if (handler.validator) {
                const matches = message.text.match(handler.regex);
                if (!matches) {
                    console.error(`Message handler found but matches could not be processed`, handler);
                    return;
                }

                if (matches.groups) {
                    data = matches.groups;
                }

                const valid = handler.validator(data);
                if (!valid) {
                    console.error(`Message handler failed schema validation`, handler, handler.validator.errors);
                    return;
                }
            }

            try {
                await handler.handler(data, message);
                return;
            } catch (err) {
                console.error(`Error in message handler`, err, handler);
            }
        }

        if (warnIfUnhandled) {
            console.warn(`No message handler defined for message`, message);
        }
    }
}
