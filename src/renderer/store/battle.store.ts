import { EngineAI, EngineVersion } from "@main/content/engine/engine-version";
import { GameAI, GameVersion } from "@main/content/game/game-version";
import { MapData } from "@main/content/maps/map-data";
import { Battle, BattleOptions, BattleWithMetadata, Bot, Faction, Player, StartPosType } from "@main/game/battle/battle-types";
import { enginesStore } from "@renderer/store/engine.store";
import { gameStore } from "@renderer/store/game.store";
import { getRandomMap } from "@renderer/store/maps.store";
import { me } from "@renderer/store/me.store";
import { deepToRaw } from "@renderer/utils/deep-toraw";
import { reactive, readonly, watch } from "vue";

export enum GameMode {
    CLASSIC = "classic",
    RAPTORS = "raptors",
    SCAVENGERS = "scavengers",
    FFA = "ffa",
}

let participantId = 0;
interface BattleLobby {
    isJoined: boolean;
    isLobbyOpened: boolean;
    isSelectingGameMode: boolean;
}

// Store
export const battleStore = reactive<Battle & BattleLobby>({
    isJoined: false,
    isLobbyOpened: false,
    isSelectingGameMode: false,
    title: "Battle",
    isOnline: false,
    battleOptions: {
        gameMode: {
            label: GameMode.CLASSIC,
            options: {},
        },
        mapOptions: {
            startPosType: StartPosType.Boxes,
            startBoxesIndex: 0,
        },
        restrictions: [],
    },
    teams: [],
    spectators: [],
    started: false,
});

// Automatically computing metadata for the battle
const _battleWithMetadataStore = reactive({} as BattleWithMetadata);
export const battleWithMetadataStore = readonly(_battleWithMetadataStore);
watch(
    battleStore,
    (battle) => {
        Object.assign(_battleWithMetadataStore, battle);
        _battleWithMetadataStore.participants = Object.values(battle.teams).flat();
        _battleWithMetadataStore.bots = _battleWithMetadataStore.participants.filter((participant) => "aiShortName" in participant);
        _battleWithMetadataStore.players = _battleWithMetadataStore.participants.filter((participant) => "user" in participant);
        if (battle.started && !_battleWithMetadataStore.startTime) _battleWithMetadataStore.startTime = new Date();
    },
    { deep: true }
);

// Actions
function removeFromTeams(participant: Player | Bot) {
    for (const team of Object.values(battleStore.teams)) {
        const index = team.findIndex((p) => p.id === participant.id);
        if (index !== -1) team.splice(index, 1);
    }
}

function removeFromSpectators(participant: Player) {
    const index = battleStore.spectators.findIndex((p) => p.id === participant.id);
    if (index !== -1) battleStore.spectators.splice(index, 1);
}

function addBot(ai: EngineAI | GameAI, teamId: number) {
    battleStore.teams[teamId].push({
        id: participantId++,
        name: ai.name,
        aiOptions: {},
        aiShortName: ai.shortName,
        host: battleStore.me.id,
    } as Bot);
}

function removeBot(bot: Bot) {
    removeFromTeams(bot);
}

function duplicateBot(bot: Bot, teamId: number) {
    const newBot = {
        ...bot,
        id: participantId++,
    };
    battleStore.teams[teamId].push(newBot);
}

function updateBotOptions(bot: Bot, options: Record<string, unknown>) {
    (battleStore.teams.flat().find((participant) => participant.id === bot.id) as Bot).aiOptions = options;
}

function movePlayerToTeam(player: Player, teamId: number) {
    removeFromTeams(player);
    removeFromSpectators(player);
    if (!battleStore.teams[teamId]) battleStore.teams[teamId] = [];
    battleStore.teams[teamId].push(player);
}

function movePlayerToSpectators(player: Player) {
    removeFromTeams(player);
    removeFromSpectators(player);
    battleStore.spectators.push(player);
}

function moveBotToTeam(bot: Bot, teamId: number) {
    removeFromTeams(bot);
    if (!battleStore.teams[teamId]) battleStore.teams[teamId] = [];
    battleStore.teams[teamId].push(bot);
}

//TODO move extra players to spectators
function updateTeams() {
    if (!battleStore.battleOptions.map) return;
    const currentParticipants = Object.values(battleStore.teams).flat();
    if (battleStore.battleOptions.mapOptions.startPosType === StartPosType.Boxes) {
        // get all participant in team order
        // update teams with selected BoxDetails
        const startBoxes = battleStore.battleOptions.map.startboxesSet[battleStore.battleOptions.mapOptions.startBoxesIndex];
        const numberOfTeams = startBoxes.startboxes.length;
        const maxPlayersPerStartbox = startBoxes.maxPlayersPerStartbox;
        battleStore.teams = new Array(numberOfTeams).fill(null).map((_, i) => {
            return currentParticipants.slice(i * maxPlayersPerStartbox, (i + 1) * maxPlayersPerStartbox);
        });
    }
    if (battleStore.battleOptions.mapOptions.startPosType === StartPosType.Fixed) {
        const teamPreset = battleStore.battleOptions.map.startPos.team[battleStore.battleOptions.mapOptions.fixedPositionsIndex];
        const numberOfTeams = teamPreset.sides.length;
        const maxPlayersPerTeam = teamPreset.playersPerTeam;
        battleStore.teams = new Array(numberOfTeams).fill(null).map((_, i) => {
            return currentParticipants.slice(i * maxPlayersPerTeam, (i + 1) * maxPlayersPerTeam);
        });
    }
}

