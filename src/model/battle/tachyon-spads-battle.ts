import { AbstractBattle } from "@/model/battle/abstract-battle";
import { Bot, Player, Spectator } from "@/model/battle/participants";

export class TachyonSpadsBattle extends AbstractBattle {
    public changeMap(map: string) {
        api.comms.request("c.lobby.message", {
            message: `!map ${map}`,
        });
    }

    public setGameOptions(options: Record<string, any>) {
        // TODO
    }

    public updateParticipant(name: string, updatedProperties: Partial<Player | Bot | Spectator>) {
        // TODO
    }

    public say(message: string) {
        api.comms.request("c.lobby.message", {
            message,
        });
    }

    public addParticipant(participant: Player | Bot | Spectator) {
        // TODO
    }

    public removeParticipant(participant: Player | Bot | Spectator) {
        // TODO
    }

    public playerToSpectator(player: Player) {
        // TODO
    }

    public spectatorToPlayer(spectator: Spectator, teamId: number) {
        // TODO
    }

    public changeContenderTeam(contender: Player | Bot, teamId: number) {
        // TODO
    }

    public setBotOptions(botName: string, options: Record<string, any>) {
        // TODO
    }
}
