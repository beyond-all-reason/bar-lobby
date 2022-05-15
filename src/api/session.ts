import { CurrentUser, User } from "@/model/user";
import { objectKeys, Signal } from "jaz-ts-utils";
import { reactive, Ref, ref } from "vue";

export class SessionAPI {
    public readonly currentUser: CurrentUser;
    public readonly offlineMode: Ref<boolean>;
    public readonly users: Map<number, User>;
    public readonly onRightClick: Signal; // TODO: refactor somewhere better
    public readonly onLeftClick: Signal; // TODO: refactor somewhere better

    constructor() {
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
                allyTeamId: 0,
                playerId: 0,
            }
        });

        this.users = reactive(new Map<number, User>([
            [this.currentUser.userId, this.currentUser]
        ]));

        this.offlineMode = ref(true);

        this.onLeftClick = new Signal();
        this.onRightClick = new Signal();
    }

    public setCurrentUser(userConfig: CurrentUser) {
        const currentUser = this.currentUser;
        objectKeys(this.currentUser).forEach(key => {
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