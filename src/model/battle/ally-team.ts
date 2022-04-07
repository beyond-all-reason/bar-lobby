import { Battle } from "@/model/battle/battle";
import { Bot, BotConfig } from "@/model/battle/bot";
import { Player, PlayerConfig } from "@/model/battle/player";
import { Spectator } from "@/model/battle/spectator";
import { StartBox } from "@/model/battle/types";

export interface AllyTeamConfig {
    battlers: Array<PlayerConfig | BotConfig>;
    startBox?: StartBox;
}

export class AllyTeam implements Omit<AllyTeamConfig, "battlers"> {
    public battle: Battle;
    public battlers: Array<Player | Bot> = [];
    public startBox?: StartBox;

    public constructor(battle: Battle, config: Omit<AllyTeamConfig, "battlers"> = {}) {
        this.battle = battle;

        config.startBox && (this.startBox = config.startBox);
    }

    public addBattler(player: Player) : Player;
    public addBattler(playerConfig: PlayerConfig) : Player;
    public addBattler(bot: Bot) : Bot;
    public addBattler(botConfig: BotConfig) : Bot;
    public addBattler(battler: Player | Bot | PlayerConfig | BotConfig) : Player | Bot | undefined {
        if (battler instanceof Player || battler instanceof Bot) {
            if (battler instanceof Player && !this.battlers.includes(battler)) {
                console.warn(`Tried to add player to team but player already added: ${battler}`);
            } else if (battler instanceof Bot && !this.battlers.includes(battler)) {
                console.warn(`Tried to add bot to team but bot already added: ${battler}`);
            } else {
                battler.allyTeam = this;
                this.battlers.push(battler);
            }
            return battler;
        } else {
            if ("user" in battler && battler.user?.userId && !this.getBattler(battler.user.userId)) {
                const player = new Player(this, battler);
                this.battlers.push(player);
                return player;
            } else if ("aiShortName" in battler && !this.getBattler(battler.name)) {
                let owner: Player | Spectator | undefined;
                for (const battlerOrSpectator of [ ...this.battle.getBattlers(), this.battle.spectators]) {
                    if ("user" in battlerOrSpectator && battlerOrSpectator.user.username) {
                        owner = battlerOrSpectator;
                    }
                }
                if (owner) {
                    const bot = new Bot(this, owner, battler);
                    this.battlers.push(bot);
                    return bot;
                } else {
                    console.warn(`Couldn't add bot because couldn't find bot owner: ${battler.ownerName}`);
                }
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
    public getBattler(prop: string | number) : Player | Bot | undefined {
        if (typeof prop === "string") {
            for (const battler of this.battlers) {
                if (battler instanceof Bot && battler.name === prop) {
                    return battler;
                } else if (battler instanceof Player && battler.user.username === prop) {
                    return battler;
                }
            }
        } else {
            return this.battlers.find(battler => battler instanceof Player && battler.user?.userId === prop);
        }
    }

    public getPlayer(name: string) : Player | undefined;
    public getPlayer(userId: number) : Player | undefined;
    public getPlayer(prop: string | number) : Player | undefined {
        for (const battler of this.battlers) {
            if (battler instanceof Player) {
                if (battler.user.userId === prop || battler.user.username === prop) {
                    return battler;
                }
            }
        }
    }
}