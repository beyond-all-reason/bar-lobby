// model for https://maps-metadata.beyondallreason.dev/latest/lobby_maps.validated.json

export interface MapMetadata {
    author: string;
    certified: boolean;
    description?: string;
    displayName: string;
    filename: string;
    images: {
        preview: string;
    };
    mapHeight: number;
    mapLists: string[];
    mapWidth: number;
    playerCountMax: number;
    playerCountMin: number;
    springName: string;
    startboxesSet: Startbox[];
    startPos?: {
        positions: Record<string, { x: number; y: number }>;
        team?: Team[];
    };
    tags: GameType[];
    terrain: Terrain[];
    tidalStrength?: number;
    windMax: number;
    windMin: number;
}

export interface StartBoxPoly {
    x: number;
    y: number;
}

export interface Startbox {
    maxPlayersPerStartbox: number;
    startboxes: { poly: StartBoxPoly[] }[];
}

export interface Team {
    playersPerTeam: number;
    sides: {
        starts: {
            role?: string;
            spawnPoint: string;
        }[];
    }[];
    teamCount: number;
}

export type Terrain =
    | "acidic"
    | "alien"
    | "ice"
    | "lava"
    | "space"
    | "asteroid"
    | "desert"
    | "forests"
    | "grassy"
    | "industrial"
    | "jungle"
    | "metal"
    | "ruins"
    | "swamp"
    | "tropical"
    | "wasteland"
    | "shallows"
    | "sea"
    | "island"
    | "water"
    | "chokepoints"
    | "asymmetrical"
    | "flat"
    | "hills";

export type GameType =
    | "1v1"
    | "1v1v1"
    | "2v2"
    | "2v2v2"
    | "2v2v2v2"
    | "3v3"
    | "3v3v3v3"
    | "4v4"
    | "4v4v4"
    | "4v4v4v4"
    | "5v5"
    | "6v6"
    | "6v6v6v6"
    | "7v7"
    | "7v7v7v7"
    | "8v8"
    | "8v8v8v8"
    | "ffa"
    | "pve";
