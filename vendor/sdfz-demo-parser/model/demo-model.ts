// SPDX-FileCopyrightText: 2024 Jazcash
// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT AND Unlicense
// SPDX-FileAttributionText: Original code from https://github.com/beyond-all-reason/demo-parser

/* eslint-disable @typescript-eslint/no-empty-object-type */
/* eslint-disable @typescript-eslint/no-namespace */
export namespace DemoModel {
    export type Demo = {
        info: Info.Info;
        header: Header;
        script: string;
        statistics?: Statistics.Statistics;
        chatlog?: ChatMessage[];
    };

    export namespace Info {
        export type Info = {
            meta: Meta;
            spadsSettings?: { [key: string]: string }; // TODO: improve typing here
            hostSettings: { [key: string]: string }; // TODO: improve typing here
            gameSettings: { [key: string]: string }; // TODO: improve typing here
            mapSettings: { [key: string]: string }; // TODO: improve typing here
            restrictions: { [key: string]: string }; // TODO: improve typing here
            allyTeams: AllyTeam[];
            players: Player[];
            ais: AI[];
            spectators: Spectator[];
        };

        export type Meta = {
            gameId: string;
            engine: string;
            game: string;
            map: string;
            startTime: Date;
            durationMs: number;
            fullDurationMs: number;
            winningAllyTeamIds: number[];
            startPosType: number;
        };

        export type AllyTeam = {
            allyTeamId: number;
            startBox?: {
                top: number;
                bottom: number;
                left: number;
                right: number;
            };
            playerCount: number;
        };

        export type Team = {
            teamId: number;
            teamLeaderId: number;
            rgbColor: number[];
            allyTeamId: number;
            handicap: number;
            faction: string;
        };

        export type Player = {
            playerId: number;
            teamId: number;
            allyTeamId: number;
            name: string;
            faction: string;
            rank: number | null;
            rgbColor: { r: number; g: number; b: number };
            handicap: number;
            isFromDemo?: boolean;
            countryCode?: string;
            userId?: number;
            skill?: string;
            skillclass?: number;
            skillUncertainty?: number;
            startPos?: Command.Type.MapPos;
            clanId?: string;
        };

        export type Spectator = Omit<Player, "teamId" | "allyTeamId" | "rgbColor" | "handicap" | "faction" | "startPos">;

        export type AI = {
            aiId: number;
            teamId: number;
            allyTeamId: number;
            name: string;
            shortName: string;
            host: boolean;
            faction: string;
            rgbColor: { r: number; g: number; b: number };
            handicap: number;
            isFromDemo?: boolean;
            version?: string;
            startPos?: Command.Type.MapPos;
            options?: { [key: string]: string };
        };

        export type SetupInfo = {
            script: Buffer;
            gameDuration: number;
            winningAllyTeamIds: number[];
            startPositions?: { [teamId: number]: DemoModel.Command.Type.MapPos };
            factions?: { [playerId: number]: string };
            colors?: Array<{ teamID: number; r: number; g: number; b: number }>;
        };
    }

    export type Header = {
        magic: string;
        version: number;
        headerSize: number;
        versionString: string;
        gameId: string;
        startTime: Date;
        scriptSize: number;
        demoStreamSize: number;
        gameTime: number;
        wallclockTime: number;
        numPlayers: number;
        playerStatSize: number;
        playerStatElemSize: number;
        numTeams: number;
        teamStatSize: number;
        teamStatElemSize: number;
        teamStatPeriod: number;
        winningAllyTeamsSize: number;
    };

    export namespace Statistics {
        export type Statistics = {
            winningAllyTeamIds: number[];
            playerStats: Player[];
            teamStats: Record<number, Team[]>;
        };

        export type Player = {
            playerId: number;
            numCommands: number;
            unitCommands: number;
            mousePixels: number;
            mouseClicks: number;
            keyPresses: number;
        };

        export type Team = {
            frame: number;
            metalUsed: number;
            energyUsed: number;
            metalProduced: number;
            energyProduced: number;
            metalExcess: number;
            energyExcess: number;
            metalReceived: number;
            energyReceived: number;
            metalSent: number;
            energySent: number;
            damageDealt: number;
            damageReceived: number;
            unitsProduced: number;
            unitsDied: number;
            unitsReceived: number;
            unitsSent: number;
            unitsCaptured: number;
            unitsOutCaptured: number;
            unitsKilled: number;
        };
    }

    export type ChatMessage = {
        timeMs: number;
        playerId: number;
        name: string;
        type: "ally" | "spec" | "global" | "self";
        message: string;
    };

