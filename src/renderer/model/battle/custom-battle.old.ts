// import { assign, entries, objectKeys } from "jaz-ts-utils";
// import { TachyonCustomBattle, TachyonUser } from "tachyon-protocol";
// import { computed, ComputedRef, Ref, ref } from "vue";

// import { AbstractBattle } from "@/model/battle/abstract-battle";
// import { Bot, CustomBattleOptions, StartBox, StartPosType } from "@/model/battle/battle-types";
// import { SpadsVote } from "@/model/spads/spads-types";
// import { spadsBoxToStartBox, StartBoxOrientation } from "@/utils/start-boxes";

// export class CustomBattle extends AbstractBattle<CustomBattleOptions> {
//     public readonly currentVote: Ref<SpadsVote | null> = ref(null);
//     public readonly founder: ComputedRef<TachyonUser>;
//     public readonly isLockedOrPassworded: ComputedRef<boolean>;
//     public readonly myQueuePosition: ComputedRef<number | null>;

//     protected responseHandlers: { [K in keyof Required<TachyonCustomBattle>]: (data: Required<TachyonCustomBattle[K]>) => void } = {
//         battleId: (data) => (this.battleOptions.id = data),
//         engine: (data) => (timport { AbstractBattle, BattleUser } from "@/model/battle/abstract-battle";
// import { Bot, StartPosType } from "@/model/battle/battle-types";
// import { StartBoxOrientation } from "@/utils/start-boxes";

// export class MatchmakingBattle extends AbstractBattle {
//     public override start(): void {
//         throw new Error("Method not implemented.");
//     }

//     public override setMap(map: string): void {
//         throw new Error("Method not implemented.");
//     }

//     public override setGame(gameVersion: string): void {
//         throw new Error("Method not implemented.");
//     }

//     public override setEngine(engineVersion: string): void {
//         throw new Error("Method not implemented.");
//     }

//     public override setStartPosType(startPosType: StartPosType): void {
//         throw new Error("Method not implemented.");
//     }

//     public override setStartBoxes(orientation: StartBoxOrientation, size: number): void {
//         throw new Error("Method not implemented.");
//     }

//     public override setGameOptions(options: Record<string, any>): void {
//         throw new Error("Method not implemented.");
//     }

//     public override setBotOptions(botName: string, options: Record<string, any>): void {
//         throw new Error("Method not implemented.");
//     }

//     public override addBot(bot: Bot): void {
//         throw new Error("Method not implemented.");
//     }

//     public override removeBot(bot: Bot): void {
//         throw new Error("Method not implemented.");
//     }

//     public override playerToSpectator(player: BattleUser): void {
//         throw new Error("Method not implemented.");
//     }

//     public override spectatorToPlayer(spectator: BattleUser, teamId: number): void {
//         throw new Error("Method not implemented.");
//     }

//     public override setContenderTeam(contender: BattleUser | Bot, teamId: number): void {
//         throw new Error("Method not implemented.");
//     }
// }
// his.battleOptions.engineVersion = data),
//         hostId: (data) => (this.battleOptions.hostId = data),
//         game: (data) => (this.battleOptions.gameVersion = data),
//         map: (data) => (this.battleOptions.map = data),
//         ip: (data) => (this.battleOptions.ip = data),
//         port: (data) => (this.battleOptions.port = data),
//         locked: (data) => (this.battleOptions.locked = data),
//         title: (data) => (this.battleOptions.title = data),
//         passworded: (data) => (this.battleOptions.passworded = data),
//         scriptPassword: (data) => (this.battleOptions.scriptPassword = data),
//         bossIds: (data) => {
//             // TODO
//         },
//         joinQueueIds: (data) => {
//             // TODO
//         },
//         limits: (data) => {
//             // TODO
//         },
//         startPosType: (data) => {
//             // TODO
//         },
//         startAreas: (data) => {
//             const startBoxes: StartBox[] = [];
//             entries(data).forEach(([teamId, startBox]) => {
//                 startBoxes[teamId] = spadsBoxToStartBox(startBox);
//             });
//             this.battleOptions.startBoxes = startBoxes;
//         },
//         startTime: (data) => {
//             if (data) {
//                 this.battleOptions.startTime = new Date(data * 1000);
//             } else {
//                 this.battleOptions.startTime = null;
//             }
//         },
//         bots: (data) => {
//             for (const botData of data) {
//                 const bot: Bot = {
//                     name: botData.name,
//                     playerId: botData.playerId,
//                     teamId: botData.teamId,
//                     ownerUserId: botData.ownerId,
//                     aiOptions: {},
//                     aiShortName: botData.aiShortName,
//                 };

