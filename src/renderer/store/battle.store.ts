import { EngineVersion } from "@main/content/engine/engine-version";
import { GameVersion } from "@main/content/game/game-version";
import { MapData } from "@main/content/maps/map-data";
import { Battle, BattleOptions, BattleWithMetadata, Bot, Faction, Player, StartPosType } from "@main/game/battle/battle-types";
import { CurrentUser, User } from "@main/model/user";
import { me } from "@renderer/store/me.store";
import { deepToRaw } from "@renderer/utils/deep-toraw";
import { defaultMapBoxes } from "@renderer/utils/start-boxes";
import { reactive, readonly, watch } from "vue";

// Store
export const battleStore = reactive({} as Battle);

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

function defaultOfflineBattle(engine?: EngineVersion, game?: GameVersion, map?: MapData) {
    const barbAi = engine?.ais.find((ai) => ai.shortName === "BARb");
    const battle = {
        me: userToPlayer(me),
        title: "Offline Custom Battle",
        isOnline: false,
        battleOptions: {
            engineVersion: engine?.id,
            gameVersion: game?.gameVersion,
            mapScriptName: map?.scriptName,
            startPosType: StartPosType.Boxes,
            startBoxes: defaultMapBoxes(),
            gameOptions: {},
            mapOptions: {},
            restrictions: [],
        } as BattleOptions,
        metadata: {},
        teams: {
            0: [],
            1: [],
        },
        spectators: [],
        started: false,
    } as Battle;

    battle.teams[0].push({
        id: 0,
        user: me,
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
        name: "AI",
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

// Should probably make a MyBattleStatus store of some sort
interface CurrentPlayer extends CurrentUser {
    battleStatus: {
        isSpectator: boolean;
        isReady: boolean;
        teamId?: string;
    };
}
const _mePlayer = reactive({
    ...me,
    battleStatus: {
        isSpectator: false,
        isReady: false,
    },
} as CurrentPlayer);
export const mePlayer = readonly(_mePlayer);

// Automatically compute my battle status given the changes in the battle
watch(
    battleWithMetadataStore,
    (battle) => {
        if (battle.spectators.find((spectator) => spectator.user.userId === me.userId)) {
            _mePlayer.battleStatus.isSpectator = true;
            _mePlayer.battleStatus.isReady = true;
            delete _mePlayer.battleStatus.teamId;
        } else {
            _mePlayer.battleStatus.isSpectator = false;
            // iterate over the map id, team to find the user's team
            Object.entries(battle.teams).forEach(([teamId, team]) => {
                if (team.find((participant) => "user" in participant && participant.user.userId === me.userId)) {
                    _mePlayer.battleStatus.teamId = teamId;
                }
            });
        }
    },
    { deep: true }
);

export const battleActions = {
    movePlayerToTeam,
    movePlayerToSpectators,
    moveBotToTeam,
    removeBot,
    startBattle,
    resetToDefaultBattle,
};

export function initBattleStore() {
    resetToDefaultBattle();
}
