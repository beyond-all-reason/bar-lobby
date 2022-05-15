
export type BattlePreviewType = {
    id: number;
    title: string;
    engineVersion: string;
    founderId: number;
    locked: boolean;
    mapName: string;
    maxPlayers: number;
    passworded: boolean;
    startTime: Date | null;
    type: string;
    userIds: number[];
    botNames: string[];
};