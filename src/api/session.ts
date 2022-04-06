import { Battle } from "@/model/battle/battle";
import { CurrentUser } from "@/model/user";
import { objectKeys, Signal } from "jaz-ts-utils";
import { reactive, ref } from "vue";

export class SessionAPI {
    public readonly currentUser: CurrentUser;
    public readonly offlineMode = ref(true);
    public readonly onRightClick = new Signal();
    public readonly onLeftClick = new Signal();

    // TODO: needs testing as I expect there could be problems with persistent components that expect currentBattle to always be the same reactive object
    protected currentBattle?: Battle;

    constructor() {
        this.currentUser = reactive(new CurrentUser({
            userId: -1,
            username: "Player"
        }));
    }

    public setCurrentBattle(battle: Battle) {
        if (this.currentBattle) {
            const currentBattle = this.currentBattle;
            objectKeys(this.currentBattle).forEach(key => {
                delete currentBattle[key];
            });
            Object.assign(this.currentBattle, battle);
        } else {
            this.currentBattle = reactive(battle) as Battle;
        }
    }

    public leaveCurrentbattle() {
        this.currentBattle = undefined;
    }

    public setCurrentUser(userConfig: CurrentUser) {
        if (this.currentUser) {
            const currentUser = this.currentUser;
            objectKeys(this.currentUser).forEach(key => {
                delete currentUser[key];
            });
        }
        Object.assign(this.currentUser, userConfig);
    }
}