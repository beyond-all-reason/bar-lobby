import { EngineAI, EngineVersion } from "@main/content/engine/engine-version";
import { GameAI, GameVersion } from "@main/content/game/game-version";
import { MapData } from "@main/content/maps/map-data";
import { Battle, BattleWithMetadata, Bot, Faction, GameModeType, isBot, isPlayer, isRaptor, isScavenger, Player, StartPosType, Team } from "@main/game/battle/battle-types";
import { enginesStore } from "@renderer/store/engine.store";
import { gameStore } from "@renderer/store/game.store";
import { getRandomMap } from "@renderer/store/maps.store";
import { me } from "@renderer/store/me.store";
import { deepToRaw } from "@renderer/utils/deep-toraw";
import { reactive, readonly, watch } from "vue";

export const GameMode: Record<string, GameModeType> = {
    CLASSIC: "Classic",
    RAPTORS: "Raptors",
    SCAVENGERS: "Scavengers",
    FFA: "FFA",
};

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
        _battleWithMetadataStore.participants = battle.teams.flatMap((team) => team.participants);
        _battleWithMetadataStore.bots = _battleWithMetadataStore.participants.filter((participant) => "aiShortName" in participant);
        _battleWithMetadataStore.players = _battleWithMetadataStore.participants.filter((participant) => "user" in participant);
        if (battle.started && !_battleWithMetadataStore.startTime) _battleWithMetadataStore.startTime = new Date();
    },
    { deep: true }
);

// Actions
function removeFromTeams(participant: Player | Bot) {
    battleStore.teams = battleStore.teams.map((team) => {
        return { participants: team.participants.filter((p) => p.id !== participant.id) };
    });
}

function removeFromSpectators(participant: Player) {
    const index = battleStore.spectators.findIndex((p) => p.id === participant.id);
    if (index !== -1) battleStore.spectators.splice(index, 1);
}

function removeTeam(teamId: number) {
    if (!battleStore.teams[teamId]) {
        console.error(`Trying to remove team with teamId=${teamId}`, "Teams:", battleStore.teams);
        return;
    }

    const participants = [...battleStore.teams[teamId].participants];

    const scavengersOrRaptors = participants.findIndex((participant) => isBot(participant) && (isScavenger(participant) || isRaptor(participant)));

    battleStore.teams.splice(teamId, 1);

    // If it is a special AI (scavengers or raptors), it should go in its own team
    if (scavengersOrRaptors) {
        const lastEmptyTeam = battleStore.teams.toReversed().findIndex((team) => team.participants.length == 0);
        battleStore.teams[lastEmptyTeam].participants = participants.splice(scavengersOrRaptors, 1);
    }

    const maxPlayersPerTeam = getMaxPlayersPerTeam();

    for (const team of battleStore.teams.values()) {
        if (team.participants.length < maxPlayersPerTeam) {
            const numberOfPlayersToAdd = maxPlayersPerTeam - team.participants.length;
            team.participants.push(...participants.splice(0, numberOfPlayersToAdd));
        }
    }

    if (participants.length > 0) {
        participants.forEach((participant) => (isPlayer(participant) ? movePlayerToSpectators(participant) : removeBot(participant)));
    }
}

function addTeam() {
    battleStore.teams = [...battleStore.teams, { participants: [] } as Team];
}

function addTeams(amount: number) {
    for (let i = 0; i < amount; i++) addTeam();
}

function addBot(ai: EngineAI | GameAI, teamId: number) {
    if (!battleStore.me) throw new Error("failed to access current player");

    battleStore.teams[teamId].participants.push({
        id: participantId++,
        name: ai.name,
        aiOptions: {},
        aiShortName: ai.shortName,
        host: battleStore.me.id,
    } satisfies Bot);
}

function removeBot(bot: Bot) {
    removeFromTeams(bot);
}

function duplicateBot(bot: Bot, teamId: number) {
    const newBot = {
        ...bot,
        id: participantId++,
    };
    battleStore.teams[teamId].participants.push(newBot);
}

function updateBotOptions(bot: Bot, options: Record<string, unknown>) {
    const foundBot = battleStore.teams
        .flat()
        .filter((p) => isBot(p))
        .find((p) => p.id === bot.id);
    if (!foundBot) {
        throw Error(`Failed to find bot ${bot.name} (${bot.id})`);
    }
    bot.aiOptions = options;
}

