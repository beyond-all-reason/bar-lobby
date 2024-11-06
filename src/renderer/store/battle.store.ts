import { EngineVersion } from "@main/content/engine/engine-version";
import { GameVersion } from "@main/content/game/game-version";
import { MapData } from "@main/content/maps/map-data";
import { Battle, BattleOptions, BattleWithMetadata, Bot, Faction, Player, StartPosType } from "@main/game/battle/battle-types";
import { User } from "@main/model/user";
import { _me, me } from "@renderer/store/me.store";
import { deepToRaw } from "@renderer/utils/deep-toraw";
import { reactive, readonly, watch } from "vue";

// Store
export const battleStore = reactive({
    title: "Battle",
    isOnline: false,
    battleOptions: {},
    teams: [],
    spectators: [],
} as Battle);

// Automatically computing metadata for the battle
const _battleWithMetadataStore = reactive({} as BattleWithMetadata);
export const battleWithMetadataStore = readonly(_battleWithMetadataStore);
watch(
    battleStore,
    (battle) => {
        Object.assign(_battleWithMetadataStore, battle);
        _battleWithMetadataStore.participants = Object.values(battle.teams).flat();
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

function removeBot(bot: Bot) {
    removeFromTeams(bot);
}

function userToPlayer(user: User): Player {
    return {
        id: user.userId,
        user,
    } as Player;
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
        me: userToPlayer(me),
        title: "Offline Custom Battle",
        isOnline: false,
        battleOptions: {
            engineVersion: engine?.id,
            gameVersion: game?.gameVersion,
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

    battle.teams[0].push({
        id: 0,
        user: me,
        name: me.username,
        contentSyncState: {
            engine: 1,
            game: 1,
            map: 1,
        },
        inGame: false,
    } as Player);

    battle.teams[1].push({
        id: 1,
        aiOptions: {},
        faction: Faction.Armada,
        name: "AI 1",
        aiShortName: barbAi?.shortName || "BARb",
        ownerUserId: 0,
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
            _me.battleRoomState.isSpectator = true;
            _me.battleRoomState.isReady = true;
            delete _me.battleRoomState.teamId;
        } else {
            _me.battleRoomState.isSpectator = false;
            // iterate over the map id, team to find the user's team
            battle.teams.forEach((team, teamId) => {
                if (
                    team.find((participant) => {
                        return participant && "user" in participant && participant.user.userId === me.userId;
                    })
                ) {
                    _me.battleRoomState.teamId = teamId;
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

export const battleActions = {
    movePlayerToTeam,
    movePlayerToSpectators,
    moveBotToTeam,
    removeBot,
    startBattle,
    updateTeams,
    resetToDefaultBattle,
};

export function initBattleStore() {
    resetToDefaultBattle();
}
