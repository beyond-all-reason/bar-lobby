import { objectKeys } from "jaz-ts-utils";
import { reactive, Ref, ref } from "vue";

import { BattleChatMessage } from "@/model/battle/battle-chat";
import { OfflineBattle } from "@/model/battle/offline-battle";
import { TachyonSpadsBattle } from "@/model/battle/tachyon-spads-battle";
import { CurrentUser, User } from "@/model/user";

export class SessionAPI {
    public readonly offlineMode: Ref<boolean>;
    public readonly currentUser: CurrentUser;
    public readonly users: Map<number, User>;
    public offlineBattle: OfflineBattle | null;
    public onlineBattle: TachyonSpadsBattle | null;
    public battleMessages: BattleChatMessage[];

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
                spectator: false,
                color: "",
                teamId: 0,
                playerId: 0,
            },
        });

        this.users = reactive(new Map<number, User>([[this.currentUser.userId, this.currentUser]]));

        this.offlineBattle = null;
        this.onlineBattle = null;

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
}
