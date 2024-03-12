/* eslint-disable @typescript-eslint/no-explicit-any */
import { assign } from "jaz-ts-utils";

import { AbstractBattle } from "@/model/battle/abstract-battle";
import { BattleOptions, StartPosType } from "@/model/battle/battle-types";
import { OfflineCustomBattle } from "@/model/battle/offline-custom-battle";
import { OnlineCustomBattle } from "@/model/battle/online-custom-battle";
import type { StartScriptTypes } from "@/model/start-script";

/**
 * https://springrts.com/wiki/Script.txt
 * https://github.com/spring/spring/blob/106.0/doc/StartScriptFormat.txt
 *ty
 * TODO:
 * - parse and convert restrictions
 */
export class StartScriptConverter {
    public generateScriptStr(battle: AbstractBattle<BattleOptions>): string {
        let scriptStr = "";
        if (battle instanceof OfflineCustomBattle) {
            const script = this.offlineBattleToStartScript(battle);
            scriptStr = this.generateScriptString(script);
        } else if (battle instanceof OnlineCustomBattle) {
            scriptStr = this.generateOnlineScript(battle);
        } else {
            throw new Error("Unsupported battle type");
        }
        return scriptStr;
    }

    public parseScript(scriptStr: string): StartScriptTypes.Game {
        let obj = this.scriptToObject(scriptStr).game;
        obj = this.coerceTypes(obj);
        obj = this.parseGroups(obj);

        return obj;
    }

    protected offlineBattleToStartScript(battle: OfflineCustomBattle): StartScriptTypes.Game {
        const allyTeams: StartScriptTypes.AllyTeam[] = [];
        const teams: StartScriptTypes.Team[] = [];
        const players: StartScriptTypes.Player[] = [];
        const bots: StartScriptTypes.Bot[] = [];

        let allyTeamId = 0;
        let teamId = 0;

        battle.teams.value.forEach((allyTeamConfig) => {
            const allyTeam: StartScriptTypes.AllyTeam = {
                id: allyTeamId,
                numallies: 0,
            };
            allyTeams.push(allyTeam);
            allyTeamId++;

            if (battle.battleOptions.startPosType === StartPosType.Boxes) {
                const box = battle.battleOptions.startBoxes[allyTeam.id];
                if (box) {
                    assign(allyTeam, {
                        startrectleft: box.xPercent,
                        startrecttop: box.yPercent,
                        startrectright: box.xPercent + box.widthPercent,
                        startrectbottom: box.yPercent + box.heightPercent,
                    });
                } else {
                    console.warn(`Ally team ${allyTeam.id} has no defined start area for this map`);
                }
            }

            allyTeamConfig.forEach((contender) => {
                const contenderOptions = "userId" in contender ? contender.battleStatus : contender;

                const team: StartScriptTypes.Team = {
                    id: contenderOptions.playerId,
                    allyteam: contenderOptions.teamId,
                    teamleader: 0,
                    //advantage: contenderOptions.advantage,
                    //handicap: contenderOptions.handicap,
                    //incomemultiplier: contenderOptions.incomeMultiplier,
                    //startposx: contenderOptions.startPos?.x,
                    //startposz: contenderOptions.startPos?.z,
                };
                teams.push(team);

                if ("userId" in contender) {
                    const player: StartScriptTypes.Player = {
                        id: contenderOptions.playerId,
                        team: team.id,
                        name: api.session.getUserById(contender.userId)?.username || "Player",
                        userId: contender.userId,
                    };
                    players.push(player);
                    teamId++;
                } else {
                    const bot: StartScriptTypes.Bot = {
                        id: contenderOptions.playerId,
                        team: team.id,
                        shortname: contender.aiShortName,
                        name: contender.name,
                        host: contender.ownerUserId,
                        options: contender.aiOptions,
                    };
                    bots.push(bot);
                }
            });
        });

        battle.spectators.value.forEach((spectatorConfig) => {
            const spectator: StartScriptTypes.Player = {
                id: players.length,
                spectator: 1,
                name: api.session.getUserById(spectatorConfig.userId)?.username || "Player",
                userId: spectatorConfig.userId,
            };
            players.push(spectator);
        });

        for (const bot of bots) {
            const owner = players.find((player) => player.userId === bot.host);
            if (!owner) {
                throw new Error(`Couldn't find owner for bot, ${JSON.stringify(bot)}`);
            }
            bot.host = owner.id;
        }

        return {
            gametype: battle.battleOptions.gameVersion,
            mapname: battle.battleOptions.map,
            modoptions: battle.battleOptions.gameOptions,
            ishost: 1,
            myplayername: api.session.offlineUser.displayName,
            startpostype: battle.battleOptions.startPosType,
            allyTeams,
            teams,
            players,
            ais: bots,
        };
    }

