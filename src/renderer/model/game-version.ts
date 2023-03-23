import { Selectable } from "kysely";

export type GameVersionTable = {
    id: string;
    md5: string;
};

export type GameVersionData = Selectable<GameVersionTable>;
