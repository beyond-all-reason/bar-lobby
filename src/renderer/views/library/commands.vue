<route lang="json5">
{ meta: { title: "Commands", order: 4, transition: { name: "slide-left" } } }
</route>

<template>
    <div class="flex-col gap-lg flex-grow fullheight">
        <h1>{{ route.meta.title }}</h1>
        <div class="flex-row gap-md">
            <SearchBox v-model="searchVal" />
            <Select v-model="sortMethod" :options="sortMethods" label="Sort By" />
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

import SearchBox from "@/components/controls/SearchBox.vue";
import Select from "@/components/controls/Select.vue";

type SortMethod = "Name" | "Description";

const sortMethods: SortMethod[] = ["Name", "Description"];
const sortMethod: Ref<SortMethod> = ref("Name");

interface Command {
    cmd: string;
    cmdDescription: string;
}

const searchVal = ref("");

const commands = reactive<Command[]>([]);

// Sort the commands array based on the sort method
function sortCommands(commands: Command[], sortMethod: SortMethod) {
    switch (sortMethod) {
        case "Name":
            return commands.sort((a, b) => a.cmd.localeCompare(b.cmd));
        case "Description":
            return commands.sort((a, b) => a.cmdDescription.localeCompare(b.cmdDescription));
        default:
            return commands;
    }
}

const filteredCommands = computed(() => {
    if (!searchVal.value) {
        return sortCommands(commands, sortMethod.value);
    }
    return sortCommands(
        commands.filter((command) => (command.cmd + command.cmdDescription).includes(searchVal.value)),
        sortMethod.value
    );
});

const route = api.router.currentRoute.value;

onMounted(() => {
    // Listen for the response from the server
    api.comms.onResponse("s.communication.received_direct_message").add(async (data) => {
        const { message } = data;
        // Check if the message is a command
        if (!message.startsWith("!") && !message.startsWith("$")) return;

        const cmd = message.split("-")[0].split(" ")[0];
        const cmdDescription = message.slice(cmd.length + 1).replace("-", " ");

        cmdDescription && !cmdDescription.includes("*") && commands.push({ cmd, cmdDescription });
    });
    // Send a message to the server to get all the commands
    api.comms.request("c.communication.send_direct_message", {
        recipient_id: 3137,
        message: `!helpall`,
    });
    api.comms.request("c.communication.send_direct_message", {
        recipient_id: 3137,
        message: `$help`,
    });
});

// Unsubscribe from the response listener when the component is not visible anymore
onUnmounted(() => {
    /**
  I don't know how to unsubscribe from the response listener
  It should unsubscribe from the response listener, otherwise i guess can be trying
  to rereneder the component when it's not visible anymore and that can cause some
  issues when the user is navigating through the app
  */
});
</script>

<style lang="scss" scoped>
.command {
    display: flex;
    align-items: center;
    margin-bottom: 2px;
    height: 50px;
}

.cmd {
    background-color: rgba(0, 0, 0, 0.3);
    color: white;
    font-size: 13px;
    font-weight: bold;
    padding: 10px;
    border-radius: 3px;
    margin-right: 10px;
    min-width: 135px;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.cmdDescription {
    flex-grow: 1;
    margin-left: 5px;
    font-size: 13px;
    color: white;
}
</style>
