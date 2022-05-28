import { objectKeys, Signal } from "jaz-ts-utils";
import { ComponentPublicInstance, reactive, Ref, ref } from "vue";

import { Battle } from "@/model/battle/battle";
import { BattleOptions } from "@/model/battle/types";
import { CurrentUser, User } from "@/model/user";

export class SessionAPI {
    public readonly offlineMode: Ref<boolean>;
    public readonly currentUser: CurrentUser;
    public readonly users: Map<number, User>;
    public readonly currentBattle: Battle;
    public readonly battles: Map<number, Battle>;
    public readonly onRightClick: Signal; // TODO: refactor somewhere better
    public readonly onLeftClick: Signal; // TODO: refactor somewhere better
    public error: { err?: unknown; instance?: ComponentPublicInstance | null; info?: string } = reactive({});

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
                away: false,
                inGame: false,
                battleId: -1,
                ready: false,
                spectator: false,
                color: "",
                teamId: 0,
                playerId: 0,
            },
        });

        this.users = reactive(new Map<number, User>([[this.currentUser.userId, this.currentUser]]));

        this.currentBattle = new Battle({
            battleOptions: {} as BattleOptions,
            participants: [],
        });

        this.battles = reactive(new Map<number, Battle>([]));

        this.onLeftClick = new Signal();
        this.onRightClick = new Signal();
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
