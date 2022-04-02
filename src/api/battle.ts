import { defaultBattle } from "@/config/default-battle";
import { BattleTypes } from "@/model/battle";
import { StartScriptConverter } from "@/utils/start-script-converter";
import { reactive } from "vue";

export class BattleAPI {
    public static isBot(playerOrBot: BattleTypes.Player | BattleTypes.Bot) : playerOrBot is BattleTypes.Bot {
        return "ai" in playerOrBot;
    }

    public readonly currentBattle: BattleTypes.Battle = reactive(defaultBattle(window.api.session.model.user?.name ?? "Player"));
    protected scriptConverter = new StartScriptConverter();

    public setBattle(battle: BattleTypes.Battle) {
        Object.assign(this.currentBattle, battle);
    }

    public resetToDefault() {
        this.setBattle(defaultBattle(window.api.session.model.user?.name ?? "Player"));
    }

    public getPlayersAndBots() {
        return this.currentBattle.allyTeams.flatMap(allyTeam => allyTeam.teams.flatMap(team => [ ...team.players, ...team.bots ]));
    }

    public getPlayerOrBot(userIdOrName: number | string) {
        return this.getPlayersAndBots().find(playerOrBot => {
            if (BattleAPI.isBot(playerOrBot)) {
                return playerOrBot.name === userIdOrName;
            } else {
                return playerOrBot.name === userIdOrName || playerOrBot.userId === userIdOrName;
            }
        });
    }

    public getSpectator(userIdOrUsername: number | string) {
        return this.currentBattle.spectators.find(spectator => spectator.userId === userIdOrUsername || spectator.name === userIdOrUsername);
    }

    public addPlayerOrBot(playerOrBot: BattleTypes.Player | BattleTypes.Bot, allyTeam: BattleTypes.AllyTeam | number, team: BattleTypes.Team | number) {
        if (typeof allyTeam === "number") {
            allyTeam = this.currentBattle.allyTeams[allyTeam];
        }
        if (typeof team === "number") {
            team = allyTeam.teams[team];
        }

        if (BattleAPI.isBot(playerOrBot)) {
            team.bots.push(playerOrBot);
        } else {
            team.players.push(playerOrBot);
        }
    }

    public addSpectator(spectator: BattleTypes.Spectator) {
        if (!this.getSpectator(spectator.userId)) {
            this.currentBattle.spectators.push(spectator);
        }
    }

    /** Removing a player moves them to spectators */
    public removePlayer(userId: number) : void;
    public removePlayer(username: string) : void;
    public removePlayer(userIdOrUsername: number | string) : void {
        let playerToRemove: BattleTypes.Player | undefined;

        for (const allyTeam of this.currentBattle.allyTeams) {
            for (const team of allyTeam.teams) {
                team.players.forEach((player, i) => {
                    if (player.userId === userIdOrUsername || player.name === userIdOrUsername) {
                        playerToRemove = player;
                        team.players.splice(i, 1);
                    }
                });
            }
        }

        if (playerToRemove) {
            this.addSpectator(playerToRemove);
        }

        console.warn(`Could not remove player ${userIdOrUsername} as they were not found`);
    }

    /** Remove a player from the battle completely, also works on spectators and bots */
    public kickPlayer() {
        //
    }
}