import { Static } from "@sinclair/typebox";
import { assign } from "jaz-ts-utils";
import { lobbySchema, myUserSchema, ResponseType } from "tachyon-client";
import { reactive, Ref, ref, shallowReactive, shallowRef } from "vue";

import { BattleChatMessage } from "@/model/battle/battle-chat";
import { OfflineBattle } from "@/model/battle/offline-battle";
import { TachyonSpadsBattle } from "@/model/battle/tachyon-spads-battle";
import { CurrentUser, User } from "@/model/user";

export class SessionAPI {
    public readonly offlineMode: Ref<boolean>;
    public readonly offlineBattle: Ref<OfflineBattle | null> = shallowRef(null);
    public readonly onlineBattle: Ref<TachyonSpadsBattle | null> = shallowRef(null);
    public readonly users: Map<number, User>;
    public readonly currentUser: CurrentUser;
    public readonly battles: Map<number, TachyonSpadsBattle>;
    public readonly battleMessages: BattleChatMessage[];
    public readonly serverStats: Ref<ResponseType<"s.system.server_stats">["data"] | null> = shallowRef(null);

    // temporary necessity until https://github.com/beyond-all-reason/teiserver/issues/34 is implemented
    public lastBattleResponses: Map<number, Static<typeof lobbySchema>> = new Map();

    constructor() {
        this.offlineMode = ref(true);

        this.currentUser = reactive({
            userId: -1,
            username: "Player",
            isBot: false,
            icons: {},
            skill: {},
            clanId: null,
            countryCode: "",
            legacyId: null,
            permissions: [],
            friendUserIds: [],
            friendRequestUserIds: [],
            ignoreUserIds: [],
            battleStatus: {
                inBattle: false,
                away: false,
                battleId: -1, // -1 = offline battle
                ready: false,
                isSpectator: false,
                sync: {
                    engine: 1,
                    game: 1,
                    map: 1,
                },
                color: "",
                teamId: 0,
                playerId: 0,
            },
        });

        this.users = reactive(new Map<number, User>([[-1, this.currentUser]]));

        this.battles = shallowReactive(new Map<number, TachyonSpadsBattle>());

        this.battleMessages = reactive([]);
    }

    public updateCurrentUser(myUserData: Static<typeof myUserSchema>) {
        const user = this.updateUser(myUserData);

        assign(this.currentUser, {
            ...user,
            friendRequestUserIds: myUserData.friend_requests,
            ignoreUserIds: [],
            permissions: myUserData.permissions,
            friendUserIds: myUserData.friends,
        });

        this.users.set(myUserData.id, this.currentUser);
    }

    public updateUser(userData: ResponseType<"s.user.user_and_client_list">["users"][0]) {
        let user = this.getUserById(userData.id);
        if (!user) {
            user = reactive({
                userId: userData.id,
                legacyId: parseInt(userData.springid.toString()) || null,
                username: userData.name,
                clanId: userData.clan_id,
                isBot: userData.bot,
                countryCode: userData.country,
                icons: {},
                battleStatus: {
                    inBattle: false,
                    away: false,
                    battleId: -1,
                    ready: false,
                    isSpectator: false,
                    sync: {
                        engine: 1,
                        game: 1,
                        map: 1,
                    },
                    color: "",
                    teamId: 0,
                    playerId: 0,
                },
            });

            this.users.set(user.userId, user);
        }

        user.legacyId = parseInt(userData.springid.toString()) || null;
        user.username = userData.name;
        user.clanId = userData.clan_id;
        user.isBot = userData.bot;
        user.countryCode = userData.country;
        user.icons = userData.icons;

        return user;
    }

    public updateUserBattleStauts(battleStatusData: ResponseType<"s.lobby.updated_client_battlestatus">["client"]) {
        const user = this.getUserById(battleStatusData.userid);
        if (!user) {
            throw new Error(`Tried to update battle status for an unknown user: ${battleStatusData.userid}`);
        }

        user.battleStatus.away = battleStatusData.away;
        user.battleStatus.battleId = battleStatusData.lobby_id;
        user.battleStatus.inBattle = battleStatusData.in_game;
        user.battleStatus.isSpectator = !battleStatusData.player;
        user.battleStatus.sync = battleStatusData.sync;
        user.battleStatus.teamId = battleStatusData.team_number;
        user.battleStatus.playerId = battleStatusData.player_number;
        user.battleStatus.color = battleStatusData.team_colour;
        user.battleStatus.ready = battleStatusData.ready;
    }

    // public setCurrentUser(userConfig: CurrentUser) {
    //     const currentUser = this.currentUser;
    //     objectKeys(this.currentUser).forEach((key) => {
    //         delete currentUser[key];
    //     });
    //     Object.assign(this.currentUser, userConfig);
    //     this.users.set(userConfig.userId, reactive(userConfig));
    // }

    // public setUser(userId: number, userStatus?: ResponseType<"s.user.user_and_client_list">["users"][0], battleStatus?: ResponseType<"s.lobby.updated_client_battlestatus">["client"]) {
    //     let user = api.session.getUserById(userId);

    //     if (!user && userStatus) {
    //         user = {
    //             userId: userStatus.id,
    //             legacyId: parseInt(userStatus.springid.toString()) || null,
    //             username: userStatus.name,
    //             clanId: userStatus.clan_id,
    //             isBot: userStatus.bot,
    //             icons: {},
    //             countryCode: userStatus.country,
    //             battleStatus: {
    //                 inBattle: false,
    //                 away: false,
    //                 battleId: -1,
    //                 ready: false,
    //                 isSpectator: false,
    //                 sync: {
    //                     engine: 1,
    //                     game: 1,
    //                     map: 1,
    //                 },
    //                 color: "",
    //                 teamId: 0,
    //                 playerId: 0,
    //             }
    //         };
    //     }

    //     if (!user) {
    //         return;
    //     }

    //     if (userStatus) {
    //         user.clanId = userStatus.clan_id;
    //         user.username = userStatus.name;
    //         user.isBot = userStatus.bot;
    //         user.countryCode = userStatus.country;
    //         user.icons = userStatus.icons;
    //     }

    //     if (battleStatus) {
    //         user.battleStatus.away = battleStatus.away;
    //         user.battleStatus.battleId = battleStatus.lobby_id;
    //         user.battleStatus.inBattle = battleStatus.in_game;
    //         user.battleStatus.isSpectator = !battleStatus.player;
    //         user.battleStatus.sync = battleStatus.sync;
    //         user.battleStatus.teamId = battleStatus.team_number;
    //         user.battleStatus.playerId = battleStatus.player_number;
    //         user.battleStatus.color = battleStatus.team_colour;
    //         user.battleStatus.ready = battleStatus.ready;
    //     }

    //     this.users.set(user?.userId, user);

    //     // if (this.users.get(userConfig.userId)) {
    //     //     Object.assign(this.users.get(userConfig.userId), userConfig);
    //     // } else {
    //     //     this.users.set(userConfig.userId, reactive(userConfig));
    //     // }

    //     return user;
    // }

    public getUserById(userId: number) {
        return this.users.get(userId);
    }

    public getUserByName(username: string) {
        for (const user of this.users.values()) {
            if (user.username === username) {
                return user;
            }
        }

        return undefined;
    }

    public getBattleById(battleId: number) {
        return this.battles.get(battleId);
    }
}
