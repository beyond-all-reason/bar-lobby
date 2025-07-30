// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { DemoModel } from "$/sdfz-demo-parser";

export type Replay = {
    gameId: string;
    fileName: string;
    filePath: string;
    engineVersion: string;
    gameVersion: string;
    mapSpringName: string;
    startTime: Date;
    gameDurationMs: number;
    gameEndedNormally: 0 | 1;
    chatlog: DemoModel.ChatMessage[] | null;
    hasBots: 0 | 1;
    preset: "duel" | "team" | "ffa" | "teamffa";
    winningTeamId: number;
    teams: DemoModel.Info.AllyTeam[];
    contenders: (DemoModel.Info.Player | DemoModel.Info.AI)[];
    spectators: DemoModel.Info.Spectator[];
    script: string;
    battleSettings: Record<string, string>;
    hostSettings: Record<string, string>;
    gameSettings: Record<string, string>;
    mapSettings: Record<string, string>;
};

export interface DemofileHeader {
    magic: string;
    header_version: number;
    header_size: number;
    game_version: string;
    game_id: string;
    start_time: number;
    script_size: number;
    demo_stream_size: number;
    game_time: number;
    wall_clock_time: number;
    player_count: number;
    player_stat_size: number;
    player_stat_elem_size: number;
    team_count: number;
    team_stat_size: number;
    team_stat_elem_size: number;
    team_stat_period: number;
    winning_ally_teams_size: number;
}

export interface ChatMessage {
    size: number;
    from_id: number;
    to_id: number;
    message: string;
    game_id: string;
    game_timestamp: number;
}

export interface TeamDeath {
    game_id: string;
    team_id: number;
    reason: number;
    game_time: number;
}

export interface Player {
    id: number;
    team: number | null;
    countrycode: string;
    accountid: number;
    name: string;
    rank: number;
    skill: number[];
    spectator: 0 | 1;
    skilluncertainty: number;
    startPos: [number, number, number] | null;
}

export interface Team {
    id: number;
    allyteam: number;
    teamleader: number;
    rgbcolor: number[];
    side: string;
    handicap: number;
}

export interface AllyTeam {
    id: number;
    startrectleft: number | null;
    startrectright: number | null;
    startrectbottom: number | null;
    startrecttop: number | null;
    numallies: number | null;
}

export interface GameConfig {
    players: Player[];
    teams: Team[];
    allyteams: AllyTeam[];
    modoptions: Record<string, string>;
    mapoptions: Record<string, string>;
    hostoptions: Record<string, string>;
    restrict: Record<string, string>;
    // Global properties
    ishost: number | null;
    hostip: string | null;
    numallyteams: number | null;
    server_match_id: number | null;
    numteams: number | null;
    startpostype: number | null;
    gametype: string | null;
    hosttype: string | null;
    mapname: string | null;
    autohostport: number | null;
    numrestrictions: number | null;
    autohostname: string | null;
    autohostrank: number | null;
    autohostaccountid: number | null;
    numplayers: number | null;
    autohostcountrycode: string | null;
    hostport: number | null;
}

export type Gamemode = "DUEL" | "SMALL_TEAM" | "LARGE_TEAM" | "FFA" | "TEAM_FFA" | "UNKNOWN";

export interface Statistics {
    winning_ally_team_ids: number[];
    player_stats: [];
    team_stats: [];
}

export interface BarMatch {
    header: DemofileHeader;
    file_name: string;
    duration_frame_count: number;
    packet_offset: number;
    stat_offset: number;
    gamemode: Gamemode;
    chat_messages: ChatMessage[];
    team_deaths: TeamDeath[];
    game_config: GameConfig;
    statistics: Statistics;
}
