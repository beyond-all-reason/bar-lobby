import { clone } from "jaz-ts-utils";

import { defaultMapBoxes } from "@/config/default-boxes";
import { AbstractBattle } from "@/model/battle/abstract-battle";
import { StartBox, StartPosType } from "@/model/battle/types";

export class OfflineBattle extends AbstractBattle {
    public changeMap(map: string) {
        console.log(`Offline Changing map to ${map}`);
    }

    // protected fixIds() {
    //     if (!this.battleOptions.offline) {
    //         // can't fix ids locally for an online battle
    //         return;
    //     }

    //     const contenders = this.contenders.value;

    //     const contenderIds = Array.from(new Set(this.contenders.value.map((c) => c.id)).values()).sort();
    //     const teamIds = Array.from(new Set(this.contenders.value.map((c) => c.teamId)).values()).sort();
    //     for (const contender of contenders) {
    //         const newContenderId = contenderIds.indexOf(contender.id);
    //         if (contender.id !== newContenderId && newContenderId !== -1) {
    //             // only assign if id is different to avoid recursive proxy trap calls
    //             contender.id = newContenderId;
    //         }
    //         const newTeamId = teamIds.indexOf(contender.teamId);
    //         if (contender.teamId !== newTeamId && newTeamId !== -1) {
    //             // only assign if id is different to avoid recursive proxy trap calls
    //             contender.teamId = newTeamId;
    //         }
    //     }
    // }

    protected setBoxes(mapFileName: string) {
        if (this.battleOptions.startPosType === StartPosType.Boxes) {
            const boxes: StartBox[] | undefined = clone(defaultMapBoxes()[mapFileName]);
            if (boxes) {
                this.battleOptions.startBoxes[0] = boxes[0];
                this.battleOptions.startBoxes[1] = boxes[1];
            } else {
                this.battleOptions.startBoxes[0] = { xPercent: 0, yPercent: 0, widthPercent: 0.25, heightPercent: 1 };
                this.battleOptions.startBoxes[1] = { xPercent: 0.75, yPercent: 0, widthPercent: 0.25, heightPercent: 1 };
            }
        }
    }

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

    // public addParticipant(participantConfig: Player | Bot | Spectator) {
    //     const participant = new Proxy(participantConfig, this.participantProxyHandler);
    //     this.participants.push(participant);
    //     this.fixIds();
    // }

    // public removeParticipant(participant: Player | Bot | Spectator) {
    //     this.participants.splice(this.participants.indexOf(participant), 1);
    //     this.fixIds();
    // }

    // public playerToSpectator(player: Player) {
    //     this.removeParticipant(player);
    //     this.addParticipant({
    //         type: "spectator",
    //         userId: player.userId,
    //     });
    // }

    // public spectatorToPlayer(spectator: Spectator, teamId: number) {
    //     this.removeParticipant(spectator);
    //     this.addParticipant({
    //         id: this.contenders.value.length,
    //         type: "player",
    //         userId: spectator.userId,
    //         teamId,
    //     });
    // }
}
