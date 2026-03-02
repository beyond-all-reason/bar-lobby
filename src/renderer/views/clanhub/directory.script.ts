/* Required imports for the template. Not used in this script-file. */
import { useTypedI18n } from "@renderer/i18n";
import { Ref, ref, computed, shallowRef, watch } from "vue";
import { DataTablePageEvent } from "primevue/datatable";
import { clansStore } from "@renderer/store/clans.store";
import { useDexieLiveQueryWithDeps } from "@renderer/composables/useDexieLiveQuery";
import { ClanBaseData, ClanViewOkResponseData } from "tachyon-protocol/types";
import { clanfuncs } from "@renderer/store/clans.store";

const limit = ref(14);
const offset = ref(0);
const selectedClan: Ref<ClanBaseData | null> = shallowRef(null);
const selectedClanDetails: Ref<ClanViewOkResponseData | null> = shallowRef(null);
const fulltextSearch = ref("");
const fulltextSearchWords = computed(() =>
    fulltextSearch.value
        .split(" ")
        .filter((word) => word.trim() !== "")
        .map((word) => word.toLocaleLowerCase())
);

// Saves the selected clan when a row is selected (Function is an event. This parameter needed...)
function onRowSelect(clan: { data: ClanBaseData }) {
    console.log("Row selected with clanId:", clan.data.clanId);
    // Request full clan data via protocol based on the selected clan's ID
    clanfuncs.readClanFromServer(clan.data.clanId).then((fullClanData) => {
        selectedClan.value = clan.data;
        selectedClanDetails.value = fullClanData;
    });
    selectedClan.value = null;
    selectedClanDetails.value = null;
}

// Computes the filtered clans based on the fulltext search
const filteredClans = computed(() => {
    return clansStore.clanList?.filter((clan): clan is ClanBaseData => clan !== null && clan !== undefined).filter((clan: ClanBaseData) => fulltextSearchFilter(clan)) || [];
});

// Filters a clan based on the fulltext search words
function fulltextSearchFilter(clan: ClanBaseData) {
    if (!clan) return false; // Return false if clan is null or undefined
    if (fulltextSearchWords.value.length === 0) return true;
    return fulltextSearchWords.value.every((word) => {
        return clan.name.toLowerCase().includes(word) || clan.tag.toLowerCase().includes(word);
    });
}

// Reactive query for clans with dependencies on clansBaseData, fulltextSearch, and offset
const clans = useDexieLiveQueryWithDeps([() => clansStore.clanList, fulltextSearch, offset], () => {
    console.log("Clans updated:", clansStore.clanList);
    console.log("Filtered Clans:", filteredClans.value);
    console.log("Fulltext Search:", fulltextSearch.value);
    console.log("Offset value:", offset.value);
    console.log("Limit value:", limit.value);
    return filteredClans.value.slice(offset.value, offset.value + limit.value);
});

// Reactive query for clans count with dependencies on clansBaseData and fulltextSearch
const clansCount = useDexieLiveQueryWithDeps([() => clansStore.clanList, fulltextSearch], () => {
    console.log("Clans Count updated:", filteredClans.value.length);
    return filteredClans.value.length;
});

// Handles pagination event to update the offset
function onPage(event: DataTablePageEvent) {
    offset.value = event.first;
}

// Watcher to reset pagination to the first page when the fulltext search changes
watch(fulltextSearch, () => {
    offset.value = 0;
});

export default function setup() {
    const { t } = useTypedI18n();

    return {
        t,
        limit,
        offset,
        selectedClan,
        selectedClanDetails,
        fulltextSearch,
        fulltextSearchWords,
        onRowSelect,
        filteredClans,
        fulltextSearchFilter,
        clans,
        clansCount,
        onPage,
    };
}
