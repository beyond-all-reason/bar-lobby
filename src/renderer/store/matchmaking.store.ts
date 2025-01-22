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
        console.log(event);
        console.log(JSON.stringify(event));
    });

    window.tachyon.onEvent("matchmaking/lost", (event) => {
        console.log(event);
        console.log(JSON.stringify(event));
    });

    window.tachyon.onEvent("matchmaking/foundUpdate", (event) => {
        console.log(event);
        console.log(JSON.stringify(event));
    });

    window.tachyon.onEvent("matchmaking/cancelled", (event) => {
        console.log(event);
        console.log(JSON.stringify(event));
    });

    window.tachyon.onEvent("matchmaking/found", (event) => {
        console.log(event);
        console.log(JSON.stringify(event));
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
