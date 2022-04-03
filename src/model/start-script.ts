export namespace StartScriptTypes {
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
        scriptname?: string;
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
        mutator?: Mutator;
        allyTeams: AllyTeam[];
        teams: Team[];
        players: Player[];
        ais?: AI[];
    }

    export interface ModOptions {
        [key: string]: unknown;
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

    export interface Mutator {
        [key: string]: unknown;
    }

    export interface AllyTeam {
        [key: string]: unknown;
        id: number;
        numallies?: number;
        startrecttop?: number;
        startrectleft?: number;
        startrectbottom?: number;
        startrectright?: number;
    }

    export interface Team {
        [key: string]: unknown;
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
        [key: string]: unknown;
        id: number;
        name: string;
        team: number;
        password?: string;
        spectator?: number;
        isfromdemo?: number;
        countrycode?: string;
        rank?: number;
    }

    export interface AI {
        [key: string]: unknown;
        id: number;
        team: number;
        shortname: string;
        host: number;
        name?: string;
        version?: string;
        options?: {
            [key: string]: any;
            difficultyLevel?: number;
        }
    }
}