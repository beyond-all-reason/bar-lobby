// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { EngineAI, EngineVersion } from "@main/content/engine/engine-version";
import { GameAI, GameVersion } from "@main/content/game/game-version";
import { MapData } from "@main/content/maps/map-data";
import {
    Battle,
    BattleWithMetadata,
    Bot,
    Faction,
    GameMode,
    GameModeLabel,
    isBot,
    isPlayer,
    isRaptor,
    isScavenger,
    isScavengerOrRaptor,
    Player,
    StartPosType,
    Team,
} from "@main/game/battle/battle-types";
import { enginesStore } from "@renderer/store/engine.store";
import { gameStore } from "@renderer/store/game.store";
import { getRandomMap } from "@renderer/store/maps.store";
import { me } from "@renderer/store/me.store";
import { deepToRaw } from "@renderer/utils/deep-toraw";
import { spadsBoxToStartBox } from "@renderer/utils/start-boxes";
import { StartBox } from "tachyon-protocol/types";
import { reactive, readonly, watch } from "vue";
import { startBattle as startGame } from "@renderer/store/game.store";

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

    const players = battleStore.teams[teamId].participants.filter(isPlayer);
    const bots = battleStore.teams[teamId].participants.filter((p) => isBot(p) && !isScavenger(p) && !isRaptor(p));
    const scavengersOrRaptors = battleStore.teams[teamId].participants.filter(isScavengerOrRaptor);

    battleStore.teams.splice(teamId, 1);

    const maxPlayersPerTeam = getMaxPlayersPerTeam();

    //  first handle scavs/raptors to ensure they are alone in the last team
    if (scavengersOrRaptors.length > 0) {
        const lastTeam = battleStore.teams.at(-1);
        if (lastTeam && lastTeam.participants.length > 0) {
            players.push(...lastTeam.participants.filter(isPlayer));
            bots.push(...lastTeam.participants.filter(isBot));
            lastTeam.participants = [...scavengersOrRaptors.splice(0)];
        }
    }

    // then handle all players to not force spec when bots can be removed
    for (const team of battleStore.teams.values()) {
        if (team.participants.filter(isScavengerOrRaptor).length > 0) continue;

        if (team.participants.length < maxPlayersPerTeam) {
            const numberOfPlayersToAdd = maxPlayersPerTeam - team.participants.length;
            team.participants.push(...players.splice(0, numberOfPlayersToAdd));
        }
    }

    // finally handle regular bots the same as players
    for (const team of battleStore.teams.values()) {
        if (team.participants.filter(isScavengerOrRaptor).length > 0) continue;

        if (team.participants.length < maxPlayersPerTeam) {
            const numberOfBotsToAdd = maxPlayersPerTeam - team.participants.length;
            team.participants.push(...bots.splice(0, numberOfBotsToAdd));
        }
    }

    // force spec or remove bots if any are left
    const extraParticipants = [...players, ...bots, ...scavengersOrRaptors];
    if (extraParticipants.length > 0) {
        extraParticipants.forEach((participant) => (isPlayer(participant) ? movePlayerToSpectators(participant) : removeBot(participant)));
    }

    removeCustomStartBox(teamId);
}

function addTeam() {
    battleStore.teams.push({ participants: [] } as Team);
    addCustomStartBox();
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
    let numberOfTeams = 2;

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
        for (let i = 0; i <= numberOfTeams - battleStore.teams.length; i++) addTeam();
    } else if (battleStore.teams.length > numberOfTeams) {
        for (let i = battleStore.teams.length - 1; i + 1 > numberOfTeams; i--) removeTeam(i);
    }

    // Adjust number of participants per team
    const maxPartipantsPerTeam = getMaxPlayersPerTeam();
    const extraParticipants: Array<Player | Bot> = [];
    for (const team of battleStore.teams.values()) {
        if (team.participants.filter(isScavengerOrRaptor).length > 0) continue;

        if (team.participants.length > maxPartipantsPerTeam) {
            extraParticipants.push(...team.participants.splice(maxPartipantsPerTeam));
        } else {
            team.participants.push(...extraParticipants.splice(0, maxPartipantsPerTeam - team.participants.length));
        }
    }
}

function getCurrentStartBoxes(): Array<StartBox> {
    const startBoxesIndex = battleStore.battleOptions.mapOptions.startBoxesIndex;
    return startBoxesIndex != undefined
        ? battleStore.battleOptions.map?.startboxesSet.at(startBoxesIndex)?.startboxes.map((box) => spadsBoxToStartBox(box.poly)) || []
        : (battleStore.battleOptions.mapOptions.customStartBoxes as Array<StartBox>);
}

function getCustomStartBoxes(): Array<StartBox> {
    return battleStore.battleOptions.mapOptions.customStartBoxes != undefined ? battleStore.battleOptions.mapOptions.customStartBoxes : [];
}

