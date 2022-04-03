import { Battler } from "@/model/battle/battler";
import { Bot } from "@/model/battle/bot";
import { Player } from "@/model/battle/player";
import { StartBox } from "@/model/battle/types";
import { SetOptional } from "type-fest";

export interface AllyTeamConfig {
    battlers: Array<Player | Bot>;
    startBox?: StartBox;
}

export class AllyTeam {
    public battlers: Array<Player | Bot>;
    public startBox?: StartBox;

    constructor(config: SetOptional<AllyTeamConfig, "battlers"> = {}) {
        const battlers: Array<Player | Bot> = [];
        config.battlers ??= [];
        for (const battler of config.battlers) {
            if (battler instanceof Battler) {
                battlers.push(battler);
            } else {
                if ("user" in battler) {
                    const player = new Player(battler);
                    battlers.push(player);
                } else {
                    const bot = new Bot(battler);
                    battlers.push(bot);
                }
            }
        }
        this.battlers = config.battlers;
    }

    public addBattler(player: Player) : Player;
    public addBattler(playerConfig: ConstructorParameters<typeof Player>["0"]) : Player;
    public addBattler(bot: Bot) : Bot;
    public addBattler(botConfig: ConstructorParameters<typeof Bot>["0"]) : Bot;
    public addBattler(battler: Player | Bot | ConstructorParameters<typeof Player>["0"] | ConstructorParameters<typeof Bot>["0"]) : Player | Bot | undefined {
        if (battler instanceof Player || battler instanceof Bot) {
            if (battler instanceof Player && this.getBattler(battler)) {
                console.warn(`Tried to add player to team but player already added: ${battler}`);
            } else if (battler instanceof Bot && this.getBattler(battler)) {
                console.warn(`Tried to add bot to team but bot already added: ${battler}`);
            } else {
                this.battlers.push(battler);
            }
            return battler;
        } else {
            if ("user" in battler && !this.getBattler(battler.userId.userId)) {
                const player = new Player(battler);
                this.battlers.push(battler);
                return player;
            } else if ("ai" in battler && !this.getBattler(battler.name)) {
                const bot = new Bot(battler);
                this.battlers.push(bot);
                return bot;
            }
        }
    }

    public removeBattler(name: string) : Player | Bot | undefined;
    public removeBattler(userId: number) : Player | undefined;
    public removeBattler(player: Player) : Player | undefined;
    public removeBattler(bot: Bot) : Bot | undefined;
    public removeBattler(prop: string | number | Player | Bot) : Player | Bot | undefined {
        let battler: Player | Bot | undefined;
        if (typeof prop === "string") {
            battler = this.getBattler(prop);
        } else if (typeof prop === "number") {
            battler = this.getBattler(prop);
        } else if (prop instanceof Player) {
            battler = this.getBattler(prop);
        } else if (prop instanceof Bot) {
            battler = this.getBattler(prop);
        }

        if (battler) {
            this.battlers.splice(this.battlers.indexOf(battler), 1);
        } else {
            console.warn(`Tried to remove battler from team but battler not found: ${battler}`);
        }

        return battler;
    }

    public getBattler(name: string) : Player | Bot | undefined;
    public getBattler(userId: number) : Player | undefined;
    public getBattler(player: Player) : Player | undefined;
    public getBattler(bot: Bot) : Bot | undefined;
    public getBattler(prop: string | number | Player | Bot) : Player | Bot | undefined {
        if (typeof prop === "string") {
            return this.battlers.find(battler => {
                if ("user" in battler) {
                    return battler.userId.username === prop;
                } else if (battler instanceof Bot) {
                    return battler.name === prop;
                }
                return false;
            });
        } else if (typeof prop === "number") {
            return this.battlers.find(battler => battler instanceof Player && battler.userId.userId === prop);
        } else {
            return this.battlers.find(battler => battler === prop);
        }
    }
}