    // https://github.com/spring/spring/blob/develop/rts/Net/Protocol/NetMessageTypes.h
    export namespace Packet {
        export enum ID {
            KEYFRAME = 1,
            NEWFRAME = 2,
            QUIT = 3,
            STARTPLAYING = 4,
            SETPLAYERNUM = 5,
            PLAYERNAME = 6,
            CHAT = 7,
            RANDSEED = 8,
            GAMEID = 9,
            PATH_CHECKSUM = 10,
            COMMAND = 11,
            SELECT = 12,
            PAUSE = 13,
            AICOMMAND = 14,
            AICOMMANDS = 15,
            AISHARE = 16,
            USER_SPEED = 19,
            INTERNAL_SPEED = 20,
            CPU_USAGE = 21,
            DIRECT_CONTROL = 22,
            DC_UPDATE = 23,
            SHARE = 26,
            SETSHARE = 27,
            PLAYERSTAT = 29,
            GAMEOVER = 30,
            MAPDRAW = 31,
            SYNCRESPONSE = 33,
            SYSTEMMSG = 35,
            STARTPOS = 36,
            PLAYERINFO = 38,
            PLAYERLEFT = 39,
            SD_CHKREQUEST = 41,
            SD_CHKRESPONSE = 42,
            SD_BLKREQUEST = 43,
            SD_BLKRESPONSE = 44,
            SD_RESET = 45,
            LOGMSG = 49,
            LUAMSG = 50,
            TEAM = 51,
            GAMEDATA = 52,
            ALLIANCE = 53,
            CCOMMAND = 54,
            TEAMSTAT = 60,
            CLIENTDATA = 61,
            ATTEMPTCONNECT = 65,
            REJECT_CONNECT = 66,
            AI_CREATED = 70,
            AI_STATE_CHANGED = 71,
            REQUEST_TEAMSTAT = 72,
            CREATE_NEWPLAYER = 75,
            AICOMMAND_TRACKED = 76,
            GAME_FRAME_PROGRESS = 77,
            PING = 78,
        }

        export type Packet<T extends keyof PacketData> = AbstractPacket<T>;
        export type GetPacketData<T extends keyof PacketData> = PacketData[T];

        export type AbstractPacket<T extends keyof PacketData = any> = {
            id: ID;
            name: string;
            fullGameTime: number;
            actualGameTime: number;
            sizeBytes: number;
            data: GetPacketData<T>;
        };