function addCustomStartBox() {
    const customBoxes = battleStore.battleOptions.mapOptions.customStartBoxes;

    if (customBoxes == undefined) return;

    if (customBoxes.length == 0) {
        // Add a default box with proper sizing at the top-left of the map
        const defaultBox = {
            top: 0.0,
            bottom: 1,
            left: 0.0,
            right: 0.25,
        };
        battleStore.battleOptions.mapOptions.customStartBoxes = [...customBoxes, defaultBox];
    } else {
        const lastBox = customBoxes.at(-1);
        if (lastBox == undefined) return;
        battleStore.battleOptions.mapOptions.customStartBoxes = [...customBoxes, lastBox];
    }
}

function removeCustomStartBox(boxId: number) {
    const customBoxes = battleStore.battleOptions.mapOptions.customStartBoxes;

    if (customBoxes == undefined || customBoxes.length == 0) return;

    if (customBoxes[boxId]) {
        const newBoxes = customBoxes.filter((_, index) => index !== boxId);
        battleStore.battleOptions.mapOptions.customStartBoxes = newBoxes;
    }
}

function defaultOfflineBattle(engine?: EngineVersion, game?: GameVersion, map?: MapData, online?: boolean) {
    const barbAi = engine?.ais.find((ai) => ai.shortName === "BARb");
    const battle: Battle = {
        title: online ? "Online Custom Battle" : "Offline Custom Battle",
        isOnline: false,
        battleOptions: {
            engineVersion: engine?.id || enginesStore.selectedEngineVersion?.id,
            gameVersion: game?.gameVersion || gameStore.selectedGameVersion?.gameVersion,
            gameMode: {
                label: GameMode.CLASSIC,
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

    if (!online) {
        battle.teams[1].participants.push(defaultBot);
    }
    return battle;
}

function resetToDefaultBattle(engine?: EngineVersion, game?: GameVersion, map?: MapData, online?: boolean) {
    const battle = defaultOfflineBattle(engine, game, map, online);
    Object.assign(battleStore, battle);
}

async function startBattle() {
    await startGame(deepToRaw(_battleWithMetadataStore));
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
        const engineVersion = enginesStore.selectedEngineVersion;
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

async function loadGameMode(gameMode: GameModeLabel) {
    battleStore.isOnline = false;
    resetToDefaultBattle();
    if (!battleStore.battleOptions.engineVersion) {
        const engineVersion = enginesStore.selectedEngineVersion;
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
    //Now that we are sharing the drawer with the game-mode selector, we need to reset to offline battle.
    //FIXME: Could be a problem if someone tries to launch a gamemode while also in lobby?
    //Will probably need some checks and to warn the user that they're in a lobby before they can select.
    switch (gameMode) {
        case GameMode.CLASSIC:
            removeCoopAIs();
            battleStore.title = "Classic";
            battleStore.battleOptions = {
                ...battleStore.battleOptions,
                gameMode: {
                    label: GameMode.CLASSIC,
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
            addCoopAI("RaptorsAI");
            battleStore.title = "Raptors";
            battleStore.battleOptions = {
                ...battleStore.battleOptions,
                gameMode: {
                    label: GameMode.RAPTORS,
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
            addCoopAI("ScavengersAI");
            battleStore.title = "Scavengers";
            battleStore.battleOptions = {
                ...battleStore.battleOptions,
                gameMode: {
                    label: GameMode.SCAVENGERS,
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
            removeCoopAIs();
            battleStore.title = "FFA";
            battleStore.battleOptions = {
                ...battleStore.battleOptions,
                gameMode: {
                    label: GameMode.FFA,
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

function removeCoopAIs() {
    for (const team of battleStore.teams) team.participants.forEach((p) => isBot(p) && (isScavenger(p) || isRaptor(p)) && removeBot(p));
}

function addCoopAI(coopAI: "RaptorsAI" | "ScavengersAI") {
    if (!gameStore.selectedGameVersion) throw new Error("failed to retrieve game version");

    removeCoopAIs();

    const ai = gameStore.selectedGameVersion.ais.find((ai) => ai.shortName === coopAI);

    if (ai) addBot(ai, 1);

    for (const participant of battleStore.teams[1].participants) {
        if (isPlayer(participant)) {
            if (battleStore.teams[0].participants.length < getMaxPlayersPerTeam()) {
                movePlayerToTeam(participant, 0);
            } else {
                movePlayerToSpectators(participant);
            }
        } else if (isBot(participant)) {
            if (isRaptor(participant) || isScavenger(participant)) continue;

            if (battleStore.teams[0].participants.length < getMaxPlayersPerTeam()) {
                moveBotToTeam(participant, 0);
            } else {
                removeBot(participant);
            }
        }
    }
}

export const battleActions = {
    movePlayerToTeam,
    movePlayerToSpectators,
    moveBotToTeam,
    addTeam,
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
    getCurrentStartBoxes,
    getCustomStartBoxes,
};

// Needs game files to exists.
export function initBattleStore() {
    resetToDefaultBattle();
}
