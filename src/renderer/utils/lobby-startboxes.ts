// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { MapData } from "@main/content/maps/map-data";
import {
    decodeModoptionValue,
    encodeModoptionValue,
    isArrangement,
    isStartboxesSet,
    resolveArrangement,
    STARTBOX_OVERRIDE_KEY,
    StartboxArrangement,
    STARTBOXES_SET_KEY,
    StartboxesSet,
    startboxesSetByTeamCount,
} from "@shared/startbox-modoptions";
import { LobbyCreateOkResponseData, LobbyCreateRequestData } from "tachyon-protocol/types";

export interface LobbyStartboxes {
    override?: StartboxArrangement;
    set?: StartboxesSet;
}

type LobbyState = Pick<LobbyCreateOkResponseData, "gameOptions" | "allyTeamConfig">;
type AllyTeam = LobbyCreateRequestData["allyTeamConfig"][number];

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

// Spare boxes from a bigger set arrangement go unused in game; override spares stay visible, as in chobby.
export function resolveLobbyArrangement(startboxes: LobbyStartboxes | undefined, allyTeamCount: number): StartboxArrangement | undefined {
    const arrangement = resolveArrangement(startboxes?.override, startboxes?.set, allyTeamCount);
    if (!arrangement || arrangement === startboxes?.override) return arrangement;

    return { ...arrangement, startboxes: arrangement.startboxes.slice(0, allyTeamCount) };
}

// Only one is sent: game builds before Beyond-All-Reason#8786 drop an override whose box count isn't the in-game team count.
export async function startboxGameOptions(map: MapData | undefined, override: StartboxArrangement | undefined) {
    const arrangements = override ? [] : (map?.startboxesSet ?? []);

    return {
        [STARTBOXES_SET_KEY]: arrangements.length ? { value: await encodeModoptionValue(startboxesSetByTeamCount(arrangements)) } : null,
        [STARTBOX_OVERRIDE_KEY]: override ? { value: await encodeModoptionValue(override) } : null,
    };
}
