import { AbstractBattle } from "@/model/battle/abstract-battle";
import { Bot, Player, Spectator } from "@/model/battle/participants";

export class OfflineBattle extends AbstractBattle {
    public changeMap(map: string) {
        this.battleOptions.mapFileName = map;
    }

    public setGameOptions(options: Record<string, any>) {
        this.battleOptions.gameOptions = options;
    }

    public addParticipant(participant: Player | Bot | Spectator) {
        this.participants.push(participant);
        this.fixIds();
    }

    public removeParticipant(participant: Player | Bot | Spectator) {
        this.participants.splice(this.participants.indexOf(participant), 1);
        this.fixIds();
    }

    public playerToSpectator(player: Player) {
        this.removeParticipant(player);
        this.addParticipant({
            type: "spectator",
            userId: player.userId,
        });
    }

    public spectatorToPlayer(spectator: Spectator, teamId: number) {
        this.removeParticipant(spectator);
        this.addParticipant({
            playerId: this.contenders.value.length,
            type: "player",
            userId: spectator.userId,
            teamId,
        });
    }

    public changeContenderTeam(contender: Player | Bot, teamId: number) {
        contender.teamId = teamId;
        this.fixIds();
    }

    public setBotOptions(botName: string, options: Record<string, unknown>) {
        const bot = this.getParticipantByName(botName) as Bot;
        bot.aiOptions = options;
    }

    protected fixIds() {
        const contenders = this.contenders.value;

        const contenderIds = Array.from(new Set(this.contenders.value.map((c) => c.playerId)).values()).sort();
        const teamIds = Array.from(new Set(this.contenders.value.map((c) => c.teamId)).values()).sort();
        for (const contender of contenders) {
            const newContenderId = contenderIds.indexOf(contender.playerId);
            if (contender.playerId !== newContenderId && newContenderId !== -1) {
                // only assign if id is different to avoid recursive proxy trap calls
                contender.playerId = newContenderId;
            }
            const newTeamId = teamIds.indexOf(contender.teamId);
            if (contender.teamId !== newTeamId && newTeamId !== -1) {
                // only assign if id is different to avoid recursive proxy trap calls
                contender.teamId = newTeamId;
            }
        }
    }

    // protected setBoxes(mapFileName: string) {
    //     if (this.battleOptions.startPosType === StartPosType.Boxes) {
    //         const boxes: StartBox[] | undefined = clone(defaultMapBoxes()[mapFileName]);
    //         if (boxes) {
    //             this.battleOptions.startBoxes[0] = boxes[0];
    //             this.battleOptions.startBoxes[1] = boxes[1];
    //         } else {
    //             this.battleOptions.startBoxes[0] = { xPercent: 0, yPercent: 0, widthPercent: 0.25, heightPercent: 1 };
    //             this.battleOptions.startBoxes[1] = { xPercent: 0.75, yPercent: 0, widthPercent: 0.25, heightPercent: 1 };
    //         }
    //     }
    // }

    // protected configureTeams(teamPreset: TeamPreset) {
    //     if (teamPreset === TeamPreset.Standard) {
    //         this.teams.length = 2;
    //         this.battleOptions.startPosType = StartPosType.Boxes;
    //     } else if (teamPreset === TeamPreset.FFA) {
    //         this.teams.length = this.participants.length;
    //         this.battleOptions.startPosType = StartPosType.Fixed; // TODO: should be random?
    //     } else if (teamPreset === TeamPreset.TeamFFA) {
    //         this.battleOptions.startPosType = StartPosType.Fixed;
    //     }
    // }
}