        export type PacketData = {
            [ID.KEYFRAME]: {
                frameNum: number;
            };
            [ID.NEWFRAME]: {};
            [ID.QUIT]: {
                reason: string;
            };
            [ID.STARTPLAYING]: {
                countdown: number;
            };
            [ID.SETPLAYERNUM]: {
                playerNum: number;
            };
            [ID.PLAYERNAME]: {
                playerNum: number;
                playerName: string;
            };
            [ID.CHAT]: {
                fromId: number;
                toId: number;
                message: string;
            };
            [ID.RANDSEED]: {
                randSeed: number;
            };
            [ID.GAMEID]: {
                gameId: string;
            };
            [ID.PATH_CHECKSUM]: {
                playerNum: number;
                checksum: string;
            };
            [ID.COMMAND]: {
                playerNum: number;
                timeout: number;
                command: Command.BaseCommand;
            };
            [ID.SELECT]: {
                playerNum: number;
                selectedUnitIds: number[];
            };
            [ID.PAUSE]: {
                playerNum: number;
                paused: boolean;
            };
            [ID.AICOMMAND]: {
                playerNum: number;
                aiId: number;
                aiTeamId: number;
                timeout: number;
                command: Command.BaseCommand;
            };
            [ID.AICOMMANDS]: {
                playerNum: number;
                aiId: number;
                commands: Array<Command.BaseCommand>;
            };
            [ID.AISHARE]: {
                playerNum: number;
                aiId: number;
                sourceTeam: number;
                destTeam: number;
                metal: number;
                energy: number;
                unitIds: number[];
            };
            [ID.USER_SPEED]: {
                playerNum: number;
                userSpeed: number;
            };
            [ID.INTERNAL_SPEED]: {
                internalSpeed: number;
            };
            [ID.CPU_USAGE]: {
                cpuUsage: number;
            };
            [ID.DIRECT_CONTROL]: {
                playerNum: number;
            };
            [ID.DC_UPDATE]: {
                playerNum: number;
                status: number;
                heading: number;
                pitch: number;
            };
            [ID.SHARE]: {
                playerNum: number;
                shareTeam: number;
                shareUnits: boolean;
                shareMetal: number;
                shareEnergy: number;
            };
            [ID.SETSHARE]: {
                playerNum: number;
                teamId: number;
                metalShareFraction: number;
                energyShareFraction: number;
            };
            [ID.PLAYERSTAT]: {
                playerNum: number;
                numCommands: number;
                unitCommands: number;
                mousePixels: number;
                mouseClicks: number;
                keyPresses: number;
            };
            [ID.GAMEOVER]: {
                playerNum: number;
                winningAllyTeams: number[];
            };
            [ID.MAPDRAW]: {
                playerNum: number;
                mapDrawAction: MapDrawAction;
                x: number;
                z: number;
                x2?: number;
                z2?: number;
                label?: string;
            };
            [ID.SYNCRESPONSE]: {
                playerNum: number;
                frameNum: number;
                checksum: string;
            };
            [ID.SYSTEMMSG]: {
                playerNum: number;
                message: string;
            };
            [ID.STARTPOS]: {
                playerNum: number;
                teamId: number;
                readyState: ReadyState;
                x: number;
                y: number;
                z: number;
            };
            [ID.PLAYERINFO]: {
                playerNum: number;
                cpuUsage: number;
                ping: number;
            };
            [ID.PLAYERLEFT]: {
                playerNum: number;
                reason: LeaveReason;
            };
            [ID.SD_CHKREQUEST]: {};
            [ID.SD_CHKRESPONSE]: {};
            [ID.SD_BLKREQUEST]: {};
            [ID.SD_BLKRESPONSE]: {};
            [ID.SD_RESET]: {};
            [ID.LOGMSG]: {
                playerNum: number;
                logMsgLvl: number;
                data: string;
            };
            [ID.LUAMSG]: {
                playerNum: number;
                script: number;
                mode: number;
                data: any;
            };
            [ID.TEAM]: {
                playerNum: number;
                action: TeamAction;
                param: number;
            };
            [ID.GAMEDATA]: {
                script: string;
                mapChecksum: string;
                modChecksum: string;
                randomSeed: number;
            };
            [ID.ALLIANCE]: {
                playerNum: number;
                otherAllyTeam: number;
                areAllies: boolean;
            };
            [ID.CCOMMAND]: {
                playerNum: number;
                command: string;
                extra: string;
            };
            [ID.TEAMSTAT]: {
                teamNum: number;
                statistics: any;
            };
            [ID.CLIENTDATA]: {
                setupText: string;
            };
            [ID.ATTEMPTCONNECT]: {
                netVersion: number;
                playerName: string;
                password: string;
                versionStringDetailed: string;
            };
            [ID.REJECT_CONNECT]: {
                reason: string;
            };
            [ID.AI_CREATED]: {
                playerNum: number;
                whichSkirmishAi: number;
                team: number;
                name: string;
            };
            [ID.AI_STATE_CHANGED]: {
                playerNum: number;
                whichSkirmishAi: number;
                newState: number;
            };
            [ID.REQUEST_TEAMSTAT]: {
                teamNum: number;
                startFrameNum: number;
            };
            [ID.CREATE_NEWPLAYER]: {
                playerNum: number;
                spectator: boolean;
                teamNum: number;
                playerName: string;
            };
            [ID.AICOMMAND_TRACKED]: {
                playerNum: number;
                aiId: number;
                unitId: number;
                id: number;
                options: number;
                aiCommandId: number;
                params: number[];
            };
            [ID.GAME_FRAME_PROGRESS]: {
                frameNum: number;
            };
            [ID.PING]: {
                playerNum: number;
                pingTag: number;
                localTime: number;
            };
        };
    }

    export namespace Command {
        export namespace Type {
            export enum ID {
                ICON = 0,
                ICON_MODE = 5,
                ICON_MAP = 10,
                ICON_AREA = 11,
                ICON_UNIT = 12,
                ICON_UNIT_OR_MAP = 13,
                ICON_FRONT = 14,
                ICON_UNIT_OR_AREA = 16,
                NEXT = 17,
                PREV = 18,
                ICON_UNIT_FEATURE_OR_AREA = 19,
                ICON_BUILDING = 20,
                CUSTOM = 21,
                ICON_UNIT_OR_RECTANGLE = 22,
                NUMBER = 23,
                BUILD = 101,
                REMOVE = 102,
                INSERT = 103,
            }

