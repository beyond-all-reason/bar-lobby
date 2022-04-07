import { defaultBattle } from "@/config/default-battle";
import { Battle } from "@/model/battle/battle";
import { CurrentUser, CurrentUserConfig } from "@/model/user";
import { objectKeys, Signal } from "jaz-ts-utils";
import { reactive, Ref, ref } from "vue";

export class SessionAPI {
    public inBattle: Ref<boolean>;
    public readonly currentUser: CurrentUser;
    public readonly currentBattle: Battle;
    public readonly offlineMode: Ref<boolean>;
    public readonly onRightClick: Signal; // TODO: refactor somewhere better
    public readonly onLeftClick: Signal; // TODO: refactor somewhere better

    constructor() {
        this.currentUser = reactive(new CurrentUser({
            userId: -1,
            username: "Player"
        }));

        this.offlineMode = ref(true);
        this.inBattle = ref(false);
        this.onLeftClick = new Signal();
        this.onRightClick = new Signal();
        this.currentBattle = reactive(defaultBattle());
    }

    public setCurrentBattle(battle: Battle) {
        // set properties on the battle object instead of reassigning it to keep the reactivity intact
        const currentBattle = this.currentBattle;
        objectKeys(this.currentBattle).forEach(key => {
            delete currentBattle[key];
        });
        Object.assign(this.currentBattle, battle);

        this.inBattle.value = true;
    }

    public leaveCurrentbattle() {
        this.inBattle.value = false;
    }

    public setCurrentUser(userConfig: CurrentUserConfig) {
        if (this.currentUser) {
            const currentUser = this.currentUser;
            objectKeys(this.currentUser).forEach(key => {
                delete currentUser[key];
            });
        }
        Object.assign(this.currentUser, userConfig);
    }
}