import { useNow } from "@vueuse/core";
import { formatDuration } from "date-fns";
import { groupBy } from "jaz-ts-utils";
import { TachyonUser } from "tachyon-protocol";
import { computed, ComputedRef, reactive, shallowReactive, WatchStopHandle } from "vue";

import { BattleOptions, BattlePlayer, BattleSpectator, BattleUser, Bot } from "@/model/battle/battle-types";
import { MapData } from "@/model/cache/map-data";
import { isBot, isPlayer } from "@/utils/type-checkers";

export interface BattleConfig<T extends BattleOptions> {
    battleOptions: T;
    bots: Bot[];
    users: BattleUser[];
}

export function isBattle(battle: unknown): battle is AbstractBattle<BattleOptions> {
    return battle instanceof AbstractBattle;
}

export abstract class AbstractBattle<T extends BattleOptions> {
    public readonly battleOptions: T; // this should probably be protected with getters exposed but not setters
    public readonly bots: Bot[];
    public readonly users: BattleUser[];

    // helpers
    public readonly participants: ComputedRef<Array<BattleUser | Bot>>;
    public readonly contenders: ComputedRef<Array<BattlePlayer | Bot>>;
    public readonly players: ComputedRef<Array<BattlePlayer>>;
    public readonly spectators: ComputedRef<Array<BattleSpectator>>;
    public readonly teams: ComputedRef<Map<number, Array<BattlePlayer | Bot>>>;
    public readonly friendlyRuntime: ComputedRef<string | null>;
    public readonly runtimeMs: ComputedRef<number | null>;
    public readonly map: ComputedRef<MapData | undefined>;
    public readonly playerCount: ComputedRef<number>;

    protected watchStopHandles: WatchStopHandle[] = [];

    constructor(config: BattleConfig<T>) {
        this.battleOptions = reactive(config.battleOptions) as T;
        this.bots = reactive(config.bots);
        this.users = shallowReactive(config.users); // users are already reactive, so making them doubly reactive here will cause bugs

        this.participants = computed(() => [...this.users, ...this.bots]);
        this.contenders = computed(() => this.participants.value.filter((participant): participant is BattlePlayer | Bot => isPlayer(participant) || isBot(participant)));
        this.players = computed(() => this.users.filter((user): user is BattlePlayer => !user.battleStatus.isSpectator));
        this.spectators = computed(() => this.users.filter((user): user is BattleSpectator => user.battleStatus.isSpectator));
        this.teams = computed(() => {
            const teams = groupBy(this.contenders.value, (player) => ("userId" in player ? player.battleStatus.teamId : player.teamId));
            const sortedTeams = new Map([...teams.entries()].sort());
            return sortedTeams;
        });
        this.runtimeMs = computed(() => {
            if (!this.battleOptions.startTime) {
                return null;
            }
            const ms = useNow({ interval: 1000 }).value.getTime() - this.battleOptions.startTime.getTime();
            return ms;
        });
        this.friendlyRuntime = computed(() => {
            if (!this.battleOptions.startTime) {
                return null;
            }
            const ms = useNow({ interval: 1000 }).value.getTime() - this.battleOptions.startTime.getTime();
            const runtimeDate = new Date(ms);
            const hours = runtimeDate.getHours() - 1;
            const minutes = runtimeDate.getMinutes();
            const seconds = runtimeDate.getSeconds();
            return `Running for ${formatDuration({ hours, minutes, seconds })}`;
        });
        this.map = computed(() => api.content.maps.installedVersions.find((map) => map.scriptName === this.battleOptions.map));
        this.playerCount = computed(() => {
            return this.players.value.length + this.spectators.value.length;
        });
    }

    public getTeamParticipants(teamId: number): Array<TachyonUser | Bot> {
        return this.contenders.value.filter((contender) => ("userId" in contender ? contender.battleStatus.teamId === teamId : contender.teamId === teamId));
    }

    // public getParticipantByName(name: string): TachyonUser | Bot | undefined {
    //     return this.participants.value.find((participant) => {
    //         const isBot = !("userId" in participant);
    //         if (isBot) {
    //             if (participant.name === name) {
    //                 return true;
    //             }
    //         } else {
    //             if (api.session.getTachyonUserById(participant.userId)?.username === name) {
    //                 return true;
    //             }
    //         }
    //         return false;
    //     });
    // }

    // public open() {
    //     this.watchStopHandles = [
    //         watch(
    //             () => this.battleOptions.engineVersion,
    //             (engineVersion) => {
    //                 api.content.engine.downloadEngine(engineVersion);
    //             },
    //             {
    //                 immediate: true,
    //             }
    //         ),
    //         watch(
    //             () => this.battleOptions.gameVersion,
    //             (gameVersion) => {
    //                 api.content.game.downloadGame(gameVersion);
    //             },
    //             {
    //                 immediate: true,
    //             }
    //         ),
    //         watch(
    //             () => this.battleOptions.map,
    //             (mapScriptName) => {
    //                 api.content.maps.downloadMap(mapScriptName);
    //             },
    //             {
    //                 immediate: true,
    //             }
    //         ),
    //     ];
    // }

    // public leave() {
    //     for (const stopWatchHandle of this.watchStopHandles) {
    //         stopWatchHandle();
    //     }
    // }

    // public abstract start(): void;
    // public abstract setMap(map: string): void;
    // public abstract setGame(gameVersion: string): void;
    // public abstract setEngine(engineVersion: string): void;
    // public abstract setStartPosType(startPosType: StartPosType): void;
    // public abstract setStartBoxes(orientation: StartBoxOrientation, size: number): void;
    // public abstract setGameOptions(options: Record<string, unknown>): void;
    // public abstract setBotOptions(botName: string, options: Record<string, unknown>): void;
    // public abstract addBot(bot: Bot): void;
    // public abstract removeBot(bot: Bot): void;
    // public abstract playerToSpectator(player: BattleUser): void;
    // public abstract spectatorToPlayer(spectator: BattleUser, teamId: number): void;
    // public abstract setContenderTeam(contender: BattleUser | Bot, teamId: number): void;
}
