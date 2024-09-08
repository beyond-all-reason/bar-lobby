import { assign } from "jaz-ts-utils";
import { GetCommandData, GetCommands } from "tachyon-protocol";
import { PrivateUser, User } from "tachyon-protocol/types";
import { computed, ComputedRef, reactive, Ref, ref, shallowReactive, shallowRef } from "vue";

import { MatchmakingBattle } from "@/model/battle/matchmaking-battle";
import { OfflineCustomBattle } from "@/model/battle/offline-custom-battle";
import { OnlineCustomBattle } from "@/model/battle/online-custom-battle";
import { Message } from "@/model/messages";
// import { CurrentUser, User } from "@/model/user";

export class SessionAPI {
    public readonly offlineMode: Ref<boolean> = ref(false);
    public readonly offlineBattle: Ref<OfflineCustomBattle | null> = shallowRef(null);
    public readonly onlineBattle: Ref<OnlineCustomBattle | MatchmakingBattle | null> = shallowRef(null);
    public readonly users: Map<string, User> = reactive(new Map([]));
    public readonly offlineUser: User;
    public readonly onlineUser: PrivateUser;
    public readonly customBattles: Map<number, OnlineCustomBattle> = shallowReactive(new Map());
    public readonly battleMessages: Message[] = reactive([]);
    public readonly serverStats: Ref<GetCommandData<GetCommands<"server", "user", "response", "system/serverStats">> | null> = shallowRef(null);
    // public readonly outgoingFriendRequests: ComputedRef<User[]>;
    // public readonly incomingFriendRequests: ComputedRef<User[]>;
    public readonly friends: ComputedRef<User[]>;
    public readonly directMessages: Map<number, Message[]> = reactive(new Map());
    public readonly searchingForGame = ref(false);

    constructor() {
        // TODO: should be in this.clear()?
        this.offlineMode.value = false;
        this.offlineBattle.value = null;
        this.onlineBattle.value = null;
        this.users.clear();
        this.customBattles.clear();
        this.battleMessages.length = 0;
        this.serverStats.value = null;
        this.directMessages.clear();

        const user: PrivateUser = {
            userId: "",
            username: "Player",
            displayName: "Player",
            clanId: null,
            countryCode: "",
            status: "offline",
            battleStatus: null,
            friendIds: [],
            ignoreIds: [],
            incomingFriendRequestIds: [],
            outgoingFriendRequestIds: [],
            //avatarUrl: "",
            partyId: null,
            scopes: [],
            //roles: [],
        };

        this.offlineUser = reactive(user);

        this.onlineUser = reactive(user);

        // this.incomingFriendRequests = computed(() => this.onlineUser.incomingFriendRequestIds.map((id) => this.getUserById(id)!).filter(Boolean));
        // this.outgoingFriendRequests = computed(() => this.onlineUser.outgoingFriendRequestIds.map((id) => this.getUserById(id)!).filter(Boolean));
        this.friends = computed(() => this.onlineUser.friendIds.map((id) => this.getUserById(id)).filter(Boolean));
    }

    public clear() {
        api.session.onlineBattle.value = null;
        api.session.users.clear();
        api.session.customBattles.clear();

        // TODO: reset online user
    }

    public updateCurrentUser(userData: Partial<PrivateUser>) {
        if (!userData.userId) {
            console.error("Received user update without userId", userData);
            return;
        }

        this.users.set(userData.userId, this.onlineUser);

        assign(this.onlineUser, userData);
    }

    public updateUser(userData: User) {
        if (!userData.userId) {
            console.error("Received user update without userId", userData);
            return;
        }

        let user: User | undefined = this.getUserById(userData.userId);

        if (!user) {
            user = reactive(userData);
        } else {
            assign(user, userData);
        }
    }

    public getUserById(userId: string): User | undefined {
        const user = this.users.get(userId);
        return user;
    }

    // public async updateBattleList() {
    //     const { lobbies } = await api.comms.request("c.lobby.query", { query: {}, fields: ["lobby", "bots", "modoptions", "member_list"] });

    //     const userIds: number[] = [];
    //     for (const battle of lobbies.map((data) => data.lobby)) {
    //         userIds.push(...battle.players);
    //         userIds.push(battle.founder_id);
    //     }

    //     await api.comms.request("c.user.list_users_from_ids", { id_list: userIds, include_clients: true });

    //     for (const lobby of lobbies) {
    //         const battle = api.session.battles.get(lobby.lobby.id);
    //         if (!battle) {
    //             api.session.battles.set(lobby.lobby.id, new SpadsBattle(lobby));
    //         } else {
    //             battle.handleServerResponse(lobby);
    //         }
    //     }

    //     // clear up dead battles
    //     const lobbyIds = lobbies.map((lobby) => lobby.lobby.id);
    //     api.session.battles.forEach((battle) => {
    //         if (!lobbyIds.includes(battle.battleOptions.id)) {
    //             api.session.battles.delete(battle.battleOptions.id);
    //         }
    //     });
    // }
}