            //export type Any = Partial<Empty & Mode & MapPos & Radius & UnitID & Front & UnitFeatureOrArea & UnitOrRectangle & Number>;

            export type Empty = {};

            export type Values = {
                rawValues: number[];
            };
            export type Mode = {
                mode: number;
            };

            export type MapPos = {
                x: number;
                y: number;
                z: number;
            };

            export type Radius = {
                radius: number;
            };

            export type UnitID = {
                unitId: number;
            };

            export type Front = {
                camTracePos: MapPos;
                camTraceDir?: MapPos;
            };
            export type UnitFeatureOrArea = {
                unitId?: number;
                maxUnits?: number;
                area: MapPos & Radius;
            };
            export type UnitOrRectangle = {
                unitId?: number;
                mapPos?: MapPos;
                startPos?: MapPos;
                endPos?: MapPos;
            };

            export type Number = {
                number: number;
            };

            export type Direction = {
                direction: Facing;
            };

            export type Insert = {
                queuePos: number;
                command: Command.BaseCommand;
            };

            export type Data = {
                [DemoModel.Command.Type.ID.BUILD]: MapPos & Direction;
                [DemoModel.Command.Type.ID.ICON]: Empty;
                [DemoModel.Command.Type.ID.ICON_MODE]: Mode;
                [DemoModel.Command.Type.ID.ICON_MAP]: MapPos;
                [DemoModel.Command.Type.ID.ICON_AREA]: MapPos & Radius;
                [DemoModel.Command.Type.ID.ICON_UNIT]: UnitID;
                [DemoModel.Command.Type.ID.ICON_UNIT_OR_MAP]: UnitID | MapPos;
                [DemoModel.Command.Type.ID.ICON_FRONT]: MapPos | { camTracePos: MapPos; camTraceDir: MapPos };
                [DemoModel.Command.Type.ID.ICON_UNIT_OR_AREA]: UnitID | (MapPos & Radius);
                [DemoModel.Command.Type.ID.NEXT]: Empty;
                [DemoModel.Command.Type.ID.PREV]: Empty;
                [DemoModel.Command.Type.ID.ICON_UNIT_FEATURE_OR_AREA]: UnitID | (MapPos & Radius);
                [DemoModel.Command.Type.ID.ICON_BUILDING]: MapPos;
                [DemoModel.Command.Type.ID.CUSTOM]: Empty;
                [DemoModel.Command.Type.ID.ICON_UNIT_OR_RECTANGLE]: UnitID | MapPos | { start: MapPos; end: MapPos };
                [DemoModel.Command.Type.ID.NUMBER]: Number;
                [DemoModel.Command.Type.ID.REMOVE]: Insert;
                [DemoModel.Command.Type.ID.INSERT]: Insert;
            };
        }

        // https://github.com/spring/spring/blob/develop/rts/Sim/Units/CommandAI/Command.h
        export enum ID {
            BUILD = -1,
            STOP = 0,
            INSERT = 1,
            REMOVE = 2,
            WAIT = 5,
            TIMEWAIT = 6,
            DEATHWAIT = 7,
            SQUADWAIT = 8,
            GATHERWAIT = 9,
            MOVE = 10,
            PATROL = 15,
            FIGHT = 16,
            ATTACK = 20,
            AREA_ATTACK = 21,
            GUARD = 25,
            AISELECT = 30,
            GROUPSELECT = 35,
            GROUPADD = 36,
            GROUPCLEAR = 37,
            REPAIR = 40,
            FIRE_STATE = 45,
            MOVE_STATE = 50,
            SETBASE = 55,
            INTERNAL = 60,
            SELFD = 65,
            LOAD_UNITS = 75,
            LOAD_ONTO = 76,
            UNLOAD_UNITS = 80,
            UNLOAD_UNIT = 81,
            ONOFF = 85,
            RECLAIM = 90,
            CLOAK = 95,
            STOCKPILE = 100,
            MANUALFIRE = 105,
            RESTORE = 110,
            REPEAT = 115,
            TRAJECTORY = 120,
            RESURRECT = 125,
            CAPTURE = 130,
            AUTOREPAIRLEVEL = 135,
            IDLEMODE = 145,
            FAILED = 150,
        }
        export type Options = {
            META_KEY: boolean;
            INTERNAL_ORDER: boolean;
            RIGHT_MOUSE_KEY: boolean;
            SHIFT_KEY: boolean;
            CONTROL_KEY: boolean;
            ALT_KEY: boolean;
        };

        export type BaseCommand = {
            cmdName: string;
            unitId?: number;
            unitDefId?: string | number;
            options: Options;
            params: number[];
            data: Type.Data[keyof Type.Data];
        };

