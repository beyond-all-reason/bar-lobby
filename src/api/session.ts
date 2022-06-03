import { objectKeys } from "jaz-ts-utils";
import { computed, ComputedRef, reactive, Ref, ref } from "vue";

import { Battle } from "@/model/battle/battle";
import { BattleOptions } from "@/model/battle/types";
import { CurrentUser, User } from "@/model/user";

export class SessionAPI {
    public readonly offlineMode: Ref<boolean>;
    public readonly currentUser: CurrentUser;
    public readonly users: Map<number, User>;
    public readonly currentBattle: ComputedRef<Battle | null>;
    public readonly battles: Map<number, Battle>;

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

        this.battles = reactive(new Map<number, Battle>([]));

        this.battles.set(
            -1,
            new Battle({
                battleOptions: {} as BattleOptions,
                participants: [],
            })
        );

        this.currentBattle = computed(() => {
            if (!this.currentUser.battleStatus.inBattle) {
                return null;
            }
            const battle = this.battles.get(this.currentUser.battleStatus.battleId);
            if (battle) {
                return battle;
            }
            console.warn(`Battle not found: ${this.currentUser.battleStatus.battleId}`);
            return null;
        });
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

    public getUsersArray() {
        return Array.from(this.users);
    }
}
