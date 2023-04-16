import { Selectable } from "kysely";

export type GameVersionTable = {
    id: string;
    md5: string;
    lastLaunched: Date | null;
    ais: GameAI[];
};

export type GameAI = {
    name: string;
    description: string;
};

export type GameVersion = Selectable<GameVersionTable>;

export type CustomGameVersion = {
    id: string;
    dir: string;
    ais: GameAI[];
};
