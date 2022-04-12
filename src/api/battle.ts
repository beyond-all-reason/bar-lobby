import { defaultBattle } from "@/config/default-battle";
import { Battle } from "@/model/battle/battle";
import { Bot, isBot } from "@/model/battle/bot";
import { Player } from "@/model/battle/player";
import { Spectator } from "@/model/battle/spectator";
import { createDeepProxy } from "@/utils/create-deep-proxy";
import { objectKeys } from "jaz-ts-utils";
import { Ref, ref, reactive } from "vue";

export class BattleAPI {
    public readonly inBattle: Ref<boolean>;
    public readonly currentBattle: Battle;

    constructor() {
        this.inBattle = ref(false);

        // TODO: make this use a createDeepProxy object which acts an intermediary between the client setting battle options and the server validating them
        this.currentBattle = reactive(createDeepProxy(defaultBattle(), (breadcrumb) => {
            return {
                get(target, prop) {
                    return target[prop as keyof typeof target];
                },
                set(target, prop, value) {
                    target[prop as keyof typeof target] = value;
                    return true;
                }
            };
        }, "battle"));
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

    public addBattler(battler: Player, allyTeamId: number): void;
    public addBattler(battler: Bot, allyTeamId: number): void;
    public addBattler(battler: Player | Bot, allyTeamId: number) {
        const allyTeam = this.currentBattle.allyTeams[allyTeamId];
        if (allyTeam) {
            if (isBot(battler)) {
                allyTeam.bots.push(battler);
            } else {
                allyTeam.players.push(battler);
            }
        }
    }

    public removeBattler(battler: Player): void;
    public removeBattler(battler: Bot): void;
    public removeBattler(battler: Player | Bot) {
        for (const allyTeam of this.currentBattle.allyTeams) {
            if (isBot(battler)) {
                for (const bot of allyTeam.bots) {
                    if (bot === battler) {
                        allyTeam.bots.splice(allyTeam.bots.indexOf(bot), 1);
                        return;
                    }
                }
            } else {
                for (const player of allyTeam.players) {
                    if (player === battler) {
                        allyTeam.players.splice(allyTeam.players.indexOf(player), 1);
                        return;
                    }
                }
            }
        }
    }

    public swapBattlerTeam(battler: Player, allyTeamId: number): void;
    public swapBattlerTeam(battler: Bot, allyTeamId: number): void;
    public swapBattlerTeam(battler: Player | Bot, allyTeamId: number) {
        if (isBot(battler)) {
            this.removeBattler(battler);
            this.addBattler(battler, allyTeamId);
        } else {
            this.removeBattler(battler);
            this.addBattler(battler, allyTeamId);
        }
    }

    public addSpectator(spectator: Spectator) {
        if (!this.currentBattle.spectators.includes(spectator)) {
            this.currentBattle.spectators.push(spectator);
        }
    }

    public removeSpectator(spectator: Spectator) {
        if (this.currentBattle.spectators.includes(spectator)) {
            this.currentBattle.spectators.splice(this.currentBattle.spectators.indexOf(spectator), 1);
        }
    }
}