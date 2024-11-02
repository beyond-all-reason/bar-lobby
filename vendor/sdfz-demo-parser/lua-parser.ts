import * as zlib from "zlib";

import { BufferStream } from "./buffer-stream";
import { DemoParserConfig } from "./demo-parser";

export interface LuaData {
    name: string;
    data: any;
}

export interface LuaHandler {
    name: string;
    parseStartIndex: number;
    validator: (buffer: Buffer, str: string, config: DemoParserConfig) => boolean;
    parser: (buffer: Buffer, str: string, config: DemoParserConfig) => any;
}

export class LuaParser {
    protected config: DemoParserConfig;
    protected luaHandlers: LuaHandler[] = [];

    constructor(config: DemoParserConfig) {
        this.config = config;

        if (this.config.includeStandardLuaHandlers) {
            this.luaHandlers = standardLuaHandlers.concat(config.customLuaHandlers!);
        } else {
            this.luaHandlers = config.customLuaHandlers!;
        }
    }

    public parseLuaData(buffer: Buffer) : LuaData | string | boolean {
        const str = buffer.toString();

        const handler = this.luaHandlers.find(handler => handler.validator(buffer, str, this.config));

        if (handler === undefined) {
            return str;
        }

        const name = handler.name;

        if (this.config.excludeLuaHandlers?.includes(name)) {
            return "exclude";
        }

        try {
            const data = handler.parser(buffer.slice(handler.parseStartIndex), str.slice(handler.parseStartIndex), this.config);
            return { name, data };
        } catch (err) {
            if (this.config.verbose) {
                console.error(`Failed to parse Lua msg: ${name}`);
                console.error(err);
            }
            return str;
        }
    }
}

