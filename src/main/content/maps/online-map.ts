// model for https://maps-metadata.beyondallreason.dev/latest/lobby_maps.validated.json

export interface MapMetadata {
    author: string;
    certified: boolean;
    description: string;
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
        team: Team[];
    };
    tags: string[];
    terrain: string[];
    tidalStrength: number;
    windMax: number;
    windMin: number;
}

export interface Startbox {
    maxPlayersPerStartbox: number;
    startboxes: { poly: { x: number; y: number }[] }[];
}

export interface Team {
    playersPerTeam: number;
    sides: {
        starts: {
            role: string;
            spawnPoint: string;
        }[];
    }[];
    teamCount: number;
}
