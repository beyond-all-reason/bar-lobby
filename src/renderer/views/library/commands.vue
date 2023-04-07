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

import SearchBox from "@/components/controls/SearchBox.vue";
import Select from "@/components/controls/Select.vue";

type FilterMethod = "All" | "Spads" | "Server";
const filterMethods: FilterMethod[] = ["All", "Spads", "Server"];
const filterMethod: Ref<FilterMethod> = ref("All");

interface Command {
    cmd: string;
    cmdDescription: string;
}

const searchVal = ref("");

/**
 * these server commands come with one message, not sure if make sense to build complex logic for parsing them
 * if they start come as spads commands, it could break the script
 **/

const commands = reactive<Command[]>([
    {
        cmd: "$help",
        cmdDescription: "Displays this help text.",
    },
    {
        cmd: "$whoami",
        cmdDescription: "Sends back information about who you are.",
    },
    {
        cmd: "$whois",
        cmdDescription: "<user> Sends back information about the user specified.",
    },
    {
        cmd: "$discord",
        cmdDescription: "Allows linking of your discord account to your BAR account.",
    },
    {
        cmd: "$mute",
        cmdDescription: "<username> Mutes that user and prevents you seeing their messages.",
    },
    {
        cmd: "$unmute",
        cmdDescription: "<username> Un-mutes that user and allows you to see their messages.",
    },
    {
        cmd: "$coc",
        cmdDescription: "<term> Searches the code of conduct and returns items with a textual match in them.",
    },
    {
        cmd: "$joinq",
        cmdDescription:
            "Adds you to the queue to join when a space opens up, you will be automatically added to the game as a player. If already a member it has no effect.",
    },
    {
        cmd: "$leaveq",
        cmdDescription: "Removes you from the join queue.",
    },
    {
        cmd: "$status",
        cmdDescription: "Status info about the battle lobby.",
    },
    {
        cmd: "$afks",
        cmdDescription: "Lists possible afk players.",
    },
    {
        cmd: "$password?",
        cmdDescription: "Tells you the room password",
    },
    {
        cmd: "$splitlobby",
        cmdDescription: `<minimum players> Causes a vote to start where other players can elect to join you
            in splitting the lobby, follow someone of their choosing or remain in place. After 30 seconds,
            if at least the minimum number of players agreed to split, you are moved to a new (empty) lobby
            and those that voted yes or are following someone that voted yes are also moved to that lobby.`,
    },
    {
        cmd: "$roll",
        cmdDescription: `<range> Rolls a random number based on the range format.\n- Dice format: nDs, where n is number
            of dice and s is sides of die. E.g. 4D6 - 4 dice with 6 sides are rolled\n- Max format: N, where N is a number
            and an integer between 1 and N is returned\n- Min/Max format: MN MX, where each is a number and an integer
            between them (inclusive) is returned`,
    },
    {
        cmd: "$explain",
        cmdDescription: "Lists a log of the steps taken to calculate balance for the lobby",
    },
    {
        cmd: "$reset-approval",
        cmdDescription: `Resets the list of approved players to just the ones present at the moment
            (approved players are able to join even if it is locked and without needing a password).
            Requires boss privileges.`,
    },
    {
        cmd: "$meme",
        cmdDescription: `<meme> A predefined bunch of settings for meme games. It's all Rikerss' fault.
            Requires boss privileges. ticks: Ticks only!, nodefence: No defences, greenfields: No metal extractors,
            rich: Infinite money, poor: No money generation, hardt1: T1 but no seaplanes or hovers either,
            crazy: Random combination of several settings, undo: Removes all meme effects    
        `,
    },
    {
        cmd: "$welcome-message",
        cmdDescription: `<message>
            Sets the welcome message sent to anybody joining the lobby. Run this command without a message
            to clear the existing message. Requires boss privileges. Use $$ to add a line return.`,
    },
    {
        cmd: "$gatekeeper",
        cmdDescription: ` <(default | friends | friendsplay | clan)> sets the gatekeeper for this battle. Requires boss privileges.
            > default: no limitations
            > friends allows only friends of existing members to join the lobby
            > friendsplay: allows only friends of existing players to become players (but anybody can join to spectate)`,
    },
    {
        cmd: "$rename",
        cmdDescription: `<new name> Renames the lobby to the name given. Requires boss privileges.`,
    },
    {
        cmd: "$resetratinglevels",
        cmdDescription: `Resets the rating level limits to not exist. Player limiting commands are designed to be used with $rename,
        please be careful not to abuse them. Requires boss privileges.`,
    },
    {
        cmd: "$minratinglevel",
        cmdDescription: `<min-level> Sets the minimum level for players, you must be at least this rating to be a player.
        Requires boss privileges.`,
    },
    {
        cmd: "$maxratinglevel ",
        cmdDescription: `<max-level> Sets the maximum level for players, you must be at below this rating to be a player.
        Requires boss privileges.`,
    },
    {
        cmd: "$setratinglevels",
        cmdDescription: `<min-level> <max-level> Sets the minimum and maximum rating levels for players. Requires boss privileges.`,
    },
]);

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

// Listen for the response from the server
const directMessageCommandListener = api.comms.onResponse("s.communication.received_direct_message").add(async (data) => {
    const { message } = data;

    // Check if the message is a command
    if (!message.startsWith("!") && !message.startsWith("$")) return;
    const cmd = message.split("-")[0].split(" ")[0];
    const cmdDescription = message.slice(cmd.length + 1).replace("-", " ");
    cmdDescription && !cmdDescription.includes("*") && commands.push({ cmd, cmdDescription });
});

onMounted(() => {
    // Send a message to the server to get all the commands
    api.comms.request("c.communication.send_direct_message", {
        recipient_id: 3137,
        message: `!helpall`,
    });
});

// Unsubscribe from the response listener when the component is not visible anymore
onUnmounted(() => {
    directMessageCommandListener.destroy();
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
