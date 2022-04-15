import { defaultBattle } from "@/config/default-battle";
import { Battle } from "@/model/battle/battle";
import { Bot, Player, Spectator } from "@/model/battle/participants";
import { createDeepProxy, countRecords } from "jaz-ts-utils";
import { SetOptional } from "type-fest";
import { Ref, ref, reactive } from "vue";

export class BattleAPI {
    public readonly inBattle: Ref<boolean>;
    public readonly currentBattle: Battle;

    constructor() {
        this.inBattle = ref(false);

        this.currentBattle = reactive(createDeepProxy(defaultBattle(), (breadcrumb) => {
            const currentBattle = this.currentBattle;

            return {
                get(target, prop) {
                    return target[prop as keyof typeof target];
                },
                set(target, prop, value) {
                    if (currentBattle.battleOptions.offline) {
                        target[prop as keyof typeof target] = value;
                    } else {
                        // TODO: if set from server data then immediately apply
                        // TODO: if set from client then send server request for it
                        console.warn("can't set battle property directly");
                    }
                    return true;
                }
            };
        }, "battle"));
    }

    public setCurrentBattle(battle: Battle) {
        // // set properties on the battle object instead of reassigning it to keep the reactivity intact
        // const currentBattle = this.currentBattle;
        // objectKeys(this.currentBattle).forEach(key => {
        //     delete currentBattle[key];
        // });
        Object.assign(this.currentBattle, battle);

        this.inBattle.value = true;
    }

    public leaveCurrentbattle() {
        this.inBattle.value = false;
    }

    public getContenders() : Array<Player | Bot> {
        return this.currentBattle.participants.filter((participant): participant is Player | Bot => participant.type === "player" || participant.type === "bot");
    }

    public getParticipantByName(name: string) : Player | Bot | Spectator | null {
        for (const participant of this.currentBattle.participants) {
            if ("userId" in participant) {
                const user = window.api.session.getUserById(participant.userId);
                if (user?.username === name) {
                    return participant;
                }
            } else {
                if (participant.name === name) {
                    return participant;
                }
            }
        }
        return null;
    }

    public addParticipant(player: Player): void;
    public addParticipant(bot: SetOptional<Bot, "allyTeamId">): void;
    public addParticipant(Spectator: Spectator): void;
    public addParticipant(participant: Player | SetOptional<Bot, "allyTeamId"> | Spectator) {
        if (participant.type === "bot") {
            const allyTeamSizes = countRecords(this.currentBattle.participants, "allyTeamId");
            participant.allyTeamId ??= 0;
        } else {
            this.currentBattle.participants.push(participant);
        }
    }
}