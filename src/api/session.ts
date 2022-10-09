import { Static } from "@sinclair/typebox";
import { assign, clone } from "jaz-ts-utils";
import { lobbySchema, myUserSchema, ResponseType, userSchema } from "tachyon-client";
import { reactive, Ref, ref, shallowReactive, shallowRef, toRaw } from "vue";

import { BattleChatMessage } from "@/model/battle/battle-chat";
import { OfflineBattle } from "@/model/battle/offline-battle";
import { SpadsBattle } from "@/model/battle/spads-battle";
import { CurrentUser, User } from "@/model/user";

export class SessionAPI {
    public readonly offlineMode: Ref<boolean> = ref(false);
    public readonly offlineBattle: Ref<OfflineBattle | null> = shallowRef(null);
    public readonly onlineBattle: Ref<SpadsBattle | null> = shallowRef(null);
    public readonly users: Map<number, User>;
    public readonly offlineUser: CurrentUser;
    public readonly onlineUser: CurrentUser;
    public readonly battles: Map<number, SpadsBattle>;
    public readonly battleMessages: BattleChatMessage[] = reactive([]);
    public readonly serverStats: Ref<ResponseType<"s.system.server_stats">["data"] | null> = shallowRef(null);
    public readonly friends: User[] = reactive([]);

    // temporary necessity until https://github.com/beyond-all-reason/teiserver/issues/34 is implemented
    public lastBattleResponses: Map<number, Static<typeof lobbySchema>> = new Map();

    constructor() {
        this.offlineUser = reactive({
            userId: -1,
            username: "Player",
            isBot: false,
            icons: {},
            skill: {},
            clanId: null,
            countryCode: "",
            permissions: [],
            friendUserIds: [],
            friendRequestUserIds: [],
            ignoreUserIds: [],
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

        this.onlineUser = reactive(clone(toRaw(this.offlineUser)));

        this.users = reactive(new Map<number, User>([]));

        this.battles = shallowReactive(new Map<number, SpadsBattle>());
    }

    public updateCurrentUser(myUserData: Static<typeof myUserSchema>) {
        this.users.set(myUserData.id, this.onlineUser);

        const user = this.updateUser(myUserData);

        assign(this.onlineUser, {
            ...user,
            friendRequestUserIds: myUserData.friend_requests,
            ignoreUserIds: [],
            permissions: myUserData.permissions,
            friendUserIds: myUserData.friends,
        });

        this.offlineUser.username = user.username;
        this.offlineUser.countryCode = user.countryCode;
        this.offlineUser.icons = user.icons;
    }

    public updateUser(userData: Static<typeof userSchema>) {
        let user = this.getUserById(userData.id);

        if (!user) {
            user = reactive({
                userId: userData.id,
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
        }

        this.users.set(user.userId, user);

        user.userId = userData.id;
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

    public getUserById(userId: number) {
        const user = this.users.get(userId);
        return user;
    }

    public getUserByName(username: string) {
        for (const user of this.users.values()) {
            if (user.username === username) {
                return user;
            }
        }

        return undefined;
    }
}
