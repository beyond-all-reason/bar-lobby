import { LuaOptionSection } from "@main/content/game/lua-options";

export type EngineVersion = {
    id: string;
    lastLaunched: Date;
    ais: EngineAI[];
};

export interface EngineAI {
    name: string;
    shortName: string;
    version: string;
    description: string;
    options?: LuaOptionSection[];
}
