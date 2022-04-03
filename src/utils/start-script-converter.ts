import { Battle } from "@/model/battle/battle";
import { Bot } from "@/model/battle/bot";
import { Player } from "@/model/battle/player";
import type { StartScriptTypes } from "@/model/start-script";

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
        const teams: StartScriptTypes.Team[] = [];
        const players: StartScriptTypes.Player[] = [];
        const ais: StartScriptTypes.AI[] = [];

        let teamId = 0;
        let aiIndex = 0;
        let playerIndex = 0;
        const playerNameIdMap: Record<string, number> = {};
        const aiIdOwnerNameMap: Record<number, string> = {};

        const allyTeams = battle.allyTeams.map((allyTeam, i) => {
            const startScriptAllyTeam: StartScriptTypes.AllyTeam = {
                id: i
            };

            if (allyTeam.startBox) {
                startScriptAllyTeam.startrectleft = allyTeam.startBox.xPercent * 200;
                startScriptAllyTeam.startrecttop = allyTeam.startBox.yPercent * 200;
                startScriptAllyTeam.startrectright = (allyTeam.startBox.xPercent * 200) + (allyTeam.startBox.widthPercent * 200);
                startScriptAllyTeam.startrectbottom = (allyTeam.startBox.yPercent * 200) + (allyTeam.startBox.heightPercent * 200);
            }

            allyTeam.battlers.forEach((battler, i) => {
                const startScriptTeam: StartScriptTypes.Team = {
                    id: teamId,
                    allyteam: i,
                    teamleader: 0
                };

                if (battler instanceof Player) {
                    const startScriptPlayer: StartScriptTypes.Player = {
                        id: playerIndex,
                        team: teamId,
                        name: battler.user.username
                    }
                } else if (battler instanceof Bot) {
                    const startScriptBot: StartScriptTypes.AI = {
                        host: battler.owner.
                    }
                }
            });

            return startScriptAllyTeam;
        });

        // battle.getBattlers().forEach((battler, i) => {
        //     const startScriptTeam: StartScriptTypes.Team = {
        //         id: teamId,
        //         allyteam: battler.allyTeamId
        //     }

        //     if (battler instanceof Player) {
        //         playerIndex++;
        //     } else {
        //         aiIndex++;
        //     }
        //     teamId++;
        // });

        battle.allyTeams.forEach((allyTeam, allyTeamIndex) => {
            allyteams.push({
                id: allyTeamIndex,
                // TODO
                // startrecttop: allyTeam.startBox?.top,
                // startrectbottom: allyTeam.startBox?.bottom,
                // startrectleft: allyTeam.startBox?.left,
                // startrectright: allyTeam.startBox?.right,
            });

            allyTeam.players.forEach(team => {
                teams.push({
                    id: teamId,
                    allyteam: allyTeamIndex,
                    teamleader: 0
                });

                team.players.forEach(player => {
                    players.push({
                        id: playerIndex,
                        team: teamId,
                        name: player.name,
                    });
                    playerNameIdMap[player.name] = playerIndex;
                    playerIndex++;
                });

                team.bots.forEach(bot => {
                    ais.push({
                        id: aiIndex,
                        shortname: bot.ai,
                        team: teamId,
                        host: 0,
                        name: bot.name,
                    });
                    aiIdOwnerNameMap[aiIndex] = bot.ownerName;
                    aiIndex++;
                });

                teamId++;
            });
        });

        for (const ai of ais) {
            ai.host = playerNameIdMap[aiIdOwnerNameMap[ai.id]];
        }

        const mapData = window.api.content.maps.getMapByFileName(battle.hostOptions.mapFileName);

        if (!mapData) {
            throw new Error(`Can't generate start script because map is not installed: ${battle.hostOptions.mapFileName}`);
        }

        return {
            gametype: battle.hostOptions.gameVersion,
            mapname: mapData.scriptName,
            ishost: 1,
            myplayername: battle.hostOptions.myPlayerName,
            allyTeams,
            teams,
            players,
            ais
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
        const ais: StartScriptTypes.AI[] = [];

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
            allyTeams: allyteams,
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