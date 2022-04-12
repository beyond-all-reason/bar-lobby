import { Battle } from "@/model/battle/battle";
import type { StartScriptTypes } from "@/model/start-script";
import { assign } from "@/utils/assign";
import { isBot } from "@/model/battle/bot";

/**
 * https://springrts.com/wiki/Script.txt
 * https://github.com/spring/spring/blob/106.0/doc/StartScriptFormat.txt
 *
 * TODO:
 * - parse and convert restrictions
 */
export class StartScriptConverter {
    public generateScriptStr(battle: Battle): string {
        const script = this.battleToStartScript(battle);
        const scriptStr = this.generateScriptString(script);
        return scriptStr;
    }

    public parseScript(scriptStr: string): StartScriptTypes.Game {
        let obj = this.scriptToObject(scriptStr).game;
        obj = this.coerceTypes(obj);
        obj = this.parseGroups(obj);

        return obj;
    }

    protected battleToStartScript(battle: Battle): StartScriptTypes.Game {
        const allyTeams: StartScriptTypes.AllyTeam[] = [];
        const teams: StartScriptTypes.Team[] = [];
        const players: StartScriptTypes.Player[] = [];
        const bots: StartScriptTypes.Bot[] = [];

        let teamId = 0;
        let botIndex = 0;
        let playerIndex = 0;
        const botIdToOwnerNameMap: Record<number, string> = {};

        battle.allyTeams.forEach((allyTeamConfig, allyTeamIndex) => {
            const allyTeam: StartScriptTypes.AllyTeam = {
                id: allyTeamIndex
            };

            if (allyTeamConfig.startBox) {
                assign(allyTeam, {
                    startrectleft: allyTeamConfig.startBox.xPercent * 200,
                    startrecttop: allyTeamConfig.startBox.yPercent * 200,
                    startrectright: (allyTeamConfig.startBox.xPercent + allyTeamConfig.startBox.widthPercent) * 200,
                    startrectbottom: (allyTeamConfig.startBox.yPercent + allyTeamConfig.startBox.heightPercent) * 200
                });
            }

            allyTeams.push(allyTeam);

            [ ...allyTeamConfig.players, ...allyTeamConfig.bots].forEach(battlerConfig => {
                const team: StartScriptTypes.Team = {
                    id: teamId,
                    allyteam: allyTeamIndex,
                    teamleader: 0
                };

                assign(team, {
                    advantage: battlerConfig.advantage,
                    handicap: battlerConfig.handicap,
                    incomemultiplier: battlerConfig.incomeMultiplier,
                    startposx: battlerConfig.startPos?.x,
                    startposz: battlerConfig.startPos?.z
                });

                teams.push(team);

                teamId++;

                if (!isBot(battlerConfig)) {
                    const player: StartScriptTypes.Player = {
                        id: playerIndex,
                        team: team.id,
                        name: window.api.session.getUserById(battlerConfig.userId)?.username || "Player"
                    };

                    players.push(player);

                    playerIndex++;
                } else {
                    const bot: StartScriptTypes.Bot = {
                        id: botIndex,
                        team: team.id,
                        shortname: battlerConfig.aiShortName,
                        name: battlerConfig.name,
                        host: -1
                    };

                    botIdToOwnerNameMap[bot.id] = battlerConfig.ownerName;

                    bots.push(bot);

                    botIndex++;
                }
            });
        });

        for (const bot of bots) {
            const owner = players.find(player => player.name === botIdToOwnerNameMap[bot.id])!;
            bot.host = owner.id;
        }

        const mapData = window.api.content.maps.getMapByFileName(battle.battleOptions.mapFileName);

        if (!mapData) {
            throw new Error(`Can't generate start script because map is not installed: ${battle.battleOptions.mapFileName}`);
        }

        return {
            gametype: battle.battleOptions.gameVersion,
            mapname: mapData.scriptName,
            ishost: 1,
            myplayername: window.api.session.currentUser.username,
            allyTeams,
            teams,
            players,
            ais: bots
        };
    }

    protected generateScriptString(script: StartScriptTypes.Game): string {
        let scriptObj: Record<string, any> = JSON.parse(JSON.stringify(script));
        scriptObj = this.convertGroups(scriptObj);
        const scriptStr = this.stringifyScriptObj(scriptObj);

        return `[game] {${scriptStr}\n}`;
    }

    protected scriptToObject(scriptStr: string) : Record<string, any> {
        let scriptJson = `{${scriptStr}}`;

        scriptJson = scriptJson
            .replace(/([^=\w\][])(\[(.*?)\])/gm, "$1\"$3\":")
            .replace(/^\s*(\w*)=(.*?);/gm, "\"$1\": \"$2\",")
            .replace(/\r|\n/gm, "")
            .replace(/",\s*}/gm, "\"}")
            .replace(/}"/gm, "},\"");

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
            ...obj
        };
    }

    protected convertGroups(scriptObj: Record<string, any>) : Record<string, any> {
        const groups = ["allyteams", "teams", "players", "ais"];
        for (const key of groups) {
            const group = scriptObj[key];
            const newKey = key.slice(0, key.length - 1);
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
}