// https://github.com/spring/spring/blob/develop/rts/Net/Protocol/NetMessageTypes.h
// https://github.com/spring/spring/blob/develop/rts/Net/Protocol/BaseNetProtocol.cpp
// https://github.com/spring/spring/blob/develop/rts/Sim/Units/CommandAI/Command.h
// https://github.com/dansan/spring-replay-site/blob/master/srs/demoparser.py

import * as zlib from "zlib";

import { BufferStream } from "./buffer-stream";
import { CommandParser } from "./command-parser";
import { DemoParserConfig } from "./demo-parser";
import { LuaParser } from "./lua-parser";
import { DemoModel } from "./model/demo-model";
import { isPacket } from "./utils";

type PacketHandler<key extends DemoModel.Packet.ID> = (bufferStream: BufferStream) => DemoModel.Packet.GetPacketData<key> | void;

export class PacketParser {
    protected config: DemoParserConfig;
    protected commandParser: CommandParser;
    protected luaParser: LuaParser;
    protected packetHandlers: { [key in DemoModel.Packet.ID]: PacketHandler<key> };
    protected gameStartTime: number;

    constructor(config: DemoParserConfig) {
        this.config = config;
        this.commandParser = new CommandParser(this.config);
        this.luaParser = new LuaParser(this.config);
        this.packetHandlers = this.setupStandardPacketHandlers();
        this.gameStartTime = 0;
    }

    public parsePacket(buffer: Buffer, modGameTime: number, gameTimeOffset: number) : DemoModel.Packet.AbstractPacket | undefined {
        const bufferStream = new BufferStream(buffer);

        const packetId = bufferStream.readInt(1) as DemoModel.Packet.ID;

        if ((this.config.includePackets!.length > 0 && !this.config.includePackets!.includes(packetId)) || this.config.excludePackets!.includes(packetId)) {
            return;
        }

        const packetName = DemoModel.Packet.ID[packetId];
        const packetHandler = this.packetHandlers[packetId];
        if (!packetHandler) {
            if (this.config.verbose) {
                console.warn(`No packet handler defined for packet of type ${packetId}`);
            }
            return;
        }
        const packetData = packetHandler(bufferStream);

        if (packetData === undefined && this.config.verbose && packetId !== DemoModel.Packet.ID.NEWFRAME && packetId !== DemoModel.Packet.ID.LUAMSG ) {
            console.log(`Packet handler not implemented for packet id: ${packetId} (${packetName})`);;
        }

        const packet: DemoModel.Packet.AbstractPacket = {
            id: packetId,
            name: packetName,
            fullGameTime: modGameTime,
            actualGameTime: 0,
            sizeBytes: buffer.byteLength,
            data: packetData
        };

        if (isPacket(packet, DemoModel.Packet.ID.STARTPLAYING) && packet.data!.countdown === 0) {
            this.gameStartTime = packet.fullGameTime;
        } else if (this.gameStartTime > 0) {
            packet.actualGameTime = packet.fullGameTime - this.gameStartTime;
        }

        return packet;
    }

