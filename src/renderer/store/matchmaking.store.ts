import { reactive } from "vue";

export const matchmakingStore = reactive({
    isDrawerOpen: false,
    isSearching: false,
    isMatchFound: false,
    isMatchAccepted: false,
    selectedQueue: "1vs1",
});
