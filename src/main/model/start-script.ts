export interface Game {
    [key: string]: unknown;

    myplayername: string;
    gametype: string;
    mapname: string;
    ishost: number;
    hostip?: string;
    hostport?: number;
    sourceport?: number;
    mypasswd?: string;
    nohelperais?: number;
    gamestartdelay?: number;
    springName?: string;
    startpostype?: number;
    demofile?: string;
    savefile?: string;
    recorddemo?: number;
    autohostip?: string;
    autohostport?: number;
    numplayers?: number;
    numteams?: number;
    numallyteams?: number;
    numrestrictions?: number;

    modoptions?: ModOptions;
    mapoptions?: MapOptions;
    restrict?: Restriction[];
    allyTeams: AllyTeam[];
    teams: Team[];
    players: Player[];
    ais?: Bot[];
}

export interface ModOptions {
    startmetal?: number;
    startenergy?: number;
    maxunits?: number;
    gamemode?: number;
    limitdgun?: number;
    disalemapdamage?: number;
    ghostedbuildings?: number;
    nohelpais?: number;
    luagaia?: number;
    luarules?: number;
    fixedallies?: number;
    maxspeed?: number;
    minspeed?: number;
}

export interface MapOptions {
    [key: string]: unknown;
}

export interface Restriction {
    unitid: string;
    limit: number;
}

export interface AllyTeam {
    id: number;
    numallies?: number;
    startrecttop?: number;
    startrectleft?: number;
    startrectbottom?: number;
    startrectright?: number;
}

export interface Team {
    id: number;
    allyteam: number;
    teamleader: number;
    rgbcolor?: string;
    side?: string;
    handicap?: number;
    advantage?: number;
    incomemultiplier?: number;
    startposx?: number;
    startposz?: number;
    luaai?: string;
}

export interface Player {
    id: number;
    name: string;
    team?: number;
    password?: string;
    spectator?: number;
    isfromdemo?: number;
    countrycode?: string;
    rank?: number;
    userId?: string;
}

export interface Bot {
    id: number;
    team: number;
    shortname: string;
    host: number;
    name?: string;
    version?: string;
    options?: {
        difficultyLevel?: number;
    };
}
