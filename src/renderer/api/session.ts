import { reactive, Ref, ref, shallowReactive, shallowRef } from "vue";

import { OfflineBattle } from "@/model/battle/offline-battle";
import { SpadsBattle } from "@/model/battle/spads-battle";
import { Message } from "@/model/messages";
import { OfflineUser, PrivateUser, User } from "@/model/user";

export class SessionAPI {
    public readonly offlineMode: Ref<boolean> = ref(false);
    public readonly offlineBattle: Ref<OfflineBattle | null> = shallowRef(null);
    public readonly onlineBattle: Ref<SpadsBattle | null> = shallowRef(null);
    public readonly users: Map<number, User> = reactive(new Map<number, User>([]));
    public readonly offlineUser: OfflineUser;
    public readonly onlineUser: PrivateUser;
    public readonly battles: Map<number, SpadsBattle> = shallowReactive(new Map<number, SpadsBattle>());
    public readonly battleMessages: Message[] = reactive([]);
    //public readonly serverStats: Ref<SuccessResponseData<"system", "serverStats"> | null> = shallowRef(null);
    // public readonly outgoingFriendRequests: ComputedRef<User[]>;
    // public readonly incomingFriendRequests: ComputedRef<User[]>;
    // public readonly friends: ComputedRef<User[]>;
    public readonly directMessages: Map<number, Message[]> = reactive(new Map());

    constructor() {
        this.offlineMode.value = false;
        this.offlineBattle.value = null;
        this.onlineBattle.value = null;
        this.users.clear();
        this.battles.clear();
        this.battleMessages.length = 0;
        //this.serverStats.value = null;
        this.directMessages.clear();

        this.offlineUser = reactive({
            displayName: "Player",
            battleStatus: {
                bonus: 0,
                isPlayer: true,
                playerNumber: 0,
                sync: {
                    engine: 0,
                    game: 0,
                    map: 0,
                },
                teamColor: "#000",
            },
        } as OfflineUser);

        this.onlineUser = reactive({
            userId: -1,
            displayName: "Player",
            avatarUrl: "",
            battleStatus: {
                battleId: null,
                bonus: 0,
                inGame: false,
                isPlayer: false,
                playerNumber: null,
                ready: false,
                sync: {
                    engine: 0,
                    game: 0,
                    map: 0,
                },
                teamColor: null,
            },
            clanId: -1,
            friendIds: [],
            ignoreIds: [],
            incomingFriendRequestIds: [],
            outgoingFriendRequestIds: [],
            partyId: -1,
            roles: [],
        } as PrivateUser);

        // this.incomingFriendRequests = computed(() => this.onlineUser.incomingFriendRequestIds.map((id) => this.getUserById(id)!).filter(Boolean));
        // this.outgoingFriendRequests = computed(() => this.onlineUser.outgoingFriendRequestIds.map((id) => this.getUserById(id)!).filter(Boolean));
        // this.friends = computed(() => this.onlineUser.friendIds.map((id) => this.getUserById(id)!).filter(Boolean));
    }

    public clear() {
        api.session.onlineBattle.value = null;
        api.session.users.clear();
        api.session.battles.clear();
    }

    public updateCurrentUser(currentUserData: PrivateUser) {
        this.users.set(currentUserData.userId, this.onlineUser);

        this.updateUser(currentUserData);

        Object.assign(this.onlineUser, {
            friendIds: currentUserData.friendIds,
            ignoreIds: currentUserData.ignoreIds,
            incomingFriendRequestIds: currentUserData.incomingFriendRequestIds,
            outgoingFriendRequestIds: currentUserData.outgoingFriendRequestIds,
        });
    }

    public updateUser(userData: User) {
        let user = this.getUserById(userData.userId);

        if (!user) {
            user = reactive({
                userId: userData.userId,
                displayName: userData.displayName,
                avatarUrl: userData.avatarUrl,
                clanId: userData.clanId,
                countryCode: userData.countryCode,
                partyId: null,
                roles: [],
                battleStatus: {
                    battleId: null,
                    bonus: 0,
                    inGame: false,
                    isPlayer: false,
                    playerNumber: null,
                    ready: false,
                    sync: {
                        engine: 0,
                        game: 0,
                        map: 0,
                    },
                    teamColor: null,
                },
            } as User);
        }

        Object.assign(user, userData);
    }

    public getUserById(userId: number): User | undefined {
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
