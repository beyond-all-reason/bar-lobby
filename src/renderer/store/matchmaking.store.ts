import { reactive } from "vue";

export enum MatchmakingStatus {
    Idle = "Idle",
    Searching = "Searching",
    MatchFound = "MatchFound",
    MatchAccepted = "MatchAccepted",
}

export const matchmakingStore = reactive<{
    isInitialized: boolean;
    isDrawerOpen: boolean;
    status: MatchmakingStatus;
    selectedQueue: string;
}>({
    isInitialized: false,
    isDrawerOpen: false,
    status: MatchmakingStatus.Idle,
    selectedQueue: "1v1",
});

export function initializeMatchmakingStore() {
    window.tachyon.onEvent("matchmaking/queueUpdate", (event) => {
        console.debug(`matchmaking/queueUpdate: ${JSON.stringify(event)}`);
    });

    window.tachyon.onEvent("matchmaking/lost", (event) => {
        console.debug(`matchmaking/lost: ${JSON.stringify(event)}`);
        matchmakingStore.status = MatchmakingStatus.Searching;
    });

    window.tachyon.onEvent("matchmaking/foundUpdate", (event) => {
        console.debug(`matchmaking/foundUpdate: ${JSON.stringify(event)}`);
    });

    window.tachyon.onEvent("matchmaking/cancelled", (event) => {
        console.debug(`matchmaking/cancelled: ${JSON.stringify(event)}`);
        matchmakingStore.status = MatchmakingStatus.Idle;
    });

    window.tachyon.onEvent("matchmaking/found", (event) => {
        console.debug(`matchmaking/found: ${JSON.stringify(event)}`);
        matchmakingStore.status = MatchmakingStatus.MatchFound;
    });

    matchmakingStore.isInitialized = true;
}

export const matchmaking = {
    async startSearch() {
        matchmakingStore.status = MatchmakingStatus.Searching;
        const response = await window.tachyon.request("matchmaking/queue", { queues: [matchmakingStore.selectedQueue] });
        if (response.status === "failed") {
            matchmakingStore.status = MatchmakingStatus.Idle;
        }
    },
    stopSearch() {
        matchmakingStore.status = MatchmakingStatus.Idle;
        window.tachyon.request("matchmaking/cancel");
    },
    async acceptMatch() {
        matchmakingStore.status = MatchmakingStatus.MatchAccepted;
        const response = await window.tachyon.request("matchmaking/ready");
        if (response.status === "failed") {
            matchmakingStore.status = MatchmakingStatus.Idle;
        }
    },
};
