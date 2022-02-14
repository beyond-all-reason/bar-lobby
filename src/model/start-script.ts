export namespace StartScriptTypes {
    export interface Game {
        [key: string]: any;

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
        allyteams: AllyTeam[];
        teams: Team[];
        players: Player[];
        ais?: AI[];
    }

    export interface ModOptions {
        [key: string]: any;
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
        [key: string]: any;
    }

    export interface Restriction {
        unitid: string;
        limit: number;
    }

    export interface Mutator {
        [key: string]: any;
    }

    export interface AllyTeam {
        [key: string]: any;
        id: number;
        numallies?: number;
        startrecttop?: number;
        startrectleft?: number;
        startrectbottom?: number;
        startrectright?: number;
    }

    export interface Team {
        [key: string]: any;
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
        [key: string]: any;
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
        [key: string]: any;
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