<template>
    <Modal title="Host Battle" width="400px" @open="onOpen" @close="onClose">
        <div class="flex-col gap-md">
            <template v-if="waitingForBattleCreation">
                <div class="txt-center">Setting up a dedicated battle host, this usually takes around 30 seconds</div>
                <Loader :absolutePosition="false"></Loader>
            </template>
            <template v-else>
                <Select v-model="selectedRegion" :options="regions" label="Region" optionLabel="name" optionValue="code" class="fullwidth">
                    <template #value>
                        <div class="flex-row gap-md">
                            <Flag :countryCode="selectedRegion" />
                            <div>{{ selectedRegionName }}</div>
                        </div>
                    </template>

                    <template #option="slotProps">
                        <div class="flex-row gap-md">
                            <Flag :countryCode="slotProps.option.code" />
                            <div>{{ slotProps.option.name }}</div>
                        </div>
                    </template>
                </Select>
                <Button class="blue" @click="hostBattle">Host Battle</Button>
            </template>
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import { SignalBinding } from "jaz-ts-utils";
import { computed, Ref, ref } from "vue";

import Loader from "@/components/common/Loader.vue";
import Modal from "@/components/common/Modal.vue";
import Button from "@/components/controls/Button.vue";
import Select from "@/components/controls/Select.vue";
import Flag from "@/components/misc/Flag.vue";

const clusterUsernames = new Set<string>();
api.session.customBattles.forEach((battle) => {
    const founder = battle.founder.value;
    if (founder.isBot && founder.username.startsWith("[teh]") && founder.username.endsWith("]")) {
        try {
            const clusterName = founder.username.split("]")[1].split("[")[0];
            clusterUsernames.add(clusterName);
        } catch (err) {
            console.error(err);
        }
    }
});

const regions = ref([
    { name: "Europe", code: "EU" },
    { name: "United States", code: "US" },
    { name: "Australia", code: "AU" },
]);
const selectedRegion = ref(regions.value[0].code);
const selectedRegionName = computed(() => regions.value.find((r) => r.code === selectedRegion.value)?.name);

const clusterBotUserIds: Record<string, number[]> = {
    HU: [3137, 857],
    US: [10673, 24989],
    AU: [3062],
};

const hostedBattleData: Ref<{ name: string; password: string } | undefined> = ref();

const waitingForBattleCreation = ref(false);

let replyBinding: SignalBinding | undefined;
let battleOpenedBinding: SignalBinding | undefined;

async function hostBattle() {
    /**
     * for now, we interface with the SPADS cluster bots via the !privatehost command
     * in the future, we should setup an actual API to interface through, probably via the server, which should act as a broker for assigning available hosts
     * */
    waitingForBattleCreation.value = true;

    const targetClusterBotUserId = clusterBotUserIds[selectedRegion.value][0]; // not sure when to use fallback clusters, for now we'll just always use the first one

    replyBinding = api.comms.onResponse("s.communication.received_direct_message").addOnce((data) => {
        if (data.sender_id !== targetClusterBotUserId) {
            return;
        }

        if (data.message.startsWith("Starting a new")) {
            const { name, password } = data.message.match(/name=(?<name>.*)?,\spassword=(?<password>.*)?\)/)!.groups!;
            hostedBattleData.value = { name, password };
        } else if (data.message.startsWith("There is already")) {
            const { name } = data.message.match(/you: (?<name>.*)? \(/)!.groups!;
            hostedBattleData.value = { name, password: "" };
        } else {
            console.error(`Error parsing autohost response: ${data.message}`);
            return;
        }

        // TODO: when we move away from polling lobby.query then this should be changed to listen for newly created battles
        battleOpenedBinding = api.comms.onResponse("s.lobby.query").add((data) => {
            if (hostedBattleData.value === undefined) {
                console.warn("Listening for a battle to open but no hosted battle data is set");
                return;
            }

            const autohostUser = api.session.getUserByName(hostedBattleData.value.name);

            if (!autohostUser) {
                console.warn(`Listening for a battle but could not find user data for the autohost user: ${hostedBattleData.value.name}`);
                return;
            }

            for (const battle of data.lobbies) {
                if (battle.lobby.founder_id === autohostUser.userId) {
                    battleOpenedBinding?.destroy();

                    api.comms.request("c.lobby.join", {
                        lobby_id: battle.lobby.id,
                        password: hostedBattleData.value.password,
                    });

                    return;
                }
            }
        });
    });

    const response = await api.comms.request("c.communication.send_direct_message", {
        recipient_id: targetClusterBotUserId,
        message: `!privatehost`,
    });
}

function onOpen() {
    waitingForBattleCreation.value = false;
}

function onClose() {
    if (replyBinding) {
        replyBinding.destroy();
    }

    hostedBattleData.value = undefined;
}
</script>

<style lang="scss" scoped></style>