//                 const existingBot = this.bots.find((bot) => bot.name === botData.name);

//                 if (!existingBot) {
//                     this.bots.push(bot);
//                 } else {
//                     assign(existingBot, bot);
//                 }
//             }

//             this.bots.forEach((bot, i) => {
//                 if (!(bot.name in data)) {
//                     this.bots.splice(i, 1);
//                 }
//             });
//         },
//         users: (data) => {
//             if (data) {
//                 const newUsers = data.map((client) => {
//                     const user = api.session.getUserById(client.userId);
//                     if (!user) {
//                         console.error(`Trying to add unknown user to battle: ${client.userId}`);
//                     }
//                     return user;
//                 });

//                 // remove users that left
//                 for (const user of this.users) {
//                     if (!newUsers.includes(user)) {
//                         this.users.splice(this.users.indexOf(user), 1);
//                     }
//                 }

//                 // add users that joined
//                 for (const user of newUsers) {
//                     if (!user) {
//                         continue;
//                     }
//                     if (!this.users.includes(user)) {
//                         this.users.push(user);
//                     }
//                 }
//             }
//         },
//         modOptions: (data) => {
//             // TODO
//         },
//     };

//     constructor(serverBattleResponse: TachyonCustomBattle) {
//         super({
//             battleOptions: {
//                 hostId: -1,
//                 engineVersion: "",
//                 gameOptions: {},
//                 gameVersion: "",
//                 id: -1,
//                 ip: null,
//                 port: null,
//                 isHost: false,
//                 locked: false,
//                 map: "",
//                 mapOptions: {},
//                 maxPlayers: 16,
//                 scriptPassword: null,
//                 passworded: false,
//                 restrictions: [],
//                 startBoxes: [],
//                 startPosType: StartPosType.Fixed,
//                 startTime: null,
//                 title: "",
//                 preset: "",
//                 joinQueueUserIds: [],
//                 autoBalance: "",
//                 balanceMode: "",
//                 nbTeams: 0,
//                 teamSize: 0,
//             },
//             users: [],
//             bots: [],
//         });

//         this.handleServerResponse(serverBattleResponse);

//         this.founder = computed(() => api.session.getUserById(this.battleOptions.hostId)!);
//         this.isLockedOrPassworded = computed(() => this.battleOptions.locked || this.battleOptions.passworded);
//         this.myQueuePosition = computed(() => {
//             const queuePosIndex = this.battleOptions.joinQueueUserIds.indexOf(api.session.onlineUser.userId);
//             if (queuePosIndex === -1) {
//                 return null;
//             }
//             return queuePosIndex + 1;
//         });
//     }

//     public handleServerResponse(battleUpdateResponse: Partial<TachyonCustomBattle>) {
//         objectKeys(battleUpdateResponse).forEach((key) => {
//             const data = battleUpdateResponse[key];
//             const responseHandler = this.responseHandlers[key] as (data: unknown) => void;
//             if (responseHandler) {
//                 responseHandler(data);
//             }
//         });
//     }

//     public override async leave() {
//         super.leave();

//         await api.comms.request("lobby", "leave");
//     }

//     public start() {
//         // if (this.battleOptions.startTime) {
//         //     api.comms.request("c.lobby.message", {
//         //         message: "!joinas spec",
//         //     });
//         //     api.game.launch(this);
//         // } else {
//         //     api.comms.request("c.lobby.message", {
//         //         message: "!cv start",
//         //     });
//         // }
//     }

//     public setEngine(engineVersion: string) {
//         console.warn("not implemented: changeEngine");
//         // TODO
//     }

//     public setGame(gameVersion: string) {
//         console.warn("not implemented: changeGame");
//         // TODO
//     }