export const standardLuaHandlers: LuaHandler[] = [
    {
        // https://github.com/beyond-all-reason/Beyond-All-Reason/blob/master/luarules/gadgets/cmd_mouse_pos_broadcast.lua#L80
        name: "MOUSE_POS_BROADCAST",
        parseStartIndex: 0,
        validator: (buffer, str) => str[0] === "£",
        parser: (buffer, str) => {
            const click = str.substr(3, 1) === "1"; // not seen this be true yet, but store it anyway
            const posBuffer = new BufferStream(buffer.slice(5));
            const numMousePos = posBuffer.readStream.readableLength / 4;
            const positions: Array<{x: number, z: number}> = [];
            for (let i=0; i<numMousePos; i++) {
                const x = posBuffer.readInt(2, true);
                const z = posBuffer.readInt(2, true);
                positions.push({ x, z });
            }
            return { click, positions };
        }
    },
    {
        // https://github.com/beyond-all-reason/Beyond-All-Reason/blob/master/luarules/gadgets/fps_broadcast.lua#L37
        name: "FPS_BROADCAST",
        parseStartIndex: 0,
        validator: (buffer, str) => str[0] === "@",
        parser: (buffer, str) => {
            const fps = Number(str.slice(3));
            return fps;
        }
    },
    {
        // https://github.com/beyond-all-reason/Beyond-All-Reason/blob/master/luarules/gadgets/gui_awards.lua#L581
        name: "AWARDS",
        parseStartIndex: 0,
        validator: (buffer, str) => buffer[0] === 0xa1,
        parser: (buffer, str) => {
            const parts = str.split("�").filter(Boolean).map(pairStr => {
                const [ teamId, value ] = pairStr.split(":").map(str => Number(str));
                return { teamId: teamId - 1, value };
            });

            return {
                econDestroyed: [ parts.shift(), parts.shift(), parts.shift() ],
                fightingUnitsDestroyed: [ parts.shift(), parts.shift(), parts.shift() ],
                resourceEfficiency: [ parts.shift(), parts.shift(), parts.shift() ],
                cow: parts.shift(),
                mostResourcesProduced: parts.shift(),
                mostDamageTaken: parts.shift(),
                sleep: parts.shift()
            };
        }
    },
    {
        // https://github.com/beyond-all-reason/Beyond-All-Reason/blob/master/luaui/Widgets_BAR/gui_factionpicker.lua
        name: "FACTION_PICKER",
        parseStartIndex: "changeStartUnit".length,
        validator: (buffer, str) => str.startsWith("changeStartUnit"),
        parser: (buffer, str, config) => {
            const unitDefIndex = Number(str);
            if (!Number.isNaN(unitDefIndex)) {
                const unitDefId = config.unitDefIds?.[unitDefIndex];
                if (unitDefId === "corcom") {
                    return "Cortex";
                } else if (unitDefId ==="armcom") {
                    return "Armada";
                }
            }

            return "Unknown";
        }
    },
    {
        // https://github.com/beyond-all-reason/Beyond-All-Reason/blob/master/luarules/gadgets/dbg_unitposition_logger.lua#L249
        name: "UNIT_POSITION_LOGGER",
        parseStartIndex: 5,
        validator: (buffer, str) => str.substr(0, 3) === "log",
        parser: (buffer, str) => {
            const headerStrings = str.split(";", 4);
            const frame = parseInt(headerStrings[0]);
            const partId = parseInt(headerStrings[1]);
            const participants = parseInt(headerStrings[2]);
            const attempts = parseInt(headerStrings[3]);

            const splitChar = 0x3b; // semi-colon
            let occurrence = 0;
            let index = 0;
            for (const byte of buffer) {
                index++;
                if (byte === splitChar) {
                    occurrence++;
                }
                if (occurrence === 4) {
                    break;
                }
            }
            const compressedData = buffer.slice(index);
            const uncompressedData = zlib.unzipSync(compressedData);
            const rawData = JSON.parse(uncompressedData.toString()) as { [key: number]: number[][] };

            const positions: Array<{ teamId: number, unitId: number, unitDefId: number, x: number, z: number; }> = [];
            for (const teamId in rawData) {
                const data = rawData[teamId];
                for (const vals of data) {
                    positions.push({
                        teamId: parseInt(teamId),
                        unitId: vals[0],
                        unitDefId: vals[1],
                        x: vals[2],
                        z: vals[3]
                    });
                }
            }

            //return { frame, partId, participants, attempts, positions };
            return rawData;
        }
    },
    {
        // https://github.com/beyond-all-reason/Beyond-All-Reason/blob/master/luarules/gadgets/camera_lockcamera.lua
        name: "CAMERA_LOCKCAMERA",
        parseStartIndex: 3,
        validator: (buffer, str) => str[0] === "=",
        parser: (buffer, str) => {
            // TODO
            const bufferStream = new BufferStream(buffer);
            const cameraId = bufferStream.readInt(1, true);
            const mode = bufferStream.readInt(1, true);
            //console.log(cameraId, mode);
            return str;
        }
    },
    {
        // https://github.com/beyond-all-reason/Beyond-All-Reason/blob/master/luarules/gadgets/activity_broadcast.lua
        name: "ACTIVITY_BROADCAST",
        parseStartIndex: 0,
        validator: (buffer, str) => str[0] === "^",
        parser: (buffer, str) => {
            // TODO
            return str;
        }
    },
    {
        // https://github.com/beyond-all-reason/Beyond-All-Reason/blob/master/luarules/gadgets/system_info.lua
        name: "SYSTEM_INFO",
        parseStartIndex: 5,
        validator: (buffer, str) => str.substr(0, 3) === "$y$",
        parser: (buffer, str) => {
            const captureRegex = new RegExp(""
                + /(?:CPU:\s+(?<cpu>.*?)\s*)?/.source
                + /(?:CPU cores:\s+(?<cpuCores>.*?)]\s+Physical CPU Cores:\s+(?<physicalCpuCOres>.*?)\]\s+Logical CPU Cores:\s+(?<logicalCpuCores>.*?)\s*)?/.source
                + /(?:RAM:\s+(?<memory>.*?)\s*)?/.source
                + /(?:GPU:\s+(?<gpu>.*?)\s*)?/.source
                + /(?:GPU VRAM:\s+(?<gpuMemory>.*?)\s*)?/.source
                + /(?:Display max:\s+(?<maxRes>.*?)\n(?<display>.*?)\s+(?<windowMode>.*?)\s*)?/.source
                + /(?:OS:\s+(?<os>.*?)\s*)?/.source
                + /(?:Engine:\s+(?<wordSize>.*?)\s*)?/.source
                + /(?:Lobby:\s+(?<lobby>.*?)\s*)?/.source
                + /$/.source
            , "gm");

            const groups = captureRegex.exec(str)?.groups;

            return groups;
        }
    },
    {
        // https://github.com/beyond-all-reason/Beyond-All-Reason/blob/master/luarules/gadgets/game_end.lua
        name: "GAME_END",
        parseStartIndex: 0,
        validator: (buffer, str) => str === "pc",
        parser: (buffer, str) => {
            return str;
        }
    },
    {
        // https://github.com/beyond-all-reason/Beyond-All-Reason/blob/master/luarules/gadgets/cmd_idle_players.lua
        name: "IDLE_PLAYERS",
        parseStartIndex: 0,
        validator: (buffer, str) => str.includes("idleplayers"),
        parser: (buffer, str) => {
            const isIdle = str.split(" ")[1] === "1";
            return { isIdle };
        }
    },
    {
        // https://github.com/beyond-all-reason/Beyond-All-Reason/blob/master/luarules/gadgets/cmd_selected_units.lua
        name: "ALLY_SELECTED_UNITS",
        parseStartIndex: 0,
        validator: (buffer, str) => str.includes("cosu"),
        parser: (buffer, str) => {
            // TODO
            return str;
        }
    },
    {
        // https://github.com/beyond-all-reason/Beyond-All-Reason/blob/master/luaui/Widgets_BAR/widget_selector.lua
        name: "XMAS",
        parseStartIndex: 4,
        validator: (buffer, str) => str.substr(0, 4) === "xmas",
        parser: (buffer, str) => {
            const isXmas = str === "1";
            return { isXmas };
        }
    },
    {
        name: "UNITDEFS",
        parseStartIndex: 9,
        validator: (buffer, str) => str.substr(0, 8) === "unitdefs",
        parser: (buffer, str) => {
            const rawData = zlib.unzipSync(buffer);
            const unitDefIdsArray = JSON.parse(rawData.toString()) as string[];
            unitDefIdsArray.unshift("");
            return unitDefIdsArray;
        }
    },
    {
        name: "COLORS",
        validator: (buffer, str) => str.startsWith("AutoColors"),
        parseStartIndex: "AutoColors".length,
        parser: (buffer, str) => {
            const colors: Array<{
                teamID: number;
                r: number;
                g: number;
                b: number;
            }> = JSON.parse(str);
            return colors;
        }
    }
];