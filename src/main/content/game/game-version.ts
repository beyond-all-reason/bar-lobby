import { LuaOptionSection } from "@main/content/game/lua-options";

export type GameVersion = {
    gameVersion: string;
    packageMd5: string;
    luaOptionSections: LuaOptionSection[];
    ais: GameAI[];
};

export interface GameAI {
    name: string;
    description: string;
}