    protected setupStandardPacketHandlers() : { [key in DemoModel.Packet.ID]: (bufferStream: BufferStream) => DemoModel.Packet.GetPacketData<key> | void } {
        return {
            [DemoModel.Packet.ID.KEYFRAME]: (bufferStream) => {
                const frameNum = bufferStream.readInt();
                return { frameNum };
            },
            [DemoModel.Packet.ID.NEWFRAME]: (bufferStream) => {
            },
            [DemoModel.Packet.ID.QUIT]: (bufferStream) => {
                const size = bufferStream.readInt(2);
                const reason = bufferStream.readString(size);
                return { reason };
            },
            [DemoModel.Packet.ID.STARTPLAYING]: (bufferStream) => {
                const countdown = bufferStream.readInt();
                return { countdown };
            },
            [DemoModel.Packet.ID.SETPLAYERNUM]: (bufferStream) => {
                const playerNum = bufferStream.readInt(1, true);
                return { playerNum };
            },
            [DemoModel.Packet.ID.PLAYERNAME]: (bufferStream) => {
                const size = bufferStream.readInt(1);
                const playerNum = bufferStream.readInt(1);
                const playerName = bufferStream.readString(size);
                return { playerNum, playerName };
            },
            [DemoModel.Packet.ID.CHAT]: (bufferStream) => {
                const size = bufferStream.readInt(1, true);
                const fromId = bufferStream.readInt(1, true);
                const toId = bufferStream.readInt(1, true); // 127 = allies, 126 = specs, 125 = global
                const message = bufferStream.readUntilNull().toString();
                return { fromId, toId, message };
            },
            [DemoModel.Packet.ID.RANDSEED]: (bufferStream) => {
                const randSeed = bufferStream.readInt(4, true);
                return { randSeed };
            },
            [DemoModel.Packet.ID.GAMEID]: (bufferStream) => {
                const gameId = bufferStream.read(16).toString("hex");
                return { gameId };
            },
            [DemoModel.Packet.ID.PATH_CHECKSUM]: (bufferStream) => {
                const playerNum = bufferStream.readInt(1);
                const checksum = bufferStream.read(4).toString("hex");
                return { playerNum, checksum };
            },
            [DemoModel.Packet.ID.COMMAND]: (bufferStream) => {
                const size = bufferStream.readInt(2);
                const playerNum = bufferStream.readInt(1, true);
                const commandId = bufferStream.readInt(4);
                const timeout = bufferStream.readInt(4);
                const options = bufferStream.readInt(1, true);
                const numParams = bufferStream.readInt(4, true);
                const params = bufferStream.readFloats(numParams);
                const command = this.commandParser.parseCommand(commandId, options, params);
                return { playerNum, timeout, command };
            },
            [DemoModel.Packet.ID.SELECT]: (bufferStream) => {
                const size = bufferStream.readInt(2);
                const playerNum = bufferStream.readInt(1, true);
                const selectedUnitIds = bufferStream.readInts(bufferStream.readStream.readableLength / 2, 2, true);
                return { playerNum, selectedUnitIds };
            },
            [DemoModel.Packet.ID.PAUSE]: (bufferStream) => {
                const playerNum = bufferStream.readInt(1, true);
                const paused = bufferStream.readBool();
                return { playerNum, paused };
            },
            [DemoModel.Packet.ID.AICOMMAND]: (bufferStream) => {
                const size = bufferStream.readInt(2);
                const playerNum = bufferStream.readInt(1, true);
                const aiId = bufferStream.readInt(1, true);
                const aiTeamId = bufferStream.readInt(1, true);
                const unitId = bufferStream.readInt(2);
                const commandId = bufferStream.readInt();
                const timeout = bufferStream.readInt();
                const options = bufferStream.readInt(1, true);
                const numParams = bufferStream.readInt(4, true);
                const params = bufferStream.readFloats(numParams);
                const command = this.commandParser.parseCommand(commandId, options, params, unitId);
                return { playerNum, aiId, aiTeamId, timeout, command };
            },
            [DemoModel.Packet.ID.AICOMMANDS]: (bufferStream) => {
                const size = bufferStream.readInt(2);
                const playerNum = bufferStream.readInt(1, true);
                const aiId = bufferStream.readInt(1, true);
                const pairwise = bufferStream.readInt(1, true);
                const refCmdId = bufferStream.readInt(4, true);
                const refCmdOpts = bufferStream.readInt(1, true);
                const refCmdSize = bufferStream.readInt(2, true);
                const unitCount = bufferStream.readInt(2);
                const unitIds = bufferStream.readInts(unitCount, 2);
                const commandCount = bufferStream.readInt(2, true);
                const commands: Array<DemoModel.Command.BaseCommand> = [];
                for (let i=0; i<commandCount; i++) {
                    const id = refCmdId === 0 ? bufferStream.readInt(4, true) : refCmdId;
                    const optionBitmask = refCmdOpts === 0xFF ? bufferStream.readInt(1, true) : refCmdOpts;
                    const size = refCmdSize === 0xFFFF ? bufferStream.readInt(2, true) : refCmdSize;
                    const params: number[] = [];
                    for (let i=0; i<size; i++) {
                        params.push(bufferStream.readFloat());
                    }
                    const command = this.commandParser.parseCommand(id, optionBitmask, params, unitIds[i]);
                    commands.push(command);
                }
                return { playerNum, aiId, pairwise, refCmdId, refCmdOpts, refCmdSize, unitIds, commands };
            },
            [DemoModel.Packet.ID.AISHARE]: (bufferStream) => {
                const size = bufferStream.readInt(2);
                const playerNum = bufferStream.readInt(1, true);
                const aiId = bufferStream.readInt(1, true);
                const sourceTeam = bufferStream.readInt(1, true);
                const destTeam = bufferStream.readInt(1, true);
                const metal = bufferStream.readFloat();
                const energy = bufferStream.readFloat();
                const unitIds = bufferStream.readInts(bufferStream.readStream.readableLength / 2, 2);
                return { playerNum, aiId, sourceTeam, destTeam, metal, energy, unitIds };
            },
            [DemoModel.Packet.ID.USER_SPEED]: (bufferStream) => {
            },
            [DemoModel.Packet.ID.INTERNAL_SPEED]: (bufferStream) => {
                const internalSpeed = bufferStream.readFloat();
                return { internalSpeed };
            },
            [DemoModel.Packet.ID.CPU_USAGE]: (bufferStream) => {
            },
            [DemoModel.Packet.ID.DIRECT_CONTROL]: (bufferStream) => {
            },
            [DemoModel.Packet.ID.DC_UPDATE]: (bufferStream) => {
            },
            [DemoModel.Packet.ID.SHARE]: (bufferStream) => {
                const playerNum = bufferStream.readInt(1);
                const shareTeam = bufferStream.readInt(1);
                const shareUnits = bufferStream.readBool();
                const shareMetal = bufferStream.readFloat();
                const shareEnergy = bufferStream.readFloat();
                return { playerNum, shareTeam, shareUnits, shareMetal, shareEnergy };
            },
            [DemoModel.Packet.ID.SETSHARE]: (bufferStream) => {
                const playerNum = bufferStream.readInt(1);
                const myTeam = bufferStream.readInt(1);
                const metalShareFraction = bufferStream.readFloat();
                const energyShareFraction = bufferStream.readFloat();
                return { playerNum, teamId: myTeam, metalShareFraction, energyShareFraction };
            },
            [DemoModel.Packet.ID.PLAYERSTAT]: (bufferStream) => {
                const playerNum = bufferStream.readInt(1);
                const numCommands = bufferStream.readInt();
                const unitCommands = bufferStream.readInt();
                const mousePixels = bufferStream.readInt();
                const mouseClicks = bufferStream.readInt();
                const keyPresses = bufferStream.readInt();
                return { playerNum, numCommands, unitCommands, mousePixels, mouseClicks, keyPresses };
            },
            [DemoModel.Packet.ID.GAMEOVER]: (bufferStream) => {
                const size = bufferStream.readInt(1);
                const playerNum = bufferStream.readInt(1);
                const winningAllyTeams = bufferStream.readInts(bufferStream.readStream.readableLength, 1, true);
                return { playerNum, winningAllyTeams };
            },
            [DemoModel.Packet.ID.MAPDRAW]: (bufferStream) => {
                const size = bufferStream.readInt(1);
                const playerNum = bufferStream.readInt(1);
                const mapDrawAction = bufferStream.readInt(1) as DemoModel.MapDrawAction;
                const x = bufferStream.readInt(2);
                const z = bufferStream.readInt(2);
                let x2: number | undefined;
                let z2: number | undefined;
                let label: string | undefined;
                if (mapDrawAction === DemoModel.MapDrawAction.LINE) {
                    x2 = bufferStream.readInt(2);
                    z2 = bufferStream.readInt(2);
                } else if (mapDrawAction === DemoModel.MapDrawAction.POINT) {
                    label = bufferStream.readString();
                }
                return { playerNum, mapDrawAction, x, z, x2, z2, label };
            },
            [DemoModel.Packet.ID.SYNCRESPONSE]: (bufferStream) => {
                const playerNum = bufferStream.readInt(1, true);
                const frameNum = bufferStream.readInt();
                const checksum = bufferStream.read(4).toString("hex");
                return { playerNum, frameNum, checksum };
            },
            [DemoModel.Packet.ID.SYSTEMMSG]: (bufferStream) => {
                const messageSize = bufferStream.readInt(2, true);
                const playerNum = bufferStream.readInt(1, true);
                const message = bufferStream.readString(messageSize - 1);
                return { playerNum, message };
            },
            [DemoModel.Packet.ID.STARTPOS]: (bufferStream) => {
                const playerNum = bufferStream.readInt(1);
                const teamId = bufferStream.readInt(1);
                const readyState = bufferStream.readInt(1) as DemoModel.ReadyState;
                const x = bufferStream.readFloat();
                const y = bufferStream.readFloat();
                const z = bufferStream.readFloat();
                return { playerNum, teamId, readyState, x, y, z };
            },
            [DemoModel.Packet.ID.PLAYERINFO]: (bufferStream) => {
                const playerNum = bufferStream.readInt(1, true);
                const cpuUsage = bufferStream.readFloat();
                const ping = bufferStream.readInt();
                return { playerNum, cpuUsage, ping };
            },
            [DemoModel.Packet.ID.PLAYERLEFT]: (bufferStream) => {
                const playerNum = bufferStream.readInt(1, true);
                const reason = bufferStream.readInt(1, true) as DemoModel.LeaveReason;
                return { playerNum, reason };
            },
            [DemoModel.Packet.ID.SD_CHKREQUEST]: (bufferStream) => {
            },
            [DemoModel.Packet.ID.SD_CHKRESPONSE]: (bufferStream) => {
            },
            [DemoModel.Packet.ID.SD_BLKREQUEST]: (bufferStream) => {
            },
            [DemoModel.Packet.ID.SD_BLKRESPONSE]: (bufferStream) => {
            },
            [DemoModel.Packet.ID.SD_RESET]: (bufferStream) => {
            },
            [DemoModel.Packet.ID.LOGMSG]: (bufferStream) => {
                const size = bufferStream.readInt(2, true);
                const playerNum = bufferStream.readInt(1);
                const logMsgLvl = bufferStream.readInt(1);
                const data = bufferStream.readString();
                return { playerNum, logMsgLvl, data };
            },
            [DemoModel.Packet.ID.LUAMSG]: (bufferStream) => {
                const size = bufferStream.readInt(2, true);
                const playerNum = bufferStream.readInt(1, true);
                const script = bufferStream.readInt(2, true);
                const mode = bufferStream.readInt(1, true);
                const msg = bufferStream.read();
                const data = this.luaParser.parseLuaData(msg);
                if (typeof data === "string" && (data === "exclude")) {
                    return;
                }
                return { playerNum, script, mode, data };
            },
            [DemoModel.Packet.ID.TEAM]: (bufferStream) => {
                const playerNum = bufferStream.readInt(1, true);
                const action = bufferStream.readInt(1, true) as DemoModel.TeamAction;
                const param = bufferStream.readInt(1, true);
                return { playerNum, action, param };
            },
            [DemoModel.Packet.ID.GAMEDATA]: (bufferStream) => {
                const size = bufferStream.readInt(2);
                const compressedSize = bufferStream.readInt(2);
                const setupText = zlib.unzipSync(bufferStream.read(compressedSize));
                const script = setupText.toString().replace(/\\n/g, "\n");
                const mapChecksum = bufferStream.read(64).toString("hex");
                const modChecksum = bufferStream.read(64).toString("hex");
                const randomSeed = bufferStream.readInt(4, true);
                return { script, mapChecksum, modChecksum, randomSeed };
            },
            [DemoModel.Packet.ID.ALLIANCE]: (bufferStream) => {
            },
            [DemoModel.Packet.ID.CCOMMAND]: (bufferStream) => {
                const size = bufferStream.readInt(2, true);
                const playerNum = bufferStream.readInt(4, true);
                const command = bufferStream.readUntilNull().toString();
                const extra = bufferStream.readUntilNull().toString();
                return { playerNum, command, extra };
            },
            [DemoModel.Packet.ID.TEAMSTAT]: (bufferStream) => {
            },
            [DemoModel.Packet.ID.CLIENTDATA]: (bufferStream) => {
                const size = bufferStream.readInt(3);
                const setupText = zlib.unzipSync(bufferStream.read(size)).toString().replace(/\0/g, "");
                return { setupText };
            },
            [DemoModel.Packet.ID.ATTEMPTCONNECT]: (bufferStream) => {
            },
            [DemoModel.Packet.ID.REJECT_CONNECT]: (bufferStream) => {
            },
            [DemoModel.Packet.ID.AI_CREATED]: (bufferStream) => {
            },
            [DemoModel.Packet.ID.AI_STATE_CHANGED]: (bufferStream) => {
                const playerNum = bufferStream.readInt(1, true);
                const whichSkirmishAi = bufferStream.readInt(1, true);
                const newState = bufferStream.readInt(1, true);
                return { playerNum, whichSkirmishAi, newState };
            },
            [DemoModel.Packet.ID.REQUEST_TEAMSTAT]: (bufferStream) => {
            },
            [DemoModel.Packet.ID.CREATE_NEWPLAYER]: (bufferStream) => {
                const size = bufferStream.readInt(2);
                const playerNum = bufferStream.readInt(1, true);
                const spectator = bufferStream.readBool();
                const teamNum = bufferStream.readInt(1, true);
                const playerName = bufferStream.readString();
                return { playerNum, spectator, teamNum, playerName };
            },
            [DemoModel.Packet.ID.AICOMMAND_TRACKED]: (bufferStream) => {
            },
            [DemoModel.Packet.ID.GAME_FRAME_PROGRESS]: (bufferStream) => {
                const frameNum = bufferStream.readInt();
                return { frameNum };
            },
            [DemoModel.Packet.ID.PING]: (bufferStream) => {
            },
        };
    }
}