//     public setMap(map: string) {
//         // api.comms.request("c.lobby.message", {
//         //     message: `!map ${map}`,
//         // });
//     }

//     public setStartPosType(startPosType: StartPosType) {
//         // api.comms.request("c.lobby.message", {
//         //     message: `!startPosType ${startPosType}`,
//         // });
//     }

//     // This is intentionally a simple implementation, a more robust version will be made if/when
//     // the new lobby supports custom boxes and/or polygons for start areas
//     public setStartBoxes(orientation: StartBoxOrientation, size: number) {
//         // let message = "";
//         // switch (orientation) {
//         //     case StartBoxOrientation.EastVsWest:
//         //         message = `!split v ${size}`;
//         //         break;
//         //     case StartBoxOrientation.NorthVsSouth:
//         //         message = `!split h ${size}`;
//         //         break;
//         //     case StartBoxOrientation.NorthwestVsSouthEast:
//         //         message = `!split c1 ${size}`;
//         //         break;
//         //     case StartBoxOrientation.NortheastVsSouthwest:
//         //         message = `!split c2 ${size}`;
//         //         break;
//         // }
//         // api.comms.request("c.lobby.message", { message });
//     }

//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//     public setGameOptions(options: Record<string, any>) {
//         console.warn("not implemented: setGameOptions");
//         // TODO
//     }

//     public updateParticipant(name: string, updatedProperties: Partial<User | Bot>) {
//         console.warn("not implemented: updateParticipant");
//         // TODO
//     }

//     public say(message: string) {
//         api.comms.request("lobby", "sendMessage", {
//             message,
//         });
//     }

//     public addBot(participant: Bot) {
//         // api.comms.request("c.lobby.add_bot", {
//         //     name: participant.name,
//         //     ai_dll: participant.aiShortName,
//         //     status: {
//         //         player_number: participant.playerId,
//         //         team_number: participant.teamId,
//         //         side: 1,
//         //         team_color: "#f00",
//         //     },
//         // });
//     }

//     public removeBot(participant: Bot) {
//         // api.comms.request("c.lobby.remove_bot", {
//         //     name: participant.name,
//         // });
//     }

//     public playerToSpectator(player: User) {
//         // api.comms.request("c.lobby.update_status", {
//         //     client: {
//         //         player: false,
//         //     },
//         // });
//     }

//     public spectatorToPlayer(spectator: User, teamId: number) {
//         // api.comms.request("c.lobby.update_status", {
//         //     client: {
//         //         player: true,
//         //         team_number: teamId,
//         //     },
//         // });
//     }

//     public setContenderTeam(contender: User | Bot, teamId: number) {
//         // api.comms.request("c.lobby.update_status", {
//         //     client: {
//         //         team_number: teamId,
//         //     },
//         // });
//     }

//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//     public setBotOptions(botName: string, options: Record<string, any>) {
//         console.warn("not implemented: setBotOptions");
//         // TODO
//     }

//     protected updateSync() {
//         const sync = { engine: 0, game: 0, map: 0 };

//         if (api.content.engine.isVersionInstalled(this.battleOptions.engineVersion)) {
//             sync.engine = 1;
//         } else {
//             const dl = api.content.engine.currentDownloads.find((dl) => dl.name === this.battleOptions.engineVersion);
//             if (dl) {
//                 sync.engine = dl.currentBytes / dl.totalBytes;
//             }
//         }

//         if (api.content.game.isVersionInstalled(this.battleOptions.gameVersion)) {
//             sync.game = 1;
//         } else {
//             const dl = api.content.game.currentDownloads.find((dl) => dl.name === this.battleOptions.gameVersion);
//             if (dl) {
//                 sync.game = dl.currentBytes / dl.totalBytes;
//             }
//         }

//         if (api.content.maps.isVersionInstalled(this.battleOptions.map)) {
//             sync.map = 1;
//         } else {
//             const dl = api.content.maps.currentDownloads.find((dl) => dl.name === this.battleOptions.map);
//             if (dl) {
//                 sync.map = dl.currentBytes / dl.totalBytes;
//             }
//         }

//         // api.comms.request("c.lobby.update_status", {
//         //     client: { sync },
//         // });
//     }
// }
