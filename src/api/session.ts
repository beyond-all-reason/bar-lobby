import { Battle } from "@/model/battle/battle";
import { CurrentUser } from "@/model/user";
import { ExcludeMethods, objectKeys, Signal } from "jaz-ts-utils";
import { ref } from "vue";

export class SessionAPI {
    public readonly currentBattle?: Battle;
    public readonly currentUser?: CurrentUser;
    public readonly offlineMode = ref(true);
    public readonly onRightClick = new Signal();
    public readonly onLeftClick = new Signal();

    public setCurrentBattle(battleConfig: ExcludeMethods<typeof Battle.prototype>) {
        if (this.currentBattle) {
            const currentBattle = this.currentBattle;
            objectKeys(this.currentBattle).forEach(key => {
                delete currentBattle[key];
            });
        }
        Object.assign(this.currentBattle, battleConfig);
    }

    public setCurrentUser(userConfig: ExcludeMethods<typeof CurrentUser.prototype>) {
        if (this.currentUser) {
            const currentUser = this.currentUser;
            objectKeys(this.currentUser).forEach(key => {
                delete currentUser[key];
            });
        }
        Object.assign(this.currentUser, userConfig);
    }
}