// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

/* eslint-disable @typescript-eslint/no-explicit-any */
import { spadsPointsToLTRBPercent } from "@main/content/maps/box-utils";
import { BattleWithMetadata, isPlayer, StartPosType } from "@main/game/battle/battle-types";
import { AllyTeam, Bot, Game, Player, Team } from "@main/model/start-script";

/**
 * https://springrts.com/wiki/Script.txt
 * https://github.com/spring/spring/blob/106.0/doc/StartScriptFormat.txt
 *
 * TODO:
 * - parse and convert restrictions
 */
class StartScriptConverter {
    public generateScriptStr(battle: BattleWithMetadata): string {
        let scriptStr = "";
        if (!battle.isOnline) {
            const script = this.offlineBattleToStartScript(battle);
            scriptStr = this.generateScriptString(script);
        } else {
            throw new Error("Online battles are not supported yet");
            //scriptStr = this.generateOnlineScript(battle);
        }
        return scriptStr;
    }

    public parseScript(scriptStr: string): Game {
        let obj = this.scriptToObject(scriptStr).game;
        obj = this.coerceTypes(obj);
        obj = this.parseGroups(obj);

        return obj;
    }

    protected offlineBattleToStartScript(battle: BattleWithMetadata): Game {
        const allyTeams: AllyTeam[] = [];
        const teams: Team[] = [];
        const players: Player[] = [];
        const bots: Bot[] = [];

        Object.entries(battle.teams).forEach((entry) => {
            const teamId = Number(entry[0]);
            const team = entry[1];
            const allyTeam: AllyTeam = {
                id: teamId,
                numallies: 0,
            };
            allyTeams.push(allyTeam);

            if (battle.battleOptions.mapOptions.startPosType === StartPosType.Boxes) {
                const startBoxesIndex = battle.battleOptions.mapOptions.startBoxesIndex;
                const customStartBoxes = battle.battleOptions.mapOptions.customStartBoxes;

                if (typeof startBoxesIndex === "number" && !Number.isNaN(startBoxesIndex) && Number(startBoxesIndex) >= 0) {
                    if (!battle.battleOptions.map) throw new Error("failed to access battle options map");

                    const startBoxes = battle.battleOptions.map.startboxesSet[startBoxesIndex].startboxes;

                    // X and Y are between 0-200
                    const box = startBoxes[allyTeam.id];
                    if (box) {
                        const { left: startrectleft, top: startrecttop, right: startrectright, bottom: startrectbottom } = spadsPointsToLTRBPercent(box.poly);
                        Object.assign(allyTeam, {
                            startrectleft,
                            startrecttop,
                            startrectright,
                            startrectbottom,
                        });
                    } else {
                        console.warn(`Ally team ${allyTeam.id} has no defined start area for this map`);
                    }
                } else if (customStartBoxes) {
                    const box = customStartBoxes[allyTeam.id];

                    if (box) {
                        Object.assign(allyTeam, {
                            startrectleft: box.left,
                            startrecttop: box.top,
                            startrectright: box.right,
                            startrectbottom: box.bottom,
                        });
                    } else {
                        console.warn(`Ally team ${allyTeam.id} has no custom defined start area`);
                    }
                }
            }

            team.participants.forEach((teamMember) => {
                const { id, advantage, handicap, incomeMultiplier, startPos } = teamMember;
                const team: Team = {
                    id,
                    allyteam: teamId,
                    teamleader: teamMember.id,
                    advantage,
                    handicap,
                    incomemultiplier: incomeMultiplier,
                    startposx: startPos?.x,
                    startposz: startPos?.z,
                };
                teams.push(team);

                if (isPlayer(teamMember)) {
                    const player: Player = {
                        id,
                        team: team.id,
                        name: teamMember.user.username,
                        userId: teamMember.user.userId,
                    };
                    players.push(player);
                } else {
                    team.teamleader = teamMember.host;
                    const bot: Bot = {
                        id,
                        team: team.id,
                        shortname: teamMember.aiShortName,
                        name: teamMember.name,
                        host: teamMember.host,
                        options: teamMember.aiOptions,
                    };
                    bots.push(bot);
                }
            });
        });

        battle.spectators.forEach((spectator) => {
            players.push({
                id: spectator.id,
                spectator: 1,
                name: spectator.user.username,
                userId: spectator.user.userId,
            });
        });

        // TODO: Something is not right here
        // for (const bot of bots) {
        //     const owner = players.find((player) => player.userId === bot.host);
        //     if (!owner) {
        //         throw new Error(`Couldn't find owner for bot, ${JSON.stringify(bot)}`);
        //     }
        //     bot.host = owner.id;
        // }

        if (!battle.battleOptions.map) throw new Error("failed to access battle options map");
        if (!battle.me) throw new Error("failed to access current player");

        return {
            gametype: battle.battleOptions.gameVersion,
            mapname: battle.battleOptions.map.springName,
            modoptions: battle.battleOptions.gameMode.options,
            // mapoptions: battle.battleOptions.???,
            ishost: 1,
            myplayername: battle.me.user.username,
            startpostype: battle.battleOptions.mapOptions.startPosType,
            allyTeams,
            teams,
            players,
            ais: bots,
        };
    }

    protected generateScriptString(script: Game): string {
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

    protected parseGroups(obj: Record<string, any>): Game {
        const game = {};
        const allyTeams: AllyTeam[] = [];
        const teams: Team[] = [];
        const players: Player[] = [];
        const ais: Bot[] = [];

        for (const key in obj) {
            const val = obj[key];

            const groups = /(allyteam|team|player|ai)(\d)/i.exec(key);

            if (groups !== null) {
                const groupKey = groups[1];
                const id = groups[2];

                val.id = Number(id);

                if (groupKey === "allyteam") {
                    allyTeams.push(val);
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
            allyTeams,
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
            } else if (val === true) {
                str += `\n${spacer}${key}=1;`;
            } else if (val === false) {
                str += `\n${spacer}${key}=0;`;
            } else {
                str += `\n${spacer}${key}=${val};`;
            }
        }
        return str;
    }

    //TODO implement online script generation
    //     protected generateOnlineScript(battle: SpadsBattle) {
    //         return `[game] {
    //     hostip = ${battle.battleOptions.ip};
    //     hostport = ${battle.battleOptions.port};
    //     ishost = 0;
    //     mypasswd = ${battle.battleOptions.scriptPassword};
    //     myplayername = ${api.session.onlineUser.username};
    // }`;
    //     }
}

export const startScriptConverter = new StartScriptConverter();
