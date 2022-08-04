import { AbstractBattle } from "@/model/battle/abstract-battle";
import { Bot } from "@/model/battle/types";
import { User } from "@/model/user";

export class OfflineBattle extends AbstractBattle {
    public changeEngine(engineVersion: string) {
        this.battleOptions.engineVersion = engineVersion;
    }

    public changeGame(gameVersion: string) {
        this.battleOptions.gameVersion = gameVersion;
    }

    public changeMap(map: string) {
        this.battleOptions.map = map;
    }

    public setGameOptions(options: Record<string, any>) {
        this.battleOptions.gameOptions = options;
    }

    public addParticipant(participant: User | Bot) {
        if ("userId" in participant) {
            const user = api.session.getUserById(participant.userId);
            if (user) {
                this.userIds.push(participant.userId);
            } else {
                console.error("User not found", participant.userId);
            }
        } else {
            this.bots.push(participant);
        }
        this.fixIds();
    }

    public removeParticipant(participant: User | Bot) {
        if ("userId" in participant) {
            this.userIds.splice(this.userIds.indexOf(participant.userId), 1);
        } else {
            this.bots.splice(this.bots.indexOf(participant), 1);
        }
        this.fixIds();
    }

    public playerToSpectator(player: User) {
        player.battleStatus.isSpectator = true;
        this.fixIds();
    }

    public spectatorToPlayer(spectator: User, teamId: number) {
        spectator.battleStatus.isSpectator = false;
        spectator.battleStatus.teamId = teamId;
        this.fixIds();
    }

    public changeContenderTeam(contender: User | Bot, teamId: number) {
        if ("userId" in contender) {
            contender.battleStatus.teamId = teamId;
        } else {
            contender.teamId = teamId;
        }
        this.fixIds();
    }

    public setBotOptions(botName: string, options: Record<string, unknown>) {
        const bot = this.getParticipantByName(botName) as Bot;
        bot.aiOptions = options;
    }

    public leave() {
        api.session.offlineBattle = null;
        api.session.currentUser.battleStatus.battleId = -1;
        api.router.replace("/home");
    }

    protected fixIds() {
        const contenders = this.contenders.value;

        const playerIds = Array.from(new Set(contenders.map((c) => ("userId" in c ? c.battleStatus.playerId : c.playerId))).values()).sort();
        const teamIds = Array.from(new Set(contenders.map((c) => ("userId" in c ? c.battleStatus.teamId : c.teamId))).values()).sort();
        for (const contender of contenders) {
            const newPlayerId = playerIds.indexOf("userId" in contender ? contender.battleStatus.playerId : contender.playerId);
            "userId" in contender ? (contender.battleStatus.playerId = newPlayerId) : (contender.playerId = newPlayerId);

            const newTeamId = teamIds.indexOf("userId" in contender ? contender.battleStatus.teamId : contender.teamId);
            "userId" in contender ? (contender.battleStatus.teamId = newTeamId) : (contender.teamId = newTeamId);
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
