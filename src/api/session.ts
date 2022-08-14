import { Static } from "@sinclair/typebox";
import { objectKeys } from "jaz-ts-utils";
import { lobbySchema } from "tachyon-client";
import { reactive, Ref, ref, shallowReactive, shallowRef } from "vue";

import { BattleChatMessage } from "@/model/battle/battle-chat";
import { OfflineBattle } from "@/model/battle/offline-battle";
import { TachyonSpadsBattle } from "@/model/battle/tachyon-spads-battle";
import { CurrentUser, User } from "@/model/user";

export class SessionAPI {
    public readonly offlineMode: Ref<boolean>;
    public readonly currentUser: CurrentUser;
    public readonly offlineBattle: Ref<OfflineBattle | null> = shallowRef(null);
    public readonly onlineBattle: Ref<TachyonSpadsBattle | null> = shallowRef(null);
    public readonly users: Map<number, User>;
    public readonly battles: Map<number, TachyonSpadsBattle>;
    public readonly battleMessages: BattleChatMessage[];

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

        this.users = reactive(new Map<number, User>([[this.currentUser.userId, this.currentUser]]));

        this.battles = shallowReactive(new Map<number, TachyonSpadsBattle>());

        this.battleMessages = reactive([]);
    }

    public setCurrentUser(userConfig: CurrentUser) {
        const currentUser = this.currentUser;
        objectKeys(this.currentUser).forEach((key) => {
            delete currentUser[key];
        });

        Object.assign(this.currentUser, userConfig);
        this.setUser(this.currentUser);
    }

    public setUser(userConfig: User) {
        if (this.users.get(userConfig.userId)) {
            Object.assign(this.users.get(userConfig.userId), userConfig);
        } else {
            this.users.set(userConfig.userId, reactive(userConfig));
        }
    }

    public getUserById(userId: number) {
        if (userId === -1) {
            return this.currentUser;
        }
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
