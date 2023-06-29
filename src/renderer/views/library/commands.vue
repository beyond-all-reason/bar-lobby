<route lang="json5">
{ meta: { title: "Commands", order: 4, transition: { name: "slide-left" } } }
</route>

<template>
    <div class="flex-col gap-lg flex-grow fullheight">
        <h1>{{ route.meta.title }}</h1>
        <div class="flex-row gap-md">
            <SearchBox v-model="searchVal" />
            <Select v-model="filterMethod" :options="filterMethods" label="Type" />
        </div>

        <div class="flex-col flex-grow fullheight">
            <div class="scroll-container">
                <div v-for="command in filteredCommands" :key="command.cmd" class="command">
                    <div class="cmd">{{ command.cmd }}</div>
                    <div class="cmdDescription">{{ command.cmdDescription }}</div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, reactive, Ref, ref } from "vue";

import { Command, commandList, destroyCommandListner, grabSPADSCommands, setupCommandListner } from "@/api/commands";
import SearchBox from "@/components/controls/SearchBox.vue";
import Select from "@/components/controls/Select.vue";

type FilterMethod = "All" | "Spads" | "Server";
const filterMethods: FilterMethod[] = ["All", "Spads", "Server"];
const filterMethod: Ref<FilterMethod> = ref("All");

const searchVal = ref("");

/**
 * these server commands come with one message, not sure if make sense to build complex logic for parsing them
 * if they start come as spads commands, it could break the script
 **/

const commands = reactive<Command[]>(commandList);

// Sort the commands array based on the sort method
function filterCommands(commands: Command[], filterMethod: FilterMethod) {
    switch (filterMethod) {
        case "All":
            return commands;
        case "Spads":
            return commands.filter((command) => command.cmd.startsWith("!"));
        case "Server":
            return commands.filter((command) => command.cmd.startsWith("$"));
        default:
            return commands;
    }
}

const filteredCommands = computed(() => {
    if (!searchVal.value) {
        return filterCommands(commands, filterMethod.value);
    }
    return filterCommands(
        commands.filter((command) => (command.cmd + command.cmdDescription).includes(searchVal.value)),
        filterMethod.value
    );
});

const route = api.router.currentRoute.value;

const listner = setupCommandListner();

onMounted(() => {
    // Send a message to the server to get all the commands
    grabSPADSCommands();
});

// Unsubscribe from the response listener when the component is not visible anymore
onUnmounted(() => {
    destroyCommandListner(listner);
});
</script>

<style lang="scss" scoped>
.command {
    display: flex;
    align-items: center;
    margin-bottom: 5px;
}

.cmd {
    background-color: rgba(0, 0, 0, 0.3);
    color: white;
    font-size: 13px;
    font-weight: bold;
    padding: 10px;
    border-radius: 3px;
    margin-right: 10px;
    min-width: 162px;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.cmdDescription {
    flex-grow: 1;
    margin-left: 5px;
    font-size: 13px;
    color: white;
}
</style>
