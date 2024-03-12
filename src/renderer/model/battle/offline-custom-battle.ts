import { AbstractCustomBattle } from "@/model/battle/abstract-custom-battle";
import { BattleUser, Bot, OfflineCustomBattleOptions, StartPosType } from "@/model/battle/battle-types";
import { StartBoxOrientation } from "@/utils/start-boxes";

export function isOfflineCustomBattle(battle: unknown): battle is OfflineCustomBattle {
    return battle instanceof OfflineCustomBattle;
}

export class OfflineCustomBattle extends AbstractCustomBattle<OfflineCustomBattleOptions> {
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

    // public override leave() {
    //     super.leave();

    //     api.session.offlineBattle.value = null;
    //     api.session.onlineUser.battleStatus.battleId = -1;
    //     api.router.replace("/home");
    // }

    // public start() {
    //     api.game.launch(this);
    // }

    // public setEngine(engineVersion: string) {
    //     this.battleOptions.engineVersion = engineVersion;
    // }

    // public setGame(gameVersion: string) {
    //     this.battleOptions.gameVersion = gameVersion;
    // }

    // public setMap(mapName: string) {
    //     this.battleOptions.map = mapName;
    //     this.battleOptions.startBoxes = defaultMapBoxes(mapName);
    // }

    // public setStartPosType(startPosType: StartPosType) {
    //     this.battleOptions.startPosType = startPosType;
    // }

    // public setStartBoxes(orientation: StartBoxOrientation, size: number) {
    //     this.battleOptions.startBoxes = getBoxes(orientation, size);
    // }

    // // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // public setGameOptions(options: Record<string, any>) {
    //     this.battleOptions.gameOptions = options;
    // }

    // public addBot(bot: Bot) {
    //     this.bots.push(bot);
    //     this.fixIds();
    // }

    // public removeBot(bot: Bot) {
    //     this.bots.splice(this.bots.indexOf(bot), 1);
    //     this.fixIds();
    // }

    // public playerToSpectator(player: User) {
    //     player.battleStatus.isSpectator = true;
    //     this.fixIds();
    // }

    // public spectatorToPlayer(spectator: User, teamId: number) {
    //     spectator.battleStatus.isSpectator = false;
    //     spectator.battleStatus.teamId = teamId;
    //     this.fixIds();
    // }

    // public setContenderTeam(contender: User | Bot, teamId: number) {
    //     if ("userId" in contender) {
    //         contender.battleStatus.teamId = teamId;
    //     } else {
    //         contender.teamId = teamId;
    //     }
    //     this.fixIds();
    // }

    // public setBotOptions(botName: string, options: Record<string, unknown>) {
    //     const bot = this.getParticipantByName(botName) as Bot;
    //     bot.aiOptions = options;
    // }

    // protected fixIds() {
    //     const contenders = this.contenders.value;

    //     const playerIds = Array.from(new Set(contenders.map((c) => ("userId" in c ? c.battleStatus.playerId : c.playerId))).values()).sort();
    //     const teamIds = Array.from(new Set(contenders.map((c) => ("userId" in c ? c.battleStatus.teamId : c.teamId))).values()).sort();
    //     for (const contender of contenders) {
    //         const newPlayerId = playerIds.indexOf("userId" in contender ? contender.battleStatus.playerId : contender.playerId);
    //         "userId" in contender ? (contender.battleStatus.playerId = newPlayerId) : (contender.playerId = newPlayerId);

    //         const newTeamId = teamIds.indexOf("userId" in contender ? contender.battleStatus.teamId : contender.teamId);
    //         "userId" in contender ? (contender.battleStatus.teamId = newTeamId) : (contender.teamId = newTeamId);
    //     }
    // }
}
