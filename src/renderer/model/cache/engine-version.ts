import { Selectable } from "kysely";

export type EngineVersionTable = {
    id: string;
    lastLaunched?: Date;
};

export type EngineVersion = Selectable<EngineVersionTable>;
