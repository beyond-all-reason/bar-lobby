import { AbstractBattle } from "@/model/battle/abstract-battle";
import type { BattleUser, Bot, CustomBattleOptions, StartPosType } from "@/model/battle/battle-types";
import type { StartBoxOrientation } from "@/utils/start-boxes";

export abstract class AbstractCustomBattle<T extends CustomBattleOptions> extends AbstractBattle<T> {
    public abstract open(): void;
    public abstract leave(): void;
    public abstract start(): void;
    public abstract setMap(map: string): void;
    public abstract setGame(gameVersion: string): void;
    public abstract setEngine(engineVersion: string): void;
    public abstract setStartPosType(startPosType: StartPosType): void;
    public abstract setStartBoxes(orientation: StartBoxOrientation, size: number): void;
    public abstract setGameOptions(options: Record<string, unknown>): void;
    public abstract setBotOptions(botName: string, options: Record<string, unknown>): void;
    public abstract addBot(bot: Bot): void;
    public abstract removeBot(bot: Bot): void;
    public abstract playerToSpectator(player: BattleUser): void;
    public abstract spectatorToPlayer(spectator: BattleUser, teamId: number): void;
    public abstract setContenderTeam(contender: BattleUser | Bot, teamId: number): void;
}
