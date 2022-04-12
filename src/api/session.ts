import { CurrentUser, User } from "@/model/user";
import { objectKeys, Signal } from "jaz-ts-utils";
import { reactive, Ref, ref } from "vue";

export class SessionAPI {
    public readonly currentUser: CurrentUser;
    public readonly users: Map<number, User>;
    public readonly offlineMode: Ref<boolean>;
    public readonly onRightClick: Signal; // TODO: refactor somewhere better
    public readonly onLeftClick: Signal; // TODO: refactor somewhere better

    constructor() {
        this.currentUser = reactive({
            userId: -1,
            username: "Player",
            isBot: false,
            icons: {},
            skill: {},
            status: { isAway: false, isInGame: false },
            permissions: [],
            friendUserIds: [],
            friendRequestUserIds: [],
            ignoreUserIds: []
        });
        this.users = reactive(new Map());
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
    }

    public setUser(userConfig: User) {
        this.users.set(userConfig.userId, userConfig);
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