        export const Data: { [key in ID]: Type.ID } = {
            [ID.BUILD]: Type.ID.BUILD,
            [ID.STOP]: Type.ID.ICON,
            [ID.INSERT]: Type.ID.INSERT,
            [ID.REMOVE]: Type.ID.INSERT,
            [ID.WAIT]: Type.ID.ICON,
            [ID.TIMEWAIT]: Type.ID.NUMBER,
            [ID.DEATHWAIT]: Type.ID.ICON_UNIT_OR_RECTANGLE,
            [ID.SQUADWAIT]: Type.ID.NUMBER,
            [ID.GATHERWAIT]: Type.ID.ICON,
            [ID.MOVE]: Type.ID.ICON_MAP,
            [ID.PATROL]: Type.ID.ICON_MAP,
            [ID.FIGHT]: Type.ID.ICON_MAP,
            [ID.ATTACK]: Type.ID.ICON_UNIT_OR_MAP,
            [ID.AREA_ATTACK]: Type.ID.ICON_AREA,
            [ID.GUARD]: Type.ID.ICON_UNIT,
            [ID.AISELECT]: Type.ID.NUMBER,
            [ID.GROUPSELECT]: Type.ID.ICON,
            [ID.GROUPADD]: Type.ID.ICON,
            [ID.GROUPCLEAR]: Type.ID.ICON,
            [ID.REPAIR]: Type.ID.ICON_UNIT_OR_AREA,
            [ID.FIRE_STATE]: Type.ID.ICON_MODE,
            [ID.MOVE_STATE]: Type.ID.ICON_MODE,
            [ID.SETBASE]: Type.ID.ICON,
            [ID.INTERNAL]: Type.ID.ICON,
            [ID.SELFD]: Type.ID.ICON,
            [ID.LOAD_UNITS]: Type.ID.ICON_UNIT_OR_AREA,
            [ID.LOAD_ONTO]: Type.ID.ICON_UNIT,
            [ID.UNLOAD_UNITS]: Type.ID.ICON_UNIT_OR_AREA,
            [ID.UNLOAD_UNIT]: Type.ID.ICON_MAP,
            [ID.ONOFF]: Type.ID.ICON_MODE,
            [ID.RECLAIM]: Type.ID.ICON_UNIT_FEATURE_OR_AREA,
            [ID.CLOAK]: Type.ID.ICON_MODE,
            [ID.STOCKPILE]: Type.ID.ICON,
            [ID.MANUALFIRE]: Type.ID.ICON_MAP,
            [ID.RESTORE]: Type.ID.ICON_AREA,
            [ID.REPEAT]: Type.ID.ICON_MODE,
            [ID.TRAJECTORY]: Type.ID.ICON_MODE,
            [ID.RESURRECT]: Type.ID.ICON_UNIT_FEATURE_OR_AREA,
            [ID.CAPTURE]: Type.ID.ICON_UNIT_OR_AREA,
            [ID.AUTOREPAIRLEVEL]: Type.ID.ICON_MODE,
            [ID.IDLEMODE]: Type.ID.ICON_MODE,
            [ID.FAILED]: Type.ID.ICON,
        };
    }

    export enum LeaveReason {
        LOST_CONNECTION = 0,
        INTENTIONAL = 1,
        KICKED = 2,
    }

    export enum ReadyState {
        NOT_READY = 0,
        READY = 1,
        NO_UPDATE = 2,
    }

    export enum TeamAction {
        GIVEAWAY = 1,
        RESIGN = 2,
        JOIN_TEAM = 3,
        TEAM_DIED = 4,
        AI_CREATED = 5,
        AI_DESTROYED = 6,
    }

    export enum MapDrawAction {
        POINT,
        ERASE,
        LINE,
    }

    export enum Facing {
        SOUTH = 0,
        EAST = 1,
        NORTH = 2,
        WEST = 3,
    }

    export enum MoveState {
        NONE = -1,
        HOLDPOS = 0,
        MANEUVER = 1,
        ROAM = 2,
    }

    export enum FireState {
        NONE = -1,
        HOLD_FIRE = 0,
        RETURN_FIRE = 1,
        FIRE_AT_WILL = 2,
        FIRE_AT_NEUTRAL = 3,
    }

    export enum StartPosType {
        FIXED = 0,
        RANDOM = 1,
        CHOOSE_IN_GAME = 2,
        CHOOSE_BEFORE_GAME = 3,
    }
}
