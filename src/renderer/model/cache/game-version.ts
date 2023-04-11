import { Selectable } from "kysely";

export type GameVersionTable = {
    id: string;
    md5: string;
    lastLaunched?: Date;
};

export type GameVersion = Selectable<GameVersionTable>;
