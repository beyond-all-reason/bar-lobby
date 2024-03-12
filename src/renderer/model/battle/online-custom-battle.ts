import { AbstractCustomBattle } from "@/model/battle/abstract-custom-battle";
import type { BattleUser, Bot, OnlineCustomBattleOptions, StartPosType } from "@/model/battle/battle-types";
import type { StartBoxOrientation } from "@/utils/start-boxes";

export function isOnlineCustomBattle(battle: unknown): battle is OnlineCustomBattle {
    return battle instanceof OnlineCustomBattle;
}

export class OnlineCustomBattle extends AbstractCustomBattle<OnlineCustomBattleOptions> {
    public override open(): void {
        throw new Error("Method not implemented.");
    }

    public override leave(): void {
        throw new Error("Method not implemented.");
    }

    public override start(): void {
        throw new Error("Method not implemented.");
    }

    public override setMap(map: string): void {
        throw new Error("Method not implemented.");
    }

    public override setGame(gameVersion: string): void {
        throw new Error("Method not implemented.");
    }

    public override setEngine(engineVersion: string): void {
        throw new Error("Method not implemented.");
    }

    public override setStartPosType(startPosType: StartPosType): void {
        throw new Error("Method not implemented.");
    }

    public override setStartBoxes(orientation: StartBoxOrientation, size: number): void {
        throw new Error("Method not implemented.");
    }

    public override setGameOptions(options: Record<string, unknown>): void {
        throw new Error("Method not implemented.");
    }

    public override setBotOptions(botName: string, options: Record<string, unknown>): void {
        throw new Error("Method not implemented.");
    }

    public override addBot(bot: Bot): void {
        throw new Error("Method not implemented.");
    }

    public override removeBot(bot: Bot): void {
        throw new Error("Method not implemented.");
    }

    public override playerToSpectator(player: BattleUser): void {
        throw new Error("Method not implemented.");
    }

    public override spectatorToPlayer(spectator: BattleUser, teamId: number): void {
        throw new Error("Method not implemented.");
    }

    public override setContenderTeam(contender: Bot | BattleUser, teamId: number): void {
        throw new Error("Method not implemented.");
    }
    //
}
