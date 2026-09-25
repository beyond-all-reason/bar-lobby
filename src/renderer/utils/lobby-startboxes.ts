// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { MapData } from "@main/content/maps/map-data";
import {
    decodeModoptionValue,
    encodeModoptionValue,
    isArrangement,
    isStartboxesSet,
    polyToStartBox,
    resolveArrangement,
    STARTBOX_OVERRIDE_KEY,
    StartboxArrangement,
    STARTBOXES_SET_KEY,
    StartboxesSet,
    startboxesSetByTeamCount,
} from "@shared/startbox-modoptions";
import { LobbyCreateOkResponseData, LobbyCreateRequestData, LobbyUpdateRequestData } from "tachyon-protocol/types";

export interface LobbyStartboxes {
    override?: StartboxArrangement;
    set?: StartboxesSet;
}

type LobbyState = Pick<LobbyCreateOkResponseData, "gameOptions" | "allyTeamConfig" | "areBossesEnabled" | "bosses" | "players" | "spectators">;
type AllyTeam = LobbyCreateRequestData["allyTeamConfig"][number];

const WHOLE_MAP = { top: 0, bottom: 1, left: 0, right: 1 };

export function allyTeamConfigToArray(config: LobbyState["allyTeamConfig"]): AllyTeam[] {
    return Object.keys(config)
        .sort((a, b) => Number(a) - Number(b))
        .map((allyTeam) => {
            const value = config[allyTeam];

            return {
                maxTeams: value.maxTeams,
                startBox: { ...value.startBox },
                teams: Object.keys(value.teams)
                    .sort((a, b) => Number(a) - Number(b))
                    .map((team) => ({ maxPlayers: value.teams[team].maxPlayers })),
            };
        });
}

async function decodeGameOption<T>(gameOptions: LobbyState["gameOptions"], key: string, isValid: (value: unknown) => value is T) {
    const raw = gameOptions[key]?.value;
    if (!raw) return undefined;

    const decoded = await decodeModoptionValue(raw);
    if (isValid(decoded)) return decoded;

    // The game drops it the same way, so falling back here still shows what the game will do.
    console.warn(`Could not read the ${key} game option, ignoring it`);

    return undefined;
}

export async function decodeLobbyStartboxes(gameOptions: LobbyState["gameOptions"]): Promise<LobbyStartboxes> {
    const [override, set] = await Promise.all([decodeGameOption(gameOptions, STARTBOX_OVERRIDE_KEY, isArrangement), decodeGameOption(gameOptions, STARTBOXES_SET_KEY, isStartboxesSet)]);

    return { override, set };
}

// undefined means the game falls back to the allyTeamConfig rects. A larger set arrangement only
// hands out as many boxes as there are teams, while override spares stay: someone placed them.
export function resolveLobbyArrangement(startboxes: LobbyStartboxes | undefined, allyTeamCount: number): StartboxArrangement | undefined {
    const arrangement = resolveArrangement(startboxes?.override, startboxes?.set, allyTeamCount);
    if (!arrangement || arrangement === startboxes?.override) return arrangement;

    return { ...arrangement, startboxes: arrangement.startboxes.slice(0, allyTeamCount) };
}

export async function startboxGameOptions(map: MapData | undefined, override: StartboxArrangement | undefined) {
    const arrangements = map?.startboxesSet ?? [];

    return {
        [STARTBOXES_SET_KEY]: arrangements.length ? { value: await encodeModoptionValue(startboxesSetByTeamCount(arrangements)) } : null,
        [STARTBOX_OVERRIDE_KEY]: override ? { value: await encodeModoptionValue(override) } : null,
    };
}

// SPADS resets both options from the map's battle preset once a map change lands. Tachyon lobbies
// have no host to do that, so exactly one client does, picked the same way by every client.
export function isStartboxWriter(lobby: LobbyState, userId: string) {
    const candidates = lobby.areBossesEnabled ? Object.keys(lobby.bosses) : [...Object.keys(lobby.players), ...Object.keys(lobby.spectators)];

    return candidates.sort()[0] === userId;
}

export async function mapStartboxDefaults(lobby: LobbyState, map: MapData | undefined): Promise<LobbyUpdateRequestData> {
    const update: LobbyUpdateRequestData = { gameOptions: await startboxGameOptions(map, undefined) };

    const allyTeams = allyTeamConfigToArray(lobby.allyTeamConfig);
    const set = map?.startboxesSet?.length ? startboxesSetByTeamCount(map.startboxesSet) : undefined;
    const arrangement = resolveArrangement(undefined, set, allyTeams.length);
    if (arrangement) {
        update.allyTeamConfig = allyTeams.map((allyTeam, index) => {
            const box = arrangement.startboxes[index];

            return { ...allyTeam, startBox: box ? polyToStartBox(box.poly) : { ...WHOLE_MAP } };
        });
    }

    return update;
}