function defaultOfflineBattle(engine?: EngineVersion, game?: GameVersion, map?: MapData) {
    const barbAi = engine?.ais.find((ai) => ai.shortName === "BARb");
    const battle = {
        title: "Offline Custom Battle",
        isOnline: false,
        battleOptions: {
            engineVersion: engine?.id || enginesStore.selectedEngineVersion.id,
            gameVersion: game?.gameVersion || gameStore.selectedGameVersion.gameVersion,
            gameMode: {
                label: "Default",
                options: game?.luaOptionSections || {},
            },
            map,
            mapOptions: {
                startPosType: StartPosType.Boxes,
                startBoxesIndex: 0,
            },
            restrictions: [],
        } as BattleOptions,
        teams: [[], []], // Maybe make a Team interface with maxPlayersPerTeam or fetch that info from the map
        spectators: [],
        started: false,
    } as Battle;

    const mePlayer = {
        id: participantId++,
        user: me,
        name: me.username,
        contentSyncState: {
            engine: 1,
            game: 1,
            map: 1,
        },
        inGame: false,
    } as Player;

    battle.me = mePlayer;
    battle.teams[0].push(mePlayer);
    battle.teams[1].push({
        id: participantId++,
        host: mePlayer.id,
        aiOptions: {},
        faction: Faction.Armada,
        name: "AI 1",
        aiShortName: barbAi?.shortName || "BARb",
    } as Bot);
    return battle;
}

function resetToDefaultBattle(engine?: EngineVersion, game?: GameVersion, map?: MapData) {
    const battle = defaultOfflineBattle(engine, game, map);
    Object.assign(battleStore, battle);
}

async function startBattle() {
    await window.game.launchBattle(deepToRaw(_battleWithMetadataStore));
}

// Automatically compute my battle status given the changes in the battle
watch(
    battleWithMetadataStore,
    (battle) => {
        if (battle.spectators.find((spectator) => spectator.user.userId === me.userId)) {
            me.battleRoomState.isSpectator = true;
            me.battleRoomState.isReady = true;
            delete me.battleRoomState.teamId;
        } else {
            me.battleRoomState.isSpectator = false;
            // iterate over the map id, team to find the user's team
            battle.teams.forEach((team, teamId) => {
                if (
                    team.find((participant) => {
                        return participant && "user" in participant && participant.user.userId === me.userId;
                    })
                ) {
                    me.battleRoomState.teamId = teamId;
                }
            });
        }
    },
    { deep: true }
);

watch(
    () => battleStore.battleOptions.mapOptions,
    () => {
        updateTeams();
    },
    { deep: true }
);

watch(
    () => battleStore.battleOptions.map,
    () => {
        battleStore.battleOptions.mapOptions.startPosType = StartPosType.Boxes;
        battleStore.battleOptions.mapOptions.startBoxesIndex = 0;
        updateTeams();
    },
    { deep: true }
);

watch(
    () => enginesStore.selectedEngineVersion,
    (engineVersion) => {
        battleStore.battleOptions.engineVersion = engineVersion.id;
    }
);

watch(
    () => gameStore.selectedGameVersion,
    (gameVersion) => {
        battleStore.battleOptions.gameVersion = gameVersion.gameVersion;
    }
);

function leaveBattle() {
    battleStore.isJoined = false;
    resetToDefaultBattle();
}

async function loadGameMode(gameMode: GameMode) {
    if (!battleStore.battleOptions.engineVersion) {
        battleStore.battleOptions.engineVersion = enginesStore.selectedEngineVersion.id;
    }
    if (!battleStore.battleOptions.gameVersion) {
        battleStore.battleOptions.gameVersion = gameStore.selectedGameVersion.gameVersion;
    }
    if (!battleStore.battleOptions.map) {
        const randomMap = await getRandomMap();
        battleStore.battleOptions.map = randomMap;
    }

    switch (gameMode) {
        case GameMode.CLASSIC:
            battleStore.title = "Classic";
            battleStore.battleOptions = {
                ...battleStore.battleOptions,
                gameMode: {
                    label: "Classic",
                    options: {},
                },
                mapOptions: {
                    startPosType: StartPosType.Boxes,
                    startBoxesIndex: 0,
                },
                restrictions: [],
            };
            break;
        case GameMode.RAPTORS:
            battleStore.title = "Raptors";
            battleStore.battleOptions = {
                ...battleStore.battleOptions,
                gameMode: {
                    label: "Raptors",
                    options: {},
                },
                mapOptions: {
                    startPosType: StartPosType.Boxes,
                    startBoxesIndex: 0,
                },
                restrictions: [],
            };
            break;
        case GameMode.SCAVENGERS:
            battleStore.title = "Scavengers";
            battleStore.battleOptions = {
                ...battleStore.battleOptions,
                gameMode: {
                    label: "Scavengers",
                    options: {},
                },
                mapOptions: {
                    startPosType: StartPosType.Boxes,
                    startBoxesIndex: 0,
                },
                restrictions: [],
            };
            break;
        case GameMode.FFA:
            battleStore.title = "FFA";
            battleStore.battleOptions = {
                ...battleStore.battleOptions,
                gameMode: {
                    label: "FFA",
                    options: {},
                },
                mapOptions: {
                    startPosType: StartPosType.Boxes,
                    startBoxesIndex: 0,
                },
                restrictions: [],
            };
            break;
        default:
            console.error("Unknown game mode", gameMode);
    }
}

export const battleActions = {
    movePlayerToTeam,
    movePlayerToSpectators,
    moveBotToTeam,
    addBot,
    removeBot,
    duplicateBot,
    updateBotOptions,
    startBattle,
    updateTeams,
    resetToDefaultBattle,
    leaveLobby: leaveBattle,
    loadGameMode,
};

// Needs game files to exists.
export function initBattleStore() {
    resetToDefaultBattle();
}
