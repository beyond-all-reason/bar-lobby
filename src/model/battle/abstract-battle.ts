import { groupBy } from "jaz-ts-utils";
import { computed, ComputedRef, reactive } from "vue";

import { BattleOptions, Bot } from "@/model/battle/types";
import { User } from "@/model/user";

export interface BattleConfig {
    battleOptions: BattleOptions;
    bots: Bot[];
    userIds: number[];
}

export abstract class AbstractBattle implements BattleConfig {
    public readonly battleOptions: BattleOptions;
    public readonly bots: Bot[];
    public readonly userIds: number[];

    // helpers
    public readonly participants: ComputedRef<Array<User | Bot>>;
    public readonly contenders: ComputedRef<Array<User | Bot>>;
    public readonly battleUsers: ComputedRef<Array<User>>;
    public readonly players: ComputedRef<Array<User>>;
    public readonly spectators: ComputedRef<Array<User>>;
    public readonly teams: ComputedRef<Map<number, Array<User | Bot>>>;

    constructor(config: BattleConfig) {
        this.battleOptions = reactive(config.battleOptions);
        this.bots = reactive(config.bots);
        this.userIds = reactive(config.userIds);

        this.participants = computed(() => [...this.bots, ...this.battleUsers.value]);
        this.contenders = computed(() => this.participants.value.filter((participant) => ("userId" in participant ? !participant.battleStatus.isSpectator : true)));
        this.players = computed(() => this.battleUsers.value.filter((user) => !user.battleStatus.isSpectator));
        this.spectators = computed(() => this.battleUsers.value.filter((user) => user.battleStatus.isSpectator));
        this.battleUsers = computed(() => this.userIds.map((userId) => api.session.getUserById(userId)!));
        this.teams = computed(() => groupBy(this.contenders.value, (player) => ("userId" in player ? player.battleStatus.teamId : player.teamId)));
    }

    public getTeamParticipants(teamId: number): Array<User | Bot> {
        return this.contenders.value.filter((contender) => ("userId" in contender ? contender.battleStatus.teamId === teamId : contender.teamId === teamId));
    }

    public getParticipantByName(name: string): User | Bot | undefined {
        return this.participants.value.find((participant) => {
            const isBot = !("userId" in participant);
            if (isBot) {
                if (participant.name === name) {
                    return true;
                }
            } else {
                if (api.session.getUserById(participant.userId)?.username === name) {
                    return true;
                }
            }
            return false;
        });
    }

    public abstract changeMap(map: string): void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public abstract setGameOptions(options: Record<string, any>): void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public abstract setBotOptions(botName: string, options: Record<string, any>): void;
    public abstract addParticipant(participant: User | Bot): void;
    public abstract removeParticipant(participant: User | Bot): void;
    public abstract playerToSpectator(player: User): void;
    public abstract spectatorToPlayer(spectator: User, teamId: number): void;
    public abstract changeContenderTeam(contender: User | Bot, teamId: number): void;
}