function movePlayerToTeam(player: Player, teamId: number) {
    removeFromTeams(player);
    removeFromSpectators(player);
    if (!battleStore.teams[teamId]) addTeam();
    battleStore.teams[teamId].participants.push(player);
}

function movePlayerToSpectators(player: Player) {
    removeFromTeams(player);
    removeFromSpectators(player);
    battleStore.spectators.push(player);
}

function moveBotToTeam(bot: Bot, teamId: number) {
    removeFromTeams(bot);
    if (!battleStore.teams[teamId]) addTeam();
    battleStore.teams[teamId].participants.push(bot);
}

function getNumberOfTeams(): number {
    let numberOfTeams = 0;

    const map = battleStore.battleOptions.map;

    if (!map) throw new Error("failed to access battle options map");

    if (battleStore.battleOptions.mapOptions.startPosType === StartPosType.Boxes) {
        const startBoxIndex = battleStore.battleOptions.mapOptions.startBoxesIndex;

        if (startBoxIndex != undefined) {
            const startBoxes = map.startboxesSet[startBoxIndex];
            numberOfTeams = startBoxes.startboxes.length;
        } else if (battleStore.battleOptions.mapOptions.customStartBoxes) {
            numberOfTeams = battleStore.battleOptions.mapOptions.customStartBoxes.length;
        }
    }

    if (battleStore.battleOptions.mapOptions.startPosType in [StartPosType.Fixed, StartPosType.Random]) {
        if (!map.startPos || !map.startPos.team) throw new Error("failed to access team start position");

        const teamPreset = map.startPos.team[battleStore.battleOptions.mapOptions.fixedPositionsIndex ?? 0];
        numberOfTeams = teamPreset.sides.length || 0;
    }

    return numberOfTeams;
}

function getMaxPlayersPerTeam() {
    let maxPlayersPerTeam: number | null = null;

    const map = battleStore.battleOptions.map;

    if (!map) throw new Error("failed to access battle options map");

    if (battleStore.battleOptions.mapOptions.startPosType === StartPosType.Boxes) {
        const startBoxIndex = battleStore.battleOptions.mapOptions.startBoxesIndex;

        if (startBoxIndex != undefined) {
            const startBoxes = map.startboxesSet[startBoxIndex];
            maxPlayersPerTeam = startBoxes.maxPlayersPerStartbox;
        } else if (battleStore.battleOptions.mapOptions.customStartBoxes) {
            maxPlayersPerTeam = Math.round(map.playerCountMax / battleStore.battleOptions.mapOptions.customStartBoxes.length);
        }
    }

    if (battleStore.battleOptions.mapOptions.startPosType in [StartPosType.Fixed, StartPosType.Random]) {
        if (!map.startPos || !map.startPos.team) throw new Error("failed to access team start position");

        const teamPreset = map.startPos.team[battleStore.battleOptions.mapOptions.fixedPositionsIndex ?? 0];
        maxPlayersPerTeam = teamPreset.playersPerTeam || 0;
    }

    return maxPlayersPerTeam || 0;
}

function updateTeams() {
    if (!battleStore.battleOptions.map) return;
    const numberOfTeams = getNumberOfTeams();

    // Adjust number of teams
    if (battleStore.teams.length < numberOfTeams) {
        addTeams(numberOfTeams - battleStore.teams.length);
    } else if (battleStore.teams.length > numberOfTeams) {
        for (let i = battleStore.teams.length - 1; i + 1 > numberOfTeams; i--) {
            removeTeam(i);
        }
    }
}

