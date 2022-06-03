import { clone, groupBy } from "jaz-ts-utils";
import { computed, ComputedRef, reactive } from "vue";

import { defaultMapBoxes } from "@/config/default-boxes";
import { Bot, Player, Spectator } from "@/model/battle/participants";
import { BattleOptions, StartBox, StartPosType } from "@/model/battle/types";
import { setObject } from "@/utils/set-object";
import { TypedProxyHandler } from "@/utils/typed-proxy-handler";

export interface BattleConfig {
    battleOptions: BattleOptions;
    participants: Array<Player | Bot | Spectator>;
}

export class Battle implements BattleConfig {
    public readonly battleOptions: BattleOptions;
    public readonly participants: Array<Player | Bot | Spectator>;
    public readonly numOfTeams: ComputedRef<number>;
    public readonly teams: ComputedRef<Map<number, Array<Player | Bot>>>;
    public readonly me: ComputedRef<Player | Spectator | undefined>;
    public readonly contenders: ComputedRef<Array<Player | Bot>>;
    public readonly spectators: ComputedRef<Array<Spectator>>;
    public readonly battleUsers: ComputedRef<Array<Player | Spectator>>;

    protected battleOptionsProxyHandler: TypedProxyHandler<BattleOptions>;
    protected participantProxyHandler: TypedProxyHandler<Player | Bot | Spectator>;

    constructor(config: BattleConfig) {
        this.participants = reactive([]);

        this.battleOptionsProxyHandler = {
            set: (target, prop, value, receiver) => {
                if (prop === "mapFileName" && this.battleOptions.offline) {
                    this.setBoxes(value as string);
                }
                return Reflect.set(target, prop, value, receiver);
            },
        };
        this.battleOptions = reactive(new Proxy(config.battleOptions ?? {}, this.battleOptionsProxyHandler));

        this.participantProxyHandler = {
            set: (target, prop: keyof Player & keyof Bot, value, receiver) => {
                if (this.battleOptions.offline) {
                    Reflect.set(target, prop, value, receiver);
                    this.fixIds();
                }
                return true;
            },
        };

        this.numOfTeams = computed(() => new Set(this.contenders.value.map((contentender) => contentender.teamId)).size);
        this.teams = computed(() => groupBy(this.contenders.value, (player) => player.teamId));
        this.me = computed(() => this.participants.find((participant): participant is Player | Spectator => "userId" in participant && participant.userId === api.session.currentUser.userId));
        this.contenders = computed(() => this.participants.filter((participant): participant is Player | Bot => participant.type === "player" || participant.type === "bot"));
        this.spectators = computed(() => this.participants.filter((participant): participant is Spectator => participant.type === "spectator"));
        this.battleUsers = computed(() => this.participants.filter((participant): participant is Player | Spectator => participant.type === "spectator" || participant.type === "player"));

        for (const participant of config.participants) {
            this.addParticipant(participant);
        }
    }

    public set(config: BattleConfig) {
        setObject(this.battleOptions, config.battleOptions);
        setObject(this.participants, []);

        for (const participant of config.participants) {
            this.addParticipant(participant);
        }

        this.setBoxes(this.battleOptions.mapFileName);
    }

    public addParticipant(participantConfig: Player | Bot | Spectator) {
        const participant = new Proxy(participantConfig, this.participantProxyHandler);
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
            id: this.contenders.value.length,
            type: "player",
            userId: spectator.userId,
            teamId,
        });
    }

    public getTeamParticipants(teamId: number): Array<Player | Bot> {
        return this.contenders.value.filter((contender) => contender.teamId === teamId);
    }

    protected fixIds() {
        if (!this.battleOptions.offline) {
            // can't fix ids locally for an online battle
            return;
        }

        const contenders = this.contenders.value;

        const contenderIds = Array.from(new Set(this.contenders.value.map((c) => c.id)).values()).sort();
        const teamIds = Array.from(new Set(this.contenders.value.map((c) => c.teamId)).values()).sort();
        for (const contender of contenders) {
            const newContenderId = contenderIds.indexOf(contender.id);
            if (contender.id !== newContenderId && newContenderId !== -1) {
                // only assign if id is different to avoid recursive proxy trap calls
                contender.id = newContenderId;
            }
            const newTeamId = teamIds.indexOf(contender.teamId);
            if (contender.teamId !== newTeamId && newTeamId !== -1) {
                // only assign if id is different to avoid recursive proxy trap calls
                contender.teamId = newTeamId;
            }
        }
    }

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
}
