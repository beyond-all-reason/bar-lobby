/* eslint-disable @typescript-eslint/no-explicit-any */
import { assign } from "jaz-ts-utils";

import { AbstractBattle } from "@/model/battle/abstract-battle";
import { OfflineBattle } from "@/model/battle/offline-battle";
import { TachyonSpadsBattle } from "@/model/battle/tachyon-spads-battle";
import { StartPosType } from "@/model/battle/types";
import type { StartScriptTypes } from "@/model/start-script";

/**
 * https://springrts.com/wiki/Script.txt
 * https://github.com/spring/spring/blob/106.0/doc/StartScriptFormat.txt
 *
 * TODO:
 * - parse and convert restrictions
 */
export class StartScriptConverter {
    public generateScriptStr(battle: AbstractBattle): string {
        let scriptStr = "";
        if (battle instanceof OfflineBattle) {
            const script = this.offlineBattleToStartScript(battle);
            scriptStr = this.generateScriptString(script);
        } else if (battle instanceof TachyonSpadsBattle) {
            scriptStr = this.generateOnlineScript(battle);
        }
        return scriptStr;
    }

    public parseScript(scriptStr: string): StartScriptTypes.Game {
        let obj = this.scriptToObject(scriptStr).game;
        obj = this.coerceTypes(obj);
        obj = this.parseGroups(obj);

        return obj;
    }

    protected offlineBattleToStartScript(battle: AbstractBattle): StartScriptTypes.Game {
        const allyTeams: StartScriptTypes.AllyTeam[] = [];
        const teams: StartScriptTypes.Team[] = [];
        const players: StartScriptTypes.Player[] = [];
        const bots: StartScriptTypes.Bot[] = [];

        let teamId = 0;
        let botIndex = 0;
        let playerIndex = 0;
        const botIdToUserIdMap: Record<number, number> = {};

        battle.contenders.value.forEach((contenderConfig) => {
            const contenderPlayerId = "userId" in contenderConfig ? contenderConfig.battleStatus.playerId : contenderConfig.playerId;
            const contenderTeamId = "userId" in contenderConfig ? contenderConfig.battleStatus.teamId : contenderConfig.teamId;
            if (!allyTeams[contenderTeamId]) {
                const allyTeam: StartScriptTypes.AllyTeam = {
                    id: contenderTeamId,
                    numallies: 0,
                };

                if (battle.battleOptions.startPosType === StartPosType.Boxes) {
                    const box = battle.battleOptions.startBoxes[contenderTeamId];
                    if (box) {
                        assign(allyTeam, {
                            startrectleft: box.xPercent,
                            startrecttop: box.yPercent,
                            startrectright: box.xPercent + box.widthPercent,
                            startrectbottom: box.yPercent + box.heightPercent,
                        });
                    } else {
                        console.warn(`Contender ${contenderPlayerId} has a teamId of ${contenderTeamId} but no start box was defined for that team`);
                    }
                }

                allyTeams.push(allyTeam);
            }

            const team: StartScriptTypes.Team = {
                id: contenderTeamId,
                allyteam: contenderTeamId,
                teamleader: 0,
            };
            const contenderOptions = "userId" in contenderConfig ? contenderConfig.battleStatus : contenderConfig;
            assign(team, {
                advantage: contenderOptions.advantage,
                handicap: contenderOptions.handicap,
                incomemultiplier: contenderOptions.incomeMultiplier,
                startposx: contenderOptions.startPos?.x,
                startposz: contenderOptions.startPos?.z,
            });
            teams.push(team);
            teamId++;

            if ("userId" in contenderConfig) {
                const player: StartScriptTypes.Player = {
                    id: playerIndex,
                    team: team.id,
                    name: api.session.getUserById(contenderConfig.userId)?.username || "Player",
                    userId: contenderConfig.userId,
                };
                players.push(player);
                playerIndex++;
            } else {
                const bot: StartScriptTypes.Bot = {
                    id: botIndex,
                    team: team.id,
                    shortname: contenderConfig.aiShortName,
                    name: contenderConfig.name,
                    host: -1,
                    options: contenderConfig.aiOptions,
                };
                botIdToUserIdMap[bot.id] = contenderConfig.ownerUserId;
                bots.push(bot);
                botIndex++;
            }
        });

        battle.spectators.value.forEach((spectatorConfig) => {
            const spectator: StartScriptTypes.Player = {
                id: playerIndex,
                spectator: 1,
                name: api.session.getUserById(spectatorConfig.userId)?.username || "Player",
                userId: spectatorConfig.userId,
            };
            playerIndex++;
            players.push(spectator);
        });

        for (const bot of bots) {
            const owner = players.find((player) => player.userId === botIdToUserIdMap[bot.id]);
            if (!owner) {
                throw new Error(`Couldn't find owner for bot, ${JSON.stringify(bot)}`);
            }
            bot.host = owner.id;
        }

        return {
            gametype: battle.battleOptions.gameVersion,
            mapname: battle.battleOptions.map,
            ishost: 1,
            myplayername: api.session.currentUser.username,
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
            console.log(scriptJson);
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

    protected generateOnlineScript(battle: TachyonSpadsBattle) {
        return `[game] {
    hostip = ${battle.battleOptions.ip};
    hostport = ${battle.battleOptions.port};
    ishost = 0;
    mypasswd = ${battle.battleOptions.scriptPassword};
    myplayername = ${api.session.currentUser.username};
}`;
    }
}