function defaultOfflineBattle(engine?: EngineVersion, game?: GameVersion, map?: MapData) {
    const barbAi = engine?.ais.find((ai) => ai.shortName === "BARb");
    const battle: Battle = {
        title: "Offline Custom Battle",
        isOnline: false,
        battleOptions: {
            engineVersion: engine?.id || enginesStore.getEngineVersion()?.id,
            gameVersion: game?.gameVersion || gameStore.selectedGameVersion?.gameVersion,
            gameMode: {
                label: "Classic",
                options: game?.luaOptionSections || {},
            },
            map,
            mapOptions: {
                startPosType: StartPosType.Boxes,
                startBoxesIndex: 0,
            },
            restrictions: [],
        },
        teams: [{ participants: [] }, { participants: [] }],
        spectators: [],
        started: false,
    };

    const mePlayer: Player = {
        id: participantId++,
        user: me,
        name: me.username,
        contentSyncState: {
            engine: 1,
            game: 1,
            map: map?.isInstalled ? 1 : 0,
        },
        inGame: false,
    };

    battle.me = mePlayer;

    battle.teams[0].participants.push(mePlayer);

    const defaultBot = {
        id: participantId++,
        host: mePlayer.id,
        aiOptions: {},
        faction: Faction.Armada,
        name: "AI 1",
        aiShortName: barbAi?.shortName || "BARb",
    } satisfies Bot;

    battle.teams[1].participants.push(defaultBot);

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
                    team.participants.find((participant) => {
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
        if (battleStore.me) battleStore.me.contentSyncState.map = battleStore.battleOptions.map?.isInstalled ? 1 : 0;
        updateTeams();
    },
    { deep: true }
);

watch(
    () => enginesStore.selectedEngineVersion,
    () => {
        const engineVersion = enginesStore.getEngineVersion();
        if (!engineVersion) throw new Error("failed to access engine version");

        battleStore.battleOptions.engineVersion = engineVersion.id;
    }
);

watch(
    () => gameStore.selectedGameVersion,
    (gameVersion) => {
        if (!gameVersion) throw new Error("failed to access game version");

        battleStore.battleOptions.gameVersion = gameVersion.gameVersion;
    }
);

function leaveBattle() {
    battleStore.isJoined = false;
    resetToDefaultBattle();
}

async function loadGameMode(gameMode: GameModeType) {
    if (!battleStore.battleOptions.engineVersion) {
        const engineVersion = enginesStore.getEngineVersion();
        if (!engineVersion) throw new Error("failed to access engine version");

        battleStore.battleOptions.engineVersion = engineVersion.id;
    }
    if (!battleStore.battleOptions.gameVersion) {
        if (!gameStore.selectedGameVersion) throw new Error("failed to access game version");

        battleStore.battleOptions.gameVersion = gameStore.selectedGameVersion.gameVersion;
    }
    if (!battleStore.battleOptions.map) {
        const randomMap = await getRandomMap();
        battleStore.battleOptions.map = randomMap;
    }

    switch (gameMode) {
        case GameMode.CLASSIC:
            removeScavengersAI();
            removeRaptorsAI();
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
            removeScavengersAI();
            addRaptorsAI();
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
            removeRaptorsAI();
            addScavengersAI();
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
            removeScavengersAI();
            removeRaptorsAI();
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

function removeScavengersAI() {
    battleStore.teams.flat().forEach((p) => isBot(p) && isScavenger(p) && removeBot(p));
}
function removeRaptorsAI() {
    battleStore.teams.flat().forEach((p) => isBot(p) && isRaptor(p) && removeBot(p));
}

function addScavengersAI() {
    if (!gameStore.selectedGameVersion) throw new Error("failed to retrieve game version");

    const scavengersAI = gameStore.selectedGameVersion.ais.find((ai) => ai.shortName === "ScavengersAI");
    if (scavengersAI) addBot(scavengersAI, getNumberOfTeams() - 1);
}
function addRaptorsAI() {
    if (!gameStore.selectedGameVersion) throw new Error("failed to retrieve game version");

    const raptorsAI = gameStore.selectedGameVersion.ais.find((ai) => ai.shortName === "RaptorsAI");
    if (raptorsAI) addBot(raptorsAI, getNumberOfTeams() - 1);
}

export const battleActions = {
    movePlayerToTeam,
    movePlayerToSpectators,
    moveBotToTeam,
    addTeam,
    addTeams,
    removeTeam,
    addBot,
    removeBot,
    duplicateBot,
    updateBotOptions,
    startBattle,
    updateTeams,
    resetToDefaultBattle,
    leaveLobby: leaveBattle,
    loadGameMode,
    getMaxPlayersPerTeam,
};

// Needs game files to exists.
export function initBattleStore() {
    resetToDefaultBattle();
}
