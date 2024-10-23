// https://github.com/spring/spring/blob/develop/rts/Sim/Units/CommandAI/Command.h
// https://github.com/spring/spring/blob/develop/rts/Sim/Units/CommandAI/CommandAI.cpp
// https://springrts.com/wiki/Lua_CMDs

import { DemoParserConfig } from "./demo-parser";
import { DemoModel } from "./index";

export class CommandParser {
    protected config: DemoParserConfig;

    constructor(config: DemoParserConfig) {
        this.config = config;
    }

    public parseCommand(cmdId: DemoModel.Command.ID, optionBitmask: number, params: number[], unitId?: number) : DemoModel.Command.BaseCommand {
        const cmdType = cmdId < 0 ? DemoModel.Command.ID.BUILD : cmdId;
        const cmdName = DemoModel.Command.ID[cmdType];
        const unitDefId = cmdType === DemoModel.Command.ID.BUILD ? (this.config.unitDefIds![Math.abs(cmdId)] ?? cmdId) : undefined;
        const options = this.parseOptionBitmask(optionBitmask);
        const typeId = DemoModel.Command.Data[cmdType];
        const data = this.parseParams(typeId, params) as DemoModel.Command.Type.Data[typeof typeId];

        if (Array.isArray(data) && this.config.verbose) {
            console.log(`No param handler found for command id: ${cmdId} (${cmdName})`);
        }

        return { cmdName, unitId, unitDefId, options, params, data };
    }

    protected parseOptionBitmask(optionBitmask: number) : DemoModel.Command.Options {
        return {
            META_KEY: (optionBitmask & 4) !== 0,
            INTERNAL_ORDER: (optionBitmask & 8) !== 0,
            RIGHT_MOUSE_KEY: (optionBitmask & 16) !== 0,
            SHIFT_KEY: (optionBitmask & 32) !== 0,
            CONTROL_KEY: (optionBitmask & 64) !== 0,
            ALT_KEY: (optionBitmask & 128) !== 0,
        };
    }

    protected parseParams<ID extends keyof DemoModel.Command.Type.Data>(typeId: ID, params: number[]) {
        switch (typeId) {
        case DemoModel.Command.Type.ID.REMOVE: {
            const queuePos = params[0];
            const command = this.parseCommand(params[1], params[2], params.slice(3));
            return { queuePos, command };
        }
        case DemoModel.Command.Type.ID.INSERT: {
            const queuePos = params[0];
            const command = this.parseCommand(params[1], params[2], params.slice(3));
            return { queuePos, command };
        }
        case DemoModel.Command.Type.ID.BUILD: {
            return { x: params[0], y: params[1], z: params[2], direction: params[3] };
        }
        case DemoModel.Command.Type.ID.ICON_MODE: {
            return { mode: params[0] };
        }
        case DemoModel.Command.Type.ID.ICON_MAP:
        case DemoModel.Command.Type.ID.ICON_BUILDING: {
            return { x: params[0], y: params[1], z: params[2] };
        }
        case DemoModel.Command.Type.ID.ICON_AREA: {
            return { x: params[0], y: params[1], z: params[2], radius: params[3] };
        }
        case DemoModel.Command.Type.ID.ICON_UNIT: {
            return { unitId: params[0] };
        }
        case DemoModel.Command.Type.ID.ICON_UNIT_OR_MAP: {
            if (params.length === 1) {
                return { unitId: params[0] };
            } else {
                return { x: params[0], y: params[1], z: params[2] };
            }
        }
        case DemoModel.Command.Type.ID.ICON_FRONT: {
            if (params.length === 3) {
                return { x: params[0], y: params[1], z: params[2] };
            } else {
                return {
                    camTracePos: { x: params[0], y: params[1], z: params[2] },
                    camTraceDir: { x: params[3], y: params[4], z: params[5] },
                };
            }
        }
        case DemoModel.Command.Type.ID.ICON_UNIT_OR_AREA:
        case DemoModel.Command.Type.ID.ICON_UNIT_FEATURE_OR_AREA: {
            if (params.length === 1) {
                return { unitId: params[0] };
            } else {
                return { x: params[0], y: params[1], z: params[2], radius: params[3] };
            }
        }
        case DemoModel.Command.Type.ID.ICON_UNIT_OR_RECTANGLE: {
            if (params.length === 1) {
                return { unitId: params[0] };
            } else {
                return {
                    start: { x: params[0], y: params[1], z: params[2] },
                    end: { x: params[3], y: params[4], z: params[5] },
                };
            }
        }
        case DemoModel.Command.Type.ID.NUMBER: {
            return { number: params[0] };
        }
        }

        return {};
    }
}