    protected generateScriptString(script: StartScriptTypes.Game): string {
        let scriptObj: Record<string, any> = JSON.parse(JSON.stringify(script));
        scriptObj = this.convertGroups(scriptObj);
        const scriptStr = this.stringifyScriptObj(scriptObj);

        return `[game] {${scriptStr}\n}`;
    }

    protected scriptToObject(scriptStr: string): Record<string, any> {
        let scriptJson = `{${scriptStr}}`;

        scriptJson = scriptJson
            .replace(/([^=\w\][])(\[(.*?)\])/gm, '$1"$3":')
            .replace(/^\s*(\w*)=(.*?);/gm, '"$1": "$2",')
            .replace(/\r|\n/gm, "")
            .replace(/",\s*}/gm, '"}')
            .replace(/}"/gm, '},"');

        try {
            const obj = JSON.parse(scriptJson);
            return obj;
        } catch (err) {
            console.error(err);
            throw err;
        }
    }

    protected coerceTypes(obj: Record<string, any>): Record<string, any> {
        for (const key in obj) {
            const val = obj[key];
            const newKey = key.toLowerCase();

            if (typeof val === "object") {
                obj[newKey] = this.coerceTypes(val);
            } else {
                let newVal = Number(val);
                if (Number.isNaN(newVal) || newKey.includes("name")) {
                    newVal = val;
                }

                obj[newKey] = newVal;
            }

            if (key !== newKey) {
                delete obj[key];
            }
        }

        return obj;
    }

    protected parseGroups(obj: Record<string, any>): StartScriptTypes.Game {
        const game = {} as StartScriptTypes.Game;
        const allyteams: StartScriptTypes.AllyTeam[] = [];
        const teams: StartScriptTypes.Team[] = [];
        const players: StartScriptTypes.Player[] = [];
        const ais: StartScriptTypes.Bot[] = [];

        for (const key in obj) {
            const val = obj[key];

            const groups = /(allyteam|team|player|ai)(\d)/i.exec(key);

            if (groups !== null) {
                const groupKey = groups[1];
                const id = groups[2];

                val.id = Number(id);

                if (groupKey === "allyteam") {
                    allyteams.push(val);
                } else if (groupKey === "team") {
                    teams.push(val);
                } else if (groupKey === "player") {
                    players.push(val);
                } else if (groupKey === "ai") {
                    ais.push(val);
                }

                delete obj[key];
            } else if (typeof val !== "object") {
                game[key] = val;
                delete obj[key];
            }
        }

        return {
            ...game,
            allyteams,
            teams,
            players,
            ais,
            ...obj,
        };
    }

    protected convertGroups(scriptObj: Record<string, any>): Record<string, any> {
        const groups = ["allyTeams", "teams", "players", "ais"];
        for (const key of groups) {
            const group = scriptObj[key];
            const newKey = key.slice(0, key.length - 1).toLowerCase();
            if (group?.length) {
                for (const entry of group) {
                    scriptObj[`${newKey}${entry.id}`] = entry;
                    delete entry.id;
                }
                delete scriptObj[key];
            }
        }

        for (const key in scriptObj.game) {
            scriptObj[key] = scriptObj.game[key];
        }
        delete scriptObj.game;

        return scriptObj;
    }

    protected stringifyScriptObj(obj: Record<string, any>, depth = 1): string {
        let str = "";
        const spacer = " ".repeat(depth * 4);

        for (const key in obj) {
            const val = obj[key];

            if (typeof val === "object") {
                str += `\n${spacer}[${key}] {${this.stringifyScriptObj(val, depth + 1)}\n${spacer}}`;
            } else {
                str += `\n${spacer}${key}=${val};`;
            }
        }

        return str;
    }

    protected generateOnlineScript(battle: OnlineCustomBattle) {
        return `[game] {
    hostip = ${battle.battleOptions.ip};
    hostport = ${battle.battleOptions.port};
    ishost = 0;
    mypasswd = ${battle.battleOptions.scriptPassword};
    myplayername = ${api.session.onlineUser.username};
}`;
    }
}
